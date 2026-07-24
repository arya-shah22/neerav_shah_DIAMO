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
import { useActiveCompany } from '../../hooks/useActiveCompany';
import { useCompanyStore } from '../../state/company-store';
import { Button, Input, Combobox, FormSelect, useToast } from '../../components/ui';
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
}

interface IStockPacket {
  id: number;
  stockIdNumber: string;
  qualityId: number;
  caratWeight: any;
  pieceCount: number;
  costPerCarat?: any;
  currentStatus: string;
}

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
      items: [{ qualityId: undefined as any, hsnNumber: '7113', quantity: 0, carats: 0, pieces: 1, rate: 0, discountPct: 0, isManualStockId: false }],
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
  const watchedCgst = watch('totalCgst') || 0;
  const watchedSgst = watch('totalSgst') || 0;
  const watchedIgst = watch('totalIgst') || 0;

  // Load parties, brokers, and qualities on mount
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

      if (needReference && referenceType) {
        const parentRes = await fetchParentInvoices({ companyId, type: referenceType });
        if (parentRes.success && parentRes.data) {
          setParentInvoices(parentRes.data);
        }
      }
    };
    loadData();
  }, [companyId, fetchAccounts, fetchQualities, fetchPreviewId, activeFinancialYear, setValue, needReference, referenceType, fetchParentInvoices]);

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
      const res = await fetchInvoice({ id: Number(editId), companyId });
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
        setValue('totalCgst', Number(inv.totalCgst) || 0);
        setValue('totalSgst', Number(inv.totalSgst) || 0);
        setValue('totalIgst', Number(inv.totalIgst) || 0);
        setValue('narration', inv.narration || '');
        if (inv.items && inv.items.length > 0) {
          setValue('items', inv.items.map((it) => ({
            qualityId: it.qualityId,
            hsnNumber: it.hsnNumber || '7113',
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
      const dueDays = matched.dueDate ? Math.round((new Date(matched.dueDate).getTime() - new Date(matched.invoiceDate).getTime()) / (24 * 60 * 60 * 1000)) : 0;
      setValue('creditDays', dueDays);
      setValue('narration', `Ref: ${matched.voucherNumber}. `);
      if (matched.items && matched.items.length > 0) {
        setValue('items', matched.items.map((it) => ({
          qualityId: it.qualityId,
          hsnNumber: it.hsnNumber || '7113',
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
  let totalQty = 0;
  let totalCrts = 0;
  let grossTotal = 0;

  const itemTotals = (watchedItems || []).map((it) => {
    const qty = Number(it?.quantity) || 0;
    const carats = Number(it?.carats) || 0;
    const rate = Number(it?.rate) || 0;

    totalQty += qty;
    totalCrts += carats;
    const gross = carats * rate;
    grossTotal += gross;

    return {
      gross,
    };
  });

  const calculatedAddValue = (grossTotal * watchedAddPct) / 100;
  const calculatedLessValue = (grossTotal * watchedLessPct) / 100;
  const taxableTotal = grossTotal + calculatedAddValue - calculatedLessValue;

  let cgstTotal = 0;
  let sgstTotal = 0;
  let igstTotal = 0;

  (watchedItems || []).forEach((it) => {
    const carats = Number(it?.carats) || 0;
    const rate = Number(it?.rate) || 0;
    const itemGross = carats * rate;

    const itemAdd = (itemGross * watchedAddPct) / 100;
    const itemLess = (itemGross * watchedLessPct) / 100;
    const itemTaxable = itemGross + itemAdd - itemLess;

    const qualityObj = qualities.find((q) => q.id === Number(it?.qualityId));
    const gstPct = qualityObj?.gstPct || 0;

    if (activeCompany && selectedPartyObj) {
      const isSameState = activeCompany.stateCode === selectedPartyObj.stateCode;
      if (isSameState) {
        cgstTotal += (itemTaxable * (gstPct / 2)) / 100;
        sgstTotal += (itemTaxable * (gstPct / 2)) / 100;
      } else {
        igstTotal += (itemTaxable * gstPct) / 100;
      }
    }
  });

  // Auto-sync calculated tax values into form fields
  useEffect(() => {
    setValue('totalCgst', Math.round(cgstTotal * 100) / 100);
    setValue('totalSgst', Math.round(sgstTotal * 100) / 100);
    setValue('totalIgst', Math.round(igstTotal * 100) / 100);
  }, [cgstTotal, sgstTotal, igstTotal, setValue]);

  // Use the watched (possibly user-overridden) values for net total
  const taxTotal = watchedCgst + watchedSgst + watchedIgst;
  const rawNet = taxableTotal + taxTotal;
  const netTotal = Math.round(rawNet);
  const roundOff = netTotal - rawNet;
  const brokerageAmount = (taxableTotal * watchedBrokeragePct) / 100;
  const selectedBrokerObj = brokers.find((b) => b.id === Number(watch('brokerId')));

  const onSubmit = async (data: InvoiceFormData) => {
    if (!companyId) return;
    let res;
    if (isEditMode) {
      res = await updateInvoice({ id: Number(editId), companyId, data });
    } else {
      res = await createInvoice({ companyId, data });
    }
    if (res.success) {
      showToast(isEditMode ? 'Transaction updated successfully' : 'Transaction created successfully', 'success');
      navigate(listRoute);
    } else {
      showToast(res.error || 'Failed to save transaction', 'error');
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
        onSubmit={handleSubmit(onSubmit)}
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '24px' }}
      >
        <h2 style={{ fontSize: 'var(--text-heading)', fontWeight: 600, marginBottom: '16px' }}>Header Information</h2>

        {needReference && (
          <div style={{ marginBottom: '20px', background: 'var(--color-row-alt)', padding: '16px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '8px', color: 'var(--color-primary)' }}>
              Link Reference {isCustomer ? 'Sales Invoice' : 'Purchase Invoice'} *
            </label>
            <select
              style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-md)', background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-primary)' }}
              value={watch('referenceInvoiceId') || ''}
              onChange={(e) => handleSelectReference(e.target.value)}
              disabled={isEditMode}
            >
              <option value="">-- Search and Select Parent Invoice --</option>
              {parentInvoices.map((parent) => (
                <option key={parent.id} value={parent.id}>
                  {parent.voucherNumber} ({parent.customer?.accountName}) — Date: {new Date(parent.invoiceDate).toLocaleDateString('en-IN')} — Net: ₹{Number(parent.netAmount).toLocaleString('en-IN')}
                </option>
              ))}
            </select>
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
          />
          <FormSelect
            control={control}
            name="brokerId"
            label="Broker (Reference)"
            placeholder="Select broker"
            options={brokers.map((b) => ({ value: String(b.id), label: b.accountName }))}
            toValue={(v) => (v ? Number(v) : null)}
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
                    </td>
                    <td style={{ padding: '8px', verticalAlign: 'middle' }}>
                      <Input type="number" step="0.01" {...register(`items.${index}.rate`, { valueAsNumber: true })} />
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600, fontSize: '14px', verticalAlign: 'middle' }}>
                      ₹{(itemTotals[index]?.gross || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'center', verticalAlign: 'middle' }}>
                      {fields.length > 1 && (
                        <Button variant="ghost" size="sm" onClick={() => remove(index)}>
                          <Trash2 size={14} color="var(--color-danger)" />
                        </Button>
                      )}
                    </td>
                  </tr>

                  {!isServiceQuality && watchedQualityId && (
                    <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-row-alt)' }}>
                      <td colSpan={7} style={{ padding: '8px 16px 12px 16px' }}>
                        {isSale ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div style={{ flex: 1, maxWidth: '300px' }}>
                              <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px', color: 'var(--color-accent)' }}>
                                Select Stock Packet *
                              </label>
                              <select
                                style={{ width: '100%', padding: '6px 10px', borderRadius: 'var(--radius-sm)', background: 'var(--color-surface)', border: '1px solid var(--color-border)', fontSize: '13px', color: 'var(--color-primary)' }}
                                {...register(`items.${index}.stockPacketId`, { valueAsNumber: true })}
                                onChange={(e) => {
                                  const pktId = Number(e.target.value);
                                  const pkt = availablePackets.find((p) => p.id === pktId);
                                  if (pkt) {
                                    setValue(`items.${index}.carats`, Number(pkt.caratWeight));
                                    setValue(`items.${index}.pieces`, Number(pkt.pieceCount));
                                    if (pkt.costPerCarat != null) {
                                      setValue(`items.${index}.rate`, Number(pkt.costPerCarat));
                                    }
                                  }
                                }}
                              >
                                <option value="">-- Choose Stock Packet --</option>
                                {availablePackets
                                  .filter((p) => p.qualityId === Number(watchedQualityId) && (['AVAILABLE', 'CREATED', 'PURCHASED'].includes(p.currentStatus) || p.id === Number(watch(`items.${index}.stockPacketId`))))
                                  .map((p) => (
                                    <option key={p.id} value={p.id}>
                                      {p.stockIdNumber} ({Number(p.caratWeight).toFixed(3)} CTS — {p.pieceCount} Pcs)
                                    </option>
                                  ))}
                              </select>
                            </div>
                            {(() => {
                              const pktVal = watch(`items.${index}.stockPacketId`);
                              const pkt = availablePackets.find((p) => p.id === Number(pktVal));
                              return pkt ? (
                                <span style={{ fontSize: '12px', color: 'var(--color-success)', fontWeight: 500, marginTop: '16px' }}>
                                  Available: <strong>{Number(pkt.caratWeight).toFixed(3)} CTS</strong> / {pkt.pieceCount} Pcs
                                </span>
                              ) : null;
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
                              <Input label="Length (mm)" type="number" step="0.01" {...register(`items.${index}.lengthMm`, { valueAsNumber: true })} />
                              <Input label="Width (mm)" type="number" step="0.01" {...register(`items.${index}.widthMm`, { valueAsNumber: true })} />
                              <Input label="Depth (mm)" type="number" step="0.01" {...register(`items.${index}.depthMm`, { valueAsNumber: true })} />
                              <Input label="Depth %" type="number" step="0.1" {...register(`items.${index}.totalDepthPct`, { valueAsNumber: true })} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: '12px' }}>
                              <Input label="Table %" type="number" step="0.1" {...register(`items.${index}.tablePct`, { valueAsNumber: true })} />
                              <Input label="Certificate Type" placeholder="e.g. GIA" {...register(`items.${index}.certificateType`)} />
                              <Input label="Certificate Number" placeholder="e.g. 12345" {...register(`items.${index}.certificateNumber`)} />
                              <Input label="Image URL" placeholder="e.g. http://..." {...register(`items.${index}.imageLink`)} />
                              <Input label="Video URL" placeholder="e.g. http://..." {...register(`items.${index}.videoLink`)} />
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
          onClick={() => append({ qualityId: undefined as any, hsnNumber: '7113', quantity: 0, carats: 0, pieces: 1, isPiecesUncounted: false, rate: 0, discountPct: 0, isManualStockId: false })}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '24px' }}
        >
          <Plus size={14} /> Add Row
        </Button>

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
              <span style={{ fontWeight: 600 }}>₹{grossTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>

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
              <span style={{ fontWeight: 500, fontSize: '13px' }}>+₹{calculatedAddValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
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
              <span style={{ fontWeight: 500, fontSize: '13px', color: 'var(--color-danger)' }}>-₹{calculatedLessValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 600, borderBottom: '1px solid var(--color-border)', paddingBottom: '8px' }}>
              <span>Taxable Value:</span>
              <span>₹{taxableTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '13px' }}>CGST</span>
                <input
                  type="number"
                  step="0.01"
                  {...register('totalCgst', { valueAsNumber: true })}
                  style={{ width: '90px', height: '24px', fontSize: '12px', padding: '0 4px', border: '1px solid var(--color-border)', borderRadius: '4px' }}
                />
              </div>
              <span style={{ fontWeight: 500, fontSize: '13px' }}>₹{watchedCgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '13px' }}>SGST</span>
                <input
                  type="number"
                  step="0.01"
                  {...register('totalSgst', { valueAsNumber: true })}
                  style={{ width: '90px', height: '24px', fontSize: '12px', padding: '0 4px', border: '1px solid var(--color-border)', borderRadius: '4px' }}
                />
              </div>
              <span style={{ fontWeight: 500, fontSize: '13px' }}>₹{watchedSgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '13px' }}>IGST</span>
                <input
                  type="number"
                  step="0.01"
                  {...register('totalIgst', { valueAsNumber: true })}
                  style={{ width: '90px', height: '24px', fontSize: '12px', padding: '0 4px', border: '1px solid var(--color-border)', borderRadius: '4px' }}
                />
              </div>
              <span style={{ fontWeight: 500, fontSize: '13px' }}>₹{watchedIgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: 'var(--color-text-secondary)' }}>
              <span>Round Off:</span>
              <span>{roundOff >= 0 ? '+' : ''}₹{roundOff.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 700, color: 'var(--color-accent)', borderTop: '2px solid var(--color-accent)', paddingTop: '10px' }}>
              <span>Net Total:</span>
              <span>₹{netTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>

            {selectedBrokerObj && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '8px', borderTop: '1px dashed var(--color-border)', paddingTop: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Broker:</span>
                  <span style={{ fontWeight: 600 }}>{selectedBrokerObj.accountName}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Brokerage ({watchedBrokeragePct}%):</span>
                  <span>₹{brokerageAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            )}
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
