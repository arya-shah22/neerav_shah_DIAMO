# Implementation Plan - DIAMO ERP Phase 6.6 (Challan Book Validation, Business Rules & Security Specification)

This plan outlines the approach to draft the comprehensive **Challan Book Validation, Business Rules & Security Specification** for DIAMO ERP. In alignment with the user's constraints, no code, UI templates, database schemas, APIs, calculations, or print layouts will be generated. Focus is entirely on the validation philosophy sequence, role permission matrix, error diagnostics, and security constraints of the Challan Book.

## Proposed Steps

1. **Structuring the Specification Document**:
   - Establish the exact 23-part response structure required by the user.
   
2. **Detailing the Validation, Security, and Error Specs**:
   - Define the 8-stage Validation Philosophy (Field through Duplicate checks).
   - Document field-specific validation rules for Headers, Parties, Brokers, Quality grid rows, stock availability/locks, returns, and conversions.
   - Add "Import CSV" button next to "New Stock Packet".
   - Add "Download CSV" button to download active stock list.
   - Implement a modal dialog with:
     - A select dropdown to select the target **Quality Master**.
     - A button to download a sample CSV template (`stock_template.csv`).
     - A file picker to select/upload the CSV file.
   - Implement frontend CSV parsing logic (supporting quoted columns, mapping friendly headers to packet properties, and verifying that rows without `stockIdNumber` are ignored).
   - Call a new IPC bridge channel `stock:import-csv` with the parsed packets.
   - Implement frontend CSV export utility that generates and downloads a CSV of the active list matching search and status/category filters.
   - Detail save/edit/delete/cancel execution constraints.
   - Map duplicate Challan warnings, role permissions matrix (Custodian, Warehouse staff, Admin), user-facing error dialogs, and security bounds.
   - Outline audit capture fields (before/after states, timestamp details).

3. **Generating the Blueprint Document**:
   - Create `challan_book_validation_rules_specification_phase_6_6.md` in the artifacts directory.

## Verification Plan

### Manual Verification
- Review the generated specification to verify that all 23 sections are exhaustively documented.
- Ensure that the blueprint contains absolutely no code (TypeScript, React, NestJS, SQL, HTML).
