// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Release Notes
//
// Shipped with the build so the Settings screen can show real history offline:
// the repository is private, so an installed app cannot read GitHub's release
// feed, and LAN client PCs may have no internet at all.
//
// Add a new entry at the TOP whenever a version is released — newest first.
// ═══════════════════════════════════════════════════════════════

export interface IReleaseNote {
  version: string;
  date: string; // YYYY-MM-DD
  description: string;
}

export const RELEASE_NOTES: IReleaseNote[] = [
  {
    version: 'v1.0.6',
    date: '2026-09-04',
    description:
      'Job Work Permission & Route Access Fix: Resolved access denied issue when issuing new job work tickets from the Job Work Billing & Subcontracting Register; mapped sub-route permissions (/transactions/jobs/new) directly to the registered Job Work access permissions and cleaned duplicate route entries.',
  },
  {
    version: 'v1.0.5',
    date: '2026-09-04',
    description:
      'Staff Permissions & Page Access Control Suite: Added Job Work Billing & Subcontracting Register and Stock Conversion wizard to the centralized access control page registry, enabling granular staff authorization; mapped Job Work Billing and Stock Conversion to the Action-Level Security Matrix (Create/Edit/Delete/Export/Print); synchronized sidebar navigation labels.',
  },
  {
    version: 'v1.0.4',
    date: '2026-08-26',
    description:
      'Multi-Currency Valuation & Invoice GST Suite: Added native USD/INR purchase currency tracking with automated rate conversions; fixed Stock Detail valuation preview for native INR diamonds; introduced real-time Manual Exchange Rate simulation in Inventory without altering database values; added multi-currency mathematical precision to CSV stock exports and image/video media links; unified invoice calculation engine across frontend and backend; added line-level discount percentage persistence; integrated full GST rate percentage tags (CGST, SGST, IGST), taxable value, and discount breakdowns across Invoice Forms, Detail Views, and A4/A5 Print Templates; safe auto-migration for client databases.',
  },
  {
    version: 'v1.0.3',
    date: '2026-08-19',
    description:
      'LAN Network Watchdog & Auto-Reconnect Suite: Added live LAN status and 1-click auto-discovery on Login screen; integrated real-time ping latency badge in the top navigation header; background watchdog alert for connection drops on Client PCs; fixed Quality Master field editing & GST history persistence; added 5-by-5 pagination for release notes logs.',
  },
  {
    version: 'v1.0.2',
    date: '2026-08-18',
    description:
      'Backup restoration enhancement & cascading deletions: Fixed database constraint errors during backup restores by safely managing foreign key checks and date deserialization; added full cascading deletion for Products, Stock Packets, and Companies with informative confirmation prompts.',
  },
  {
    version: 'v1.0.0.1',
    date: '2026-08-18',
    description:
      'Backup & Recovery Management UI update: Added horizontal scrolling support to the Backup Archive History grid, enabling full visibility of checksums, file sizes, and recovery action buttons on all screen sizes.',
  },
  {
    version: 'v1.0.0.0',
    date: '2026-08-18',
    description:
      'Standardized diamond HSN master codes (Natural Diamond 71023910 & CVD 71049120) with automated GST calculation, dynamic on-the-fly custom HSN persistence, and system preferences custom dropdown.',
  },
  {
    version: 'v0.0.7',
    date: '2026-08-18',
    description:
      'Sharing an update with connected PCs is now automatic. Installing a new version on the Host PC is all that is needed — the other PCs receive and install it themselves the next time they start.',
  },
  {
    version: 'v0.0.6',
    date: '2026-08-18',
    description:
      'Settings screen tidy-up: removed the Execution Host Properties panel, and this release notes list now shows the real version history instead of placeholder entries.',
  },
  {
    version: 'v0.0.5',
    date: '2026-08-17',
    description:
      'Version information now shows the build actually installed on this PC. Software updates are delivered from the Host PC to connected LAN PCs automatically, without needing an internet connection.',
  },
  {
    version: 'v0.0.4',
    date: '2026-08-17',
    description:
      'Performance tuning for multi-PC use: a larger database cache and higher connection limits keep the Host responsive while several PCs are connected.',
  },
  {
    version: 'v0.0.3',
    date: '2026-08-17',
    description:
      'Multi-PC support over the local network. Client PCs can now connect to the Host database, and automatically find the Host again if its network address changes.',
  },
  {
    version: 'v0.0.2',
    date: '2026-08-17',
    description:
      'The Windows installer now includes its own database server, so DIAMO ERP runs on a PC with no WAMP or XAMPP installed.',
  },
  {
    version: 'v0.0.1',
    date: '2026-08-17',
    description: 'Version baseline for the new release series.',
  },
];
