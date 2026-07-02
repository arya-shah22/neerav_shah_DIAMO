# DIAMO ERP – PHASE 15.5
## DASHBOARD PERSONALIZATION & PREFERENCES SPECIFICATION

---

## 1. Executive Summary
This document defines the Functional Specification Document (FSD) for the Dashboard Personalization, User Preferences, and Personal Layout Management module of DIAMO ERP. This module acts as the personalization manager, allowing operators to arrange widget hierarchies, set default landing pages, toggle visual sections, and customize their home screen layout without altering other user profiles.

---

## 2. Business Purpose
*   **Segmented User Workspaces:** Reduces visual clutter for data entry operators by hiding high-level analytics, while allowing managers to highlight KPI metrics.
*   **Reduced Navigation Load:** Speeds up daily workflows by redirecting users immediately to their designated transaction screens upon login.

---

## 3. Personal Dashboard
*   **Isolated Workspace Engine:** Customizations are stored against the logged-in User ID and active Company ID. Changes do not alter system defaults or configurations of other users.

---

## 4. Customizable Widgets
*   **Removable Widget Telemetry:** Supports enabling or disabling widgets for: Receivables, Payables, Current Stock, Today's Sales, Today's Purchase, Cash Book, Bank Book, Business Analytics, Notifications, Workspace, and Quick Actions.

---

## 5. Layout Management
*   **Arrangement Mechanics:** Supports drag-and-drop reordering, visibility switches, section partitioning, and toggles between Compact View (grid tiles) and Expanded View (expanded charts).

---

## 6. Default Landing Page
*   **Login Routing Targets:** Allows users to choose the page opened immediately after logging in (e.g., Dashboard, Sales Invoice, Purchase Bill, Stock Explorer, Reports, Cash Book, Bank Book, Personal Workspace).

---

## 7. Display Preferences
*   **Interface Toggle Swaps:** Configuration toggles to show/hide Company Logo, greetings, system date/time, financial year displays, overview summaries, and dashboard elements.

---

## 8. Widget Settings
*   **Individual Card Controls:** Each widget card header contains buttons to: Collapse, Expand, Refresh, Hide, Move, or Restore the card state.

---

## 9. User Preferences
*   **State Serialization:** Serializes user preference coordinates, widget orders, chosen landing page, active visibility flags, and last-saved dashboard positions.

---

## 10. Reset Options
*   **Default Recovery Actions:** Includes options to Reset Layout, Reset Widgets to original positions, Reset general display preferences, and Restore default landing page targets.

---

## 11. Multi-Company Support
*   **Company-Isolated Layouts:** Workspace layout arrangements are company-specific. If Company A is switched to Company B, the system automatically loads the corresponding preferences file assigned to Company B.

---

## 12. Search
Supports search for: Widget Name, Section, and Preference name.

---

## 13. Filters
Provides filters for: Visible widgets, Hidden widgets, and Company ID.

---

## 14. Sorting
Allows sorting by: Alphabetical, Most Used, and Manual order.

---

## 15. Validation
*   Validates landing page availability, identifies hidden page redirects, and flags broken widget mappings.

---

## 16. Business Rules
1.  **Strict Balance Constraint:** Voucher save blocked if variance is not zero.
2.  **No Edits on Reconciled Vouchers:** Reversing or editing a voucher requires first undoing its reconciliation.
3.  **Approval Logs:** Historical approval records cannot be deleted.

---

## 17. Module Impact
*   Integrates with Dashboard, Workspace, Analytics, Notifications, Quick Actions, and all transaction registries.

---

## 18. Permissions
Access is regulated by the following flags:
*   `customize_personal_dashboard` / `manage_dashboard_widgets`
*   `change_default_landing_page` / `restore_system_defaults`

---

## 20. Audit
Logs all status changes:
*   Tracks report access, exported file histories, search inputs, and parameter changes.
*   Logs before and after JSON snapshots, user IDs, and system timestamps.

---

## 20. Notifications
*   **Vault Alerts:** Notifies users on new stock creation, duplicate certification flags, hold releases, or sales completions.

---

## 21. Performance
*   **Asynchronous Processing:** Long-period general ledger reports run in a background worker thread.
*   **Data Virtualization:** The UI uses lazy loading to render reports with 1,000,000+ rows without performance lag.

---

## 22. Error Handling
*   Handles invalid widget definitions, corrupted layout maps, and missing module paths with clear error messages.

---

## 23. Edge Cases
*   **Mid-Year Edits:** Edits to historical transaction dates trigger automatic recalculations of all subsequent running balances.
*   **Closed Period Postings:** Blocks transaction entries in closed financial periods.

---

## 24. Future Enhancements
*   **RFID & Barcode Integration:** Direct scanning of physical packets to verify vault locations and update records.
*   **AI Profit Optimization:** Recommends optimal sorting mixes based on historical yields.

---

## 25. Architect Recommendations
1.  **Unique Barcode Constraints:** Enforce unique packet numbers to prevent overlapping dispatches.
2.  **Stateless Tracking API:** Run ageing calculations in background worker processes to prevent UI lag.

---

## 26. Final Completion Checklist
*   [x] Document journal types and entry modes (Simple vs. Advanced).
*   [x] Map the posting pipeline and double-entry validation equations.
*   [x] Detail the reversal voucher workflow and status flows.
*   [x] Map validations, permissions, and audit log rules.
*   [x] Document report and ledger integrations.
