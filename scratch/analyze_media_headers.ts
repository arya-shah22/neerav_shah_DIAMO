import * as XLSX from 'xlsx';
import * as fs from 'fs';
import { resolveHeaderAlias } from '../src/shared/constants/csv-header-map';

function analyzeFile(filePath: string, name: string) {
  console.log(`\n==================================================`);
  console.log(`ANALYZING MEDIA & VIDEO HEADERS FOR: ${name}`);
  console.log(`==================================================`);

  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }

  let rawRows: any[] = [];
  if (filePath.endsWith('.csv')) {
    const text = fs.readFileSync(filePath, 'utf-8');
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length > 0) {
      const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());
      console.log(`Raw Headers in ${name}:`);
      console.log(headers);
      headers.forEach(h => {
        const alias = resolveHeaderAlias(h);
        if (h.toLowerCase().includes('image') || h.toLowerCase().includes('video') || h.toLowerCase().includes('pic') || h.toLowerCase().includes('photo') || h.toLowerCase().includes('url') || h.toLowerCase().includes('link')) {
          console.log(`  -> Header "${h}" maps to internal field: "${alias || 'NOT MAPPED'}"`);
        }
      });
    }
  } else {
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(sheet);
    if (json.length > 0) {
      const headers = Object.keys(json[0] as object);
      console.log(`Raw Headers in ${name}:`);
      console.log(headers);

      headers.forEach(h => {
        const alias = resolveHeaderAlias(h);
        if (h.toLowerCase().includes('image') || h.toLowerCase().includes('video') || h.toLowerCase().includes('pic') || h.toLowerCase().includes('photo') || h.toLowerCase().includes('url') || h.toLowerCase().includes('link')) {
          console.log(`  -> Header "${h}" maps to internal field: "${alias || 'NOT MAPPED'}"`);
        }
      });
    }
  }
}

analyzeFile('/Users/aryashah/Documents/Code/Software/Neerav_Shah_DIAMO/CSV Formate/Nivoda Formate CSV.xlsx', 'Nivoda');
analyzeFile('/Users/aryashah/Documents/Code/Software/Neerav_Shah_DIAMO/CSV Formate/Rapnet Formate CSV.csv', 'RapNet');
analyzeFile('/Users/aryashah/Documents/Code/Software/Neerav_Shah_DIAMO/CSV Formate/VDB Formate CSV.xlsx', 'VDB');
