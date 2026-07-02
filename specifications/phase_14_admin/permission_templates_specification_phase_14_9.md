# DIAMO ERP – PHASE 14.9
## PERMISSION TEMPLATES & ROLE PROFILES SPECIFICATION

---

## 1. Executive Summary
This document defines the Functional Specification Document (FSD) for the Permission Templates, Role Profiles, and Bulk User Permission Management module of DIAMO ERP. This module acts as the centralized system to manage employee registrations, map company-wise access controls, monitor user login timelines, restrict operator password configurations, and manage profile information.

---

## 2. Business Purpose
*   **Administrative Efficiency:** Avoids manual page-by-page and action-by-action settings when adding new users.
*   **Access Control Standardization:** Guarantees consistent security boundaries for staff in identical roles (e.g., all accountants have matching permissions).

---

## 3. Permission Template Management
*   **Template CRUD Controls:** Supports templates creation, modification, duplication, cloning, activation/deactivation, draft deletion, and structured visual previews.

---

## 4. Role Profiles
*   **Predefined Role Profiles:**
    *   *Default System Roles:* Super Administrator, Administrator, Manager, Accountant, Purchase Executive, Sales Executive, Inventory Manager, Stock Executive, Cashier, Data Entry Operator, Auditor, and Report Viewer.
    *   *Custom Roles:* The Super Admin can create custom roles with tailored permission sets.

---

## 5. Template Configuration
*   **Template Identity Fields:** Role Name, Role Description, Department, Company Scope, Default Home Page, Default Workspace, Status (Draft/Active/Inactive), and Remarks.

---

## 6. Permission Assignment
*   **Template Permission Scope:** Stores page authorization rules, module restrictions, action matrices, menu visibility settings, report limits, and printing/export rights.

---

## 7. User Assignment
*   **Template Binding Operations:** Assigns permission templates to individual users, replaces active user templates, detaches templates, and forces permission updates.

---

## 8. Bulk User Management
*   **Bulk Operations:** Supports assigning a template to multiple users, copying permission configurations between profiles, and resetting company permissions in bulk.

---

## 9. Template Cloning
*   **Cloning Workflow:** Clones an existing template as a draft, allowing edit changes without modifying the active source configuration. Maintains version histories for templates.

---

## 10. Permission Preview
*   **Pre-Commit Verification Panel:** Displays active permissions (modules, pages, actions, company scopes) and lists users bound to a template before saving changes.

---

## 11. Multi-Company Support
*   **Isolated Company Matrices:** Templates are managed separately for each company. An "Accountant" template in Company A can differ from Company B.

---

## 12. Default Role Assignment
*   **Auto-Binding Rules:** Allows defining a default permission template based on the user's Department, Designation, or Company ID.

---

## 13. Search
Supports filters for: Template Name, Predefined Role, and Department.

---

## 14. Filters
Provides filters for: Status (Active/Inactive), Company, and Designation.

---

## 15. Sorting
Allows sorting by: Template Name, Created Date, and Modified Date.

---

## 16. Validation
*   Validates template configurations, checks for duplicate template names, and flags broken permission hierarchies.

---

## 17. Business Rules
1.  **Strict Balance Constraint:** Voucher save blocked if variance is not zero.
2.  **No Edits on Reconciled Vouchers:** Reversing or editing a voucher requires first undoing its reconciliation.
3.  **Approval Logs:** Historical approval records cannot be deleted.

---

## 18. Module Impact
*   Impacts user profiles, navigation layouts, workspace configurations, report security, and system administration views.

---

## 19. Permissions
Access is regulated by the following flags:
*   `view_permission_templates` / `create_permission_template`
*   `edit_permission_template` / `delete_permission_template`
*   `assign_template_to_user` / `bulk_permission_override`

---

## 20. Audit
Logs all status changes:
*   Tracks report access, exported file histories, search inputs, and parameter changes.
*   Logs before and after JSON snapshots, user IDs, and system timestamps.

---

## 21. Notifications
*   **Vault Alerts:** Notifies users on new stock creation, duplicate certification flags, hold releases, or sales completions.

---

## 22. Performance
*   **Asynchronous Processing:** Long-period general ledger reports run in a background worker thread.
*   **Data Virtualization:** The UI uses lazy loading to render reports with 1,000,000+ rows without performance lag.

---

## 23. Error Handling
*   Handles duplicate naming conflicts, broken parent-child hierarchies, and bulk update failures with clear error messages.

---

## 24. Edge Cases
*   **Mid-Year Edits:** Edits to historical transaction dates trigger automatic recalculations of all subsequent running balances.
*   **Closed Period Postings:** Blocks transaction entries in closed financial periods.

---

## 25. Future Enhancements
*   **RFID & Barcode Integration:** Direct scanning of physical packets to verify vault locations and update records.
*   **AI Profit Optimization:** Recommends optimal sorting mixes based on historical yields.

---

## 26. Architect Recommendations
1.  **Unique Barcode Constraints:** Enforce unique packet numbers to prevent overlapping dispatches.
2.  **Stateless Tracking API:** Run ageing calculations in background worker processes to prevent UI lag.

---

## 27. Final Completion Checklist
*   [x] Document journal types and entry modes (Simple vs. Advanced).
*   [x] Map the posting pipeline and double-entry validation equations.
*   [x] Detail the reversal voucher workflow and status flows.
*   [x] Map validations, permissions, and audit log rules.
*   [x] Document report and ledger integrations.
