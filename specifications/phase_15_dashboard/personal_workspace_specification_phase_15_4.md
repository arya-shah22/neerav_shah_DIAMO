# DIAMO ERP – PHASE 15.4
## PERSONAL WORKSPACE & PRODUCTIVITY CENTER SPECIFICATION

---

## 1. Executive Summary
This document defines the Functional Specification Document (FSD) for the Workspace, Favorite Pages, Quick Actions, and Personal Productivity Center module of DIAMO ERP. This module provides a customizable desktop landing page where users can manage page shortcuts, track recently opened registers, pin active screens, and execute transaction entries directly.

---

## 2. Business Purpose
*   **Operational Efficiency:** Eliminates nesting menu navigations for daily users by placing primary action buttons directly on the home workspace.
*   **Segmented Focus:** Enables inventory managers, accounts departments, and billing clerks to configure unique workspaces tailored to their duties.

---

## 3. Personal Workspace
*   **Landing Page Components:** Automatically loads upon user login. Displays Pinned Pages, Favorite Pages, Quick Access Tiles, Recent Pages, and Most Frequently Used lists.

---

## 4. Pinned Pages
*   **Custom Shortcuts Panel:** Allows users to pin/unpin pages, drag and drop tiles, reorder screens, and group shortcuts (e.g., Sales, Purchases, Stock Explorer, Cash Book, Bank Book).

---

## 5. Favorite Pages
*   **Personal Bookmark Directory:** Enables users to bookmark modules as favorites. Maintains user-isolated lists with dedicated search and sorting controls.

---

## 6. Recent Pages
*   **Chronological Access Trail:** Automatically logs recently opened pages, visited reports, active transaction records, and updated masters with date/time stamps.

---

## 7. Most Used Pages
*   **Usage Telemetry Tracking:** The system monitors page open counts over the past 30 days, calculating frequency values to dynamically list the user's top 5 most frequently used areas.

---

## 8. Quick Actions
*   **One-Click Entry Operations:** Action buttons that launch entries directly (e.g., `New Sale Invoice`, `New Purchase Bill`, `Cash Receipt`, `Cash Payment`, `Add Diamond Stock`, `Add Customer Account`).
*   *Security:* Actions are hidden if the user lacks the corresponding create permissions.

---

## 9. Workspace Customization
*   **Personalization Editor:** Allows users to show/hide sections, reorder layout grids, toggle the Recent Pages panel, and reset the dashboard back to system defaults.

---

## 10. Default Workspace
*   **Admin Preset Management:** Super Admins can configure default workspace layouts based on Department (e.g., Accounts vs. Sales) or Designation. New users inherit these templates as their starting layout.

---

## 11. Multi-Company Support
*   **Scoped Visibility Control:** Pinned shortcuts are company-scoped. Switching companies dynamically filters out pages or actions that are not active or permitted under the newly selected company profile.

---

## 12. Search
Supports search for: Pinned Pages, Favorites, Recent pages, and Quick Actions.

---

## 13. Filters
Provides filters for: Module, Status (Pinned/Favorite/Recent), and Company ID.

---

## 14. Sorting
Allows sorting by: Alphabetical, Most Used, and Recently Used.

---

## 15. Validation
*   Validates shortcuts, flags duplicate pins, and handles pages from disabled modules or revoked permissions.

---

## 16. Business Rules
1.  **Strict Balance Constraint:** Voucher save blocked if variance is not zero.
2.  **No Edits on Reconciled Vouchers:** Reversing or editing a voucher requires first undoing its reconciliation.
3.  **Approval Logs:** Historical approval records cannot be deleted.

---

## 17. Module Impact
*   Integrates with all ERP screens, masters, and reporting modules to track usage and launch shortcuts.

---

## 18. Permissions
Access is regulated by the following flags:
*   `view_personal_workspace` / `customize_workspace_layout`
*   `use_quick_actions` / `restore_default_workspace`

---

## 19. Audit
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
*   Handles page path removals and database connection failures gracefully with clear error messages.

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
