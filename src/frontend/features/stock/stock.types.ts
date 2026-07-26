// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Stock Types (Stage 3)
// ═══════════════════════════════════════════════════════════════

export type StockStatus =
  | 'CREATED'
  | 'PURCHASED'
  | 'AVAILABLE'
  | 'HOLD'
  | 'JOB_WORK'
  | 'SOLD'
  | 'RETURNED'
  | 'DAMAGED'
  | 'ARCHIVED'
  | 'PROCESSED';

export type StockCategory = 'CERTIFIED' | 'NON_CERTIFIED';

export type StockOwnership = 'COMPANY' | 'SUPPLIER_MEMO' | 'CUSTOMER_MEMO';

export type MovementType =
  | 'STOCK_CREATION'
  | 'PURCHASE'
  | 'PURCHASE_RETURN'
  | 'SALES'
  | 'SALES_RETURN'
  | 'JOB_WORK_ISSUE'
  | 'JOB_WORK_RECEIVE'
  | 'TRADING_MEMO'
  | 'MANUAL_ADJUSTMENT'
  | 'CORRECTION'
  | 'ARCHIVE'
  | 'QUALITY_TRANSFORMATION';

export interface IStockQualityRef {
  id: number;
  qualityName: string;
  itemCode: string;
}

export interface IStockPacket {
  id: number;
  companyId: number;
  qualityId: number;
  stockIdNumber: string;
  category: StockCategory;
  registrationDate: string;
  shape: string | null;
  caratWeight: number;
  pieceCount: number;
  color: string | null;
  clarity: string | null;
  cut: string | null;
  polish: string | null;
  symmetry: string | null;
  lengthMm: number | null;
  widthMm: number | null;
  depthMm: number | null;
  totalDepthPct: number | null;
  tablePct: number | null;
  certificateType: string | null;
  certificateNumber: string | null;
  costPerCarat: number;
  totalCost: number;
  targetSaleRate?: number | null;
  currentStatus: StockStatus;
  currentOwnership: StockOwnership;
  currentOwnerId: number | null;
  currentLocation: string | null;
  // Lineage
  sourcePacketId?: number | null;
  sourceTransformId?: number | null;
  sourcePacket?: {
    id: number;
    stockIdNumber: string;
    caratWeight: number;
    qualityId: number;
    quality?: IStockQualityRef;
    currentStatus: StockStatus;
  } | null;
  imageLink?: string | null;
  videoLink?: string | null;
  media?: IStockMedia[];
  quality?: IStockQualityRef;
  _count?: {
    movements: number;
    reservations: number;
    media: number;
  };
}

export interface IStockMedia {
  id: number;
  stockPacketId: number;
  mediaType: string;
  filePath: string;
  fileName: string;
  sortOrder: number;
}

export interface IStockMovement {
  id: number;
  stockPacketId: number;
  movementDate: string;
  movementType: MovementType;
  previousStatus: StockStatus;
  newStatus: StockStatus;
  carats: number | null;
  pieces: number | null;
  remarks: string | null;
  createdAt: string;
}

// ─── Stock Conversion Types ─────────────────────────────────

export interface IStockConversionOutput {
  id: number;
  stockConversionId: number;
  rowNumber: number;
  outputPacketId: number;
  outputQualityId: number;
  carats: number;
  pieces: number;
  shape: string | null;
  color: string | null;
  clarity: string | null;
  cut: string | null;
  costPerCarat: number;
  totalCost: number;
  targetSaleRate?: number | null;
  remarks: string | null;
  outputPacket?: IStockPacket;
  outputQuality?: IStockQualityRef;
}

export interface IStockConversion {
  id: number;
  companyId: number;
  conversionDate: string;
  conversionNumber: string;
  sourcePacketId: number;
  sourceQualityId: number;
  sourceCarats: number;
  sourceCost: number;
  isFullConsumption: boolean;
  consumedCarats: number;
  remainingCarats: number;
  jobVoucherId: number | null;
  challanVoucherId: number | null;
  processingCost: number;
  totalOutputCarats: number;
  weightLoss: number;
  lossPercentage: number;
  narration: string | null;
  createdAt: string;
  sourcePacket?: IStockPacket;
  sourceQuality?: IStockQualityRef;
  outputItems: IStockConversionOutput[];
}

export const STOCK_STATUS_LABELS: Record<StockStatus, string> = {
  CREATED: 'Created',
  PURCHASED: 'Purchased',
  AVAILABLE: 'Available',
  HOLD: 'On Hold',
  JOB_WORK: 'Job Work',
  SOLD: 'Sold',
  RETURNED: 'Returned',
  DAMAGED: 'Damaged',
  ARCHIVED: 'Archived',
  PROCESSED: 'Processed',
};

/** Statuses that allow editing packet details (matches backend EDITABLE_STATUSES). */
export const EDITABLE_STOCK_STATUSES: StockStatus[] = [
  'CREATED',
  'PURCHASED',
  'AVAILABLE',
  'HOLD',
  'RETURNED',
  'DAMAGED',
];

export const STOCK_STATUS_BADGE_VARIANT: Record<
  StockStatus,
  'success' | 'warning' | 'danger' | 'info' | 'default' | 'primary'
> = {
  CREATED: 'default',
  PURCHASED: 'info',
  AVAILABLE: 'success',
  HOLD: 'warning',
  JOB_WORK: 'primary',
  SOLD: 'danger',
  RETURNED: 'info',
  DAMAGED: 'danger',
  ARCHIVED: 'default',
  PROCESSED: 'info',
};

export const CERTIFICATE_TYPES = ['IGI', 'GIA', 'HRD', 'SGL'] as const;

export { DEFAULT_DIAMOND_SHAPES as DIAMOND_SHAPES } from '../../../shared/constants/diamond-shapes';

