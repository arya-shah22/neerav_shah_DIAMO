# DIAMO ERP – PHASE 14.4
## PAGE ACCESS CONTROL, MENU PERMISSIONS & NAVIGATION SECURITY SPECIFICATION

---

## 1. Executive Summary
This document defines the Functional Specification Document (FSD) for the Page Access Control, Menu Permissions, and Navigation Security module of DIAMO ERP. This module acts as the centralized system to manage employee registrations, map company-wise access controls, monitor user login timelines, restrict operator password configurations, and manage profile information.

---

## 2. Business Purpose
*   **Access Protection:** Restricts visibility of system screens (e.g., margins, stock values) based on user roles.
*   **UI Simplification:** Streamlines user workflows by hiding unassigned menu choices, reducing navigation clutter.

---

## 3. Page Permission Management
*   **Permission Updates:** Only the Super Admin can configure page settings, including enabling/disabling access, copying permission setups from other users, and resetting permissions.

---

## 4. Supported Modules
*   **Access Scope Targets:** Applies across all modules, including Masters, Transaction books, Inventory registers, GST/TDS tax files, Database Backups, Restores, and Diagnostics panels.

---

## 5. Menu Visibility
*   **Visibility Enforcement Rules:** If a page is not assigned to a user, it is hidden from the sidebar menu, quick shortcuts, navigation explorer, search queries, pinned workspaces, and favorites.

---

## 6. Page Access
*   **Interception Warning Overlay:** If a user attempts to manually load an unauthorized page (e.g., via browser logs or terminal triggers), the system blocks the page load, hides all data, and displays:
    ```
    Access Denied
    You do not have permission to access this page.
    Please contact your Super Administrator.
    ```

---

## 7. Multi-Company Page Access
*   **Company-Specific Permission Scopes:** Permissions are configured separately for each company. The user’s active permissions automatically update when they switch between company profiles.

---

## 8. Menu Groups
*   **Group Classifications:** Group-level permissions can be applied to Masters, Transactions, Inventory, Reports, Settings, Utilities, and Administration.

---

## 9. Page Hierarchy
*   **Cascading Dependencies:** Enforces nested hierarchies (e.g., Reports -> Ledger -> Ledger Print -> Ledger Export). Disabling a parent menu automatically disables access to all its sub-pages.

---

## 10. Search
Supports filters for: Page Name, Module Name, and Assigned User.

---

## 11. Filters
Provides filters for: Access Status (Assigned/Not Assigned), Module Group, and Company ID.

---

## 12. Sorting
Allows sorting by: Page Name, Module, and Status.

---

## 13. Validation
*   Checks for duplicate permissions, identifies missing parent permissions, flags invalid assignments, and checks company state limits.

---

## 14. Business Rules
1.  **Strict Balance Constraint:** Voucher save blocked if variance is not zero.
2.  **No Edits on Reconciled Vouchers:** Reversing or editing a voucher requires first undoing its reconciliation.
3.  **Approval Logs:** Historical approval records cannot be deleted.

---

## 15. Module Impact
*   Impacts the sidebar layout, search results, dashboard workspaces, favorites panels, and routing controls.

---

## 16. Permissions
Access is regulated by the following flags:
*   `view_page_permissions` / `assign_page_permissions`
*   `copy_permission_set` / `override_page_access`

---

## 17. Audit
Logs all status changes:
*   Tracks report access, exported file histories, search inputs, and parameter changes.
*   Logs before and after JSON snapshots, user IDs, and system timestamps.

---

## 18. Notifications
*   **Vault Alerts:** Notifies users on new stock creation, duplicate certification flags, hold releases, or sales completions.

---

## 20. Performance
*   **Asynchronous Processing:** Long-period general ledger reports run in a background worker thread.
*   **Data Virtualization:** The UI uses lazy loading to render reports with 1,000,000+ rows without performance lag.

---

## 21. Error Handling
*   Handles inheritance conflicts, unauthorized access, and database update issues with clear error messages.

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
