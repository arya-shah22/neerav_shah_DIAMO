// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Universal CSV Header Alias Map
// Maps CSV column headers from VDB, Nivoda, RapNet, and custom
// formats to internal StockPacket field names.
// ═══════════════════════════════════════════════════════════════

/**
 * Normalize a header string for lookup:
 * - Trim whitespace
 * - Lowercase
 * - Remove special characters except alphanumeric and spaces
 * - Collapse multiple spaces to single space
 */
export function normalizeHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9%\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Master alias dictionary mapping all known CSV column header variations
 * to our internal StockPacket field names.
 */
export const CSV_HEADER_ALIASES: Record<string, string> = {
  // ── Stock ID ──────────────────────────────────────
  'stock id': 'stockIdNumber',
  'stockid': 'stockIdNumber',
  'stock id number': 'stockIdNumber',
  'stockidnumber': 'stockIdNumber',
  'stock': 'stockIdNumber',
  'stock num': 'stockIdNumber',
  'stock no': 'stockIdNumber',
  'packet id': 'stockIdNumber',
  'packetid': 'stockIdNumber',
  'stone id': 'stockIdNumber',
  'stoneid': 'stockIdNumber',
  'lot no': 'stockIdNumber',
  'lotno': 'stockIdNumber',
  'lot number': 'stockIdNumber',
  'diamond id': 'stockIdNumber',

  // ── Category ──────────────────────────────────────
  'category': 'category',

  // ── Diamond Type ──────────────────────────────────
  'type': 'diamondType',
  'diamond type': 'diamondType',
  'diamondtype': 'diamondType',

  // ── Shape ─────────────────────────────────────────
  'shape': 'shape',
  'cut shape': 'shape',

  // ── Carat Weight ──────────────────────────────────
  'carats': 'caratWeight',
  'carat': 'caratWeight',
  'weight': 'caratWeight',
  'carat weight': 'caratWeight',
  'caratweight': 'caratWeight',
  'size': 'caratWeight',
  'cts': 'caratWeight',

  // ── Piece Count ───────────────────────────────────
  'pieces': 'pieceCount',
  'piece': 'pieceCount',
  'pcs': 'pieceCount',
  'piece count': 'pieceCount',
  'piececount': 'pieceCount',
  'qty': 'pieceCount',
  'quantity': 'pieceCount',

  // ── Color ─────────────────────────────────────────
  'color': 'color',
  'colour': 'color',

  // ── Clarity ───────────────────────────────────────
  'clarity': 'clarity',
  'purity': 'clarity',

  // ── Cut ────────────────────────────────────────────
  'cut': 'cut',
  'cut grade': 'cut',
  'cutgrade': 'cut',

  // ── Polish ────────────────────────────────────────
  'polish': 'polish',
  'pol': 'polish',

  // ── Symmetry ──────────────────────────────────────
  'symmetry': 'symmetry',
  'sym': 'symmetry',
  'symm': 'symmetry',

  // ── Length ─────────────────────────────────────────
  'length': 'lengthMm',
  'length mm': 'lengthMm',
  'lengthmm': 'lengthMm',
  'measurement length': 'lengthMm',
  'measurement legth': 'lengthMm',
  'measurements length': 'lengthMm',
  'measurements legth': 'lengthMm',
  'meas length': 'lengthMm',

  // ── Combined Measurements ────────────────────────
  'measurements': 'measurements',
  'measurement': 'measurements',
  'meas': 'measurements',
  'dimension': 'measurements',
  'dimensions': 'measurements',

  // ── Width ─────────────────────────────────────────
  'width': 'widthMm',
  'width mm': 'widthMm',
  'widthmm': 'widthMm',
  'measurement width': 'widthMm',
  'measurements width': 'widthMm',
  'meas width': 'widthMm',

  // ── Depth (mm) ────────────────────────────────────
  'depth': 'depthMm',
  'depth mm': 'depthMm',
  'depthmm': 'depthMm',
  'measurement depth': 'depthMm',
  'measurements depth': 'depthMm',
  'meas depth': 'depthMm',
  'height': 'depthMm',

  // ── Depth % ───────────────────────────────────────
  'depth %': 'totalDepthPct',
  'depth%': 'totalDepthPct',
  'depth pct': 'totalDepthPct',
  'depthpct': 'totalDepthPct',
  'depth percent': 'totalDepthPct',
  'depthpercent': 'totalDepthPct',
  'total depth pct': 'totalDepthPct',
  'totaldepthpct': 'totalDepthPct',
  'total depth': 'totalDepthPct',
  'td': 'totalDepthPct',

  // ── Table % ───────────────────────────────────────
  'table %': 'tablePct',
  'table%': 'tablePct',
  'table pct': 'tablePct',
  'tablepct': 'tablePct',
  'table percent': 'tablePct',
  'tablepercent': 'tablePct',
  'table': 'tablePct',

  // ── Certificate Type ──────────────────────────────
  'cert type': 'certificateType',
  'certtype': 'certificateType',
  'certificate type': 'certificateType',
  'certificatetype': 'certificateType',
  'lab': 'certificateType',

  // ── Certificate Number ────────────────────────────
  'cert number': 'certificateNumber',
  'certnumber': 'certificateNumber',
  'certificate number': 'certificateNumber',
  'certificatenumber': 'certificateNumber',
  'cert no': 'certificateNumber',
  'certificate no': 'certificateNumber',
  'cert': 'certificateNumber',
  'certificate': 'certificateNumber',
  'report number': 'certificateNumber',
  'report no': 'certificateNumber',

  // ── Cost / Rate ───────────────────────────────────
  'rate': 'costPerCarat',
  'cost per carat': 'costPerCarat',
  'costpercarat': 'costPerCarat',
  'price per carat': 'costPerCarat',
  'pricepercarat': 'costPerCarat',
  'price ct': 'costPerCarat',
  'pricect': 'costPerCarat',
  'ratect': 'costPerCarat',
  'ct': 'costPerCarat',

  // ── Total Cost ────────────────────────────────────
  'total cost': 'totalCost',
  'totalcost': 'totalCost',
  'total price': 'totalCost',
  'totalprice': 'totalCost',
  'total': 'totalCost',
  'amount': 'totalCost',
  'total amount': 'totalCost',
  'net amount': 'totalCost',

  // ── Target Sale Rate ──────────────────────────────
  'target sale rate': 'targetSaleRate',
  'targetsalerate': 'targetSaleRate',
  'asking price': 'targetSaleRate',
  'askingprice': 'targetSaleRate',

  // ═══════════════ EXTENDED FIELDS ══════════════════

  // ── Fluorescence Intensity ────────────────────────
  'fluorescence': 'fluorescenceIntensity',
  'fluor': 'fluorescenceIntensity',
  'fl': 'fluorescenceIntensity',
  'fluorescence intensity': 'fluorescenceIntensity',
  'fluorescenceintensity': 'fluorescenceIntensity',
  'fluor intensity': 'fluorescenceIntensity',
  'flourintensity': 'fluorescenceIntensity',
  'fl intensity': 'fluorescenceIntensity',
  'flintensity': 'fluorescenceIntensity',
  'fls intensity': 'fluorescenceIntensity',
  'fls': 'fluorescenceIntensity',

  // ── Fluorescence Color ────────────────────────────
  'fluorescence color': 'fluorescenceColor',
  'fluorescencecolor': 'fluorescenceColor',
  'fluor color': 'fluorescenceColor',
  'fluorcolor': 'fluorescenceColor',
  'fl color': 'fluorescenceColor',
  'flcolor': 'fluorescenceColor',

  // ── Rap Price ─────────────────────────────────────
  'rap price': 'rapPricePerCarat',
  'rapprice': 'rapPricePerCarat',
  'rap price per carat': 'rapPricePerCarat',
  'rappricepercarat': 'rapPricePerCarat',
  'rap': 'rapPricePerCarat',
  'rapaport': 'rapPricePerCarat',
  'rapaport price': 'rapPricePerCarat',
  'list price': 'rapPricePerCarat',

  // ── Rap Discount % ────────────────────────────────
  'rap discount': 'rapDiscountPct',
  'rapdiscount': 'rapDiscountPct',
  'rap discount pct': 'rapDiscountPct',
  'rapdiscountpct': 'rapDiscountPct',
  'discount': 'rapDiscountPct',
  'disc': 'rapDiscountPct',
  'discount pct': 'rapDiscountPct',
  'discountpct': 'rapDiscountPct',
  'back': 'rapDiscountPct',
  'rap back': 'rapDiscountPct',

  // ── Crown Angle ───────────────────────────────────
  'crown angle': 'crownAngle',
  'crownangle': 'crownAngle',
  'cr angle': 'crownAngle',
  'crangle': 'crownAngle',
  'ca': 'crownAngle',

  // ── Crown Height ──────────────────────────────────
  'crown height': 'crownHeight',
  'crownheight': 'crownHeight',
  'cr height': 'crownHeight',
  'crheight': 'crownHeight',
  'ch': 'crownHeight',

  // ── Pavilion Angle ────────────────────────────────
  'pavilion angle': 'pavilionAngle',
  'pavilionangle': 'pavilionAngle',
  'pav angle': 'pavilionAngle',
  'pavangle': 'pavilionAngle',
  'pa': 'pavilionAngle',

  // ── Pavilion Depth ────────────────────────────────
  'pavilion depth': 'pavilionDepth',
  'paviliondepth': 'pavilionDepth',
  'pav depth': 'pavilionDepth',
  'pavdepth': 'pavilionDepth',
  'pd': 'pavilionDepth',

  // ── Girdle ────────────────────────────────────────
  'girdle min': 'girdleMin',
  'girdlemin': 'girdleMin',
  'girdle thin': 'girdleMin',
  'girdlethin': 'girdleMin',
  'girdle max': 'girdleMax',
  'girdlemax': 'girdleMax',
  'girdle thick': 'girdleMax',
  'girdlethick': 'girdleMax',
  'girdle condition': 'girdleCondition',
  'girdlecondition': 'girdleCondition',
  'girdle': 'girdleCondition',
  'girdle %': 'girdlePct',
  'girdle%': 'girdlePct',
  'girdle pct': 'girdlePct',
  'girdlepct': 'girdlePct',
  'girdle open': 'girdleOpen',
  'girdleopen': 'girdleOpen',

  // ── Culet ─────────────────────────────────────────
  'culet size': 'culetSize',
  'culetsize': 'culetSize',
  'culet': 'culetSize',
  'culet condition': 'culetCondition',
  'culetcondition': 'culetCondition',

  // ── Hearts & Arrows ───────────────────────────────
  'ha': 'heartsAndArrows',
  'hearts and arrows': 'heartsAndArrows',
  'heartsandarrows': 'heartsAndArrows',
  'hearts  arrows': 'heartsAndArrows',

  // ── Eye Clean ─────────────────────────────────────
  'eye clean': 'eyeClean',
  'eyeclean': 'eyeClean',
  'ec': 'eyeClean',

  // ── Shade ─────────────────────────────────────────
  'shade': 'shade',
  'brown shade': 'shade',

  // ── Milky ─────────────────────────────────────────
  'milky': 'milky',

  // ── Treatment ─────────────────────────────────────
  'treatment': 'treatment',
  'treated': 'treatment',

  // ── Tinge ─────────────────────────────────────────
  'tinge': 'tinge',

  // ── Lustre ────────────────────────────────────────
  'lustre': 'lustre',
  'luster': 'lustre',

  // ── Table Inclusion ───────────────────────────────
  'table inclusion': 'tableInclusion',
  'tableinclusion': 'tableInclusion',
  'table incl': 'tableInclusion',
  'tableincl': 'tableInclusion',

  // ── Side Inclusion ────────────────────────────────
  'side inclusion': 'sideInclusion',
  'sideinclusion': 'sideInclusion',
  'side incl': 'sideInclusion',
  'sideincl': 'sideInclusion',

  // ── Table Open ────────────────────────────────────
  'table open': 'tableOpen',
  'tableopen': 'tableOpen',

  // ── Crown Open ────────────────────────────────────
  'crown open': 'crownOpen',
  'crownopen': 'crownOpen',

  // ── Origin ────────────────────────────────────────
  'origin': 'origin',
  'country': 'origin',
  'country of origin': 'origin',
  'countryoforigin': 'origin',
  'cop': 'origin',

  // ── Certificate URL ───────────────────────────────
  'certificate url': 'certificateUrl',
  'certificateurl': 'certificateUrl',
  'cert url': 'certificateUrl',
  'certurl': 'certificateUrl',
  'report url': 'certificateUrl',
  'reporturl': 'certificateUrl',
  'certificate link': 'certificateUrl',
  'cert link': 'certificateUrl',

  // ── Web URL ───────────────────────────────────────
  'web url': 'webUrl',
  'weburl': 'webUrl',
  'diamond url': 'webUrl',
  'diamondurl': 'webUrl',
  'stone url': 'webUrl',
  'stoneurl': 'webUrl',
  'link': 'webUrl',
  'url': 'webUrl',

  // ── Inscription ───────────────────────────────────
  'inscription': 'inscription',
  'laser inscription': 'inscription',
  'laserinscription': 'inscription',

  // ── Key to Symbols ────────────────────────────────
  'key to symbols': 'keyToSymbols',
  'keytosymbols': 'keyToSymbols',
  'key to sym': 'keyToSymbols',
  'keytosym': 'keyToSymbols',
  'key symbols': 'keyToSymbols',

  // ── Comment / Remarks ─────────────────────────────
  'comment': 'diamondComment',
  'comments': 'diamondComment',
  'remark': 'diamondComment',
  'remarks': 'diamondComment',
  'description': 'diamondComment',

  // ── Fancy Color ───────────────────────────────────
  'fancy color': 'fancyColor',
  'fancycolor': 'fancyColor',
  'fancy colour': 'fancyColor',

  // ── Fancy Color Intensity ─────────────────────────
  'fancy color intensity': 'fancyColorIntensity',
  'fancycolorintensity': 'fancyColorIntensity',
  'fancy intensity': 'fancyColorIntensity',
  'fancyintensity': 'fancyColorIntensity',

  // ── Fancy Color Overtone ──────────────────────────
  'fancy color overtone': 'fancyColorOvertone',
  'fancycolorovertone': 'fancyColorOvertone',
  'fancy overtone': 'fancyColorOvertone',
  'fancyovertone': 'fancyColorOvertone',

  // ── Image Link ────────────────────────────────────
  'image link': 'imageLink',
  'imagelink': 'imageLink',
  'diamond image': 'imageLink',
  'diamondimage': 'imageLink',
  'image': 'imageLink',
  'photo': 'imageLink',
  'picture': 'imageLink',
  'image url': 'imageLink',
  'imageurl': 'imageLink',

  // ── Video Link ────────────────────────────────────
  'video link': 'videoLink',
  'videolink': 'videoLink',
  'video': 'videoLink',
  'video url': 'videoLink',
  'videourl': 'videoLink',
  'movie': 'videoLink',
  'movie link': 'videoLink',
  'loupe': 'videoLink',

  // ── Additional Marketplace & Specialty Fields ────
  'availability': 'availability',
  'city': 'city',
  'state': 'state',
  'trade show': 'tradeShow',
  'tradeshow': 'tradeShow',
  'brand': 'brand',
  'seller spec': 'sellerSpec',
  'sellerspec': 'sellerSpec',
  'pair stock': 'pairStockNumber',
  'pair stock #': 'pairStockNumber',
  'pair stock num': 'pairStockNumber',
  'pair stock number': 'pairStockNumber',
  'pairstocknumber': 'pairStockNumber',
  'is matched pair separable': 'isPairSeparable',
  'ismatchedpairseparable': 'isPairSeparable',
  'pair separable': 'isPairSeparable',
  'parcel stones': 'parcelStones',
  'parcelstones': 'parcelStones',
  'report filename': 'reportFilename',
  'reportfilename': 'reportFilename',
  'report issue date': 'reportIssueDate',
  'reportissuedate': 'reportIssueDate',
  'report type': 'reportType',
  'reporttype': 'reportType',
  'lab location': 'labLocation',
  'lablocation': 'labLocation',
  'allow raplink feed': 'allowRaplinkFeed',
  'allowraplinkfeed': 'allowRaplinkFeed',
  'raplink feed': 'allowRaplinkFeed',
  'sarine loupe': 'sarineLoupe',
  'sarineloupe': 'sarineLoupe',
  'black inclusion': 'blackInclusion',
  'blackinclusion': 'blackInclusion',
  'white inclusion': 'whiteInclusion',
  'whiteinclusion': 'whiteInclusion',
  'open inclusion': 'openInclusion',
  'openinclusion': 'openInclusion',
  'star length': 'starLength',
  'starlength': 'starLength',
  'growth type': 'growthType',
  'growthtype': 'growthType',
  'bgm': 'bgm',
  // ── Cert Comment ──────────────────────────────────
  'cert comment': 'certComment',
  'certcomment': 'certComment',
  'cert comments': 'certComment',
  'certcomments': 'certComment',
  'certificate comment': 'certComment',
  'certificatecomment': 'certComment',
  'certificate comments': 'certComment',
  'certificatecomments': 'certComment',
  'lab comment': 'certComment',
  'labcomment': 'certComment',
  'lab comments': 'certComment',
  'labcomments': 'certComment',
  'report comment': 'certComment',
  'reportcomment': 'certComment',
  'report comments': 'certComment',
  'reportcomments': 'certComment',

  // ── Member Comment ────────────────────────────────
  'member comment': 'memberComment',
  'membercomment': 'memberComment',
  'member comments': 'memberComment',
  'membercomments': 'memberComment',
  'seller comment': 'memberComment',
  'sellercomment': 'memberComment',
  'seller comments': 'memberComment',
  'sellercomments': 'memberComment',
};

/**
 * Resolve a raw CSV column header to our internal field name.
 * Returns undefined if no match found.
 */
export function resolveHeaderAlias(rawHeader: string): string | undefined {
  const normalized = normalizeHeader(rawHeader);
  return CSV_HEADER_ALIASES[normalized];
}
