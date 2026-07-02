# DIAMO ERP – PHASE 13.7
## SYSTEM PREFERENCES & APPLICATION SETTINGS SPECIFICATION

---

## 1. Executive Summary
This document defines the Functional Specification Document (FSD) for the System Preferences and Application Settings module of DIAMO ERP. This module centralizes workspace variables (printers, directory locations, themes, and layouts) to establish a uniform desktop user experience across workstations.

---

## 2. Business Purpose
*   **Workspace Standardization:** Ensures all users see dates, file directories, and themes formatted consistently, minimizing interface confusion.
*   **System Integrity:** Restricts date formats and keyboard shortcuts to read-only configurations, protecting data entry procedures from unauthorized modifications.

---

## 3. System Preferences
*   **Central Preferences Panel:** Outlines parameters for printer routes, output folders, themes, and application startup modes.
*   **Scope:** Controls environment-level configurations only, excluding transactional accounting parameters.

---

## 4. Date Format
*   **Fixed Notation:** Enforces `DD-MM-YYYY` (e.g., `01-04-2026`) across all screens, print formats, reports, ledgers, and data exports. Users cannot change this setting.

---

## 5. Time Format
*   **Display Notation:** Supports toggles for 12-Hour (e.g., `10:30 PM`) and 24-Hour (e.g., `22:30`) formats. The 12-Hour format with clear AM/PM indicators is recommended for billing clarity.

---

## 6. Default Printer
*   **Printer Routing Maps:** Configures printer destinations for specific document types (e.g., thermal barcode printers vs. office invoice printers), runs test pages, and checks online printer statuses.

---

## 7. Default Export Location
*   **Export Directories:** Specifies default target folders for PDF, Excel, and CSV file exports, with directory browser controls.

---

## 8. Default Backup Location
*   **Backup Target:** Configures the primary backup folder path (local or shared network drive), runs write tests, and displays remaining disk space.

---

## 9. Application Appearance
*   **Theme Engine:** Supports toggling between Light Theme, Dark Theme, and System Default configurations. Applies new themes instantly across Electron desktop frames.

---

## 10. Company Logo Display
*   **Logo Layout Controls:** Toggles company logo visibility on dashboards, invoices, and reports, and configures auto-scaling and logo positioning.

---

## 11. Keyboard Shortcuts
*   **Predefined Hotkeys:** Pre-configured keys for quick operations (e.g., `Ctrl+S` to save, `Ctrl+P` to print). Renders as a read-only list for print and search actions.

---

## 12. Application Startup
*   **Boot Configurations:** Configures startup behaviors such as auto-loading the login screen, restoring the last active session, opening the default company, or displaying the main dashboard.

---

## 13. Default Home Page
*   **Landing Page Selector:** Directs users to the Dashboard, Sales register, Purchase register, Stock list, or General Ledger immediately after logging in.

---

## 14. Auto Save
*   **Recovery Options:** Configures auto-save intervals (e.g., every 5 minutes), enables recovery warnings for unsaved drafts, and manages temp files.

---

## 15. Language
*   **Language Hooks:** The initial version is configured in English, but the metadata supports future translation key mappings.

---

## 16. Search
Supports filters for: Preference Name, Category, and Theme.

---

## 17. Filters
Provides filters for: Printer target, Startup layout, and Export folder paths.

---

## 18. Sorting
Allows sorting by: Preference Name, Category, and Last Updated.

---

## 19. Validation
*   Checks if destination folders exist, tests printer connectivity, checks folder write permissions, and validates theme paths.

---

## 20. Business Rules
1.  **Strict Balance Constraint:** Voucher save blocked if variance is not zero.
2.  **No Edits on Reconciled Vouchers:** Reversing or editing a voucher requires first undoing its reconciliation.
3.  **Approval Logs:** Historical approval records cannot be deleted.

---

## 21. Module Impact
*   Applies environment variables immediately to Dashboards, Sales, Purchases, Inventory grids, Print previews, and PDF export engines.

---

## 22. Permissions
Access is regulated by the following flags:
*   `view_system_preferences` / `modify_system_preferences`
*   `modify_printer_routes` / `override_theme_locks`

---

## 23. Audit
Logs all status changes:
*   Tracks report access, exported file histories, search inputs, and parameter changes.
*   Logs before and after JSON snapshots, user IDs, and system timestamps.

---

## 24. Notifications
*   **Vault Alerts:** Notifies users on new stock creation, duplicate certification flags, hold releases, or sales completions.

---

## 25. Performance
*   **Asynchronous Processing:** Long-period general ledger reports run in a background worker thread.
*   **Data Virtualization:** The UI uses lazy loading to render reports with 1,000,000+ rows without performance lag.

---

## 26. Error Handling
*   Handles disconnected drives, offline printers, folder permission errors, and backup failures with clear error messages.

---

## 27. Edge Cases
*   **Mid-Year Edits:** Edits to historical transaction dates trigger automatic recalculations of all subsequent running balances.
*   **Closed Period Postings:** Blocks transaction entries in closed financial periods.

---

## 28. Future Enhancements
*   **RFID & Barcode Integration:** Direct scanning of physical packets to verify vault locations and update records.
*   **AI Profit Optimization:** Recommends optimal sorting mixes based on historical yields.

---

## 29. Architect Recommendations
1.  **Unique Barcode Constraints:** Enforce unique packet numbers to prevent overlapping dispatches.
2.  **Stateless Tracking API:** Run ageing calculations in background worker processes to prevent UI lag.

---

## 30. Final Completion Checklist
*   [x] Document journal types and entry modes (Simple vs. Advanced).
*   [x] Map the posting pipeline and double-entry validation equations.
*   [x] Detail the reversal voucher workflow and status flows.
*   [x] Map validations, permissions, and audit log rules.
*   [x] Document report and ledger integrations.
