import { create } from "zustand";

import { getCatalogOccupancyByRoomId } from "../constants/recoveryPathRooms";

type MockRoomCapacityState = {
  countsByRoomId: Record<string, number>;
  /** Room id the local user is counted in, if any */
  activeRoomId: string | null;
  /** Always allows joining (no capacity cap in product UI). */
  enterRoom: (roomId: string) => boolean;
  leaveRoom: (roomId: string) => void;
  resetToCatalog: () => void;
};

function catalog(): Record<string, number> {
  return getCatalogOccupancyByRoomId();
}

export const useMockRoomCapacityStore = create<MockRoomCapacityState>((set, get) => ({
  countsByRoomId: catalog(),
  activeRoomId: null,

  enterRoom: (roomId) => {
    const base = catalog();
    if (!roomId) return false;
    if (Object.keys(base).length === 0) {
      const s = get();
      if (s.activeRoomId === roomId) return true;
      set({ activeRoomId: roomId });
      return true;
    }
    if (!(roomId in base)) return false;
    const s = get();
    if (s.activeRoomId === roomId) return true;

    const cur = s.countsByRoomId[roomId] ?? base[roomId] ?? 0;

    const next = { ...s.countsByRoomId };
    if (s.activeRoomId) {
      const pid = s.activeRoomId;
      const pCur = next[pid] ?? base[pid] ?? 0;
      next[pid] = Math.max(base[pid] ?? 0, pCur - 1);
    }
    next[roomId] = cur + 1;
    set({ countsByRoomId: next, activeRoomId: roomId });
    return true;
  },

  leaveRoom: (roomId) => {
    const base = catalog();
    if (Object.keys(base).length === 0) {
      set((s) => (s.activeRoomId === roomId ? { activeRoomId: null } : s));
      return;
    }
    if (!(roomId in base)) return;
    set((s) => {
      if (s.activeRoomId !== roomId) return s;
      const cur = s.countsByRoomId[roomId] ?? base[roomId] ?? 0;
      const nextCount = Math.max(base[roomId] ?? 0, cur - 1);
      return {
        countsByRoomId: { ...s.countsByRoomId, [roomId]: nextCount },
        activeRoomId: null,
      };
    });
  },

  resetToCatalog: () => set({ countsByRoomId: catalog(), activeRoomId: null }),
}));
