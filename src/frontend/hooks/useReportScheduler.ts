import { useEffect, useRef } from 'react';
import { useActiveCompany } from './useActiveCompany';
import * as XLSX from 'xlsx';
import {
  getBalanceSheetPDFHtml,
  getProfitLossPDFHtml,
  getTrialBalancePDFHtml,
  getCashFlowPDFHtml,
  getFundFlowPDFHtml,
  getStockReportPDFHtml,
  getDayBookPDFHtml,
  getOutstandingPDFHtml
} from '../utils/reportExports';

export const useReportScheduler = () => {
  const { activeCompany, companyId } = useActiveCompany();
  const checkingRef = useRef(false);

  // CSV GENERATORS
  const generateCSVContent = (reportPath: string, d: any): string => {
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

    if (reportPath === '/reports/profit-loss') {
      const rows = [
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
      return rows.map(e => e.map(val => typeof val === 'string' ? `"${val}"` : val).join(',')).join('\n');
    }

    if (reportPath === '/reports/trial-balance') {
      const rows = [
        ['ACCOUNT GROUP', 'DEBIT (DR)', 'CREDIT (CR)'],
        ...(d.groups || []).map((g: any) => [`"${g.groupName || ''}"`, g.debit || 0, g.credit || 0]),
        ['Total Balance', d.totalDebit || 0, d.totalCredit || 0],
        ['Variance', d.variance || 0, '']
      ];
      return rows.map(e => e.join(',')).join('\n');
    }

    if (reportPath === '/reports/cash-flow') {
      const rows = [
        ['SECTION', 'PARTICULARS', 'AMOUNT'],
        ['Opening Cash Balance', '', d.openingCash || 0],
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

    if (reportPath === '/reports/stock') {
      const rows: any[][] = [];
      rows.push(['STOCK REPORT SUMMARY']);
      rows.push(['Total Packets', d.summary?.totalPackets || 0, `${(d.summary?.totalCarats || 0).toFixed(3)} Cts`]);
      rows.push(['Total Valuation', `₹${(d.summary?.totalValuation || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`]);
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

  // XLSX GENERATORS
  const generateXLSXBase64 = (reportPath: string, d: any): string => {
    let rows: any[][] = [];
    let sheetName = 'Statement';

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
    }

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    return XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
  };

  // HTML GENERATOR
  const generateReportHTML = (reportPath: string, d: any): string => {
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

  // TRIGGER LOGIC
  const triggerSchedule = async (s: any) => {
    const dateStr = new Date().toLocaleString('en-IN', { hour12: true });
    
    // Load fresh archives count for versioning
    const archList = localStorage.getItem('diamo_report_archives');
    const archivesCount = archList ? JSON.parse(archList).length : 0;
    const versionNum = `v1.0.${archivesCount + 1}`;
    
    const today = new Date().toISOString().split('T')[0];
    const filename = `${s.name.replace(/\s+/g, '_')}_${today}.${s.format.toLowerCase()}`;

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
      fetchRes = await window.api.invoke('report:day-book', { companyId, dateStr: today });
    } else if (reportPath === '/reports/outstanding') {
      fetchRes = await window.api.invoke('report:outstanding', { companyId, type: 'RECEIVABLE' });
    }

    const rawData = (fetchRes && fetchRes.success) ? fetchRes.data : {};
    let res: any;

    if (s.format.toUpperCase() === 'PDF') {
      const htmlContent = generateReportHTML(reportPath, rawData);
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
        trigger: 'Auto Schedule',
        params: `FY 2026-27, Saved Path: ${res.filePath}`,
        filePath: res.filePath,
        timestamp: Date.now()
      };
      
      const currentList = localStorage.getItem('diamo_report_archives');
      const parsedList = currentList ? JSON.parse(currentList) : [];
      const updatedList = [newArchive, ...parsedList];
      localStorage.setItem('diamo_report_archives', JSON.stringify(updatedList));
      
      // Dispatch storage event so open page views update automatically
      window.dispatchEvent(new Event('storage'));
    }
  };

  useEffect(() => {
    if (!companyId || !activeCompany || checkingRef.current) return;

    checkingRef.current = true;

    // Run immediately on boot / mount (Catch-up Check)
    const runSchedulerCheck = () => {
      const schedList = localStorage.getItem('diamo_report_schedules');
      if (!schedList) return;

      const schedules = JSON.parse(schedList);
      const todayStr = new Date().toISOString().split('T')[0];
      const today = new Date();
      let updatedSchedules = [...schedules];
      let didTrigger = false;

      schedules.forEach((s: any, idx: number) => {
        if (s.status !== 'ACTIVE') return;

        let shouldTrigger = false;
        const lastTriggered = s.lastTriggered;

        if (!lastTriggered) {
          shouldTrigger = true;
        } else {
          const lastDate = new Date(lastTriggered);
          const diffTime = Math.abs(today.getTime() - lastDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (s.frequency === 'Daily') {
            shouldTrigger = lastTriggered !== todayStr;
          } else if (s.frequency === 'Weekly') {
            shouldTrigger = diffDays >= 7;
          } else if (s.frequency === 'Monthly') {
            const currentMonthYear = `${today.getFullYear()}-${today.getMonth()}`;
            const lastMonthYear = `${lastDate.getFullYear()}-${lastDate.getMonth()}`;
            shouldTrigger = currentMonthYear !== lastMonthYear;
          } else if (s.frequency === 'Quarterly') {
            const currentQuarter = Math.floor(today.getMonth() / 3);
            const lastQuarter = Math.floor(lastDate.getMonth() / 3);
            const currentYear = today.getFullYear();
            const lastYear = lastDate.getFullYear();
            shouldTrigger = currentYear !== lastYear || currentQuarter !== lastQuarter;
          }
        }

        if (shouldTrigger) {
          didTrigger = true;
          updatedSchedules[idx] = { ...s, lastTriggered: todayStr };
          triggerSchedule(s).catch(err => {
            console.error('Failed offline trigger catch-up run', s.name, err);
          });
        }
      });

      if (didTrigger) {
        localStorage.setItem('diamo_report_schedules', JSON.stringify(updatedSchedules));
        window.dispatchEvent(new Event('storage'));
      }
    };

    runSchedulerCheck();

    // Set up continuous background check every 60 seconds
    const interval = setInterval(runSchedulerCheck, 60000);

    return () => {
      clearInterval(interval);
      checkingRef.current = false;
    };
  }, [companyId, activeCompany]);
};
