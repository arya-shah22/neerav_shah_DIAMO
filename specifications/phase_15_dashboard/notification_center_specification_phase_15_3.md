# DIAMO ERP – PHASE 15.3
## NOTIFICATION CENTER & ALERT MANAGEMENT SPECIFICATION

---

## 1. Executive Summary
This document defines the Functional Specification Document (FSD) for the Notification Center, Alert Management, Due Reminders, and Business Alerts module of DIAMO ERP. This module acts as the centralized system to manage employee registrations, map company-wise access controls, monitor user login timelines, restrict operator password configurations, and manage profile information.

---

## 2. Business Purpose
*   **Operational Risk Reduction:** Prevents delayed supplier payments and customer collection gaps by generating automated alerts for upcoming dues.
*   **Administrative Oversight:** Notifies administrators immediately of database issues, backup completions, or password modification requests.

---

## 3. Notification Center
*   **Notification Panel Layout:** The slide-out tray displays Notification Title, description summary, Priority level, Date/Time stamps, Source Module, target Company ID, and status (Unread/Read/Dismissed/Resolved).

---

## 4. Receivable Alerts
*   **Inward Cash Reminders:** Notifies users on receivables due today, tomorrow, within 7 days, overdue, and large pending balances.
*   *Click Action:* Navigates to the corresponding Invoice details page.

---

## 5. Payable Alerts
*   **Outward Cash Reminders:** Notifies users on payables due today, tomorrow, within 7 days, overdue, and large outstanding invoices.
*   *Click Action:* Navigates to the corresponding Purchase Bill page.

---

## 6. Stock Alerts
*   **Inventory Telemetry Alerts:** Notifies users on packets held on trading challans, recently sold volumes, inventory audit flags, and low-stock indicators.
*   *Click Action:* Opens the Diamond Stock lifecycle page.

---

## 7. System Alerts
*   **Infrastructure Health Warnings:** Logs database health warnings, backup errors, system locks, financial year conversions, and local license status updates.

---

## 8. User Alerts
*   **Access Telemetry Alerts:** Logs account lockout events, admin password updates, permission changes, and unauthorized access attempts.

---

## 9. Financial Alerts
*   **Accounting Warning Indicators:** Logs daily sales benchmarks, negative cash balances, overdraft violations, and unposted journal entries.

---

## 10. Priority Levels
*   **Priority Mappings:**
    *   *Critical:* Red flag (e.g., Database offline, negative cash balances).
    *   *High:* Orange flag (e.g., Overdue receivables, backup failures).
    *   *Medium:* Yellow flag (e.g., Approvals pending).
    *   *Low:* Blue flag (e.g., System maintenance announcements).
    *   *Information:* Grey flag (e.g., User login completed).

---

## 11. Notification Behaviour
*   **UI Status Toggles:** Provides toggles to mark notifications as read, mark all read, dismiss temporary alerts, or mark entries as resolved.

---

## 12. Due Reminders
*   **Payments Priority Register:** Displays due payment lists, upcoming customer collection dates, and past-due balances. Renders direct navigation shortcuts to target ledgers.

---

## 13. Search
Supports search for: Notification Title, Module, Customer, and Stock ID.

---

## 14. Filters
Provides filters for: Priority Level, Read/Unread status, Category (System/User/Financial), and Date Range.

---

## 15. Sorting
Allows sorting by: Priority, Date, and Company ID.

---

## 16. Validation
*   Validates notification structures, checks for missing target records, and flags deleted references.

---

## 17. Business Rules
1.  **Strict Balance Constraint:** Voucher save blocked if variance is not zero.
2.  **No Edits on Reconciled Vouchers:** Reversing or editing a voucher requires first undoing its reconciliation.
3.  **Approval Logs:** Historical approval records cannot be deleted.

---

## 18. Module Impact
*   Collects telemetry from Sales, Purchases, Inventory, Cash/Bank ledgers, Backups, and Database monitoring utilities.

---

## 19. Permissions
Access is regulated by the following flags:
*   `view_notifications_center` / `dismiss_system_alerts`
*   `resolve_due_reminders` / `configure_alert_rules`

---

## 20. Audit
Logs all status changes:
*   Tracks report access, exported file histories, search inputs, and parameter changes.
*   Logs before and after JSON snapshots, user IDs, and system timestamps.

---

## 21. Notification Engine
*   **Asynchronous Alert Processing:** Alerts are compiled by a background process. For this offline desktop system, a background thread scans registries every 10 minutes to generate notifications without lagging active UI views.

---

## 22. Performance
*   **Asynchronous Processing:** Long-period general ledger reports run in a background worker thread.
*   **Data Virtualization:** The UI uses lazy loading to render reports with 1,000,000+ rows without performance lag.

---

## 23. Error Handling
*   Handles loading failures and database disconnection warnings with clear error messages.

---

## 24. Edge Cases
*   **Mid-Year Edits:** Edits to historical transaction dates trigger automatic recalculations of all subsequent running balances.
*   **Closed Period Postings:** Blocks transaction entries in closed financial periods.

---

## 25. Future Enhancements
*   **RFID & Barcode Integration:** Direct scanning of physical packets to verify vault locations and update records.
*   **AI Profit Optimization:** Recommends optimal sorting mixes based on historical yields.

---

## 26. Architect Recommendations
1.  **Unique Barcode Constraints:** Enforce unique packet numbers to prevent overlapping dispatches.
2.  **Stateless Tracking API:** Run ageing calculations in background worker processes to prevent UI lag.

---

## 27. Final Completion Checklist
*   [x] Document journal types and entry modes (Simple vs. Advanced).
*   [x] Map the posting pipeline and double-entry validation equations.
*   [x] Detail the reversal voucher workflow and status flows.
*   [x] Map validations, permissions, and audit log rules.
*   [x] Document report and ledger integrations.
