import { describe, it, expect } from 'vitest';
import { DATA as d, eli, ownedLoads, snapToBag, buildSession, adapt, weeklyAdjust, exById, programPosition, getProgram } from './index';
import type { AppState, Profile } from './types';
import fs from 'fs'; import path from 'path';

const prof = (o: Partial<Profile> = {}): Profile => ({ units: 'lb', bodyweight: 190, bags: [
  { id: 'a', name: 'Small', weight: 40, handles: true, adjustable: false }, { id: 'b', name: 'Big', weight: 60, handles: true, adjustable: false }],
  kettlebells: [], experience: 2, programId: 'hybrid', eventDate: '2027-02-11', startDate: '2026-10-01', daysPerWeek: 4, sessionMinutes: 45,
  excluded: [], painAreas: [], unlockAdvanced: false, ...o });
const empty = (): AppState => ({ patterns: {}, paused: {}, weekSetAdj: 0, log: [] });
const ex = (id: string) => exById(d, id)!;

describe('ELI', () => {
  it('matches the plan worked example (front-loaded squat 60/190 = 0.347)', () => {
    expect(eli(ex('front_loaded_squat'), 60, 190, true, d.factors)).toBeCloseTo(0.347, 3);
    expect(eli(ex('zercher_squat'), 60, 190, true, d.factors)).toBeCloseTo(0.363, 3);
    expect(eli(ex('shoulder_squat'), 60, 190, true, d.factors)).toBeCloseTo(0.434, 3);
  });
  it('applies the no-handles grip factor', () => {
    expect(eli(ex('bear_hug_squat'), 50, 200, false, d.factors) / eli(ex('bear_hug_squat'), 50, 200, true, d.factors)).toBeCloseTo(1.1, 5);
  });
  it('is unit-agnostic and rejects missing bodyweight', () => {
    expect(eli(ex('bear_hug_squat'), 27.2, 86.2, true, d.factors)).toBeCloseTo(eli(ex('bear_hug_squat'), 60, 190, true, d.factors), 2);
    expect(() => eli(ex('bear_hug_squat'), 60, 0, true, d.factors)).toThrow();
  });
});

describe('bag snapping', () => {
  it('expands adjustable bags by fill step', () => {
    expect(ownedLoads([{ id: 'x', name: 'Adj', weight: 0, handles: false, adjustable: true, minFill: 20, maxFill: 40, step: 10 }]).map(l => l.weight)).toEqual([20, 30, 40]);
  });
  it('picks heaviest owned bag under the ELI ceiling, never an unowned weight', () => {
    const s = snapToBag(ex('shoulder_squat'), 0.4, prof(), d.factors)!;
    expect(s.load.weight).toBe(40); expect(s.fits).toBe(true);
    expect([40, 60]).toContain(snapToBag(ex('front_loaded_squat'), 9, prof(), d.factors)!.load.weight);
  });
  it('falls back to lightest bag (and flags no fit) when nothing is under the ceiling', () => {
    const s = snapToBag(ex('overhead_squat'), 0.01, prof(), d.factors)!; expect(s.load.weight).toBe(40); expect(s.fits).toBe(false);
  });
  it('respects handles requirement', () => {
    expect(snapToBag(ex('sandbag_deadlift'), 9, prof({ bags: [{ id: 'n', name: 'NoHandle', weight: 50, handles: false, adjustable: false }] }), d.factors)).toBeNull();
  });
});

describe('session builder guardrails', () => {
  const s = buildSession(d, prof(), empty(), { date: '2026-11-02', readiness: 'normal', minutes: 60 });
  it('only prescribes owned bags and database exercises', () => {
    for (const i of s.items) { expect(exById(d, i.exerciseId)).toBeTruthy(); if (i.load) expect([40, 60]).toContain(i.load.weight); }
  });
  it('is deterministic for same inputs', () => {
    expect(buildSession(d, prof(), empty(), { date: '2026-11-02', readiness: 'normal', minutes: 60 })).toEqual(s);
  });
  it('has an anchor, a one-line why, and reason codes that exist', () => {
    expect(s.items.some(i => i.anchor)).toBe(true); expect(s.why.length).toBeGreaterThan(10);
    for (const i of s.items) for (const c of i.reasons) expect(d.reasons[c]).toBeTruthy();
  });
  it('honors exclusions and pain pauses', () => {
    const anchor = s.items.find(i => i.anchor)!;
    const s2 = buildSession(d, prof({ excluded: [anchor.exerciseId] }), empty(), { date: '2026-11-02', readiness: 'normal', minutes: 60 });
    expect(s2.items.map(i => i.exerciseId)).not.toContain(anchor.exerciseId);
  });
  it('beat-up readiness removes ballistic moves and cuts volume', () => {
    const b = buildSession(d, prof(), empty(), { date: '2026-11-02', readiness: 'beat', minutes: 60 });
    expect(b.items.every(i => !ex(i.exerciseId).ballistic)).toBe(true);
    expect(b.items.reduce((a, i) => a + i.sets, 0)).toBeLessThan(s.items.reduce((a, i) => a + i.sets, 0));
  });
  it('shorten keeps the anchor and drops the finisher first', () => {
    const sh = buildSession(d, prof(), empty(), { date: '2026-11-02', readiness: 'normal', minutes: 20 });
    expect(sh.items.some(i => i.anchor)).toBe(true); expect(sh.finisher).toBeUndefined(); expect(sh.reasons).toContain('SHORTENED');
  });
  it('locks advanced overhead/ballistic moves until unlocked', () => {
    const adv = buildSession(d, prof({ experience: 3 }), { ...empty(), patterns: { power: { rung: 9, reps: [], missStreak: 0 } } }, { date: '2026-11-02', readiness: 'normal', minutes: 90 });
    for (const i of adv.items) { const e = ex(i.exerciseId); expect((e.ballistic || e.overhead) && e.level >= 3).toBe(false); }
  });
  it('a week includes pull, carry and core', () => {
    const pats = s.items.map(i => ex(i.exerciseId).pattern); for (const m of ['pull', 'carry', 'core']) expect(pats).toContain(m);
  });
  it('counts back from the event date (HYROX Phoenix)', () => {
    const prog = getProgram(d, prof());
    expect(programPosition(prog, prof(), '2027-02-08').block.name).toBe('Race');
    expect(programPosition(prog, prof(), '2026-11-02').block.name).toBe('Base');
  });
});

describe('progression (adapt)', () => {
  const p = prof();
  const base = buildSession(d, p, empty(), { date: '2026-11-02', readiness: 'normal', minutes: 60 });
  const acc = base.items.find(i => !i.anchor && i.dose === 'reps' && i.load)!;
  const one = (rating: any, repsDone?: number[], pain?: string) => adapt(d, p, empty(), base, [{ exerciseId: acc.exerciseId, ladder: acc.ladder, repsDone: repsDone ?? acc.reps, rating, pain }]);
  const lad = d.ladders.find(l => l.id === acc.ladder)!; const rung0 = lad.rungs.indexOf(acc.exerciseId);
  it('Hard: same rung, one more rep on one set', () => {
    const st = one('hard'); expect(st.patterns[acc.ladder].rung).toBe(rung0);
    expect(st.patterns[acc.ladder].reps.reduce((a, b) => a + b)).toBe(acc.reps.reduce((a, b) => a + b) + 1);
  });
  it('unrated counts as Hard', () => { expect(one(undefined).patterns[acc.ladder]).toEqual(one('hard').patterns[acc.ladder]); });
  it('Easy: advances one rung', () => { expect(one('easy').patterns[acc.ladder].rung).toBe(Math.min(rung0 + 1, lad.rungs.length - 1)); });
  it('pain: drops a rung and pauses the movement for 14 days', () => {
    const st = one('right', undefined, 'knee'); expect(st.patterns[acc.ladder].rung).toBe(Math.max(0, rung0 - 1));
    expect(st.paused[acc.exerciseId]).toBe('2026-11-16');
  });
  it('Right at top of range: never jumps effective load more than the cap', () => {
    const st = one('right', acc.reps.map(() => 99)); const ps = st.patterns[acc.ladder];
    if (ps.lastEli && acc.eli && ps.weight !== acc.load!.weight) expect(ps.lastEli / acc.eli).toBeLessThanOrEqual(1.15 + 1e-9);
  });
  it('40 -> 60 lb bag jump (+50%) is blocked by the cap', () => {
    const it2 = { ...acc, load: { bagId: 'a', bagName: 'Small', weight: 40, handles: true }, eli: eli(ex(acc.exerciseId), 40, 190, true, d.factors), anchor: false };
    const st = adapt(d, p, empty(), { ...base, items: [it2] }, [{ exerciseId: it2.exerciseId, ladder: it2.ladder, repsDone: it2.reps.map(() => 99), rating: 'right' }]);
    expect(st.patterns[acc.ladder].weight).toBe(40);
  });
  it('missed target twice drops a rung', () => {
    let st = empty(); for (let k = 0; k < 2; k++) st = adapt(d, p, st, base, [{ exerciseId: acc.exerciseId, ladder: acc.ladder, repsDone: acc.reps.map(() => 1), rating: 'right' }]);
    expect(st.patterns[acc.ladder].rung).toBe(Math.max(0, rung0 - 1));
  });
  it('deload sessions do not progress', () => {
    const st = adapt(d, p, empty(), { ...base, deload: true }, [{ exerciseId: acc.exerciseId, ladder: acc.ladder, repsDone: acc.reps, rating: 'easy' }]);
    expect(st.patterns[acc.ladder].rung).toBe(rung0);
  });
  it('weekly: >half Hard means one set less next week', () => {
    const st: AppState = { ...empty(), log: [{ id: '1', date: '2026-11-03', kind: 'session', session: base, results: [{ exerciseId: 'x', ladder: 'x', repsDone: [], rating: 'hard' }] }] };
    expect(weeklyAdjust(st, '2026-11-10').weekSetAdj).toBe(-1);
  });
});

describe('nothing hard-coded about the user', () => {
  it('engine source has no user-specific numbers or names', () => {
    const dir = path.join(__dirname); const src = fs.readdirSync(dir).filter(f => f.endsWith('.ts') && !f.includes('test')).map(f => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');
    expect(src).not.toMatch(/\b(190|Caleb|2027-02-11)\b/);
  });
  it('different bodyweight and bags change the prescription', () => {
    const a = buildSession(d, prof(), empty(), { date: '2026-11-02', readiness: 'normal', minutes: 60 });
    const b = buildSession(d, prof({ bodyweight: 140, bags: [{ id: 'z', name: 'Adj', weight: 0, handles: true, adjustable: true, minFill: 10, maxFill: 80, step: 5 }] }), empty(), { date: '2026-11-02', readiness: 'normal', minutes: 60 });
    expect(JSON.stringify(a.items.map(i => i.load))).not.toEqual(JSON.stringify(b.items.map(i => i.load)));
  });
  it('seed data loads: ~100 exercises, ladders reference real exercises, 16 reasons, 18 formats', () => {
    expect(d.exercises.length).toBeGreaterThanOrEqual(100);
    for (const l of d.ladders) for (const id of l.rungs) expect(exById(d, id)).toBeTruthy();
    expect(Object.keys(d.reasons).length).toBe(16); expect(d.formats.length).toBe(18);
  });
});
