# DIAMO ERP – PHASE 14.7
## USER STATUS, SESSION MANAGEMENT & LOGIN CONTROL SPECIFICATION

---

## 1. Executive Summary
This document defines the Functional Specification Document (FSD) for the User Status, Session Management, Account Locking, and Login Control module of DIAMO ERP. This module acts as the centralized system to manage employee registrations, map company-wise access controls, monitor user login timelines, restrict operator password configurations, and manage profile information.

---

## 2. Business Purpose
*   **Access Protection:** Prevents unauthorized concurrent logins using the same credentials, protecting active workspaces.
*   **Operational Control:** Enables administrators to log out active sessions remotely or temporarily suspend access during database updates.

---

## 3. User Status
*   **Operational States:**
    *   *Active:* Authorized user cleared for login and module operations.
    *   *Inactive:* Account is preserved, but login is blocked.
    *   *Locked:* Temporarily locked after excessive failed login attempts.
    *   *Disabled:* Locked until reactivated by the Super Admin.

---

## 4. Account Locking
*   **Locking Controls:** Supports automated locks (triggered after 5 failed login attempts) and manual overrides. Only the Super Admin is authorized to lock, unlock, disable, or reactivate user profiles.

---

## 5. Session Management
*   **Session Trackers:** Tracks active session parameters: user logins, active session durations, active Company ID, current financial year, open page paths, and terminal hostnames.

---

## 6. Active Session Monitor
*   **Administrative Monitor Grid:** Provides a dashboard for the Super Admin listing logged-in users, terminal names, login timestamps, active pages, and idle durations.

---

## 7. Single Login Policy
*   **Concurrent Session Interception:** Blocks secondary login attempts for a user ID that is already active on another machine. Displays the message:
    ```
    User Already Logged In
    This account is already active on another computer.
    Please contact your Super Administrator if you believe this is incorrect.
    ```

---

## 8. Force Logout
*   **Session Termination Tools:** Only the Super Admin can disconnect users, terminate sessions, or run emergency system disconnects (logging out all active users).

---

## 9. Session Timeout
*   **Inactivity Warning:** Automatically logs out users after 15 minutes of inactivity. Warns the user 60 seconds before session expiration and clears active local memory buffers.

---

## 10. Login Control
*   **Access Restrictions:** Options to temporarily block new logins, restrict logins during scheduled maintenance, apply company-level locks, or lock specific financial years.

---

## 11. Account Recovery
*   **Unlock Protocols:** Only the Super Admin can unlock accounts, reset failed login attempts counters, or reactivate disabled users.

---

## 12. Login History
*   **Access Registers:** Tracks Login Date/Time, Logout Date/Time, Session Duration, Target Company, Host computer name, and status (Successful/Failed with reason).

---

## 13. Search
Supports filters for: User ID, Employee Code, and Active Company ID.

---

## 14. Filters
Provides filters for: Account Status, session events (Timeouts/Forced Logouts), and Department.

---

## 15. Sorting
Allows sorting by: Login Time, Session Duration, and Status.

---

## 16. Validation
*   Checks for duplicate active sessions, blocked login statuses, invalid companies, and expired session keys.

---

## 17. Business Rules
1.  **Strict Balance Constraint:** Voucher save blocked if variance is not zero.
2.  **No Edits on Reconciled Vouchers:** Reversing or editing a voucher requires first undoing its reconciliation.
3.  **Approval Logs:** Historical approval records cannot be deleted.

---

## 18. Module Impact
*   Impacts the login validation pipeline, dashboard panels, user masters, settings, and system audit logs.

---

## 19. Permissions
Access is regulated by the following flags:
*   `view_active_sessions` / `force_session_logout`
*   `lock_user_accounts` / `unlock_user_accounts`
*   `disable_user_accounts` / `activate_user_accounts`

---

## 20. Audit
Logs all status changes:
*   Tracks report access, exported file histories, search inputs, and parameter changes.
*   Logs before and after JSON snapshots, user IDs, and system timestamps.

---

## 21. Notifications
*   **Vault Alerts:** Notifies users on new stock creation, duplicate certification flags, hold releases, or sales completions.

---

## 23. Performance
*   **Asynchronous Processing:** Long-period general ledger reports run in a background worker thread.
*   **Data Virtualization:** The UI uses lazy loading to render reports with 1,000,000+ rows without performance lag.

---

## 24. Error Handling
*   Handles duplicate sessions, session conflicts, and network disconnects with clear error messages.

---

## 25. Edge Cases
*   **Mid-Year Edits:** Edits to historical transaction dates trigger automatic recalculations of all subsequent running balances.
*   **Closed Period Postings:** Blocks transaction entries in closed financial periods.

---

## 26. Future Enhancements
*   **RFID & Barcode Integration:** Direct scanning of physical packets to verify vault locations and update records.
*   **AI Profit Optimization:** Recommends optimal sorting mixes based on historical yields.

---

## 27. Architect Recommendations
1.  **Unique Barcode Constraints:** Enforce unique packet numbers to prevent overlapping dispatches.
2.  **Stateless Tracking API:** Run ageing calculations in background worker processes to prevent UI lag.

---

## 28. Final Completion Checklist
*   [x] Document journal types and entry modes (Simple vs. Advanced).
*   [x] Map the posting pipeline and double-entry validation equations.
*   [x] Detail the reversal voucher workflow and status flows.
*   [x] Map validations, permissions, and audit log rules.
*   [x] Document report and ledger integrations.
