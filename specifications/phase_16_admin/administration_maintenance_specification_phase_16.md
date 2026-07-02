# DIAMO ERP – PHASE 16
## ADMINISTRATION, DATABASE MAINTENANCE, SYSTEM UTILITIES & ENTERPRISE MAINTENANCE CENTER SPECIFICATION

---

## 1 Executive Summary
This document defines the functional specification for the Administration, Database Maintenance, System Utilities, and Enterprise Maintenance Center of DIAMO ERP. This module acts as the centralized control panel for Super Admins to monitor application health, perform data integrity checks, clear application cache, archive system logs, execute diagnostic checks, and resolve database consistency errors. All maintenance and repair activities are built upon non-disruptive background polling threads, preserving Electron thread responsiveness while enforcing strict Maker-Checker confirmation steps before execution.

---

## 2 Business Purpose
*   **Centralized Administration:** Provides system administrators with a single, unified view of server configurations, multi-company scope permissions, and running processes.
*   **Database Maintenance:** Prevents degradation in database execution speeds by analyzing fragmentation metrics and rebuilding indexes during off-peak hours.
*   **Performance Optimization & Monitoring:** Collects key metrics (average query response times, memory footprints, load times) to forecast system bottlenecks.
*   **Data Integrity Protection:** Automates consistency audits between the inventory ledger, outstanding balances, and transaction logs, providing safe repair tools.
*   **Business Continuity:** Ensures database operations remain stable, secure, and reliable, preventing accidental loss or metadata mismatch issues.

---

## 3 System Administration
The Administration Dashboard displays critical high-level metadata:
*   **ERP Telemetry:** 
    *   ERP Name: DIAMO ERP Enterprise Edition
    *   ERP Version: v16.4.12
    *   Build Number: Build-2026.07-02
    *   Installation Date: 2026-07-01
*   **Operational Scope:**
    *   Current Financial Year: 2026-2027 (Active)
    *   Selected Company: DIAMO Trading Co. (HQ)
    *   Total Mapped Companies: 14 Companies
*   **User Analytics:**
    *   Total Registered Users: 84 Users
    *   Active Sessions: 18 Users
    *   Inactive/Suspended Accounts: 66 Users
*   **System & Database Health:**
    *   Database Status: Connected (Active)
    *   Database Version: MySQL 8.0.35 Enterprise Edition
    *   Application Uptime: 4 days, 12 hours, 18 minutes
    *   Overall System Health Score: 98% (Normal)
*   **License Info:**
    *   License Type: Enterprise Multi-Site (Permanent License)
    *   Current Logged-in Super Admin: Administrator (ID: admin_001)

---

## 4 Database Maintenance
Provides the following administrative database management tools:
*   **Database Optimization Engine:**
    *   *Optimize Tables:* Analyzes tables and reclaims unused memory space from deleted rows.
    *   *Rebuild Indexes:* Triggers index reorganizations to clean fragmented storage blocks.
    *   *Refresh Statistics:* Updates MySQL optimizer metadata stats for fast query plan executions.
    *   *Cleanup Temporary Records:* Flushes stale database records, invalid draft states, and discarded session variables.
*   **Database Storage Diagnostics:**
    *   *Fragmentation Index:* Displays fragmentation rates by table.
    *   *Storage Usage telemetry:* Displays total data size, index size, free space, and transaction log sizes.
    *   *Maintenance History:* Keeps track of previous optimization dates, tables repaired, and space reclaimed.

---

## 5 Cache Management
Provides clear controls to invalidate application cache parameters:
*   **Cache Targets:**
    *   *Application Cache:* Clears core UI states and routing configurations.
    *   *Dashboard Cache:* Clears cached KPI widgets and monthly summary values.
    *   *KPI Card Cache:* Invalidates card values for Today's Sales, Payables, and Stock counts.
    *   *Temporary Cache:* Purges local workspace backups and draft buffers.
    *   *Print Cache:* Flushes cached PDF/ZPL layouts and barcode formatting assets.
    *   *Report Cache:* Clears cached MIS outputs, Balance Sheets, and Outstanding Ledger values.
    *   *Export Cache:* Clears compiled CSV/Excel export directories.
*   **Cache Analytics:** Displays memory sizes occupied by each cache layer and execution hits/misses statistics.

---

## 6 Log Management
Exposes a centralized Log Analyzer for viewing, searching, and managing system logs:
*   **Log Categories:**
    *   *Application Logs:* Front-end Electron rendering logs and back-end process flows.
    *   *System Logs:* Local hardware interactions, platform updates, and printer statuses.
    *   *Database Logs:* Slow queries, connection pools, and ORM compilation issues.
    *   *Error Logs:* Uncaught exceptions, validation blockades, and operation abort messages.
    *   *Warning Logs:* High resource usages, threshold warnings, and missing non-critical assets.
    *   *Maintenance Logs:* Index rebuild timings, database optimization stats, and cache flushes.
    *   *Security Logs:* Unrecognized login locations, blocked attempts, and permission resets.
    *   *Audit Logs:* Double-entry modifications, ledger edits, and administrator overrides.
*   **Retention & Archiving Rules:**
    *   *Retention Period:* Logs are retained locally for 90 days.
    *   *Automatic Archiving:* Logs older than 90 days are compressed into zip files and moved to `/archives/logs/`.
    *   *Delete Action:* Allows manual deletion of historical logs older than 180 days.

---

## 7 Data Integrity & Repair Utilities
Automates error detection and verification across core registries:
*   **Consistency Audits:**
    *   *Ledger Integrity Check:* Verifies that debit balances match credit balances across all active ledgers.
    *   *Inventory Integrity Check:* Matches total packet weight sums against current stock registry values.
    *   *Stock vs. Challan Check:* Matches Jhanghad items, Job Work issues, and Outward reservations to verify no double allocations.
    *   *Outstanding Consistency Check:* Matches cumulative invoice balances against customer/supplier ledgers.
    *   *Duplicate Records:* Scans for identical barcodes, packets, or transaction IDs.
    *   *Broken References:* Identifies ledger postings missing voucher links, or transactions missing companies/accounts.
*   **Safe Repair Workflow:**
    *   1. *Run Audit:* Scans database and lists detected anomalies.
    *   2. *Generate Repair Preview:* Shows what modifications the system proposes to make.
    *   3. *Enforce Backup:* Requires the Super Admin to click "Create Backup" before clicking "Apply Repair".
    *   4. *Apply Repair:* Executes the corrective operations within a transactional block, logging before-and-after values.

---

## 8 System Diagnostics
Allows the Super Admin to trigger a diagnostics checklist:
*   **Diagnostics Checklist:**
    *   *Database Connection Check:* Verifies connection pool availability and response latency.
    *   *Hardware Resource Audit:* Reads current CPU, memory, and disk usage space.
    *   *Backend Status Check:* Confirms that NestJS backend processes are responding.
    *   *Printer Status Check:* Confirms local label and documentation printer connections.
    *   *Backup Status Check:* Checks the location and validity of the most recent database backup.
*   **Output:** Generates a downloadable Diagnostic Report summarizing status indicators.

---

## 9 Performance Monitor
Displays real-time telemetry graphs showing ERP performance characteristics:
*   **Performance Metrics:**
    *   Dashboard Load Time (in milliseconds)
    *   Average Database Query Time
    *   Application Startup Time
    *   Current CPU & Memory usage profiles
    *   Total Database size and Transaction Log size
    *   Active concurrent user sessions count
    *   Overall Performance Score (based on query and layout speeds)

---

## 10 System Utilities
Provides quick recovery tools to reset operational states:
*   **System Action Center:**
    *   *Refresh System:* Hot-reloads memory configurations and states.
    *   *Reload Configuration:* Refreshes system settings without restarting the client.
    *   *Refresh Dashboard & Reports:* Evicts all dashboard and report cache tables.
    *   *Reload Permissions:* Hot-reloads role assignments and menu permissions.
    *   *Reload Companies:* Refreshes active multi-company metadata structures.
    *   *Restart Background Services:* Restarts background calculation threads and notification loops.

---

## 11 Search
*   **Global Administration Search:** Supports full-text search strings targeting:
    *   Maintenance tools (Optimization, Repair, Diagnostics parameters)
    *   Log contents (matching error codes, user IDs, or company names)
    *   Active companies, users, and processes metadata

---

## 12 Filters
*   **Filter Panel:**
    *   *Severity level:* Filter log lists by Healthy, Warning, or Critical flags.
    *   *Module Type:* Filter results by Database, Logs, Maintenance, Diagnostics, Optimization, or Repair categories.
    *   *Date Range:* Restrict log scans and history lists to specific dates.

---

## 13 Sorting
*   **Sorting Controls:**
    *   Sort log lists, optimization history, and repair previews by:
        *   Date (Creation/Execution time)
        *   Priority / Severity level
        *   Health Score / Performance Score
        *   Database table size
    *   Direction: Ascending or Descending.

---

## 14 Validation
Enforces strict checks before executing any administration task:
*   *Database Connection validation:* Aborts optimization and repair if connection pool size is critical or disconnected.
*   *Low Disk Space validation:* Blocks database index rebuilds if free storage space is under 15%.
*   *Memory Warning:* Alerts the admin if CPU/Memory utilization is above 90%.
*   *Permission Validation:* Verifies session holds a valid, unexpired Super Admin token.
*   *Repair Consistency verification:* Re-checks references before executing corrections to avoid data mismatch.

---

## 15 Business Rules
*   **Access Restraints:** Only active Super Admin accounts can open the Administration Center. Sub-admins and standard roles have no visibility or routing to this module.
*   **Non-Disruptive Optimizations:** Database table optimizations and statistics updates must execute as non-blocking processes, preventing table lock scenarios for active users.
*   **Confirmation & Authorization:** Data repairs, system refreshes, and cache purges require secondary password verification by the Super Admin before launch.
*   **Pre-Repair Backups:** The "Apply Repair" button is disabled until the Super Admin triggers or uploads a valid database backup.
*   **Full Auditing:** All actions (Cache flushes, repairs, database optimization steps) are logged to the immutable database audit trail.
*   **Log Retention:** Local log cleaning schedules must enforce log retention limits (archiving after 90 days, deletion after 180 days).

---

## 16 Module Impact
*   *Transactional Books (Sales, Purchase, Cash, Bank, JV, Job):* All entries are validated against integrity rules during audits.
*   *Inventory & Stock Registers:* Barcode counts, packets, and weights are reconciled against Jhanghad issue registers during consistency checks.
*   *System Dashboard:* Analytics data caches are evicted automatically following database maintenance and repair events to preserve report accuracy.
*   *User Security:* Permitted menu trees are synchronized instantly across active sessions when Permission Reload configurations are triggered.

---

## 17 Permissions
*   `view_administration_center`: Grants permission to access dashboard metrics and diagnostics.
*   `run_diagnostics`: Permission to check hardware metrics, network latency, and printer states.
*   `optimize_database`: Access to index rebuilds, table optimizations, and statistics updates.
*   `repair_database`: Permissions to check integrity and write database corrections.
*   `view_logs`: Grants permissions to search and filter application/system logs.
*   `clear_cache`: Grants permissions to purge cache pools.
*   `super_admin_override`: Overrides validation alerts (e.g., executing audits despite high memory usage).

---

## 18 Audit
All administration commands log:
*   User ID & Login Machine Name
*   Company ID Scope
*   Action Performed (e.g., `REPAIR_EXECUTED`, `INDEX_REBUILT`)
*   Affected database tables list
*   Before-and-after values of corrected records
*   Date, time, and admin's justification note

---

## 19 Notifications
*   `maintenance_completed`: Broadcast to Super Admin when background database optimization finishes.
*   `maintenance_failed`: High-priority alert to Super Admin if optimization fails or times out.
*   `critical_database_error`: Warning triggered when query latencies cross 5000ms.
*   `database_disconnected`: Triggered when MySQL server database drops connection.
*   `low_disk_space`: System warning when free database drive space is below 15%.
*   `high_resource_usage`: Triggered when client/server memory footprints cross 90%.

---

## 20 Reports
Generates the following reports:
*   *Administration Report:* Overview of versions, active users, database configurations, and active license details.
*   *Database Health Report:* Index sizes, fragmentation indexes, free space margins, and table statistics.
*   *Repair Report:* List of anomalies detected, actions taken, and before/after comparisons.
*   *Performance Telemetry Report:* Trends of average query latencies, dashboard load times, and system startup speeds.
*   *Audit Log Report:* Logs of all administrative activities.

---

## 21 Performance
*   *Background Calculations:* Diagnostics checklists and integrity checks are compiled asynchronously using worker threads, keeping Electron main loop latency under 16ms.
*   *Database Query Optimization:* Uses page-wise limits for log searches, avoiding large database locks.
*   *Telemetry Polling:* Performance monitor charts update via periodic stateless polling (every 60 seconds) rather than WebSockets, preventing UI thread overhead.

---

## 22 Error Handling
*   *Database Connection Drop:* The dashboard displays "Database Offline" in red, disables maintenance buttons, and logs the event to a local offline backup file.
*   *Disk Full Error:* The system blocks optimization activities, triggers an alert, and displays clear instructions to clean drive directories.
*   *Repair Interrupted:* If a repair utility fails mid-operation, the backend rolls back the transaction using SQL savepoints, restores original values, and logs the stack trace.
*   *Optimization Failures:* If an index rebuild fails, the optimizer falls back to the original index mapping and schedules a retry alert.

---

## 23 Edge Cases
*   *Power Failure Mid-Repair:* Handled by ACID transaction rollbacks. Upon database restart, incomplete transactions are resolved by InnoDB recovery logs.
*   *User Working During Optimization:* Optimizations are scheduled using non-blocking online index strategies, avoiding write blocks.
*   *Restoring a Corrupt Backup:* Restoring backups verifies file hash checksums before execution. Invalid checksums abort the recovery process.
*   *Version Mismatch:* Upgrading the application checks migration scripts. Version mismatches restrict user logins until database schema migrations complete.

---

## 24 Future Enhancements
*   *AI-Driven Database Tuning:* Automated detection of slow queries with auto-indexing recommendations.
*   *Self-Healing Databases:* Automatic recovery of corrupt index tables using background backup blocks.
*   *Forecasting Analytics:* Machine learning calculations predicting disk storage exhaustion based on current growth trends.
*   *Remote Cloud Telemetry:* Secure cloud monitoring links for off-site database status audits.

---

## 25 Architect Recommendations
1.  **Online Index Rebuilding:** Force the database storage engine to perform index rebuilds using non-locking online methods (`ONLINE = ON`) to prevent locking user operations.
2.  **Separate Logging Disk Partition:** Store log archives and diagnostics reports on a separate physical disk partition to ensure logging activity never exhausts core transactional database disk space.
3.  **Regular Automated Auditing:** Set database integrity checks to execute automatically every week during midnight maintenance windows.

---

## 26 Final Completion Checklist
*   [x] Executive Summary and Business Purpose defined.
*   [x] Administration Dashboard metrics mapped.
*   [x] Database optimization, fragmentation analysis, and statistics tools defined.
*   [x] Cache management and log retention rules mapped.
*   [x] Data integrity checking, preview, backup warning, and repair steps designed.
*   [x] Diagnostics checklist, overall health, and hardware monitors defined.
*   [x] Real-time performance monitors, active sessions, and scores documented.
*   [x] Search, filter, and sorting patterns described.
*   [x] Verification, business rules, module impact, permissions, and audit logs outlined.
*   [x] Notification types, diagnostic/maintenance report outputs, and error states defined.
*   [x] Checked that no code, SQL statements, APIs, or database tables are generated.
