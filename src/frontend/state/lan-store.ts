// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — LAN Network Status Store (Zustand)
// ═══════════════════════════════════════════════════════════════

import { create } from 'zustand';

export interface LanState {
  role: 'HOST' | 'CLIENT';
  hostIp: string;
  hostPort: number;
  isConnected: boolean;
  pingMs: number | null;
  lastChecked: number | null;
  setLanStatus: (status: Partial<LanState>) => void;
}

export const useLanStore = create<LanState>((set) => ({
  role: 'HOST',
  hostIp: '127.0.0.1',
  hostPort: 3306,
  isConnected: true,
  pingMs: null,
  lastChecked: null,
  setLanStatus: (status) => set((state) => ({ ...state, ...status })),
}));
