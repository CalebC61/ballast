import type { Bag, Data, Exercise, Factors, Load, Profile } from './types';

export function eli(ex: Exercise, weight: number, bodyweight: number, handles: boolean, f: Factors): number {
  if (!bodyweight || bodyweight <= 0) throw new Error('bodyweight required');
  const grip = ex.needsHandles || handles ? f.grip.handles : f.grip.no_handles;
  return (weight / bodyweight) * (f.position[ex.hold] ?? 1) * (f.stance[ex.stance] ?? 1) * (f.plane[ex.plane] ?? 1) * grip;
}

/** Every load the user can actually make with what they own (adjustable bags expand to fill steps). */
export function ownedLoads(bags: Bag[], needHandles = false): Load[] {
  const out: Load[] = [];
  for (const b of bags) {
    if (needHandles && !b.handles) continue;
    if (b.adjustable && b.minFill != null && b.maxFill != null && b.maxFill >= b.minFill) {
      const step = b.step && b.step > 0 ? b.step : 5;
      for (let w = b.minFill; w <= b.maxFill + 1e-9; w += step) out.push({ bagId: b.id, bagName: b.name, weight: +w.toFixed(2), handles: b.handles });
    } else if (b.weight > 0) out.push({ bagId: b.id, bagName: b.name, weight: b.weight, handles: b.handles });
  }
  return out.sort((a, b) => a.weight - b.weight);
}

/** Snap to an owned load: heaviest whose ELI is <= maxEli; if none fits, the lightest available. Never invents a bag. */
export function snapToBag(ex: Exercise, maxEli: number, p: Profile, f: Factors): { load: Load; eli: number; fits: boolean } | null {
  const loads = ownedLoads(p.bags, ex.needsHandles);
  if (!loads.length) return null;
  let best: { load: Load; eli: number } | null = null;
  for (const l of loads) {
    const e = eli(ex, l.weight, p.bodyweight, l.handles, f);
    if (e <= maxEli + 1e-9) best = { load: l, eli: e };
  }
  if (best) return { ...best, fits: true };
  const l = loads[0];
  return { load: l, eli: eli(ex, l.weight, p.bodyweight, l.handles, f), fits: false };
}

export function withinCap(prevEli: number | undefined, nextEli: number, capPct: number) {
  if (!prevEli) return true;
  return nextEli <= prevEli * (1 + capPct / 100) + 1e-9;
}

export function exById(d: Data, id: string) { return d.exercises.find(e => e.id === id); }

export function hashSeed(s: string) { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
export function rng(seed: number) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
export const addDays = (d: string, n: number) => new Date(Date.parse(d) + n * 86400000).toISOString().slice(0, 10);
