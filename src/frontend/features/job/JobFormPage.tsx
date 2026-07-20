// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Job Book Form Page (Stage 8 / Phase 7)
// ═══════════════════════════════════════════════════════════════

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { useIpc } from '../../hooks/useIpc';
import { useActiveCompany } from '../../hooks/useActiveCompany';
import { Button, Input, Select, useToast } from '../../components/ui';
import { JobType } from '@prisma/client';
import { IJobVoucher, IJobVoucherItem, JOB_TYPE_LABELS } from './job.types';
import { IAccount } from '../account/account.types';
import { IQuality } from '../quality/quality.types';

import { useCompanyStore } from '../../state/company-store';

interface JobFormPageProps {
  jobType: JobType;
  viewMode?: boolean;
}

export const JobFormPage: React.FC<JobFormPageProps> = ({ jobType, viewMode = false }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { companyId } = useActiveCompany();
  const activeFinancialYear = useCompanyStore((s) => s.activeFinancialYear);

  // IPC Hooks
  const { invoke: createJob } = useIpc('job:create');
  const { invoke: fetchJobDetails } = useIpc<IJobVoucher>('job:get');
  const { invoke: fetchAccounts } = useIpc<IAccount[]>('account:list');
  const { invoke: fetchQualities } = useIpc<IQuality[]>('quality:list');
  const { invoke: fetchPackets } = useIpc<any>('stock:list');
  const { invoke: fetchPreviewNo } = useIpc<string>('job:preview-number');

  // Form States
  const [billNumber, setBillNumber] = useState('');
  const [isManualBillNumber, setIsManualBillNumber] = useState(false);
  const [previewVoucherNo, setPreviewVoucherNo] = useState('');
  const [voucherDate, setVoucherDate] = useState(new Date().toISOString().split('T')[0]);
  const [partyId, setPartyId] = useState<number | null>(null);
  const [narration, setNarration] = useState('');
  
  // Tax Summary States
  const [addPct, setAddPct] = useState(0);
  const [lessPct, setLessPct] = useState(0);
  const [cgstPct, setCgstPct] = useState(0);
  const [sgstPct, setSgstPct] = useState(0);
  const [igstPct, setIgstPct] = useState(0);

  const [items, setItems] = useState<Partial<IJobVoucherItem>[]>([
    { rowNumber: 1, qualityId: 0, carats: 0, pieces: 1, rate: 0, amount: 0, stockPacketId: null, remarks: '' }
  ]);

  // Master Lists States
  const [partiesList, setPartiesList] = useState<IAccount[]>([]);
  const [qualitiesList, setQualitiesList] = useState<IQuality[]>([]);
  const [packetsList, setPacketsList] = useState<any[]>([]);
  const [voucherDetails, setVoucherDetails] = useState<IJobVoucher | null>(null);

  const listRoute = jobType === JobType.JOB_INCOME ? '/transactions/jobs/income' : '/transactions/jobs/expense';

  // Load master data
  useEffect(() => {
    if (!companyId) return;

    const loadMasters = async () => {
      const accs = await fetchAccounts({ companyId });
      if (accs.success) {
        setPartiesList(accs.data || []);
      }
      const qals = await fetchQualities({ companyId });
      if (qals.success) {
        setQualitiesList(qals.data || []);
      }
      const pkts = await fetchPackets({ companyId });
      if (pkts.success && pkts.data) {
        const filtered = (pkts.data.rows || pkts.data || []).filter(
          (p: any) => p.currentStatus === 'AVAILABLE' || p.currentStatus === 'JOB_WORK'
        );
        setPacketsList(filtered);
      }
    };

    loadMasters();
  }, [companyId, fetchAccounts, fetchQualities, fetchPackets]);

  useEffect(() => {
    if (!companyId || id) return;
    if (activeFinancialYear) {
      fetchPreviewNo({ companyId, financialYearId: activeFinancialYear.id, type: jobType }).then((res) => {
        if (res.success && res.data) {
          setPreviewVoucherNo(res.data);
          setBillNumber(res.data);
        }
      });
    }
  }, [companyId, id, jobType, activeFinancialYear, fetchPreviewNo]);

  // Load details if view mode
  useEffect(() => {
    if (!id || !companyId) return;

    const loadDetails = async () => {
      const res = await fetchJobDetails({ id: Number(id), companyId });
      if (res.success && res.data) {
        const doc = res.data;
        setVoucherDetails(doc);
        setBillNumber(doc.billNumber);
        setVoucherDate(new Date(doc.voucherDate).toISOString().split('T')[0]);
        setPartyId(doc.partyId);
        setNarration(doc.narration || '');
        setItems(doc.items.map(it => ({
          id: it.id,
          rowNumber: it.rowNumber,
          qualityId: it.qualityId,
          carats: Number(it.carats),
          pieces: it.pieces,
          rate: Number(it.rate),
          amount: Number(it.amount),
          stockPacketId: it.stockPacketId,
          remarks: it.remarks || '',
          quality: it.quality
        })));
      } else {
        showToast(res.error || 'Failed to load details', 'error');
        navigate(listRoute);
      }
    };

    loadDetails();
  }, [id, companyId, fetchJobDetails, showToast, navigate, listRoute]);

  const handleAddItem = () => {
    setItems([
      ...items,
      { rowNumber: items.length + 1, qualityId: 0, carats: 0, pieces: 1, rate: 0, amount: 0, stockPacketId: null, remarks: '' }
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length === 1) return;
    const updated = items.filter((_, idx) => idx !== index).map((it, idx) => ({ ...it, rowNumber: idx + 1 }));
    setItems(updated);
  };

  const handlePacketChange = (index: number, packetIdStr: string | undefined) => {
    const updated = [...items];
    if (!packetIdStr) {
      updated[index].stockPacketId = null;
      setItems(updated);
      return;
    }

    const packetId = Number(packetIdStr);
    updated[index].stockPacketId = packetId;

    const packet = packetsList.find((p: any) => p.id === packetId);
    if (packet) {
      updated[index].carats = Number(packet.caratWeight) || 0;
      updated[index].pieces = packet.pieceCount || 1;
      updated[index].qualityId = packet.qualityId;
      updated[index].amount = (updated[index].carats || 0) * (updated[index].rate || 0);
    }
    setItems(updated);
  };

  const handleItemChange = (index: number, key: keyof IJobVoucherItem, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [key]: value };

    // Calculate amount
    if (key === 'carats' || key === 'rate') {
      const carats = Number(updated[index].carats) || 0;
      const rate = Number(updated[index].rate) || 0;
      updated[index].amount = carats * rate;
    }

    setItems(updated);
  };

  // Tax and Total Calculations
  const totalCarats = items.reduce((sum, it) => sum + (Number(it.carats) || 0), 0);
  const totalPieces = items.reduce((sum, it) => sum + (Number(it.pieces) || 0), 0);
  const grossAmount = items.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);

  const addAmount = grossAmount * (addPct / 100);
  const lessAmount = grossAmount * (lessPct / 100);
  const taxableValue = grossAmount + addAmount - lessAmount;

  const cgstAmount = taxableValue * (cgstPct / 100);
  const sgstAmount = taxableValue * (sgstPct / 100);
  const igstAmount = taxableValue * (igstPct / 100);

  const subTotal = taxableValue + cgstAmount + sgstAmount + igstAmount;
  const netTotal = Math.round(subTotal);
  const roundOff = netTotal - subTotal;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) return;

    if (!partyId) {
      showToast('Please select a party account', 'error');
      return;
    }

    // Validate items
    for (const it of items) {
      if (!it.qualityId || it.qualityId === 0) {
        showToast('Please select a quality grade for all lines', 'error');
        return;
      }
      if (!it.carats || it.carats <= 0) {
        showToast('Carats must be greater than zero', 'error');
        return;
      }
    }

    const payload = {
      financialYearId: activeFinancialYear?.id,
      jobType,
      partyId,
      isManualBillNumber,
      billNumber: isManualBillNumber ? billNumber : previewVoucherNo,
      voucherDate,
      narration,
      totalCarats,
      totalAmount: netTotal,
      items: items.map(it => ({
        qualityId: it.qualityId,
        carats: it.carats,
        pieces: it.pieces,
        rate: it.rate,
        stockPacketId: it.stockPacketId,
        remarks: it.remarks,
      }))
    };

    const res = await createJob({ companyId, data: payload });
    if (res.success) {
      showToast('Job voucher created successfully', 'success');
      navigate(listRoute);
    } else {
      showToast(res.error || 'Failed to save voucher', 'error');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
      {/* Header Panel */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Button variant="ghost" onClick={() => navigate(listRoute)}>
            <ArrowLeft size={18} />
          </Button>
          <div>
            <h1 style={{ fontSize: 'var(--text-title)', fontWeight: 700, color: 'var(--color-primary)' }}>
              {viewMode ? 'View' : 'New'} {JOB_TYPE_LABELS[jobType]}
            </h1>
            {viewMode && voucherDetails && (
              <p style={{ color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                Voucher Number: <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{voucherDetails.voucherNumber}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Form Inputs Header Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          background: 'var(--color-surface)',
          padding: '20px',
          borderRadius: '12px',
          border: '1px solid var(--color-border)',
        }}>
          {/* Bill Number Config Row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', gridColumn: 'span 2', background: 'var(--color-row-alt)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
              <input type="checkbox" checked={isManualBillNumber} onChange={(e) => setIsManualBillNumber(e.target.checked)} disabled={viewMode} />
              Enter bill number manually
            </label>
            <div style={{ flex: 1, maxWidth: '300px' }}>
              <Input 
                placeholder={previewVoucherNo || "Auto-Generated sequential number"} 
                disabled={!isManualBillNumber || viewMode} 
                value={billNumber}
                onChange={(e) => setBillNumber(e.target.value)}
              />
            </div>
          </div>

          <Input
            label="Voucher Date *"
            type="date"
            value={voucherDate}
            onChange={(e) => setVoucherDate(e.target.value)}
            disabled={viewMode}
          />

          <Select
            label={jobType === JobType.JOB_INCOME ? 'Customer Account *' : 'Polisher / Vendor Account *'}
            value={partyId ? String(partyId) : ''}
            onChange={(val) => setPartyId(Number(val) || null)}
            options={partiesList.map(p => ({ value: String(p.id), label: p.accountName }))}
            placeholder="Select party"
            disabled={viewMode}
          />
        </div>

        {/* Itemized Cost Capitalization Table Grid */}
        <div style={{
          background: 'var(--color-surface)',
          borderRadius: '12px',
          border: '1px solid var(--color-border)',
          overflow: 'hidden',
        }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Processed Diamonds Grid</h3>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-label)' }}>
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--color-border)', textAlign: 'left' }}>
                <th style={{ padding: '12px 10px', width: '50px' }}>#</th>
                <th style={{ padding: '12px 10px', width: '220px' }}>Stock Packet (Hold / Work)</th>
                <th style={{ padding: '12px 10px', width: '220px' }}>Quality Grade *</th>
                <th style={{ padding: '12px 10px', width: '100px' }}>Carats *</th>
                <th style={{ padding: '12px 10px', width: '80px' }}>Pieces</th>
                <th style={{ padding: '12px 10px', width: '120px' }}>Labour Rate</th>
                <th style={{ padding: '12px 10px', width: '120px' }}>Total Amount</th>
                <th style={{ padding: '12px 10px' }}>Remarks</th>
                {!viewMode && <th style={{ padding: '12px 10px', width: '50px' }}></th>}
              </tr>
            </thead>
            <tbody>
              {items.map((row, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '10px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>{idx + 1}</td>
                  
                  {/* Stock Packet Selector */}
                  <td style={{ padding: '6px 10px' }}>
                    {viewMode ? (
                      <span style={{ fontWeight: 600 }}>{row.stockPacketId ? `PKT #${row.stockPacketId}` : '—'}</span>
                    ) : (
                      <Select
                        value={row.stockPacketId ? String(row.stockPacketId) : ''}
                        onChange={(val) => handlePacketChange(idx, val)}
                        options={packetsList.map(p => ({ value: String(p.id), label: `${p.stockIdNumber} (${p.currentStatus})` }))}
                        placeholder="Select Packet ID"
                        clearable
                      />
                    )}
                  </td>

                  {/* Quality Select */}
                  <td style={{ padding: '6px 10px' }}>
                    {viewMode ? (
                      <span>{row.quality?.qualityName || '—'}</span>
                    ) : (
                      <Select
                        value={row.qualityId ? String(row.qualityId) : ''}
                        onChange={(val) => handleItemChange(idx, 'qualityId', Number(val))}
                        options={qualitiesList.map(q => ({ value: String(q.id), label: q.qualityName }))}
                        placeholder="Select Quality"
                      />
                    )}
                  </td>

                  {/* Carats */}
                  <td style={{ padding: '6px 10px' }}>
                    <Input
                      type="number"
                      value={row.carats || ''}
                      onChange={(e) => handleItemChange(idx, 'carats', Number(e.target.value))}
                      disabled={viewMode}
                    />
                  </td>

                  {/* Pieces */}
                  <td style={{ padding: '6px 10px' }}>
                    <Input
                      type="number"
                      value={row.pieces || ''}
                      onChange={(e) => handleItemChange(idx, 'pieces', Number(e.target.value))}
                      disabled={viewMode}
                    />
                  </td>

                  {/* Rate */}
                  <td style={{ padding: '6px 10px' }}>
                    <Input
                      type="number"
                      value={row.rate || ''}
                      onChange={(e) => handleItemChange(idx, 'rate', Number(e.target.value))}
                      disabled={viewMode}
                    />
                  </td>

                  {/* Amount (read-only) */}
                  <td style={{ padding: '10px', fontWeight: 600 }}>
                    ₹ {Number(row.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>

                  {/* Remarks */}
                  <td style={{ padding: '6px 10px' }}>
                    <Input
                      value={row.remarks || ''}
                      onChange={(e) => handleItemChange(idx, 'remarks', e.target.value)}
                      disabled={viewMode}
                    />
                  </td>

                  {/* Actions (Delete Line) */}
                  {!viewMode && (
                    <td style={{ padding: '10px', textAlign: 'center' }}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveItem(idx)}
                        disabled={items.length === 1}
                      >
                        <Trash2 size={14} color="var(--color-danger)" />
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          {!viewMode && (
            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--color-border)' }}>
              <Button variant="secondary" onClick={handleAddItem} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Plus size={14} /> Add Line Item
              </Button>
            </div>
          )}
        </div>

        {/* Dynamic Calculations and Summary Panels Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr',
          gap: '20px',
          alignItems: 'start',
        }}>
          {/* Left panel: Narration */}
          <div style={{
            background: 'var(--color-surface)',
            padding: '20px',
            borderRadius: '12px',
            border: '1px solid var(--color-border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Additional Details</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: 'var(--text-label)', fontWeight: 600 }}>Narration</label>
              <textarea
                value={narration}
                onChange={(e) => setNarration(e.target.value)}
                disabled={viewMode}
                rows={4}
                placeholder="Add general remarks or process specifications..."
                style={{
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid var(--color-border)',
                  background: 'transparent',
                  fontSize: '13px',
                  resize: 'vertical',
                }}
              />
            </div>
          </div>

          {/* Right panel: Premium Tax Summary Card */}
          <div style={{
            background: 'var(--color-surface)',
            padding: '20px',
            borderRadius: '12px',
            border: '1px solid var(--color-border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            fontSize: '13px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Total Quantity:</span>
              <span style={{ fontWeight: 600 }}>{totalPieces.toFixed(2)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Total Carats:</span>
              <span style={{ fontWeight: 600 }}>{totalCarats.toFixed(3)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px' }}>
              <span style={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Gross Amount:</span>
              <span style={{ fontWeight: 700 }}>₹{grossAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>

            {/* Surcharges & Discounts */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Add %:</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="number"
                  value={addPct || ''}
                  onChange={(e) => setAddPct(Number(e.target.value))}
                  disabled={viewMode}
                  style={{ width: '60px', padding: '4px', borderRadius: '4px', border: '1px solid var(--color-border)', textAlign: 'right' }}
                />
                <span style={{ width: '80px', textAlign: 'right' }}>+₹{addAmount.toFixed(2)}</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Less %:</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="number"
                  value={lessPct || ''}
                  onChange={(e) => setLessPct(Number(e.target.value))}
                  disabled={viewMode}
                  style={{ width: '60px', padding: '4px', borderRadius: '4px', border: '1px solid var(--color-border)', textAlign: 'right' }}
                />
                <span style={{ width: '80px', textAlign: 'right', color: 'red' }}>-₹{lessAmount.toFixed(2)}</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, borderBottom: '1px solid var(--color-border)', paddingBottom: '8px' }}>
              <span>Taxable Value:</span>
              <span>₹{taxableValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>

            {/* Taxes */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>CGST %:</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="number"
                  value={cgstPct || ''}
                  onChange={(e) => setCgstPct(Number(e.target.value))}
                  disabled={viewMode}
                  style={{ width: '60px', padding: '4px', borderRadius: '4px', border: '1px solid var(--color-border)', textAlign: 'right' }}
                />
                <span style={{ width: '80px', textAlign: 'right' }}>₹{cgstAmount.toFixed(2)}</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>SGST %:</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="number"
                  value={sgstPct || ''}
                  onChange={(e) => setSgstPct(Number(e.target.value))}
                  disabled={viewMode}
                  style={{ width: '60px', padding: '4px', borderRadius: '4px', border: '1px solid var(--color-border)', textAlign: 'right' }}
                />
                <span style={{ width: '80px', textAlign: 'right' }}>₹{sgstAmount.toFixed(2)}</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>IGST %:</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="number"
                  value={igstPct || ''}
                  onChange={(e) => setIgstPct(Number(e.target.value))}
                  disabled={viewMode}
                  style={{ width: '60px', padding: '4px', borderRadius: '4px', border: '1px solid var(--color-border)', textAlign: 'right' }}
                />
                <span style={{ width: '80px', textAlign: 'right' }}>₹{igstAmount.toFixed(2)}</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px', color: 'var(--color-text-secondary)' }}>
              <span>Round Off:</span>
              <span>{roundOff >= 0 ? '+' : ''}₹{roundOff.toFixed(2)}</span>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontWeight: 700,
              fontSize: '15px',
              color: 'var(--color-accent)',
              paddingTop: '6px',
            }}>
              <span>Net Total:</span>
              <span>₹{netTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        {!viewMode && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <Button variant="secondary" onClick={() => navigate(listRoute)}>Cancel</Button>
            <Button variant="primary" type="submit">Save Voucher</Button>
          </div>
        )}
      </form>
    </div>
  );
};
