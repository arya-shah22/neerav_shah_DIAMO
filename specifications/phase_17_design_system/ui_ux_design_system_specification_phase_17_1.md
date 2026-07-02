# DIAMO ERP – PHASE 17.1
## ENTERPRISE UI/UX DESIGN SYSTEM, UNIVERSAL ERP STANDARDS & APPLICATION DESIGN GUIDELINES

---

## 1 Executive Summary
This document defines the Enterprise UI/UX Design Standard Document (UDS) and Universal Application Design Guidelines for DIAMO ERP. This manual serves as the single source of truth for all user interfaces across the desktop platform. By establishing rigorous rules for application layout structures, typography scales, color mapping, grid controls, data inputs, search behaviors, loading patterns, error feedback, and accessibility rules, this design system guarantees a unified product experience. Standardized keyboard interactions, layout systems, and alignment grids ensure high operational speed and low user error rates for diamond industry professionals.

---

## 2 Business Purpose
*   **Reduced Training & Easy Learning:** A single, consistent UI language allows users to navigate new modules intuitively without re-learning interface patterns.
*   **Higher Productivity:** Standardized keyboard navigation, autocomplete drop-downs, and instant data grid controls minimize user interaction times.
*   **Fewer Input Errors:** High-contrast field indicators, immediate inline validations, and explicit error labels prevent data entry mistakes.
*   **Consistent Appearance:** A cohesive, premium interface design reinforces system quality and enterprise reliability.
*   **Scalability:** Clear interface building blocks enable engineering teams to scale the application with new features rapidly while maintaining design continuity.

---

## 3 Design Philosophy
*   **Modern Desktop Ergonomics:** Designed specifically for long-duration daily use. Aesthetics are clean, minimal, and highly professional, prioritizing data visibility over visual decoration.
*   **Business-First Data Density:** Layouts maximize screen real estate, utilizing compact padding and sizing to show maximum rows, packets, and financial balances without visual noise.
*   **Ergonomic Efficiency:** Interface elements are structured logically to guide the operator's eye from summaries down to transactional details. Visual elements are reserved strictly to indicate status transitions, errors, or prioritized highlights.

---

## 4 Application Layout
The application window layout is structured into a rigid, non-overlapping grid:
*   **Top Header (48px fixed height):** Displays company switcher, active financial year indicator, global search input, quick action dropdown, notifications trigger, and super admin profile details.
*   **Left Sidebar (200px fixed width, collapsible to 48px):** Houses primary module navigation (Dashboard, Masters, Sales, Purchases, Challans, Jobs, Vouchers, Reports, Settings, Admin).
*   **Workspace Content Area (Flexible width/height):** The primary view panel containing data tables, transaction forms, or analytics charts.
*   **Status Footer Bar (24px fixed height):** Displays current system connection status, active user role, printer path mapping, and recent background service status indicators.
*   **Window Behavior:** Default desktop window starts at 1920x1080 resolution. The window is resizable, supports multi-monitor workspaces (allowing reports to pop out into independent windows), and features native High-DPI scaling.

---

## 5 Color System
The UI utilizes a curated palette with verified contrast levels matching WCAG AAA standards:
*   **Primary Brand Color:** Deep Slate Navy (`#1E293B`) - Used for header backgrounds, primary menu states, and active headings.
*   **Secondary Accent Color:** Slate Blue (`#3B82F6`) - Highlight color indicating selection outlines, active tabs, and primary action buttons.
*   **Status Color System:**
    *   *Success:* Emerald Green (`#10B981`) - Paid bills, balanced journals, matched inventory packets.
    *   *Warning:* Amber Gold (`#F59E0B`) - Pending due alerts, unconfirmed Jhanghads, close to overdraft limit.
    *   *Danger:* Crimson Red (`#EF4444`) - Unbalanced ledger, negative cash balance, failed diagnostics.
    *   *Information:* Sky Blue (`#0EA5E9`) - Backup processes, session reminders, help guides.
*   **Surface Color Hierarchy:**
    *   *Application Background:* Light Gray (`#F8FAFC`)
    *   *Card Surfaces:* White (`#FFFFFF`) with thin border (`#E2E8F0`)
    *   *Table Rows:* Alternating white and soft gray (`#F1F5F9`) rows for easy scannability.
    *   *Disabled State:* Soft gray text (`#94A3B8`) on background (`#E2E8F0`).

---

## 6 Typography
The typography system uses a single clean, high-legibility sans-serif font family (Inter/system-ui default) across all screens:
*   **Typography Hierarchy:**
    *   *App Title:* 20px Bold, Line height 28px
    *   *Section Headings (H1/H2):* 16px Semi-Bold, Line height 24px
    *   *Form Labels & Table Headers:* 12px Semi-Bold, Line height 18px
    *   *Body Text / Input Inputs:* 12px Regular, Line height 18px
    *   *Table Cell Numbers:* 11px Mono-spaced (for column alignment), Regular
    *   *Small Status Text:* 10px Regular, Line height 14px
*   **Spacing Rules:** Clear margin limits of 16px around cards and form groups to maintain spacing continuity.

---

## 7 Icons
The interface utilizes a single, unified vector icon library (Lucide Icons) to ensure visual coherence:
*   **Icon Mapping Rules:**
    *   *Modules:* Flat, outline icons mapping strictly to context (e.g., Database icon for Masters, Box for Inventory, Coins for Cash Book).
    *   *Buttons:* Compact, single-stroke action icons (e.g., Edit pen, Trash bin, Document download, Printer outline).
    *   *Validation:* Success checkmark, warning triangle, error cross, and information circle.
*   **Sizing Standards:** Navigation icons are 18px, action/inline table icons are 14px.

---

## 8 Button Standards
Buttons must adhere to explicit color and style definitions to guide user prioritization:
*   **Button Hierarchy:**
    *   *Primary Button (Slate Blue background, white text):* Default action on any page (Save, Search, Print Invoice).
    *   *Secondary Button (Transparent background, Slate Blue border and text):* Secondary actions (Cancel, Add New Line, Clear Filters).
    *   *Danger Button (Crimson Red background, white text):* High-impact destructive events (Delete Voucher, Cancel Transaction).
    *   *Success Button (Emerald Green background, white text):* Completion workflows (Approve Voucher, Release Hold).
*   **States:** 
    *   *Hover State:* Darkens background color by 10%.
    *   *Focus State:* Active 2px border outline around button.
    *   *Disabled State:* Grayed out background with disabled cursor block pointer.
    *   *Loading State:* Replaces button label text with a circular spinning loader, preventing double-click submissions.

---

## 9 Input Controls
All form inputs are styled uniformly to optimize keyboard-only data entry speeds:
*   **Component Specifications:**
    *   *Textbox:* Clear white surface, border `#CBD5E1`. On focus, changes border to Slate Blue with 2px outer outline.
    *   *Number Box:* Right-aligned mono-spaced characters with custom decimal parameters (e.g., 3 decimals for carats, 2 decimals for pricing).
    *   *Date Picker:* Supports typing numeric string directly (DDMMYYYY) with auto-formatting slashes, plus a compact popup calendar.
    *   *Auto-Complete Lookup:* Custom searchable select-box with inline search filter that filters matching values on the fly.
    *   *Required Fields:* Marked with a small crimson asterisk `*` placed immediately after the text label.
    *   *Validation State:* Fails highlight the control border in Crimson Red and display the error message below.

---

## 10 Grid Standards
The universal Data Grid is the central interface component of DIAMO ERP:
*   **Functional Mechanics:**
    *   *Sorting:* Up/down arrows in table headers, sorting data instantly without full layout refresh.
    *   *Inline Filter Bar:* Multi-field search box directly below headers for quick column-level text/numerical filtering.
    *   *Keyboard Navigation:* Support arrow keys to navigate cell selection. Pressing `Enter` opens the row's detail panel.
    *   *Column Management:* Allows column resizing, drag-and-drop column reordering, and visibility checkboxes.
    *   *Summary Row:* Sticky bottom row displaying cumulative sums (e.g., Total carats, total amount) in mono-spaced font.
    *   *Empty State:* Displays a clear central illustration with an "Add First Record" action button.

---

## 11 Form Design
Form layouts are structured strictly to ensure readability:
*   **Form Grid Structure:**
    *   Uses a modular column grid layout (2, 3, or 4 columns based on window size).
    *   Labels are placed directly above fields, left-aligned.
    *   Form groups are divided using thin divider lines and explicit sub-headers (e.g., Party Information, Quality Parameters).
    *   Form buttons (Save, Cancel) are right-aligned at the bottom-right corner of the workspace panel.

---

## 12 Popup Design
Popups (modals) are standard overlays that dim the background workspace:
*   **Modal Sizing Standards:**
    *   *Small (400px width):* Confirmation messages, deletion prompts, simple alerts.
    *   *Medium (640px width):* Quick create forms (e.g., Add Broker from invoice), CSV uploads, print settings.
    *   *Large (960px width):* Advanced data lookups, packet history timelines, multi-line JV entries.
*   **Modal Behavior:** Centered vertically and horizontally. Feature a clear close `X` icon in the top-right corner. Pressing `Escape` cancels the popup, prompting a warning if unsaved data is modified.

---

## 13 Report Design
Reports follow a single unified visual structure:
*   **Report Header:** Displays company name, company tax/reg credentials, company logo (left-aligned), report name (centered), date range parameter, generated timestamp, and page numbers.
*   **Data Table:** High-density list layout, alternating row backgrounds, right-aligned monetary values, and double-underline highlights below the grand totals row.
*   **Report Footer:** Displays generating user initials, system check signatures, and page counts.

---

## 14 Print Standards
Print layouts use print-optimized stylesheet rules:
*   **Print Configuration:**
    *   Default font changes to print-legible typefaces (such as Calibri or Arial).
    *   Margins are fixed to a safe 0.5 inches on all sides.
    *   All dark background colors are removed, displaying clean black text on white backgrounds.
    *   Watermarks (e.g., "Draft", "Cancelled") are printed in 10% opacity rotated light gray text.
    *   Barcodes are printed cleanly in solid black with no scaling filters to ensure scanning efficiency.

---

## 15 Validation Design
Validation indicators are styled to prevent system friction:
*   **Error Messaging:**
    *   *Field-level:* Input border turns red, displaying error message immediately beneath.
    *   *Form-level:* Displays a banner at the top of the form listing validation blockades.
    *   *Tooltip Help:* Hovering over a field displays constraint requirements (e.g., "Carats must be positive").

---

## 16 Search Design
*   **Global Search Bar:** Accessible via `Ctrl+K`. Displays an overlay modal with auto-suggested pages, transactions, and search categories.
*   **Advanced Search Panel:** Contains custom query builders, allowing users to configure search parameters (e.g., "Sales where Broker = X and Amount > Y").

---

## 17 Filter Design
*   **Standard Filter Sidebar:** Collapsible panel on the right side of list grids. Contains date range selectors, company scopes, status flags, and custom attribute filters.
*   **Saved Filters:** Allows saving specific filter configurations (e.g., "Active Job Works") for one-click reuse.

---

## 18 Loading Experience
*   **Skeleton Loaders:** Replaces data tables and forms with pulsating light gray outline placeholders during load.
*   **Progress Bars:** Displayed at the top of the content area for multi-step processes (e.g., database backup execution, file import parsing).
*   **Circular Spinners:** Compact loading icons inside buttons to show ongoing processes without blocking page interaction.

---

## 19 Notification Design
*   **Toast Alerts:** Compact slide-in banners in the top-right corner. Fade out automatically after 4 seconds.
    *   *Green Toast:* Success confirmation (e.g., "Sale Invoice Saved").
    *   *Red Toast:* Critical error blocker (e.g., "Database Connection Timeout").
*   **Persistent Banner:** Fixed banner below the main header showing critical system-wide messages (e.g., "Financial Year Locked").

---

## 20 Empty States
When a component holds no records, it displays an empty state indicator:
*   **Format:** A simple centered icon, an explanatory title (e.g., "No Packets Found"), a description (e.g., "Adjust your search parameters or add a new stock item"), and a direct call-to-action button (e.g., "Add Packet").

---

## 21 Accessibility
*   **Keyboard Accessibility:** Every field, dropdown list, and button must be reachable via `Tab` sequences. Active controls show a clear outline state.
*   **Color Contrast:** Minimum contrast of 4.5:1 for body copy and 7:1 for status elements against backdrops.
*   **Screen Scalability:** Layouts dynamically resize typography scaling up to 150% without clipping data elements.

---

## 22 Responsive Desktop Design
Supports automatic resizing layouts targeting classic enterprise workspace dimensions:
*   **1366x768:** Compact sidebar, multi-column forms collapse to single/double columns.
*   **1920x1080 (Primary standard):** Full layout with visible menus, three-column configurations, and full-width grids.
*   **4K / Ultra-High DPI:** Scales padding margins and typography size automatically to prevent tiny, unreadable interfaces.

---

## 23 Animation
Animations are kept subtle, professional, and short (under 200ms duration) to avoid rendering lag:
*   *Page transitions:* Simple fade-in opacity transitions.
*   *Popups:* Soft scale-up effect centered on the screen.
*   *Accordion expansion:* Smooth vertical height expansion for nested menu folders.

---

## 24 Branding
*   **DIAMO Logo:** Displayed in the top-left corner of the sidebar navigation.
*   **Splash Screen:** Clean centered logo showing current build versions, database connection checks, and license verification messages.
*   **About Panel:** Accessible via the header profile. Lists registration details, active company name, and support contacts.

---

## 25 Consistency Rules
*   Every data entry form must place action buttons in the bottom-right corner.
*   All data tables must share the same header font, row padding, and sorting styles.
*   All search boxes must trigger from standard keyboard shortcuts (`Ctrl+K` for global search, `Ctrl+F` for page search).
*   All error popups must place the "Cancel" action to the left and the primary action button to the right.

---

## 26 Future Ready Design
*   **Web/Cloud Compatibility:** Layout templates avoid native desktop dependencies, allowing the client interface to render seamlessly inside a standard web browser frame.
*   **Dark Mode:** Color palettes use semantic color variables (e.g., `var(--background)`) to support dark theme variations.
*   **AI Integration:** Side panels feature reserved layouts for AI chat interfaces and voice assistant widgets.

---

## 27 Architect Recommendations
1.  **Fenced Component Libraries:** Enforce that developers construct all interfaces using a unified component library. This ensures that no individual developer uses custom color values, fonts, or padding variables.
2.  **Focus Trap Modals:** Ensure that all popups trap keyboard focus inside the modal frame to guarantee accessibility.
3.  **Strict Performance Budget:** Enforce that screen rendering times remain under 100ms. If complex forms exceed this budget, implement lazy loading layout skeletons.

---

## 28 Final Enterprise UI Checklist
*   [x] Universal layout grids, sidebar configurations, and status bars designed.
*   [x] High-contrast color systems and mono-spaced numeric typography rules defined.
*   [x] Action buttons, disabled behaviors, and loader styles standardized.
*   [x] Input fields, lookup selectors, date inputs, and validation markers mapped.
*   [x] Universal Data Grid features (sorting, resizing, summaries) specified.
*   [x] Standardized popup widths, positions, and closing actions documented.
*   [x] Diagnostic reports layouts, printing stylesheets, and margins mapped.
*   [x] Verification, accessibility standards, responsive desktop sizes, and animations outlined.
*   [x] Verified that no CSS, TypeScript, SQL, or API declarations are generated.
