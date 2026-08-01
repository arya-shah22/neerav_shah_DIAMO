import { resolveHeaderAlias } from '../src/shared/constants/csv-header-map';

const nivodaHeaders = ['Stock Id', 'Availability', 'Shape', 'Carat', 'Color', 'Clarity', '$/ct', 'Total price', 'Cut', 'Pol', 'Sym', 'Certificate #', 'Measurements Length', 'Measurements Width', 'Measurements Depth', 'Depth%', 'Table%', 'Girdle%', 'Culet Size', 'Girdle Condition', 'Pavilion Depth', 'Crown Height', 'Crown Angle', 'Pavilion Angle', 'Certificate Url', 'Image', 'Weburl', 'VIDEO', 'Fluorescence Intensity', 'Fluorescence Color', 'Type', 'Milky', 'Eye Clean', 'Inscription', 'Lab', 'Treatment', 'Location', 'State', 'City', 'Cert comment', 'COP', 'Fancy Color', 'Fancy Color Intensity'];

const vdbHeaders = ['Stock Id', 'Availability', 'Shape', 'Carat', 'Color', 'Clarity', '$/ct', 'Total price', 'Cut', 'Pol', 'Sym', 'Certificate #', 'Measurements Length', 'Measurements Width', 'Measurements Depth', 'Depth%', 'Table%', 'Girdle%', 'Culet Size', 'Girdle Condition', 'Pavilion Depth', 'Crown Height', 'Crown Angle', 'Pavilion Angle', 'Certificate Url', 'Image Link', 'Video Link', 'Fluorescence Intensity', 'Fluorescence Color', 'Milky', 'BGM', 'Lab', 'Cert Comment', 'Laser Inscription', 'Member Comments', 'H&A', 'City', 'State', 'Country', 'Eye Clean', 'Table Open', 'Crown Open', 'Girdle Open', 'Type', 'Tinge', 'Luster', 'Black Inclusion', 'Table Inclusion', 'Growth Type', 'Treatment', 'Fancy Color ', 'Fancy Color Intensity'];

const rapnetHeaders = ['Stock #', 'Availability', 'Shape', 'Weight', 'Color', 'Clarity', 'Price/ct $', 'Total $', 'Cut Grade', 'Polish', 'Symmetry', 'Fluorescence Intensity', 'Fluorescence Color', 'Measurements', 'Lab', 'Certificate #', 'Treatment', 'Depth %', 'Table %', 'Girdle Thin', 'Girdle Thick', 'Girdle %', 'Girdle Condition', 'Culet Size', 'Culet Condition', 'Crown Height', 'Crown Angle', 'Pavilion Depth', 'Pavilion Angle', 'Laser Inscription', 'Cert comment', 'Key to symbols', 'Member Comment', 'Star Length ', 'Shade', 'White Inclusion', 'Black Inclusion', 'Open Inclusion', 'Milky', 'Fancy Color', 'Fancy Color Intensity', 'Fancy Color Overtone', 'Country', 'State', 'City', 'Brand', 'Seller Spec', 'Report Filename', 'Diamond Image', 'Video Link', 'Sarine Loupe', 'Trade Show', 'Report Issue Date', 'Report Type', 'Lab Location', 'Pair Stock #', 'Is Matched Pair Separable', 'Allow RapLink Feed', 'Parcel Stones', 'BGM', 'Type'];

function testFormat(name: string, headers: string[]) {
  console.log(`=== Testing ${name} File Headers ===`);
  const mapped: Record<string, string> = {};
  const unmapped: string[] = [];

  for (const h of headers) {
    const alias = resolveHeaderAlias(h);
    if (alias) {
      mapped[h] = alias;
    } else {
      unmapped.push(h);
    }
  }

  console.log(`Total Columns: ${headers.length}`);
  console.log(`Successfully Mapped: ${Object.keys(mapped).length}`);
  console.log(`Unmapped Columns: ${unmapped.length} (${unmapped.join(', ') || 'None'})`);
  console.log('Sample Mappings:');
  console.log({
    'Stock ID': mapped['Stock Id'] || mapped['Stock #'],
    'Rate ($/ct)': mapped['$/ct'] || mapped['Price/ct $'],
    'Total Price': mapped['Total price'] || mapped['Total $'],
    'Cert Number': mapped['Certificate #'],
  });
  console.log('--------------------------------------------------\n');
}

testFormat('Nivoda (.xlsx)', nivodaHeaders);
testFormat('VDB (.xlsx)', vdbHeaders);
testFormat('RapNet (.csv)', rapnetHeaders);
