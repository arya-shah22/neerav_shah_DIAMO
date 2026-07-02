// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Common Shared Types
// ═══════════════════════════════════════════════════════════════

/** Standard API/IPC response wrapper */
export interface IApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/** Paginated list response */
export interface IPaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** Common list query parameters */
export interface IListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

/** Soft-deletable entity base */
export interface ISoftDeletable {
  isDeleted: boolean;
  deletedAt: string | null;
}

/** Auditable entity base */
export interface IAuditable {
  createdAt: string;
  updatedAt: string;
  createdBy: number;
  updatedBy: number;
  version: number;
}
