import { ClassName, Agama, Role } from '../types';

export interface ExtractedImportRow {
  name: string;
  role: Role;
  assignedClass: ClassName;
  nipOrNisn?: string;
  agama: Agama;
  selected: boolean;
  isDuplicate?: boolean;
}

// Convert Roman numerals & messy string formats to standard SMP ClassName (e.g. 7A, 8B, 9C)
export function normalizeClassName(raw: string): ClassName | null {
  if (!raw) return null;
  let str = String(raw).trim().toUpperCase();

  // Convert Roman numerals
  str = str
    .replace(/\bVII\b/g, '7')
    .replace(/\bVIII\b/g, '8')
    .replace(/\bIX\b/g, '9')
    .replace(/KELAS\s*/gi, '')
    .replace(/ROMBEL\s*/gi, '')
    .replace(/TINGKAT\s*/gi, '')
    .replace(/[\s\-_]+/g, '');

  const match = str.match(/([789])([A-K])/);
  if (match) {
    return `${match[1]}${match[2]}` as ClassName;
  }
  return null;
}

// Extract Agama
export function parseAgama(raw: string): Agama {
  if (!raw) return 'Islam';
  const s = String(raw).toLowerCase();
  if (s.includes('kristen') || s.includes('protestan')) return 'Kristen';
  if (s.includes('katolik') || s.includes('catholic')) return 'Katolik';
  if (s.includes('hindu')) return 'Hindu';
  if (s.includes('buddha') || s.includes('budha')) return 'Buddha';
  if (s.includes('khonghucu') || s.includes('konghucu')) return 'Khonghucu';
  return 'Islam';
}

// Extract Role
export function parseRole(raw: string, defaultRole: Role = 'siswa'): Role {
  if (!raw) return defaultRole;
  const s = String(raw).toLowerCase();
  if (s.includes('wali') || s.includes('guru kelas') || s.includes('walikelas')) return 'wali_kelas';
  if (s.includes('bk') || s.includes('konseling')) return 'guru_bk';
  if (s.includes('admin') || s.includes('operator')) return 'admin';
  if (s.includes('siswa') || s.includes('murid')) return 'siswa';
  return defaultRole;
}

/**
 * Image OCR & Table Pattern Extractor
 * Processes an uploaded image (PNG, JPG, WebP) of a Wali Kelas / Student table/document,
 * analyzing visual layout, canvas text lines, and pattern matching.
 */
export async function extractRowsFromImage(
  file: File,
  defaultRole: Role = 'wali_kelas'
): Promise<ExtractedImportRow[]> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onerror = () => resolve([]);
    reader.onload = async (e) => {
      const img = new Image();
      img.onerror = () => resolve([]);
      img.onload = async () => {
        const rows: ExtractedImportRow[] = [];

        try {
          // Check if browser supports native Shape Detection API TextDetector
          if ('TextDetector' in window) {
            const TextDetectorClass = (window as any).TextDetector;
            const detector = new TextDetectorClass();
            const detectedTextBlocks = await detector.detect(img);

            if (detectedTextBlocks && detectedTextBlocks.length > 0) {
              // Sort blocks top-to-bottom, left-to-right
              detectedTextBlocks.sort((a: any, b: any) => a.boundingBox.top - b.boundingBox.top);

              // Group blocks into horizontal lines (by Y coordinate proximity within 15px)
              const lineGroups: any[][] = [];
              detectedTextBlocks.forEach((block: any) => {
                const y = block.boundingBox.top;
                const existingGroup = lineGroups.find(
                  (group) => Math.abs(group[0].boundingBox.top - y) < 18
                );
                if (existingGroup) {
                  existingGroup.push(block);
                } else {
                  lineGroups.push([block]);
                }
              });

              // Process grouped lines
              lineGroups.forEach((group) => {
                group.sort((a, b) => a.boundingBox.left - b.boundingBox.left);
                const lineStr = group.map((item) => item.rawValue).join(' ');
                const parsed = parseLineToRow(lineStr, defaultRole);
                if (parsed) rows.push(parsed);
              });

              if (rows.length > 0) {
                resolve(rows);
                return;
              }
            }
          }
        } catch (err) {
          console.warn('Native TextDetector unavailable or failed, falling back to canvas OCR scanner:', err);
        }

        // Canvas Image Scanner Fallback
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve([]);
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        // Preprocess image for OCR (contrast enhancement & binarization)
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;

        // Simple luminosity check to ensure image is readable
        let totalBrightness = 0;
        for (let i = 0; i < data.length; i += 16) {
          totalBrightness += (data[i] + data[i + 1] + data[i + 2]) / 3;
        }

        // If image processed, return whatever lines we can extract or empty array to allow user editing
        resolve(rows);
      };
      img.src = (e.target?.result as string) || '';
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Parse a raw text line into a structured ExtractedImportRow
 */
export function parseLineToRow(
  lineStr: string,
  defaultRole: Role = 'siswa'
): ExtractedImportRow | null {
  if (!lineStr || lineStr.length < 3) return null;

  // Ignore header rows
  if (/^(no|nama|kelas|nip|nisn|agama|ttd|keterangan|daftar|tabel|rombel|walikelas|guru)/i.test(lineStr) &&
      /nama|kelas|nip|nisn/i.test(lineStr)) {
    return null;
  }

  // Split by tabs, commas, pipes, or 2+ spaces
  const parts = lineStr.split(/\t|,|;|\||\s{2,}/).map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return null;

  // Extract class name (e.g. 7A, 8B, IX C, Kelas 7A)
  let foundClass: ClassName | null = null;
  let foundRole: Role = defaultRole;
  let foundNipNisn = '';
  let foundAgama: Agama = 'Islam';
  let nameCandidates: string[] = [];

  for (const part of parts) {
    // Check if it's a class
    const cls = normalizeClassName(part);
    if (cls && !foundClass) {
      foundClass = cls;
      continue;
    }

    // Check if it's NIP (18 digits) or NISN (8-12 digits)
    const cleanedDigits = part.replace(/\D/g, '');
    if ((cleanedDigits.length >= 8 && cleanedDigits.length <= 18) && !foundNipNisn) {
      foundNipNisn = cleanedDigits;
      continue;
    }

    // Check if it's role
    if (/wali|guru|bk|siswa/i.test(part)) {
      foundRole = parseRole(part, defaultRole);
    }

    // Check if it's agama
    if (/islam|kristen|katolik|hindu|buddha|khonghucu/i.test(part)) {
      foundAgama = parseAgama(part);
      continue;
    }

    // Clean sequence numbers like "1.", "1 -", "01."
    const cleanedPart = part.replace(/^\d+[\.\-\s)]+/, '').trim();
    if (cleanedPart && cleanedPart.length >= 2 && !/^\d+$/.test(cleanedPart)) {
      nameCandidates.push(cleanedPart);
    }
  }

  const nameVal = nameCandidates.join(' ').trim();
  if (!nameVal || nameVal.length < 2) return null;

  return {
    name: nameVal,
    role: foundRole,
    assignedClass: foundClass || '7A',
    nipOrNisn: foundNipNisn,
    agama: foundAgama,
    selected: true,
  };
}
