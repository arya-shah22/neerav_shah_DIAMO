# DIAMO ERP – PHASE 2 PART 2
## DASHBOARD MODULE FUNCTIONAL SPECIFICATION

---

## 1. Executive Summary
The DIAMO ERP Dashboard Module is designed to give executives, owners, managers, and accountants a real-time, comprehensive view of the organization’s financial health, stock metrics, and operational tasks. The dashboard is optimized for keyboard navigation, supports deep drill-down analytics, and aggregates business-critical metrics to eliminate manual reporting.

---

## 2. Dashboard Architecture
The Dashboard Module functions as the entry point of DIAMO ERP.
*   **Presentation Layer (Electron/React):** Renders widgets dynamically using charts (Line, Bar, Donut, Heatmaps) and updates values through a reactive local caching layer.
*   **Business Logic Layer (NestJS/Prisma):** Aggregates complex calculations (e.g., aging buckets, live stock valuation, multi-currency cash flow) and exposes read-optimized caching systems.
*   **Database Layer (MySQL):** Utilizes indexed database views to minimize query latency on high-volume tables.

---

## 3. Overall Dashboard Layout
The main dashboard dashboard layout employs a grid system structured into four primary logical bands:
1.  **Global Filter & Header Panel (Top):** Active filters (Company, Financial Year, Date Range, Broker, Account, Quality, Status) and manual/auto-refresh configurations.
2.  **KPI summary Cards (Row 1):** Five primary metrics cards (Total Receivables, Total Payables, On Hand Money, Overdue Count, Total Stock) featuring inline percentage-change sparklines.
3.  **Core Analytical Widgets (Row 2):** Two side-by-side columns:
    *   *Left Column (60% width):* Cash Flow Trend and Available Inventory by Quality.
    *   *Right Column (40% width):* Aging Analysis and Stock Velocity.
4.  **Operational Alert Panels (Row 3):** Three equal columns (Notification Alerts, Due Alerts, Quick Action Panel).

---

## 4. Dashboard Overview Specification
*   **Purpose:** Provides a centralized, comprehensive operational health overview.
*   **Business Importance:** Allows owners to verify liquidity, stock, and outstanding balances in seconds.
*   **Who Uses It:** Owners, Executive Managers, Accounts Managers.
*   **Navigation Path:** `/dashboard/overview`
*   **Dependencies:** Sales Book, Purchase Book, Stock Ledger, General Ledger, Cash/Bank Books.
*   **Information Displayed:**
    *   *Widgets:* Daily cash positions, pending collections, today's manufacturing loss.
    *   *Quick Actions:* Create Invoice, Issue Memo, Record Payment.
    *   *Alerts:* Low-level stock items, GIA lab shipment due reminders.
*   **Date Range Selection:** Defaults to "Today" with presets for "Last 7 Days", "This Month", and "This Financial Year".
*   **Refresh Behaviour:** Refreshes automatically on transaction commit, or via configuration (Off, 1 min, 5 min, 10 min).
*   **Keyboard Shortcuts:**
    *   `Ctrl + R` to manually refresh.
    *   `Ctrl + Shift + D` to return to dashboard from any system screen.

---

## 5. Total Receivables Specification
*   **Purpose:** Monitors outstanding client credit.
*   **Business Importance:** Crucial for maintaining steady company cash flow and identifying bad debts early.
*   **Who Uses It:** Accounts Manager, Sales Executive, Owners.
*   **Navigation Path:** `/dashboard/receivables`
*   **Dependencies:** Sales Book, Cash/Bank Receipt Books.
*   **Calculation:** 
    $$\text{Total Receivables} = \sum(\text{Sales Invoices}) + \sum(\text{Debit Notes}) - \sum(\text{Receipts}) - \sum(\text{Credit Notes})$$
*   **Information Displayed:**
    *   *Ageing Buckets:* 0-15 Days, 16-30 Days, 31-60 Days, 61-90 Days, 90+ Days.
    *   *Party Summary Table:* List of top debtors sorted by largest outstanding balances.
*   **Drill Down Behaviour:** Clicking a party row redirects to `/reports/party-ledger?id=<party_id>`. Clicking an aging segment redirects to the detailed aging report filtered by that segment.

---

## 6. Total Payables Specification
*   **Purpose:** Tracks amounts owed to suppliers.
*   **Business Importance:** Ensures supplier credit cycles are maintained without risking supply disruptions.
*   **Who Uses It:** Accounts Manager, Purchase Manager, Owners.
*   **Navigation Path:** `/dashboard/payables`
*   **Dependencies:** Purchase Book, Cash/Bank Payment Books.
*   **Calculation:** 
    $$\text{Total Payables} = \sum(\text{Purchase Invoices}) + \sum(\text{Supplier Debit Notes}) - \sum(\text{Payments}) - \sum(\text{Supplier Credit Notes})$$
*   **Information Displayed:**
    *   *Priority Indicators:* High-priority tags for vendors offering cash discounts for early settlement.
    *   *Ageing Summary:* List of upcoming payments sorted by due date.
*   **Drill Down Behaviour:** Double-clicking a row navigates directly to the supplier's Account Master ledger.

---

## 7. On Hand Money Specification
*   **Purpose:** Displays available operating capital.
*   **Business Importance:** Real-time visibility into immediate cash reserves for buying rough parcels.
*   **Who Uses It:** Owners, Accounts Manager.
*   **Navigation Path:** `/dashboard/cash-position`
*   **Dependencies:** Bank Cash Books, Multi-Currency Revaluation log.
*   **Calculation:** 
    $$\text{On Hand Money} = \sum(\text{Cash Ledger balances}) + \sum(\text{Bank Account balances in Local Currency})$$
*   **Information Displayed:**
    *   *Breakdown:* Separate cards showing physical vault cash, domestic bank accounts, and foreign currency bank accounts.
    *   *Forecast:* 7-day cash flow projection based on due receivables and payables.

---

## 8. Overdue Count Specification
*   **Purpose:** Lists invoices that have exceeded their credit terms.
*   **Business Importance:** Immediate trigger for recovery operations and payment holds.
*   **Who Uses It:** Accounts Manager, Sales Manager.
*   **Navigation Path:** `/dashboard/overdue`
*   **Dependencies:** Sales Book, Purchase Book, Party Masters.
*   **Information Displayed:**
    *   Count of overdue sales invoices highlighted in Red.
    *   Count of overdue purchase invoices highlighted in Amber.
*   **Reminder Behaviour:** Provides an action to generate payment reminders for WhatsApp or email.

---

## 9. Total Stock Specification
*   **Purpose:** Summarizes active inventory levels and valuations.
*   **Business Importance:** Prevents stockouts and displays total capital locked in inventory.
*   **Who Uses It:** Inventory Controller, Sales Executive, Owners.
*   **Navigation Path:** `/dashboard/stock`
*   **Dependencies:** Stock Ledger, Job Work registers, Trading memo book.
*   **Calculation:**
    $$\text{Total Stock} = \text{On-Hand Stock} + \text{Trading Memo Stock} + \text{Outsourced Job-Work Stock}$$
*   **Information Displayed:**
    *   *Categories:* Current On-Hand, Reserved (allocated to sales order), Job-Work, Trading Memo.
    *   *Warnings:* Alerts for negative inventory conditions or low-stock parameters.

---

## 10. Notification Alerts Specification
*   **Purpose:** System and operational notifications hub.
*   **Business Importance:** Alerts users to data, security, or compliance events requiring attention.
*   **Who Uses It:** All Users.
*   **Navigation Path:** Dashboard Sidebar / Notification Drawer.
*   **Dependencies:** Backup system, Authorization logs, Transaction engines.
*   **Alert Classifications:**
    *   *High Priority (Red):* Backup failure, Database sync error, Compliance filing deadline.
    *   *Medium Priority (Amber):* Pending transaction approval, Low stock warning.
    *   *Low Priority (Blue):* Software update available, User login notification.

---

## 11. Due Alerts Specification
*   **Purpose:** Visual calendar tracking future financial commitments.
*   **Business Importance:** Helps prevent check bounces and credit score issues.
*   **Who Uses It:** Accounts Manager, Owners.
*   **Navigation Path:** `/dashboard/due-alerts`
*   **Dependencies:** Sales Book, Purchase Book, Post-Dated Checks (PDC) registry.
*   **Information Displayed:**
    *   Due alerts grouped by timeline buckets: Today, Next 7 Days, Next 15 Days, Next 30 Days.
    *   Upcoming Post-Dated Checks scheduled for clearance.

---

## 12. Stock Overview Specification
*   **Purpose:** Evaluates stock movement velocity.
*   **Business Importance:** Helps identify stale inventory (capital sinks) versus fast-moving items.
*   **Who Uses It:** Inventory Controller, Sales Manager, Owners.
*   **Navigation Path:** `/dashboard/stock-overview`
*   **Dependencies:** Stock Ledger, Sales Book.
*   **Information Displayed:**
    *   *Fast Moving:* Stones/parcels sold within 15 days of grading.
    *   *Slow Moving:* Inventory in vault between 60 to 180 days.
    *   *Dead Stock:* Stock in vault exceeding 180 days.
    *   *Total Value:* Current cost valuation of each category.

---

## 13. Available Inventory by Quality Specification
*   **Purpose:** Breaks down available polished inventory by clarity, color, and cut.
*   **Business Importance:** Helps sales teams quickly answer customer inquiries.
*   **Who Uses It:** Sales Executive, Inventory Controller.
*   **Navigation Path:** `/dashboard/inventory-quality`
*   **Dependencies:** Quality Master, Stock Ledger.
*   **Information Displayed:**
    *   Tabular grid showing Carats available, Reserved Carats, and Current Valuation grouped by Quality Grade.
    *   Quick Search input for instant grade filtration.

---

## 14. Global Filters
Every dashboard widget must instantly filter when the following global filters are adjusted in the header:
*   **Company:** Select individual companies or consolidated views.
*   **Financial Year:** Restricts financial parameters to selected year.
*   **Date Range:** Calendar selector with presets.
*   **Broker:** Isolates metrics related to transactions routed through a specific broker.
*   **Account/Party:** Isolates ledger outstanding figures for specific clients/suppliers.
*   **Quality:** Filters inventory widgets by specific grading rules.

---

## 15. Charts Recommendation

| Widget | Recommended Chart | Business Rationale |
| :--- | :--- | :--- |
| **Cash Flow Trend** | Area Chart | Displays cumulative cash inflows and outflows over time, emphasizing liquidity growth. |
| **Aging Analysis** | Stacked Horizontal Bar | Easily compares outstanding receivables versus payables across age ranges (0-90+ days). |
| **Inventory by Quality** | Heat Map | Provides a grid view showing stock volume density across color (D-Z) and clarity (FL-I3) scales. |
| **Stock Velocity** | Donut Chart | Shows proportional breakdown of Fast, Slow, and Dead stock values. |
| **Daily Sales Target** | Gauge Chart | Visualizes progress against monthly or daily target sales milestones. |

---

## 16. Quick Actions
The quick action panel on the overview dashboard allows one-click or keyboard-shortcut navigation to primary forms:
*   **Create Sale:** Opens Sales Invoice entry screen.
*   **Create Purchase:** Opens Purchase Book entry screen.
*   **Cash Receipt/Payment:** Opens Cash Ledger entry screens.
*   **Journal Voucher:** Opens Journal entry.
*   **Create Master Popup:** Shortcuts to instantiate Account, Broker, or Quality Masters.

---

## 17. Permissions
Access to dashboard panels is controlled by the following permission flags:
*   `view_dashboard_financials`: Toggles visibility of Receivables, Payables, and Cash-on-Hand.
*   `view_dashboard_inventory`: Toggles visibility of Stock overview and Quality breakdown panels.
*   `export_dashboard_data`: Permits exporting widget grids to Excel/PDF.
*   `approve_dashboard_notifications`: Allows clearing system-level priority warnings.

---

## 18. Performance Recommendations
*   **Incremental View Caching:** Create indexed summaries in the MySQL database for metrics that require scans of large tables (such as Receivables aging). Update these views using database triggers or backend cache hooks rather than scanning tables on every dashboard load.
*   **Lazy Widget Loading:** Render core summary cards first, then load heavy charts asynchronously to prevent blocking the user interface.

---

## 19. Future Enhancements
*   **AI Business Insights:** Automated natural language explanations of cash flow drops or stock velocity shifts.
*   **Voice Search:** Support keyboard voice commands for quick stock checkups.
*   **User Personalization:** Allow individual users to drag, resize, and pin widgets matching their daily roles.

---

## 20. Dashboard Completion Checklist
*   [x] Standardize Dashboard structure and layout dimensions.
*   [x] Formulate behavior, calculations, and inputs for the 10 target dashboard pages.
*   [x] Outline global filter rules and chart visual selections.
*   [x] Define dashboard access permissions and performance optimizations.
