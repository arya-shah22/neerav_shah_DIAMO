// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Invoice Form Page (Sale / Purchase Book)
// ═══════════════════════════════════════════════════════════════

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Save, ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { invoiceSchema, InvoiceFormData } from './invoice.schema';
import { useIpc } from '../../hooks/useIpc';
import {
  computeInvoiceTotals,
  round2,
  resolveGstPct,
  resolveIsSameState,
  type CalcCurrency,
} from '../../../shared/utils/invoice-calc';
import { useActiveCompany } from '../../hooks/useActiveCompany';
import { useCompanyStore } from '../../state/company-store';
import { Button, Input, Combobox, FormSelect, Select, useToast } from '../../components/ui';
import type { IInvoice, InvoiceType } from './invoice.types';

interface FormPageProps {
  type: InvoiceType;
}

interface AccountObj {
  id: number;
  accountName: string;
  isBroker: boolean;
  stateCode: string | null;
  gstinNumber?: string | null;
}

interface QualityObj {
  id: number;
  qualityName: string;
  isService?: boolean;
  gstPct?: number;
  gstHistory?: Array<{ applyDate: Date | string; gstPct: number }>;
}

interface ExtraChargeItem {
  id: string;
  name: string;
  hsn: string;
  currency: 'USD' | 'INR';
  amount: number;
}

interface IStockPacket {
  id: number;
  stockIdNumber: string;
  qualityId: number;
  caratWeight: any;
  pieceCount: number;
  costPerCarat?: any;
  currentStatus: string;
  originalCurrency?: 'USD' | 'INR';
  transactionCurrency?: 'USD' | 'INR';
}

function formatInvoiceCurrencyDual(inv: any): string {
  const curr = inv.transactionCurrency || 'INR';
  const isUsd = curr === 'USD';
  const netAmt = Number(inv.netAmount || 0);
  const exRate = Number(inv.exchangeRate) || 1;
  const netAlt = inv.netAmountAlt && Number(inv.netAmountAlt) > 0
    ? Number(inv.netAmountAlt)
    : (isUsd ? netAmt * exRate : (exRate > 1 ? netAmt / exRate : 0));

  if (isUsd) {
    const primaryStr = `$${netAmt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const altStr = netAlt > 0 ? ` (₹${netAlt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})` : '';
    return `${primaryStr}${altStr}`;
  } else {
    const primaryStr = `₹${netAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const altStr = netAlt > 0 ? ` ($${netAlt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})` : '';
    return `${primaryStr}${altStr}`;
  }
}

const PRESET_CHARGES = [
  {
    name: 'Insured Shipping (Brinks / Malca-Amit)',
    shortLabel: '🚚 Insured Shipping',
    hsn: '9968',
    defaultInr: 5000,
    defaultUsd: 60,
  },
  {
    name: 'GIA / IGI Lab Inscription & Cert Fee',
    shortLabel: '🔬 Lab / Inscription Fee',
    hsn: '9983',
    defaultInr: 3500,
    defaultUsd: 45,
  },
  {
    name: 'Customs Clearance & Documentation',
    shortLabel: '🏛️ Customs Clearance',
    hsn: '9968',
    defaultInr: 4000,
    defaultUsd: 50,
  },
  {
    name: 'Transit Insurance Charges',
    shortLabel: '🛡️ Transit Insurance',
    hsn: '9971',
    defaultInr: 2500,
    defaultUsd: 30,
  },
  {
    name: 'Boiling, Polishing & Processing Fee',
    shortLabel: '✨ Processing / Boiling',
    hsn: '9988',
    defaultInr: 2000,
    defaultUsd: 25,
  },
];

export const InvoiceFormPage: React.FC<FormPageProps> = ({ type }) => {
  const { id: editId } = useParams<{ id: string }>();
  const isSale = type.startsWith('SALE');
  const isEditMode = !!editId;
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const { activeCompany, companyId, isReady } = useActiveCompany();
  const activeFinancialYear = useCompanyStore((s) => s.activeFinancialYear);

  const getInfo = () => {
    switch (type) {
      case 'SALE_RETURN':
        return {
          title: 'Sale Return Credit Note',
          listRoute: '/transactions/sale-returns',
          isCustomer: true,
          needReference: true,
          referenceType: 'SALE_INVOICE' as InvoiceType,
        };
      case 'SALE_DEBIT_NOTE':
        return {
          title: 'Sale Debit Note',
          listRoute: '/transactions/sale-debit-notes',
          isCustomer: true,
          needReference: true,
          referenceType: 'SALE_INVOICE' as InvoiceType,
        };
      case 'PURCHASE_RETURN':
        return {
          title: 'Purchase Return Debit Note',
          listRoute: '/transactions/purchase-returns',
          isCustomer: false,
          needReference: true,
          referenceType: 'PURCHASE_INVOICE' as InvoiceType,
        };
      case 'PURCHASE_DEBIT_NOTE':
        return {
          title: 'Purchase Credit Note',
          listRoute: '/transactions/purchase-credit-notes',
          isCustomer: false,
          needReference: true,
          referenceType: 'PURCHASE_INVOICE' as InvoiceType,
        };
      case 'PURCHASE_INVOICE':
        return {
          title: 'Purchase Invoice',
          listRoute: '/transactions/purchases',
          isCustomer: false,
          needReference: false,
          referenceType: undefined,
        };
      default:
        return {
          title: 'Sales Invoice',
          listRoute: '/transactions/sales',
          isCustomer: true,
          needReference: false,
          referenceType: undefined,
        };
    }
  };

  const { title, listRoute, isCustomer, needReference, referenceType } = getInfo();

  const [parties, setParties] = useState<AccountObj[]>([]);
  const [brokers, setBrokers] = useState<AccountObj[]>([]);
  const [qualities, setQualities] = useState<QualityObj[]>([]);
  const [previewVoucherNo, setPreviewVoucherNo] = useState('');
  const [editLoaded, setEditLoaded] = useState(false);
  const [parentInvoices, setParentInvoices] = useState<IInvoice[]>([]);
  const [extraCharges, setExtraCharges] = useState<ExtraChargeItem[]>([]);

  const { invoke: fetchAccounts } = useIpc<AccountObj[]>('account:list');
  const { invoke: fetchQualities } = useIpc<QualityObj[]>('quality:list');
  const { invoke: fetchPreviewNo } = useIpc<string>('invoice:preview-number');
  const { invoke: fetchInvoice } = useIpc<IInvoice>('invoice:get');
  const { invoke: fetchParentInvoices } = useIpc<IInvoice[]>('invoice:list');
  const { invoke: fetchStockPackets } = useIpc<IStockPacket[]>('stock:list');
  const { invoke: fetchPreviewId } = useIpc<string>('stock:preview-id');
  const { invoke: fetchShapes } = useIpc<string[]>('stock:shapes-list');
  
  const [availablePackets, setAvailablePackets] = useState<IStockPacket[]>([]);
  const [nextStockIdPreview, setNextStockIdPreview] = useState('');
  const [shapeOptions, setShapeOptions] = useState<string[]>([]);

  useEffect(() => {
    if (!companyId) return;
    fetchStockPackets({ companyId }).then((res) => {
      if (res.success && res.data) {
        setAvailablePackets(res.data);
      }
    });
    fetchShapes(companyId).then((res) => {
      if (res.success && res.data) {
        setShapeOptions(res.data);
      }
    });
  }, [companyId, fetchStockPackets, fetchShapes]);
  const { invoke: createInvoice, loading: savingCreate } = useIpc('invoice:create');
  const { invoke: updateInvoice, loading: savingUpdate } = useIpc('invoice:update');
  const saving = savingCreate || savingUpdate;

  const getPreviewIdForRow = (baseId: string, index: number) => {
    if (!baseId) return 'Auto (DM-YYYY-XXXXXX)';
    const parts = baseId.split('-');
    if (parts.length < 3) return baseId;
    const prefix = parts[0];
    const year = parts[1];
    const seqStr = parts[2];
    const seqNum = parseInt(seqStr, 10);
    if (isNaN(seqNum)) return baseId;
    const nextSeq = seqNum + index;
    const padded = String(nextSeq).padStart(seqStr.length, '0');
    return `${prefix}-${year}-${padded}`;
  };

  const { invoke: fetchLatestRate } = useIpc<any>('exchange-rate:latest');

  const { register, control, handleSubmit, watch, setValue } = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      financialYearId: activeFinancialYear?.id || 0,
      invoiceType: type,
      referenceInvoiceId: null,
      referenceBillNumber: null,
      isManualBillNumber: false,
      billNumber: '',
      invoiceDate: new Date().toISOString().split('T')[0],
      transactionCurrency: 'USD',
      exchangeRate: 1,
      customerId: undefined,
      brokerId: null,
      brokeragePct: 0,
      creditDays: 0,
      addPct: 0,
      lessPct: 0,
      totalCgst: 0,
      totalSgst: 0,
      totalIgst: 0,
      narration: '',
      items: [{ qualityId: undefined as any, hsnNumber: '71023910', quantity: 0, carats: 0, pieces: 1, rate: 0, discountPct: 0, isManualStockId: false }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  // Watch fields for live calculations
  const watchedItems = watch('items');
  const watchedCustomerId = watch('customerId');
  const watchedBrokeragePct = watch('brokeragePct') || 0;
  const watchedInvoiceDate = watch('invoiceDate');
  const watchedCreditDays = watch('creditDays') || 0;
  const watchedIsManual = watch('isManualBillNumber');
  const watchedAddPct = watch('addPct') || 0;
  const watchedLessPct = watch('lessPct') || 0;

  const watchedCurrency = watch('transactionCurrency');
  const watchedExchangeRate = watch('exchangeRate') || 1;

  // A packet carries its own cost currency, which need not be the currency of
  // the invoice being written. Renders the equivalent alongside, or '' when
  // the two already agree.
  const packetRateInInvoiceCurrency = (packetCurrency: string, rate: number): string => {
    const invCurr = (watchedCurrency as 'USD' | 'INR') || 'INR';
    const exR = Number(watchedExchangeRate) || 1;
    if (!rate || exR <= 0 || packetCurrency === invCurr) return '';
    const converted = invCurr === 'INR' ? rate * exR : rate / exR;
    return ` ≈ ${invCurr === 'USD' ? '$' : '₹'}${round2(converted).toLocaleString('en-US')}/ct`;
  };
  const [prevCurrency, setPrevCurrency] = useState<'USD' | 'INR'>(watchedCurrency);
  const [prevExchangeRate, setPrevExchangeRate] = useState<number>(watchedExchangeRate);

  // Re-price the lines when the currency or the exchange rate changes.
  //
  // Packet rows used to be re-derived from the packet master on every change,
  // which threw away a negotiated price the user had typed. Every row is now
  // converted from what it currently shows, so an edited rate survives. Rate
  // changes rescale by the ratio of the old and new rates, which also makes
  // per-keystroke edits in the exchange-rate box self-correcting: typing
  // 8 -> 83 -> 83.25 lands on exactly the same figure as typing 83.25 at once.
  useEffect(() => {
    const exRate = Number(watchedExchangeRate) || 1;
    const prevRate = Number(prevExchangeRate) || 1;
    if (exRate <= 0 || prevRate <= 0) return;

    const currencyChanged = prevCurrency !== watchedCurrency;
    const rateChanged = prevExchangeRate !== watchedExchangeRate;

    if (!currencyChanged && !rateChanged) return;

    const currentItems = watch('items') || [];
    currentItems.forEach((it, idx) => {
      const currentRate = Number(it.rate) || 0;
      if (currentRate <= 0) return;

      const pkt = availablePackets.find((p) => p.id === Number(it.stockPacketId));
      const pktCurrency = pkt?.originalCurrency || pkt?.transactionCurrency || 'INR';

      if (currencyChanged) {
        if (prevCurrency === 'USD' && watchedCurrency === 'INR') {
          setValue(`items.${idx}.rate`, round2(currentRate * exRate));
        } else if (prevCurrency === 'INR' && watchedCurrency === 'USD') {
          setValue(`items.${idx}.rate`, round2(currentRate / exRate));
        }
        return;
      }

      // Rate-only change: re-price just the rows whose underlying price is
      // denominated in the other currency. A manually typed rate in the
      // invoice's own currency is left alone.
      if (pktCurrency === watchedCurrency) return;
      const scaled = watchedCurrency === 'INR'
        ? currentRate * (exRate / prevRate)
        : currentRate * (prevRate / exRate);
      setValue(`items.${idx}.rate`, round2(scaled));
    });

    setPrevCurrency(watchedCurrency);
    setPrevExchangeRate(watchedExchangeRate);
  }, [watchedCurrency, watchedExchangeRate, prevCurrency, prevExchangeRate, availablePackets, watch, setValue]);
  useEffect(() => {
    if (!companyId) return;
    if (activeFinancialYear) setValue('financialYearId', activeFinancialYear.id);

    const loadData = async () => {
      const [accRes, qlyRes, previewIdRes] = await Promise.all([
        fetchAccounts({ companyId }),
        fetchQualities({ companyId }),
        fetchPreviewId({ companyId, financialYearId: activeFinancialYear?.id }) as any,
      ]);

      if (accRes.success && accRes.data) {
        const filteredParties = accRes.data.filter((a) => !a.isBroker);
        setParties(filteredParties);
        setBrokers(accRes.data.filter((a) => a.isBroker));

        // Apply prefill parameters if navigated from GSTR-2 Reconciliation
        const prefill = location.state?.prefill;
        if (prefill) {
          if (prefill.billNumber) {
            setValue('isManualBillNumber', true);
            setValue('billNumber', prefill.billNumber);
          }
          if (prefill.supplierGstin) {
            const matchedSupplier = filteredParties.find(
              (p) => p.gstinNumber?.toUpperCase() === prefill.supplierGstin.toUpperCase()
            );
            if (matchedSupplier) {
              setValue('customerId', matchedSupplier.id);
            }
          }
          if (prefill.totalGrossAmount) {
            setValue('items.0.rate', prefill.totalGrossAmount);
            setValue('items.0.carats', 1);
            setValue('items.0.pieces', 1);
          }
        }
      }
      if (qlyRes.success && qlyRes.data) {
        setQualities(qlyRes.data);
      }
      if (previewIdRes?.success && previewIdRes?.data) {
        setNextStockIdPreview(previewIdRes.data);
      }

      if (!isEditMode) {
        const rateRes = await fetchLatestRate({ companyId });
        if (rateRes?.success && rateRes.data?.exchangeRate) {
          setValue('exchangeRate', rateRes.data.exchangeRate);
        }
      }

      if (needReference && referenceType) {
        const parentRes = await fetchParentInvoices({ companyId, type: referenceType });
        if (parentRes.success && parentRes.data) {
          setParentInvoices(parentRes.data);
        }
      }
    };
    loadData();
  }, [companyId, fetchAccounts, fetchQualities, fetchPreviewId, activeFinancialYear, setValue, needReference, referenceType, fetchParentInvoices]);

  useEffect(() => {
    if (!companyId) return;
    const handleShortcutSuccess = async () => {
      const [accRes, qlyRes] = await Promise.all([
        fetchAccounts({ companyId }),
        fetchQualities({ companyId }),
      ]);
      if (accRes.success && accRes.data) {
        setParties(accRes.data.filter((a) => !a.isBroker));
        setBrokers(accRes.data.filter((a) => a.isBroker));
      }
      if (qlyRes.success && qlyRes.data) {
        setQualities(qlyRes.data);
      }
    };
    window.addEventListener('shortcut-master-success', handleShortcutSuccess);
    return () => window.removeEventListener('shortcut-master-success', handleShortcutSuccess);
  }, [companyId, fetchAccounts, fetchQualities]);

  // Load Preview Voucher Number (only in create mode)
  useEffect(() => {
    if (isEditMode || !companyId || !activeFinancialYear) return;
    const getPreview = async () => {
      const res = await fetchPreviewNo({ companyId, financialYearId: activeFinancialYear.id, type });
      if (res.success && res.data) {
        setPreviewVoucherNo(res.data);
      }
    };
    getPreview();
  }, [isEditMode, companyId, activeFinancialYear, type, fetchPreviewNo]);

  // Load existing invoice data in edit mode
  useEffect(() => {
    if (!isEditMode || !companyId || editLoaded) return;
    const loadInvoice = async () => {
      const res = await fetchInvoice({ id: Number(editId), companyId, type });
      if (res.success && res.data) {
        const inv = res.data;
        setValue('financialYearId', inv.financialYearId);
        setValue('invoiceType', inv.invoiceType);
        setValue('referenceInvoiceId', inv.referenceInvoiceId);
        setValue('referenceBillNumber', inv.referenceBillNumber);
        setValue('billNumber', inv.billNumber || '');
        setValue('isManualBillNumber', inv.billNumber !== inv.voucherNumber);
        setValue('invoiceDate', new Date(inv.invoiceDate).toISOString().split('T')[0]);
        setValue('customerId', inv.customerId);
        setValue('brokerId', inv.brokerId ?? null);
        setValue('brokeragePct', Number(inv.brokeragePct) || 0);
        const dueDays = inv.dueDate ? Math.round((new Date(inv.dueDate).getTime() - new Date(inv.invoiceDate).getTime()) / (24 * 60 * 60 * 1000)) : 0;
        setValue('creditDays', dueDays);
        // Move the conversion baseline with the loaded document, otherwise the
        // currency-change effect treats 'form default -> saved currency' as a
        // user switch and re-converts every rate (83x on an INR invoice).
        setPrevCurrency(((inv.transactionCurrency as any) || 'USD') as 'USD' | 'INR');
        setPrevExchangeRate(Number(inv.exchangeRate) > 0 ? Number(inv.exchangeRate) : 1);
        setValue('transactionCurrency', (inv.transactionCurrency as any) || 'USD');
        if (inv.exchangeRate && Number(inv.exchangeRate) > 0) {
          setValue('exchangeRate', Number(inv.exchangeRate));
        }
        setValue('totalCgst', Number(inv.totalCgst) || 0);
        setValue('totalSgst', Number(inv.totalSgst) || 0);
        let cleanNarr = inv.narration || '';
        if (cleanNarr && cleanNarr.includes('__EXTRA_CHARGES__:')) {
          try {
            const match = cleanNarr.match(/__EXTRA_CHARGES__:(.*?)(?:__END__|$)/);
            if (match && match[1]) {
              const parsed = JSON.parse(match[1]);
              if (Array.isArray(parsed)) {
                setExtraCharges(parsed.map((p: any, idx: number) => ({
                  id: p.id || 'ec_' + idx,
                  name: p.name || 'Charge',
                  hsn: p.hsn || '9968',
                  currency: p.currency || (inv.transactionCurrency as any) || 'USD',
                  amount: Number(p.amount) || 0,
                })));
              }
            }
          } catch {}
          cleanNarr = cleanNarr.replace(/__EXTRA_CHARGES__:.*?__END__/g, '').trim();
        }
        setValue('narration', cleanNarr);
        if (inv.items && inv.items.length > 0) {
          setValue('items', inv.items.map((it) => ({
            qualityId: it.qualityId,
            hsnNumber: it.hsnNumber || '71023910',
            quantity: 0,
            carats: Number(it.carats),
            pieces: it.pieces === 0 || it.pieces === null ? null : (it.pieces || 1),
            isPiecesUncounted: it.pieces === 0 || it.pieces === null,
            rate: Number(it.rate),
            discountPct: Number(it.discountPct) || 0,
            stockPacketId: it.stockPacketId ?? undefined,
            isManualStockId: false,
          })));
        }
        setPreviewVoucherNo(inv.voucherNumber);
        setEditLoaded(true);
      }
    };
    loadInvoice();
  }, [isEditMode, editId, companyId, editLoaded, fetchInvoice, setValue]);

  // Sync billNumber if manual entry is unchecked
  useEffect(() => {
    if (!watchedIsManual && previewVoucherNo) {
      setValue('billNumber', previewVoucherNo);
    }
  }, [watchedIsManual, previewVoucherNo, setValue]);

  const handleSelectReference = (refIdStr: string) => {
    const refId = refIdStr ? Number(refIdStr) : null;
    if (!refId) {
      setValue('referenceInvoiceId', null);
      setValue('referenceBillNumber', null);
      return;
    }
    const matched = parentInvoices.find((inv) => inv.id === refId);
    if (matched) {
      setValue('referenceInvoiceId', matched.id);
      setValue('referenceBillNumber', matched.voucherNumber);
      setValue('customerId', matched.customerId);
      setValue('brokerId', matched.brokerId ?? null);
      setValue('brokeragePct', Number(matched.brokeragePct) || 0);
      // Same baseline reset as loadInvoice: a credit/debit note built from an INR
      // parent would otherwise inherit inflated rates.
      setPrevCurrency(((matched.transactionCurrency as any) || 'USD') as 'USD' | 'INR');
      setPrevExchangeRate(Number(matched.exchangeRate) > 0 ? Number(matched.exchangeRate) : 1);
      setValue('transactionCurrency', (matched.transactionCurrency as any) || 'USD');
      if (matched.exchangeRate && Number(matched.exchangeRate) > 0) {
        setValue('exchangeRate', Number(matched.exchangeRate));
      }
      const dueDays = matched.dueDate ? Math.round((new Date(matched.dueDate).getTime() - new Date(matched.invoiceDate).getTime()) / (24 * 60 * 60 * 1000)) : 0;
      setValue('creditDays', dueDays);
      setValue('narration', `Ref: ${matched.voucherNumber}. `);
      if (matched.items && matched.items.length > 0) {
        setValue('items', matched.items.map((it) => ({
          qualityId: it.qualityId,
          hsnNumber: it.hsnNumber || '71023910',
          quantity: 0,
          carats: Number(it.carats),
          pieces: it.pieces === 0 || it.pieces === null ? null : (it.pieces || 1),
          isPiecesUncounted: it.pieces === 0 || it.pieces === null,
          rate: Number(it.rate),
          discountPct: Number(it.discountPct) || 0,
          stockPacketId: it.stockPacketId || undefined,
          isManualStockId: false,
        })));
      }
      showToast(`Referenced invoice ${matched.voucherNumber} details loaded successfully`, 'success');
    }
  };

  const handleApplyPresetCharge = (preset: typeof PRESET_CHARGES[0]) => {
    const invCurr = (watch('transactionCurrency') as 'USD' | 'INR') || 'USD';
    const isUsd = invCurr === 'USD';
    const defaultAmount = isUsd ? preset.defaultUsd : preset.defaultInr;

    const newCharge: ExtraChargeItem = {
      id: 'ec_' + Math.random().toString(36).substring(2, 9),
      name: preset.name,
      hsn: preset.hsn,
      currency: invCurr,
      amount: defaultAmount,
    };

    setExtraCharges((prev) => [...prev, newCharge]);
    showToast(`Added "${preset.name}" to extra charges`, 'info');
  };

  const handleAddCustomCharge = () => {
    const invCurr = (watch('transactionCurrency') as 'USD' | 'INR') || 'USD';
    const newCharge: ExtraChargeItem = {
      id: 'ec_' + Math.random().toString(36).substring(2, 9),
      name: 'Supplementary Charge',
      hsn: '9968',
      currency: invCurr,
      amount: 0,
    };
    setExtraCharges((prev) => [...prev, newCharge]);
  };

  const handleRemoveCharge = (id: string) => {
    setExtraCharges((prev) => prev.filter((c) => c.id !== id));
  };

  const handleUpdateCharge = (id: string, field: 'name' | 'hsn' | 'currency' | 'amount', val: any) => {
    setExtraCharges((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: field === 'amount' ? (Number(val) || 0) : val } : c))
    );
  };

  const getConvertedChargeAmount = (chg: ExtraChargeItem) => {
    const invCurr = watch('transactionCurrency') || 'USD';
    const exRate = Number(watch('exchangeRate')) || 1;
    const amt = Number(chg.amount) || 0;
    const chgCurr = chg.currency || invCurr;
    if (chgCurr === invCurr) return amt;
    if (chgCurr === 'USD' && invCurr === 'INR') {
      return Math.round(amt * exRate * 100) / 100;
    }
    if (chgCurr === 'INR' && invCurr === 'USD') {
      return Math.round((amt / (exRate > 0 ? exRate : 1)) * 100) / 100;
    }
    return amt;
  };

  // Find active party object to check state code
  const selectedPartyObj = parties.find((p) => p.id === watchedCustomerId);

  // Calculated Due Date helper text
  const calculatedDueDateStr = (() => {
    if (!watchedInvoiceDate) return '';
    const d = new Date(watchedInvoiceDate);
    d.setDate(d.getDate() + Number(watchedCreditDays));
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  })();

  // Compute live invoice summary totals
  const totalExtraCharges = extraCharges.reduce((acc, c) => acc + getConvertedChargeAmount(c), 0);

  // Totals come from the SAME module the backend uses, so the figures on screen
  // are exactly the ones that get saved. The two used to be hand-duplicated and
  // had drifted: the form ignored per-line discount and rounded tax differently.
  const isSameStateCalc = resolveIsSameState(
    activeCompany?.stateCode,
    selectedPartyObj?.stateCode,
  );

  const invoiceDateObj = watchedInvoiceDate ? new Date(watchedInvoiceDate) : new Date();

  const calcTotals = computeInvoiceTotals(
    (watchedItems || []).map((it) => {
      const qObj = qualities.find((q) => q.id === Number(it?.qualityId));
      const resolvedGst = qObj?.gstHistory && qObj.gstHistory.length > 0
        ? resolveGstPct(qObj.gstHistory, invoiceDateObj)
        : (qObj?.gstPct || 0);
      return {
        carats: it?.carats,
        pieces: (it as any)?.pieces,
        isPiecesUncounted: (it as any)?.isPiecesUncounted,
        rate: it?.rate,
        discountPct: (it as any)?.discountPct,
        gstPct: resolvedGst,
      };
    }),
    {
      addPct: watchedAddPct,
      lessPct: watchedLessPct,
      isSameState: isSameStateCalc,
      currency: (watchedCurrency as CalcCurrency) || 'INR',
      exchangeRate: Number(watchedExchangeRate) || 1,
      extraChargesTotal: totalExtraCharges,
    },
  );

  const totalQty = (watchedItems || []).reduce((acc, it) => acc + (Number(it?.quantity) || 0), 0);
  const totalCrts = calcTotals.totalCarats;
  const grossTotal = round2(calcTotals.totalGrossAmount - calcTotals.extraCharges);
  const itemTotals = calcTotals.lines.map((l) => ({ gross: l.gross }));

  const calculatedAddValue = round2(((grossTotal + totalExtraCharges) * watchedAddPct) / 100);
  const calculatedLessValue = round2(((grossTotal + totalExtraCharges) * watchedLessPct) / 100);
  const taxableTotal = calcTotals.taxableTotal;

  const cgstTotal = calcTotals.totalCgst;
  const sgstTotal = calcTotals.totalSgst;
  const igstTotal = calcTotals.totalIgst;

  // Keep the form fields in step for display. The backend derives GST from the
  // Quality master and ignores these, so they are no longer an override.
  useEffect(() => {
    setValue('totalCgst', cgstTotal);
    setValue('totalSgst', sgstTotal);
    setValue('totalIgst', igstTotal);
  }, [cgstTotal, sgstTotal, igstTotal, setValue]);

  const netTotal = calcTotals.netAmount;
  const roundOff = calcTotals.roundOff;
  const brokerageAmount = round2((taxableTotal * watchedBrokeragePct) / 100);
  const selectedBrokerObj = brokers.find((b) => b.id === Number(watch('brokerId')));

  const onSubmit = async (data: InvoiceFormData) => {
    if (!companyId) return;

    let cleanNarration = (data.narration || '').replace(/__EXTRA_CHARGES__:.*?__END__/g, '').trim();
    if (extraCharges.length > 0) {
      cleanNarration = `${cleanNarration ? cleanNarration + ' ' : ''}__EXTRA_CHARGES__:${JSON.stringify(extraCharges)}__END__`.trim();
    }

    const payload = {
      ...data,
      extraCharges,
      totalExtraCharges,
      narration: cleanNarration,
    };

    let res;
    if (isEditMode) {
      res = await updateInvoice({ id: Number(editId), companyId, data: payload as any });
    } else {
      res = await createInvoice({ companyId, data: payload as any });
    }
    if (res.success) {
      showToast(isEditMode ? 'Transaction updated successfully' : 'Transaction created successfully', 'success');
      navigate(listRoute);
    } else {
      showToast(res.error || 'Failed to save transaction', 'error');
    }
  };

  const onError = (errors: any) => {
    console.error('Form Validation Errors:', errors);
    const firstKey = Object.keys(errors)[0];
    if (firstKey === 'items' && Array.isArray(errors.items)) {
      const itemErrIndex = errors.items.findIndex((itemErr: any) => itemErr && Object.keys(itemErr).length > 0);
      if (itemErrIndex !== -1) {
        const itemErrObj = errors.items[itemErrIndex];
        const fieldKey = Object.keys(itemErrObj)[0];
        const msg = itemErrObj[fieldKey]?.message || 'Required field missing';
        showToast(`Item #${itemErrIndex + 1} Error (${fieldKey}): ${msg}`, 'error');
        return;
      }
    }
    if (firstKey) {
      const errMsg = errors[firstKey]?.message || errors[firstKey]?.root?.message || 'Please check required fields';
      showToast(`Validation Error (${firstKey}): ${errMsg}`, 'error');
    } else {
      showToast('Please fill in all required fields marked with *', 'error');
    }
  };

  if (!isReady || !activeFinancialYear) {
    return <p style={{ color: 'var(--color-text-secondary)' }}>Select a company and financial year first.</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Button variant="ghost" onClick={() => navigate(listRoute)}><ArrowLeft size={18} /></Button>
        <h1 style={{ fontSize: 'var(--text-title)', fontWeight: 700, color: 'var(--color-primary)' }}>
          {isEditMode ? `Edit ${title}` : `New ${title}`}
        </h1>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit, onError)}
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '24px' }}
      >
        <h2 style={{ fontSize: 'var(--text-heading)', fontWeight: 600, marginBottom: '16px' }}>Header Information</h2>

        {needReference && (
          <div style={{ marginBottom: '20px', background: 'var(--color-row-alt)', padding: '16px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
            <Select
              label={`Link Reference ${isCustomer ? 'Sales Invoice' : 'Purchase Invoice'} *`}
              options={parentInvoices.map((parent) => ({
                value: String(parent.id),
                label: `${parent.voucherNumber} (${isCustomer ? parent.customer?.accountName : parent.supplier?.accountName}) — Date: ${new Date(parent.invoiceDate).toLocaleDateString('en-IN')} — Net: ${formatInvoiceCurrencyDual(parent)}`,
              }))}
              value={watch('referenceInvoiceId') ? String(watch('referenceInvoiceId')) : ''}
              onChange={(val) => handleSelectReference(val)}
              placeholder={`Search and select parent ${isCustomer ? 'sales' : 'purchase'} invoice...`}
              disabled={isEditMode}
              searchable={true}
              clearable={true}
            />
            {watch('referenceBillNumber') && (
              <span style={{ display: 'block', fontSize: '12px', color: 'var(--color-accent)', marginTop: '8px', fontWeight: 500 }}>
                Linked Invoice Number: <strong>{watch('referenceBillNumber')}</strong>
              </span>
            )}
          </div>
        )}
        
        {/* Bill Number Config Row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px', background: 'var(--color-row-alt)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
            <input type="checkbox" {...register('isManualBillNumber')} />
            Enter bill number manually
          </label>
          <div style={{ flex: 1, maxWidth: '300px' }}>
            <Input 
              placeholder={previewVoucherNo || "Auto-Generated sequential number"} 
              disabled={!watchedIsManual} 
              {...register('billNumber')} 
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px', marginBottom: '24px' }}>
          <FormSelect
            control={control}
            name="customerId"
            label={isCustomer ? "Customer *" : "Supplier *"}
            placeholder="Select party"
            options={parties.map((p) => ({ value: String(p.id), label: p.accountName }))}
            toValue={Number}
            shortcutType="account"
            shortcutGroup={isCustomer ? "Sundry Debtors" : "Sundry Creditors"}
          />
          <FormSelect
            control={control}
            name="brokerId"
            label="Broker (Reference)"
            placeholder="Select broker"
            options={brokers.map((b) => ({ value: String(b.id), label: b.accountName }))}
            toValue={(v) => (v ? Number(v) : null)}
            shortcutType="account"
            shortcutGroup="Brokers"
          />
          <Input label="Date *" type="date" {...register('invoiceDate')} />
          <div>
            <Input label="Due Days" type="number" {...register('creditDays', { valueAsNumber: true })} />
            <span style={{ fontSize: '11px', color: 'var(--color-accent)', display: 'block', marginTop: '4px', fontWeight: 500 }}>
              Calculated Due Date: {calculatedDueDateStr}
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px', marginBottom: '24px' }}>
          <Input label="Brokerage %" type="number" step="0.01" {...register('brokeragePct', { valueAsNumber: true })} />
          <FormSelect
            control={control}
            name="transactionCurrency"
            label="Currency *"
            options={[
              { value: 'USD', label: 'USD ($)' },
              { value: 'INR', label: 'INR (₹)' },
            ]}
          />
          <Input
            label={`Exchange Rate ($1 = ₹) ${watch('transactionCurrency') === 'USD' ? '*' : ''}`}
            type="number"
            step="0.0001"
            {...register('exchangeRate', { valueAsNumber: true })}
          />
        </div>

        <div style={{ borderTop: '1px solid var(--color-border)', margin: '24px 0' }} />

        <h2 style={{ fontSize: 'var(--text-heading)', fontWeight: 600, marginBottom: '16px' }}>Itemized Grid</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border)', textAlign: 'left' }}>
              <th style={{ padding: '8px', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>QUALITY *</th>
              <th style={{ padding: '8px', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', width: '100px' }}>QUANTITY</th>
              <th style={{ padding: '8px', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', width: '120px' }}>CARATS *</th>
              <th style={{ padding: '8px', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', width: '140px' }}>PIECES</th>
              <th style={{ padding: '8px', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', width: '120px' }}>RATE *</th>
              <th style={{ padding: '8px', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', width: '140px', textAlign: 'right' }}>NET AMOUNT</th>
              <th style={{ padding: '8px', width: '50px' }}></th>
            </tr>
          </thead>
          <tbody>
            {fields.map((field, index) => {
              const watchedQualityId = watch(`items.${index}.qualityId`);
              const qualityObj = qualities.find((q) => q.id === Number(watchedQualityId));
              const isServiceQuality = qualityObj?.isService || false;

              return (
                <React.Fragment key={field.id}>
                  <tr style={{ borderBottom: isServiceQuality ? '1px solid var(--color-border)' : 'none', verticalAlign: 'middle' }}>
                    <td style={{ padding: '8px', verticalAlign: 'middle' }}>
                      <FormSelect
                        control={control}
                        name={`items.${index}.qualityId`}
                        options={qualities.map((q) => ({ value: String(q.id), label: q.qualityName }))}
                        toValue={Number}
                        shortcutType="quality"
                      />
                    </td>
                    <td style={{ padding: '8px', verticalAlign: 'middle' }}>
                      {isServiceQuality ? (
                        <Input type="number" step="0.01" {...register(`items.${index}.quantity`, { valueAsNumber: true })} />
                      ) : (
                        <div style={{ textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '13px' }}>—</div>
                      )}
                    </td>
                    <td style={{ padding: '8px', verticalAlign: 'middle' }}>
                      <Input type="number" step="0.001" {...register(`items.${index}.carats`, { valueAsNumber: true })} />
                    </td>
                    <td style={{ padding: '8px', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{ flex: 1 }}>
                            <Input
                              type="number"
                              disabled={!!watch(`items.${index}.isPiecesUncounted`)}
                              placeholder={watch(`items.${index}.isPiecesUncounted`) ? 'None' : 'Pcs'}
                              {...register(`items.${index}.pieces`, {
                                valueAsNumber: true,
                                setValueAs: (v) => (watch(`items.${index}.isPiecesUncounted`) ? null : (v ? Number(v) : null)),
                              })}
                            />
                          </div>
                          <label
                            title="Check if pieces are uncountable"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              fontSize: '11px',
                              fontWeight: 500,
                              color: watch(`items.${index}.isPiecesUncounted`) ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                              cursor: 'pointer',
                              userSelect: 'none',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            <input
                              type="checkbox"
                              {...register(`items.${index}.isPiecesUncounted`)}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setValue(`items.${index}.isPiecesUncounted`, checked);
                                if (checked) {
                                  setValue(`items.${index}.pieces`, null as any);
                                } else {
                                  setValue(`items.${index}.pieces`, 1);
                                }
                              }}
                              style={{ accentColor: 'var(--color-accent)', width: '13px', height: '13px', cursor: 'pointer' }}
                            />
                            N/A
                          </label>
                        </div>
                        {!watch(`items.${index}.isPiecesUncounted`) && Number(watch(`items.${index}.pieces`) || 0) > 1 && Number(watch(`items.${index}.carats`) || 0) > 0 && (
                          <div style={{ fontSize: '10px', color: 'var(--color-accent)', fontWeight: 700, whiteSpace: 'nowrap', textAlign: 'left', paddingLeft: '2px' }}>
                            Avg: {(Number(watch(`items.${index}.carats`)) / Number(watch(`items.${index}.pieces`))).toFixed(3)} ct/pc
                          </div>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '8px', verticalAlign: 'middle' }}>
                      <Input type="number" step="0.01" {...register(`items.${index}.rate`, { valueAsNumber: true })} />
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600, fontSize: '14px', verticalAlign: 'middle' }}>
                      {watch('transactionCurrency') === 'USD' ? '$' : '₹'}{(itemTotals[index]?.gross || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'center', verticalAlign: 'middle' }}>
                      {fields.length > 1 && (
                        <Button variant="ghost" size="sm" onClick={() => remove(index)}>
                          <Trash2 size={14} color="var(--color-danger)" />
                        </Button>
                      )}
                    </td>
                  </tr>

                  {!isServiceQuality && !!watchedQualityId && (
                    <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-row-alt)' }}>
                      <td colSpan={7} style={{ padding: '8px 16px 12px 16px' }}>
                        {isSale ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div style={{ flex: 1, maxWidth: '450px' }}>
                              <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px', color: 'var(--color-accent)' }}>
                                Select Stock Packet *
                              </label>
                              {(() => {
                                const currentPktId = Number(watch(`items.${index}.stockPacketId`));
                                const allSelectedPktIds = (watch('items') || [])
                                  .map((it, i) => i !== index ? Number(it.stockPacketId) : 0)
                                  .filter((id) => id > 0);

                                const packetOptions = availablePackets
                                  .filter((p) =>
                                    p.qualityId === Number(watchedQualityId) &&
                                    (['AVAILABLE', 'CREATED', 'PURCHASED'].includes(p.currentStatus) || p.id === currentPktId) &&
                                    !allSelectedPktIds.includes(p.id)
                                  )
                                  .map((p) => {
                                    const origCurr = p.originalCurrency || p.transactionCurrency || 'INR';
                                    const currSym = origCurr === 'USD' ? '$' : '₹';
                                    const baseRate = isSale && (p as any).targetSaleRate != null && Number((p as any).targetSaleRate) > 0 ? Number((p as any).targetSaleRate) : Number(p.costPerCarat || 0);
                                    // Show the equivalent in the invoice's currency too, so a
                                    // dollar-priced packet is comparable inside a rupee invoice.
                                    const conv = packetRateInInvoiceCurrency(origCurr, baseRate);
                                    return {
                                      value: String(p.id),
                                      label: `${p.stockIdNumber} (${Number(p.caratWeight).toFixed(3)} CTS | ${p.pieceCount} Pcs | ${currSym}${baseRate.toLocaleString('en-US')}/ct [${origCurr}]${conv})`,
                                    };
                                  });

                                return (
                                  <Select
                                    value={currentPktId ? String(currentPktId) : ''}
                                    placeholder="Search and Select Stock Packet..."
                                    options={packetOptions}
                                    onChange={(val: string) => {
                                      const pktId = (val && val !== '' && val !== 'null') ? Number(val) : null;
                                      setValue(`items.${index}.stockPacketId`, pktId as any);
                                      const pkt = availablePackets.find((p) => p.id === pktId);
                                      if (pkt) {
                                        setValue(`items.${index}.carats`, Number(pkt.caratWeight));
                                        setValue(`items.${index}.pieces`, Number(pkt.pieceCount));

                                        const pktCurrency = pkt.originalCurrency || pkt.transactionCurrency || 'USD';

                                        // Auto-switch invoice currency to packet's origin currency if this is the first packet being added
                                        const existingPktIds = (watch('items') || []).map((it) => Number(it.stockPacketId)).filter((id) => id > 0);
                                        let activeCurrency = (watch('transactionCurrency') as 'USD' | 'INR') || 'USD';
                                        if (isSale && pktCurrency && existingPktIds.length <= 1) {
                                          if (activeCurrency !== pktCurrency) {
                                            activeCurrency = pktCurrency;
                                            setPrevCurrency(pktCurrency);
                                            setValue('transactionCurrency', pktCurrency as any);
                                          }
                                        }

                                        const exRate = Number(watch('exchangeRate')) || 1;

                                        let baseRate = 0;
                                        if (isSale && (pkt as any).targetSaleRate != null && Number((pkt as any).targetSaleRate) > 0) {
                                          baseRate = Number((pkt as any).targetSaleRate);
                                        } else if (pkt.costPerCarat != null && Number(pkt.costPerCarat) > 0) {
                                          baseRate = Number(pkt.costPerCarat);
                                        }

                                        let finalRate = baseRate;
                                        if (pktCurrency === 'USD' && activeCurrency === 'INR') {
                                          finalRate = Math.round((baseRate * exRate) * 100) / 100;
                                        } else if (pktCurrency === 'INR' && activeCurrency === 'USD') {
                                          finalRate = Math.round((baseRate / (exRate > 0 ? exRate : 1)) * 100) / 100;
                                        }

                                        setValue(`items.${index}.rate`, finalRate);
                                      }
                                    }}
                                  />
                                );
                              })()}
                            </div>
                            {(() => {
                              const pktVal = watch(`items.${index}.stockPacketId`);
                              const pkt = availablePackets.find((p) => p.id === Number(pktVal));
                              if (!pkt) return null;
                              const origCurr = pkt.originalCurrency || pkt.transactionCurrency || 'INR';
                              const currSym = origCurr === 'USD' ? '$' : '₹';
                              const baseRate = isSale && (pkt as any).targetSaleRate != null && Number((pkt as any).targetSaleRate) > 0 ? Number((pkt as any).targetSaleRate) : Number(pkt.costPerCarat || 0);
                              const conv = packetRateInInvoiceCurrency(origCurr, baseRate);
                              return (
                                <span style={{ fontSize: '12px', color: 'var(--color-success)', fontWeight: 500, marginTop: '16px' }}>
                                  Available: <strong>{Number(pkt.caratWeight).toFixed(3)} CTS</strong> / {pkt.pieceCount} Pcs — Origin: <strong>{currSym}{baseRate.toLocaleString('en-US')}/ct ({origCurr}){conv}</strong>
                                </span>
                              );
                            })()}
                          </div>
                        ) : (
                          <div>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-accent)', display: 'block', marginBottom: '12px' }}>
                              Stock Packet Registration Details
                            </span>
                            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                                  <input
                                    type="checkbox"
                                    {...register(`items.${index}.isManualStockId`)}
                                    onChange={(e) => {
                                      if (!e.target.checked) {
                                        setValue(`items.${index}.stockIdNumber`, '');
                                      }
                                    }}
                                  />
                                  Manual ID
                                </label>
                                {watch(`items.${index}.isManualStockId`) ? (
                                  <Input
                                    label=""
                                    placeholder="Enter custom ID"
                                    {...register(`items.${index}.stockIdNumber`)}
                                  />
                                ) : (
                                  <div style={{
                                    padding: '7px 10px',
                                    borderRadius: 'var(--radius-sm)',
                                    background: 'var(--color-background-subtle, #f5f5f5)',
                                    border: '1px solid var(--color-border)',
                                    fontSize: '12px',
                                    color: 'var(--color-text-primary)',
                                    minHeight: '34px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    marginTop: '2px',
                                    fontWeight: 500
                                  }}>
                                    Auto: <strong style={{ marginLeft: '4px', color: 'var(--color-accent)' }}>{getPreviewIdForRow(nextStockIdPreview, index)}</strong>
                                  </div>
                                )}
                              </div>
                              <FormSelect
                                control={control}
                                name={`items.${index}.category`}
                                label="Category"
                                options={[
                                  { value: 'NON_CERTIFIED', label: 'Non-Certified' },
                                  { value: 'CERTIFIED', label: 'Certified' }
                                ]}
                              />
                              <Controller
                                name={`items.${index}.shape`}
                                control={control}
                                render={({ field }) => (
                                  <Combobox
                                    label="Shape"
                                    value={field.value ?? ''}
                                    onChange={field.onChange}
                                    options={shapeOptions}
                                    placeholder="Select or type shape"
                                    maxVisibleItems={5}
                                  />
                                )}
                              />
                              <Input label="Color" placeholder="e.g. D" {...register(`items.${index}.color`)} />
                              <Input 
                                label="Clarity" 
                                placeholder="e.g. VS1" 
                                style={{ textTransform: 'uppercase' }} 
                                {...register(`items.${index}.clarity`, {
                                  onChange: (e) => { e.target.value = e.target.value.toUpperCase(); }
                                })} 
                              />
                              <Input 
                                label="Cut" 
                                placeholder="e.g. EX" 
                                style={{ textTransform: 'uppercase' }} 
                                {...register(`items.${index}.cut`, {
                                  onChange: (e) => { e.target.value = e.target.value.toUpperCase(); }
                                })} 
                              />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                               <Input 
                                label="Polish" 
                                placeholder="e.g. EX" 
                                style={{ textTransform: 'uppercase' }} 
                                {...register(`items.${index}.polish`, {
                                  onChange: (e) => { e.target.value = e.target.value.toUpperCase(); }
                                })} 
                              />
                              <Input 
                                label="Symmetry" 
                                placeholder="e.g. EX" 
                                style={{ textTransform: 'uppercase' }} 
                                {...register(`items.${index}.symmetry`, {
                                  onChange: (e) => { e.target.value = e.target.value.toUpperCase(); }
                                })} 
                              />
                              <Input label="Length (mm)" type="number" step="0.01" {...register(`items.${index}.lengthMm`)} />
                              <Input label="Width (mm)" type="number" step="0.01" {...register(`items.${index}.widthMm`)} />
                              <Input label="Depth (mm)" type="number" step="0.01" {...register(`items.${index}.depthMm`)} />
                              <Input label="Depth %" type="number" step="0.1" {...register(`items.${index}.totalDepthPct`)} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1.2fr 1fr 1fr', gap: '12px' }}>
                              <Input label="Table %" type="number" step="0.1" {...register(`items.${index}.tablePct`)} />
                              <Input label="Certificate Type" placeholder="e.g. GIA" {...register(`items.${index}.certificateType`)} />
                              <Input label="Certificate Number" placeholder="e.g. 12345" {...register(`items.${index}.certificateNumber`)} />
                              <Input label={`Target Rate (${watch('transactionCurrency') === 'USD' ? '$' : '₹'}/ct) [Opt]`} type="number" step="0.01" placeholder="Target asking price" {...register(`items.${index}.targetSaleRate`)} />
                              <Input label="Image URL" placeholder="e.g. http://..." {...register(`items.${index}.imageLink`)} />
                              <Input label="Video URL" placeholder="e.g. http://..." {...register(`items.${index}.videoLink`)} />
                            </div>

                            {/* ── Advanced Diamond Details (Collapsible) ── */}
                            <div
                              onClick={() => {
                                const el = document.getElementById(`adv-${index}`);
                                if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
                                const icon = document.getElementById(`adv-icon-${index}`);
                                if (icon) icon.textContent = icon.textContent === '▼' ? '▲' : '▼';
                              }}
                              style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', userSelect: 'none', marginTop: '8px', marginBottom: '4px' }}
                            >
                              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Advanced Diamond Details</span>
                              <span id={`adv-icon-${index}`} style={{ fontSize: '10px', color: 'var(--color-text-secondary)' }}>▼</span>
                            </div>
                            <div id={`adv-${index}`} style={{ display: 'none' }}>
                              {/* Fluorescence & Optical */}
                              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '6px', marginTop: '8px' }}>Fluorescence & Optical</span>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                                <Input label="Fluorescence" placeholder="e.g. NONE" {...register(`items.${index}.fluorescenceIntensity`, { onChange: (e) => { e.target.value = e.target.value.toUpperCase(); } })} />
                                <Input label="Fluor Color" placeholder="e.g. BLUE" {...register(`items.${index}.fluorescenceColor`, { onChange: (e) => { e.target.value = e.target.value.toUpperCase(); } })} />
                                <Input label="Eye Clean" placeholder="e.g. YES" {...register(`items.${index}.eyeClean`, { onChange: (e) => { e.target.value = e.target.value.toUpperCase(); } })} />
                                <Input label="Hearts & Arrows" placeholder="e.g. YES" {...register(`items.${index}.heartsAndArrows`, { onChange: (e) => { e.target.value = e.target.value.toUpperCase(); } })} />
                                <Input label="Shade" placeholder="e.g. NONE" {...register(`items.${index}.shade`, { onChange: (e) => { e.target.value = e.target.value.toUpperCase(); } })} />
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                                <Input label="Milky" placeholder="e.g. NONE" {...register(`items.${index}.milky`, { onChange: (e) => { e.target.value = e.target.value.toUpperCase(); } })} />
                                <Input label="Tinge" placeholder="e.g. NONE" {...register(`items.${index}.tinge`, { onChange: (e) => { e.target.value = e.target.value.toUpperCase(); } })} />
                                <Input label="Lustre" placeholder="e.g. EXCELLENT" {...register(`items.${index}.lustre`, { onChange: (e) => { e.target.value = e.target.value.toUpperCase(); } })} />
                                <Input label="Rap Price ($/ct)" type="number" step="0.01" {...register(`items.${index}.rapPricePerCarat`)} />
                                <Input label="Rap Discount %" type="number" step="0.01" {...register(`items.${index}.rapDiscountPct`)} />
                              </div>

                              {/* Girdle, Crown & Pavilion */}
                              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '6px' }}>Girdle, Crown & Pavilion</span>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                                <Input label="Crown Angle" type="number" step="0.01" {...register(`items.${index}.crownAngle`)} />
                                <Input label="Crown Height" type="number" step="0.01" {...register(`items.${index}.crownHeight`)} />
                                <Input label="Pavilion Angle" type="number" step="0.01" {...register(`items.${index}.pavilionAngle`)} />
                                <Input label="Pavilion Depth" type="number" step="0.01" {...register(`items.${index}.pavilionDepth`)} />
                                <Input label="Girdle Min" placeholder="e.g. THIN" {...register(`items.${index}.girdleMin`, { onChange: (e) => { e.target.value = e.target.value.toUpperCase(); } })} />
                                <Input label="Girdle Max" placeholder="e.g. THICK" {...register(`items.${index}.girdleMax`, { onChange: (e) => { e.target.value = e.target.value.toUpperCase(); } })} />
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                                <Input label="Girdle Condition" placeholder="e.g. FACETED" {...register(`items.${index}.girdleCondition`, { onChange: (e) => { e.target.value = e.target.value.toUpperCase(); } })} />
                                <Input label="Culet Size" placeholder="e.g. NONE" {...register(`items.${index}.culetSize`, { onChange: (e) => { e.target.value = e.target.value.toUpperCase(); } })} />
                                <Input label="Culet Condition" placeholder="e.g. POINTED" {...register(`items.${index}.culetCondition`, { onChange: (e) => { e.target.value = e.target.value.toUpperCase(); } })} />
                                <Input label="Table Open" {...register(`items.${index}.tableOpen`, { onChange: (e) => { e.target.value = e.target.value.toUpperCase(); } })} />
                                <Input label="Crown Open" {...register(`items.${index}.crownOpen`, { onChange: (e) => { e.target.value = e.target.value.toUpperCase(); } })} />
                                <Input label="Girdle Open" {...register(`items.${index}.girdleOpen`, { onChange: (e) => { e.target.value = e.target.value.toUpperCase(); } })} />
                              </div>

                              {/* Inclusions, Treatment & Origin */}
                              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '6px' }}>Inclusions, Treatment & Origin</span>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                                <Input label="Table Inclusion" {...register(`items.${index}.tableInclusion`, { onChange: (e) => { e.target.value = e.target.value.toUpperCase(); } })} />
                                <Input label="Side Inclusion" {...register(`items.${index}.sideInclusion`, { onChange: (e) => { e.target.value = e.target.value.toUpperCase(); } })} />
                                <Input label="Treatment" placeholder="e.g. NONE" {...register(`items.${index}.treatment`, { onChange: (e) => { e.target.value = e.target.value.toUpperCase(); } })} />
                                <Input label="Origin" placeholder="e.g. INDIA" {...register(`items.${index}.origin`, { onChange: (e) => { e.target.value = e.target.value.toUpperCase(); } })} />
                                <Input label="Inscription" {...register(`items.${index}.inscription`)} />
                                <Input label="Key to Symbols" {...register(`items.${index}.keyToSymbols`)} />
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                                <Input label="Fancy Color" {...register(`items.${index}.fancyColor`, { onChange: (e) => { e.target.value = e.target.value.toUpperCase(); } })} />
                                <Input label="Fancy Intensity" {...register(`items.${index}.fancyColorIntensity`, { onChange: (e) => { e.target.value = e.target.value.toUpperCase(); } })} />
                                <Input label="Fancy Overtone" {...register(`items.${index}.fancyColorOvertone`, { onChange: (e) => { e.target.value = e.target.value.toUpperCase(); } })} />
                                <Input label="Certificate URL" {...register(`items.${index}.certificateUrl`)} />
                                <Input label="Web URL" {...register(`items.${index}.webUrl`)} />
                                <Input label="Comment" {...register(`items.${index}.diamondComment`)} />
                              </div>
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>

        <Button
          type="button"
          variant="secondary"
          onClick={() => append({ qualityId: undefined as any, hsnNumber: '71023910', quantity: 0, carats: 0, pieces: 1, isPiecesUncounted: false, rate: 0, discountPct: 0, isManualStockId: false })}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '24px' }}
        >
          <Plus size={14} /> Add Row
        </Button>

        {/* EXTRA / SUPPLEMENTARY CHARGES SECTION */}
        <div style={{ borderTop: '1px solid var(--color-border)', margin: '24px 0' }} />

        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '20px',
          marginBottom: '24px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: 'var(--color-primary)' }}>
                Extra / Supplementary Charges
              </h3>
              <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                Add insured shipping, lab certification fees, customs clearance, or custom service charges
              </span>
            </div>
            {totalExtraCharges > 0 && (
              <div style={{
                background: 'rgba(2, 132, 199, 0.1)',
                border: '1px solid var(--color-accent)',
                borderRadius: 'var(--radius-md)',
                padding: '6px 12px',
                fontSize: '13px',
                fontWeight: 700,
                color: 'var(--color-accent)'
              }}>
                Total Extra Charges: {watch('transactionCurrency') === 'USD' ? `$${totalExtraCharges.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : `₹${totalExtraCharges.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
              </div>
            )}
          </div>

          {/* Quick Preset Buttons Strip */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexWrap: 'wrap',
            marginBottom: '16px',
            padding: '10px 14px',
            background: 'var(--color-row-alt)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)'
          }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              ⚡ Quick Presets:
            </span>
            {PRESET_CHARGES.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => handleApplyPresetCharge(preset)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-surface)',
                  color: 'var(--color-text-primary)',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-accent)';
                  e.currentTarget.style.color = 'var(--color-accent)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-border)';
                  e.currentTarget.style.color = 'var(--color-text-primary)';
                }}
              >
                <span>{preset.shortLabel}</span>
                <span style={{ fontSize: '10px', opacity: 0.75, background: 'var(--color-bg-card)', padding: '1px 4px', borderRadius: '3px' }}>
                  {watch('transactionCurrency') === 'USD' ? `$${preset.defaultUsd}` : `₹${preset.defaultInr.toLocaleString('en-IN')}`}
                </span>
              </button>
            ))}
          </div>

          {/* Extra Charges Table */}
          {extraCharges.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', textAlign: 'left', background: 'var(--color-row-alt)' }}>
                  <th style={{ padding: '8px 12px', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', width: '40px' }}>#</th>
                  <th style={{ padding: '8px 12px', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>CHARGE DESCRIPTION *</th>
                  <th style={{ padding: '8px 12px', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', width: '120px' }}>SAC / HSN</th>
                  <th style={{ padding: '8px 12px', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', width: '120px' }}>CURRENCY</th>
                  <th style={{ padding: '8px 12px', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', width: '180px', textAlign: 'right' }}>
                    AMOUNT *
                  </th>
                  <th style={{ padding: '8px 12px', width: '50px' }}></th>
                </tr>
              </thead>
              <tbody>
                {extraCharges.map((charge, cIdx) => (
                  <tr key={charge.id} style={{ borderBottom: '1px solid var(--color-border)', verticalAlign: 'middle' }}>
                    <td style={{ padding: '8px 12px', fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                      {cIdx + 1}
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <input
                        type="text"
                        value={charge.name}
                        onChange={(e) => handleUpdateCharge(charge.id, 'name', e.target.value)}
                        placeholder="e.g. Insured Shipping, Laboratory Fee"
                        style={{
                          width: '100%',
                          padding: '7px 10px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--color-border)',
                          background: 'var(--color-surface)',
                          color: 'var(--color-text-primary)',
                          fontSize: '13px',
                          fontWeight: 500,
                        }}
                      />
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <input
                        type="text"
                        value={charge.hsn}
                        onChange={(e) => handleUpdateCharge(charge.id, 'hsn', e.target.value)}
                        placeholder="SAC Code"
                        style={{
                          width: '100%',
                          padding: '7px 10px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--color-border)',
                          background: 'var(--color-surface)',
                          color: 'var(--color-text-primary)',
                          fontSize: '13px',
                          textAlign: 'center',
                        }}
                      />
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <select
                        value={charge.currency || watch('transactionCurrency') || 'USD'}
                        onChange={(e) => handleUpdateCharge(charge.id, 'currency', e.target.value as any)}
                        style={{
                          width: '100%',
                          padding: '7px 8px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--color-border)',
                          background: 'var(--color-surface)',
                          color: 'var(--color-text-primary)',
                          fontSize: '12px',
                          fontWeight: 600,
                        }}
                      >
                        <option value="USD">USD ($)</option>
                        <option value="INR">INR (₹)</option>
                      </select>
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '4px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                            {charge.currency === 'USD' ? '$' : '₹'}
                          </span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={charge.amount || ''}
                            onChange={(e) => handleUpdateCharge(charge.id, 'amount', e.target.value)}
                            placeholder="0.00"
                            style={{
                              width: '100%',
                              padding: '7px 10px',
                              borderRadius: 'var(--radius-sm)',
                              border: '1px solid var(--color-border)',
                              background: 'var(--color-surface)',
                              color: 'var(--color-text-primary)',
                              fontSize: '13px',
                              fontWeight: 600,
                              textAlign: 'right',
                            }}
                          />
                        </div>
                        {charge.currency !== watch('transactionCurrency') && (
                          <span style={{ fontSize: '10px', color: 'var(--color-accent)', fontWeight: 500 }}>
                            ≈ {watch('transactionCurrency') === 'USD' ? '$' : '₹'}{getConvertedChargeAmount(charge).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => handleRemoveCharge(charge.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--color-danger, #ef4444)',
                          padding: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        title="Remove Charge"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{
              padding: '16px',
              textAlign: 'center',
              color: 'var(--color-text-secondary)',
              fontSize: '13px',
              border: '1px dashed var(--color-border)',
              borderRadius: 'var(--radius-md)',
              marginBottom: '16px'
            }}>
              No extra charges added yet. Click a quick preset above or add a custom charge below.
            </div>
          )}

          <Button
            type="button"
            variant="secondary"
            onClick={handleAddCustomCharge}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
          >
            <Plus size={14} /> Add Extra Charge
          </Button>
        </div>

        <div style={{ borderTop: '1px solid var(--color-border)', margin: '24px 0' }} />

        {/* SUMMARY & TOTALS */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '40px' }}>
          <div>
            <label style={{ fontSize: 'var(--text-label)', fontWeight: 600, color: 'var(--color-text-primary)', display: 'block', marginBottom: '6px' }}>
              Remarks / Narration
            </label>
            <textarea
              rows={3}
              {...register('narration')}
              style={{
                width: '100%',
                padding: '8px var(--spacing-sm)',
                fontSize: 'var(--text-body)',
                color: 'var(--color-text-primary)',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                outline: 'none',
                fontFamily: 'var(--font-family)',
                resize: 'vertical',
              }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'var(--color-row-alt)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
            
            {(() => {
              const currSymbol = watch('transactionCurrency') === 'USD' ? '$' : '₹';
              return (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                    <span>Total Quantity:</span>
                    <span style={{ fontWeight: 600 }}>{totalQty.toFixed(2)}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                    <span>Total Carats:</span>
                    <span style={{ fontWeight: 600 }}>{totalCrts.toFixed(3)}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px' }}>
                    <span>Gross Amount:</span>
                    <span style={{ fontWeight: 600 }}>{currSymbol}{grossTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>

                  {totalExtraCharges > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--color-primary)' }}>
                      <span>Extra Charges:</span>
                      <span style={{ fontWeight: 600 }}>+{currSymbol}{totalExtraCharges.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}

                  {/* Add % and Less % Fields inside Summary Panel */}
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '13px' }}>Add %</span>
                      <input 
                        type="number" 
                        step="0.01" 
                        {...register('addPct', { valueAsNumber: true })} 
                        style={{ width: '60px', height: '24px', fontSize: '12px', padding: '0 4px', border: '1px solid var(--color-border)', borderRadius: '4px' }} 
                      />
                    </div>
                    <span style={{ fontWeight: 500, fontSize: '13px' }}>+{currSymbol}{calculatedAddValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '13px' }}>Less %</span>
                      <input 
                        type="number" 
                        step="0.01" 
                        {...register('lessPct', { valueAsNumber: true })} 
                        style={{ width: '60px', height: '24px', fontSize: '12px', padding: '0 4px', border: '1px solid var(--color-border)', borderRadius: '4px' }} 
                      />
                    </div>
                    <span style={{ fontWeight: 500, fontSize: '13px', color: 'var(--color-danger)' }}>-{currSymbol}{calculatedLessValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 600, borderBottom: '1px solid var(--color-border)', paddingBottom: '8px' }}>
                    <span>Taxable Value:</span>
                    <span>{currSymbol}{taxableTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>

                  {(() => {
                    // Collect unique GST rates from line items to display in labels
                    const lineGstRates = calcTotals.lines
                      .filter(l => l.taxable > 0)
                      .map(l => {
                        // Reverse-derive the gstPct from the tax amounts
                        if (isSameStateCalc) {
                          return l.taxable > 0 ? round2(((l.cgst + l.sgst) / l.taxable) * 100) : 0;
                        }
                        return l.taxable > 0 ? round2((l.igst / l.taxable) * 100) : 0;
                      });
                    const uniqueRates = [...new Set(lineGstRates.filter(r => r > 0))];
                    const gstLabel = uniqueRates.length === 0 ? '0' : uniqueRates.length === 1 ? `${uniqueRates[0]}` : 'Mixed';
                    const halfLabel = uniqueRates.length === 1 ? `${round2(uniqueRates[0] / 2)}` : gstLabel;

                    return (
                      <>
                        {isSameStateCalc ? (
                          <>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span style={{ fontSize: '13px' }}>CGST ({halfLabel}%)</span>
                              <span style={{ fontWeight: 500, fontSize: '13px' }}>{currSymbol}{cgstTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px' }}>
                              <span style={{ fontSize: '13px' }}>SGST ({halfLabel}%)</span>
                              <span style={{ fontWeight: 500, fontSize: '13px' }}>{currSymbol}{sgstTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                            </div>
                          </>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px' }}>
                            <span style={{ fontSize: '13px' }}>IGST ({gstLabel}%)</span>
                            <span style={{ fontWeight: 500, fontSize: '13px' }}>{currSymbol}{igstTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                          </div>
                        )}
                      </>
                    );
                  })()}

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: 'var(--color-text-secondary)' }}>
                    <span>Round Off:</span>
                    <span>{roundOff >= 0 ? '+' : ''}{currSymbol}{roundOff.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 700, color: 'var(--color-accent)', borderTop: '2px solid var(--color-accent)', paddingTop: '10px' }}>
                    <span>Net Total:</span>
                    <span>{currSymbol}{netTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>

                  {selectedBrokerObj && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '8px', borderTop: '1px dashed var(--color-border)', paddingTop: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Broker:</span>
                        <span style={{ fontWeight: 600 }}>{selectedBrokerObj.accountName}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Brokerage ({watchedBrokeragePct}%):</span>
                        <span>{currSymbol}{brokerageAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
          <Button variant="primary" type="submit" loading={saving} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Save size={16} /> {isEditMode ? 'Update Invoice' : 'Save Invoice'}
          </Button>
        </div>
      </form>
    </div>
  );
};
