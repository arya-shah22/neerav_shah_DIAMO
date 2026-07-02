# DIAMO ERP – PHASE 13.6
## BACKUP, RESTORE & RECOVERY MANAGEMENT SPECIFICATION

---

## 1. Executive Summary
This document defines the Functional Specification Document (FSD) for the Backup, Restore, and Recovery Management module of DIAMO ERP. This module ensures business continuity by coordinating database backups, schedule intervals, storage directories, validation checksum checks, and rollback recovery steps.

---

## 2. Business Purpose
*   **Disaster Recovery:** Protects financial ledgers and packet databases from hardware crashes or data corruption.
*   **System Audit Compliance:** Generates verified snapshots of the database state to comply with corporate auditing requirements.

---

## 3. Backup Types
*   **Automatic Backup:** Automated background backups that run with minimal impact on user operations.
*   **Manual Backup:** Ad-hoc snapshots created before significant upgrades or financial year closings.
*   **Scheduled Backup:** Recurrent database exports configured to run daily or weekly.
*   **Company-wise Backup:** Exports selected company profiles and ledger records instead of the entire database.

---

## 4. Automatic Backup
*   **Configuration Parameters:** Backup Frequency (Daily, Weekly, Monthly), execution time (e.g., 22:00 IST), destination folder, max retention files, and automatic rotation.

---

## 5. Manual Backup
*   **Ad-hoc Operations:** Manual snapshot creation with a comments field, file path selector, and real-time completion progress indicator.

---

## 6. Scheduled Backup
*   **Chron Planner:** Configures recurrence intervals (Daily, Weekly, Monthly), allows scheduling specific times, and includes options to pause or resume tasks.

---

## 7. Backup Storage
*   **Destination Options:** Support for local directories, external hard drives, network attached storage (NAS), and cloud backup targets. Shows remaining disk space before starting a backup.

---

## 8. Backup Validation
*   **Verification Engine:** Automatically checks backup integrity by comparing file sizes, testing data structures, and generating MD5 checksums.

---

## 9. Backup History
*   **History Logs:** Displays Backup ID, Name, Type, Company, Creator, Size, Validation Status, and comments.

---

## 10. Restore Management
*   **System Restoration:** Restores complete system databases or single company files. Requires multi-level manager approvals and displays restoration progress.

---

## 11. Restore Validation
*   **Compatibility Verification:** Checks backup compatibility, database versions, and checksum hashes before starting a restore.

---

## 12. Restore Workflow
1.  **Backup Selection:** Select a backup file from the archive grid.
2.  **Compatibility Validation:** The system verifies checksum matches and version compatibility.
3.  **Restoration Confirmation:** Requires two-factor authentication and manager confirmation.
4.  **Database Restructure:** Overwrites database states in transaction-safe blocks.
5.  **Post-Restore Verification:** Runs system health tests to check balance accounts.
6.  **Audit Trail Entry:** Logs the restore operation in the system audit registry.

---

## 13. Recovery Management
*   **System Recovery Logs:** Provides rollback tools to revert failed restores or interrupted backups to the last stable state.

---

## 14. Backup Information
*   **Snapshot Metadata:** Displays File Name, Database Engine version, Company Count, total transaction rows, file size, and creation date.

---

## 15. Search
Supports filters for: Backup Name, Creator, and Date.

---

## 16. Filters
Provides filters for: Status (Passed/Failed), Type, and Company ID.

---

## 17. Sorting
Allows sorting by: Backup Date, File Size, and Validation Duration.

---

## 18. Validation
*   Validates disk space availability, file formats, database versions, and file permissions before starting backup or restore tasks.

---

## 19. Business Rules
1.  **Strict Balance Constraint:** Voucher save blocked if variance is not zero.
2.  **No Edits on Reconciled Vouchers:** Reversing or editing a voucher requires first undoing its reconciliation.
3.  **Approval Logs:** Historical approval records cannot be deleted.

---

## 20. Module Impact
*   Protects all data matrices including companies, accounts, inventory packets, sales registers, job books, and user profiles.

---

## 21. Permissions
Access is regulated by the following flags:
*   `view_backup_history` / `create_manual_backup`
*   `restore_database_backup` / `modify_backup_schedules`

---

## 22. Audit
Logs all status changes:
*   Tracks report access, exported file histories, search inputs, and parameter changes.
*   Logs before and after JSON snapshots, user IDs, and system timestamps.

---

## 23. Notifications
*   **Vault Alerts:** Notifies users on new stock creation, duplicate certification flags, hold releases, or sales completions.

---

## 24. Performance
*   **Asynchronous Processing:** Long-period general ledger reports run in a background worker thread.
*   **Data Virtualization:** The UI uses lazy loading to render reports with 1,000,000+ rows without performance lag.

---

## 25. Error Handling
*   Handles full disks, power interruptions, corrupted backup files, and database lockouts with clear error messages.

---

## 26. Edge Cases
*   **Mid-Year Edits:** Edits to historical transaction dates trigger automatic recalculations of all subsequent running balances.
*   **Closed Period Postings:** Blocks transaction entries in closed financial periods.

---

## 27. Future Enhancements
*   **RFID & Barcode Integration:** Direct scanning of physical packets to verify vault locations and update records.
*   **AI Profit Optimization:** Recommends optimal sorting mixes based on historical yields.

---

## 28. Architect Recommendations
1.  **Unique Barcode Constraints:** Enforce unique packet numbers to prevent overlapping dispatches.
2.  **Stateless Tracking API:** Run ageing calculations in background worker processes to prevent UI lag.

---

## 29. Final Completion Checklist
*   [x] Document journal types and entry modes (Simple vs. Advanced).
*   [x] Map the posting pipeline and double-entry validation equations.
*   [x] Detail the reversal voucher workflow and status flows.
*   [x] Map validations, permissions, and audit log rules.
*   [x] Document report and ledger integrations.
