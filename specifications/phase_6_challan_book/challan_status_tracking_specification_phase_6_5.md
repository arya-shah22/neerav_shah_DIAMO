# DIAMO ERP – PHASE 6.5
## CHALLAN BOOK – STATUS ENGINE, TRACKING & MONITORING SYSTEM SPECIFICATION

---

## 1. Executive Summary
This document defines the Enterprise Functional Specification Document (FSD) for the Status Engine, Custodian Tracking System, and Monitoring Dashboard of the Challan Book in DIAMO ERP. This specification outlines status lifecycles, real-time location metrics, outstanding ageing calculations, and alert workflows to manage physical diamond dispatches.

---

## 2. Status Engine
The status engine tracks the lifecycle of each Challan:
*   `Draft`: Saved entry, no stock reservation.
*   `Issued`: Dispatched, available carats moved to Reserved Stock.
*   `Dispatched / Delivered`: Confirmed physical transit.
*   `Pending Return`: Consignment active, waiting for return or conversion.
*   `Partially Returned`: Subset of carats returned to the warehouse.
*   `Fully Returned`: All items restocked to Available Stock.
*   `Converted to Sale / Converted to Purchase`: Ownership transferred.
*   `Cancelled / Closed`: final voucher states.

---

## 3. Status Lifecycle
The transactional flow of a Challan progresses through these stages:

```
Draft -> Issued -> Dispatched -> Delivered -> Pending Return -> Partially Returned -> Converted OR Returned -> Closed
```

---

## 4. Tracking Engine
Tracks custodian parameters:
*   *Current Holder:* Links dispatches to broker or customer IDs.
*   *Current Location:* Tracks vault locations (Jhanghad, Outsource, Certified).
*   *Transit Metrics:* Logs dispatches, expected return dates, actual return dates, and outstanding days.

---

## 5. Challan Dashboard
The monitoring dashboard provides operational metrics:
*   **Active Consignments:** Total active Challans, pending returns, and overdue items.
*   **Custodian Balances:** Outstanding weights and values held by customers, brokers, or job workers.
*   **Vault Summaries:** Carats in transit, at labs, or in outward vaults.
*   **Totals:** Total Reserved Carats and Total Estimated Consignment Value.

---

## 6. Item Level Tracking
Tracks statuses for individual items within a Challan:
*   *Fields:* Pending weight, Returned weight, Converted weight, Damaged, Lost, and Replaced.
*   *Behavior:* Allows partial line-item updates. A single Challan can contain lines that are returned, converted, or lost.

---

## 7. Ageing Engine
Categorizes pending dispatches into ageing brackets based on the issue date:
*   0 to 7 Days (Standard inspection period).
*   8 to 15 Days (Extended consignment).
*   16 to 30 Days (Overdue threshold).
*   31 to 60 Days (Critical overdue).
*   More than 60 Days (High-risk outstanding).

---

## 8. Overdue Management
Highlights overdue items using color-coded indicators:

| Status Severity | Indicator Color | Action Triggered |
| :--- | :--- | :--- |
| **Within terms** | **Green** | Standard monitoring. |
| **Overdue < 5 days** | **Yellow** | Generate system warning notification. |
| **Overdue 5 to 14 days** | **Orange** | Send automated payment reminder. |
| **Critical Overdue > 14 days**| **Red** | Block new dispatches to the custodian. |

---

## 9. Party Tracking
Tracks custodian performance metrics:
*   Active consignment value and total carat balances.
*   Count of pending vs. overdue Challans.
*   Average return delay (days past due).

---

## 10. Broker Tracking
*   **Consignment Value:** Tracks total carat weights and values held by the broker.
*   **Performance:** Computes conversion rates (conversions to sales vs. returns).

---

## 11. Quality Tracking
*   **Quality Metrics:** Tracks available, reserved, and returned weights for each quality grade.
*   **Loss Registry:** Logs lost or damaged weights to isolate grades experiencing high loss rates.

---

## 12. Search
Supports filters for: Challan ID, Custodian Name, Broker Name, Purpose, Quality, Dispatch Date, Expected Return Date, and Location Vault.

---

## 13. Filters
Provides sidebar selectors: Today, Yesterday, Pending, Converted, Overdue, Job Work, and Customer Approval.

---

## 14. Reports
The system generates reports for GSTR filing and stock audits:
*   *Pending Challan Report:* Itemizes outstanding dispatches.
*   *Overdue Challan Report:* Lists custodians with past-due balances.
*   *Reserved Stock Audit:* Reconciles reserved weights against warehouse counts.

---

## 15. Notifications
Generates alerts for:
*   Consignments due for return tomorrow.
*   Critical overdue dispatches (triggers warnings).
*   Losses or damages requiring manager approval.

---

## 16. Business Rules
1.  **Overdue Highlighting:** Overdue Challans are highlighted in red on the dashboard.
2.  **No Edits on Closed Vouchers:** Closed or Converted Challans are locked against modifications.
3.  **Daily Ageing Refresh:** Ageing metrics update automatically daily.

---

## 17. Permissions
Access is regulated by the following flags:
*   `view_challan_dashboard` / `manual_status_override`
*   `force_close_challan` / `reopen_challan`

---

## 18. Audit
Logs all status changes:
*   Tracks location updates, custodian transfers, and conversion histories.
*   Logs before and after JSON snapshots, user IDs, and system timestamps.

---

## 19. Edge Cases
*   **Status Rollback:** If a return is processed in error, reopening the Challan requires manager approval. Reopening restores reserved stock balances and reverses ledger updates.
*   **Power/Network Failure:** System timeouts during status updates trigger automated rollbacks to prevent database mismatches.

---

## 20. User Experience
*   **Timeline View:** Displays a timeline showing:
    `Draft -> Issued -> Pending -> Partially Returned -> Converted`
*   **Quick Action Icons:** Context menus on rows allow quick actions like Print, Return, or Convert.

---

## 21. Future Enhancements
*   **AI Return Prediction:** Analyzes historical custodian return patterns to predict potential delays.
*   **AI Risk Analytics:** Assigns risk scores to custodians based on overdue histories.

---

## 22. Architect Recommendations
1.  **Index Optimization:** Ensure database indexes are set on `(party_id, expected_return_date)` to support fast dashboard queries.
2.  **Stateless Tracking API:** Run ageing calculations in background worker processes to prevent UI lag.

---

## 23. Final Completion Checklist
*   [x] Document the status lifecycle and transition rules.
*   [x] Map the tracking engine fields and location parameters.
*   [x] Define dashboard KPIs and item-level tracking rules.
*   [x] Detail the ageing engine brackets and overdue indicators.
*   [x] Map validations, permissions, and audit log rules.
