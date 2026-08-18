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
