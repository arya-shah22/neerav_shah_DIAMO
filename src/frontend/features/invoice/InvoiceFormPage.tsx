// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Invoice Form Page (Sale / Purchase Book)
// ═══════════════════════════════════════════════════════════════

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Save, ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { invoiceSchema, InvoiceFormData } from './invoice.schema';
import { useIpc } from '../../hooks/useIpc';
import { useActiveCompany } from '../../hooks/useActiveCompany';
import { useCompanyStore } from '../../state/company-store';
import { Button, Input, FormSelect, useToast } from '../../components/ui';
import type { IInvoice, InvoiceType } from './invoice.types';

interface FormPageProps {
  type: InvoiceType;
}

interface AccountObj {
  id: number;
  accountName: string;
  isBroker: boolean;
  stateCode: string | null;
}

interface QualityObj {
  id: number;
  qualityName: string;
  gstPct?: number;
}

export const InvoiceFormPage: React.FC<FormPageProps> = ({ type }) => {
  const { id: editId } = useParams<{ id: string }>();
  const isEditMode = !!editId;
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { activeCompany, companyId, isReady } = useActiveCompany();
  const activeFinancialYear = useCompanyStore((s) => s.activeFinancialYear);
  const isSale = type === 'SALE_INVOICE';

  const [parties, setParties] = useState<AccountObj[]>([]);
  const [brokers, setBrokers] = useState<AccountObj[]>([]);
  const [qualities, setQualities] = useState<QualityObj[]>([]);
  const [previewVoucherNo, setPreviewVoucherNo] = useState('');
  const [editLoaded, setEditLoaded] = useState(false);

  const { invoke: fetchAccounts } = useIpc<AccountObj[]>('account:list');
  const { invoke: fetchQualities } = useIpc<QualityObj[]>('quality:list');
  const { invoke: fetchPreviewNo } = useIpc<string>('invoice:preview-number');
  const { invoke: fetchInvoice } = useIpc<IInvoice>('invoice:get');
  const { invoke: createInvoice, loading: savingCreate } = useIpc('invoice:create');
  const { invoke: updateInvoice, loading: savingUpdate } = useIpc('invoice:update');
  const saving = savingCreate || savingUpdate;

  const { register, control, handleSubmit, watch, setValue } = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      financialYearId: activeFinancialYear?.id || 0,
      invoiceType: type,
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
      items: [{ qualityId: undefined as any, hsnNumber: '7113', quantity: 0, carats: 0, pieces: 1, rate: 0, discountPct: 0 }],
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
    loadData();
  }, [companyId, fetchAccounts, fetchQualities, activeFinancialYear, setValue]);

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
            pieces: it.pieces || 1,
            rate: Number(it.rate),
            discountPct: Number(it.discountPct) || 0,
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
      showToast(isEditMode ? 'Invoice updated successfully' : 'Invoice created successfully', 'success');
      navigate(isSale ? '/transactions/sales' : '/transactions/purchases');
    } else {
      showToast(res.error || 'Failed to save invoice', 'error');
    }
  };

  const listRoute = isSale ? '/transactions/sales' : '/transactions/purchases';

  if (!isReady || !activeFinancialYear) {
    return <p style={{ color: 'var(--color-text-secondary)' }}>Select a company and financial year first.</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Button variant="ghost" onClick={() => navigate(listRoute)}><ArrowLeft size={18} /></Button>
        <h1 style={{ fontSize: 'var(--text-title)', fontWeight: 700, color: 'var(--color-primary)' }}>
          {isEditMode ? (isSale ? 'Edit Sales Invoice' : 'Edit Purchase Invoice') : (isSale ? 'New Sales Invoice' : 'New Purchase Invoice')}
        </h1>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '24px' }}
      >
        <h2 style={{ fontSize: 'var(--text-heading)', fontWeight: 600, marginBottom: '16px' }}>Invoice Header</h2>
        
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
            label={isSale ? "Customer *" : "Supplier *"}
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
          <Input label="Invoice Date *" type="date" {...register('invoiceDate')} />
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
              <th style={{ padding: '8px', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', width: '100px' }}>PIECES</th>
              <th style={{ padding: '8px', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', width: '120px' }}>RATE *</th>
              <th style={{ padding: '8px', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', width: '140px', textAlign: 'right' }}>NET AMOUNT</th>
              <th style={{ padding: '8px', width: '50px' }}></th>
            </tr>
          </thead>
          <tbody>
            {fields.map((field, index) => (
              <tr key={field.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: '8px' }}>
                  <FormSelect
                    control={control}
                    name={`items.${index}.qualityId`}
                    options={qualities.map((q) => ({ value: String(q.id), label: q.qualityName }))}
                    toValue={Number}
                  />
                </td>
                <td style={{ padding: '8px' }}>
                  <Input type="number" step="0.01" {...register(`items.${index}.quantity`, { valueAsNumber: true })} />
                </td>
                <td style={{ padding: '8px' }}>
                  <Input type="number" step="0.001" {...register(`items.${index}.carats`, { valueAsNumber: true })} />
                </td>
                <td style={{ padding: '8px' }}>
                  <Input type="number" {...register(`items.${index}.pieces`, { valueAsNumber: true })} />
                </td>
                <td style={{ padding: '8px' }}>
                  <Input type="number" step="0.01" {...register(`items.${index}.rate`, { valueAsNumber: true })} />
                </td>
                <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600, fontSize: '14px' }}>
                  ₹{(itemTotals[index]?.gross || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
                <td style={{ padding: '8px', textAlign: 'center' }}>
                  {fields.length > 1 && (
                    <Button variant="ghost" size="sm" onClick={() => remove(index)}>
                      <Trash2 size={14} color="var(--color-danger)" />
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <Button
          type="button"
          variant="secondary"
          onClick={() => append({ qualityId: undefined as any, hsnNumber: '7113', quantity: 0, carats: 0, pieces: 1, rate: 0, discountPct: 0 })}
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
