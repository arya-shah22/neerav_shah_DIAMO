import * as XLSX from 'xlsx';
import * as fs from 'fs';
import { resolveHeaderAlias } from '../src/shared/constants/csv-header-map';

function analyzeUnmapped(filePath: string, name: string) {
  console.log(`\n==================================================`);
  console.log(`CHECKING UNMAPPED COLUMNS FOR: ${name}`);
  console.log(`==================================================`);

  let headers: string[] = [];
  if (filePath.endsWith('.csv')) {
    const text = fs.readFileSync(filePath, 'utf-8');
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length > 0) {
      headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());
    }
  } else {
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(sheet);
    if (json.length > 0) {
      headers = Object.keys(json[0] as object);
    }
  }

  const mapped: string[] = [];
  const unmapped: string[] = [];

  headers.forEach(h => {
    const alias = resolveHeaderAlias(h);
    if (alias) {
      mapped.push(`${h} -> ${alias}`);
    } else {
      unmapped.push(h);
    }
  });

  console.log(`Total Columns: ${headers.length}`);
  console.log(`Mapped Columns (${mapped.length}):`);
  console.log(mapped);
  console.log(`\nUnmapped Columns (${unmapped.length}):`);
  console.log(unmapped);
}

analyzeUnmapped('/Users/aryashah/Documents/Code/Software/Neerav_Shah_DIAMO/CSV Formate/Nivoda Formate CSV.xlsx', 'Nivoda');
analyzeUnmapped('/Users/aryashah/Documents/Code/Software/Neerav_Shah_DIAMO/CSV Formate/Rapnet Formate CSV.csv', 'RapNet');
analyzeUnmapped('/Users/aryashah/Documents/Code/Software/Neerav_Shah_DIAMO/CSV Formate/VDB Formate CSV.xlsx', 'VDB');
