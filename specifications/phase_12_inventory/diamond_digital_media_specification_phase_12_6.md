# DIAMO ERP – PHASE 12.6
## DIAMOND INVENTORY MANAGEMENT – DIGITAL ASSET & CERTIFICATE SPECIFICATION

---

## 1. Executive Summary
This document defines the Enterprise Functional Specification Document (FSD) for the Media Management, Certificate Management, and Digital Asset Engine of DIAMO ERP. This module aggregates physical diamond photos, video loops, certificate PDFs, and quality audit sheets to map digital assets to transactions.

---

## 2. Business Purpose
*   **Virtual Inventory:** Enables sales reps to showcase diamonds to clients with high-res photos and videos.
*   **Proof of Certification:** Maintains verifiable copies of laboratory certification certificates (e.g., GIA, IGI) to eliminate paperwork delays and support client deliveries.

---

## 3. Supported Digital Assets
*   **Asset Classifications:** Primary packet photo, secondary gallery photos, video loops (MP4), laboratory certificate PDFs, purchase invoice attachments, and lab inspection sheets.

---

## 4. Supported Certificates
*   **Supported Labs:** IGI (International Gemological Institute), GIA (Gemological Institute of America), HRD Antwerp, and SGL (Solitaire Gemmological Laboratories). Supports configuring custom local lab certificates.

---

## 5. Media Structure
*   **Packet Metadata Portfolio:** Each Stock ID links to one Primary Photo, a Gallery of secondary photos, a Primary Video loop, a Certificate PDF, and version history logs.

---

## 6. Media Upload
*   **Upload Utilities:** Supports local file uploads, drag-and-drop operations, copying public URL endpoints, bulk file assignments, and reverting replaced assets.

---

## 7. Media Preview
*   **Viewer Controls:** Renders high-res previews, thumbnails, gallery views, image rotations, video playback controls, PDF previews, and download buttons.

---

## 8. Certificate Management
*   **Laboratory Parameters:** Stores Certificate Number, Lab Type, Issue Date, Expiry Date, and Status (Verified, Pending Verification, Expired, Cancelled).

---

## 9. Media Versioning
*   **Asset Auditing:** Replaced or modified files are saved in an archive folder. Tracks Version ID, upload date/time, user ID, change reason, and file size, allowing quick rollbacks.

---

## 10. Media Sharing
*   **Distribution Channels:** Supports copying public media links, downloading archives, generating QR links for certificates, and emailing media files.

---

## 11. Media Validation
*   **Asset Checks:** Validates file size, extensions, duplicate certificate numbers, and duplicate file uploads, returning clear warnings.

---

## 12. Supported File Formats
*   *Images:* JPG, JPEG, PNG, WEBP, TIFF.
*   *Videos:* MP4, MOV, AVI, WEBM.
*   *Documents:* PDF.

---

## 13. File Size Policy
*   **Maximum File Limits:**
    *   *Image:* 10 MB.
    *   *Video:* 500 MB.
    *   *Certificate Document:* 20 MB.

---

## 14. Auto Linking
*   **Transaction Syncing:** Uploaded files automatically sync with Stock Masters, Purchase registers, Sales screens, Job Books, and Challans, enabling instant previews.

---

## 15. Search
Supports filters for: Stock ID, Certificate ID, Certificate Type, File Upload Date, and Uploaded By.

---

## 16. Filters
Provides filters for: Has Photo, Has Video, Has Certificate, Certificate Verification Status, and Upload Date.

---

## 17. Sorting
Allows sorting by: Stock ID, Certificate ID, File Size, Upload Date, and Availability.

---

## 18. Business Rules
1.  **Strict Balance Constraint:** Voucher save blocked if variance is not zero.
2.  **No Edits on Reconciled Vouchers:** Reversing or editing a voucher requires first undoing its reconciliation.
3.  **Approval Logs:** Historical approval records cannot be deleted.

---

## 19. Report Impact
Automatically updates: Stock Registers, Stock Ledgers, Packet History sheets, and Outstanding Receivables.

---

## 20. Permissions
Access is regulated by the following flags:
*   `view_digital_media` / `upload_digital_media`
*   `delete_digital_media` / `approve_lab_certificates`

---

## 21. Audit
Logs all status changes:
*   Tracks report access, exported file histories, search inputs, and parameter changes.
*   Logs before and after JSON snapshots, user IDs, and system timestamps.

---

## 22. Notifications
*   **Vault Alerts:** Notifies users on new stock creation, duplicate certification flags, hold releases, or sales completions.

---

## 23. Performance
*   **Asynchronous Processing:** Long-period general ledger reports run in a background worker thread.
*   **Data Virtualization:** The UI uses lazy loading to render reports with 1,000,000+ rows without performance lag.

---

## 24. Error Handling
*   Handles upload failures, corrupted file uploads, invalid PDF structures, and broken URLs with clear error messages.

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
