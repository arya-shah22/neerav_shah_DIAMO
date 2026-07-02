# DIAMO ERP – PHASE 14.10
## USER AUDIT, PERMISSION REPORTS & SECURITY ANALYTICS SPECIFICATION

---

## 1. Executive Summary
This document defines the Functional Specification Document (FSD) for the User Audit, Permission Reports, Login History, and Security Analytics module of DIAMO ERP. This module acts as the centralized system to manage employee registrations, map company-wise access controls, monitor user login timelines, restrict operator password configurations, and manage profile information.

---

## 2. Business Purpose
*   **Security Compliance:** Verifies that active access boundaries match organizational roles, preventing permission bloat.
*   **Audit Readiness:** Automatically logs and indexes security events (e.g., failed logins, blocked actions) for quick review during security audits.

---

## 3. User Reports
*   **User Directory Reports:** Renders complete directories of users, user detail histories, department-wise breakdowns, active/locked/disabled rosters, and recent updates.

---

## 4. Permission Reports
*   **Permission Verification Lists:** Generates Page permission grids, Module permission maps, Action matrices, Permission comparison tables, and historical Change timelines.

---

## 5. Login History Reports
*   **Access Tracking Reports:** Mapped templates for: Login History, Logout History, Failed Login attempts, Multiple Session alerts, and Forced logout logs.

---

## 6. Password Reports
*   **Credential Operations Reports:** Generates Password Reset histories, Password Change lists, Locked/Unlocked account logs, and Password policy compliance scorecards.

---

## 7. User Activity Reports
*   **Activity Telemetry Reports:** Standardized views tracking module visits, screen usage duration, CRUD operations per user, document printing/exports, and company switches.

---

## 8. Security Reports
*   **Vulnerability & Threat Logs:** Generates reports on Unauthorized access attempts, Blocked actions, Permission violations, and Suspicious activity alerts.

---

## 9. Audit Reports
*   **System Integrity Lists:** Tracks User configuration audits, Permission audits, Login logs, Password resets, and Company allocation audits.

---

## 10. Dashboard Analytics
*   **Live Telemetry Cards:** Active widgets showing: Total Registered Users, Active Sessions count, Idle user count, Blocked operations, and Today's Failed login alerts.

---

## 11. Search
Supports filters for: User ID, Employee Code, and Active Company ID.

---

## 12. Filters
Provides filters for: Access status, Event types (Login/Logout/Failed), and Department.

---

## 13. Sorting
Allows sorting by: Timestamp, User ID, and Module Name.

---

## 14. Print
*   **Print Formats:** Supports Portrait and Landscape print layouts. Auto-embeds Company Logo, Page Numbers, "Printed By" signatures, and watermark stamps.

---

## 15. PDF Export
*   **PDF Engine Parameters:** Encrypted files with custom header overlays, watermark stamps, and automated, timestamped filenames.

---

## 16. Export
*   **Supported File Types:** Excel, CSV, and High-Resolution PDF.

---

## 17. Validation
*   Validates audit integrity, checks for invalid date ranges, and flags corrupted audit logs.

---

## 18. Business Rules
1.  **Strict Balance Constraint:** Voucher save blocked if variance is not zero.
2.  **No Edits on Reconciled Vouchers:** Reversing or editing a voucher requires first undoing its reconciliation.
3.  **Approval Logs:** Historical approval records cannot be deleted.

---

## 19. Module Impact
*   Pulls and compiles security analytics across all transaction books, masters, databases, and settings panels.

---

## 20. Permissions
Access is regulated by the following flags:
*   `view_security_reports` / `print_audit_reports`
*   `export_audit_reports` / `view_permission_audit`

---

## 21. Audit
Logs all status changes:
*   Tracks report access, exported file histories, search inputs, and parameter changes.
*   Logs before and after JSON snapshots, user IDs, and system timestamps.

---

## 22. Notifications
*   **Vault Alerts:** Notifies users on new stock creation, duplicate certification flags, hold releases, or sales completions.

---

## 23. Performance
*   **Asynchronous Processing:** Long-period general ledger reports run in a background worker thread.
*   **Data Virtualization:** The UI uses lazy loading to render reports with 1,000,000+ rows without performance lag.

---

## 24. Error Handling
*   Handles database disconnections, corrupted data indexes, and concurrent report execution requests with clear error messages.

---

## 25. Edge Cases
*   **Mid-Year Edits:** Edits to historical transaction dates trigger automatic recalculations of all subsequent running balances.
*   **Closed Period Postings:** Blocks transaction entries in closed financial periods.

---

## 26. Future Enhancements
*   **RFID & Barcode Integration:** Direct scanning of physical packets to verify vault locations and update records.
*   **AI Profit Optimization:** Recommends optimal sorting mixes based on historical yields.

---

## 27. Architect Recommendations
1.  **Unique Barcode Constraints:** Enforce unique packet numbers to prevent overlapping dispatches.
2.  **Stateless Tracking API:** Run ageing calculations in background worker processes to prevent UI lag.

---

## 28. Final Completion Checklist
*   [x] Document journal types and entry modes (Simple vs. Advanced).
*   [x] Map the posting pipeline and double-entry validation equations.
*   [x] Detail the reversal voucher workflow and status flows.
*   [x] Map validations, permissions, and audit log rules.
*   [x] Document report and ledger integrations.
