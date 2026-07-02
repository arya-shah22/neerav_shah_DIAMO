# DIAMO ERP – PHASE 14.3
## USER AUTHENTICATION & SESSION MANAGEMENT SPECIFICATION

---

## 1. Executive Summary
This document defines the Functional Specification Document (FSD) for the User Authentication, Login, Logout, Session Management, and Account Security module of DIAMO ERP. This module acts as the centralized system to manage employee registrations, map company-wise access controls, monitor user login timelines, restrict operator password configurations, and manage profile information.

---

## 2. Business Purpose
*   **Security Controls:** Enforces credentials verification before loading local database buffers, protecting sensitive diamond stocks and accounting reports.
*   **Corporate Accountability:** Maintains logs of login coordinates, terminal IDs, active periods, and failed access attempts.

---

## 3. Login Screen
*   **Login Interface Parameters:** User ID, password field (with show/hide characters toggle), Company Selection dropdown list, "Remember User ID" checkbox, branding assets, version indicator, and a standard close button.

---

## 4. Login Validation
*   **Access Check Protocols:** Validates that the input User ID exists in the database, checks active status values, confirms password matches, checks lock statuses, and verifies company assignments. Displays messages like `Invalid User ID or Password.` or `Your account has been locked. Please contact your Super Administrator.`

---

## 5. Company Selection
*   **Multi-Company Access Router:** If assigned to multiple companies, the login screen displays a selection dropdown. If assigned to only one company, the system automatically opens that company. The user can only view data from the selected company.

---

## 6. User Authentication
*   **Access Credentials Audit:** Verifies the user credentials against target databases, verifies permissions, and loads company configurations.

---

## 7. Session Management
*   **Telemetry Logs:** Tracks login timestamps, selected company profiles, current financial year, and session duration.

---

## 8. Logout
*   **Termination Triggers:** Supports manual logout, automatic timeout logout, and system shutdown logout. All triggers require logout confirmations and clean active memory buffers.

---

## 9. Session Security
*   **Single Session Enforcement:** Restricts each user account to a single concurrent active session, blocking secondary logins. Warns users before session timeouts, and supports manual session termination by the Super Admin.

---

## 10. Failed Login Management
*   **Lockout Controls:** Logs failed access attempts. Automatically locks account access after 5 failed attempts. Accounts can only be unlocked by the Super Admin.

---

## 11. Account Security
*   **Security Rules:** Stores passwords using local cryptographic hashes, enforces session validation checks, and monitors terminal activities.

---

## 12. Login History
*   **Access History Logs:** Keeps records of Login Date/Time, Logout Date/Time, Session Duration, Target Company, Host computer name, and status (Successful/Failed with reason).

---

## 13. Remember User
*   **Remember User ID:** Option to remember the last User ID. Passwords are never stored or auto-filled.

---

## 14. Application Startup
*   **Startup Flow:** Loads the selected Company profile, renders the assigned dashboard widget panels, sets the current Financial Year, and applies role permissions.

---

## 15. Search
Supports filters for: User ID, Employee Name, and Login Date.

---

## 16. Filters
Provides filters for: Login Status (Successful/Failed), Target Company, and Date Range.

---

## 17. Sorting
Allows sorting by: Login Date/Time, User ID, and Session Duration.

---

## 18. Validation
*   Checks for invalid User IDs, wrong passwords, locked accounts, duplicate logins, expired sessions, and unauthorized company profiles.

---

## 19. Business Rules
1.  **Strict Balance Constraint:** Voucher save blocked if variance is not zero.
2.  **No Edits on Reconciled Vouchers:** Reversing or editing a voucher requires first undoing its reconciliation.
3.  **Approval Logs:** Historical approval records cannot be deleted.

---

## 20. Module Impact
*   Enforces access checks across all transactional books, stock explorers, reports libraries, and system configurations.

---

## 21. Permissions
Access is regulated by the following flags:
*   `access_application` / `view_login_history`
*   `force_session_logout` / `bypass_session_timeout`

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
*   Handles incorrect credentials, database disconnections, session creation failures, and duplicate session attempts with clear error messages.

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
