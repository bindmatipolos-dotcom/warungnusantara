import { PRODUCTS } from "./data";
import { Outfit, DEFAULT_OUTFIT } from "./outfit";

export interface SaveData {
  v: number;
  char: "A" | "B" | null;
  outfit: Outfit;
  money: number; xp: number; level: number;
  stock: Record<string, number>;
  tier: number;
  missions: Record<string, { p: number; claimed: boolean }>;
  missionDay: string;
  place: string;        // "outdoor" | id interior
  lastX: number;
  clock: number;        // jam game 0..24
  stats: { sold: number; earned: number; customers: number; missed: number; steps: number; playSec: number; spent: number };
  settings: { npc: number; vehicles: boolean; hints: boolean };
}
const KEY = "warung-nusantara-save-v1";

export function newSave(): SaveData {
  const stock: Record<string, number> = {};
  PRODUCTS.forEach((p) => (stock[p.id] = 6));
  return {
    v: 1, char: null, outfit: { ...DEFAULT_OUTFIT }, money: 150000, xp: 0, level: 1, stock, tier: 0,
    missions: {}, missionDay: "", place: "outdoor", lastX: 2900, clock: 7,
    stats: { sold: 0, earned: 0, customers: 0, missed: 0, steps: 0, playSec: 0, spent: 0 },
    settings: { npc: 1, vehicles: true, hints: true },
  };
}
export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw);
      return { ...newSave(), ...s, outfit: { ...DEFAULT_OUTFIT, ...s.outfit }, stats: { ...newSave().stats, ...s.stats }, settings: { ...newSave().settings, ...s.settings } };
    }
  } catch {}
  return newSave();
}
export function writeSave(s: SaveData) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {} }
export function clearSave() { try { localStorage.removeItem(KEY); } catch {} }
