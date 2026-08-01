import * as XLSX from 'xlsx';
import { resolveHeaderAlias } from '../src/shared/constants/csv-header-map';

const workbook = XLSX.readFile('/Users/aryashah/Documents/Code/Software/Neerav_Shah_DIAMO/CSV Formate/Nivoda Formate CSV.xlsx');
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const json: any[] = XLSX.utils.sheet_to_json(sheet);

console.log('Nivoda Row 1 Raw Data:');
console.log('Measurements Depth raw value:', json[0]['Measurements Depth']);
console.log('Depth% raw value:', json[0]['Depth%']);

console.log('\nMapping check:');
console.log('"Measurements Depth" maps to:', resolveHeaderAlias('Measurements Depth'));
console.log('"Depth%" maps to:', resolveHeaderAlias('Depth%'));
