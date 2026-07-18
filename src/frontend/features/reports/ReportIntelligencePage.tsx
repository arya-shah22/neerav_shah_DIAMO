// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Report Intelligence & Automation Control Page
// Phase 11.9: Search Parser, Pinning, Scheduling & Archiving (Offline Edition)
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import { Search, Star, Play, FileText, Archive, Calendar, Plus, Trash2, ArrowRight, Folder } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button, Input } from '../../components/ui';
import { useActiveCompany } from '../../hooks/useActiveCompany';
import * as XLSX from 'xlsx';
import {
  getBalanceSheetCSV,
  getBalanceSheetPDFHtml,
  getProfitLossCSV,
  getProfitLossPDFHtml,
  getTrialBalanceCSV,
  getTrialBalancePDFHtml,
  getCashFlowCSV,
  getCashFlowPDFHtml,
  getFundFlowCSV,
  getFundFlowPDFHtml,
  getStockReportCSV,
  getStockReportPDFHtml,
  getDayBookCSV,
  getDayBookPDFHtml,
  getOutstandingCSV,
  getOutstandingPDFHtml
} from '../../utils/reportExports';

type IntelligenceTab = 'SEARCH_LIBRARY' | 'AUTOMATION' | 'ARCHIVES';

interface ReportDefinition {
  path: string;
  name: string;
  category: string;
  desc: string;
}

const ALL_REPORTS: ReportDefinition[] = [
  { path: '/reports/ledger', name: 'General Ledger', category: 'Accounting', desc: 'Account statements and postings ledger details.' },
  { path: '/reports/trial-balance', name: 'Trial Balance', category: 'Accounting', desc: 'Debit vs. Credit check statement.' },
  { path: '/reports/profit-loss', name: 'Profit & Loss Account', category: 'Financial', desc: 'Revenue, Cost of Sales, and Operating Expenses margins.' },
  { path: '/reports/balance-sheet', name: 'Balance Sheet', category: 'Financial', desc: 'Asset, Liability, and Capital positions.' },
  { path: '/reports/cash-flow', name: 'Cash Flow Statement', category: 'Financial', desc: 'Direct Method Cash inflow and outflow categorization.' },
  { path: '/reports/fund-flow', name: 'Fund Flow Statement', category: 'Financial', desc: 'Working capital shifts and sources/applications of funds.' },
  { path: '/reports/outstanding', name: 'Outstanding Statements', category: 'Outstanding', desc: 'Party-wise receivables and payables tracker.' },
  { path: '/reports/stock', name: 'Stock Report', category: 'Inventory', desc: 'Available packets, shapes, weights, and cost valuations.' },
  { path: '/reports/gst', name: 'GST Dashboard', category: 'GST Compliance', desc: 'Overview of GSTR filing statuses and tax outputs.' },
  { path: '/reports/gstr1', name: 'GSTR-1 Report', category: 'GST Compliance', desc: 'Details of B2B and B2C sales for tax returns.' },
  { path: '/reports/gstr2', name: 'GSTR-2 & ITC Reconciliation', category: 'GST Compliance', desc: 'Reconciliation of purchase ITC inputs with GSTR-2B.' },
  { path: '/reports/gstr3b', name: 'GSTR-3B Summary', category: 'GST Compliance', desc: 'Aggregated monthly GSTR-3B tax calculation sheet.' },
  { path: '/reports/gst-analytics', name: 'GST Analytics', category: 'GST Compliance', desc: 'Historical tax output trends and rate analysis.' },
  { path: '/reports/tds-tcs', name: 'TDS & TCS', category: 'Direct Taxes', desc: 'Section breakdown and party-wise direct tax records.' },
  { path: '/reports/mis', name: 'MIS & Analytics', category: 'Management', desc: 'Today\'s KPIs, monthly transaction trends, and financial ratios.' },
  { path: '/reports/day-book', name: 'Day Book', category: 'Accounting', desc: 'Date-wise chronological ledger vouchers register.' }
];

export const ReportIntelligencePage: React.FC = () => {
  const navigate = useNavigate();
  const { activeCompany, companyId } = useActiveCompany();
  const [activeTab, setActiveTab] = useState<IntelligenceTab>('SEARCH_LIBRARY');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ReportDefinition[]>([]);
  const [searchSuggestion, setSearchSuggestion] = useState<{ text: string; path: string } | null>(null);

  // Persistence (localStorage)
  const [favorites, setFavorites] = useState<string[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [archives, setArchives] = useState<any[]>([]);

  // State for new schedule modal/inputs
  const [newSched, setNewSched] = useState({
    reportPath: '/reports/balance-sheet',
    destinationFolder: 'Documents/DIAMO_Auto_Exports',
    frequency: 'Monthly',
    format: 'PDF'
  });

  useEffect(() => {
    // Load favorites
    const favs = localStorage.getItem('diamo_report_favs');
    if (favs) setFavorites(JSON.parse(favs));

    // Load schedules
    const schedList = localStorage.getItem('diamo_report_schedules');
    if (schedList) {
      setSchedules(JSON.parse(schedList));
    } else {
      const initial = [
        { id: '1', name: 'Balance Sheet', destinationFolder: 'Documents/DIAMO_Auto_Exports', frequency: 'Monthly', format: 'PDF', status: 'ACTIVE' },
        { id: '2', name: 'MIS & Analytics', destinationFolder: 'Desktop/ERP_Weekly_Stats', frequency: 'Weekly', format: 'Excel', status: 'ACTIVE' }
      ];
      setSchedules(initial);
      localStorage.setItem('diamo_report_schedules', JSON.stringify(initial));
    }

    // Load archives and filter out deleted files
    const archList = localStorage.getItem('diamo_report_archives');
    if (archList) {
      const parsed = JSON.parse(archList);
      window.api.invoke('system:filter-existing-files', { archives: parsed }).then((res: any) => {
        if (res && res.success) {
          setArchives(res.archives);
          localStorage.setItem('diamo_report_archives', JSON.stringify(res.archives));
        } else {
          setArchives(parsed);
        }
      }).catch(() => {
        setArchives(parsed);
      });
    } else {
      const initialArch = [
        { id: 'mock-3', version: 'v1.0.3', name: 'General Ledger', date: '17/07/2026 10:14 PM', format: 'PDF', trigger: 'Manual Export', params: 'FY 2026-27, Account: Arya' },
        { id: 'mock-2', version: 'v1.0.2', name: 'Balance Sheet', date: '17/07/2026 09:30 AM', format: 'PDF', trigger: 'Auto Schedule', params: 'FY 2026-27, Date: 17/07/2026' },
        { id: 'mock-1', version: 'v1.0.1', name: 'GSTR-1 Report', date: '16/07/2026 04:45 PM', format: 'Excel', trigger: 'Manual Export', params: 'Period: 01/07/2026 to 16/07/2026' }
      ];
      setArchives(initialArch);
      localStorage.setItem('diamo_report_archives', JSON.stringify(initialArch));
    }
  }, []);

  // Synchronise state from background scheduler when updates occur in localStorage
  useEffect(() => {
    const handleStorageChange = () => {
      const archList = localStorage.getItem('diamo_report_archives');
      if (archList) setArchives(JSON.parse(archList));
      const schedList = localStorage.getItem('diamo_report_schedules');
      if (schedList) setSchedules(JSON.parse(schedList));
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Handle Search Input (Smart Query Parser)
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearchSuggestion(null);
      return;
    }

    const q = searchQuery.toLowerCase();

    // 1. Keyword search matching
    const matches = ALL_REPORTS.filter(
      r => r.name.toLowerCase().includes(q) || r.category.toLowerCase().includes(q) || r.desc.toLowerCase().includes(q)
    );
    setSearchResults(matches);

    // 2. Natural Language Query Suggestion
    if (q.includes('debtor') || q.includes('outstanding') || q.includes('receivable') || q.includes('payable')) {
      setSearchSuggestion({ text: 'Go directly to Outstanding Statements with filters applied', path: '/reports/outstanding' });
    } else if (q.includes('loss') || q.includes('profit') || q.includes('income') || q.includes('expense')) {
      setSearchSuggestion({ text: 'Open Profit & Loss Account', path: '/reports/profit-loss' });
    } else if (q.includes('asset') || q.includes('capital') || q.includes('liability')) {
      setSearchSuggestion({ text: 'Open Balance Sheet', path: '/reports/balance-sheet' });
    } else if (q.includes('tax') || q.includes('gst') || q.includes('gstr')) {
      setSearchSuggestion({ text: 'Navigate to GST Dashboard', path: '/reports/gst' });
    } else if (q.includes('cash') || q.includes('bank') || q.includes('flow')) {
      setSearchSuggestion({ text: 'View Cash Flow Statement', path: '/reports/cash-flow' });
    } else if (q.includes('mis') || q.includes('analytics') || q.includes('ratio')) {
      setSearchSuggestion({ text: 'Go to MIS & Business Analytics', path: '/reports/mis' });
    } else {
      setSearchSuggestion(null);
    }
  }, [searchQuery]);

  // Toggle Favorite Pinned state
  const toggleFavorite = (path: string) => {
    let updated: string[];
    if (favorites.includes(path)) {
      updated = favorites.filter(f => f !== path);
    } else {
      updated = [...favorites, path];
    }
    setFavorites(updated);
    localStorage.setItem('diamo_report_favs', JSON.stringify(updated));
  };

  // Add Schedule
  const addSchedule = () => {
    if (!newSched.destinationFolder.trim()) {
      alert('Please specify a target folder path for auto-exports.');
      return;
    }
    const reportName = ALL_REPORTS.find(r => r.path === newSched.reportPath)?.name || 'Custom Report';
    const newRecord = {
      id: Date.now().toString(),
      name: reportName,
      reportPath: newSched.reportPath,
      destinationFolder: newSched.destinationFolder,
      frequency: newSched.frequency,
      format: newSched.format,
      status: 'ACTIVE'
    };
    const updated = [...schedules, newRecord];
    setSchedules(updated);
    localStorage.setItem('diamo_report_schedules', JSON.stringify(updated));
  };

  // Remove Schedule
  const deleteSchedule = (id: string) => {
    const updated = schedules.filter(s => s.id !== id);
    setSchedules(updated);
    localStorage.setItem('diamo_report_schedules', JSON.stringify(updated));
  };

  // Open Saved Version File Natively
  const openArchiveFile = async (a: any) => {
    let path = a.filePath;
    if (!path && a.params && a.params.includes('Saved Path: ')) {
      path = a.params.split('Saved Path: ')[1]?.trim();
    }
    if (!path) {
      alert('Error: No file path saved for this version archive.');
      return;
    }
    const res = await window.api.invoke('system:open-file', { filePath: path });
    if (!res.success) {
      alert(`Failed to open file: ${res.error}`);
    }
  };

  // Delete Archive Entry
  const deleteArchiveEntry = (id: string) => {
    const updated = archives.filter(a => a.id !== id);
    setArchives(updated);
    localStorage.setItem('diamo_report_archives', JSON.stringify(updated));
  };

  const generateReportHTML = (reportPath: string, companyName: string, d: any): string => {
    if (!activeCompany) return '';
    const dateNow = new Date().toLocaleDateString('en-IN');
    const filterDate = dateNow.split('/').reverse().join('-');
    const startDate = '';
    const endDate = dateNow.split('/').reverse().join('-');

    if (reportPath === '/reports/balance-sheet') {
      return getBalanceSheetPDFHtml(d, activeCompany, filterDate);
    }
    if (reportPath === '/reports/profit-loss') {
      return getProfitLossPDFHtml(d, activeCompany, startDate, endDate);
    }
    if (reportPath === '/reports/trial-balance') {
      return getTrialBalancePDFHtml(d, activeCompany, filterDate);
    }
    if (reportPath === '/reports/cash-flow') {
      return getCashFlowPDFHtml(d, activeCompany, startDate, endDate);
    }
    if (reportPath === '/reports/fund-flow') {
      return getFundFlowPDFHtml(d, activeCompany, startDate, endDate);
    }
    if (reportPath === '/reports/stock') {
      return getStockReportPDFHtml(d, activeCompany, 'REGISTER');
    }
    if (reportPath === '/reports/day-book') {
      return getDayBookPDFHtml(d, activeCompany, dateNow, null);
    }
    if (reportPath === '/reports/outstanding') {
      return getOutstandingPDFHtml(d, activeCompany, 'RECEIVABLE');
    }

    return `<html><body><h1>Report not supported</h1></body></html>`;
  };

  // ═══════════════════════════════════════════════════════════════════
  // CSV GENERATORS — Exact replicas of each page's handleExportCSV
  // ═══════════════════════════════════════════════════════════════════

  const generateCSVContent = (reportPath: string, d: any): string => {
    // ── Balance Sheet CSV (exact replica of BalanceSheetPage.handleExportCSV) ──
    if (reportPath === '/reports/balance-sheet') {
      const rows: any[][] = [
        ['LIABILITIES & CAPITAL', '', 'ASSETS', ''],
        ['Group Name', 'Amount', 'Group Name', 'Amount'],
      ];
      const maxLength = Math.max((d.capital?.length || 0) + (d.liabilities?.length || 0), d.assets?.length || 0);
      const liabList = [...(d.capital || []).map((c: any) => ({ name: c.groupName, amount: c.amount })), ...(d.liabilities || []).map((l: any) => ({ name: l.groupName, amount: l.amount }))];
      for (let i = 0; i < maxLength; i++) {
        const liab = liabList[i] || { name: '', amount: '' };
        const asset = (d.assets || [])[i] || { name: '', amount: '' };
        rows.push([liab.name ? `"${liab.name}"` : '', liab.amount, asset.name ? `"${asset.name}"` : '', asset.amount]);
      }
      rows.push([]);
      rows.push(['"Total Liabilities & Capital"', (d.totalLiabilities || 0) + (d.totalCapital || 0), '"Total Assets"', d.totalAssets || 0]);
      if (d.profitLossDetails) {
        const pl = d.profitLossDetails;
        rows.push([]);
        rows.push(['TRADING & PROFIT & LOSS SUMMARY']);
        rows.push(['Opening Stock', 0, 'Sales', pl.revenue?.sales || 0]);
        rows.push(['Purchases', pl.costOfGoods?.purchases || 0, 'Direct Income', pl.revenue?.jobWorkIncome || 0]);
        rows.push(['Direct Expenses', (pl.costOfGoods?.jobWorkExpense || 0) + (pl.costOfGoods?.directExpense || 0), 'Indirect Income', pl.otherIncome || 0]);
        rows.push(['Indirect Expenses', pl.expenses?.operatingExpense || 0, 'Closing Stock', 0]);
        rows.push([pl.netProfit < 0 ? 'NET LOSS' : '', pl.netProfit < 0 ? Math.abs(pl.netProfit) : '', pl.netProfit >= 0 ? 'NET PROFIT' : '', pl.netProfit >= 0 ? pl.netProfit : '']);
      }
      return rows.map(e => e.join(',')).join('\n');
    }

    // ── Profit & Loss CSV (exact replica of ProfitLossPage.handleExportCSV) ──
    if (reportPath === '/reports/profit-loss') {
      const rows: any[][] = [
        ['SECTION', 'PARTICULARS', 'AMOUNT'],
        ['1. REVENUE', 'Sales Income', d.revenue?.sales || 0],
        ['', 'Job Work Income', d.revenue?.jobWorkIncome || 0],
        ['', 'Total Revenue (A)', d.revenue?.total || 0],
        [],
        ['2. COST OF SALES', 'Purchases', d.costOfGoods?.purchases || 0],
        ['', 'Job Work Expenses', d.costOfGoods?.jobWorkExpense || 0],
        ['', 'Direct Expenses', d.costOfGoods?.directExpense || 0],
        ['', 'Total Cost of Sales (B)', d.costOfGoods?.total || 0],
        [],
        ['GROSS PROFIT', 'Gross Profit (A - B)', d.grossProfit || 0],
        [],
        ['3. OPERATING EXPENSES', 'Indirect & Operating Expenses', d.expenses?.operatingExpense || 0],
        ['', 'Total Operating Expenses (C)', d.expenses?.total || 0],
        [],
        ['4. OTHER INDIRECT INCOME', 'Interest & Other Incomes (D)', d.otherIncome || 0],
        [],
        ['NET PROFIT', 'Net Profit For The Period', d.netProfit || 0]
      ];
      return rows.map(e => e.map((val: any) => typeof val === 'string' ? `"${val}"` : val).join(',')).join('\n');
    }

    // ── Trial Balance CSV (exact replica of TrialBalancePage.handleExportCSV) ──
    if (reportPath === '/reports/trial-balance') {
      const headers = ['ACCOUNT GROUP', 'DEBIT (Dr)', 'CREDIT (Cr)'];
      const rows = (d.groups || []).map((row: any) => [`"${row.groupName}"`, row.debit, row.credit]);
      rows.push(['"Total Balance"', d.totalDebit || 0, d.totalCredit || 0]);
      rows.push(['"Variance"', d.variance || 0, '']);
      return [headers.join(','), ...rows.map((e: any) => e.join(','))].join('\n');
    }

    // ── Cash Flow CSV (exact replica of CashFlowPage.handleExportCSV) ──
    if (reportPath === '/reports/cash-flow') {
      const rows: any[][] = [
        ['SECTION', 'PARTICULARS', 'INFLOW / (OUTFLOW)'],
        ['Cash at Beginning of Period', '', d.openingCash || 0],
        [],
        ['1. OPERATING ACTIVITIES', 'Operating Inflows', d.operating?.inflow || 0],
        ['', 'Operating Outflows', -(d.operating?.outflow || 0)],
        ['', 'Net Operating Cash (A)', d.operating?.net || 0],
        [],
        ['2. INVESTING ACTIVITIES', 'Investing Inflows', d.investing?.inflow || 0],
        ['', 'Investing Outflows', -(d.investing?.outflow || 0)],
        ['', 'Net Investing Cash (B)', d.investing?.net || 0],
        [],
        ['3. FINANCING ACTIVITIES', 'Financing Inflows', d.financing?.inflow || 0],
        ['', 'Financing Outflows', -(d.financing?.outflow || 0)],
        ['', 'Net Financing Cash (C)', d.financing?.net || 0],
        [],
        ['NET CASH MOVEMENT', 'Net Change in Cash (A + B + C)', d.netChange || 0],
        ['Cash at End of Period', '', d.closingCash || 0]
      ];
      return rows.map(e => e.map((val: any) => typeof val === 'string' ? `"${val}"` : val).join(',')).join('\n');
    }

    // ── Fund Flow CSV (exact replica of FundFlowPage.handleExportCSV) ──
    if (reportPath === '/reports/fund-flow') {
      const rows: any[][] = [
        ['SECTION', 'PARTICULARS', 'OPENING', 'CLOSING', 'NET CHANGE'],
        ['1. WORKING CAPITAL'],
        ['Current Assets', '', d.workingCapital?.openingCurrentAssets || 0, d.workingCapital?.closingCurrentAssets || 0, (d.workingCapital?.closingCurrentAssets || 0) - (d.workingCapital?.openingCurrentAssets || 0)],
        ['Current Liabilities', '', d.workingCapital?.openingCurrentLiabilities || 0, d.workingCapital?.closingCurrentLiabilities || 0, (d.workingCapital?.closingCurrentLiabilities || 0) - (d.workingCapital?.openingCurrentLiabilities || 0)],
        ['Working Capital', '', d.workingCapital?.openingWorkingCapital || 0, d.workingCapital?.closingWorkingCapital || 0, d.workingCapital?.change || 0],
        [],
        ['2. SOURCES OF FUNDS'],
        ...(d.sources || []).map((s: any) => [s.description, '', '', '', s.amount]),
        ['Total Sources', '', '', '', d.sourcesTotal || 0],
        [],
        ['3. APPLICATION OF FUNDS'],
        ...(d.applications || []).map((a: any) => [a.description, '', '', '', a.amount]),
        ['Total Applications', '', '', '', d.applicationsTotal || 0],
      ];
      return rows.map(e => e.map((val: any) => typeof val === 'string' ? `"${val}"` : val).join(',')).join('\n');
    }

    // ── Stock Report CSV (exact replica of StockReportPage.handleExportCSV REGISTER tab) ──
    if (reportPath === '/reports/stock') {
      const rows: any[][] = [];
      rows.push(['STOCK REPORT SUMMARY']);
      rows.push(['Total Packets', d.summary?.totalPackets || 0, `${ (d.summary?.totalCarats || 0).toFixed(3) } Cts`]);
      rows.push(['Total Valuation', `₹${ (d.summary?.totalValuation || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }) } `]);
      rows.push([]);
      rows.push(['PACKET NUMBER', 'QUALITY', 'SHAPE', 'COLOR', 'CLARITY', 'CARATS', 'RATE', 'VALUE', 'STATUS', 'LOCATION']);
      (d.packets || []).forEach((p: any) => {
        rows.push([
          `"${p.stockIdNumber || p.packetNumber || ''}"`,
          `"${p.qualityName || '—'}"`,
          `"${p.shape || '—'}"`,
          `"${p.color || '—'}"`,
          `"${p.clarity || '—'}"`,
          p.caratWeight || p.carats || 0,
          p.costRate || 0,
          p.totalValue || p.valuation || 0,
          `"${p.currentStatus || p.status || '—'}"`,
          `"${p.location || '—'}"`
        ]);
      });
      return rows.map(e => e.join(',')).join('\n');
    }

    // ── Day Book CSV (exact replica of DayBookPage.handleExportCSV) ──
    if (reportPath === '/reports/day-book') {
      const headers = ['VOUCHER NO', 'TYPE', 'PARTICULARS', 'DEBIT (DR)', 'CREDIT (CR)', 'NARRATION'];
      const rows = (d.transactions || []).map((t: any) => [
        `"${t.voucherNumber || ''}"`,
        `"${t.voucherType || ''}"`,
        `"${t.accountName || ''}"`,
        t.debitCreditType === 'DEBIT' ? t.amount : 0,
        t.debitCreditType === 'CREDIT' ? t.amount : 0,
        `"${t.narration || ''}"`
      ]);
      return [headers.join(','), ...rows.map((e: any) => e.join(','))].join('\n');
    }

    // ── Outstanding CSV ──
    if (reportPath === '/reports/outstanding') {
      const entries = Array.isArray(d) ? d : [];
      const headers = ['ACCOUNT NAME', 'TOTAL OUTSTANDING', '0-30 DAYS', '31-60 DAYS', '61-90 DAYS', '91-180 DAYS', '181-365 DAYS', '>365 DAYS'];
      const rows = entries.map((e: any) => [
        `"${e.accountName || ''}"`,
        e.totalOutstanding || 0,
        e.aging?.bucket_0_30 || 0,
        e.aging?.bucket_31_60 || 0,
        e.aging?.bucket_61_90 || 0,
        e.aging?.bucket_91_180 || 0,
        e.aging?.bucket_181_365 || 0,
        e.aging?.bucket_above_365 || 0
      ]);
      return [headers.join(','), ...rows.map((e: any) => e.join(','))].join('\n');
    }

    return 'No data available for this report type.';
  };

  // ═══════════════════════════════════════════════════════════════════
  // XLSX GENERATORS — Exact replicas using SheetJS (xlsx)
  // ═══════════════════════════════════════════════════════════════════

  const generateXLSXBase64 = (reportPath: string, d: any): string => {
    let rows: any[][] = [];
    let sheetName = 'Statement';

    // ── Balance Sheet XLSX ──
    if (reportPath === '/reports/balance-sheet') {
      sheetName = 'Balance Sheet';
      rows = [
        ['DIAMO ERP — BALANCE SHEET'],
        ['Company:', activeCompany?.companyName || 'DIAMO'],
        ['Date Generated:', new Date().toLocaleString('en-IN')],
        [],
        ['LIABILITIES & CAPITAL', '', 'ASSETS', ''],
        ['Group Name', 'Amount', 'Group Name', 'Amount'],
      ];
      const liabList = [...(d.capital || []).map((c: any) => ({ name: c.groupName, amount: c.amount })), ...(d.liabilities || []).map((l: any) => ({ name: l.groupName, amount: l.amount }))];
      const maxLen = Math.max(liabList.length, (d.assets || []).length);
      for (let i = 0; i < maxLen; i++) {
        const liab = liabList[i] || { name: '', amount: '' };
        const asset = (d.assets || [])[i] || { name: '', amount: '' };
        rows.push([liab.name, liab.amount, asset.name, asset.amount]);
      }
      rows.push([]);
      rows.push(['Total Liabilities & Capital', (d.totalLiabilities || 0) + (d.totalCapital || 0), 'Total Assets', d.totalAssets || 0]);

    // ── Profit & Loss XLSX ──
    } else if (reportPath === '/reports/profit-loss') {
      sheetName = 'Profit & Loss';
      rows = [
        ['DIAMO ERP — PROFIT & LOSS STATEMENT'],
        ['Company:', activeCompany?.companyName || 'DIAMO'],
        ['Date Generated:', new Date().toLocaleString('en-IN')],
        [],
        ['SECTION', 'PARTICULARS', 'AMOUNT'],
        ['1. REVENUE', 'Sales Income', d.revenue?.sales || 0],
        ['', 'Job Work Income', d.revenue?.jobWorkIncome || 0],
        ['', 'Total Revenue (A)', d.revenue?.total || 0],
        [],
        ['2. COST OF SALES', 'Purchases', d.costOfGoods?.purchases || 0],
        ['', 'Job Work Expenses', d.costOfGoods?.jobWorkExpense || 0],
        ['', 'Direct Expenses', d.costOfGoods?.directExpense || 0],
        ['', 'Total Cost of Sales (B)', d.costOfGoods?.total || 0],
        [],
        ['GROSS PROFIT', 'Gross Profit (A - B)', d.grossProfit || 0],
        [],
        ['3. OPERATING EXPENSES', 'Indirect & Operating Expenses', d.expenses?.operatingExpense || 0],
        ['', 'Total Operating Expenses (C)', d.expenses?.total || 0],
        [],
        ['4. OTHER INCOME', 'Interest & Other Incomes (D)', d.otherIncome || 0],
        [],
        ['NET PROFIT', 'Net Profit For The Period', d.netProfit || 0],
      ];

    // ── Trial Balance XLSX ──
    } else if (reportPath === '/reports/trial-balance') {
      sheetName = 'Trial Balance';
      rows = [
        ['DIAMO ERP — TRIAL BALANCE'],
        ['Company:', activeCompany?.companyName || 'DIAMO'],
        ['Date Generated:', new Date().toLocaleString('en-IN')],
        [],
        ['ACCOUNT GROUP', 'DEBIT (Dr)', 'CREDIT (Cr)'],
      ];
      (d.groups || []).forEach((g: any) => { rows.push([g.groupName, g.debit, g.credit]); });
      rows.push(['Total Balance', d.totalDebit || 0, d.totalCredit || 0]);
      rows.push(['Variance', d.variance || 0, '']);

    // ── Cash Flow XLSX ──
    } else if (reportPath === '/reports/cash-flow') {
      sheetName = 'Cash Flow';
      rows = [
        ['DIAMO ERP — CASH FLOW STATEMENT'],
        ['Company:', activeCompany?.companyName || 'DIAMO'],
        ['Date Generated:', new Date().toLocaleString('en-IN')],
        [],
        ['SECTION', 'PARTICULARS', 'AMOUNT'],
        ['Opening Balance', '', d.openingCash || 0],
        [],
        ['1. OPERATING', 'Inflows', d.operating?.inflow || 0],
        ['', 'Outflows', -(d.operating?.outflow || 0)],
        ['', 'Net Operating Cash (A)', d.operating?.net || 0],
        [],
        ['2. INVESTING', 'Inflows', d.investing?.inflow || 0],
        ['', 'Outflows', -(d.investing?.outflow || 0)],
        ['', 'Net Investing Cash (B)', d.investing?.net || 0],
        [],
        ['3. FINANCING', 'Inflows', d.financing?.inflow || 0],
        ['', 'Outflows', -(d.financing?.outflow || 0)],
        ['', 'Net Financing Cash (C)', d.financing?.net || 0],
        [],
        ['NET CASH MOVEMENT', 'Net Change (A+B+C)', d.netChange || 0],
        ['CLOSING BALANCE', '', d.closingCash || 0],
      ];

    // ── Fund Flow XLSX ──
    } else if (reportPath === '/reports/fund-flow') {
      sheetName = 'Fund Flow';
      rows = [
        ['DIAMO ERP — FUND FLOW STATEMENT'],
        ['Company:', activeCompany?.companyName || 'DIAMO'],
        ['Date Generated:', new Date().toLocaleString('en-IN')],
        [],
        ['SECTION', 'PARTICULARS', 'OPENING', 'CLOSING', 'NET CHANGE'],
        ['Working Capital'],
        ['', 'Current Assets', d.workingCapital?.openingCurrentAssets || 0, d.workingCapital?.closingCurrentAssets || 0, (d.workingCapital?.closingCurrentAssets || 0) - (d.workingCapital?.openingCurrentAssets || 0)],
        ['', 'Current Liabilities', d.workingCapital?.openingCurrentLiabilities || 0, d.workingCapital?.closingCurrentLiabilities || 0, (d.workingCapital?.closingCurrentLiabilities || 0) - (d.workingCapital?.openingCurrentLiabilities || 0)],
        ['', 'Net Working Capital', d.workingCapital?.openingWorkingCapital || 0, d.workingCapital?.closingWorkingCapital || 0, d.workingCapital?.change || 0],
        [],
        ['Sources of Funds'],
        ...(d.sources || []).map((s: any) => ['', s.description, '', '', s.amount]),
        ['', 'Total Sources', '', '', d.sourcesTotal || 0],
        [],
        ['Application of Funds'],
        ...(d.applications || []).map((a: any) => ['', a.description, '', '', a.amount]),
        ['', 'Total Applications', '', '', d.applicationsTotal || 0],
      ];

    // ── Stock XLSX ──
    } else if (reportPath === '/reports/stock') {
      sheetName = 'Stock Report';
      rows = [
        ['DIAMO ERP — STOCK REPORT'],
        ['Company:', activeCompany?.companyName || 'DIAMO'],
        ['Date Generated:', new Date().toLocaleString('en-IN')],
        ['Total Packets:', d.summary?.totalPackets || 0],
        ['Total Carats:', (d.summary?.totalCarats || 0).toFixed(3)],
        ['Total Valuation:', d.summary?.totalValuation || 0],
        [],
        ['PACKET NUMBER', 'QUALITY', 'SHAPE', 'COLOR', 'CLARITY', 'CARATS', 'RATE', 'VALUE', 'STATUS', 'LOCATION'],
      ];
      (d.packets || []).forEach((p: any) => {
        rows.push([p.stockIdNumber || p.packetNumber || '', p.qualityName || '—', p.shape || '—', p.color || '—', p.clarity || '—', p.caratWeight || p.carats || 0, p.costRate || 0, p.totalValue || p.valuation || 0, p.currentStatus || p.status || '—', p.location || '—']);
      });

    // ── Day Book XLSX ──
    } else if (reportPath === '/reports/day-book') {
      sheetName = 'Day Book';
      rows = [
        ['DIAMO ERP — DAY BOOK'],
        ['Company:', activeCompany?.companyName || 'DIAMO'],
        ['Date Generated:', new Date().toLocaleString('en-IN')],
        [],
        ['VOUCHER NO', 'TYPE', 'PARTICULARS', 'DEBIT (DR)', 'CREDIT (CR)', 'NARRATION'],
      ];
      (d.transactions || []).forEach((t: any) => {
        rows.push([t.voucherNumber || '', t.voucherType || '', t.accountName || '', t.debitCreditType === 'DEBIT' ? t.amount : 0, t.debitCreditType === 'CREDIT' ? t.amount : 0, t.narration || '']);
      });

    // ── Outstanding XLSX ──
    } else if (reportPath === '/reports/outstanding') {
      sheetName = 'Outstanding';
      rows = [
        ['DIAMO ERP — OUTSTANDING STATEMENTS'],
        ['Company:', activeCompany?.companyName || 'DIAMO'],
        ['Date Generated:', new Date().toLocaleString('en-IN')],
        [],
        ['ACCOUNT NAME', 'TOTAL OUTSTANDING', '0-30 DAYS', '31-60 DAYS', '61-90 DAYS', '91-180 DAYS', '181-365 DAYS', '>365 DAYS'],
      ];
      const entries = Array.isArray(d) ? d : [];
      entries.forEach((e: any) => {
        rows.push([e.accountName || '', e.totalOutstanding || 0, e.aging?.bucket_0_30 || 0, e.aging?.bucket_31_60 || 0, e.aging?.bucket_61_90 || 0, e.aging?.bucket_91_180 || 0, e.aging?.bucket_181_365 || 0, e.aging?.bucket_above_365 || 0]);
      });
    } else {
      rows = [['No data available for this report type.']];
    }

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    return XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
  };


  // Trigger Schedule Now (Offline export execution with real PDF and XLSX)
  const triggerScheduleNow = async (s: any, triggerType: 'Manual Force Run' | 'Auto Schedule' = 'Manual Force Run') => {
    const dateStr = new Date().toLocaleString('en-IN', { hour12: true });
    const versionNum = `v1.0.${archives.length + 1}`;
    const today = new Date().toISOString().split('T')[0];
    const filename = `${s.name.replace(/\s+/g, '_')}_${today}.${s.format.toLowerCase()}`;

    if (!companyId) {
      if (triggerType === 'Manual Force Run') alert('Error: No active company selected.');
      return;
    }

    try {
      let res: any;
      let reportPath = s.reportPath;
      if (!reportPath) {
        if (s.name.toLowerCase().includes('balance')) reportPath = '/reports/balance-sheet';
        else if (s.name.toLowerCase().includes('profit') || s.name.toLowerCase().includes('loss')) reportPath = '/reports/profit-loss';
        else if (s.name.toLowerCase().includes('cash')) reportPath = '/reports/cash-flow';
        else if (s.name.toLowerCase().includes('fund')) reportPath = '/reports/fund-flow';
        else if (s.name.toLowerCase().includes('trial')) reportPath = '/reports/trial-balance';
        else if (s.name.toLowerCase().includes('stock')) reportPath = '/reports/stock';
        else if (s.name.toLowerCase().includes('day')) reportPath = '/reports/day-book';
        else if (s.name.toLowerCase().includes('outstanding')) reportPath = '/reports/outstanding';
      }

      // ── Unified data fetch for all report types ──
      const fetchReportData = async (): Promise<any> => {
        const payload = { companyId };
        let fetchRes: any;
        if (reportPath === '/reports/profit-loss') {
          fetchRes = await window.api.invoke('report:profit-loss', payload);
        } else if (reportPath === '/reports/balance-sheet') {
          fetchRes = await window.api.invoke('report:balance-sheet', payload);
        } else if (reportPath === '/reports/cash-flow') {
          fetchRes = await window.api.invoke('report:cash-flow', payload);
        } else if (reportPath === '/reports/fund-flow') {
          fetchRes = await window.api.invoke('report:fund-flow', payload);
        } else if (reportPath === '/reports/trial-balance') {
          fetchRes = await window.api.invoke('report:trial-balance', payload);
        } else if (reportPath === '/reports/stock') {
          fetchRes = await window.api.invoke('report:stock', { companyId, filters: {} });
        } else if (reportPath === '/reports/day-book') {
          const todayStr = new Date().toISOString().split('T')[0];
          fetchRes = await window.api.invoke('report:day-book', { companyId, dateStr: todayStr });
        } else if (reportPath === '/reports/outstanding') {
          fetchRes = await window.api.invoke('report:outstanding', { companyId, type: 'RECEIVABLE' });
        }
        return (fetchRes && fetchRes.success) ? fetchRes.data : {};
      };

      const rawData = await fetchReportData();

      if (s.format.toUpperCase() === 'PDF') {
        const htmlContent = generateReportHTML(reportPath, activeCompany?.companyName || 'DIAMO', rawData);
        res = await window.api.invoke('system:print-pdf-direct', {
          html: htmlContent,
          targetPath: s.destinationFolder,
          filename
        });
      } else if (s.format.toUpperCase() === 'XLSX') {
        const base64Content = generateXLSXBase64(reportPath, rawData);
        res = await window.api.invoke('system:save-file-direct', {
          targetPath: s.destinationFolder,
          filename,
          content: base64Content,
          encoding: 'base64'
        });
      } else {
        const csvContent = generateCSVContent(reportPath, rawData);
        res = await window.api.invoke('system:save-file-direct', {
          targetPath: s.destinationFolder,
          filename,
          content: csvContent
        });
      }

      if (res && res.success) {
        const newArchive = {
          id: Date.now().toString() + Math.random().toString(36).substring(2, 7),
          version: versionNum,
          name: s.name,
          date: dateStr,
          format: s.format,
          trigger: triggerType,
          params: `FY 2026-27, Saved Path: ${res.filePath}`,
          filePath: res.filePath,
          timestamp: Date.now()
        };
        
        const updatedArchives = [newArchive, ...archives];
        setArchives(updatedArchives);
        localStorage.setItem('diamo_report_archives', JSON.stringify(updatedArchives));

        if (triggerType === 'Manual Force Run') {
          alert(`Successfully generated report "${s.name}" (${s.format}) and actually saved to your computer disk at: \n${res.filePath}`);
        }
      } else {
        if (triggerType === 'Manual Force Run') {
          alert(`Failed to save report to local disk: ${res?.error || 'Unknown error'}`);
        }
      }
    } catch (err: any) {
      if (triggerType === 'Manual Force Run') {
        alert(`Error writing report file to disk: ${err.message}`);
      }
    }
  };



  // Styles
  const cardStyle: React.CSSProperties = {
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: '8px',
    padding: '20px',
    boxShadow: 'var(--shadow-sm)',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  };

  const activeTabStyle = (tab: IntelligenceTab): React.CSSProperties => ({
    padding: '10px 16px',
    fontSize: '13px',
    fontWeight: 600,
    background: activeTab === tab ? 'var(--color-primary)' : 'transparent',
    color: activeTab === tab ? '#ffffff' : 'var(--color-text-secondary)',
    border: 'none',
    borderRadius: '6px 6px 0 0',
    cursor: 'pointer',
    outline: 'none',
    transition: 'all var(--transition-fast)'
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 'var(--spacing-lg)' }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Report Intelligence & Automation</h2>
        <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
          Pin favorite views, parse natural language queries, and schedule automated report exports directly on your machine.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', gap: '8px' }}>
        <button style={activeTabStyle('SEARCH_LIBRARY')} onClick={() => setActiveTab('SEARCH_LIBRARY')}>
          Library & Pinboard
        </button>
        <button style={activeTabStyle('AUTOMATION')} onClick={() => setActiveTab('AUTOMATION')}>
          Automation Schedules
        </button>
        <button style={activeTabStyle('ARCHIVES')} onClick={() => setActiveTab('ARCHIVES')}>
          Generated Archives
        </button>
      </div>

      {/* Tab Contents */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {activeTab === 'SEARCH_LIBRARY' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
            
            {/* Search Input Box */}
            <div style={cardStyle}>
              <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Smart Search Parser</h3>
              <div style={{ display: 'flex', position: 'relative', width: '100%' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '11px', color: 'var(--color-text-secondary)', zIndex: 10 }} />
                <input
                  type="text"
                  placeholder="Type queries like 'debtors over 50k', 'GST outputs', 'net margin'..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 36px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-surface)',
                    fontSize: '13px',
                    outline: 'none',
                    height: '38px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              {searchSuggestion && (
                <div style={{ background: 'var(--color-primary-light)', padding: '10px 16px', borderRadius: '6px', fontSize: '13px', color: 'var(--color-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>💡 <strong>Query parsed:</strong> {searchSuggestion.text}</span>
                  <Button variant="primary" onClick={() => navigate(searchSuggestion.path)} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', fontSize: '12px' }}>
                    Go to Report <ArrowRight size={14} />
                  </Button>
                </div>
              )}
            </div>

            {/* Pinned Favorites */}
            {favorites.length > 0 && (
              <div style={cardStyle}>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#e67e22', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Star size={18} fill="#e67e22" /> Pinned Favorites
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                  {ALL_REPORTS.filter(r => favorites.includes(r.path)).map((r) => (
                    <div key={r.path} style={{ border: '1px solid var(--color-border)', padding: '12px', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: 'rgba(230, 126, 34, 0.03)' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '13px' }}>{r.name}</div>
                        <span style={{ fontSize: '10px', background: 'var(--color-border)', padding: '2px 6px', borderRadius: '4px', display: 'inline-block', marginTop: '6px' }}>{r.category}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <Button variant="ghost" onClick={() => navigate(r.path)} style={{ padding: '6px' }} title="Open Report">
                          <Play size={14} style={{ color: 'var(--color-primary)' }} />
                        </Button>
                        <Button variant="ghost" onClick={() => toggleFavorite(r.path)} style={{ padding: '6px' }} title="Unpin">
                          <Star size={14} fill="#e67e22" style={{ color: '#e67e22' }} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Library Grid */}
            <div style={cardStyle}>
              <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Diamo ERP Report Index</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                {(searchResults.length > 0 ? searchResults : ALL_REPORTS).map((r) => {
                  const isPinned = favorites.includes(r.path);
                  return (
                    <div key={r.path} style={{ border: '1px solid var(--color-border)', padding: '16px', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ flex: 1, paddingRight: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 700, fontSize: '14px' }}>{r.name}</span>
                          <span style={{ fontSize: '10px', background: 'var(--color-border)', padding: '2px 6px', borderRadius: '4px' }}>{r.category}</span>
                        </div>
                        <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>{r.desc}</p>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <Button variant="ghost" onClick={() => toggleFavorite(r.path)} style={{ padding: '8px' }}>
                          <Star size={16} fill={isPinned ? '#e67e22' : 'none'} style={{ color: isPinned ? '#e67e22' : 'var(--color-text-secondary)' }} />
                        </Button>
                        <Button variant="primary" onClick={() => navigate(r.path)} style={{ padding: '8px 12px', fontSize: '12px' }}>
                          Open
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}

        {activeTab === 'AUTOMATION' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
            
            {/* Create Schedule Card */}
            <div style={cardStyle}>
              <h3 style={{ fontSize: '15px', fontWeight: 700 }}><Plus size={18} style={{ display: 'inline-block', marginRight: '6px' }} /> Create Automated Report export</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 2.5fr 1.2fr 1.2fr auto', gap: '12px', alignItems: 'flex-end' }}>
                <div>
                  <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Select Report</span>
                  <select
                    value={newSched.reportPath}
                    onChange={(e) => setNewSched({ ...newSched, reportPath: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', fontSize: '13px', outline: 'none' }}
                  >
                    {ALL_REPORTS.map(r => (
                      <option key={r.path} value={r.path}>{r.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Destination Folder Path</span>
                  <Input placeholder="Documents/DIAMO_Auto_Exports" value={newSched.destinationFolder} onChange={(e) => setNewSched({ ...newSched, destinationFolder: e.target.value })} />
                </div>
                <div>
                  <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Frequency</span>
                  <select
                    value={newSched.frequency}
                    onChange={(e) => setNewSched({ ...newSched, frequency: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', fontSize: '13px', outline: 'none' }}
                  >
                    <option value="Daily">Daily</option>
                    <option value="Weekly">Weekly</option>
                    <option value="Monthly">Monthly</option>
                    <option value="Quarterly">Quarterly</option>
                  </select>
                </div>
                <div>
                  <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Format</span>
                  <select
                    value={newSched.format}
                    onChange={(e) => setNewSched({ ...newSched, format: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', fontSize: '13px', outline: 'none' }}
                  >
                    <option value="PDF">PDF</option>
                    <option value="CSV">CSV</option>
                  </select>
                </div>
                <Button variant="primary" onClick={addSchedule} style={{ padding: '10px 24px', height: '37px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  Add
                </Button>
              </div>
            </div>

            {/* Schedules list */}
            <div style={cardStyle}>
              <h3 style={{ fontSize: '15px', fontWeight: 700 }}><Calendar size={18} style={{ display: 'inline-block', marginRight: '6px' }} /> Active local export schedules</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {schedules.map((s) => (
                  <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', border: '1px solid var(--color-border)', borderRadius: '6px' }}>
                    <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(37, 99, 235, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Folder size={16} style={{ color: '#2563eb' }} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '14px' }}>{s.name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Backup Path: {s.destinationFolder} | Frequency: {s.frequency} | Format: {s.format}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '11px', background: '#e8f8f5', color: '#1abc9c', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>{s.status}</span>
                      <Button variant="ghost" onClick={() => triggerScheduleNow(s)} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 10px', fontSize: '12px', color: 'var(--color-primary)' }}>
                        Trigger Now
                      </Button>
                      <Button variant="ghost" onClick={() => deleteSchedule(s.id)} style={{ padding: '6px' }}>
                        <Trash2 size={16} style={{ color: 'var(--color-error)' }} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {activeTab === 'ARCHIVES' && (
          <div style={cardStyle}>
            <h3 style={{ fontSize: '15px', fontWeight: 700 }}><Archive size={18} style={{ display: 'inline-block', marginRight: '6px' }} /> Local version archives</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[...archives].sort((a, b) => {
                const parseDate = (dStr: string) => {
                  try {
                    const cleanStr = dStr.replace(/,/g, '').trim();
                    const parts = cleanStr.split(' ')[0].split('/');
                    if (parts.length === 3) {
                      return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0])).getTime();
                    }
                  } catch (e) {}
                  const parsed = Date.parse(dStr);
                  return isNaN(parsed) ? 0 : parsed;
                };
                const timeA = a.timestamp || parseDate(a.date);
                const timeB = b.timestamp || parseDate(b.date);
                return timeB - timeA;
              }).map((a, idx) => (
                <div key={idx} style={{ padding: '14px', border: '1px solid var(--color-border)', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 700 }}>{a.name}</span>
                      <span style={{ fontSize: '11px', background: 'var(--color-border)', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>{a.version}</span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                      Generated: {a.date} | Trigger: {a.trigger} | Filters: {a.params}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Button variant="ghost" onClick={() => openArchiveFile(a)} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                      <FileText size={14} /> Open Version
                    </Button>
                    <Button variant="ghost" onClick={() => deleteArchiveEntry(a.id)} style={{ padding: '6px' }}>
                      <Trash2 size={16} style={{ color: 'var(--color-error)' }} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
