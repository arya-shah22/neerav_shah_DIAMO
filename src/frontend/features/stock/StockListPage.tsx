// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Stock List Page (Stage 3)
// ═══════════════════════════════════════════════════════════════

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Edit2, Trash2, Gem, Eye, ChevronUp, ChevronDown, SlidersHorizontal, RefreshCw } from 'lucide-react';
import * as XLSX from 'xlsx';
import { resolveHeaderAlias } from '../../../shared/constants/csv-header-map';
import { syncStockMeasurements } from '../../../shared/utils/diamond-measurement';
import { useIpc } from '../../hooks/useIpc';
import { useActiveCompany } from '../../hooks/useActiveCompany';
import { DataGrid, Column } from '../../components/ui/DataGrid';
import { Button, Badge, Input, Select, Modal, useToast } from '../../components/ui';
import { exportStockPackets, ExportPreset, FileType } from './stock-export-helper';
import { useCompanyStore } from '../../state/company-store';
import { IQuality } from '../quality/quality.types';
import {
  IStockPacket,
  STOCK_STATUS_LABELS,
  STOCK_STATUS_BADGE_VARIANT,
  EDITABLE_STOCK_STATUSES,
  StockCategory,
  StockStatus,
} from './stock.types';

const STATUS_OPTIONS = Object.entries(STOCK_STATUS_LABELS)
  .filter(([value]) => value !== 'ARCHIVED')
  .map(([value, label]) => ({ value, label }));

type StatusModalStep = 'confirm' | 'select';

const ROUTES = {
  new: '/inventory/stock/new',
  edit: (id: number) => `/inventory/stock/edit/${id}`,
  view: (id: number) => `/inventory/stock/${id}`,
} as const;

export const StockListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const ageParam = searchParams.get('age'); // e.g. '0-30 Days', '31-60 Days', '61-90 Days', '90+ Days'
  const qualityQueryParam = searchParams.get('quality');

  const { showToast } = useToast();
  const { activeCompany, companyId, isReady } = useActiveCompany();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StockStatus | ''>('');
  const [categoryFilter, setCategoryFilter] = useState<StockCategory | ''>('');

  // Advanced Filter States
  const [selectedShapes, setSelectedShapes] = useState<string[]>([]);
  const [minCarat, setMinCarat] = useState<string>('');
  const [maxCarat, setMaxCarat] = useState<string>('');
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedClarities, setSelectedClarities] = useState<string[]>([]);
  const [certType, setCertType] = useState<string>('');
  const [certNumber, setCertNumber] = useState<string>('');
  const [costSort, setCostSort] = useState<string>('');
  const [rateSort, setRateSort] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [qualityFilter, setQualityFilter] = useState<string>(qualityQueryParam || '');

  useEffect(() => {
    if (qualityQueryParam) {
      setQualityFilter(qualityQueryParam);
    }
  }, [qualityQueryParam]);
  const [isFilterExpanded, setIsFilterExpanded] = useState<boolean>(false);

  // Temporary ephemeral INR preview state. The rate here is only a what-if
  // for packets whose cost is in dollars; a packet that stores its own INR
  // cost is shown as stored rather than multiplied by this.
  const [showInrPreview, setShowInrPreview] = useState<boolean>(false);
  const [inrRate, setInrRate] = useState<number>(83.25);

  // Every cost figure below used to be printed with a $ sign no matter what
  // currency it was entered in, so an INR-purchased packet read as dollars.
  const costSymbol = (row: any) => ((row?.costCurrency || row?.originalCurrency) === 'INR' ? '₹' : '$');
  const targetSymbol = (row: any) => (row?.targetSaleRateCurrency === 'INR' ? '₹' : '$');
  const costPerCaratInrOf = (row: any) =>
    row?.costPerCaratInr != null
      ? Number(row.costPerCaratInr)
      : Number(row?.costPerCarat || 0) * ((row?.costCurrency || row?.originalCurrency) === 'INR' ? 1 : inrRate);

  const activeFinancialYear = useCompanyStore((s) => s.activeFinancialYear);
  const { invoke: getAllConfigs } = useIpc<any>('stock:get-all-configs');
  const [showMonthFilter, setShowMonthFilter] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState('ALL');

  useEffect(() => {
    if (!companyId || !activeFinancialYear?.id) return;
    getAllConfigs({ companyId, financialYearId: activeFinancialYear.id }).then((res) => {
      if (res.success && Array.isArray(res.data)) {
        const config = res.data.find((c: any) => c.voucherType === 'STOCK_ENTRY');
        if (config?.includeMonth) {
          setShowMonthFilter(true);
        } else {
          setShowMonthFilter(false);
        }
      }
    });
  }, [companyId, activeFinancialYear?.id, getAllConfigs]);

  const [statusModal, setStatusModal] = useState<{
    packet: IStockPacket;
    step: StatusModalStep;
  } | null>(null);
  const [pendingStatus, setPendingStatus] = useState<StockStatus>('AVAILABLE');
  const [statusRemarks, setStatusRemarks] = useState('');

  const { data: stock, loading, invoke: fetchStock } = useIpc<IStockPacket[]>('stock:list');
  const { invoke: deleteStock } = useIpc('stock:delete');
  const { invoke: updateStock, loading: updatingStatus } = useIpc('stock:update');
  const { invoke: fetchQualities } = useIpc<IQuality[]>('quality:list');
  const [qualities, setQualities] = useState<IQuality[]>([]);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportPreset, setExportPreset] = useState<ExportPreset>('DIAMO');
  const [exportFileType, setExportFileType] = useState<FileType>('CSV');
  const [selectedQualityId, setSelectedQualityId] = useState<string>('');
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    importedCount: number;
    skippedCount: number;
    skippedDetails: Array<{ row: number; stockId: string; reason: string }>;
  } | null>(null);
  const { invoke: importCsv } = useIpc<{
    importedCount: number;
    skippedCount: number;
    skippedDetails: Array<{ row: number; stockId: string; reason: string }>;
  }>('stock:import-csv');

  useEffect(() => {
    if (!companyId) return;
    fetchQualities({ companyId }).then((res) => {
      if (res.success && res.data) {
        const inventoryQualities = res.data.filter((q) => !q.isService);
        setQualities(inventoryQualities);
        if (inventoryQualities.length > 0) {
          setSelectedQualityId(String(inventoryQualities[0].id));
        }
      }
    });
  }, [companyId, fetchQualities]);

  const refresh = useCallback(async () => {
    if (!companyId) return;
    await fetchStock({
      companyId,
      search: search || undefined,
      status: statusFilter || undefined,
      category: categoryFilter || undefined,
    });
  }, [companyId, fetchStock, search, statusFilter, categoryFilter]);

  useEffect(() => { refresh(); }, [refresh]);

  const handleDelete = async (id: number, stockId: string) => {
    if (!companyId || !confirm(`Permanently delete stock packet "${stockId}"? All movements and attachments for this packet will be removed. This cannot be undone.`)) return;
    const res = await deleteStock({ id, companyId });
    if (res.success) {
      showToast('Stock packet deleted successfully', 'success');
      await refresh();
    } else {
      showToast(res.error || 'Delete failed', 'error');
    }
  };

  const downloadTemplate = () => {
    const headers = [
      'Stock ID', 'Category', 'Shape', 'Carats', 'Pieces', 'Color', 'Clarity', 'Cut', 'Polish', 'Symmetry',
      'Measurements', 'Length', 'Width', 'Depth', 'Depth %', 'Table %',
      'Fluorescence', 'Fluor Color', 'Rap Price ($/ct)', 'Rap Discount %',
      'Crown Angle', 'Crown Height', 'Pavilion Angle', 'Pavilion Depth',
      'Girdle Min', 'Girdle Max', 'Girdle %', 'Girdle Condition', 'Culet Size', 'Culet Condition',
      'Hearts & Arrows', 'Eye Clean', 'Shade', 'Milky', 'Treatment', 'Tinge', 'Lustre',
      'Table Inclusion', 'Side Inclusion', 'Black Inclusion', 'White Inclusion', 'Open Inclusion',
      'Table Open', 'Crown Open', 'Girdle Open', 'BGM', 'Growth Type', 'Diamond Type', 'Star Length',
      'Origin', 'Availability', 'City', 'State', 'Trade Show', 'Brand', 'Seller Spec',
      'Pair Stock #', 'Pair Separable', 'Parcel Stones', 'Report Filename', 'Report Issue Date', 'Report Type', 'Lab Location',
      'Allow RapLink Feed', 'Sarine Loupe',
      'Cert Type', 'Cert Number', 'Certificate URL', 'Web URL', 'Image Link', 'Video Link', 'Inscription',
      'Key to Symbols', 'Comment', 'Cert Comment', 'Member Comment',
      'Fancy Color', 'Fancy Color Intensity', 'Fancy Color Overtone',
      'Asking Price', 'Target Sale Rate (₹/ct)', 'Rate ($/ct)', 'Total Cost'
    ];

    const example = [
      'DM-2026-EX001', 'CERTIFIED', 'ROUND', '1.050', '1', 'D', 'VS1', 'EX', 'EX', 'EX',
      '6.50-6.52x4.00', '6.50', '6.52', '4.00', '61.50', '57.00',
      'NONE', 'NONE', '7500.00', '-15.50',
      '34.50', '15.00', '40.80', '43.00',
      'THIN', 'SLIGHTLY THICK', '', 'FACETED', 'NONE', 'POINTED',
      'YES', 'YES', 'NONE', 'NONE', 'CVD', 'NONE', 'EXCELLENT',
      'NONE', 'NONE', 'NONE', 'NONE', 'NONE',
      'NO', 'NO', 'NO', 'NONE', 'CVD', '', '55.00',
      'INDIA', 'AVAILABLE', 'SURAT', 'GUJARAT', 'VICENZORO', 'DIAMO', 'SPEC-01',
      'PAIR-01', 'YES', 'NO', 'REPORT-123.PDF', '2026-01-15', '', 'MUMBAI',
      '', '',
      'GIA', '123456789', '"https://example.com/cert.pdf"', '"https://example.com/360view"', '"https://example.com/photo.jpg"', '"https://example.com/video.mp4"', 'GIA 123456789',
      '"Feather, Crystal"', '"Excellent quality stone"', '', '',
      '', '', '',
      '5500.00', '5500.00', '5000.00', '5250.00'
    ];

    const csvContent = [headers.join(','), example.join(',')].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'stock_inventory_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase();

    if (ext === 'xlsx' || ext === 'xls') {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = new Uint8Array(event.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const jsonRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
          const parsed = parseStockFile(jsonRows);
          setParsedRows(parsed);
        } catch (err: any) {
          showToast('Failed to parse XLSX file: ' + (err.message || ''), 'error');
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (!text) return;
        try {
          const csvRows = parseCSVText(text);
          const parsed = parseStockFile(csvRows);
          setParsedRows(parsed);
        } catch (err: any) {
          showToast('Failed to parse CSV file: ' + (err.message || ''), 'error');
        }
      };
      reader.readAsText(file);
    }
  };

  const handleImportSubmit = async () => {
    if (!companyId) return;
    if (!selectedQualityId) {
      showToast('Please select a quality master', 'error');
      return;
    }
    if (parsedRows.length === 0) {
      showToast('Please select a valid CSV file with data rows', 'error');
      return;
    }

    setImporting(true);
    const res = await importCsv({
      companyId,
      qualityId: Number(selectedQualityId),
      rows: parsedRows,
    });
    setImporting(false);

    if (res.success && res.data) {
      setImportResult(res.data);
      if (res.data.importedCount > 0) {
        showToast(`Successfully imported ${res.data.importedCount} stock packets`, 'success');
      }
      if (res.data.skippedCount > 0) {
        showToast(`${res.data.skippedCount} rows skipped. Check details in dialog.`, 'warning');
      }
      await refresh();
    } else {
      showToast(res.error || 'Import failed', 'error');
    }
  };

  const closeImportModal = () => {
    setIsImportModalOpen(false);
    setParsedRows([]);
    setImportResult(null);
  };

  const openExportModal = () => {
    if (!processedStock || processedStock.length === 0) {
      showToast('No matching stock packets to download', 'info');
      return;
    }
    setIsExportModalOpen(true);
  };

  const handleExportStock = () => {
    if (!processedStock || processedStock.length === 0) {
      showToast('No matching stock packets to download', 'info');
      return;
    }
    exportStockPackets(processedStock, exportPreset, exportFileType, activeCompany?.companyName);
    setIsExportModalOpen(false);
    showToast(`Stock exported successfully (${exportPreset} format as ${exportFileType})`, 'success');
  };

  const closeStatusModal = () => {
    setStatusModal(null);
    setStatusRemarks('');
  };

  const openStatusChange = (packet: IStockPacket) => {
    if (!EDITABLE_STOCK_STATUSES.includes(packet.currentStatus)) {
      showToast(
        `Cannot change status for ${STOCK_STATUS_LABELS[packet.currentStatus].toLowerCase()} stock`,
        'error',
      );
      return;
    }
    setStatusModal({ packet, step: 'confirm' });
  };

  const confirmStatusChange = () => {
    if (!statusModal) return;
    setPendingStatus(statusModal.packet.currentStatus);
    setStatusRemarks('');
    setStatusModal({ ...statusModal, step: 'select' });
  };

  const saveStatusChange = async () => {
    if (!statusModal || !companyId) return;
    if (pendingStatus === statusModal.packet.currentStatus) {
      showToast('Status is unchanged', 'info');
      closeStatusModal();
      return;
    }
    const res = await updateStock({
      id: statusModal.packet.id,
      companyId,
      data: {
        currentStatus: pendingStatus,
        statusRemarks: statusRemarks.trim() || 'Status updated from inventory list',
      },
    });
    if (res.success) {
      showToast(
        `Status updated to ${STOCK_STATUS_LABELS[pendingStatus]}`,
        'success',
      );
      closeStatusModal();
      await refresh();
    } else {
      showToast(res.error || 'Status update failed', 'error');
    }
  };

  // Dynamic extraction of unique values from fetched stock to populate filters
  const shapeOptions = useMemo(() => {
    if (!stock) return [];
    const set = new Set<string>();
    stock.forEach((s) => {
      if (s.shape) set.add(s.shape.trim());
    });
    return Array.from(set).sort().map(shape => ({ value: shape, label: shape }));
  }, [stock]);

  const colorOptions = useMemo(() => {
    if (!stock) return [];
    const set = new Set<string>();
    stock.forEach((s) => {
      if (s.color) set.add(s.color.trim());
    });
    return Array.from(set).sort().map(color => ({ value: color, label: color }));
  }, [stock]);

  const clarityOptions = useMemo(() => {
    if (!stock) return [];
    const set = new Set<string>();
    stock.forEach((s) => {
      if (s.clarity) set.add(s.clarity.trim());
    });
    return Array.from(set).sort().map(clarity => ({ value: clarity, label: clarity }));
  }, [stock]);

  // Client-side Filtered and Sorted Stock
  const processedStock = useMemo(() => {
    if (!stock) return [];

    let result = [...stock];

    // 1. Search term filter (Stock ID, cert, shape, color, quality)
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (s) =>
          s.stockIdNumber.toLowerCase().includes(q) ||
          (s.certificateNumber && s.certificateNumber.toLowerCase().includes(q)) ||
          (s.shape && s.shape.toLowerCase().includes(q)) ||
          (s.color && s.color.toLowerCase().includes(q)) ||
          (s.clarity && s.clarity.toLowerCase().includes(q)) ||
          (s.quality?.qualityName && s.quality.qualityName.toLowerCase().includes(q))
      );
    }

    // 2. Shapes multi-select filter
    if (selectedShapes.length > 0) {
      result = result.filter((s) => s.shape && selectedShapes.includes(s.shape.trim()));
    }

    // 3. Carats range filter (Evaluates average size per piece if pieceCount > 1 and piecesNotCounted is false)
    const getEffectiveCarat = (s: IStockPacket) => {
      const totalCarat = Number(s.caratWeight || 0);
      const pcs = Number(s.pieceCount || 0);
      const uncounted = s.piecesNotCounted === true || (s as any).piecesNotCounted === 'true';

      if (!uncounted && pcs > 1) {
        return totalCarat / pcs;
      }
      return totalCarat;
    };

    if (minCarat.trim() !== '') {
      const min = parseFloat(minCarat);
      if (!isNaN(min)) {
        result = result.filter((s) => getEffectiveCarat(s) >= min);
      }
    }
    if (maxCarat.trim() !== '') {
      const max = parseFloat(maxCarat);
      if (!isNaN(max)) {
        result = result.filter((s) => getEffectiveCarat(s) <= max);
      }
    }

    // 4. Colors multi-select filter
    if (selectedColors.length > 0) {
      result = result.filter((s) => s.color && selectedColors.includes(s.color.trim()));
    }

    // 5. Clarities multi-select filter
    if (selectedClarities.length > 0) {
      result = result.filter((s) => s.clarity && selectedClarities.includes(s.clarity.trim()));
    }

    // 6. Certificate type filter
    if (certType) {
      if (certType === 'GIA') {
        result = result.filter((s) => s.certificateType?.toUpperCase() === 'GIA');
      } else if (certType === 'IGI') {
        result = result.filter((s) => s.certificateType?.toUpperCase() === 'IGI');
      } else if (certType === 'OTHER') {
        result = result.filter(
          (s) =>
            s.certificateType &&
            s.certificateType.toUpperCase() !== 'GIA' &&
            s.certificateType.toUpperCase() !== 'IGI'
        );
      }
    }

    // 7. Certificate number search
    if (certNumber.trim()) {
      const q = certNumber.toLowerCase().trim();
      result = result.filter((s) => s.certificateNumber && s.certificateNumber.toLowerCase().includes(q));
    }

    // 8. Status filter
    if (statusFilter) {
      result = result.filter((s) => s.currentStatus === statusFilter);
    }

    // 9. Category filter
    if (categoryFilter) {
      result = result.filter((s) => s.category === categoryFilter);
    }

    // 10. Date range filter
    if (startDate) {
      const start = new Date(startDate + 'T00:00:00');
      result = result.filter((s) => new Date(s.registrationDate) >= start);
    }
    if (endDate) {
      const end = new Date(endDate + 'T23:59:59');
      result = result.filter((s) => new Date(s.registrationDate) <= end);
    }

    // 11. Quality filter
    if (qualityFilter) {
      result = result.filter((s) => s.qualityId === Number(qualityFilter));
    }

    // 12. Month filter
    if (showMonthFilter && selectedMonth !== 'ALL') {
      result = result.filter((s) => {
        const dateObj = new Date(s.registrationDate);
        if (!isNaN(dateObj.getTime())) {
          return String(dateObj.getMonth()) === selectedMonth;
        }
        return true;
      });
    }

    // Apply Cost / Rate sorting
    if (costSort === 'low-to-high') {
      result.sort((a, b) => Number(a.costPerCarat) - Number(b.costPerCarat));
    } else if (costSort === 'high-to-low') {
      result.sort((a, b) => Number(b.costPerCarat) - Number(a.costPerCarat));
    } else if (rateSort === 'low-to-high') {
      result.sort((a, b) => Number(a.targetSaleRate || 0) - Number(b.targetSaleRate || 0));
    } else if (rateSort === 'high-to-low') {
      result.sort((a, b) => Number(b.targetSaleRate || 0) - Number(a.targetSaleRate || 0));
    }

    // 16. Aging Bucket filter (Drill-down from Analytics)
    if (ageParam) {
      const nowTs = new Date().getTime();
      result = result.filter((s) => {
        if (s.currentStatus === 'SOLD') return false;
        const packetDate = s.registrationDate || (s as any).createdAt;
        if (!packetDate) return true;
        const ageDays = Math.floor((nowTs - new Date(packetDate).getTime()) / (1000 * 60 * 60 * 24));
        if (ageParam === '0-30 Days') return ageDays <= 30;
        if (ageParam === '31-60 Days') return ageDays > 30 && ageDays <= 60;
        if (ageParam === '61-90 Days') return ageDays > 60 && ageDays <= 90;
        if (ageParam === '90+ Days') return ageDays > 90;
        return true;
      });
    }

    return result;
  }, [
    stock,
    search,
    selectedShapes,
    minCarat,
    maxCarat,
    selectedColors,
    selectedClarities,
    certType,
    certNumber,
    statusFilter,
    categoryFilter,
    startDate,
    endDate,
    costSort,
    rateSort,
    qualityFilter,
    showMonthFilter,
    selectedMonth,
    ageParam,
  ]);

  const columns: Column<IStockPacket>[] = [
    {
      key: 'stockIdNumber',
      header: 'STOCK ID',
      sortable: true,
      mono: true,
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Gem size={16} color="var(--color-accent)" />
          <span style={{ fontWeight: 600 }}>{row.stockIdNumber}</span>
        </div>
      ),
    },
    {
      key: 'quality',
      header: 'QUALITY',
      render: (row) => row.quality?.qualityName ?? '—',
    },
    { key: 'shape', header: 'SHAPE', render: (row) => row.shape ?? '—' },
    {
      key: 'caratWeight',
      header: 'CARATS',
      render: (row) => {
        const wt = Number(row.caratWeight).toFixed(3);
        const pcs = Number(row.pieceCount || 0);
        const uncounted = row.piecesNotCounted === true || (row as any).piecesNotCounted === 'true';

        if (!uncounted && pcs > 1) {
          const avg = (Number(row.caratWeight) / pcs).toFixed(2);
          return (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontWeight: 600 }}>{wt} Cts <span style={{ opacity: 0.7, fontSize: '11px' }}>({pcs} Pcs)</span></span>
              <span style={{ fontSize: '10px', color: 'var(--color-accent)', fontWeight: 700 }}>
                Avg: {avg} ct/pc
              </span>
            </div>
          );
        }
        return `${wt} Cts`;
      },
    },
    { key: 'color', header: 'COLOR', render: (row) => row.color ?? '—' },
    { key: 'clarity', header: 'CLARITY', render: (row) => row.clarity ?? '—' },
    {
      key: 'certificateNumber',
      header: 'CERT #',
      mono: true,
      render: (row) => row.certificateNumber ?? '—',
    },
    {
      key: 'costPerCarat',
      header: 'COST /CT',
      render: (row) =>
        `${costSymbol(row)}${Number(row.costPerCarat).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
    },
    ...(showInrPreview ? [{
      key: 'costPerCaratInr',
      header: `COST (₹/CT @ ${inrRate})`,
      render: (row: IStockPacket) => (
        <span style={{ color: '#b45309', fontWeight: 600, background: '#fef3c7', padding: '2px 6px', borderRadius: '4px', whiteSpace: 'nowrap' }}>
          ₹{costPerCaratInrOf(row).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      ),
    }] : []),
    {
      key: 'targetSaleRate',
      header: 'TARGET RATE /CT',
      render: (row) => row.targetSaleRate != null ? (
        <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>
          {targetSymbol(row)}{Number(row.targetSaleRate).toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </span>
      ) : (
        <span style={{ opacity: 0.5 }}>—</span>
      ),
    },
    ...(showInrPreview ? [{
      key: 'targetSaleRateInr',
      header: `TARGET (₹/CT @ ${inrRate})`,
      render: (row: IStockPacket) => row.targetSaleRate != null ? (
        <span style={{ color: '#047857', fontWeight: 600, background: '#d1fae5', padding: '2px 6px', borderRadius: '4px', whiteSpace: 'nowrap' }}>
          ₹{(Number(row.targetSaleRate) * (row.targetSaleRateCurrency === 'INR' ? 1 : inrRate)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      ) : (
        <span style={{ opacity: 0.5 }}>—</span>
      ),
    }] : []),
    {
      key: 'currentStatus',
      header: 'STATUS',
      width: '110px',
      render: (row) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            openStatusChange(row);
          }}
          title="Click to change status"
          style={{
            border: 'none',
            background: 'transparent',
            padding: 0,
            cursor: EDITABLE_STOCK_STATUSES.includes(row.currentStatus) ? 'pointer' : 'not-allowed',
            opacity: EDITABLE_STOCK_STATUSES.includes(row.currentStatus) ? 1 : 0.7,
          }}
        >
          <Badge variant={STOCK_STATUS_BADGE_VARIANT[row.currentStatus]}>
            {STOCK_STATUS_LABELS[row.currentStatus]}
          </Badge>
        </button>
      ),
    },
    {
      key: 'registrationDate',
      header: 'DATE',
      render: (row) => new Date(row.registrationDate).toLocaleDateString('en-IN'),
    },
    {
      key: 'actions',
      header: 'ACTIONS',
      width: '140px',
      render: (row) => (
        <div style={{ display: 'flex', gap: '4px' }}>
          <Button variant="ghost" size="sm" onClick={() => navigate(ROUTES.view(row.id))} title="View">
            <Eye size={14} />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigate(ROUTES.edit(row.id))} title="Edit">
            <Edit2 size={14} />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleDelete(row.id, row.stockIdNumber)} title="Archive">
            <Trash2 size={14} color="var(--color-danger)" />
          </Button>
        </div>
      ),
    },
  ];

  const statusFilterOptions = [
    { value: '', label: 'All statuses' },
    ...Object.entries(STOCK_STATUS_LABELS).map(([value, label]) => ({ value, label })),
  ];

  const categoryFilterOptions = [
    { value: '', label: 'All categories' },
    { value: 'CERTIFIED', label: 'Certified' },
    { value: 'NON_CERTIFIED', label: 'Non-Certified' },
  ];

  if (!isReady) {
    return <p style={{ color: 'var(--color-text-secondary)' }}>Select a company to manage inventory.</p>;
  }

  if (qualities.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
        <h1 style={{ fontSize: 'var(--text-title)', fontWeight: 700, color: 'var(--color-primary)' }}>Diamond Inventory</h1>
        <p style={{ color: 'var(--color-text-secondary)' }}>
          Create at least one quality master before registering stock packets.
        </p>
        <Button variant="primary" onClick={() => navigate('/masters/diamond/qualities/new')}>
          Add Quality
        </Button>
      </div>
    );
  }

  // Helper component for checkable badge filters
  const renderBadgeFilter = (
    label: string,
    options: { value: string; label: string }[],
    selectedValues: string[],
    setSelectedValues: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    const toggleValue = (val: string) => {
      setSelectedValues(prev =>
        prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]
      );
    };

    const clearAll = () => setSelectedValues([]);

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        padding: '12px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
          <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-primary-light)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {label}
          </label>
          {selectedValues.length > 0 && (
            <button
              type="button"
              onClick={clearAll}
              style={{
                border: 'none',
                background: 'transparent',
                color: 'var(--color-danger)',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                padding: 0,
              }}
            >
              Clear ({selectedValues.length})
            </button>
          )}
        </div>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '6px',
          maxHeight: '120px',
          overflowY: 'auto',
          padding: '2px',
          scrollbarWidth: 'thin',
          scrollbarColor: '#cbd5e1 transparent',
        }}>
          {options.length === 0 ? (
            <span style={{ fontSize: 'var(--text-small)', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>None available</span>
          ) : (
            options.map((opt) => {
              const isSelected = selectedValues.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleValue(opt.value)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: isSelected ? '1px solid var(--color-accent)' : '1px solid var(--color-border)',
                    backgroundColor: isSelected ? 'var(--color-accent-light)' : 'var(--color-bg)',
                    color: isSelected ? 'var(--color-accent-hover)' : 'var(--color-text-secondary)',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: isSelected ? 'var(--color-accent)' : '#94a3b8',
                      transition: 'all 0.2s ease',
                    }}
                  />
                  {opt.label}
                </button>
              );
            })
          )}
        </div>
      </div>
    );
  };

  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('');
    setCategoryFilter('');
    setSelectedShapes([]);
    setMinCarat('');
    setMaxCarat('');
    setSelectedColors([]);
    setSelectedClarities([]);
    setCertType('');
    setCertNumber('');
    setCostSort('');
    setRateSort('');
    setStartDate('');
    setEndDate('');
    setQualityFilter('');
  };

  if (!isReady) {
    return <p style={{ color: 'var(--color-text-secondary)' }}>Select a company to manage inventory.</p>;
  }

  if (qualities.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
        <h1 style={{ fontSize: 'var(--text-title)', fontWeight: 700, color: 'var(--color-primary)' }}>Diamond Inventory</h1>
        <p style={{ color: 'var(--color-text-secondary)' }}>
          Create at least one quality master before registering stock packets.
        </p>
        <Button variant="primary" onClick={() => navigate('/masters/diamond/qualities/new')}>
          Add Quality
        </Button>
      </div>
    );
  }

  const activeFiltersCount = [
    search.trim() !== '',
    statusFilter !== '',
    categoryFilter !== '',
    selectedShapes.length > 0,
    minCarat !== '',
    maxCarat !== '',
    selectedColors.length > 0,
    selectedClarities.length > 0,
    certType !== '',
    certNumber.trim() !== '',
    costSort !== '',
    rateSort !== '',
    startDate !== '',
    endDate !== '',
    qualityFilter !== '',
  ].filter(Boolean).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
      {/* Header Panel */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: 'var(--text-title)', fontWeight: 700, color: 'var(--color-primary)' }}>Diamond Inventory</h1>
            <Badge variant="primary" style={{ fontSize: '13px', padding: '3px 10px', fontWeight: 600 }}>
              {stock ? (
                processedStock.length === stock.length ? (
                  `${stock.length} Packets`
                ) : (
                  `Filtered: ${processedStock.length} of ${stock.length} Packets`
                )
              ) : '0 Packets'}
            </Badge>
          </div>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: '4px' }}>
            Stock packets for {activeCompany?.companyName}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: showInrPreview ? '#fef3c7' : 'var(--color-surface)', border: `1px solid ${showInrPreview ? '#f59e0b' : 'var(--color-border)'}`, padding: '4px 8px', borderRadius: 'var(--radius-md)' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: showInrPreview ? '#92400e' : 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={showInrPreview}
                onChange={(e) => setShowInrPreview(e.target.checked)}
              />
              Preview ₹ Rate
            </label>
            {showInrPreview && (
              <input
                type="number"
                step="0.1"
                value={inrRate}
                onChange={(e) => setInrRate(Number(e.target.value) || 1)}
                style={{ width: '70px', padding: '2px 4px', fontSize: '12px', border: '1px solid #f59e0b', borderRadius: '4px' }}
                title="Temporary conversion rate for view only"
              />
            )}
          </div>
          <Button variant="secondary" onClick={openExportModal} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            Download Stock
          </Button>
          <Button variant="secondary" onClick={() => setIsImportModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            Import CSV
          </Button>
          <Button variant="primary" onClick={() => navigate(ROUTES.new)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={16} /> New Stock Packet
          </Button>
        </div>
      </div>

      {/* Active Analytics Aging Drill-Down Filter Banner */}
      {ageParam && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#fffbeb',
          border: '1px solid #fde68a',
          borderRadius: '10px',
          padding: '10px 16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#92400e', fontWeight: 600, flexWrap: 'wrap' }}>
            <span>⏳ Active Stock Aging Filter:</span>
            <span style={{ background: '#fef3c7', padding: '2px 8px', borderRadius: '6px', color: '#78350f', fontWeight: 700 }}>
              Holding Duration: {ageParam}
            </span>
            <span style={{ color: '#b45309', fontWeight: 500 }}>
              ({processedStock.length} matching packets in vault)
            </span>
          </div>
          <button
            onClick={() => setSearchParams({})}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 10px',
              borderRadius: '6px',
              border: '1px solid #f59e0b',
              background: '#ffffff',
              color: '#b45309',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            ✕ Clear Aging Filter
          </button>
        </div>
      )}

      {/* Filter and Search Bar controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: '1 1 280px' }}>
            <Input
              placeholder="Search stock ID, cert, shape, color..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Button
              variant="secondary"
              onClick={() => setIsFilterExpanded(!isFilterExpanded)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}
            >
              <SlidersHorizontal size={15} />
              <span>Advanced Filters</span>
              {activeFiltersCount > 0 && (
                <span
                  style={{
                    backgroundColor: 'var(--color-primary)',
                    color: 'white',
                    fontSize: '11px',
                    fontWeight: 600,
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {activeFiltersCount}
                </span>
              )}
              {isFilterExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </Button>

            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                onClick={handleResetFilters}
                style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-danger)' }}
              >
                <RefreshCw size={14} />
                <span>Reset</span>
              </Button>
            )}
          </div>
        </div>

        {/* Collapsible Advanced Filters panel */}
        {isFilterExpanded && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '20px',
            borderTop: '1px solid var(--color-border)',
            paddingTop: '20px',
            marginTop: '8px'
          }}>
            {/* Section 1: Characteristics */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              backgroundColor: 'var(--color-bg)',
              padding: '16px',
              borderRadius: 'var(--radius-md)',
              border: '1px dashed var(--color-border)'
            }}>
              <h3 style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-primary-light)', margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                1. Diamond Characteristics
              </h3>
              {renderBadgeFilter('Shape', shapeOptions, selectedShapes, setSelectedShapes)}
              {renderBadgeFilter('Color', colorOptions, selectedColors, setSelectedColors)}
              {renderBadgeFilter('Clarity', clarityOptions, selectedClarities, setSelectedClarities)}

              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: '12px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
              }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-primary-light)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                  Carats (Range)
                </label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <Input
                    type="number"
                    placeholder="Min"
                    value={minCarat}
                    onChange={(e) => setMinCarat(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <span style={{ fontSize: 'var(--text-small)', color: 'var(--color-text-muted)', fontWeight: 500 }}>to</span>
                  <Input
                    type="number"
                    placeholder="Max"
                    value={maxCarat}
                    onChange={(e) => setMaxCarat(e.target.value)}
                    style={{ flex: 1 }}
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Certification & Dates */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              backgroundColor: 'var(--color-bg)',
              padding: '16px',
              borderRadius: 'var(--radius-md)',
              border: '1px dashed var(--color-border)'
            }}>
              <h3 style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-primary-light)', margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                2. Certification & Dates
              </h3>
              <div style={{ backgroundColor: 'var(--color-surface)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '12px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                <Select
                  label="Certificate Type"
                  value={certType}
                  onChange={setCertType}
                  options={[
                    { value: '', label: 'All Certificates' },
                    { value: 'GIA', label: 'GIA' },
                    { value: 'IGI', label: 'IGI' },
                    { value: 'OTHER', label: 'Other' },
                  ]}
                  searchable={false}
                  clearable={false}
                />
                <Input
                  label="Certificate Number"
                  placeholder="Search Cert #"
                  value={certNumber}
                  onChange={(e) => setCertNumber(e.target.value)}
                />
              </div>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: '12px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
              }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-primary-light)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                  Registration Date Range
                </label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <span style={{ fontSize: 'var(--text-small)', color: 'var(--color-text-muted)', fontWeight: 500 }}>to</span>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    style={{ flex: 1 }}
                  />
                </div>
                {showMonthFilter && (
                  <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-primary-light)', textTransform: 'uppercase' }}>Month:</span>
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      style={{
                        flex: 1,
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--color-border)',
                        background: 'var(--color-background)',
                        color: 'var(--color-text-primary)',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        outline: 'none',
                      }}
                    >
                      <option value="ALL">All Months</option>
                      <option value="0">Jan</option>
                      <option value="1">Feb</option>
                      <option value="2">Mar</option>
                      <option value="3">Apr</option>
                      <option value="4">May</option>
                      <option value="5">Jun</option>
                      <option value="6">Jul</option>
                      <option value="7">Aug</option>
                      <option value="8">Sep</option>
                      <option value="9">Oct</option>
                      <option value="10">Nov</option>
                      <option value="11">Dec</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Section 3: Status & Sorting */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              backgroundColor: 'var(--color-bg)',
              padding: '16px',
              borderRadius: 'var(--radius-md)',
              border: '1px dashed var(--color-border)'
            }}>
              <h3 style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-primary-light)', margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                3. Status & Sorting
              </h3>
              <div style={{ backgroundColor: 'var(--color-surface)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '12px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                <Select
                  label="Quality"
                  value={qualityFilter}
                  onChange={setQualityFilter}
                  options={[
                    { value: '', label: 'All Qualities' },
                    ...qualities.map((q) => ({ value: String(q.id), label: q.qualityName })),
                  ]}
                  searchable={true}
                  clearable={false}
                  placeholder="All qualities"
                />
                <Select
                  label="Status"
                  value={statusFilter}
                  onChange={(v) => setStatusFilter(v as StockStatus | '')}
                  options={statusFilterOptions}
                  searchable={false}
                  clearable={false}
                  placeholder="All statuses"
                />
                <Select
                  label="Category"
                  value={categoryFilter}
                  onChange={(v) => setCategoryFilter(v as StockCategory | '')}
                  options={categoryFilterOptions}
                  searchable={false}
                  clearable={false}
                  placeholder="All categories"
                />
              </div>
              <div style={{ backgroundColor: 'var(--color-surface)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '12px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                <Select
                  label="Cost Sorting (₹/CT)"
                  value={costSort}
                  onChange={(v) => {
                    setCostSort(v);
                    if (v) setRateSort(''); // Reset target rate sort if sorting by cost
                  }}
                  options={[
                    { value: '', label: 'Default Order' },
                    { value: 'low-to-high', label: 'Low to High' },
                    { value: 'high-to-low', label: 'High to Low' },
                  ]}
                  searchable={false}
                  clearable={false}
                />
                <Select
                  label="Target Rate Sorting (₹/CT)"
                  value={rateSort}
                  onChange={(v) => {
                    setRateSort(v);
                    if (v) setCostSort(''); // Reset cost sort if sorting by rate
                  }}
                  options={[
                    { value: '', label: 'Default Order' },
                    { value: 'low-to-high', label: 'Low to High' },
                    { value: 'high-to-low', label: 'High to Low' },
                  ]}
                  searchable={false}
                  clearable={false}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <DataGrid
        columns={columns}
        data={processedStock}
        keyField="id"
        loading={loading}
        emptyTitle="No stock packets found"
        emptyDescription="Adjust your filters or register a new stock packet."
      />

      <Modal
        isOpen={statusModal?.step === 'confirm'}
        onClose={closeStatusModal}
        title="Change Stock Status"
        size="sm"
        footer={(
          <>
            <Button variant="ghost" onClick={closeStatusModal}>No</Button>
            <Button variant="primary" onClick={confirmStatusChange}>Yes</Button>
          </>
        )}
      >
        <p style={{ margin: 0, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
          Do you want to change the status for stock packet{' '}
          <strong style={{ fontFamily: 'monospace', color: 'var(--color-primary)' }}>
            {statusModal?.packet.stockIdNumber}
          </strong>
          ?
        </p>
        <p style={{ margin: '12px 0 0', fontSize: 'var(--text-small)', color: 'var(--color-text-muted)' }}>
          Current status:{' '}
          <Badge variant={STOCK_STATUS_BADGE_VARIANT[statusModal?.packet.currentStatus ?? 'AVAILABLE']}>
            {STOCK_STATUS_LABELS[statusModal?.packet.currentStatus ?? 'AVAILABLE']}
          </Badge>
        </p>
      </Modal>

      <Modal
        isOpen={statusModal?.step === 'select'}
        onClose={closeStatusModal}
        title="Select New Status"
        size="sm"
        footer={(
          <>
            <Button variant="ghost" onClick={closeStatusModal} disabled={updatingStatus}>Cancel</Button>
            <Button variant="primary" onClick={saveStatusChange} loading={updatingStatus}>
              Update Status
            </Button>
          </>
        )}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ margin: 0, fontSize: 'var(--text-small)', color: 'var(--color-text-secondary)' }}>
            Stock ID:{' '}
            <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--color-primary)' }}>
              {statusModal?.packet.stockIdNumber}
            </span>
          </p>
          <Select
            label="New Status"
            value={pendingStatus}
            onChange={(v) => setPendingStatus(v as StockStatus)}
            options={STATUS_OPTIONS}
            searchable={false}
            clearable={false}
          />
          <Input
            label="Remarks (optional)"
            placeholder="Reason for status change"
            value={statusRemarks}
            onChange={(e) => setStatusRemarks(e.target.value)}
          />
        </div>
      </Modal>

      <Modal
        isOpen={isImportModalOpen}
        onClose={closeImportModal}
        title="Import Stock Packets via CSV"
        size="md"
        footer={(
          <>
            <Button variant="ghost" onClick={closeImportModal} disabled={importing}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleImportSubmit}
              loading={importing}
              disabled={parsedRows.length === 0 || !selectedQualityId}
            >
              Import Stock
            </Button>
          </>
        )}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ margin: 0, fontSize: 'var(--text-small)', color: 'var(--color-text-secondary)' }}>
              Bulk register stock packets using a CSV template.
            </p>
            <Button variant="secondary" size="sm" onClick={downloadTemplate}>
              Download Sample CSV
            </Button>
          </div>

          <Select
            label="Target Quality Master *"
            value={selectedQualityId}
            onChange={(v) => setSelectedQualityId(v || '')}
            options={qualities.map((q) => ({ value: String(q.id), label: q.qualityName }))}
            placeholder="Select target quality"
            searchable={true}
            clearable={false}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: 'var(--text-small)', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              Select CSV File *
            </label>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
              style={{
                padding: '8px',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-bg-input)',
                cursor: 'pointer',
              }}
            />
          </div>

          {parsedRows.length > 0 && (
            <div style={{ padding: '8px 12px', background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-small)' }}>
              <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>
                {parsedRows.filter(r => r.stockIdNumber?.trim()).length} rows detected with Stock IDs
              </span>
              {parsedRows.filter(r => !r.stockIdNumber?.trim()).length > 0 && (
                <span style={{ color: 'var(--color-text-muted)', marginLeft: '8px' }}>
                  ({parsedRows.filter(r => !r.stockIdNumber?.trim()).length} empty/invalid rows will be skipped)
                </span>
              )}
            </div>
          )}

          {importResult && (
            <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ padding: '12px', background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <span style={{ fontSize: 'var(--text-small)', color: 'var(--color-text-muted)' }}>Successfully Imported:</span>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-success)' }}>{importResult.importedCount}</div>
                </div>
                <div>
                  <span style={{ fontSize: 'var(--text-small)', color: 'var(--color-text-muted)' }}>Skipped Rows:</span>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: importResult.skippedCount > 0 ? 'var(--color-warning)' : 'var(--color-text-secondary)' }}>{importResult.skippedCount}</div>
                </div>
              </div>

              {importResult.skippedCount > 0 && (
                <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                  <div style={{ padding: '6px 12px', background: 'var(--color-bg-header)', fontSize: 'var(--text-small)', fontWeight: 600, borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Skipped Rows Log</span>
                    <button
                      type="button"
                      onClick={() => {
                        const logText = importResult.skippedDetails
                          .map(d => `Row ${d.row}: ${d.stockId || '(Empty Stock ID)'} -> ${d.reason}`)
                          .join('\n');
                        navigator.clipboard.writeText(logText);
                        showToast('Skipped log copied to clipboard!', 'success');
                      }}
                      style={{
                        padding: '2px 8px',
                        fontSize: '11px',
                        fontWeight: 500,
                        background: 'var(--color-primary)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                      }}
                    >
                      Copy Log
                    </button>
                  </div>
                  <div style={{ maxHeight: '180px', overflowY: 'auto', padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '6px', background: 'var(--color-bg-card)', userSelect: 'text', WebkitUserSelect: 'text' }}>
                    {importResult.skippedDetails.map((detail, idx) => (
                      <div key={idx} style={{ fontSize: '11px', display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-secondary)', userSelect: 'text', WebkitUserSelect: 'text' }}>
                        <span style={{ userSelect: 'text', WebkitUserSelect: 'text' }}>
                          <strong>Row {detail.row}:</strong> {detail.stockId || '(Empty Stock ID)'}
                        </span>
                        <span style={{ color: 'var(--color-danger)', userSelect: 'text', WebkitUserSelect: 'text', marginLeft: '12px', textAlign: 'right' }}>{detail.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>

      {/* Download Stock Export Modal */}
      <Modal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        title={`Download Stock Export (${processedStock.length} packets)`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsExportModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleExportStock}>
              Download File
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '4px 0' }}>
          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '8px', display: 'block' }}>
              Select Format Preset:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {[
                { id: 'DIAMO', label: 'DIAMO Standard', desc: 'All ~70 attributes' },
                { id: 'RAPNET', label: 'RapNet Format', desc: '61 RapNet columns' },
                { id: 'VDB', label: 'VDB Format', desc: '48 VDB columns' },
                { id: 'NIVODA', label: 'Nivoda Format', desc: '41 Nivoda columns' },
              ].map((opt) => {
                const isSelected = exportPreset === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setExportPreset(opt.id as ExportPreset)}
                    style={{
                      padding: '12px',
                      borderRadius: 'var(--radius-md)',
                      border: isSelected ? '2px solid var(--color-accent)' : '1px solid var(--color-border)',
                      background: isSelected ? 'var(--color-accent-light)' : 'var(--color-bg-card)',
                      color: isSelected ? 'var(--color-accent-hover)' : 'var(--color-text-primary)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    <span style={{ fontSize: '13px', fontWeight: 700 }}>{opt.label}</span>
                    <span style={{ fontSize: '11px', color: isSelected ? 'var(--color-accent-hover)' : 'var(--color-text-muted)' }}>{opt.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '8px', display: 'block' }}>
              Select File Type:
            </label>
            <div style={{ display: 'flex', gap: '12px' }}>
              {[
                { id: 'CSV', label: 'CSV (.csv)' },
                { id: 'XLSX', label: 'Excel (.xlsx)' },
              ].map((opt) => {
                const isSelected = exportFileType === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setExportFileType(opt.id as FileType)}
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      borderRadius: 'var(--radius-md)',
                      border: isSelected ? '2px solid var(--color-accent)' : '1px solid var(--color-border)',
                      background: isSelected ? 'var(--color-accent-light)' : 'var(--color-bg-card)',
                      color: isSelected ? 'var(--color-accent-hover)' : 'var(--color-text-primary)',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: 600,
                      textAlign: 'center',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

/**
 * Parse CSV text into array of raw row objects keyed by header.
 */
function parseCSVText(text: string): Record<string, unknown>[] {
  const lines = text.split(/\r?\n/);
  if (lines.length === 0) return [];

  const headers = parseCSVLine(lines[0]);
  const result: Record<string, unknown>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = parseCSVLine(line);
    const row: Record<string, unknown> = {};
    headers.forEach((header, index) => {
      row[header.trim()] = values[index]?.trim() || '';
    });
    result.push(row);
  }
  return result;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result.map(val => {
    if (val.startsWith('"') && val.endsWith('"')) {
      return val.slice(1, -1);
    }
    return val;
  });
}

/**
 * Universal stock file parser.
 * Takes raw row objects (from CSV or XLSX) and maps headers to internal field names
 * using the CSV_HEADER_ALIASES dictionary. Case-insensitive, whitespace-tolerant.
 */
function parseStockFile(rawRows: Record<string, unknown>[]): any[] {
  if (rawRows.length === 0) return [];

  // Build header mapping from the first row's keys
  const firstRow = rawRows[0];
  const rawHeaders = Object.keys(firstRow);
  const headerMap: Record<string, string> = {}; // rawKey -> internalFieldName

  for (const rawKey of rawHeaders) {
    const internalField = resolveHeaderAlias(rawKey);
    if (internalField) {
      headerMap[rawKey] = internalField;
    }
  }

  const result: any[] = [];

  for (const rawRow of rawRows) {
    const row: any = {};
    for (const [rawKey, internalField] of Object.entries(headerMap)) {
      const value = rawRow[rawKey];
      const strValue = value != null ? String(value).trim() : '';
      if (!strValue) continue;

      // Special handling for 'category' field
      if (internalField === 'category') {
        const cat = strValue.toUpperCase().replace(/-/g, '_');
        if (cat === 'CERTIFIED' || cat === 'NON_CERTIFIED') {
          row.category = cat;
        } else if (strValue.toLowerCase().includes('non')) {
          row.category = 'NON_CERTIFIED';
        } else if (strValue.toLowerCase().includes('cert')) {
          row.category = 'CERTIFIED';
        } else {
          row.category = 'NON_CERTIFIED';
        }
      } else {
        const NUMERIC_FIELDS = [
          'caratWeight', 'pieceCount', 'costPerCarat', 'totalCost', 'targetSaleRate',
          'lengthMm', 'widthMm', 'depthMm', 'totalDepthPct', 'tablePct', 'girdlePct',
          'rapPricePerCarat', 'rapDiscountPct', 'crownAngle', 'crownHeight',
          'pavilionAngle', 'pavilionDepth', 'starLength'
        ];
        if (NUMERIC_FIELDS.includes(internalField)) {
          const cleanNum = strValue.replace(/%/g, '').replace(/,/g, '').trim();
          const num = Number(cleanNum);
          row[internalField] = !isNaN(num) ? num : strValue;
        } else {
          row[internalField] = strValue;
        }
      }
    }

    // Auto-synchronize combined measurements string & individual length/width/depth
    const synced = syncStockMeasurements(row);
    if (synced.lengthMm != null) row.lengthMm = synced.lengthMm;
    if (synced.widthMm != null) row.widthMm = synced.widthMm;
    if (synced.depthMm != null) row.depthMm = synced.depthMm;
    if (synced.measurements) row.measurements = synced.measurements;

    // Enforce Category = CERTIFIED if certificateNumber or certificateType is present
    if (row.certificateNumber || row.certificateType) {
      row.category = 'CERTIFIED';
    } else if (!row.category) {
      row.category = 'NON_CERTIFIED';
    }

    result.push(row);
  }

  return result;
}
