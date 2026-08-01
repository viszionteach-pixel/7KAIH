import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  // Load all env vars (no prefix filter) so we can bridge platform-provided
  // Supabase credentials (NEXT_PUBLIC_* / SUPABASE_*) into the client bundle on
  // deploy. In local dev the VITE_* vars in .env.local are exposed natively by
  // Vite, so we only add `define` entries when a bridged value actually exists
  // to avoid clobbering the native ones with empty strings.
  const env = {...loadEnv(mode, process.cwd(), ''), ...process.env};
  const supabaseUrl =
    env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL || '';
  const supabaseAnonKey =
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    env.SUPABASE_ANON_KEY ||
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    env.SUPABASE_PUBLISHABLE_KEY ||
    '';

  const supabaseDefine: Record<string, string> = {};
  if (supabaseUrl) {
    supabaseDefine['import.meta.env.VITE_SUPABASE_URL'] =
      JSON.stringify(supabaseUrl);
  }
  if (supabaseAnonKey) {
    supabaseDefine['import.meta.env.VITE_SUPABASE_ANON_KEY'] =
      JSON.stringify(supabaseAnonKey);
  }

  return {
    plugins: [react(), tailwindcss()],
    define: supabaseDefine,
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
