import type { RecoveryPathId } from "./recoveryPaths";

/** Demo room shape — replace with API data later */
export type RoomStatusBadge = "live" | "open";

export type DemoRoom = {
  id: string;
  name: string;
  description: string;
  activeUsers: number;
  status: RoomStatusBadge;
  /** Optional overflow room id for future UI */
  overflowRoomId?: string;
};

/** Path-keyed catalog; currently empty (no demo rooms surfaced in product UI). */
export const PATH_DEMO_ROOMS: Record<RecoveryPathId, readonly DemoRoom[]> = {
  stabilize: [
    {
      id: "stabilize-chat",
      name: "Stabilize",
      description:
        "Safety first—Adjusting to life without addiction. The importance of routines, sleep, and lowering daily risk.",
      activeUsers: 12,
      status: "open",
    },
  ],
  build_control: [
    {
      id: "maintain-chat",
      name: "Maintain",
      description: "Using new skills and patterns that hold when pressure spikes.",
      activeUsers: 14,
      status: "open",
    },
  ],
  repair_life: [
    {
      id: "rebuild-chat",
      name: "Rebuild",
      description: "Trust, work, money, and relationships—steady, visible steps.",
      activeUsers: 11,
      status: "open",
    },
  ],
  heal_deep: [
    {
      id: "heal-chat",
      name: "Heal",
      description: "Trauma-informed depth alongside your day-to-day plan.",
      activeUsers: 13,
      status: "open",
    },
  ],
  grow_forward: [
    {
      id: "grow-chat",
      name: "Grow",
      description: "Purpose, identity, and momentum beyond crisis mode.",
      activeUsers: 15,
      status: "open",
    },
  ],
  give_back: [
    {
      id: "give-back-chat",
      name: "Give Back",
      description: "Mentorship and service—without losing your center.",
      activeUsers: 10,
      status: "open",
    },
  ],
};

export function getDemoRoomsForPath(pathId: RecoveryPathId | null | undefined): DemoRoom[] {
  if (!pathId) return [];
  return [...PATH_DEMO_ROOMS[pathId]];
}

export function findDemoRoomById(roomId: string | undefined): DemoRoom | null {
  if (!roomId) return null;
  for (const path of Object.keys(PATH_DEMO_ROOMS) as RecoveryPathId[]) {
    const hit = PATH_DEMO_ROOMS[path].find((r) => r.id === roomId);
    if (hit) return hit;
  }
  return null;
}

/** Baseline occupancy from demo catalog (used to reset mock state). */
export function getCatalogOccupancyByRoomId(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const path of Object.keys(PATH_DEMO_ROOMS) as RecoveryPathId[]) {
    for (const r of PATH_DEMO_ROOMS[path]) {
      out[r.id] = r.activeUsers;
    }
  }
  return out;
}

/** Primary room that overflows into `overflowRoomId`, if any */
export function findPrimaryRoomForOverflow(overflowRoomId: string): DemoRoom | null {
  for (const path of Object.keys(PATH_DEMO_ROOMS) as RecoveryPathId[]) {
    for (const r of PATH_DEMO_ROOMS[path]) {
      if (r.overflowRoomId === overflowRoomId) return r;
    }
  }
  return null;
}
