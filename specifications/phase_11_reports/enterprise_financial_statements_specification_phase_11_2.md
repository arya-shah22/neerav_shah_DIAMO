# DIAMO ERP – PHASE 11.2
## ENTERPRISE FINANCIAL STATEMENTS SPECIFICATION

---

## 1. Executive Summary
This document defines the Enterprise Functional Specification Document (FSD) for the Enterprise Financial Statements module of DIAMO ERP. This module aggregates transaction postings to automatically generate the Balance Sheet, Profit & Loss Statement, Cash Flow Statement, Fund Flow Statement, and Financial Ratios, enabling real-time compliance and executive oversight.

---

## 2. Reports Included
This module includes the following reports:
*   Balance Sheet & Comparative Balance Sheet.
*   Profit & Loss Statement & Comparative Profit & Loss.
*   Cash Flow Statement (Direct/Indirect method).
*   Fund Flow Statement (Working capital and fund movements).
*   Financial Ratio Analysis & Executive Dashboard.

---

## 3. Balance Sheet
Presents the financial position of the company:
*   **Asset Groups:** Current Assets (Cash, Bank, Receivables, Stock), Non-Current Assets (Fixed Assets, Investments).
*   **Liability Groups:** Current Liabilities (Payables, Tax liabilities, Loans), Non-Current Liabilities (Long-term loans).
*   **Capital Groups:** Owner's Equity, Partner's Capital, Retained Earnings, and Current Year Profit/Loss.
*   *Verification Rule:* Assets must equal Liabilities plus Capital:
    $$\text{Assets} = \text{Liabilities} + \text{Capital}$$

---

## 4. Profit & Loss Statement
Measures the company's financial performance over a selected period:
*   **Income Categories:** Sales, Job Work Income, Interest Earned, Commission Income.
*   **Expense Categories:** Purchases, Job Work Expenses, Operating Expenses (Salaries, Rent, Utilities, Bank charges), Depreciation, Interest Paid.
*   **Formulas:**
    $$\text{Gross Profit} = \text{Total Income} - \text{Total Purchases/Job Work Cost}$$
    $$\text{Operating Profit} = \text{Gross Profit} - \text{Operating Expenses}$$
    $$\text{Net Profit} = \text{Operating Profit} \pm \text{Non-Operating Items}$$

---

## 5. Cash Flow Statement
Tracks cash inflows and outflows:
*   *Operating Activities:* Cash generated from core customer receivables and paid for operating expenses.
*   *Investing Activities:* Purchases or sales of fixed assets and investments.
*   *Financing Activities:* Capital receipts, loan drawdowns, or loan repayments.
*   *Verification:* Net cash movement must reconcile with the Cash and Bank Books.

---

## 6. Fund Flow Statement
Shows sources and applications of funds:
*   *Sources:* Funds from operations, asset disposals, or long-term loans.
*   *Applications:* Operational outflows, fixed asset purchases, or dividend payouts.
*   *Changes in Working Capital:* Calculates differences in current assets and liabilities.

---

## 7. Financial Ratio Analysis
Calculates financial performance metrics:
*   **Liquidity Ratios:**
    $$\text{Current Ratio} = \frac{\text{Current Assets}}{\text{Current Liabilities}}$$
    $$\text{Quick Ratio} = \frac{\text{Cash} + \text{Bank} + \text{Receivables}}{\text{Current Liabilities}}$$
*   **Profitability Ratios:** Gross Profit %, Net Profit %, Operating Margin %, and Return on Equity (ROE) %.
*   **Turnover Ratios:** Inventory Turnover Ratio, Receivable Turnover Ratio, and Payable Turnover Ratio.

---

## 8. Financial Summary
*   **Card Layout:** Displays total assets, total liabilities, total capital, total revenue, gross profit, net profit, cash/bank balances, and pending outstanding receivables/payables.

---

## 9. Executive Dashboard
Displays key financial indicators:
*   **KPI Widgets:** Monthly revenue, net profit margins, cash positions, monthly expenses, outstanding balances, and inventory valuation trends.

---

## 10. Search
Supports filters for: Financial Year, Company, Account Group, Ledger, Date Range, and Report Type.

---

## 11. Filters
Provides filters for: Today, Yesterday, This Month, Quarter, Financial Year, and Custom Date Range.

---

## 12. Sorting
Allows sorting by: Account Name, Amount, Assets, Liabilities, Income, and Expenses.

---

## 13. Grouping
Supports grouping by: Account Group, Assets, Liabilities, Income, Expenses, and Company.

---

## 14. Print Engine
Generates print templates for:
*   *Print Formats:* Renders company logos, headers, footers, page counts, and draft or cancelled watermarks.

---

## 15. PDF Engine
*   **Branding Configuration:** Auto-appends the company logo and letterhead details.
*   **Security Configuration:** Supports password protection for exported files.

---

## 16. Export
*   **Supported Formats:** Excel, PDF, CSV, and Print.
*   **Export Ranges:** Supports exporting selected accounts, filtered transaction dates, or the entire financial year.

---

## 17. Report Impact
Financial statements synchronize automatically when transactions are saved, modified, or reversed in Sales, Purchases, Cash Books, Bank Books, or JVs.

---

## 18. Validation
*   **Period Lock:** Restricts report dates to the bounds of the active financial year.
*   **Status Check:** Excludes drafts and cancelled vouchers from official ledger calculations.

---

## 19. Business Rules
1.  **Strict Balance Constraint:** Voucher save blocked if variance is not zero.
2.  **No Edits on Reconciled Vouchers:** Reversing or editing a voucher requires first undoing its reconciliation.
3.  **Approval Logs:** Historical approval records cannot be deleted.

---

## 20. Permissions
Access is regulated by the following flags:
*   `view_financial_statements` / `view_profit_and_loss`
*   `export_financial_reports` / `view_balance_sheet`

---

## 21. Audit
Logs all status changes:
*   Tracks report access, exported file histories, search inputs, and parameter changes.
*   Logs before and after JSON snapshots, user IDs, and system timestamps.

---

## 22. Notifications
*   **Imbalance Alerts:** Triggers alerts if the Trial Balance debits and credits do not reconcile.
*   **Liquidity Alerts:** Warns users when cash or bank balances drop below specified limits.

---

## 23. Performance
*   **Asynchronous Processing:** Long-period general ledger reports run in a background worker thread.
*   **Data Virtualization:** The UI uses lazy loading to render reports with 1,000,000+ rows without performance lag.

---

## 24. Edge Cases
*   **Mid-Year Edits:** Edits to historical transaction dates trigger automatic recalculations of all subsequent running balances.
*   **Closed Period Postings:** Blocks transaction entries in closed financial periods.

---

## 25. Future Enhancements
*   **Power BI Integration:** Direct APIs to export clean accounting data feeds to custom BI dashboards.
*   **AI Ledger Audits:** Automatically scans ledger postings to flag classification anomalies.

## 26. Architect Recommendations
1.  **Profit Closure Automation:** Automatically calculate and transfer the current period's Profit & Loss net balance as reserves/retained earnings to the Capital section of the Balance Sheet.
2.  **Cash Flow Double-Entry Classification:** Run direct-method cash flow class matching in memory using cached general ledger transactions to optimize performance and prevent database query round-trip overhead.

---

## 27. Final Completion Checklist
*   [x] Document journal types and entry modes (Simple vs. Advanced).
*   [x] Map the posting pipeline and double-entry validation equations.
*   [x] Detail the reversal voucher workflow and status flows.
*   [x] Map validations, permissions, and audit log rules.
*   [x] Document report and ledger integrations.
