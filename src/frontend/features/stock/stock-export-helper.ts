// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Stock Export Helper
// Generates CSV and XLSX stock export files for DIAMO Standard,
// RapNet, VDB, and Nivoda formats with exact column headers.
// ═══════════════════════════════════════════════════════════════

import * as XLSX from 'xlsx';
import { IStockPacket } from './stock.types';

export type ExportPreset = 'DIAMO' | 'RAPNET' | 'VDB' | 'NIVODA';
export type FileType = 'CSV' | 'XLSX';
export type ExportCurrency = 'USD' | 'INR';

/**
 * Format helper for numbers / decimals
 */
function fmtNum(val: unknown, decimals: number = 2): string {
  if (val === null || val === undefined || val === '') return '';
  const num = Number(val);
  return isNaN(num) ? '' : num.toFixed(decimals);
}

/**
 * Format helper for strings
 */
function fmtStr(val: unknown): string {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

/**
 * Calculate cost & target selling rate in the requested export currency
 */
function getExportPrices(p: IStockPacket, currency: ExportCurrency, fallbackRate: number = 90) {
  const isUsd = (p.costCurrency || (p as any).originalCurrency) === 'USD';
  const exRate = Number(p.costExchangeRate) > 0 ? Number(p.costExchangeRate) : fallbackRate;
  const carats = Number(p.caratWeight || 0);

  let costPerCt = 0;

  if (currency === 'INR') {
    if (p.costPerCaratInr != null && Number(p.costPerCaratInr) > 0) {
      costPerCt = Number(p.costPerCaratInr);
    } else if (isUsd) {
      costPerCt = Math.round(Number(p.costPerCarat || 0) * exRate * 100) / 100;
    } else {
      costPerCt = Number(p.costPerCarat || 0);
    }
  } else {
    // USD
    if (isUsd) {
      costPerCt = Number(p.costPerCarat || 0);
    } else if (p.costPerCaratInr != null && Number(p.costPerCaratInr) > 0 && exRate > 0) {
      costPerCt = Math.round((Number(p.costPerCaratInr) / exRate) * 100) / 100;
    } else if (exRate > 0) {
      costPerCt = Math.round((Number(p.costPerCarat || 0) / exRate) * 100) / 100;
    } else {
      costPerCt = Number(p.costPerCarat || 0);
    }
  }

  // Total Cost is strictly calculated from the exported Cost/ct * Carats to maintain mathematical consistency
  let totalCost = 0;
  if (costPerCt > 0 && carats > 0) {
    totalCost = Math.round(costPerCt * carats * 100) / 100;
  } else if (currency === 'INR') {
    totalCost = Number(p.totalCostInr || p.totalCost || 0);
  } else {
    totalCost = Number(p.totalCost || 0);
  }

  // Target Sale Rate (Asking Price)
  let targetRate: number | null = null;
  if (p.targetSaleRate != null && (p.targetSaleRate as unknown) !== '') {
    const rawTarget = Number(p.targetSaleRate);
    if (!isNaN(rawTarget) && rawTarget > 0) {
      const isTargetUsd = p.targetSaleRateCurrency === 'USD' || (!p.targetSaleRateCurrency && isUsd);
      if (currency === 'INR') {
        targetRate = isTargetUsd ? Math.round(rawTarget * exRate * 100) / 100 : rawTarget;
      } else {
        targetRate = isTargetUsd ? rawTarget : (exRate > 0 ? Math.round((rawTarget / exRate) * 100) / 100 : rawTarget);
      }
    }
  }

  // Total selling price is also computed directly from Target Rate * Carats
  const totalPrice = targetRate && carats > 0 ? Math.round(targetRate * carats * 100) / 100 : (totalCost || '');

  return { costPerCt, totalCost, targetRate, totalPrice };
}

// ── DIAMO STANDARD HEADERS & MAPPINGS ─────────────────────────────
function getDiamoHeaders(currency: ExportCurrency): string[] {
  const sym = currency === 'INR' ? '₹' : '$';
  return [
    'Stock ID', 'Quality', 'Category', 'Shape', 'Carat Weight', 'Piece Count', 'Color', 'Clarity',
    'Cut', 'Polish', 'Symmetry', `Cost (${sym}/ct)`, `Total Cost (${sym})`, `Target Sale Rate (${sym}/ct)`,
    'Measurements', 'Length (mm)', 'Width (mm)', 'Depth (mm)', 'Total Depth %', 'Table %',
    'Fluorescence Intensity', 'Fluorescence Color', 'Rap Price ($/ct)', 'Rap Discount %',
    'Crown Angle', 'Crown Height', 'Pavilion Angle', 'Pavilion Depth', 'Girdle %',
    'Girdle Thin', 'Girdle Thick', 'Girdle Condition', 'Culet Size', 'Culet Condition',
    'Hearts & Arrows', 'Eye Clean', 'Shade', 'Milky', 'Treatment', 'Tinge', 'Lustre',
    'Table Inclusion', 'Side Inclusion', 'Black Inclusion', 'White Inclusion', 'Open Inclusion',
    'Table Open', 'Crown Open', 'Girdle Open', 'BGM', 'Growth Type', 'Type', 'Star Length',
    'Origin', 'Availability', 'City', 'State', 'Trade Show', 'Brand', 'Seller Spec',
    'Pair Stock #', 'Pair Separable', 'Parcel Stones', 'Report Filename', 'Report Issue Date',
    'Report Type', 'Lab Location', 'Allow RapLink Feed', 'Sarine Loupe',
    'Cert Type', 'Cert Number', 'Certificate URL', 'Web URL', 'Image Link', 'Video Link',
    'Laser Inscription', 'Key to Symbols', 'Cert Comment', 'Member Comment', 'Comment',
    'Fancy Color', 'Fancy Color Intensity', 'Fancy Color Overtone', 'Current Status', 'Registration Date'
  ];
}

function mapDiamoRow(p: IStockPacket, currency: ExportCurrency, fallbackRate: number): Record<string, unknown> {
  const sym = currency === 'INR' ? '₹' : '$';
  const prices = getExportPrices(p, currency, fallbackRate);

  return {
    'Stock ID': fmtStr(p.stockIdNumber),
    'Quality': fmtStr(p.quality?.qualityName),
    'Category': fmtStr(p.category),
    'Shape': fmtStr(p.shape),
    'Carat Weight': fmtNum(p.caratWeight, 3),
    'Piece Count': p.pieceCount ?? 1,
    'Color': fmtStr(p.color),
    'Clarity': fmtStr(p.clarity),
    'Cut': fmtStr(p.cut),
    'Polish': fmtStr(p.polish),
    'Symmetry': fmtStr(p.symmetry),
    [`Cost (${sym}/ct)`]: fmtNum(prices.costPerCt, 2),
    [`Total Cost (${sym})`]: fmtNum(prices.totalCost, 2),
    [`Target Sale Rate (${sym}/ct)`]: fmtNum(prices.targetRate, 2),
    'Measurements': fmtStr(p.measurements),
    'Length (mm)': fmtNum(p.lengthMm, 2),
    'Width (mm)': fmtNum(p.widthMm, 2),
    'Depth (mm)': fmtNum(p.depthMm, 2),
    'Total Depth %': fmtNum(p.totalDepthPct, 2),
    'Table %': fmtNum(p.tablePct, 2),
    'Fluorescence Intensity': fmtStr(p.fluorescenceIntensity),
    'Fluorescence Color': fmtStr(p.fluorescenceColor),
    'Rap Price ($/ct)': fmtNum(p.rapPricePerCarat, 2),
    'Rap Discount %': fmtNum(p.rapDiscountPct, 2),
    'Crown Angle': fmtNum(p.crownAngle, 2),
    'Crown Height': fmtNum(p.crownHeight, 2),
    'Pavilion Angle': fmtNum(p.pavilionAngle, 2),
    'Pavilion Depth': fmtNum(p.pavilionDepth, 2),
    'Girdle %': fmtNum(p.girdlePct, 2),
    'Girdle Thin': fmtStr(p.girdleMin),
    'Girdle Thick': fmtStr(p.girdleMax),
    'Girdle Condition': fmtStr(p.girdleCondition),
    'Culet Size': fmtStr(p.culetSize),
    'Culet Condition': fmtStr(p.culetCondition),
    'Hearts & Arrows': fmtStr(p.heartsAndArrows),
    'Eye Clean': fmtStr(p.eyeClean),
    'Shade': fmtStr(p.shade),
    'Milky': fmtStr(p.milky),
    'Treatment': fmtStr(p.treatment),
    'Tinge': fmtStr(p.tinge),
    'Lustre': fmtStr(p.lustre),
    'Table Inclusion': fmtStr(p.tableInclusion),
    'Side Inclusion': fmtStr(p.sideInclusion),
    'Black Inclusion': fmtStr(p.blackInclusion),
    'White Inclusion': fmtStr(p.whiteInclusion),
    'Open Inclusion': fmtStr(p.openInclusion),
    'Table Open': fmtStr(p.tableOpen),
    'Crown Open': fmtStr(p.crownOpen),
    'Girdle Open': fmtStr(p.girdleOpen),
    'BGM': fmtStr(p.bgm),
    'Growth Type': fmtStr(p.growthType),
    'Type': fmtStr(p.diamondType),
    'Star Length': fmtNum(p.starLength, 2),
    'Origin': fmtStr(p.origin),
    'Availability': fmtStr(p.availability || (p.currentStatus === 'HOLD' ? 'HOLD' : 'AVAILABLE')),
    'City': fmtStr(p.city),
    'State': fmtStr(p.state),
    'Trade Show': fmtStr(p.tradeShow),
    'Brand': fmtStr(p.brand),
    'Seller Spec': fmtStr(p.sellerSpec),
    'Pair Stock #': fmtStr(p.pairStockNumber),
    'Pair Separable': fmtStr(p.isPairSeparable),
    'Parcel Stones': fmtStr(p.parcelStones),
    'Report Filename': fmtStr(p.reportFilename),
    'Report Issue Date': fmtStr(p.reportIssueDate),
    'Report Type': fmtStr(p.reportType),
    'Lab Location': fmtStr(p.labLocation),
    'Allow RapLink Feed': fmtStr(p.allowRaplinkFeed),
    'Sarine Loupe': fmtStr(p.sarineLoupe),
    'Cert Type': fmtStr(p.certificateType),
    'Cert Number': fmtStr(p.certificateNumber),
    'Certificate URL': fmtStr(p.certificateUrl),
    'Web URL': fmtStr(p.webUrl),
    'Image Link': fmtStr(p.imageLink),
    'Video Link': fmtStr(p.videoLink),
    'Laser Inscription': fmtStr(p.inscription),
    'Key to Symbols': fmtStr(p.keyToSymbols),
    'Cert Comment': fmtStr(p.certComment),
    'Member Comment': fmtStr(p.memberComment),
    'Comment': fmtStr(p.diamondComment),
    'Fancy Color': fmtStr(p.fancyColor),
    'Fancy Color Intensity': fmtStr(p.fancyColorIntensity),
    'Fancy Color Overtone': fmtStr(p.fancyColorOvertone),
    'Current Status': fmtStr(p.currentStatus),
    'Registration Date': fmtStr(p.registrationDate),
  };
}

// ── RAPNET HEADERS & MAPPINGS ─────────────────────────────────────
function getRapnetHeaders(currency: ExportCurrency): string[] {
  const sym = currency === 'INR' ? '₹' : '$';
  return [
    'Stock #', 'Availability', 'Shape', 'Weight', 'Color', 'Clarity', `Price/ct ${sym}`, `Total ${sym}`,
    'Cut Grade', 'Polish', 'Symmetry', 'Fluorescence Intensity', 'Fluorescence Color', 'Measurements',
    'Lab', 'Certificate #', 'Treatment', 'Depth %', 'Table %', 'Girdle Thin', 'Girdle Thick',
    'Girdle %', 'Girdle Condition', 'Culet Size', 'Culet Condition', 'Crown Height', 'Crown Angle',
    'Pavilion Depth', 'Pavilion Angle', 'Laser Inscription', 'Cert comment', 'Key to symbols',
    'Member Comment', 'Star Length', 'Shade', 'White Inclusion', 'Black Inclusion', 'Open Inclusion',
    'Milky', 'Fancy Color', 'Fancy Color Intensity', 'Fancy Color Overtone', 'Country', 'State', 'City',
    'Brand', 'Seller Spec', 'Report Filename', 'Diamond Image', 'Video Link', 'Sarine Loupe',
    'Trade Show', 'Report Issue Date', 'Report Type', 'Lab Location', 'Pair Stock #',
    'Is Matched Pair Separable', 'Allow RapLink Feed', 'Parcel Stones', 'BGM', 'Type'
  ];
}

function mapRapnetRow(p: IStockPacket, currency: ExportCurrency, fallbackRate: number): Record<string, unknown> {
  const sym = currency === 'INR' ? '₹' : '$';
  const prices = getExportPrices(p, currency, fallbackRate);

  return {
    'Stock #': fmtStr(p.stockIdNumber),
    'Availability': fmtStr(p.availability || (p.currentStatus === 'HOLD' ? 'HOLD' : 'AVAILABLE')),
    'Shape': fmtStr(p.shape),
    'Weight': fmtNum(p.caratWeight, 3),
    'Color': fmtStr(p.color),
    'Clarity': fmtStr(p.clarity),
    [`Price/ct ${sym}`]: fmtNum(prices.targetRate || prices.costPerCt, 2),
    [`Total ${sym}`]: fmtNum(prices.totalPrice || prices.totalCost, 2),
    'Cut Grade': fmtStr(p.cut),
    'Polish': fmtStr(p.polish),
    'Symmetry': fmtStr(p.symmetry),
    'Fluorescence Intensity': fmtStr(p.fluorescenceIntensity),
    'Fluorescence Color': fmtStr(p.fluorescenceColor),
    'Measurements': fmtStr(p.measurements),
    'Lab': fmtStr(p.certificateType),
    'Certificate #': fmtStr(p.certificateNumber),
    'Treatment': fmtStr(p.treatment),
    'Depth %': fmtNum(p.totalDepthPct, 2),
    'Table %': fmtNum(p.tablePct, 2),
    'Girdle Thin': fmtStr(p.girdleMin),
    'Girdle Thick': fmtStr(p.girdleMax),
    'Girdle %': fmtNum(p.girdlePct, 2),
    'Girdle Condition': fmtStr(p.girdleCondition),
    'Culet Size': fmtStr(p.culetSize),
    'Culet Condition': fmtStr(p.culetCondition),
    'Crown Height': fmtNum(p.crownHeight, 2),
    'Crown Angle': fmtNum(p.crownAngle, 2),
    'Pavilion Depth': fmtNum(p.pavilionDepth, 2),
    'Pavilion Angle': fmtNum(p.pavilionAngle, 2),
    'Laser Inscription': fmtStr(p.inscription),
    'Cert comment': fmtStr(p.certComment),
    'Key to symbols': fmtStr(p.keyToSymbols),
    'Member Comment': fmtStr(p.memberComment),
    'Star Length': fmtNum(p.starLength, 2),
    'Shade': fmtStr(p.shade),
    'White Inclusion': fmtStr(p.whiteInclusion),
    'Black Inclusion': fmtStr(p.blackInclusion),
    'Open Inclusion': fmtStr(p.openInclusion),
    'Milky': fmtStr(p.milky),
    'Fancy Color': fmtStr(p.fancyColor),
    'Fancy Color Intensity': fmtStr(p.fancyColorIntensity),
    'Fancy Color Overtone': fmtStr(p.fancyColorOvertone),
    'Country': fmtStr(p.origin),
    'State': fmtStr(p.state),
    'City': fmtStr(p.city),
    'Brand': fmtStr(p.brand),
    'Seller Spec': fmtStr(p.sellerSpec),
    'Report Filename': fmtStr(p.reportFilename),
    'Diamond Image': fmtStr(p.imageLink),
    'Video Link': fmtStr(p.videoLink),
    'Sarine Loupe': fmtStr(p.sarineLoupe),
    'Trade Show': fmtStr(p.tradeShow),
    'Report Issue Date': fmtStr(p.reportIssueDate),
    'Report Type': fmtStr(p.reportType),
    'Lab Location': fmtStr(p.labLocation),
    'Pair Stock #': fmtStr(p.pairStockNumber),
    'Is Matched Pair Separable': fmtStr(p.isPairSeparable),
    'Allow RapLink Feed': fmtStr(p.allowRaplinkFeed),
    'Parcel Stones': fmtStr(p.parcelStones),
    'BGM': fmtStr(p.bgm),
    'Type': fmtStr(p.diamondType),
  };
}

// ── VDB HEADERS & MAPPINGS ────────────────────────────────────────
function getVdbHeaders(currency: ExportCurrency): string[] {
  const rateHeader = currency === 'INR' ? '₹/ct' : '$/ct';
  return [
    'Stock Id', 'Availability', 'Shape', 'Carat', 'Color', 'Clarity', rateHeader, 'Total price',
    'Cut', 'Pol', 'Sym', 'Certificate #', 'Measurements Length', 'Measurements Width',
    'Measurements Depth', 'Depth%', 'Table%', 'Girdle%', 'Culet Size', 'Girdle Condition',
    'Pavilion Depth', 'Crown Height', 'Crown Angle', 'Pavilion Angle', 'Certificate Url',
    'Image Link', 'Video Link', 'Fluorescence Intensity', 'Fluorescence Color', 'Milky',
    'BGM', 'Lab', 'Cert Comment', 'Laser Inscription', 'Member Comments', 'H&A', 'Country',
    'Eye Clean', 'Table Open', 'Crown Open', 'Girdle Open', 'Type', 'Tinge', 'Luster',
    'Black Inclusion', 'Table Inclusion', 'Growth Type', 'Treatment'
  ];
}

function mapVdbRow(p: IStockPacket, currency: ExportCurrency, fallbackRate: number): Record<string, unknown> {
  const rateHeader = currency === 'INR' ? '₹/ct' : '$/ct';
  const prices = getExportPrices(p, currency, fallbackRate);

  return {
    'Stock Id': fmtStr(p.stockIdNumber),
    'Availability': fmtStr(p.availability || (p.currentStatus === 'HOLD' ? 'HOLD' : 'AVAILABLE')),
    'Shape': fmtStr(p.shape),
    'Carat': fmtNum(p.caratWeight, 3),
    'Color': fmtStr(p.color),
    'Clarity': fmtStr(p.clarity),
    [rateHeader]: fmtNum(prices.targetRate || prices.costPerCt, 2),
    'Total price': fmtNum(prices.totalPrice || prices.totalCost, 2),
    'Cut': fmtStr(p.cut),
    'Pol': fmtStr(p.polish),
    'Sym': fmtStr(p.symmetry),
    'Certificate #': fmtStr(p.certificateNumber),
    'Measurements Length': fmtNum(p.lengthMm, 2),
    'Measurements Width': fmtNum(p.widthMm, 2),
    'Measurements Depth': fmtNum(p.depthMm, 2),
    'Depth%': fmtNum(p.totalDepthPct, 2),
    'Table%': fmtNum(p.tablePct, 2),
    'Girdle%': fmtNum(p.girdlePct, 2),
    'Culet Size': fmtStr(p.culetSize),
    'Girdle Condition': fmtStr(p.girdleCondition),
    'Pavilion Depth': fmtNum(p.pavilionDepth, 2),
    'Crown Height': fmtNum(p.crownHeight, 2),
    'Crown Angle': fmtNum(p.crownAngle, 2),
    'Pavilion Angle': fmtNum(p.pavilionAngle, 2),
    'Certificate Url': fmtStr(p.certificateUrl),
    'Image Link': fmtStr(p.imageLink),
    'Video Link': fmtStr(p.videoLink),
    'Fluorescence Intensity': fmtStr(p.fluorescenceIntensity),
    'Fluorescence Color': fmtStr(p.fluorescenceColor),
    'Milky': fmtStr(p.milky),
    'BGM': fmtStr(p.bgm),
    'Lab': fmtStr(p.certificateType),
    'Cert Comment': fmtStr(p.certComment),
    'Laser Inscription': fmtStr(p.inscription),
    'Member Comments': fmtStr(p.memberComment),
    'H&A': fmtStr(p.heartsAndArrows),
    'Country': fmtStr(p.origin),
    'Eye Clean': fmtStr(p.eyeClean),
    'Table Open': fmtStr(p.tableOpen),
    'Crown Open': fmtStr(p.crownOpen),
    'Girdle Open': fmtStr(p.girdleOpen),
    'Type': fmtStr(p.diamondType),
    'Tinge': fmtStr(p.tinge),
    'Luster': fmtStr(p.lustre),
    'Black Inclusion': fmtStr(p.blackInclusion),
    'Table Inclusion': fmtStr(p.tableInclusion),
    'Growth Type': fmtStr(p.growthType),
    'Treatment': fmtStr(p.treatment),
  };
}

// ── NIVODA HEADERS & MAPPINGS ─────────────────────────────────────
function getNivodaHeaders(currency: ExportCurrency): string[] {
  const rateHeader = currency === 'INR' ? '₹/ct' : '$/ct';
  return [
    'Stock Id', 'Availability', 'Shape', 'Carat', 'Color', 'Clarity', rateHeader, 'Total price',
    'Cut', 'Pol', 'Sym', 'Certificate #', 'Measurements Length', 'Measurements Width',
    'Measurements Depth', 'Depth%', 'Table%', 'Girdle%', 'Culet Size', 'Girdle Condition',
    'Pavilion Depth', 'Crown Height', 'Crown Angle', 'Pavilion Angle', 'Certificate Url',
    'Image', 'Weburl', 'VIDEO', 'Fluorescence Intensity', 'Fluorescence Color', 'Type',
    'Milky', 'Eye Clean', 'Inscription', 'Lab', 'Treatment', 'Location', 'State', 'City',
    'Cert comment', 'COP'
  ];
}

function mapNivodaRow(p: IStockPacket, currency: ExportCurrency, fallbackRate: number): Record<string, unknown> {
  const rateHeader = currency === 'INR' ? '₹/ct' : '$/ct';
  const prices = getExportPrices(p, currency, fallbackRate);

  return {
    'Stock Id': fmtStr(p.stockIdNumber),
    'Availability': fmtStr(p.availability || (p.currentStatus === 'HOLD' ? 'HOLD' : 'AVAILABLE')),
    'Shape': fmtStr(p.shape),
    'Carat': fmtNum(p.caratWeight, 3),
    'Color': fmtStr(p.color),
    'Clarity': fmtStr(p.clarity),
    [rateHeader]: fmtNum(prices.targetRate || prices.costPerCt, 2),
    'Total price': fmtNum(prices.totalPrice || prices.totalCost, 2),
    'Cut': fmtStr(p.cut),
    'Pol': fmtStr(p.polish),
    'Sym': fmtStr(p.symmetry),
    'Certificate #': fmtStr(p.certificateNumber),
    'Measurements Length': fmtNum(p.lengthMm, 2),
    'Measurements Width': fmtNum(p.widthMm, 2),
    'Measurements Depth': fmtNum(p.depthMm, 2),
    'Depth%': fmtNum(p.totalDepthPct, 2),
    'Table%': fmtNum(p.tablePct, 2),
    'Girdle%': fmtNum(p.girdlePct, 2),
    'Culet Size': fmtStr(p.culetSize),
    'Girdle Condition': fmtStr(p.girdleCondition),
    'Pavilion Depth': fmtNum(p.pavilionDepth, 2),
    'Crown Height': fmtNum(p.crownHeight, 2),
    'Crown Angle': fmtNum(p.crownAngle, 2),
    'Pavilion Angle': fmtNum(p.pavilionAngle, 2),
    'Certificate Url': fmtStr(p.certificateUrl),
    'Image': fmtStr(p.imageLink),
    'Weburl': fmtStr(p.webUrl),
    'VIDEO': fmtStr(p.videoLink),
    'Fluorescence Intensity': fmtStr(p.fluorescenceIntensity),
    'Fluorescence Color': fmtStr(p.fluorescenceColor),
    'Type': fmtStr(p.diamondType),
    'Milky': fmtStr(p.milky),
    'Eye Clean': fmtStr(p.eyeClean),
    'Inscription': fmtStr(p.inscription),
    'Lab': fmtStr(p.certificateType),
    'Treatment': fmtStr(p.treatment),
    'Location': fmtStr(p.labLocation),
    'State': fmtStr(p.state),
    'City': fmtStr(p.city),
    'Cert comment': fmtStr(p.certComment),
    'COP': fmtStr(p.origin),
  };
}

/**
 * Main export function to generate CSV or XLSX files
 */
export function exportStockPackets(
  packets: IStockPacket[],
  preset: ExportPreset,
  fileType: FileType,
  currency: ExportCurrency = 'USD',
  fallbackRate: number = 90,
  companyName?: string
): void {
  let headers: string[] = [];
  let rowMapper: (p: IStockPacket) => Record<string, unknown>;
  let presetName = 'DIAMO';

  switch (preset) {
    case 'RAPNET':
      headers = getRapnetHeaders(currency);
      rowMapper = (p) => mapRapnetRow(p, currency, fallbackRate);
      presetName = 'RapNet';
      break;
    case 'VDB':
      headers = getVdbHeaders(currency);
      rowMapper = (p) => mapVdbRow(p, currency, fallbackRate);
      presetName = 'VDB';
      break;
    case 'NIVODA':
      headers = getNivodaHeaders(currency);
      rowMapper = (p) => mapNivodaRow(p, currency, fallbackRate);
      presetName = 'Nivoda';
      break;
    case 'DIAMO':
    default:
      headers = getDiamoHeaders(currency);
      rowMapper = (p) => mapDiamoRow(p, currency, fallbackRate);
      presetName = 'DIAMO_Standard';
      break;
  }

  const mappedRows = packets.map(rowMapper);
  const fileName = `${companyName ? companyName.replace(/[^a-zA-Z0-9]/g, '_') + '_' : ''}Stock_${presetName}_${currency}_${new Date().toISOString().slice(0, 10)}`;

  if (fileType === 'XLSX') {
    const worksheet = XLSX.utils.json_to_sheet(mappedRows, { header: headers });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Stock Inventory');
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
  } else {
    // Generate CSV
    const csvLines: string[] = [];
    // Header line
    csvLines.push(headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','));
    
    // Data lines
    mappedRows.forEach(row => {
      const line = headers.map(h => {
        const val = row[h] ?? '';
        const strVal = String(val);
        // Escape quotes
        return `"${strVal.replace(/"/g, '""')}"`;
      }).join(',');
      csvLines.push(line);
    });

    const csvContent = csvLines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${fileName}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
