// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Challan Form Page (Stage 6)
// ═══════════════════════════════════════════════════════════════

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, ArrowLeft, Plus, Trash2, Printer } from 'lucide-react';
import { useIpc } from '../../hooks/useIpc';
import { useActiveCompany } from '../../hooks/useActiveCompany';
import { useCompanyStore } from '../../state/company-store';
import { Button, Input, Select, Badge, useToast } from '../../components/ui';
import { ChallanPurpose, ChallanStatus, CHALLAN_PURPOSE_LABELS, IChallanItem, CHALLAN_STATUS_LABELS, CHALLAN_STATUS_BADGE_VARIANT } from './challan.types';

interface FormPageProps {
  purpose: ChallanPurpose;
  viewMode?: boolean;
}

interface AccountObj {
  id: number;
  accountName: string;
  isBroker: boolean;
  city: string | null;
  mobile: string | null;
  gstinNumber: string | null;
}

interface QualityObj {
  id: number;
  qualityName: string;
  isService?: boolean;
}

interface StockPacketObj {
  id: number;
  stockIdNumber: string;
  caratWeight: number;
  pieceCount: number;
  costPerCarat: number;
  qualityId: number;
  currentStatus: string;
}

export const ChallanFormPage: React.FC<FormPageProps> = ({ purpose, viewMode = false }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { companyId, activeCompany } = useActiveCompany();
  const activeFinancialYear = useCompanyStore((s) => s.activeFinancialYear);

  const [parties, setParties] = useState<AccountObj[]>([]);
  const [qualities, setQualities] = useState<QualityObj[]>([]);
  const [availablePackets, setAvailablePackets] = useState<StockPacketObj[]>([]);
  const [previewVoucherNo, setPreviewVoucherNo] = useState('');
  const [loadingChallan, setLoadingChallan] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [challanStatus, setChallanStatus] = useState<string>('ISSUED');
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [targetStatus, setTargetStatus] = useState<string>('');
  const [returnItems, setReturnItems] = useState<{ id: number; rowNumber: number; qualityName: string; carats: number; pieces: number; returnedCarats: number; returnedPieces: number }[]>([]);

  // Form states
  const [challanDate, setChallanDate] = useState(new Date().toISOString().split('T')[0]);
  const [partyId, setPartyId] = useState<string>('');
  const [mobile, setMobile] = useState('');
  const [city, setCity] = useState('');
  const [gstin, setGstin] = useState('');
  const [expectedReturnDate, setExpectedReturnDate] = useState('');
  const [narration, setNarration] = useState('');
  const [challanNumber, setChallanNumber] = useState('');
  const [isManualBillNumber, setIsManualBillNumber] = useState(false);

  // Items grid
  const [items, setItems] = useState<Partial<IChallanItem>[]>([
    { rowNumber: 1, qualityId: 0, carats: 0, pieces: 1, rate: 0, amount: 0, stockPacketId: null, remarks: '' }
  ]);

  const { invoke: fetchAccounts } = useIpc<AccountObj[]>('account:list');
  const { invoke: fetchQualities } = useIpc<QualityObj[]>('quality:list');
  const { invoke: fetchStockPackets } = useIpc<StockPacketObj[]>('stock:list');
  const { invoke: fetchPreviewNo } = useIpc<string>('challan:preview-number');
  const { invoke: fetchChallan } = useIpc<any>('challan:get');
  const { invoke: createChallan } = useIpc('challan:create');
  const { invoke: updateChallan } = useIpc('challan:update');
  const { invoke: updateChallanStatus } = useIpc('challan:update-status');

  const listRoute = purpose === 'TRADING_JHANGHAD'
    ? '/transactions/challans/trading'
    : purpose === 'JOB_WORK'
      ? '/transactions/challans/job-work'
      : purpose === 'SALE_ORDER'
        ? '/transactions/orders/sales'
        : '/transactions/orders/purchases';

  // Load dependency masters
  useEffect(() => {
    if (!companyId) return;
    fetchAccounts({ companyId }).then((res) => {
      if (res.success && res.data) setParties(res.data);
    });
    fetchQualities({ companyId }).then((res) => {
      // Filter out service qualities for issues, keep for orders
      if (res.success && res.data) {
        setQualities(purpose === 'TRADING_JHANGHAD' || purpose === 'JOB_WORK' 
          ? res.data.filter(q => !q.isService) 
          : res.data
        );
      }
    });
    fetchStockPackets({ companyId }).then((res) => {
      if (res.success && res.data) {
        // Show AVAILABLE packets, plus packets currently on this challan if editing
        setAvailablePackets(res.data.filter(p => p.currentStatus === 'AVAILABLE'));
      }
    });

    if (!id && activeFinancialYear) {
      fetchPreviewNo({ companyId, financialYearId: activeFinancialYear.id, purpose }).then((res) => {
        if (res.success && res.data) {
          setPreviewVoucherNo(res.data);
          setChallanNumber(res.data);
        }
      });
    }
  }, [companyId, id, purpose, activeFinancialYear, fetchAccounts, fetchQualities, fetchStockPackets, fetchPreviewNo]);

  // Load existing challan details for edit or view mode
  useEffect(() => {
    if (!id || !companyId) return;
    setLoadingChallan(true);
    fetchChallan({ id: Number(id), companyId }).then((res) => {
      setLoadingChallan(false);
      if (res.success && res.data) {
        const c = res.data;
        setPreviewVoucherNo(c.voucherNumber);
        setChallanNumber(c.challanNumber);
        setChallanDate(new Date(c.challanDate).toISOString().split('T')[0]);
        setPartyId(String(c.partyId));
        setMobile(c.party?.mobile || '');
        setCity(c.party?.city || '');
        setGstin(c.party?.gstinNumber || '');
        setExpectedReturnDate(c.expectedReturnDate ? new Date(c.expectedReturnDate).toISOString().split('T')[0] : '');
        setNarration(c.narration || '');
        setChallanStatus(c.status);

        // If editing, append this challan's stock packets to available packets list so they don't disappear from the selector
        const usedPackets = c.items
          .filter((it: any) => it.stockPacketId)
          .map((it: any) => ({
            id: it.stockPacketId,
            stockIdNumber: it.stockPacketIdNumber || `Packet #${it.stockPacketId}`,
            caratWeight: Number(it.carats),
            pieceCount: it.pieces,
            costPerCarat: Number(it.rate),
            qualityId: it.qualityId,
            currentStatus: 'AVAILABLE'
          }));
        if (usedPackets.length > 0) {
          setAvailablePackets(prev => [...prev, ...usedPackets]);
        }

        setItems(c.items.map((it: any) => ({
          id: it.id,
          rowNumber: it.rowNumber,
          qualityId: it.qualityId,
          carats: Number(it.carats),
          pieces: it.pieces,
          rate: Number(it.rate),
          amount: Number(it.amount),
          stockPacketId: it.stockPacketId || null,
          remarks: it.remarks || ''
        })));
      } else {
        showToast(res.error || 'Failed to load challan', 'error');
      }
    });
  }, [id, companyId, fetchChallan, showToast]);

  // Handle party auto-fill
  const handlePartyChange = (value: string) => {
    setPartyId(value);
    const selected = parties.find(p => p.id === Number(value));
    if (selected) {
      setMobile(selected.mobile || '');
      setCity(selected.city || '');
      setGstin(selected.gstinNumber || '');
    } else {
      setMobile('');
      setCity('');
      setGstin('');
    }
  };

  // Add/Remove grid row
  const addRow = () => {
    setItems(prev => [
      ...prev,
      { rowNumber: prev.length + 1, qualityId: 0, carats: 0, pieces: 1, rate: 0, amount: 0, stockPacketId: null, remarks: '' }
    ]);
  };

  const removeRow = (index: number) => {
    if (items.length === 1) return;
    const updated = items.filter((_, i) => i !== index).map((row, i) => ({
      ...row,
      rowNumber: i + 1
    }));
    setItems(updated);
  };

  // Handle row changes
  const handleRowChange = (index: number, field: keyof IChallanItem, value: any) => {
    const updated = [...items];
    const row = { ...updated[index] };

    if (field === 'stockPacketId') {
      const pktId = value ? Number(value) : null;
      row.stockPacketId = pktId;
      if (pktId) {
        const pkt = availablePackets.find(p => p.id === pktId);
        if (pkt) {
          row.qualityId = pkt.qualityId;
          row.carats = pkt.caratWeight;
          row.pieces = pkt.pieceCount;
          row.rate = pkt.costPerCarat;
          row.amount = pkt.caratWeight * pkt.costPerCarat;
        }
      }
    } else {
      row[field] = value as never;
      if (field === 'carats' || field === 'rate') {
        const carats = field === 'carats' ? Number(value) : (row.carats || 0);
        const rate = field === 'rate' ? Number(value) : (row.rate || 0);
        row.amount = carats * rate;
      }
    }

    updated[index] = row;
    setItems(updated);
  };

  const calculateTotals = () => {
    let carats = 0;
    let pieces = 0;
    let amount = 0;
    items.forEach(row => {
      carats += Number(row.carats) || 0;
      pieces += Number(row.pieces) || 0;
      amount += Number(row.amount) || 0;
    });
    return { carats, pieces, amount };
  };

  const { carats: totalCarats, pieces: totalPieces, amount: totalAmount } = calculateTotals();

  const handleSave = async () => {
    if (!companyId || !activeFinancialYear) return;
    if (!partyId) {
      showToast('Please select a target party (To)', 'error');
      return;
    }

    const invalidRow = items.find(it => !it.qualityId || !it.carats || it.carats <= 0);
    if (invalidRow) {
      showToast('Please ensure all items have selected qualities and carats greater than 0', 'error');
      return;
    }

    const payload = {
      companyId,
      financialYearId: activeFinancialYear?.id,
      purpose,
      partyId: Number(partyId),
      partyName: parties.find(p => p.id === Number(partyId))?.accountName || '',
      challanDate,
      expectedReturnDate: expectedReturnDate || null,
      narration,
      isManualBillNumber,
      challanNumber: isManualBillNumber ? challanNumber : previewVoucherNo,
      billNumber: isManualBillNumber ? challanNumber : previewVoucherNo,
      mobile: mobile || null,
      city: city || null,
      gstin: gstin || null,
      items: items.map(it => ({
        qualityId: Number(it.qualityId),
        carats: Number(it.carats),
        pieces: Number(it.pieces) || 1,
        rate: Number(it.rate) || 0,
        stockPacketId: it.stockPacketId ? Number(it.stockPacketId) : null,
        remarks: it.remarks || ''
      }))
    };

    const res = id
      ? await updateChallan({ id: Number(id), companyId, data: payload })
      : await createChallan({ companyId, financialYearId: activeFinancialYear.id, data: payload });

    if (res.success) {
      showToast(id ? 'Challan updated successfully' : 'Challan created successfully', 'success');
      navigate(listRoute);
    } else {
      showToast(res.error || 'Failed to save challan', 'error');
    }
  };

  const executeStatusUpdate = async (status: string, partialItems?: typeof returnItems) => {
    if (!companyId || !id) return;
    const res = await updateChallanStatus({
      id: Number(id),
      companyId,
      status,
      items: partialItems ? partialItems.map(it => ({
        id: it.id,
        returnedCarats: Number(it.returnedCarats) || 0,
        returnedPieces: Number(it.returnedPieces) || 0
      })) : undefined
    });
    if (res.success) {
      showToast(`Challan status updated to ${CHALLAN_STATUS_LABELS[status as ChallanStatus]}`, 'success');
      setChallanStatus(status);
      setShowStatusModal(false);
      // Reload details
      fetchChallan({ id: Number(id), companyId }).then((res2: any) => {
        if (res2.success && res2.data) {
          setItems(res2.data.items.map((it: any) => ({
            id: it.id,
            rowNumber: it.rowNumber,
            qualityId: it.qualityId,
            carats: Number(it.carats),
            pieces: it.pieces,
            rate: Number(it.rate),
            amount: Number(it.amount),
            stockPacketId: it.stockPacketId || null,
            remarks: it.remarks || '',
            returnedCarats: Number(it.returnedCarats) || 0,
            returnedPieces: Number(it.returnedPieces) || 0
          })));
        }
      });
    } else {
      showToast(res.error || 'Failed to update status', 'error');
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!newStatus || newStatus === challanStatus) return;
    setTargetStatus(newStatus);

    if (newStatus === 'PARTIALLY_RETURNED') {
      const itemsToReturn = items.map(it => ({
        id: it.id || 0,
        rowNumber: it.rowNumber || 1,
        qualityName: qualities.find(q => q.id === Number(it.qualityId))?.qualityName || '—',
        carats: Number(it.carats) || 0,
        pieces: Number(it.pieces) || 1,
        returnedCarats: Number(it.returnedCarats) || 0,
        returnedPieces: Number(it.returnedPieces) || 0,
      }));
      setReturnItems(itemsToReturn);
      setShowStatusModal(true);
    } else if (newStatus === 'RETURNED') {
      if (confirm('Mark this challan as completely returned? All items will be marked fully returned, and reserved stock packets will become AVAILABLE.')) {
        await executeStatusUpdate(newStatus);
      }
    } else {
      if (confirm(`Change status to ${CHALLAN_STATUS_LABELS[newStatus as ChallanStatus]}?`)) {
        await executeStatusUpdate(newStatus);
      }
    }
  };

  const triggerDirectPrint = () => {
    setShowPrintModal(false);
    window.print();
  };

  if (loadingChallan) {
    return <p style={{ color: 'var(--color-text-secondary)' }}>Loading details...</p>;
  }

  // ─── Render Print Layout side-by-side landscape ───
  if (showPrintPreview && activeCompany) {
    const selectedParty = parties.find(p => p.id === Number(partyId));
    const challanTitle = CHALLAN_PURPOSE_LABELS[purpose].toUpperCase();

    const renderSingleChallanCopy = (copyType: 'OFFICE COPY' | 'CLIENT COPY') => (
      <div style={{
        width: '48%',
        padding: '16px',
        border: '1px solid #1e293b',
        borderRadius: '8px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        fontSize: '11px',
        color: '#1e293b',
        background: '#ffffff',
        boxSizing: 'border-box',
        minHeight: '420px',
      }}>
        {/* Header */}
        <div style={{ borderBottom: '1px solid #94a3b8', paddingBottom: '6px', marginBottom: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: 800, margin: 0, textTransform: 'uppercase', color: '#0f172a' }}>
                {activeCompany.companyName}
              </h3>
              <p style={{ margin: '2px 0 0', color: '#475569', fontSize: '9px' }}>
                {activeCompany.addressLine1} {activeCompany.addressLine2 && `, ${activeCompany.addressLine2}`}
                <br />
                {activeCompany.city} - {activeCompany.pincode}
                {activeCompany.mobile && ` · Mob: ${activeCompany.mobile}`}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '8px', padding: '2px 4px', border: '1px solid #94a3b8', borderRadius: '4px', fontWeight: 600, color: '#475569' }}>
                {copyType}
              </span>
              <h4 style={{ fontSize: '11px', fontWeight: 800, margin: '4px 0 0', color: '#3b82f6' }}>
                {challanTitle}
              </h4>
            </div>
          </div>
        </div>

        {/* Party and Date Info */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '8px', marginBottom: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
          <div>
            <span style={{ color: '#64748b', fontWeight: 600, textTransform: 'uppercase', fontSize: '8px' }}>TO (CLIENT):</span>
            <div style={{ fontWeight: 700, fontSize: '11px', marginTop: '2px', color: '#0f172a' }}>{selectedParty?.accountName || '—'}</div>
            {city && <div style={{ color: '#475569', marginTop: '1px' }}>City: {city}</div>}
            {mobile && <div style={{ color: '#475569' }}>Mobile: {mobile}</div>}
            {gstin && <div style={{ color: '#475569' }}>GSTIN: {gstin}</div>}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div><strong style={{ color: '#64748b', fontSize: '9px' }}>VOUCHER NO:</strong> <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{challanNumber || previewVoucherNo}</span></div>
            <div style={{ marginTop: '2px' }}><strong style={{ color: '#64748b', fontSize: '9px' }}>DATE:</strong> {new Date(challanDate).toLocaleDateString('en-IN')}</div>
            {expectedReturnDate && (
              <div style={{ marginTop: '2px', color: '#ef4444' }}><strong style={{ fontSize: '9px' }}>VALID UPTO:</strong> {new Date(expectedReturnDate).toLocaleDateString('en-IN')}</div>
            )}
          </div>
        </div>

        {/* Item Table Grid */}
        <div style={{ flex: 1, marginBottom: '8px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #475569' }}>
                <th style={{ textAlign: 'left', padding: '4px', fontWeight: 700 }}>Description of Goods</th>
                <th style={{ textAlign: 'right', padding: '4px', fontWeight: 700, width: '70px' }}>Carats</th>
                <th style={{ textAlign: 'right', padding: '4px', fontWeight: 700, width: '80px' }}>Price / Carat</th>
                <th style={{ textAlign: 'right', padding: '4px', fontWeight: 700, width: '90px' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row, idx) => {
                const qName = qualities.find(q => q.id === Number(row.qualityId))?.qualityName || '—';
                return (
                  <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '4px 2px' }}>
                      {qName} {row.stockPacketId ? `(Pkt: ${availablePackets.find(p => p.id === row.stockPacketId)?.stockIdNumber})` : ''}
                    </td>
                    <td style={{ textAlign: 'right', padding: '4px' }}>{Number(row.carats).toFixed(3)}</td>
                    <td style={{ textAlign: 'right', padding: '4px' }}>₹ {Number(row.rate).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td style={{ textAlign: 'right', padding: '4px', fontWeight: 600 }}>₹ {Number(row.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                );
              })}
              {/* Summary Row */}
              <tr style={{ borderTop: '1.5px solid #475569', fontWeight: 700, background: '#f8fafc' }}>
                <td style={{ padding: '6px 4px', textTransform: 'uppercase' }}>TOTAL</td>
                <td style={{ textAlign: 'right', padding: '6px 4px' }}>{totalCarats.toFixed(3)}</td>
                <td style={{ padding: '6px 4px' }}></td>
                <td style={{ textAlign: 'right', padding: '6px 4px', color: '#0f172a' }}>
                  ₹ {totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer section (T&C and Signatures) */}
        <div>
          {narration && (
            <div style={{ fontSize: '8px', color: '#64748b', marginBottom: '8px', padding: '4px', border: '1px dashed #cbd5e1', borderRadius: '4px' }}>
              <strong>Remarks:</strong> {narration}
            </div>
          )}
          <div style={{ fontSize: '8px', color: '#64748b', lineHeight: '1.3', marginBottom: '16px', borderTop: '1px solid #e2e8f0', paddingTop: '4px' }}>
            <strong>Terms & Conditions:</strong> Goods received on approval memo (Jhanghad) are held at your risk against loss/damage. Please return within validity.
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 8px', marginTop: '12px' }}>
            <div style={{ textAlign: 'center', borderTop: '1px solid #475569', width: '90px', paddingTop: '4px', fontSize: '9px', fontWeight: 600 }}>
              Receiver Sign
            </div>
            <div style={{ textAlign: 'center', borderTop: '1px solid #475569', width: '110px', paddingTop: '4px', fontSize: '9px', fontWeight: 600 }}>
              Authorised Sign
            </div>
          </div>
        </div>
      </div>
    );

    return (
      <div id="print-preview-root" style={{ background: '#ffffff', minHeight: '100vh', padding: '20px', boxSizing: 'border-box' }}>
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            @page { size: A4 landscape; margin: 10mm; }
            body { background: #ffffff !important; padding: 0 !important; margin: 0 !important; }
            .no-print { display: none !important; }
            #print-preview-root {
              background: transparent !important;
              padding: 0 !important;
              margin: 0 !important;
              min-height: auto !important;
            }
            .print-page {
              padding: 0 !important;
              border: none !important;
              margin: 0 !important;
              width: 100% !important;
              min-height: auto !important;
              height: auto !important;
              background: transparent !important;
              border-radius: 0 !important;
              box-shadow: none !important;
            }
          }
        `}} />
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', padding: '10px', background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
          <Button variant="ghost" onClick={() => setShowPrintPreview(false)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ArrowLeft size={16} /> Back to Entry
          </Button>
          <Button variant="primary" onClick={triggerDirectPrint} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Printer size={16} /> Print / Save PDF
          </Button>
        </div>

        {/* Printable Side-by-Side Landscape Container */}
        <div id="print-area" className="print-page" style={{
          display: 'flex',
          justifyContent: 'space-between',
          width: '100%',
          maxWidth: '297mm', // A4 Landscape width
          margin: '0 auto',
          boxSizing: 'border-box',
          background: '#ffffff',
        }}>
          {renderSingleChallanCopy('OFFICE COPY')}
          {renderSingleChallanCopy('CLIENT COPY')}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Button variant="ghost" onClick={() => navigate(listRoute)}>
            <ArrowLeft size={18} />
          </Button>
          <div>
            <h1 style={{ fontSize: 'var(--text-title)', fontWeight: 700, color: 'var(--color-primary)' }}>
              {viewMode ? 'View' : id ? 'Edit' : 'New'} {CHALLAN_PURPOSE_LABELS[purpose]}
            </h1>
            <p style={{ color: 'var(--color-text-secondary)', marginTop: '2px' }}>
              Voucher Number: <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{challanNumber || previewVoucherNo}</span>
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {viewMode && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: 'var(--text-small)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>STATUS:</span>
              <Badge variant={CHALLAN_STATUS_BADGE_VARIANT[challanStatus as ChallanStatus] || 'default'}>
                {CHALLAN_STATUS_LABELS[challanStatus as ChallanStatus] || challanStatus}
              </Badge>
              <div style={{ width: '180px' }}>
                <Select
                  value={challanStatus}
                  onChange={handleStatusChange}
                  options={Object.entries(CHALLAN_STATUS_LABELS).map(([val, lbl]) => ({ value: val, label: lbl }))}
                  placeholder="Update Status"
                  searchable={false}
                  clearable={false}
                />
              </div>
            </div>
          )}
          {viewMode && (
            <Button variant="secondary" onClick={() => setShowPrintModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Printer size={16} /> Print Options
            </Button>
          )}
          {!viewMode && (
            <Button variant="primary" onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Save size={16} /> Save Voucher
            </Button>
          )}
        </div>
      </div>

      {/* Main Form Fields Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '16px',
        padding: '20px',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
      }}>
        <div style={{ minWidth: '180px' }}>
          <Select
            label="Party Name (To) *"
            value={partyId}
            onChange={handlePartyChange}
            options={parties.map(p => ({ value: String(p.id), label: p.accountName }))}
            placeholder="Select Client/Party"
            disabled={viewMode}
          />
        </div>

        <Input
          label="Mobile No"
          value={mobile}
          onChange={(e) => setMobile(e.target.value)}
          placeholder="Client mobile"
          disabled={viewMode}
        />

        <Input
          label="City"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Client city"
          disabled={viewMode}
        />

        <Input
          label="GSTIN No (Optional)"
          value={gstin}
          onChange={(e) => setGstin(e.target.value)}
          placeholder="GSTIN if any"
          disabled={viewMode}
        />

        <Input
          label="Challan Date *"
          type="date"
          value={challanDate}
          onChange={(e) => setChallanDate(e.target.value)}
          disabled={viewMode}
        />

        <Input
          label="Expected Return Date"
          type="date"
          value={expectedReturnDate}
          onChange={(e) => setExpectedReturnDate(e.target.value)}
          disabled={viewMode}
        />

      </div>

      {/* Bill Number Config Row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px', background: 'var(--color-row-alt)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
          <input type="checkbox" checked={isManualBillNumber} onChange={(e) => setIsManualBillNumber(e.target.checked)} disabled={viewMode} />
          Enter bill number manually
        </label>
        <div style={{ flex: 1, maxWidth: '300px' }}>
          <Input 
            placeholder={previewVoucherNo || "Auto-Generated sequential number"} 
            disabled={!isManualBillNumber || viewMode} 
            value={challanNumber}
            onChange={(e) => setChallanNumber(e.target.value)}
          />
        </div>
      </div>

      {/* Item Grid Table */}
      <div style={{
        padding: '20px',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: 'var(--text-heading)', fontWeight: 600, color: 'var(--color-primary)' }}>Line Items</h3>
          {!viewMode && (
            <Button variant="secondary" size="sm" onClick={addRow} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Plus size={14} /> Add Row
            </Button>
          )}
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--color-border)' }}>
              {(purpose === 'TRADING_JHANGHAD' || purpose === 'JOB_WORK') && (
                <th style={{ padding: '8px 4px' }}>Select Stock Packet</th>
              )}
              <th style={{ padding: '8px 4px' }}>Description of Goods (Quality) *</th>
              <th style={{ padding: '8px 4px', width: '100px' }}>CARATS *</th>
              <th style={{ padding: '8px 4px', width: '80px' }}>Pieces</th>
              <th style={{ padding: '8px 4px', width: '120px' }}>Price / CARAT</th>
              <th style={{ padding: '8px 4px', width: '140px' }}>Total</th>
              <th style={{ padding: '8px 4px' }}>Remarks</th>
              {!viewMode && <th style={{ padding: '8px 4px', width: '60px' }}>Action</th>}
            </tr>
          </thead>
          <tbody>
            {items.map((row, idx) => {
              const availableForThisRow = row.stockPacketId
                ? [...availablePackets, availablePackets.find(p => p.id === row.stockPacketId)].filter(Boolean) as StockPacketObj[]
                : availablePackets;

              return (
                <tr key={idx} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  {(purpose === 'TRADING_JHANGHAD' || purpose === 'JOB_WORK') && (
                    <td style={{ padding: '8px 4px' }}>
                      <Select
                        value={row.stockPacketId ? String(row.stockPacketId) : ''}
                        onChange={(val: string) => handleRowChange(idx, 'stockPacketId', val)}
                        options={availableForThisRow.map(p => ({ value: String(p.id), label: p.stockIdNumber }))}
                        placeholder="Select Packet"
                        disabled={viewMode}
                      />
                    </td>
                  )}

                  <td style={{ padding: '8px 4px' }}>
                    <Select
                      value={String(row.qualityId)}
                      onChange={(val: string) => handleRowChange(idx, 'qualityId', Number(val))}
                      options={qualities.map(q => ({ value: String(q.id), label: q.qualityName }))}
                      placeholder="Select Quality"
                      disabled={viewMode || !!row.stockPacketId}
                    />
                  </td>

                  <td style={{ padding: '8px 4px' }}>
                    <Input
                      type="number"
                      value={row.carats || ''}
                      onChange={(e) => handleRowChange(idx, 'carats', Number(e.target.value))}
                      disabled={viewMode || !!row.stockPacketId}
                    />
                  </td>

                  <td style={{ padding: '8px 4px' }}>
                    <Input
                      type="number"
                      value={row.pieces || ''}
                      onChange={(e) => handleRowChange(idx, 'pieces', Number(e.target.value))}
                      disabled={viewMode || !!row.stockPacketId}
                    />
                  </td>

                  <td style={{ padding: '8px 4px' }}>
                    <Input
                      type="number"
                      value={row.rate || ''}
                      onChange={(e) => handleRowChange(idx, 'rate', Number(e.target.value))}
                      disabled={viewMode}
                    />
                  </td>

                  <td style={{ padding: '8px 4px', fontWeight: 600, color: 'var(--color-primary)' }}>
                    ₹ {Number(row.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>

                  <td style={{ padding: '8px 4px' }}>
                    <Input
                      value={row.remarks || ''}
                      onChange={(e) => handleRowChange(idx, 'remarks', e.target.value)}
                      placeholder="Optional notes"
                      disabled={viewMode}
                    />
                  </td>

                  {!viewMode && (
                    <td style={{ padding: '8px 4px' }}>
                      <Button variant="ghost" size="sm" onClick={() => removeRow(idx)} disabled={items.length === 1}>
                        <Trash2 size={14} color="var(--color-danger)" />
                      </Button>
                    </td>
                  )}
                </tr>
              );
            })}

            {/* Total Row */}
            <tr style={{ background: 'var(--color-bg-header)', fontWeight: 700 }}>
              {(purpose === 'TRADING_JHANGHAD' || purpose === 'JOB_WORK') && <td style={{ padding: '12px 8px' }}>Total Summary</td>}
              {!(purpose === 'TRADING_JHANGHAD' || purpose === 'JOB_WORK') && <td style={{ padding: '12px 8px' }}>Total Summary</td>}
              <td style={{ padding: '12px 8px' }}></td>
              <td style={{ padding: '12px 8px' }}>{totalCarats.toFixed(3)}</td>
              <td style={{ padding: '12px 8px' }}>{totalPieces}</td>
              <td style={{ padding: '12px 8px' }}></td>
              <td style={{ padding: '12px 8px', color: 'var(--color-success)' }}>
                ₹ {totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </td>
              <td style={{ padding: '12px 8px' }}></td>
              {!viewMode && <td></td>}
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{
        padding: '20px',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
      }}>
        <Input
          label="Narration / Public Notes"
          value={narration}
          onChange={(e) => setNarration(e.target.value)}
          placeholder="Enter terms, shipping info or private remarks"
          disabled={viewMode}
        />
      </div>

      {/* Print Options Dialog Modal */}
      {showPrintModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 999
        }}>
          <div style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '400px',
            width: '100%',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px' }}>Choose Print Destination</h3>
            <p style={{ fontSize: 'var(--text-small)', color: 'var(--color-text-secondary)', marginBottom: '20px' }}>
              Select "Preview on Screen" to see the side-by-side copies, or "System Print" to send it straight to the printer.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Button variant="primary" onClick={() => { setShowPrintModal(false); setShowPrintPreview(true); }}>
                Preview on Screen
              </Button>
              <Button variant="secondary" onClick={triggerDirectPrint}>
                System Print Dialog
              </Button>
              <Button variant="ghost" onClick={() => setShowPrintModal(false)} style={{ marginTop: '8px' }}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Partial Returns Dialog Modal */}
      {showStatusModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 999
        }}>
          <div style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '650px',
            width: '100%',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px', color: 'var(--color-primary)' }}>
              Register Goods Return
            </h3>
            <p style={{ fontSize: 'var(--text-small)', color: 'var(--color-text-secondary)', marginBottom: '20px' }}>
              Specify the exact carat weight and number of pieces returned by the client.
            </p>

            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', fontSize: 'var(--text-label)' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', textAlign: 'left' }}>
                  <th style={{ padding: '8px 4px' }}>Quality Name</th>
                  <th style={{ padding: '8px 4px', width: '100px' }}>Issued Carats</th>
                  <th style={{ padding: '8px 4px', width: '80px' }}>Issued Pcs</th>
                  <th style={{ padding: '8px 4px', width: '120px' }}>Returned Carats</th>
                  <th style={{ padding: '8px 4px', width: '100px' }}>Returned Pcs</th>
                </tr>
              </thead>
              <tbody>
                {returnItems.map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '8px 4px', fontWeight: 600 }}>{row.qualityName}</td>
                    <td style={{ padding: '8px 4px' }}>{row.carats.toFixed(3)}</td>
                    <td style={{ padding: '8px 4px' }}>{row.pieces}</td>
                    <td style={{ padding: '4px' }}>
                      <Input
                        type="number"
                        value={row.returnedCarats || ''}
                        onChange={(e) => {
                          const updated = [...returnItems];
                          updated[idx].returnedCarats = Number(e.target.value) || 0;
                          setReturnItems(updated);
                        }}
                      />
                    </td>
                    <td style={{ padding: '4px' }}>
                      <Input
                        type="number"
                        value={row.returnedPieces || ''}
                        onChange={(e) => {
                          const updated = [...returnItems];
                          updated[idx].returnedPieces = Number(e.target.value) || 0;
                          setReturnItems(updated);
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <Button variant="ghost" onClick={() => { setShowStatusModal(false); setTargetStatus(''); }}>
                Cancel
              </Button>
              <Button variant="primary" onClick={() => executeStatusUpdate(targetStatus, returnItems)}>
                Save Returns & Update Status
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
