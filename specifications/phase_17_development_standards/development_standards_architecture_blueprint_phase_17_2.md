# DIAMO ERP – PHASE 17.2
## ENTERPRISE DEVELOPMENT STANDARDS, ARCHITECTURE GUIDELINES, CODING CONVENTIONS & FUTURE SCALABILITY BLUEPRINT

---

## 1 Executive Summary
This document defines the Enterprise Development Standard (EDS), Technical Architecture Blueprint, and Software Engineering Manual for DIAMO ERP. It establishes the architectural guidelines, code organization standards, state management strategies, security rules, and offline-first database synchronization rules required to maintain a robust desktop ERP codebase. This blueprint is designed to support the DIAMO ERP modules—including Masters, Transactions, Inventory, Cash/Bank Books, Reports, and Security systems—while establishing clear pathways for a future hybrid cloud migration with zero changes to core business logic.

---

## 2 Business Purpose
*   **Long-Term Maintainability:** By enforcing unified directory structures and naming conventions, any developer can easily modify, refactor, or debug any module.
*   **Enterprise Stability:** Strict validation layers, transaction rollbacks, and explicit error handling boundaries prevent data corruption and unexpected system crashes.
*   **Developer Onboarding:** Standardized code formats, module boundaries, and documentation requirements dramatically reduce developer onboarding time.
*   **Scalability & Performance:** Defined query optimizations, lazy loading mechanisms, and background thread pools ensure the system operates efficiently even with millions of records.
*   **Cloud Readiness:** Clear boundaries between data presentation, business workflows, and persistence layers ensure the application can migrate to a web/cloud model with minimal architectural changes.

---

## 3 Application Architecture
DIAMO ERP uses a clean, layered architecture with a feature-based modular layout:
*   **Presentation Layer (Frontend):** Built with React + TypeScript inside Electron. Enforces a unidirectional data flow, separating pure layout components from state containers.
*   **Application Services Layer (Core Logic):** Coordinates business workflows, calculations (e.g., job work costing, tax engines), validation pipelines, and permissions checking.
*   **Data Access Layer (Persistence):** Uses NestJS controllers and Prisma ORM to interact with the local MySQL database. Direct SQL executions are restricted in favor of Prisma transaction blocks.
*   **Separation of Concerns:** Components must never execute database queries directly. The frontend communicates with the backend via IPC (Inter-Process Communication) channels, which act as local API gateways.

---

## 4 Project Structure
The folder structure is divided into clean frontend, backend, and shared directories:
*   `/src/apps/` - Electron main and preload entry points.
*   `/src/frontend/` - React application root.
    *   `components/` - Shared UI elements (buttons, inputs, grids).
    *   `features/` - Feature-based modules (e.g., `sale-book/`, `job-book/`).
    *   `hooks/` - Global custom React hooks (e.g., `useAuth`, `useLocalStorage`).
    *   `state/` - Global state managers (Zustand/Redux actions).
*   `/src/backend/` - NestJS server.
    *   `modules/` - Feature controllers and services matching frontend features.
    *   `database/` - Prisma schema, migrations, and seed files.
*   `/src/shared/` - Common interfaces, types, DTO schemas, and constants.

---

## 5 Module Architecture
Every system module must be structured using a consistent folder pattern:
*   **Frontend Module Structure:**
    *   `/components/` - Module-specific UI items (e.g., `SaleItemGrid`).
    *   `/hooks/` - Module-specific logic hooks (e.g., `useSaleCalculations`).
    *   `/types/` - Local TS interfaces and schemas.
    *   `index.tsx` - Main page container entry point.
*   **Backend Module Structure:**
    *   `*.controller.ts` - IPC endpoint handlers routing request payloads.
    *   `*.service.ts` - Core business calculations, transactional steps, and database calls.
    *   `*.dto.ts` - Input payload schema validations (class-validator models).

---

## 6 Naming Conventions
*   **Files & Folders:** Lowercase with dash separators (`kebab-case`). Example: `sale-invoice-form.tsx`.
*   **React Components:** PascalCase. Example: `DataGridContainer`.
*   **Functions & Variables:** camelCase. Example: `calculateOutstandingBalance`.
*   **Constants:** UPPERCASE with underscores. Example: `MAX_PACKET_WEIGHT_LIMIT`.
*   **Types & Interfaces:** PascalCase prefixed with `I` for interfaces. Example: `ISaleInvoice`.
*   **Database Tables & Fields:** snake_case. Example: `sale_invoice_details`.

---

## 7 Code Organization
*   **Single Responsibility Principle:** A component or service must perform exactly one function (e.g., a component renders the grid; a utility formats numbers).
*   **Size Limits:** React component files should not exceed 300 lines of code. If a file grows larger, extract sub-elements into dedicated files.
*   **DRY (Don't Repeat Yourself):** Shared mathematical equations (such as carat-to-weight conversions, brokerage fees, or tax percentages) must reside in `/src/shared/utils/`.

---

## 8 State Management
*   **Local UI State:** Managed via React's `useState` for simple visual toggles (e.g., open dropdowns, hover states).
*   **Form State:** Handled using form libraries (like React Hook Form) to manage intermediate input validations without triggering main page renders.
*   **Global State (Zustand):** Used for session settings (currently active user, selected company, active financial year).
*   **Cache State:** Handled via react-query to store report data, lookup registers, and dashboard cards, enabling automatic invalidation hooks.

---

## 9 Form Standards
All transaction and master entry forms must follow one operational flow:
*   **Focus Control:** Opening a form automatically focuses the first input field.
*   **Keyboard Navigation:** Pressing `Enter` moves focus to the next logical input; pressing `Escape` cancels the input sequence and prompts confirmation.
*   **Default Values:** Form state is pre-filled with sensible defaults (current date, auto-incremented invoice number, zero balances).
*   **Save Action:** Triggers field validations, displays a loading overlay, disables the save button, and runs the database write inside a single ACID transaction block.

---

## 10 Error Handling
*   **Frontend Error Boundaries:** Wrap React page features in custom React Error Boundaries to catch rendering exceptions without crashing the Electron shell.
*   **NestJS Exception Filters:** Intercept database errors (e.g., Prisma unique constraints) and format them into readable, user-friendly IPC error payloads.
*   **Error Logging:** Critical failures write stack traces to local disk error logs (`/logs/error.log`) and trigger administrator notification prompts.

---

## 11 Validation Framework
*   **Frontend Validation:** Executes immediately during input blur events using Yup/Zod schemas to block invalid entries before submission.
*   **Backend Validation:** Class-validator models validate NestJS payloads to verify data types and ranges.
*   **Business & Financial Validation:** Services check business rules (e.g., verifying that inventory is available, verifying that cash balances do not drop below zero, or validating date parameters against locked financial periods).

---

## 12 Logging Standards
*   **Log Formats:** Log entries write JSON lines containing timestamp, level (INFO, WARN, ERROR), module, message, user ID, and active company ID.
*   **Disk Writing:** Logs write to rolling files, splitting at 10MB file sizes.
*   **Retention:** Local log files older than 90 days are moved to archives; files older than 180 days are deleted automatically.

---

## 13 Security Architecture
*   **Authentication:** Local authentication uses hashed password credentials (bcrypt with 12 salt rounds) stored in the database.
*   **Authorization:** Access controls verify role-permission matrices on both the frontend and backend.
*   **Data Protection:** Sensitive configuration details (e.g., database connection credentials, third-party API keys) are encrypted using AES-256 and stored in the OS-level secure store (Keytar).

---

## 14 Performance Standards
*   **Lazy Loading:** Code-split route panels using React's lazy loading to keep the initial startup package size small.
*   **Query Optimization:** Force paginated database calls using pagination parameters, avoiding loading full database tables into memory.
*   **Background Processing:** Long-running analytics recalculations run on separate background worker threads to keep the main Electron UI thread responsive.

---

## 15 Database Standards
*   **Transaction Management:** Perform all multi-table database updates (e.g., invoice sales posting to ledgers, stock updates, and outstanding tables) inside Prisma `$transaction` blocks to ensure atomicity.
*   **Index Strategy:** Enforce indexes on foreign keys and frequently queried fields (e.g., `barcode`, `packet_id`, `invoice_date`, `party_id`).
*   **Schema Migrations:** All database schema adjustments are managed strictly through Prisma migrations, capturing incremental SQL statements in migration history files.

---

## 16 Offline Architecture
*   **Offline-First Stability:** The application runs against a local MySQL database engine, ensuring full operational capability without internet connectivity.
*   **Crash Recovery:** The local backend auto-saves drafts of active transactions to local workspace buffers, enabling recovery after unexpected power outages.
*   **ACID Compliance:** Rely on InnoDB transaction logs to roll back incomplete operations upon system reboot.

---

## 17 Multi-Company Architecture
*   **Logical Isolation:** Every database table containing tenant data (transactions, ledgers, items) contains a `company_id` field.
*   **Query Scoping:** The data access layer automatically appends `where: { company_id: activeCompanyId }` filters to all select calls.
*   **Master Sharing:** Specific master directories (e.g., diamond quality indexes, color indexes) are flagged as global, sharing tables across companies while restricting transaction data.

---

## 18 Future Cloud Migration
The architecture is structured to support migration to a cloud-based hybrid system:
*   **API Separation:** Communication between the Electron frontend and NestJS backend uses standard request/response payloads. Transitioning to a cloud service only requires replacing the local IPC channel client with an HTTP/REST client.
*   **Authentication:** The authorization modules support token-based authentication models (JWT), enabling seamless migration to cloud Identity Providers.

---

## 19 Testing Standards
*   **Unit Tests:** Written for pure utility functions and calculations (e.g., carat weights, tax calculations, currency conversions) using Jest.
*   **Integration Tests:** Validate database service actions (e.g., saving a ledger voucher, adjusting inventory counts).
*   **UI Tests:** Conduct automated testing of primary user workflows (e.g., user login, saving an invoice) using Playwright.

---

## 20 Version Control
*   **Branching Strategy:** Use Git Flow conventions:
    *   `main`: Holds production-stable code.
    *   `develop`: Integration branch for new features.
    *   `feature/*`: Feature-specific development branches.
    *   `hotfix/*`: Quick production fixes.
*   **Commit Message Standards:** Commit messages must follow Conventional Commits formatting. Example: `feat(sales): add barcode validation to item grid`.

---

## 21 Documentation Standards
Every code module must contain a `README.md` file detailing:
*   Module Purpose & Business Context.
*   Required permissions and roles.
*   Key Dependencies and file layouts.
*   Revision history log with developer notes.

---

## 22 Deployment Standards
*   **Electron Builder packaging:** Compiled app packages are packaged using Electron Builder, generating signed installers (`.msi` for Windows, `.dmg` for macOS).
*   **Database Schema Upgrades:** When launching new client updates, database migration routines run automatically before opening the application dashboard.

---

## 23 Code Review Standards
Pull Requests must pass code review checklists:
*   [ ] Does the code match the project naming conventions?
*   [ ] Are database writes contained within transaction blocks?
*   [ ] Are inputs properly sanitized?
*   [ ] Does the component file size remain under 300 lines of code?
*   [ ] Are there corresponding unit or integration tests?

---

## 24 Enterprise Development Rules
1.  **Strict Linting Rules:** Enforce clean code standards using ESLint and Prettier configurations.
2.  **No Direct SQL queries:** Database operations must use Prisma ORM queries. Raw SQL is restricted to complex migrations.
3.  **Strict Type Enforcement:** Avoid using the TypeScript `any` type. Define explicit types or interfaces for all data parameters.

---

## 25 Quality Review
*   **Maintainability:** Strong separation of concerns ensures that editing UI presentation elements never affects backend calculation engines.
*   **Cloud Readiness:** Using standardized DTO payloads and IPC channels ensures the app is fully prepared for future hybrid or cloud architectures.
*   **Robustness:** Enforcing transactional boundaries and validation filters protects the system from ledger imbalances and data corruption.

---

## 26 Future Ready Design
*   **API Gateway Hook:** The backend is prepared to expose REST APIs, enabling third-party integrations (e.g., CRM systems, accounting packages) in the future.
*   **Framework Agnostic Services:** Core calculations are isolated from NestJS-specific utilities, ensuring code can easily transition to alternative backend frameworks.

---

## 27 Architect Recommendations
1.  **Automatic Linting pre-commit:** Configure husky git hooks to run linting and unit tests before commits to maintain code quality.
2.  **Strict Transaction Timeouts:** Enforce query execution timeout limits (e.g., 5000ms) on MySQL connections to prevent locks.
3.  **Encrypted Local Database:** In high-security environments, configure disk-level encryption to secure stored transaction data.

---

## 28 Final Enterprise Development Checklist
*   [x] Feature-based modular application architecture designed.
*   [x] Standard project layouts and directory configurations mapped.
*   [x] Naming conventions and code standards defined.
*   [x] Zustand/Zod state management and form validations mapped.
*   [x] ACID transaction scopes, indexes, and database migration routines documented.
*   [x] Log archiving, exception filters, and security cryptography rules established.
*   [x] Offline-first recovery procedures and multi-company scope isolations outlined.
*   [x] Future hybrid-cloud architecture migrations described.
*   [x] Checked that no production code, API endpoints, database schemas, or SQL statements are generated.
