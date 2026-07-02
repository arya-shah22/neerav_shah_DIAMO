# DIAMO ERP – PHASE 14.5
## MODULE PERMISSIONS & ACTION-LEVEL SECURITY SPECIFICATION

---

## 1. Executive Summary
This document defines the Functional Specification Document (FSD) for the Module Permissions, Action-Level Security, and Operation Access Control module of DIAMO ERP. This module acts as the centralized system to manage employee registrations, map company-wise access controls, monitor user login timelines, restrict operator password configurations, and manage profile information.

---

## 2. Business Purpose
*   **Operational Control:** Separates read access from modification privileges, allowing staff to view registers without granting edit permissions.
*   **Process Security:** Enforces segregation of duties, such as restricting purchase validations to specific departments.

---

## 3. Action Permissions
*   **Action Matrix:** Supports granular rules for actions: View, Create, Edit, Delete, Print, Print Preview, PDF Export, Excel Export, CSV Export, Approve, Reject, Cancel, Duplicate, and Import/Export.

---

## 4. Module-Wise Permissions
*   **Module Scope Targets:** Configured across all masters, transaction books, stock managers, GST/TDS registers, system settings, database utilities, and audit logs.

---

## 5. Examples
*   *Sales Module Setup Example:*
    *   View: Yes
    *   Create: Yes
    *   Edit: Yes
    *   Delete: No (Blocked)
    *   Export Excel: No (Blocked)

---

## 6. Action Behaviour
*   **UI Button Hiding Rules:** If an action permission is disabled, the corresponding button (e.g., Edit, Delete, Export, Approve) is hidden from the user interface.

---

## 7. Unauthorized Action
*   **Interception Warning Dialog:** If a user bypasses UI controls and attempts to execute blocked operations, the system blocks the action and displays:
    ```
    Access Denied
    You do not have permission to perform this action.
    Please contact your Super Administrator.
    ```

---

## 8. Multi-Company Action Permissions
*   **Company-Specific Actions:** Action permissions are configured separately for each company. Active permissions automatically update when the user switches between company profiles.

---

## 9. Dependent Permissions
*   **Permission Dependency Rules:**
    *   If `View` is disabled, the system automatically disables `Create`, `Edit`, `Delete`, `Print`, `Export`, and `Approve`.
    *   If `Create` is disabled, the `New` button is hidden.

---

## 10. Search
Supports filters for: Module Name, Action, Company ID, and User ID.

---

## 11. Filters
Provides filters for: Access State (Allowed/Denied), Department, and User ID.

---

## 12. Sorting
Allows sorting by: Module, Action, and Permission Status.

---

## 13. Validation
*   Validates permission records, checks for missing View permissions on active sub-actions, and flags conflicting roles.

---

## 14. Business Rules
1.  **Strict Balance Constraint:** Voucher save blocked if variance is not zero.
2.  **No Edits on Reconciled Vouchers:** Reversing or editing a voucher requires first undoing its reconciliation.
3.  **Approval Logs:** Historical approval records cannot be deleted.

---

## 15. Module Impact
*   Impacts master forms, transaction grids, report lists, settings panels, database backups, and utility dashboards.

---

## 16. Permissions
Access is regulated by the following flags:
*   `view_permission_matrix` / `assign_action_permissions`
*   `copy_permission_matrix` / `override_action_block`

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
*   Handles permission conflicts, missing view permissions, and database save errors with clear error messages.

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
