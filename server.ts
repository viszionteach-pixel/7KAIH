import express from 'express';
import path from 'path';
import pg from 'pg';
import { createServer as createViteServer } from 'vite';

// Allow self-signed certificate chains for Aiven cloud PostgreSQL
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Aiven PostgreSQL Pool Management
let runtimeConnectionString =
  process.env.AIVEN_DATABASE_URL ||
  process.env.VITE_AIVEN_DATABASE_URL ||
  '';

let pool: pg.Pool | null = null;

function cleanConnectionString(connStr: string): string {
  if (!connStr) return '';
  // Remove sslmode query parameter so node pg uses explicit ssl config
  return connStr.replace(/([?&])sslmode=[^&]*&?/g, '$1').replace(/[?&]$/, '');
}

function getPool(connStr?: string): pg.Pool | null {
  const rawUrl = connStr || runtimeConnectionString;
  if (!rawUrl) return null;

  if (!pool || (connStr && connStr !== runtimeConnectionString)) {
    if (pool) {
      pool.end().catch(() => {});
    }
    runtimeConnectionString = rawUrl;
    const cleanUrl = cleanConnectionString(rawUrl);
    pool = new pg.Pool({
      connectionString: cleanUrl,
      ssl: rawUrl.includes('sslmode=disable') ? false : { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
    });
  }
  return pool;
}

// Auto-initialize Aiven database schema
async function initAivenSchema(dbPool: pg.Pool) {
  try {
    const client = await dbPool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS kaih_users (
          id VARCHAR(255) PRIMARY KEY,
          data JSONB NOT NULL,
          username VARCHAR(255),
          name VARCHAR(255),
          role VARCHAR(100),
          assigned_class VARCHAR(100),
          nisn VARCHAR(100),
          nip VARCHAR(100),
          agama VARCHAR(100),
          admin_title VARCHAR(255),
          avatar_url TEXT,
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS kaih_logs (
          id VARCHAR(255) PRIMARY KEY,
          student_id VARCHAR(255) NOT NULL,
          date VARCHAR(50) NOT NULL,
          data JSONB NOT NULL,
          completed_count INT DEFAULT 0,
          score_percentage INT DEFAULT 0,
          fill_timestamp VARCHAR(255),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS kaih_school_config (
          id VARCHAR(255) PRIMARY KEY,
          data JSONB NOT NULL,
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS kaih_bk_notes (
          id VARCHAR(255) PRIMARY KEY,
          data JSONB NOT NULL,
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS kaih_passwords (
          id VARCHAR(255) PRIMARY KEY,
          password VARCHAR(255) NOT NULL,
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[Aiven DB Schema Init Error]:', err);
  }
}

// Try initializing schema if connection string exists
if (runtimeConnectionString) {
  const p = getPool();
  if (p) initAivenSchema(p);
}

// ================= API ROUTES =================

// Check Aiven DB Connection Status
app.get('/api/aiven/status', async (req, res) => {
  const connStr = (req.query.url as string) || runtimeConnectionString;
  if (!connStr) {
    return res.json({ configured: false, connected: false, message: 'Belum dikonfigurasi' });
  }

  try {
    const cleanUrl = cleanConnectionString(connStr);
    const testPool = new pg.Pool({
      connectionString: cleanUrl,
      ssl: connStr.includes('sslmode=disable') ? false : { rejectUnauthorized: false },
      connectionTimeoutMillis: 5000,
    });
    const client = await testPool.connect();
    const result = await client.query('SELECT NOW() as now');
    client.release();
    await testPool.end();

    if (req.query.save === 'true') {
      runtimeConnectionString = connStr;
      const activeP = getPool(connStr);
      if (activeP) await initAivenSchema(activeP);
    }

    return res.json({
      configured: true,
      connected: true,
      timestamp: result.rows[0].now,
      connectionStringMasked: connStr.replace(/:[^:@]+@/, ':****@'),
    });
  } catch (err: any) {
    return res.json({
      configured: true,
      connected: false,
      error: err.message || 'Gagal terhubung ke database Aiven',
    });
  }
});

// Set Aiven Connection URL
app.post('/api/aiven/config-url', async (req, res) => {
  const { url } = req.body;
  if (!url) {
    runtimeConnectionString = '';
    if (pool) {
      pool.end().catch(() => {});
      pool = null;
    }
    return res.json({ success: true, message: 'Koneksi Aiven dihapus' });
  }

  try {
    const p = getPool(url);
    if (!p) throw new Error('Pool creation failed');
    await initAivenSchema(p);
    return res.json({ success: true, message: 'Koneksi Aiven.io PostgreSQL berhasil dikonfigurasi!' });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

// USERS API
app.get('/api/aiven/users', async (req, res) => {
  const p = getPool();
  if (!p) return res.json({ configured: false, users: [] });

  try {
    const result = await p.query('SELECT data FROM kaih_users LIMIT 5000');
    const users = result.rows.map((r) => r.data);
    return res.json({ configured: true, users });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/aiven/users/sync', async (req, res) => {
  const p = getPool();
  if (!p) return res.json({ configured: false });

  const { users } = req.body;
  if (!Array.isArray(users)) return res.status(400).json({ error: 'Invalid payload' });

  try {
    await initAivenSchema(p);
    const client = await p.connect();
    try {
      await client.query('BEGIN');
      // Upsert users
      for (const u of users) {
        await client.query(
          `INSERT INTO kaih_users (id, data, username, name, role, assigned_class, nisn, nip, agama, admin_title, avatar_url, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
           ON CONFLICT (id) DO UPDATE SET
             data = EXCLUDED.data,
             username = EXCLUDED.username,
             name = EXCLUDED.name,
             role = EXCLUDED.role,
             assigned_class = EXCLUDED.assigned_class,
             nisn = EXCLUDED.nisn,
             nip = EXCLUDED.nip,
             agama = EXCLUDED.agama,
             admin_title = EXCLUDED.admin_title,
             avatar_url = EXCLUDED.avatar_url,
             updated_at = NOW();`,
          [
            u.id,
            JSON.stringify(u),
            u.username || null,
            u.name || null,
            u.role || null,
            u.assignedClass || null,
            u.nisn || null,
            u.nip || null,
            u.agama || 'Islam',
            u.adminTitle || null,
            u.avatarUrl || null,
          ]
        );
      }

      // Clean orphaned users if sync requested
      if (req.body.purgeOrphaned) {
        const activeIds = users.map((u) => u.id);
        if (activeIds.length > 0) {
          await client.query('DELETE FROM kaih_users WHERE NOT (id = ANY($1))', [activeIds]);
        }
      }

      await client.query('COMMIT');
      return res.json({ success: true, count: users.length });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/aiven/users/:id', async (req, res) => {
  const p = getPool();
  if (!p) return res.json({ configured: false });

  try {
    await p.query('DELETE FROM kaih_users WHERE id = $1', [req.params.id]);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// LOGS API
app.get('/api/aiven/logs', async (req, res) => {
  const p = getPool();
  if (!p) return res.json({ configured: false, logs: [] });

  try {
    const result = await p.query('SELECT data FROM kaih_logs LIMIT 10000');
    const logs = result.rows.map((r) => r.data);
    return res.json({ configured: true, logs });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/aiven/logs/sync', async (req, res) => {
  const p = getPool();
  if (!p) return res.json({ configured: false });

  const { logs } = req.body;
  if (!Array.isArray(logs)) return res.status(400).json({ error: 'Invalid payload' });

  try {
    await initAivenSchema(p);
    const client = await p.connect();
    try {
      await client.query('BEGIN');
      for (const l of logs) {
        await client.query(
          `INSERT INTO kaih_logs (id, student_id, date, data, completed_count, score_percentage, fill_timestamp, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
           ON CONFLICT (id) DO UPDATE SET
             student_id = EXCLUDED.student_id,
             date = EXCLUDED.date,
             data = EXCLUDED.data,
             completed_count = EXCLUDED.completed_count,
             score_percentage = EXCLUDED.score_percentage,
             fill_timestamp = EXCLUDED.fill_timestamp,
             updated_at = NOW();`,
          [
            l.id,
            l.studentId,
            l.date,
            JSON.stringify(l),
            l.completedCount || 0,
            l.scorePercentage || 0,
            l.fillTimestamp || null,
          ]
        );
      }

      if (req.body.purgeOrphaned) {
        const activeIds = logs.map((l) => l.id);
        if (activeIds.length > 0) {
          await client.query('DELETE FROM kaih_logs WHERE NOT (id = ANY($1))', [activeIds]);
        }
      }

      await client.query('COMMIT');
      return res.json({ success: true, count: logs.length });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// SCHOOL CONFIG API
app.get('/api/aiven/school-config', async (req, res) => {
  const p = getPool();
  if (!p) return res.json({ configured: false, config: null });

  try {
    const result = await p.query("SELECT data FROM kaih_school_config WHERE id = 'main'");
    const config = result.rows.length > 0 ? result.rows[0].data : null;
    return res.json({ configured: true, config });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/aiven/school-config', async (req, res) => {
  const p = getPool();
  if (!p) return res.json({ configured: false });

  try {
    await initAivenSchema(p);
    await p.query(
      `INSERT INTO kaih_school_config (id, data, updated_at)
       VALUES ('main', $1, NOW())
       ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW();`,
      [JSON.stringify(req.body)]
    );
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// BK NOTES API
app.get('/api/aiven/bk-notes', async (req, res) => {
  const p = getPool();
  if (!p) return res.json({ configured: false, notes: [] });

  try {
    const result = await p.query('SELECT data FROM kaih_bk_notes LIMIT 1000');
    const notes = result.rows.map((r) => r.data);
    return res.json({ configured: true, notes });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/aiven/bk-notes', async (req, res) => {
  const p = getPool();
  if (!p) return res.json({ configured: false });

  const { notes } = req.body;
  if (!Array.isArray(notes)) return res.status(400).json({ error: 'Invalid payload' });

  try {
    await initAivenSchema(p);
    const client = await p.connect();
    try {
      await client.query('BEGIN');
      for (const n of notes) {
        await client.query(
          `INSERT INTO kaih_bk_notes (id, data, updated_at)
           VALUES ($1, $2, NOW())
           ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW();`,
          [n.id, JSON.stringify(n)]
        );
      }
      await client.query('COMMIT');
      return res.json({ success: true });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// STATS API
app.get('/api/aiven/stats', async (req, res) => {
  const p = getPool();
  if (!p) return res.json({ configured: false });

  try {
    await initAivenSchema(p);
    const [uRes, lRes, cRes, bRes, pRes] = await Promise.all([
      p.query('SELECT COUNT(*) as count FROM kaih_users'),
      p.query('SELECT COUNT(*) as count FROM kaih_logs'),
      p.query('SELECT COUNT(*) as count FROM kaih_school_config'),
      p.query('SELECT COUNT(*) as count FROM kaih_bk_notes'),
      p.query('SELECT COUNT(*) as count FROM kaih_passwords'),
    ]);

    return res.json({
      configured: true,
      stats: {
        usersCount: parseInt(uRes.rows[0]?.count || '0', 10),
        logsCount: parseInt(lRes.rows[0]?.count || '0', 10),
        configCount: parseInt(cRes.rows[0]?.count || '0', 10),
        bkNotesCount: parseInt(bRes.rows[0]?.count || '0', 10),
        passwordsCount: parseInt(pRes.rows[0]?.count || '0', 10),
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// CUSTOM PASSWORDS API
app.get('/api/aiven/passwords', async (req, res) => {
  const p = getPool();
  if (!p) return res.json({ configured: false, passwords: {} });

  try {
    const result = await p.query('SELECT id, password FROM kaih_passwords');
    const passwords: Record<string, string> = {};
    result.rows.forEach((r) => {
      passwords[r.id] = r.password;
    });
    return res.json({ configured: true, passwords });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/aiven/passwords', async (req, res) => {
  const p = getPool();
  if (!p) return res.json({ configured: false });

  const { userId, password } = req.body;
  if (!userId || !password) return res.status(400).json({ error: 'Missing parameters' });

  try {
    await initAivenSchema(p);
    await p.query(
      `INSERT INTO kaih_passwords (id, password, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (id) DO UPDATE SET password = EXCLUDED.password, updated_at = NOW();`,
      [userId, password]
    );
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ================= VITE DEV / PROD SERVER =================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

export default app;
