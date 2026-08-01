import * as XLSX from 'xlsx';
import { resolveHeaderAlias } from '../src/shared/constants/csv-header-map';

const workbook = XLSX.readFile('/Users/aryashah/Documents/Code/Software/Neerav_Shah_DIAMO/CSV Formate/Nivoda Formate CSV.xlsx');
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rawRows: any[] = XLSX.utils.sheet_to_json(sheet);

const firstRow = rawRows[0];
const rawHeaders = Object.keys(firstRow);
const headerMap: Record<string, string> = {};

for (const rawKey of rawHeaders) {
  const internalField = resolveHeaderAlias(rawKey);
  if (internalField) {
    headerMap[rawKey] = internalField;
  }
}

console.log('Nivoda Header Mappings:');
console.log(headerMap);

const parsedRow: any = {};
for (const [rawKey, internalField] of Object.entries(headerMap)) {
  const value = firstRow[rawKey];
  const strValue = value != null ? String(value).trim() : '';
  if (!strValue) continue;
  parsedRow[internalField] = strValue;
}

console.log('\nParsed Row 1 Result:');
console.log('lengthMm:', parsedRow.lengthMm);
console.log('widthMm:', parsedRow.widthMm);
console.log('depthMm:', parsedRow.depthMm);
console.log('totalDepthPct:', parsedRow.totalDepthPct);
