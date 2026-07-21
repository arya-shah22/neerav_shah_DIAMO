// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Unified Report Export Utility
// ═══════════════════════════════════════════════════════════════

export const fmt = (v: number) => {
  const absVal = Math.abs(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return v < 0 ? `₹(${absVal})` : `₹${absVal}`;
};

export const fmtAmt = (v: number) => {
  return `₹${Math.abs(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const formatAmount = (amount: number) => {
  if (amount === undefined || amount === null) return '₹0.00';
  const isNeg = amount < 0;
  const formatted = Math.abs(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return isNeg ? `₹${formatted} Cr` : `₹${formatted} Dr`;
};

export const getBalanceSheetCSV = (bsData: any) => {
  const rows = [
    ['LIABILITIES & CAPITAL', '', 'ASSETS', ''],
    ['Group Name', 'Amount', 'Group Name', 'Amount'],
  ];

  const maxLength = Math.max(
    bsData.capital.length + bsData.liabilities.length,
    bsData.assets.length
  );

  const liabList = [
    ...bsData.capital.map((c: any) => ({ name: c.groupName, amount: c.amount })),
    ...bsData.liabilities.map((l: any) => ({ name: l.groupName, amount: l.amount }))
  ];

  for (let i = 0; i < maxLength; i++) {
    const liab = liabList[i] || { name: '', amount: '' };
    const asset = bsData.assets[i] || { name: '', amount: '' };
    rows.push([
      liab.name ? `"${liab.name}"` : '',
      liab.amount,
      asset.name ? `"${asset.name}"` : '',
      asset.amount
    ]);
  }

  rows.push([]);
  rows.push([
    '"Total Liabilities & Capital"',
    bsData.totalLiabilities + bsData.totalCapital,
    '"Total Assets"',
    bsData.totalAssets
  ]);

  if (bsData.profitLossDetails) {
    const pl = bsData.profitLossDetails;
    rows.push([]);
    rows.push(['TRADING & PROFIT & LOSS SUMMARY']);
    rows.push(['Opening Stock', 0, 'Sales', pl.revenue.sales]);
    rows.push(['Purchases', pl.costOfGoods.purchases, 'Direct Income', pl.revenue.jobWorkIncome]);
    rows.push(['Direct Expenses', pl.costOfGoods.jobWorkExpense + pl.costOfGoods.directExpense, 'Indirect Income', pl.otherIncome]);
    rows.push(['Indirect Expenses', pl.expenses.operatingExpense, 'Closing Stock', 0]);
    rows.push([
      pl.netProfit < 0 ? 'NET LOSS' : '',
      pl.netProfit < 0 ? Math.abs(pl.netProfit) : '',
      pl.netProfit >= 0 ? 'NET PROFIT' : '',
      pl.netProfit >= 0 ? pl.netProfit : ''
    ]);
  }

  return rows.map(e => e.join(',')).join('\n');
};

export const getBalanceSheetPDFHtml = (bsData: any, activeCompany: any, filterDate: string) => {
  const pl = bsData.profitLossDetails;
  const plTotalLeft = pl ? (pl.costOfGoods.purchases + pl.costOfGoods.jobWorkExpense + pl.costOfGoods.directExpense + pl.expenses.operatingExpense + (pl.netProfit > 0 ? pl.netProfit : 0)) : 0;
  const plTotalRight = pl ? (pl.revenue.sales + pl.revenue.jobWorkIncome + pl.otherIncome + (pl.netProfit < 0 ? Math.abs(pl.netProfit) : 0)) : 0;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>BALANCE SHEET</title>
      <style>
        body {
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
          color: #1e293b;
          background: #ffffff;
          padding: 0;
          margin: 0;
          box-sizing: border-box;
        }
        .print-page {
          width: 210mm;
          min-height: 297mm;
          margin: 0 auto;
          box-sizing: border-box;
          background: #ffffff;
          padding: 20mm;
          font-size: 13px;
          color: #1e293b;
        }
        @media print {
          body { padding: 0; margin: 0; }
          .print-page { padding: 5mm 0 !important; width: 100% !important; border: none !important; box-shadow: none !important; }
        }
      </style>
    </head>
    <body>
      <div class="print-page">
        <div style="border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 24px;">
          <h2 style="font-size: 22px; font-weight: 800; margin: 0; text-transform: uppercase; color: #0f172a;">
            ${activeCompany.companyName}
          </h2>
          <p style="margin: 4px 0 0; color: #475569; font-size: 12px;">
            ${activeCompany.addressLine1} ${activeCompany.addressLine2 ? `, ${activeCompany.addressLine2}` : ''} | ${activeCompany.city} - ${activeCompany.pincode}
          </p>
          <div style="display: flex; justify-content: space-between; margin-top: 16px; font-size: 13px; font-weight: 600;">
            <span style="color: #2563eb;">BALANCE SHEET STATEMENT</span>
            <span>AS OF: ${new Date(filterDate).toLocaleDateString('en-IN')}</span>
          </div>
          ${bsData.variance > 0.01 ? `
            <div style="color: #dc2626; font-size: 12px; font-weight: bold; margin-top: 8px;">
              * Balance Sheet Difference: ₹${bsData.variance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          ` : ''}
        </div>

        <table style="width: 100%; table-layout: fixed; border-collapse: collapse; margin-bottom: 24px;">
          <tr>
            <!-- Liabilities Column -->
            <td style="width: 50%; vertical-align: top; padding-right: 12px;">
              <div style="display: flex; flex-direction: column; gap: 16px;">
                <h3 style="font-size: 14px; font-weight: 700; border-bottom: 2px solid #0f172a; padding-bottom: 6px; margin: 0;">LIABILITIES & CAPITAL</h3>
                <div>
                  <span style="font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase;">Capital & Reserves</span>
                  <div style="display: flex; flex-direction: column; gap: 6px; margin-top: 6px;">
                    ${bsData.capital.map((c: any) => `
                      <div style="display: flex; justify-content: space-between;">
                        <span>${c.groupName}</span>
                        <span>₹${c.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                    `).join('')}
                  </div>
                </div>
                <div>
                  <span style="font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase;">Liabilities</span>
                  <div style="display: flex; flex-direction: column; gap: 6px; margin-top: 6px;">
                    ${bsData.liabilities.map((l: any) => `
                      <div style="display: flex; justify-content: space-between;">
                        <span>${l.groupName}</span>
                        <span>₹${l.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                    `).join('')}
                  </div>
                </div>
                <div style="margin-top: auto; padding-top: 10px; border-top: 1.5px solid #0f172a; display: flex; justify-content: space-between; font-weight: 700;">
                  <span>Total Liabilities & Capital:</span>
                  <span>₹${(bsData.totalLiabilities + bsData.totalCapital).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </td>

            <!-- Assets Column -->
            <td style="width: 50%; vertical-align: top; padding-left: 12px;">
              <div style="display: flex; flex-direction: column; gap: 16px;">
                <h3 style="font-size: 14px; font-weight: 700; border-bottom: 2px solid #059669; padding-bottom: 6px; margin: 0; color: #059669;">ASSETS</h3>
                <div>
                  <span style="font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase;">Assets</span>
                  <div style="display: flex; flex-direction: column; gap: 6px; margin-top: 6px;">
                    ${bsData.assets.map((a: any) => `
                      <div style="display: flex; justify-content: space-between;">
                        <span>${a.groupName}</span>
                        <span>₹${a.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                    `).join('')}
                  </div>
                </div>
                <div style="margin-top: auto; padding-top: 10px; border-top: 1.5px solid #059669; display: flex; justify-content: space-between; font-weight: 700; color: #059669;">
                  <span>Total Assets:</span>
                  <span>₹${bsData.totalAssets.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </td>
          </tr>
        </table>

        ${pl ? `
          <div style="margin-top: 30px; border-top: 1px solid #cbd5e1; padding-top: 20px;">
            <h3 style="font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 12px; text-align: center;">
              TRADING & PROFIT & LOSS ACCOUNT SUMMARY
            </h3>
            <table style="width: 100%; table-layout: fixed; border-collapse: collapse;">
              <tr>
                <td style="width: 50%; vertical-align: top; padding-right: 12px;">
                  <div style="display: flex; flex-direction: column; gap: 8px;">
                    <div style="display: flex; justify-content: space-between;">
                      <span>Opening Stock:</span>
                      <span>₹0.00</span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                      <span>Purchases:</span>
                      <span>₹${pl.costOfGoods.purchases.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                      <span>Direct Expenses:</span>
                      <span>₹${(pl.costOfGoods.jobWorkExpense + pl.costOfGoods.directExpense).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                      <span>Indirect Expenses:</span>
                      <span>₹${pl.expenses.operatingExpense.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    ${pl.netProfit > 0 ? `
                      <div style="display: flex; justify-content: space-between; color: #047857; font-weight: 600;">
                        <span>NET PROFIT:</span>
                        <span>₹${pl.netProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                    ` : ''}
                    <div style="margin-top: auto; padding-top: 10px; border-top: 1.5px solid #0f172a; display: flex; justify-content: space-between; font-weight: 700;">
                      <span>Total:</span>
                      <span>₹${plTotalLeft.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </td>

                <td style="width: 50%; vertical-align: top; padding-left: 12px;">
                  <div style="display: flex; flex-direction: column; gap: 8px;">
                    <div style="display: flex; justify-content: space-between;">
                      <span>Sales:</span>
                      <span>₹${pl.revenue.sales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                      <span>Direct Income:</span>
                      <span>₹${pl.revenue.jobWorkIncome.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                      <span>Indirect Income:</span>
                      <span>₹${pl.otherIncome.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                      <span>Closing Stock:</span>
                      <span>₹0.00</span>
                    </div>
                    ${pl.netProfit < 0 ? `
                      <div style="display: flex; justify-content: space-between; color: #dc2626; font-weight: 600;">
                        <span>NET LOSS:</span>
                        <span>₹${Math.abs(pl.netProfit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                    ` : ''}
                    <div style="margin-top: auto; padding-top: 10px; border-top: 1.5px solid #0f172a; display: flex; justify-content: space-between; font-weight: 700;">
                      <span>Total:</span>
                      <span>₹${plTotalRight.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </td>
              </tr>
            </table>
          </div>
        ` : ''}
      </div>
    </body>
    </html>
  `;
};

export const getProfitLossCSV = (plData: any) => {
  const rows = [
    ['SECTION', 'PARTICULARS', 'AMOUNT'],
    ['1. REVENUE', 'Sales Income', plData.revenue.sales],
    ['', 'Job Work Income', plData.revenue.jobWorkIncome],
    ['', 'Total Revenue (A)', plData.revenue.total],
    [],
    ['2. COST OF SALES', 'Purchases', plData.costOfGoods.purchases],
    ['', 'Job Work Expenses', plData.costOfGoods.jobWorkExpense],
    ['', 'Direct Expenses', plData.costOfGoods.directExpense],
    ['', 'Total Cost of Sales (B)', plData.costOfGoods.total],
    [],
    ['GROSS PROFIT', 'Gross Profit (A - B)', plData.grossProfit],
    [],
    ['3. OPERATING EXPENSES', 'Indirect & Operating Expenses', plData.expenses.operatingExpense],
    ['', 'Total Operating Expenses (C)', plData.expenses.total],
    [],
    ['4. OTHER INDIRECT INCOME', 'Interest & Other Incomes (D)', plData.otherIncome],
    [],
    ['NET PROFIT', 'Net Profit For The Period', plData.netProfit]
  ];

  return rows.map(e => e.map(val => typeof val === 'string' ? `"${val}"` : val).join(',')).join('\n');
};

export const getProfitLossPDFHtml = (plData: any, activeCompany: any, startDate: string, endDate: string) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>PROFIT & LOSS STATEMENT</title>
      <style>
        body {
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
          color: #1e293b;
          padding: 20mm;
          font-size: 13px;
          box-sizing: border-box;
          background: #ffffff;
        }
        @media print {
          body { padding: 0; margin: 0; }
        }
      </style>
    </head>
    <body>
      <div style="border-bottom: 2px solid #0f172a; padding-bottom: 16px; marginBottom: 24px;">
        <h2 style="font-size: 22px; font-weight: 800; margin: 0; text-transform: uppercase; color: #0f172a;">
          ${activeCompany.companyName}
        </h2>
        <p style="margin: 4px 0 0; color: #475569; fontSize: 12px;">
          ${activeCompany.addressLine1} ${activeCompany.addressLine2 ? `, ${activeCompany.addressLine2}` : ''} | ${activeCompany.city} - ${activeCompany.pincode}
        </p>
        <div style="display: flex; justify-content: space-between; marginTop: 16px; fontSize: 13px; fontWeight: 600;">
          <span style="color: #2563eb;">PROFIT & LOSS STATEMENT</span>
          <span>PERIOD: ${startDate || 'Inception'} TO ${endDate || 'TODAY'}</span>
        </div>
      </div>

      <div style="display: flex; flexDirection: column; gap: 20px;">
        <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 12px;">
          <h3 style="font-size: 13px; font-weight: 700; margin: 0 0 8px; color: #0f172a;">1. REVENUE</h3>
          <div style="display: flex; flexDirection: column; gap: 6px; padding-left: 8px;">
            <div style="display: flex; justify-content: space-between;">
              <span>Sales Income:</span>
              <span>₹${plData.revenue.sales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>Job Work Income:</span>
              <span>₹${plData.revenue.jobWorkIncome.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div style="display: flex; justify-content: space-between; border-top: 1px dashed #cbd5e1; paddingTop: 6px; fontWeight: 700;">
              <span>Total Revenue (A):</span>
              <span>₹${plData.revenue.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 12px;">
          <h3 style="font-size: 13px; font-weight: 700; margin: 0 0 8px; color: #0f172a;">2. COST OF SALES</h3>
          <div style="display: flex; flexDirection: column; gap: 6px; padding-left: 8px;">
            <div style="display: flex; justify-content: space-between;">
              <span>Purchases:</span>
              <span>₹${plData.costOfGoods.purchases.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>Job Work Expenses:</span>
              <span>₹${plData.costOfGoods.jobWorkExpense.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>Direct Expenses:</span>
              <span>₹${plData.costOfGoods.directExpense.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div style="display: flex; justify-content: space-between; border-top: 1px dashed #cbd5e1; paddingTop: 6px; fontWeight: 700;">
              <span>Total Cost of Sales (B):</span>
              <span>₹${plData.costOfGoods.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; background: #f8fafc; padding: 10px 12px; borderRadius: 4px; fontWeight: 700; fontSize: 14px;">
          <span>GROSS PROFIT (A - B):</span>
          <span>₹${plData.grossProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
        </div>

        <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 12px;">
          <h3 style="font-size: 13px; font-weight: 700; margin: 0 0 8px; color: #0f172a;">3. OPERATING EXPENSES</h3>
          <div style="display: flex; flexDirection: column; gap: 6px; padding-left: 8px;">
            <div style="display: flex; justify-content: space-between;">
              <span>Indirect & Operating Expenses:</span>
              <span>₹${plData.expenses.operatingExpense.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div style="display: flex; justify-content: space-between; border-top: 1px dashed #cbd5e1; paddingTop: 6px; fontWeight: 700;">
              <span>Total Operating Expenses (C):</span>
              <span>₹${plData.expenses.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 12px;">
          <h3 style="font-size: 13px; font-weight: 700; margin: 0 0 8px; color: #0f172a;">4. OTHER INDIRECT INCOME</h3>
          <div style="display: flex; justify-content: space-between; padding-left: 8px;">
            <span>Interest & Other Incomes (D):</span>
            <span>₹${plData.otherIncome.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; background: #ecfdf5; border: 1px solid #059669; padding: 14px 16px; borderRadius: 4px; fontWeight: 800; fontSize: 15px; color: #047857;">
          <span>NET PROFIT FOR THE PERIOD:</span>
          <span>₹${plData.netProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const getTrialBalanceCSV = (tbData: any) => {
  const headers = ['ACCOUNT GROUP', 'DEBIT (Dr)', 'CREDIT (Cr)'];
  const rows = (tbData.groups || []).map((row: any) => [
    `"${row.groupName}"`,
    row.debit,
    row.credit
  ]);
  
  rows.push(['"Total Balance"', tbData.totalDebit, tbData.totalCredit]);
  rows.push(['"Variance"', tbData.variance, '']);

  return [headers.join(','), ...rows.map((e: any) => e.join(','))].join('\n');
};

export const getTrialBalancePDFHtml = (tbData: any, activeCompany: any, filterDate: string) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>TRIAL BALANCE STATEMENT</title>
      <style>
        body {
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
          color: #1e293b;
          padding: 20mm;
          font-size: 13px;
          box-sizing: border-box;
          background: #ffffff;
        }
        @media print {
          body { padding: 0; margin: 0; }
        }
      </style>
    </head>
    <body>
      <div style="border-bottom: 2px solid #0f172a; padding-bottom: 16px; marginBottom: 24px;">
        <h2 style="font-size: 22px; font-weight: 800; margin: 0; text-transform: uppercase; color: #0f172a;">
          ${activeCompany.companyName}
        </h2>
        <p style="margin: 4px 0 0; color: #475569; fontSize: 12px;">
          ${activeCompany.addressLine1} ${activeCompany.addressLine2 ? `, ${activeCompany.addressLine2}` : ''} | ${activeCompany.city} - ${activeCompany.pincode}
        </p>
        <div style="display: flex; justify-content: space-between; marginTop: 16px; fontSize: 13px; fontWeight: 600;">
          <span style="color: #2563eb;">TRIAL BALANCE STATEMENT</span>
          <span>AS OF: ${new Date(filterDate).toLocaleDateString('en-IN')}</span>
        </div>
      </div>

      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <thead>
          <tr style="background: #f8fafc; border-bottom: 2.5px solid #0f172a; text-transform: uppercase; font-size: 11px; font-weight: 700;">
            <th style="text-align: left; padding: 10px;">Account Group</th>
            <th style="text-align: right; padding: 10px; width: 150px;">Debit (Dr)</th>
            <th style="text-align: right; padding: 10px; width: 150px;">Credit (Cr)</th>
          </tr>
        </thead>
        <tbody>
          ${(tbData.groups || []).map((row: any) => `
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px; fontWeight: 500;">${row.groupName}</td>
              <td style="text-align: right; padding: 10px;">${row.debit > 0 ? `₹${row.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}</td>
              <td style="text-align: right; padding: 10px;">${row.credit > 0 ? `₹${row.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}</td>
            </tr>
          `).join('')}
          <tr style="border-top: 2px solid #0f172a; fontWeight: 700; background: #f8fafc;">
            <td style="padding: 12px 10px;">TOTAL BALANCE</td>
            <td style="text-align: right; padding: 12px 10px;">₹${Number(tbData.totalDebit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            <td style="text-align: right; padding: 12px 10px;">₹${Number(tbData.totalCredit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          </tr>
          <tr style="border-top: 1px dashed #cbd5e1; fontWeight: 700;">
            <td style="padding: 10px; color: #64748b;">VARIANCE / ARITHMETIC DIFF</td>
            <td style="padding: 10px;"></td>
            <td style="text-align: right; padding: 10px; color: #ef4444;">₹${Number(tbData.variance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          </tr>
        </tbody>
      </table>
    </body>
    </html>
  `;
};

export const getCashFlowCSV = (cfData: any) => {
  const rows = [
    ['SECTION', 'PARTICULARS', 'INFLOW / (OUTFLOW)'],
    ['Cash at Beginning of Period', '', cfData.openingCash],
    [],
    ['1. OPERATING ACTIVITIES', 'Operating Inflows', cfData.operating.inflow],
    ['', 'Operating Outflows', -cfData.operating.outflow],
    ['', 'Net Operating Cash (A)', cfData.operating.net],
    [],
    ['2. INVESTING ACTIVITIES', 'Investing Inflows', cfData.investing.inflow],
    ['', 'Investing Outflows', -cfData.investing.outflow],
    ['', 'Net Investing Cash (B)', cfData.investing.net],
    [],
    ['3. FINANCING ACTIVITIES', 'Financing Inflows', cfData.financing.inflow],
    ['', 'Financing Outflows', -cfData.financing.outflow],
    ['', 'Net Financing Cash (C)', cfData.financing.net],
    [],
    ['NET CASH MOVEMENT', 'Net Change in Cash (A + B + C)', cfData.netChange],
    ['Cash at End of Period', '', cfData.closingCash]
  ];

  return rows.map(e => e.map((val: any) => typeof val === 'string' ? `"${val}"` : val).join(',')).join('\n');
};

export const getCashFlowPDFHtml = (cfData: any, activeCompany: any, startDate: string, endDate: string) => {
  const fmtCF = (v: number) => {
    const absVal = Math.abs(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return v < 0 ? `₹(${absVal})` : `₹${absVal}`;
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>CASH FLOW STATEMENT</title>
      <style>
        body {
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
          color: #1e293b;
          padding: 20mm;
          font-size: 13px;
          box-sizing: border-box;
          background: #ffffff;
        }
        @media print {
          body { padding: 0; margin: 0; }
        }
      </style>
    </head>
    <body>
      <div style="border-bottom: 2px solid #0f172a; padding-bottom: 16px; marginBottom: 24px;">
        <h2 style="font-size: 22px; font-weight: 800; margin: 0; text-transform: uppercase; color: #0f172a;">
          ${activeCompany.companyName}
        </h2>
        <p style="margin: 4px 0 0; color: #475569; fontSize: 12px;">
          ${activeCompany.addressLine1} ${activeCompany.addressLine2 ? `, ${activeCompany.addressLine2}` : ''} | ${activeCompany.city} - ${activeCompany.pincode}
        </p>
        <div style="display: flex; justify-content: space-between; marginTop: 16px; fontSize: 13px; fontWeight: 600;">
          <span style="color: #2563eb;">CASH FLOW STATEMENT (DIRECT METHOD)</span>
          <span>PERIOD: ${startDate || 'Inception'} TO ${endDate || 'TODAY'}</span>
        </div>
      </div>

      <div style="display: flex; flexDirection: column; gap: 20px;">
        <div style="display: flex; justify-content: space-between; fontSize: 14px; fontWeight: 700; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">
          <span>Opening Cash & Bank Balance</span>
          <span>${fmtCF(cfData.openingCash)}</span>
        </div>

        <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 12px;">
          <h3 style="font-size: 13px; font-weight: 700; margin: 0 0 8px; color: #0f172a;">1. OPERATING ACTIVITIES</h3>
          <div style="display: flex; flexDirection: column; gap: 6px; padding-left: 8px;">
            <div style="display: flex; justify-content: space-between;">
              <span>Cash Inflows from Operations:</span>
              <span>${fmtCF(cfData.operating.inflow)}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>Cash Outflows from Operations:</span>
              <span>${fmtCF(-cfData.operating.outflow)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; border-top: 1px dashed #cbd5e1; paddingTop: 6px; fontWeight: 700;">
              <span>Net Cash from Operating Activities (A):</span>
              <span>${fmtCF(cfData.operating.net)}</span>
            </div>
          </div>
        </div>

        <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 12px;">
          <h3 style="font-size: 13px; font-weight: 700; margin: 0 0 8px; color: #0f172a;">2. INVESTING ACTIVITIES</h3>
          <div style="display: flex; flexDirection: column; gap: 6px; padding-left: 8px;">
            <div style="display: flex; justify-content: space-between;">
              <span>Fixed Asset Disposals / Investments:</span>
              <span>${fmtCF(cfData.investing.inflow)}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>Fixed Asset Additions / Acquisitions:</span>
              <span>${fmtCF(-cfData.investing.outflow)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; border-top: 1px dashed #cbd5e1; paddingTop: 6px; fontWeight: 700;">
              <span>Net Cash from Investing Activities (B):</span>
              <span>${fmtCF(cfData.investing.net)}</span>
            </div>
          </div>
        </div>

        <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 12px;">
          <h3 style="font-size: 13px; font-weight: 700; margin: 0 0 8px; color: #0f172a;">3. FINANCING ACTIVITIES</h3>
          <div style="display: flex; flexDirection: column; gap: 6px; padding-left: 8px;">
            <div style="display: flex; justify-content: space-between;">
              <span>Share Capital Issued / New Loans:</span>
              <span>${fmtCF(cfData.financing.inflow)}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>Capital Repayments / Dividends:</span>
              <span>${fmtCF(-cfData.financing.outflow)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; border-top: 1px dashed #cbd5e1; paddingTop: 6px; fontWeight: 700;">
              <span>Net Cash from Financing Activities (C):</span>
              <span>${fmtCF(cfData.financing.net)}</span>
            </div>
          </div>
        </div>

        <div style="border-top: 2px solid #0f172a; paddingTop: 12px; display: flex; flexDirection: column; gap: 8px;">
          <div style="display: flex; justify-content: space-between; fontWeight: 700;">
            <span>Net Cash Flow (A + B + C)</span>
            <span>${fmtCF(cfData.netChange)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; fontSize: 14px; fontWeight: 800; color: #0f172a;">
            <span>Closing Cash & Bank Balance</span>
            <span>${fmtCF(cfData.closingCash)}</span>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const getFundFlowCSV = (ffData: any) => {
  const rows = [
    ['SECTION', 'PARTICULARS', 'OPENING', 'CLOSING', 'NET CHANGE'],
    ['1. WORKING CAPITAL'],
    ['Current Assets', '', ffData.workingCapital.openingCurrentAssets, ffData.workingCapital.closingCurrentAssets, ffData.workingCapital.closingCurrentAssets - ffData.workingCapital.openingCurrentAssets],
    ['Current Liabilities', '', ffData.workingCapital.openingCurrentLiabilities, ffData.workingCapital.closingCurrentLiabilities, ffData.workingCapital.closingCurrentLiabilities - ffData.workingCapital.openingCurrentLiabilities],
    ['Working Capital', '', ffData.workingCapital.openingWorkingCapital, ffData.workingCapital.closingWorkingCapital, ffData.workingCapital.change],
    [],
    ['2. SOURCES OF FUNDS'],
    ...ffData.sources.map((s: any) => [s.description, '', '', '', s.amount]),
    ['Total Sources', '', '', '', ffData.sourcesTotal],
    [],
    ['3. APPLICATION OF FUNDS'],
    ...ffData.applications.map((a: any) => [a.description, '', '', '', a.amount]),
    ['Total Applications', '', '', '', ffData.applicationsTotal],
  ];

  return rows.map(e => e.map((val: any) => typeof val === 'string' ? `"${val}"` : val).join(',')).join('\n');
};

export const getFundFlowPDFHtml = (ffData: any, activeCompany: any, startDate: string, endDate: string) => {
  const fmt = (v: number) => {
    const absVal = Math.abs(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return v < 0 ? `₹(${absVal})` : `₹${absVal}`;
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>FUND FLOW STATEMENT</title>
      <style>
        body {
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
          color: #1e293b;
          padding: 20mm;
          font-size: 13px;
          box-sizing: border-box;
          background: #ffffff;
        }
        @media print {
          body { padding: 0; margin: 0; }
        }
      </style>
    </head>
    <body>
      <div style="border-bottom: 2px solid #0f172a; padding-bottom: 16px; marginBottom: 24px;">
        <h2 style="font-size: 22px; font-weight: 800; margin: 0; text-transform: uppercase; color: #0f172a;">
          ${activeCompany.companyName}
        </h2>
        <p style="margin: 4px 0 0; color: #475569; fontSize: 12px;">
          ${activeCompany.addressLine1} ${activeCompany.addressLine2 ? `, ${activeCompany.addressLine2}` : ''} | ${activeCompany.city} - ${activeCompany.pincode}
        </p>
        <div style="display: flex; justify-content: space-between; marginTop: 16px; fontSize: 13px; fontWeight: 600;">
          <span style="color: #2563eb;">FUND FLOW STATEMENT</span>
          <span>PERIOD: ${startDate || 'Inception'} TO ${endDate || 'TODAY'}</span>
        </div>
      </div>

      <div style="display: flex; flexDirection: column; gap: 24px;">
        <div>
          <h3 style="font-size: 14px; font-weight: 700; border-bottom: 1.5px solid #0f172a; padding-bottom: 6px; text-transform: uppercase; margin: 0 0 10px;">1. Working Capital Changes</h3>
          <div style="display: flex; flexDirection: column; gap: 6px; fontSize: 12px;">
            <div style="display: flex; justify-content: space-between;">
              <span>Current Assets (Opening):</span>
              <span>${fmt(ffData.workingCapital.openingCurrentAssets)}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>Current Assets (Closing):</span>
              <span>${fmt(ffData.workingCapital.closingCurrentAssets)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; marginTop: 4px;">
              <span>Current Liabilities (Opening):</span>
              <span>${fmt(ffData.workingCapital.openingCurrentLiabilities)}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>Current Liabilities (Closing):</span>
              <span>${fmt(ffData.workingCapital.closingCurrentLiabilities)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; border-top: 1px solid #cbd5e1; paddingTop: 6px; fontWeight: 700; fontSize: 13px;">
              <span>Net Change in Working Capital:</span>
              <span style="color: ${ffData.workingCapital.change >= 0 ? '#10b981' : '#ef4444'}">${fmt(ffData.workingCapital.change)}</span>
            </div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
          <div>
            <h4 style="font-size: 13px; font-weight: 700; border-bottom: 1px solid #0f172a; padding-bottom: 4px; margin: 0 0 8px;">Sources of Funds</h4>
            <div style="display: flex; flexDirection: column; gap: 6px; fontSize: 12px;">
              ${ffData.sources.map((s: any) => `
                <div style="display: flex; justify-content: space-between;">
                  <span>${s.description}</span>
                  <span>${fmt(s.amount)}</span>
                </div>
              `).join('')}
              <div style="display: flex; justify-content: space-between; border-top: 1px dashed #cbd5e1; paddingTop: 6px; fontWeight: 700;">
                <span>Total Sources:</span>
                <span>${fmt(ffData.sourcesTotal)}</span>
              </div>
            </div>
          </div>

          <div>
            <h4 style="font-size: 13px; font-weight: 700; border-bottom: 1px solid #0f172a; padding-bottom: 4px; margin: 0 0 8px;">Applications of Funds</h4>
            <div style="display: flex; flexDirection: column; gap: 6px; fontSize: 12px;">
              ${ffData.applications.map((a: any) => `
                <div style="display: flex; justify-content: space-between;">
                  <span>${a.description}</span>
                  <span>${fmt(a.amount)}</span>
                </div>
              `).join('')}
              <div style="display: flex; justify-content: space-between; border-top: 1px dashed #cbd5e1; paddingTop: 6px; fontWeight: 700;">
                <span>Total Applications:</span>
                <span>${fmt(ffData.applicationsTotal)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const getStockReportCSV = (reportData: any, activeTab: 'REGISTER' | 'QUALITY') => {
  let rows: any[] = [];
  
  // Add summary header lines
  rows.push(['STOCK REPORT SUMMARY']);
  rows.push(['Total Packets', reportData.summary.totalPackets, `${reportData.summary.totalCarats.toFixed(3)} Cts`]);
  rows.push(['Total Valuation', `₹${reportData.summary.totalValuation.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`]);
  rows.push(['Available Stock', `${reportData.summary.statusBreakdown.available.count} Pkts`, `${reportData.summary.statusBreakdown.available.carats.toFixed(3)} Cts`, `₹${reportData.summary.statusBreakdown.available.value}`]);
  rows.push(['Reserved / Hold', `${reportData.summary.statusBreakdown.reserved.count} Pkts`, `${reportData.summary.statusBreakdown.reserved.carats.toFixed(3)} Cts`, `₹${reportData.summary.statusBreakdown.reserved.value}`]);
  rows.push(['In Job Work', `${reportData.summary.statusBreakdown.jobWork.count} Pkts`, `${reportData.summary.statusBreakdown.jobWork.carats.toFixed(3)} Cts`, `₹${reportData.summary.statusBreakdown.jobWork.value}`]);
  rows.push(['Transit / Created', `${reportData.summary.statusBreakdown.transit.count} Pkts`, `${reportData.summary.statusBreakdown.transit.carats.toFixed(3)} Cts`, `₹${reportData.summary.statusBreakdown.transit.value}`]);
  rows.push(['Sold', `${reportData.summary.statusBreakdown.sold.count} Pkts`, `${reportData.summary.statusBreakdown.sold.carats.toFixed(3)} Cts`, `₹${reportData.summary.statusBreakdown.sold.value}`]);
  rows.push(['Returned', `${reportData.summary.statusBreakdown.returned.count} Pkts`, `${reportData.summary.statusBreakdown.returned.carats.toFixed(3)} Cts`, `₹${reportData.summary.statusBreakdown.returned.value}`]);
  rows.push(['Damaged', `${reportData.summary.statusBreakdown.damaged.count} Pkts`, `${reportData.summary.statusBreakdown.damaged.carats.toFixed(3)} Cts`, `₹${reportData.summary.statusBreakdown.damaged.value}`]);
  rows.push([]); // Empty spacing line
  
  if (activeTab === 'REGISTER') {
    rows.push(['PACKET NUMBER', 'QUALITY', 'SHAPE', 'COLOR', 'CLARITY', 'CARATS', 'RATE', 'VALUE', 'STATUS', 'LOCATION']);
    reportData.packets.forEach((p: any) => {
      rows.push([
        `"${p.stockIdNumber}"`,
        `"${p.qualityName}"`,
        `"${p.shape || '—'}"`,
        `"${p.color || '—'}"`,
        `"${p.clarity || '—'}"`,
        p.caratWeight,
        p.costRate,
        p.totalValue,
        `"${p.currentStatus}"`,
        `"${p.location}"`
      ]);
    });
  } else {
    rows.push(['QUALITY GRADE', 'PACKET COUNT', 'TOTAL CARAT', 'AVERAGE RATE', 'TOTAL VALUE']);
    reportData.qualityAggregates.forEach((q: any) => {
      rows.push([
        `"${q.qualityName}"`,
        q.count,
        q.carats,
        q.averageRate,
        q.totalValue
      ]);
    });
  }

  return rows.map(e => e.join(',')).join('\n');
};

export const getStockReportPDFHtml = (reportData: any, activeCompany: any, activeTab: 'REGISTER' | 'QUALITY') => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>STOCK REPORT</title>
      <style>
        body {
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
          color: #1e293b;
          padding: 20mm;
          font-size: 13px;
          box-sizing: border-box;
          background: #ffffff;
        }
        @media print {
          body { padding: 0; margin: 0; }
        }
      </style>
    </head>
    <body>
      <div style="border-bottom: 2px solid #0f172a; padding-bottom: 16px; marginBottom: 24px;">
        <h2 style="font-size: 22px; font-weight: 800; margin: 0; text-transform: uppercase; color: #0f172a;">
          ${activeCompany.companyName}
        </h2>
        <p style="margin: 4px 0 0; color: #475569; fontSize: 12px;">
          ${activeCompany.addressLine1} ${activeCompany.addressLine2 ? `, ${activeCompany.addressLine2}` : ''} | ${activeCompany.city} - ${activeCompany.pincode}
        </p>
        <div style="display: flex; justify-content: space-between; marginTop: 16px; fontSize: 13px; fontWeight: 600;">
          <span style="color: #2563eb;">STOCK REPORT — ${activeTab}</span>
          <span>DATE: ${new Date().toLocaleDateString('en-IN')}</span>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; marginBottom: 24px; padding: 16px; background: #f8fafc; border: 1px solid #cbd5e1; borderRadius: 6px; fontSize: 11px; line-height: 1.4;">
        <div>
          <strong>Total Packets:</strong> ${reportData.summary.totalPackets} (${reportData.summary.totalCarats.toFixed(3)} Cts)
        </div>
        <div>
          <strong>Total Valuation:</strong> ₹${reportData.summary.totalValuation.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </div>
        <div>
          <strong>Available Stock:</strong> ${reportData.summary.statusBreakdown.available.count} Pkts (${reportData.summary.statusBreakdown.available.carats.toFixed(3)} Cts | ₹${reportData.summary.statusBreakdown.available.value.toLocaleString('en-IN')})
        </div>
        <div>
          <strong>Reserved / Hold:</strong> ${reportData.summary.statusBreakdown.reserved.count} Pkts ({reportData.summary.statusBreakdown.reserved.carats.toFixed(3)} Cts | ₹${reportData.summary.statusBreakdown.reserved.value.toLocaleString('en-IN')})
        </div>
        <div>
          <strong>In Job Work:</strong> ${reportData.summary.statusBreakdown.jobWork.count} Pkts (${reportData.summary.statusBreakdown.jobWork.carats.toFixed(3)} Cts | ₹${reportData.summary.statusBreakdown.jobWork.value.toLocaleString('en-IN')})
        </div>
        <div>
          <strong>Transit / Created:</strong> ${reportData.summary.statusBreakdown.transit.count} Pkts (${reportData.summary.statusBreakdown.transit.carats.toFixed(3)} Cts | ₹${reportData.summary.statusBreakdown.transit.value.toLocaleString('en-IN')})
        </div>
        <div>
          <strong>Sold:</strong> ${reportData.summary.statusBreakdown.sold.count} Pkts (${reportData.summary.statusBreakdown.sold.carats.toFixed(3)} Cts | ₹${reportData.summary.statusBreakdown.sold.value.toLocaleString('en-IN')})
        </div>
        <div>
          <strong>Returned:</strong> ${reportData.summary.statusBreakdown.returned.count} Pkts (${reportData.summary.statusBreakdown.returned.carats.toFixed(3)} Cts | ₹${reportData.summary.statusBreakdown.returned.value.toLocaleString('en-IN')})
        </div>
        <div>
          <strong>Damaged:</strong> ${reportData.summary.statusBreakdown.damaged.count} Pkts (${reportData.summary.statusBreakdown.damaged.carats.toFixed(3)} Cts | ₹${reportData.summary.statusBreakdown.damaged.value.toLocaleString('en-IN')})
        </div>
      </div>

      ${activeTab === 'REGISTER' ? `
        <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
          <thead>
            <tr style="background: #f8fafc; border-bottom: 2px solid #0f172a; fontWeight: 700;">
              <th style="text-align: left; padding: 6px;">Packet No</th>
              <th style="text-align: left; padding: 6px;">Quality</th>
              <th style="text-align: left; padding: 6px;">Size/Shape</th>
              <th style="text-align: right; padding: 6px;">Carats</th>
              <th style="text-align: right; padding: 6px;">Cost Rate</th>
              <th style="text-align: right; padding: 6px;">Valuation</th>
              <th style="text-align: left; padding: 6px;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${reportData.packets.map((p: any) => `
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 6px; fontWeight: 600;">${p.stockIdNumber}</td>
                <td style="padding: 6px;">${p.qualityName}</td>
                <td style="padding: 6px;">${p.shape || '—'} ${p.color} ${p.clarity}</td>
                <td style="text-align: right; padding: 6px;">${p.caratWeight.toFixed(3)} Cts</td>
                <td style="text-align: right; padding: 6px;">₹${p.costRate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                <td style="text-align: right; padding: 6px; fontWeight: 600;">₹${p.totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                <td style="padding: 6px;">${p.currentStatus}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : `
        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
          <thead>
            <tr style="background: #f8fafc; border-bottom: 2px solid #0f172a; fontWeight: 700;">
              <th style="text-align: left; padding: 8px;">Quality Grade</th>
              <th style="text-align: center; padding: 8px;">Packet Count</th>
              <th style="text-align: right; padding: 8px;">Total Carats</th>
              <th style="text-align: right; padding: 8px;">Average Rate</th>
              <th style="text-align: right; padding: 8px;">Total Valuation</th>
            </tr>
          </thead>
          <tbody>
            ${reportData.qualityAggregates.map((q: any) => `
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 8px; fontWeight: 600;">${q.qualityName}</td>
                <td style="text-align: center; padding: 8px;">${q.count}</td>
                <td style="text-align: right; padding: 8px;">${q.carats.toFixed(3)} Cts</td>
                <td style="text-align: right; padding: 8px;">₹${q.averageRate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                <td style="text-align: right; padding: 8px; fontWeight: 600;">₹${q.totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `}
    </body>
    </html>
  `;
};

export const getDayBookCSV = (detailData: any) => {
  const headers = ['VOUCHER NO', 'TYPE', 'PARTICULARS', 'DEBIT (DR)', 'CREDIT (CR)', 'NARRATION'];
  const rows = (detailData.transactions || []).map((t: any) => [
    `"${t.voucherNumber}"`,
    `"${t.voucherType}"`,
    `"${t.accountName}"`,
    t.debitCreditType === 'DEBIT' ? t.amount : 0,
    t.debitCreditType === 'CREDIT' ? t.amount : 0,
    `"${t.narration || ''}"`
  ]);

  return [headers.join(','), ...rows.map((e: any) => e.join(','))].join('\n');
};

export const getDayBookPDFHtml = (detailData: any, activeCompany: any, activeDate: string, activeFinancialYear: any) => {
  const formatFinancialYearLabel = (fy: any) => {
    if (!fy) return '';
    const startYear = new Date(fy.fromDate).getFullYear();
    const endYear = new Date(fy.toDate).getFullYear();
    return `FY ${startYear}-${endYear.toString().slice(-2)}`;
  };

  const renderAmount = (amount: number) => {
    if (amount === undefined || amount === null) return '₹0.00';
    const isNeg = amount < 0;
    const formatted = Math.abs(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return isNeg ? `₹${formatted} Cr` : `₹${formatted} Dr`;
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>DAY BOOK</title>
      <style>
        body {
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
          color: #1e293b;
          padding: 20mm;
          font-size: 13px;
          box-sizing: border-box;
          background: #ffffff;
        }
        @media print {
          body { padding: 0; margin: 0; }
        }
      </style>
    </head>
    <body>
      <div style="border-bottom: 2px solid #0f172a; padding-bottom: 16px; marginBottom: 20px;">
        <h2 style="font-size: 22px; font-weight: 800; margin: 0; text-transform: uppercase; color: #0f172a;">
          ${activeCompany.companyName}
        </h2>
        <p style="fontSize: 12px; color: #475569; margin: 4px 0 0 0;">
          GSTIN: ${activeCompany.gstinNumber || 'Unregistered'} | Financial Year: ${activeFinancialYear ? formatFinancialYearLabel(activeFinancialYear) : ''}
        </p>
        <h3 style="fontSize: 16px; fontWeight: 700; margin: 12px 0 0 0; color: #2563eb;">
          DAY BOOK
        </h3>
        <p style="fontSize: 12px; color: #64748b; margin: 2px 0 0 0;">
          Date: ${activeDate}
        </p>
      </div>

      <div style="marginBottom: 24px;">
        <h4 style="fontSize: 12px; fontWeight: 700; color: #0f172a; marginBottom: 8px; text-transform: uppercase;">Daily Cash & Bank Summary</h4>
        <table style="width: 100%; border-collapse: collapse; fontSize: 11px; border: 1px solid #e2e8f0;">
          <thead>
            <tr style="background: #f8fafc; border-bottom: 1.5px solid #0f172a; fontWeight: 600;">
              <th style="textAlign: left; padding: 8px; border-right: 1px solid #e2e8f0;">Balance Type</th>
              <th style="textAlign: right; padding: 8px; border-right: 1px solid #e2e8f0;">Opening Balance</th>
              <th style="textAlign: right; padding: 8px;">Closing Balance</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 8px; fontWeight: 500; border-right: 1px solid #e2e8f0;">Cash (On Hand)</td>
              <td style="padding: 8px; textAlign: right; border-right: 1px solid #e2e8f0;">${renderAmount(detailData?.openingCash)}</td>
              <td style="padding: 8px; textAlign: right;">${renderAmount(detailData?.closingCash)}</td>
            </tr>
            <tr>
              <td style="padding: 8px; fontWeight: 500; border-right: 1px solid #e2e8f0;">Bank Balances</td>
              <td style="padding: 8px; textAlign: right; border-right: 1px solid #e2e8f0;">${renderAmount(detailData?.openingBank)}</td>
              <td style="padding: 8px; textAlign: right;">${renderAmount(detailData?.closingBank)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div>
        <h4 style="fontSize: 12px; fontWeight: 700; color: #0f172a; marginBottom: 8px; text-transform: uppercase;">Chronological Transactions</h4>
        <table style="width: 100%; border-collapse: collapse; fontSize: 10px;">
          <thead>
            <tr style="border-bottom: 1.5px solid #0f172a; fontWeight: 600; color: #334155;">
              <th style="textAlign: left; padding: 8px;">VOUCHER NO</th>
              <th style="textAlign: left; padding: 8px;">TYPE</th>
              <th style="textAlign: left; padding: 8px;">PARTICULARS</th>
              <th style="textAlign: right; padding: 8px;">DEBIT (DR)</th>
              <th style="textAlign: right; padding: 8px;">CREDIT (CR)</th>
              <th style="textAlign: left; padding: 8px;">NARRATION</th>
            </tr>
          </thead>
          <tbody>
            ${(detailData?.transactions || []).map((row: any) => `
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 8px;">${row.voucherNumber}</td>
                <td style="padding: 8px;">${row.voucherType}</td>
                <td style="padding: 8px;">${row.accountName}</td>
                <td style="padding: 8px; textAlign: right;">
                  ${row.debitCreditType === 'DEBIT' ? `₹${row.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                </td>
                <td style="padding: 8px; textAlign: right;">
                  ${row.debitCreditType === 'CREDIT' ? `₹${row.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                </td>
                <td style="padding: 8px;">${row.narration}</td>
              </tr>
            `).join('')}
            ${(!detailData?.transactions || detailData.transactions.length === 0) ? `
              <tr>
                <td colSpan="6" style="textAlign: center; padding: 16px; color: #64748b;">
                  No transactions recorded on this day.
                </td>
              </tr>
            ` : ''}
          </tbody>
        </table>
      </div>

      <div style="marginTop: 40px; display: flex; justifyContent: space-between; fontSize: 11px; color: #64748b;">
        <span>Generated on: ${new Date().toLocaleDateString()}</span>
        <span style="border-top: 1px solid #94a3b8; width: 150px; textAlign: center; paddingTop: 4px;">Authorised Signatory</span>
      </div>
    </body>
    </html>
  `;
};

export const getOutstandingCSV = (outstandingList: any[], _reportType: 'RECEIVABLE' | 'PAYABLE') => {
  const headers = ['ACCOUNT NAME', 'CREDIT DAYS', 'CREDIT LIMIT', 'PENDING OUTSTANDING', '0-30 DAYS', '31-90 DAYS', '>90 DAYS'];
  const rows = outstandingList.map((row: any) => {
    const bucket30 = row.aging.bucket_0_30;
    const bucket90 = row.aging.bucket_31_60 + row.aging.bucket_61_90;
    const bucketAbove = row.aging.bucket_91_180 + row.aging.bucket_181_365 + row.aging.bucket_above_365;

    return [
      `"${row.accountName}"`,
      `${row.creditDays || 0} Days`,
      row.creditLimit > 0 ? row.creditLimit : 'Unlimited',
      row.totalOutstanding,
      bucket30,
      bucket90,
      bucketAbove
    ];
  });

  return [headers.join(','), ...rows.map((e: any) => e.join(','))].join('\n');
};

export const getOutstandingPDFHtml = (outstandingList: any[], activeCompany: any, reportType: 'RECEIVABLE' | 'PAYABLE') => {
  const totalOutstanding = outstandingList.reduce((sum, item) => sum + item.totalOutstanding, 0);
  const total0_30 = outstandingList.reduce((sum, item) => sum + item.aging.bucket_0_30, 0);
  const totalOverdue = outstandingList.reduce((sum, item) => {
    const age = item.aging;
    return sum + (age.bucket_31_60 + age.bucket_61_90 + age.bucket_91_180 + age.bucket_181_365 + age.bucket_above_365);
  }, 0);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>OUTSTANDING STATEMENT</title>
      <style>
        body {
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
          color: #1e293b;
          padding: 20mm;
          font-size: 13px;
          box-sizing: border-box;
          background: #ffffff;
        }
        @media print {
          body { padding: 0; margin: 0; }
        }
      </style>
    </head>
    <body>
      <div style="border-bottom: 2px solid #0f172a; padding-bottom: 16px; marginBottom: 24px;">
        <h2 style="font-size: 22px; font-weight: 800; margin: 0; text-transform: uppercase; color: #0f172a;">
          ${activeCompany.companyName}
        </h2>
        <p style="margin: 4px 0 0; color: #475569; fontSize: 12px;">
          ${activeCompany.addressLine1} ${activeCompany.addressLine2 ? `, ${activeCompany.addressLine2}` : ''} | ${activeCompany.city} - ${activeCompany.pincode}
        </p>
        <div style="display: flex; justify-content: space-between; marginTop: 16px; fontSize: 13px; fontWeight: 600;">
          <span style="color: #2563eb;">OUTSTANDING STATEMENT — ${reportType === 'RECEIVABLE' ? 'RECEIVABLES (DEBTORS)' : 'PAYABLES (CREDITORS)'}</span>
          <span>DATE: ${new Date().toLocaleDateString('en-IN')}</span>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; marginBottom: 24px;">
        <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 16px;">
          <span style="font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase;">
            Total ${reportType === 'RECEIVABLE' ? 'Receivable' : 'Payable'}
          </span>
          <div style="font-size: 20px; font-weight: 700; color: #2563eb; marginTop: 4px;">
            ₹${totalOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 16px;">
          <span style="font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase;">
            Due In 0-30 Days
          </span>
          <div style="font-size: 20px; font-weight: 700; color: #16a34a; marginTop: 4px;">
            ₹${total0_30.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 16px;">
          <span style="font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase;">
            Overdue (&gt;30 Days)
          </span>
          <div style="font-size: 20px; font-weight: 700; color: #dc2626; marginTop: 4px;">
            ₹${totalOverdue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
        <thead>
          <tr style="background: #f8fafc; border-bottom: 2.5px solid #0f172a; text-transform: uppercase; font-size: 11px; font-weight: 700;">
            <th style="text-align: left; padding: 10px;">Account Name</th>
            <th style="text-align: left; padding: 10px;">Credit Days</th>
            <th style="text-align: right; padding: 10px;">Credit Limit</th>
            <th style="text-align: right; padding: 10px;">Pending Outstanding</th>
            <th style="text-align: center; padding: 10px; width: 250px;">Aging Slots (0-30 / 31-90 / >90 Days)</th>
          </tr>
        </thead>
        <tbody>
          ${outstandingList.map((row: any) => {
            const bucket30 = row.aging.bucket_0_30;
            const bucket90 = row.aging.bucket_31_60 + row.aging.bucket_61_90;
            const bucketAbove = row.aging.bucket_91_180 + row.aging.bucket_181_365 + row.aging.bucket_above_365;

            return `
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 10px; fontWeight: 500;">${row.accountName}</td>
                <td style="padding: 10px;">${row.creditDays || 0} Days</td>
                <td style="text-align: right; padding: 10px;">${row.creditLimit > 0 ? `₹${row.creditLimit.toLocaleString('en-IN')}` : 'Unlimited'}</td>
                <td style="text-align: right; padding: 10px; fontWeight: 700; color: #2563eb;">₹${row.totalOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                <td style="padding: 10px;">
                  <div style="display: flex; gap: 8px; justify-content: center; font-size: 11px; font-weight: 600;">
                    <span style="color: #16a34a; background: #dcfce7; padding: 2px 6px; border-radius: 4px;">₹${bucket30.toLocaleString()}</span>
                    <span style="color: #ca8a04; background: #fef9c3; padding: 2px 6px; border-radius: 4px;">₹${bucket90.toLocaleString()}</span>
                    <span style="color: #dc2626; background: #fee2e2; padding: 2px 6px; border-radius: 4px;">₹${bucketAbove.toLocaleString()}</span>
                  </div>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </body>
    </html>
  `;
};
