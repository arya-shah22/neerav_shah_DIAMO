# DIAMO ERP – PHASE 14.6
## USER ACTIVITY MONITORING & PRODUCTIVITY MANAGEMENT SPECIFICATION

---

## 1. Executive Summary
This document defines the Functional Specification Document (FSD) for the User Activity Monitoring, User Tracking, Activity Logs, and Employee Productivity Management module of DIAMO ERP. This module acts as the centralized system to manage employee registrations, map company-wise access controls, monitor user login timelines, restrict operator password configurations, and manage profile information.

---

## 2. Business Purpose
*   **Audit Accountability:** Ensures a permanent, un-deletable log of all actions for internal audit compliance.
*   **Operational Transparency:** Analyzes feature usage patterns to find workflow bottlenecks and evaluate team productivity.

---

## 3. User Activity Log
*   **Activity Tracing Targets:** Automatically records operations: logins/logouts, module open attempts, CRUD edits, record approvals, document printing, file exports, database utilities execution, and company switches.

---

## 4. Activity Details
*   **Activity Record Fields:** Activity ID, User Name, Employee Code, Company ID, Module Name, Page path, Action performed, Record Number, Old JSON value, New JSON value, Computer Name, Date, Time, Success/Failure status, and override reasons.

---

## 5. Live User Monitoring
*   **Real-Time Monitoring Grid:** Renders currently active user profiles, their open page paths, active Company ID, session duration, last activity timestamps, and idle time durations.

---

## 6. Employee Productivity
*   **Performance Metrics:** Tracks total logins, total active work hours, counts of created vs. edited records, reports compiled, files exported, and daily average activities.

---

## 7. Module Usage Analysis
*   **Usage Telemetry:** Evaluates most used modules, average time spent per screen, page visit counts, and usage frequencies (daily/weekly/monthly).

---

## 8. Login History
*   **Access Registry:** Maintains logs of Login Date/Time, Logout Date/Time, Session Duration, Target Company, Host computer name, and status (Successful/Failed with reason).

---

## 9. User Timeline
*   **Chronological Action Flow:** Generates chronological user paths (e.g., `09:00 AM Login` -> `09:05 AM Sales Invoice Form Opened` -> `09:12 AM Invoice #102 Saved` -> `09:15 AM Ledger View`).

---

## 10. Search
Supports filters for: User ID, Employee Code, Module Name, and Date.

---

## 11. Filters
Provides filters for: Action (Create/Delete/Print/Export), Department, and Status (Success/Failed/Blocked).

---

## 12. Sorting
Allows sorting by: Timestamp, User ID, and Module Name.

---

## 13. Validation
*   Validates log structures, detects corrupted logs, and flags time-travel timestamp inconsistencies.

---

## 14. Business Rules
1.  **Strict Balance Constraint:** Voucher save blocked if variance is not zero.
2.  **No Edits on Reconciled Vouchers:** Reversing or editing a voucher requires first undoing its reconciliation.
3.  **Approval Logs:** Historical approval records cannot be deleted.

---

## 15. Reports
*   **Report Templates:** Generates User Activity Report, Daily Activity Summary, Monthly Activity Summary, Department Activity Report, Module Usage analysis, and Login/Failed Login logs.

---

## 16. Module Impact
*   Continuously monitors all transactional modules, inventory tables, cash/bank registers, and settings panels.

---

## 17. Permissions
Access is regulated by the following flags:
*   `view_activity_logs` / `view_productivity_reports`
*   `export_activity_logs` / `clear_temporary_logs`

---

## 18. Audit
Logs all status changes:
*   Tracks report access, exported file histories, search inputs, and parameter changes.
*   Logs before and after JSON snapshots, user IDs, and system timestamps.

---

## 19. Notifications
*   **Vault Alerts:** Notifies users on new stock creation, duplicate certification flags, hold releases, or sales completions.

---

## 20. Performance
*   **Asynchronous Processing:** Long-period general ledger reports run in a background worker thread.
*   **Data Virtualization:** The UI uses lazy loading to render reports with 1,000,000+ rows without performance lag.

---

## 21. Error Handling
*   Handles write failure rollbacks, log file corruption, and database disconnection exceptions with clear error messages.

---

## 22. Edge Cases
*   **Mid-Year Edits:** Edits to historical transaction dates trigger automatic recalculations of all subsequent running balances.
*   **Closed Period Postings:** Blocks transaction entries in closed financial periods.

---

## 23. Future Enhancements
*   **RFID & Barcode Integration:** Direct scanning of physical packets to verify vault locations and update records.
*   **AI Profit Optimization:** Recommends optimal sorting mixes based on historical yields.

---

## 24. Architect Recommendations
1.  **Unique Barcode Constraints:** Enforce unique packet numbers to prevent overlapping dispatches.
2.  **Stateless Tracking API:** Run ageing calculations in background worker processes to prevent UI lag.

---

## 25. Final Completion Checklist
*   [x] Document journal types and entry modes (Simple vs. Advanced).
*   [x] Map the posting pipeline and double-entry validation equations.
*   [x] Detail the reversal voucher workflow and status flows.
*   [x] Map validations, permissions, and audit log rules.
*   [x] Document report and ledger integrations.
