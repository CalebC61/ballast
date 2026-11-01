import type { AppState, Data, ItemResult, Profile, Session } from './types';
import { addDays, eli, exById, ownedLoads, withinCap } from './core';
import { getProgram, programPosition, weekStart } from './program';

/** Apply one finished session to the progression state (pure: returns new state). Appendix C rules. */
export function adapt(d: Data, p: Profile, st: AppState, s: Session, results: ItemResult[]): AppState {
  const next: AppState = JSON.parse(JSON.stringify(st));
  const cap = d.engine.eliCapPct;
  const [lo, hi] = getProgram(d, p).blocks.find(b => b.name === s.blockName)?.repRange ?? [8, 12];
  for (const res of results) {
    const item = s.items.find(i => i.exerciseId === res.exerciseId); if (!item) continue;
    const lad = d.ladders.find(l => l.id === item.ladder)!; const ex = exById(d, item.exerciseId)!;
    const cur = next.patterns[lad.id] ?? { rung: Math.max(0, lad.rungs.indexOf(ex.id)), reps: item.reps, missStreak: 0 };
    cur.rung = Math.max(0, lad.rungs.indexOf(ex.id)); cur.weight = item.load?.weight; cur.lastEli = item.eli;
    if (s.deload) { next.patterns[lad.id] = cur; continue; } // deloads excluded from progression math
    const rating = res.rating ?? 'hard'; // unrated counts as Hard
    const target = item.reps; const done = res.repsDone.length ? res.repsDone : target;
    const missed = done.some((x, i) => x < (target[i] ?? 0));
    cur.missStreak = missed ? cur.missStreak + 1 : 0;
    if (res.pain) {
      cur.rung = Math.max(0, cur.rung - 1); cur.reps = target.map((_, i) => Math.max(lo, lo + 2 - i)); cur.missStreak = 0;
      next.paused[ex.id] = addDays(s.date, d.engine.painExcludeDays);
    } else if (cur.missStreak >= 2) {
      cur.rung = Math.max(0, cur.rung - 1); cur.missStreak = 0; cur.reps = target.map(() => lo);
    } else if (rating === 'easy') {
      rungUp(cur);
    } else if (rating === 'right' && done.every(x => x >= hi)) {
      // heavier owned bag within cap?
      const heavier = ex.usesBag ? ownedLoads(p.bags, ex.needsHandles).find(l => l.weight > (item.load?.weight ?? 0) && withinCap(item.eli, eli(ex, l.weight, p.bodyweight, l.handles, d.factors), cap)) : undefined;
      if (heavier) { cur.weight = heavier.weight; cur.lastEli = eli(ex, heavier.weight, p.bodyweight, heavier.handles, d.factors); cur.reps = target.map(() => lo); }
      else if (item.anchor) { cur.pendingRungUp = true; cur.reps = [...target.map(x => x), lo]; } // anchors change rung only at block boundary: add a set meanwhile
      else rungUp(cur);
    } else {
      // Hard or Right-below-top: rep ladder, one more rep on the lowest set (capped at top of range)
      const reps = [...target]; let iMin = 0; reps.forEach((x, i) => { if (x < reps[iMin]) iMin = i; });
      if (reps[iMin] < hi) reps[iMin]++; cur.reps = reps;
    }
    function rungUp(c: typeof cur) {
      if (c.rung < lad.rungs.length - 1) { c.rung++; c.reps = target.map(() => lo); }
    }
    next.patterns[lad.id] = cur;
    if (res.pain) next.patterns[lad.id] = cur;
  }
  return next;
}

/** Block boundary: apply pending anchor rung-ups. */
export function applyBlockBoundary(d: Data, p: Profile, st: AppState, date: string): AppState {
  const blockName = programPosition(getProgram(d, p), p, date).block.name;
  const next: AppState = JSON.parse(JSON.stringify(st));
  for (const [id, ps] of Object.entries(next.patterns)) {
    if (ps.blockName && ps.blockName !== blockName && ps.pendingRungUp) {
      const lad = d.ladders.find(l => l.id === id); if (lad && ps.rung < lad.rungs.length - 1) ps.rung++;
      ps.pendingRungUp = false; ps.reps = [];
    }
    ps.blockName = blockName;
  }
  return next;
}

/** Weekly adaptation: >half Hard => one set less next week; >half Easy => one set more. */
export function weeklyAdjust(st: AppState, date: string): AppState {
  const ws = weekStart(date); const prevWs = addDays(ws, -7);
  const res = st.log.filter(l => l.kind === 'session' && l.date >= prevWs && l.date < ws).flatMap(l => l.results ?? []);
  if (!res.length) return st;
  const hard = res.filter(r => (r.rating ?? 'hard') === 'hard').length, easy = res.filter(r => r.rating === 'easy').length;
  const adj = hard > res.length / 2 ? -1 : easy > res.length / 2 ? 1 : 0;
  return { ...st, weekSetAdj: adj, weekAdjFor: ws };
}
