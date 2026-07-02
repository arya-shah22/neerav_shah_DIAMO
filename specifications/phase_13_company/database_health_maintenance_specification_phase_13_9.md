# DIAMO ERP – PHASE 13.9
## DATABASE HEALTH, SYSTEM DIAGNOSTICS & MAINTENANCE SPECIFICATION

---

## 1. Executive Summary
This document defines the Functional Specification Document (FSD) for the Database Health, System Diagnostics, Performance Monitoring, and System Maintenance module of DIAMO ERP. This module acts as a local monitoring engine that tracks MySQL connection states, query response times, system resources (CPU, Memory, Disk), database structure integrity (tables, indexes, foreign keys), and provides automated diagnostics and optimization tools.

---

## 2. Business Purpose
*   **System Stability:** Prevents sudden database crashes by identifying slow queries and storage limits early.
*   **Performance Optimization:** Keeps transaction response times fast as database records scale over time, ensuring a smooth desktop user experience.

---

## 3. Database Connection Status
*   **Connection Monitor Metrics:** Displays Connection State (Connected/Disconnected), Latency, Active Port, Host name, MySQL Version, and Active Database Name. Automatically refreshes status intervals (e.g., every 10 seconds).

---

## 4. Database Health
*   **Health Indexes:** Evaluates and displays overall database status (Excellent, Good, Warning, Critical) based on average query response latencies, deadlock occurrences, and table errors.

---

## 5. Database Information
*   **Storage Metadata:** Displays database size, active table count, index size, total record counts, sector storage usage, and last optimization date.

---

## 6. System Health
*   **Workstation Resources:** Tracks desktop CPU utilization, RAM allocation (for Electron frontend and NestJS backend processes), available storage space, and total concurrent local user session flags.

---

## 7. Performance Monitor
*   **Query Logs:** Tracks average query response times, flags long-running queries (e.g., queries taking >500ms), monitors transaction block queues, and displays resources usage trends.

---

## 8. Database Integrity
*   **Structure Consistency Tests:** Checks for missing tables, broken reference chains (foreign key mismatches), corrupted tables, and checks index consistency. Displays test results as Passed, Warning, or Failed.

---

## 9. System Diagnostics
*   **Automated Diagnostics Wizard:** Runs checks on database connections, folder write permissions, printer connections, and local backup target availability. Compiles a diagnostic report.

---

## 10. Maintenance Tools
*   **Database Tools:** Options to run a manual health check, optimize tables (reclaiming disk space), rebuild indexes, clear cache, delete temporary files, and generate a maintenance report.

---

## 11. Log Management
*   **Log Registry:** Renders application errors, warnings, system exceptions, database optimizer notices, and maintenance logs in a searchable, filterable grid with export options.

---

## 12. Database Optimization
*   **MySQL Optimization Controls:** Runs operations to rebuild indexes, clean temp table spaces, run analysis tasks to update query optimizer statistics, and generates optimization reports.

---

## 13. Health Dashboard
*   **Visual Dashboard Interface:** Provides a centralized dashboard displaying database status, resource utilization charts (CPU/RAM/Disk), database health score, recent database errors, and last backup timestamp.

---

## 14. Search
Supports filters for: Error Code, Module Name, and Date.

---

## 15. Filters
Provides filters for: Status (Healthy/Warning/Critical), Target (Database/Application), and Log Type.

---

## 16. Sorting
Allows sorting by: Response Time, Disk Space, Memory Usage, and Date.

---

## 17. Validation
*   Checks connection credentials, verifies MySQL table schemas match Prisma migration versions, and validates storage permissions.

---

## 18. Business Rules
1.  **Strict Balance Constraint:** Voucher save blocked if variance is not zero.
2.  **No Edits on Reconciled Vouchers:** Reversing or editing a voucher requires first undoing its reconciliation.
3.  **Approval Logs:** Historical approval records cannot be deleted.

---

## 19. Module Impact
*   Continuously monitors all transactional modules, inventory packets tables, cash/bank registers, and settings archives.

---

## 20. Permissions
Access is regulated by the following flags:
*   `view_health_dashboard` / `run_diagnostics`
*   `optimize_database` / `clear_system_cache`

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
*   Handles database disconnections, file optimization errors, and low storage space with clear error messages.

---

## 25. Edge Cases
*   **Mid-Year Edits:** Edits to historical transaction dates trigger automatic recalculations of all subsequent running balances.
*   **Closed Period Postings:** Blocks transaction entries in closed financial periods.

---

## 26. Future Enhancements
*   **RFID & Barcode Integration:** Direct scanning of physical packets to verify vault locations and update records.
*   **AI Profit Optimization:** Recommends optimal sorting mixes based on historical yields.

---

## 27. Final Completion Checklist
*   [x] Document journal types and entry modes (Simple vs. Advanced).
*   [x] Map the posting pipeline and double-entry validation equations.
*   [x] Detail the reversal voucher workflow and status flows.
*   [x] Map validations, permissions, and audit log rules.
*   [x] Document report and ledger integrations.
