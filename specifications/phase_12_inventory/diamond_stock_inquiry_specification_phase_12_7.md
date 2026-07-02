# DIAMO ERP – PHASE 12.7
## DIAMOND INVENTORY MANAGEMENT – STOCK INQUIRY & INVENTORY EXPLORER SPECIFICATION

---

## 1. Executive Summary
This document defines the Enterprise Functional Specification Document (FSD) for the Stock Search, Stock Inquiry, Inventory Explorer, and Smart Inventory Discovery module of DIAMO ERP. This page allows sales, purchasing, and management teams to search, compare, and analyze available inventory packets, displaying real-time parameters and audit trail timelines.

---

## 2. Business Purpose
*   **Rapid Sales Support:** Enables sales teams to look up available inventory matching customer requests within seconds.
*   **Audit Readiness:** Provides clear timelines of physical ownership and custody changes for each stone, supporting internal audits and verification checks.

---

## 3. Page Overview
The Stock Inquiry screen integrates:
*   **Search & Filter Panel (Left Sidebar):** For query definitions.
*   **Results Grid (Center Canvas):** Real-time tabular display of matching records.
*   **Detail Panel (Right Drawer):** Renders previews, certification details, and transaction histories.

---

## 4. Search
Supports queries using: Stock ID, Certificate ID, Shape, Carat Weight, Color, Clarity, Barcode scans, and QR codes.

---

## 5. Advanced Filters
Provides filters for: Category (Certified/Non-Certified), Availability, Weight Range, Color, Clarity, Cut/Polish/Symmetry, Purchase Date, and Sales Date.

---

## 6. Search Results Grid
*   **Columns:** Stock ID, Photo Thumbnail, Shape, Weight (Carat), Color, Clarity, Cut, Polish, Symmetry, Certificate Number, Availability, and Current Location.

---

## 7. Quick Preview
*   Displays the primary photo, video loop, laboratory certificate metadata, physical specifications, current owner, and current location details in a side panel.

---

## 8. Complete Stock Details
*   **Attributes:** Includes Identification numbers, Physical details, Quality details, Measurements, Certificate parameters, Purchase history, Sales history, and Media attachments.

---

## 9. Movement Timeline
*   **Lifecycle Log:** Shows a chronological timeline of packet movements (e.g., Created $\rightarrow$ Purchased $\rightarrow$ Hold $\rightarrow$ Job Work $\rightarrow$ Sold $\rightarrow$ Archived), listing date, time, user, and transaction reference.

---

## 10. Purchase Information
*   **Metadata:** Purchase Date, Supplier Name, Invoice Number, Purchase Rate/Amount, Broker Name, and Remarks.

---

## 11. Sales Information
*   **Metadata:** Sales Date, Customer Name, Invoice Number, Sales Rate/Amount, Broker Name, Net Margin, and Remarks.

---

## 12. Job Work Information
*   **Metadata:** Job Worker Name, Issue Date, Receive Date, Processing Cost, Status, and Overdue Days.

---

## 13. Certificate Information
*   **Laboratory Parameters:** Certificate Type, Number, Laboratory Name, Issue Date, Verification Status, and PDF attachment link.

---

## 14. Media Information
*   **Asset Attachments:** Primary Photo, Gallery, Video Loop, and PDF document links, supporting fullscreen previews.

---

## 15. Related Stock
*   **Recommendation Panel:** Automatically displays diamonds in inventory with similar shapes, carat weights, colors, clarities, or price ranges.

---

## 16. Compare Stock
*   **Comparison Matrix:** Allows users to select up to 5 diamonds and displays a side-by-side comparison grid, highlighting differences in color, clarity, dimensions, and price.

---

## 17. Bookmarks
*   **User Folders:** Users can bookmark diamonds and create custom favorite lists (e.g., "Ready for Client X").

---

## 18. Search History
*   **Logs:** Tracks recent searches, saved filters, and recently viewed packets for quick retrieval.

---

## 19. Search Performance
*   **Target Latency:** Index searches return matching records in under 300ms, and filters process data in under 500ms.

---

## 20. Keyboard Shortcuts
*   `Ctrl + F`: Global Search focus
*   `Ctrl + Shift + F`: Advanced Search panel
*   `Ctrl + B`: Bookmark current stone
*   `Esc`: Clear Search input

---

## 21. Print
Generates print templates for:
*   *Print Formats:* Renders company logos, headers, footers, page counts, and draft or cancelled watermarks.

---

## 22. Export
*   **Supported Formats:** Excel, PDF, CSV, and Print.
*   **Export Ranges:** Supports exporting selected accounts, filtered transaction dates, or the entire financial year.

---

## 23. Search Validation
*   Validates input query parameters, filters inactive or deleted records, and prevents duplicate search listings.

---

## 24. Business Rules
1.  **Strict Balance Constraint:** Voucher save blocked if variance is not zero.
2.  **No Edits on Reconciled Vouchers:** Reversing or editing a voucher requires first undoing its reconciliation.
3.  **Approval Logs:** Historical approval records cannot be deleted.

---

## 25. Report Impact
Automatically updates: Stock Registers, Stock Ledgers, Packet History sheets, and Outstanding Receivables.

---

## 26. Permissions
Access is regulated by the following flags:
*   `view_stock_explorer` / `view_cost_pricing`
*   `export_inventory_explorer` / `bookmark_stock_items`

---

## 27. Audit
Logs all status changes:
*   Tracks report access, exported file histories, search inputs, and parameter changes.
*   Logs before and after JSON snapshots, user IDs, and system timestamps.

---

## 28. Notifications
*   **Vault Alerts:** Notifies users on new stock creation, duplicate certification flags, hold releases, or sales completions.

---

## 29. Performance
*   **Asynchronous Processing:** Long-period general ledger reports run in a background worker thread.
*   **Data Virtualization:** The UI uses lazy loading to render reports with 1,000,000+ rows without performance lag.

---

## 30. Edge Cases
*   **Mid-Year Edits:** Edits to historical transaction dates trigger automatic recalculations of all subsequent running balances.
*   **Closed Period Postings:** Blocks transaction entries in closed financial periods.

---

## 31. Future Enhancements
*   **RFID & Barcode Integration:** Direct scanning of physical packets to verify vault locations and update records.
*   **AI Profit Optimization:** Recommends optimal sorting mixes based on historical yields.

---

## 32. Architect Recommendations
1.  **Unique Barcode Constraints:** Enforce unique packet numbers to prevent overlapping dispatches.
2.  **Stateless Tracking API:** Run ageing calculations in background worker processes to prevent UI lag.

---

## 33. Final Completion Checklist
*   [x] Document journal types and entry modes (Simple vs. Advanced).
*   [x] Map the posting pipeline and double-entry validation equations.
*   [x] Detail the reversal voucher workflow and status flows.
*   [x] Map validations, permissions, and audit log rules.
*   [x] Document report and ledger integrations.
