// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Invoice Calculation (single source of truth)
//
// These formulas were previously hand-duplicated in InvoiceFormPage.tsx and
// invoice.service.ts. The two copies drifted, so the total shown on screen was
// not the total that got saved. Both sides now call this module.
//
// Conventions fixed here:
//  - Header figures are built by SUMMING the lines, never recomputed from gross,
//    so `header.net` can never disagree with the sum of its lines.
//  - Per-line discount is part of the taxable value (it used to be dropped from
//    the header, over-billing the customer).
//  - Money is rounded to 2 dp at each step so the JS result matches what MySQL
//    stores in Decimal(18,2); the invoice net is then rounded per currency.
//  - GST is charged on the post-discount, post-add/less line value.
// ═══════════════════════════════════════════════════════════════

export type CalcCurrency = 'INR' | 'USD';

export interface InvoiceLineInput {
  carats?: number | string | null;
  pieces?: number | string | null;
  isPiecesUncounted?: boolean;
  rate?: number | string | null;
  discountPct?: number | string | null;
  /** Resolved by the caller: backend from the Quality GST history, UI from the quality list. */
  gstPct?: number | string | null;
}

export interface InvoiceCalcContext {
  addPct?: number | string | null;
  lessPct?: number | string | null;
  /** true → CGST+SGST, false → IGST. */
  isSameState: boolean;
  currency: CalcCurrency;
  /** Always > 0; callers normalise before passing. */
  exchangeRate: number;
  /** Sum of extra charges, already expressed in `currency`. */
  extraChargesTotal?: number;
}

export interface LineTotals {
  carats: number;
  pieces: number;
  rate: number;
  gross: number;
  discount: number;
  addAmount: number;
  lessAmount: number;
  taxable: number;
  cgst: number;
  sgst: number;
  igst: number;
  net: number;
}

export interface InvoiceTotals {
  lines: LineTotals[];
  totalCarats: number;
  totalPieces: number;
  totalGrossAmount: number;
  /** Per-line discount + the "less" reduction, matching what the header stores. */
  totalDiscount: number;
  extraCharges: number;
  taxableTotal: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  taxTotal: number;
  rawNet: number;
  roundOff: number;
  netAmount: number;
}

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** Round to paise/cents. The epsilon nudge keeps values like 1.005 from rounding down. */
export const round2 = (v: number): number => Math.round((v + Number.EPSILON) * 100) / 100;

/**
 * Round an invoice total for its currency. Indian GST invoices are rounded to
 * the whole rupee; a foreign-currency invoice must keep its cents — rounding a
 * USD invoice to whole dollars used to dump up to $0.50 into Round-off.
 */
export const roundNet = (v: number, currency: CalcCurrency): number =>
  currency === 'INR' ? Math.round(v) : round2(v);

/** Convert between the two supported currencies. */
export function convertAmount(
  amount: number,
  from: CalcCurrency,
  to: CalcCurrency,
  exchangeRate: number,
): number {
  const rate = exchangeRate > 0 ? exchangeRate : 1;
  if (from === to) return round2(amount);
  return from === 'USD' ? round2(amount * rate) : round2(amount / rate);
}

/**
 * The "other currency" figure stored alongside every amount:
 * a USD document stores its INR equivalent, an INR document its USD equivalent.
 */
export function altAmount(amount: number, currency: CalcCurrency, exchangeRate: number): number {
  const rate = exchangeRate > 0 ? exchangeRate : 1;
  return currency === 'USD' ? round2(amount * rate) : round2(amount / rate);
}

export function computeLineTotals(line: InvoiceLineInput, ctx: InvoiceCalcContext): LineTotals {
  const carats = num(line.carats);
  const rate = num(line.rate);
  const pieces =
    line.isPiecesUncounted || line.pieces === null || line.pieces === undefined || line.pieces === ''
      ? 0
      : num(line.pieces);

  const addPct = num(ctx.addPct);
  const lessPct = num(ctx.lessPct);
  // Clamped: a discount outside 0-100% flips the taxable value negative and
  // the ledger then carries a negative tax leg.
  const discountPct = Math.min(100, Math.max(0, num(line.discountPct)));
  const gstPct = num(line.gstPct);

  const gross = round2(carats * rate);
  const discount = round2((gross * discountPct) / 100);
  const addAmount = round2((gross * addPct) / 100);
  const lessAmount = round2((gross * lessPct) / 100);
  const taxable = round2(gross + addAmount - lessAmount - discount);

  let cgst = 0;
  let sgst = 0;
  let igst = 0;
  if (ctx.isSameState) {
    cgst = round2((taxable * (gstPct / 2)) / 100);
    sgst = round2((taxable * (gstPct / 2)) / 100);
  } else {
    igst = round2((taxable * gstPct) / 100);
  }

  return {
    carats,
    pieces,
    rate,
    gross,
    discount,
    addAmount,
    lessAmount,
    taxable,
    cgst,
    sgst,
    igst,
    net: round2(taxable + cgst + sgst + igst),
  };
}

export function computeInvoiceTotals(
  items: InvoiceLineInput[],
  ctx: InvoiceCalcContext,
): InvoiceTotals {
  const lines = items.map((item) => computeLineTotals(item, ctx));

  const sum = (pick: (l: LineTotals) => number) => round2(lines.reduce((acc, l) => acc + pick(l), 0));

  const addPct = num(ctx.addPct);
  const lessPct = num(ctx.lessPct);
  const extraCharges = round2(num(ctx.extraChargesTotal));

  // Extra charges receive the same add/less treatment as goods but are not
  // taxed — preserving existing behaviour. They are folded in here rather than
  // into the lines so that taxableTotal stays equal to Σ line taxable + extras.
  const extrasAdjusted = round2(extraCharges + (extraCharges * addPct) / 100 - (extraCharges * lessPct) / 100);

  const taxableTotal = round2(sum((l) => l.taxable) + extrasAdjusted);
  const totalCgst = sum((l) => l.cgst);
  const totalSgst = sum((l) => l.sgst);
  const totalIgst = sum((l) => l.igst);
  const taxTotal = round2(totalCgst + totalSgst + totalIgst);

  const rawNet = round2(taxableTotal + taxTotal);
  const netAmount = roundNet(rawNet, ctx.currency);

  return {
    lines,
    totalCarats: round2(lines.reduce((acc, l) => acc + l.carats, 0)),
    totalPieces: lines.reduce((acc, l) => acc + l.pieces, 0),
    totalGrossAmount: round2(sum((l) => l.gross) + extraCharges),
    totalDiscount: round2(sum((l) => l.discount) + sum((l) => l.lessAmount)),
    extraCharges,
    taxableTotal,
    totalCgst,
    totalSgst,
    totalIgst,
    taxTotal,
    rawNet,
    roundOff: round2(netAmount - rawNet),
    netAmount,
  };
}

/**
 * Pick the GST rate in force on `onDate` from a quality's rate history.
 * Falls back to the earliest record so a back-dated invoice still gets a rate.
 */
export function resolveGstPct(
  history: Array<{ applyDate: Date | string; gstPct: unknown }> | undefined | null,
  onDate: Date,
): number {
  if (!history || history.length === 0) return 0;
  const sorted = [...history].sort(
    (a, b) => new Date(a.applyDate).getTime() - new Date(b.applyDate).getTime(),
  );
  let applicable = sorted[0];
  for (const entry of sorted) {
    if (new Date(entry.applyDate).getTime() <= onDate.getTime()) applicable = entry;
  }
  return num(applicable.gstPct);
}
