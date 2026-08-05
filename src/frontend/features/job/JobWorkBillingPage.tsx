import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useActiveCompany } from '../../hooks/useActiveCompany';
import { Button, Badge, DataGrid, Column, Modal, Input, useToast } from '../../components/ui';
import { PrintTemplate } from '../../components/ui/PrintTemplate';
import { 
  Briefcase, Plus, RefreshCw
} from 'lucide-react';
import { invokeIpc } from '../../../shared/utils/ipc';

export interface IJobWorkTicket {
  id: number;
  ticketNumber: string;
  ticketDate: string;
  customerName: string;
  customerId: number;
  subcontractorName: string;
  subcontractorId: number;
  serviceType: 'MAKEABLE_TO_POLISH' | 'ROUGH_TO_4P' | 'ROUGH_TO_POLISH' | 'DIAMOND_CONVERSION';
  inwardRoughCarats: number;
  inwardPieceCount: number;
  outwardPolishedCarats: number | null;
  outwardPieceCount: number | null;
  pieceBreakdown?: Array<{ pieceNumber: number; weight: number }>;
  status: 'IN_PROCESS' | 'COMPLETED' | 'CANCELLED';
  clientBilledRate: number;
  clientBilledTotal: number;
  contractorExpenseRate: number;
  contractorExpenseTotal: number;
  netMarginAmount: number;
  netMarginPct: number;
  transactionCurrency: 'INR' | 'USD';
  exchangeRate: number;
  issueDate: string;
  completionDate?: string;
  stockPacketId?: string;
}

export const JobWorkBillingPage: React.FC = () => {
  const navigate = useNavigate();
  const { companyId } = useActiveCompany();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [tickets, setTickets] = useState<IJobWorkTicket[]>([]);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'IN_PROCESS' | 'COMPLETED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInputText, setSearchInputText] = useState('');

  // Debounce search input text -> searchQuery
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInputText);
    }, 150);
    return () => clearTimeout(timer);
  }, [searchInputText]);

  // Receive Modal State
  const [receiveModalOpen, setReceiveModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<IJobWorkTicket | null>(null);
  const [outwardPcs, setOutwardPcs] = useState<number>(1);
  const [pieceWeights, setPieceWeights] = useState<Array<number | string>>(['']);

  // DIAMO Standard Print Template State
  const [printData, setPrintData] = useState<any | null>(null);

  // Fetch register
  const fetchTickets = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      // Fetch vouchers via Electron IPC
      const res = await invokeIpc<any[]>('job:list', { companyId, jobType: 'JOB_INCOME' });
      if (res?.success && Array.isArray(res.data)) {
        const mapped: IJobWorkTicket[] = res.data.map((v: any) => {
          const isCompleted = v.status === 'POSTED' || v.status === 'CLOSED';

          // Read actual DB fields from unified schema
          const inCarats = Number(v.inwardRoughCarats || v.totalCarats || 0);
          const inPcs = Number(v.inwardPieceCount) || (v.items?.[0]?.pieces || 1);
          const clientRate = Number(v.clientBilledRate) || Number(v.items?.[0]?.rate || 0);
          const contractorRate = Number(v.contractorExpenseRate) || 0;
          const clientTotal = Number(v.totalAmount) || (inCarats * clientRate);
          const contractorTotal = Number(v.contractorExpenseTotal) || (inCarats * contractorRate);
          const margin = clientTotal - contractorTotal;

          // Read actual outward fields (only populated after Stage 2 completion)
          const outCarats = isCompleted ? Number(v.outwardPolishedCarats || 0) : null;
          const outPcs = isCompleted ? Number(v.outwardPieceCount || 0) : null;

          return {
            id: v.id,
            ticketNumber: v.voucherNumber || `JW-${v.id}`,
            ticketDate: v.voucherDate ? new Date(v.voucherDate).toLocaleDateString('en-IN') : '—',
            issueDate: v.voucherDate ? new Date(v.voucherDate).toLocaleDateString('en-IN') : '—',
            customerName: v.party?.accountName || 'Customer Party',
            customerId: v.partyId,
            subcontractorName: v.subcontractorParty?.accountName || 'Subcontractor',
            subcontractorId: v.subcontractorPartyId || 0,
            serviceType: (v.serviceType || 'DIAMOND_CONVERSION') as IJobWorkTicket['serviceType'],
            inwardRoughCarats: inCarats,
            inwardPieceCount: inPcs,
            outwardPolishedCarats: outCarats,
            outwardPieceCount: outPcs,
            status: isCompleted ? 'COMPLETED' : 'IN_PROCESS',
            clientBilledRate: clientRate,
            clientBilledTotal: clientTotal,
            contractorExpenseRate: contractorRate,
            contractorExpenseTotal: contractorTotal,
            netMarginAmount: margin,
            netMarginPct: clientTotal > 0 ? (margin / clientTotal) * 100 : 0,
            transactionCurrency: (v.transactionCurrency || 'INR') as 'INR' | 'USD',
            exchangeRate: Number(v.exchangeRate) || 1.0,
          };
        });
        setTickets(mapped);
      }
    } catch (err) {
      console.error('Failed to fetch jobwork register:', err);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Compute telemetry summary memoized (dual currency INR & USD)
  const { 
    totalBilledInr, totalBilledUsd, 
    totalExpenseInr, totalExpenseUsd, 
    netCommissionInr, netCommissionUsd, 
    pendingCount 
  } = React.useMemo(() => {
    let billedInr = 0;
    let billedUsd = 0;
    let expInr = 0;
    let expUsd = 0;
    let count = 0;

    tickets.forEach((t) => {
      if (t.status !== 'CANCELLED') {
        const isUsd = t.transactionCurrency === 'USD';
        if (isUsd) {
          billedUsd += t.clientBilledTotal;
          expUsd += t.contractorExpenseTotal;
        } else {
          billedInr += t.clientBilledTotal;
          expInr += t.contractorExpenseTotal;
        }

        if (t.status === 'IN_PROCESS') {
          count += 1;
        }
      }
    });

    const commInr = billedInr - expInr;
    const commUsd = billedUsd - expUsd;

    return {
      totalBilledInr: billedInr,
      totalBilledUsd: billedUsd,
      totalExpenseInr: expInr,
      totalExpenseUsd: expUsd,
      netCommissionInr: commInr,
      netCommissionUsd: commUsd,
      pendingCount: count,
    };
  }, [tickets]);

  // Filtered tickets based on search & tab
  const filteredTickets = React.useMemo(() => {
    return tickets.filter((t) => {
      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'IN_PROCESS' && t.status === 'IN_PROCESS') ||
        (statusFilter === 'COMPLETED' && t.status === 'COMPLETED');

      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        t.ticketNumber.toLowerCase().includes(q) ||
        t.customerName.toLowerCase().includes(q) ||
        t.subcontractorName.toLowerCase().includes(q);

      return matchesStatus && matchesSearch;
    });
  }, [tickets, statusFilter, searchQuery]);

  // Handle Receive Modal open
  const openReceiveModal = (ticket: IJobWorkTicket) => {
    setSelectedTicket(ticket);
    setOutwardPcs(1);
    setPieceWeights(['']);
    setReceiveModalOpen(true);
  };

  // Handle Piece Count change
  const handlePcsChange = (count: number) => {
    const clamped = Math.max(1, Math.min(count, 20));
    setOutwardPcs(clamped);
    setPieceWeights(Array(clamped).fill(''));
  };

  // Complete & Bill Jobwork — calls backend to post 4-way GL entries in MySQL
  const handleCompleteJob = async () => {
    if (!selectedTicket || !companyId) return;

    // Strict validation: every piece must have weight > 0
    for (let i = 0; i < pieceWeights.length; i++) {
      const w = parseFloat(String(pieceWeights[i] || 0));
      if (isNaN(w) || w <= 0) {
        showToast(`Please enter a valid carat weight (> 0) for Piece #${i + 1}`, 'error');
        return;
      }
    }

    const numericWeights = pieceWeights.map(w => parseFloat(String(w)) || 0);
    const totalOutwardWt = numericWeights.reduce((s, w) => s + w, 0);

    if (totalOutwardWt <= 0) {
      showToast('Please enter valid outward carat weights (> 0)', 'error');
      return;
    }

    try {
      showToast('Posting Converted Jobwork Invoice & 4-Way General Ledger entries...', 'info');
      
      // Call backend to post 4-Way GL entries to MySQL
      const res = await invokeIpc<any>('job:receive-bill', {
        companyId,
        id: selectedTicket.id,
        data: {
          outwardPolishedCarats: totalOutwardWt,
          outwardPieceCount: outwardPcs,
          pieceWeights: numericWeights,
        },
      });

      if (res?.success) {
        // Refresh list from DB after successful GL posting
        await fetchTickets();
        setReceiveModalOpen(false);
        showToast('✅ Jobwork Completed! Customer Receivable & Contractor Payable posted to GL.', 'success');
      } else {
        showToast(`Failed: ${res?.error || 'Unknown error'}`, 'error');
      }
    } catch (err) {
      showToast('Failed to complete jobwork billing', 'error');
    }
  };

  // Handle Cancel / Reverse Jobwork Ticket
  const handleCancelTicket = async (ticketId: number, ticketNum: string) => {
    if (!companyId) return;
    if (!window.confirm(`Are you sure you want to cancel Jobwork Ticket ${ticketNum}? This will reverse all posted GL entries and outstanding bills.`)) return;

    try {
      showToast(`Cancelling Jobwork Ticket ${ticketNum}...`, 'info');
      const res = await invokeIpc<any>('job:cancel', { companyId, id: ticketId });
      if (res?.success) {
        showToast(`✅ Jobwork Ticket ${ticketNum} cancelled and postings reversed!`, 'success');
        await fetchTickets();
      } else {
        showToast(`Failed: ${res?.error || 'Unknown error'}`, 'error');
      }
    } catch (err) {
      showToast('Failed to cancel jobwork ticket', 'error');
    }
  };

  // Open Standard DIAMO Print Preview Modal for Client Invoice (Billed to Arya Shah)
  const handlePrintClientBill = (ticket: IJobWorkTicket) => {
    const isCompleted = ticket.outwardPolishedCarats !== null;
    let itemDesc = `${ticket.serviceType}`;
    if (isCompleted) {
      itemDesc += ` (Outward Polished Output: ${ticket.outwardPolishedCarats!.toFixed(3)} Cts in ${ticket.outwardPieceCount || 1} Pcs | Inward Rough: ${ticket.inwardRoughCarats.toFixed(3)} Cts / ${ticket.inwardPieceCount} Pc)`;
    } else {
      itemDesc += ` (Inward Rough: ${ticket.inwardRoughCarats.toFixed(3)} Cts / ${ticket.inwardPieceCount} Pc)`;
    }

    setPrintData({
      invoiceType: 'JOB WORK INVOICE',
      voucherNumber: ticket.ticketNumber,
      voucherDate: ticket.issueDate,
      party: {
        accountName: ticket.customerName,
        city: 'Surat',
        gstinNumber: '24AAACJ0000A1Z5',
      },
      items: [
        {
          qualityName: itemDesc,
          carats: ticket.inwardRoughCarats, // Actual original carats given by Party
          pieces: ticket.inwardPieceCount,  // Actual original pieces given by Party
          rate: ticket.clientBilledRate,
          amount: ticket.clientBilledTotal,
        }
      ],
      netAmount: ticket.clientBilledTotal,
      transactionCurrency: ticket.transactionCurrency,
      exchangeRate: ticket.exchangeRate,
    });
  };

  // Open Standard DIAMO Print Preview Modal for Subcontractor Slip (Issued to Jainee Jobwork)
  const handlePrintVendorSlip = (ticket: IJobWorkTicket) => {
    const isCompleted = ticket.outwardPolishedCarats !== null;
    let itemDesc = `${ticket.serviceType}`;
    if (isCompleted) {
      itemDesc += ` (Outward Polished Output: ${ticket.outwardPolishedCarats!.toFixed(3)} Cts in ${ticket.outwardPieceCount || 1} Pcs | Inward Rough: ${ticket.inwardRoughCarats.toFixed(3)} Cts / ${ticket.inwardPieceCount} Pc)`;
    } else {
      itemDesc += ` (Inward Rough: ${ticket.inwardRoughCarats.toFixed(3)} Cts / ${ticket.inwardPieceCount} Pc)`;
    }

    setPrintData({
      invoiceType: 'SUBCONTRACTOR WORK ORDER',
      voucherNumber: ticket.ticketNumber,
      voucherDate: ticket.issueDate,
      party: {
        accountName: ticket.subcontractorName,
        city: 'Surat',
        gstinNumber: '24AAACJ0000A1Z5',
      },
      items: [
        {
          qualityName: itemDesc,
          carats: ticket.inwardRoughCarats, // Actual original carats given by Party
          pieces: ticket.inwardPieceCount,  // Actual original pieces given by Party
          rate: ticket.contractorExpenseRate,
          amount: ticket.contractorExpenseTotal,
        }
      ],
      netAmount: ticket.contractorExpenseTotal,
      transactionCurrency: ticket.transactionCurrency,
      exchangeRate: ticket.exchangeRate,
    });
  };

  const columns: Column<any>[] = React.useMemo(() => [
    {
      key: 'ticketNumber',
      header: 'TICKET #',
      render: (row) => (
        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#0284c7' }}>
          {row.ticketNumber}
        </span>
      ),
    },
    {
      key: 'ticketDate',
      header: 'DATE',
      render: (row) => <span>{row.issueDate}</span>,
    },
    {
      key: 'customerName',
      header: 'CLIENT & SUBCONTRACTOR',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{row.customerName}</div>
          <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
            Subcontractor: <strong>{row.subcontractorName}</strong>
          </div>
        </div>
      ),
    },
    {
      key: 'serviceType',
      header: 'SERVICE',
      render: (row) => {
        const labels: Record<string, string> = {
          MAKEABLE_TO_POLISH: 'Makeable to Polish',
          ROUGH_TO_4P: 'Rough to 4P',
          ROUGH_TO_POLISH: 'Rough to Polish',
          DIAMOND_CONVERSION: 'Diamond Conversion',
        };
        return <Badge variant="info">{labels[row.serviceType] || row.serviceType}</Badge>;
      },
    },
    {
      key: 'inwardRoughCarats',
      header: 'INWARD ROUGH',
      render: (row) => (
        <div>
          <span style={{ fontWeight: 600 }}>{row.inwardRoughCarats.toFixed(3)} Cts</span>
          <span style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-secondary)' }}>
            {row.inwardPieceCount} Pc Rough
          </span>
        </div>
      ),
    },
    {
      key: 'outwardPolishedCarats',
      header: 'OUTWARD POLISHED',
      render: (row) => {
        if (row.status === 'CANCELLED') {
          return <Badge variant="danger">Cancelled</Badge>;
        }
        if (row.status === 'IN_PROCESS' || row.outwardPolishedCarats === null) {
          return <span style={{ opacity: 0.5, fontStyle: 'italic', fontSize: '12px' }}>Processing...</span>;
        }
        return (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontWeight: 700, color: '#047857' }}>{row.outwardPolishedCarats.toFixed(3)} Cts ({row.outwardPieceCount} Pcs)</span>
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'STATUS',
      render: (row) => {
        if (row.status === 'CANCELLED') return <Badge variant="danger">Cancelled</Badge>;
        if (row.status === 'COMPLETED') return <Badge variant="success">Completed</Badge>;
        return <Badge variant="warning">In Process</Badge>;
      },
    },
    {
      key: 'financialMargin',
      header: 'FINANCIAL MARGIN',
      render: (row) => {
        const sym = row.transactionCurrency === 'USD' ? '$' : '₹';
        return (
          <div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
              Client: <strong>{sym}{row.clientBilledTotal.toLocaleString('en-IN')}</strong>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
              Factory: <strong>{sym}{row.contractorExpenseTotal.toLocaleString('en-IN')}</strong>
            </div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#16a34a', marginTop: '2px' }}>
              Net Profit: {sym}{row.netMarginAmount.toLocaleString('en-IN')} ({row.netMarginPct.toFixed(0)}%)
            </div>
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: 'ACTION',
      render: (row) => (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {row.status === 'IN_PROCESS' && (
            <Button size="sm" variant="primary" onClick={() => openReceiveModal(row)}>
              Receive & Bill
            </Button>
          )}
          <Button size="sm" variant="secondary" onClick={() => handlePrintClientBill(row)}>
            📄 Client Bill
          </Button>
          <Button size="sm" variant="secondary" onClick={() => handlePrintVendorSlip(row)}>
            🏭 Vendor Slip
          </Button>
          {row.status === 'IN_PROCESS' && (
            <Button size="sm" variant="ghost" style={{ color: '#ef4444' }} onClick={() => handleCancelTicket(row.id, row.ticketNumber)}>
              Cancel
            </Button>
          )}
        </div>
      ),
    },
  ], []);

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Briefcase size={22} color="var(--color-accent)" />
            Job Work Billing & Subcontracting Register
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '4px 0 0 0' }}>
            Track client inward rough, factory diamond conversion yield, customer billing & net commission profit.
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <Button variant="secondary" onClick={fetchTickets} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </Button>
          <Button variant="primary" onClick={() => navigate('/transactions/jobs/new')}>
            <Plus size={16} />
            Issue New Job Work
          </Button>
        </div>
      </div>

      {/* ── Section 1 & 2: Dual Currency Financial Summary Cards ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* Row 1: Rupee (INR ₹) Cards */}
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>
            🇮🇳 INR (₹) FINANCIAL SUMMARY
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
            <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderLeft: '4px solid #0284c7', borderRadius: '12px', padding: '14px 18px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Billed to Clients (₹)</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#0284c7', marginTop: '4px' }}>₹{totalBilledInr.toLocaleString('en-IN')}</div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>Gross INR Job Income</div>
            </div>

            <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderLeft: '4px solid #d97706', borderRadius: '12px', padding: '14px 18px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Contractor Cost (₹)</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#d97706', marginTop: '4px' }}>₹{totalExpenseInr.toLocaleString('en-IN')}</div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>Gross INR Job Expense</div>
            </div>

            <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderLeft: '4px solid #16a34a', borderRadius: '12px', padding: '14px 18px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Net Margin (₹)</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#16a34a', marginTop: '4px' }}>₹{netCommissionInr.toLocaleString('en-IN')}</div>
              <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600, marginTop: '2px' }}>INR Net Profit Margin</div>
            </div>
          </div>
        </div>

        {/* Row 2: Dollar (USD $) Cards */}
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>
            🇺🇸 USD ($) EXPORT FINANCIAL SUMMARY
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
            <div style={{ background: 'var(--color-surface)', border: '1px solid #bfdbfe', borderLeft: '4px solid #2563eb', borderRadius: '12px', padding: '14px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#1e40af', textTransform: 'uppercase' }}>Billed to Clients ($)</div>
                <Badge variant="info">USD $</Badge>
              </div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#2563eb', marginTop: '4px' }}>
                ${totalBilledUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: '11px', color: '#1d4ed8', marginTop: '2px' }}>Gross USD Export Billed</div>
            </div>

            <div style={{ background: 'var(--color-surface)', border: '1px solid #fef3c7', borderLeft: '4px solid #d97706', borderRadius: '12px', padding: '14px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#92400e', textTransform: 'uppercase' }}>Contractor Cost ($)</div>
                <Badge variant="warning">USD $</Badge>
              </div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#b45309', marginTop: '4px' }}>
                ${totalExpenseUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: '11px', color: '#b45309', marginTop: '2px' }}>Gross USD Job Expense</div>
            </div>

            <div style={{ background: 'var(--color-surface)', border: '1px solid #bbf7d0', borderLeft: '4px solid #16a34a', borderRadius: '12px', padding: '14px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>Net Margin ($)</div>
                <Badge variant="success">USD $</Badge>
              </div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#16a34a', marginTop: '4px' }}>
                ${netCommissionUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600, marginTop: '2px' }}>USD Net Profit Margin</div>
            </div>
          </div>
        </div>

        {/* Row 3: In-Process Jobs Card */}
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderLeft: '4px solid #9333ea', borderRadius: '12px', padding: '14px 18px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>In-Process Jobs</div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#9333ea', marginTop: '4px' }}>{pendingCount} Tickets</div>
          <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>Pending Factory Conversion</div>
        </div>

      </div>

      {/* ── Main Data Grid Register ── */}
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '16px' }}>
        
        {/* Register Toolbar: Tabs & Search */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button
              size="sm"
              variant={statusFilter === 'ALL' ? 'primary' : 'ghost'}
              onClick={() => setStatusFilter('ALL')}
            >
              All Tickets ({tickets.length})
            </Button>
            <Button
              size="sm"
              variant={statusFilter === 'IN_PROCESS' ? 'primary' : 'ghost'}
              onClick={() => setStatusFilter('IN_PROCESS')}
            >
              In Process ({tickets.filter(t => t.status === 'IN_PROCESS').length})
            </Button>
            <Button
              size="sm"
              variant={statusFilter === 'COMPLETED' ? 'primary' : 'ghost'}
              onClick={() => setStatusFilter('COMPLETED')}
            >
              Completed ({tickets.filter(t => t.status === 'COMPLETED').length})
            </Button>
          </div>

          <div style={{ width: '280px' }}>
            <Input
              type="text"
              placeholder="Search by Ticket #, Client or Vendor..."
              value={searchInputText}
              onChange={(e) => setSearchInputText(e.target.value)}
            />
          </div>
        </div>

        <DataGrid<IJobWorkTicket>
          data={filteredTickets}
          columns={columns}
          keyField="id"
          loading={loading}
          emptyTitle="No job work tickets found."
        />
      </div>

      {/* ── Receive & Bill Modal ── */}
      {receiveModalOpen && selectedTicket && (
        <Modal
          isOpen={receiveModalOpen}
          onClose={() => setReceiveModalOpen(false)}
          title={`Receive Converted Stock & Bill Client (${selectedTicket.ticketNumber})`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ background: 'var(--color-background-subtle, #f8fafc)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '13px' }}>
              <div><strong>Client:</strong> {selectedTicket.customerName}</div>
              <div><strong>Inward Rough Received:</strong> {selectedTicket.inwardRoughCarats.toFixed(3)} Cts ({selectedTicket.inwardPieceCount} Pc Rough)</div>
              <div><strong>Service Type:</strong> {selectedTicket.serviceType}</div>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                Resulting Converted Diamond Pieces *
              </label>
              <Input
                type="number"
                min="1"
                max="20"
                value={outwardPcs}
                onChange={(e) => handlePcsChange(Number(e.target.value) || 1)}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                Enter Carat Weight per Converted Piece (Cts)
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                {pieceWeights.map((w, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, minWidth: '75px' }}>Piece #{idx + 1}:</span>
                    <Input
                      type="number"
                      step="0.001"
                      placeholder="0.000 Cts"
                      value={w}
                      onChange={(e) => {
                        const val = e.target.value;
                        setPieceWeights(prev => {
                          const next = [...prev];
                          next[idx] = val;
                          return next;
                        });
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Live Yield & Loss Summary */}
            {(() => {
              const totalOut = pieceWeights.reduce<number>((s, w) => s + (parseFloat(String(w)) || 0), 0);
              const loss = Math.max(0, selectedTicket.inwardRoughCarats - totalOut);
              const yieldPct = selectedTicket.inwardRoughCarats > 0 ? (totalOut / selectedTicket.inwardRoughCarats) * 100 : 0;

              return (
                <div style={{ background: '#e0f2fe', padding: '12px 16px', borderRadius: '8px', color: '#0369a1', fontSize: '12px' }}>
                  <div><strong>Total Converted Weight:</strong> {totalOut.toFixed(3)} Cts ({outwardPcs} Pcs)</div>
                  <div><strong>Process Loss:</strong> {loss.toFixed(3)} Cts ({(100 - yieldPct).toFixed(1)}% Loss)</div>
                  <div><strong>Process Yield:</strong> <span style={{ fontWeight: 700, color: '#16a34a' }}>{yieldPct.toFixed(1)}% Yield</span></div>
                </div>
              );
            })()}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
              <Button variant="ghost" onClick={() => setReceiveModalOpen(false)}>Cancel</Button>
              <Button variant="primary" onClick={handleCompleteJob}>
                Complete Job & Post GL Ledger Entries
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Standard DIAMO Print Preview Modal (Exact match to Image 2) ── */}
      {printData && (
        <PrintTemplate
          type="INVOICE"
          data={printData}
          onClose={() => setPrintData(null)}
        />
      )}

    </div>
  );
};
