import type { AppState, Data, Exercise, Finisher, Profile, Readiness, Session, SessionItem } from './types';
import { addDays, daysBetween, eli, exById, hashSeed, rng, snapToBag } from './core';
import { getProgram, programPosition, weekStart } from './program';

export interface BuildOpts { date: string; readiness: Readiness; minutes: number; swaps?: Record<string, string>; extraExclude?: string[] }

export function isEligible(ex: Exercise, p: Profile, st: AppState, date: string, readiness: Readiness, exclude: string[]): boolean {
  if (p.excluded.includes(ex.id) || exclude.includes(ex.id)) return false;
  const until = st.paused[ex.id]; if (until && date < until) return false;
  if (ex.usesBag && !p.bags.some(b => (!ex.needsHandles || b.handles) && (b.weight > 0 || (b.adjustable && (b.maxFill ?? 0) > 0)))) return false;
  if (readiness === 'beat' && ex.ballistic) return false;
  // Guardrail 5: advanced ballistic/overhead moves locked until unlocked or an easier rung of the same ladder is logged.
  if ((ex.ballistic || ex.overhead) && ex.level >= 3 && !p.unlockAdvanced) {
    const logged = st.log.some(l => l.results?.some(r => r.ladder === ex.ladder));
    if (!logged) return false;
  }
  if (p.painAreas.includes('shoulder') && ex.overhead) return false;
  if (p.painAreas.includes('lower back') && ex.ballistic && ex.pattern !== 'carry') return false;
  if (p.painAreas.includes('knee') && (ex.stance === 'single_leg' || ex.stance === 'lateral')) return false;
  return true;
}

function startRung(p: Profile) { return p.experience - 1; }

function hardSetsThisWeek(st: AppState, d: Data, date: string) {
  const ws = weekStart(date); const out: Record<string, number> = {};
  for (const l of st.log) if (l.kind === 'session' && l.date >= ws && l.date < date && !l.session?.deload)
    for (const it of l.session?.items ?? []) { const pat = exById(d, it.exerciseId)?.pattern ?? ''; out[pat] = (out[pat] ?? 0) + it.sets; }
  return out;
}

export function buildSession(d: Data, p: Profile, st: AppState, o: BuildOpts): Session {
  if (!(p.bodyweight > 0)) throw new Error('Set your bodyweight in Settings first');
  const prog = getProgram(d, p); const pos = programPosition(prog, p, o.date);
  const r = rng(hashSeed(`${p.startDate}|${o.date}|${JSON.stringify(o.swaps ?? {})}|${(o.extraExclude ?? []).join()}`));
  const ws = weekStart(o.date);
  const doneThisWeek = st.log.filter(l => l.kind === 'session' && l.date >= ws && l.date < o.date).length;
  const tmpl = prog.dayTemplates[doneThisWeek % prog.dayTemplates.length];
  const exclude = o.extraExclude ?? [];
  const used = new Set<string>(); const reasons: string[] = [];
  const cap = d.engine.eliCapPct;
  const lastSession = [...st.log].filter(l => l.kind === 'session').sort((a, b) => b.date.localeCompare(a.date))[0];
  const returning = lastSession && daysBetween(lastSession.date, o.date) >= d.engine.returnAfterDays;
  const weekly = hardSetsThisWeek(st, d, o.date);
  const baseSets = (pos.block.deload ? 2 : 3) + (st.weekAdjFor === ws ? st.weekSetAdj : 0);
  const [lo, hi] = pos.block.repRange;

  const pickFromPattern = (pattern: string, slot: string): SessionItem | null => {
    const ladders = d.ladders.filter(l => l.pattern === pattern);
    const isAnchor = slot === 'primary';
    // anchors use the main ladder; accessories rotate by seed
    const order = isAnchor ? ladders : [...ladders].sort(() => r() - 0.5);
    for (const lad of order) {
      const ps = st.patterns[lad.id];
      let rung = Math.min(ps?.rung ?? startRung(p), lad.rungs.length - 1);
      if (slot === 'pair2') rung = Math.max(0, rung - 1);
      const forced = o.swaps?.[`${slot}:${pattern}`];
      const candidates = forced ? [forced] : [...lad.rungs.slice(0, rung + 1)].reverse();
      for (const id of candidates) {
        const ex = exById(d, id); if (!ex || used.has(id)) continue;
        if (!isEligible(ex, p, st, o.date, o.readiness, exclude)) continue;
        used.add(id);
        const why: string[] = [];
        if (isAnchor) why.push('ANCHOR');
        if (id !== lad.rungs[rung]) why.push('EXCLUDED');
        const w = weekly[pattern] ?? 0; const tgt = d.engine.weeklyHardSets[pattern];
        if (tgt && w < tgt[0] && !isAnchor) why.push('PAT_NEED');
        let sets = Math.max(1, baseSets + (isAnchor ? 1 : 0));
        let reps = ps?.reps?.length ? [...ps.reps] : Array.from({ length: sets }, (_, i) => Math.max(lo, hi - 2 - i));
        if (ps?.reps?.length && ps.reps.length !== sets) reps = Array.from({ length: sets }, (_, i) => ps.reps[Math.min(i, ps.reps.length - 1)]);
        if (ps && ps.reps?.length && ps.reps[0] > lo) why.push('REP_LADDER');
        let load; let e: number | undefined;
        if (ex.usesBag) {
          const prev = ps?.lastEli;
          const maxEli = prev ? prev * (1 + cap / 100) : (ps?.weight ? eli(ex, ps.weight, p.bodyweight, true, d.factors) : Infinity);
          const target = prev ? maxEli : startEliMax(p);
          const s = snapToBag(ex, Math.min(maxEli, target), p, d.factors);
          if (s) { load = s.load; e = s.eli; why.push(s.fits ? 'BAG_SNAP' : 'CAP_HOLD'); if (!s.fits) reps = reps.map(x => Math.max(lo - 2, x - 2)); }
        }
        if (o.readiness === 'beat') { sets = Math.max(1, Math.round(sets * (1 - d.engine.beatUpVolumeCut / 100))); reps = reps.slice(0, sets); why.push('BEAT_UP'); }
        if (returning) { sets = Math.max(1, Math.round(sets * d.engine.returnVolumePct / 100)); reps = reps.slice(0, sets); why.push('RETURN'); }
        if (pos.block.deload) why.push('DELOAD');
        if (slot === 'power') why.push('POWER_FIRST');
        let amount: number | undefined;
        if (ex.dose === 'distance') { amount = pattern === 'locomotion' ? 200 : 40; reps = Array(sets).fill(1); }
        if (ex.dose === 'time') { amount = 30; reps = Array(sets).fill(1); }
        if (slot === 'power') reps = Array(sets).fill(Math.min(5, lo));
        return { slot, exerciseId: id, name: ex.name, ladder: lad.id, load, eli: e, sets, reps: reps.slice(0, sets), dose: ex.dose, amount, reasons: [...new Set(why)], anchor: isAnchor };
      }
    }
    return null;
  };

  const items: SessionItem[] = [];
  for (const slot of tmpl.slots) {
    const [kind, arg] = slot.split(':');
    if (kind === 'warmup' || kind === 'finisher') continue;
    if (kind === 'power') { if (o.readiness === 'beat') { reasons.push('BEAT_UP'); continue; } const it = pickFromPattern('power', 'power'); if (it) items.push(it); }
    else if (kind === 'primary') { const it = pickFromPattern(arg, 'primary'); if (it) items.push(it); }
    else if (kind === 'pair') { arg.split('+').forEach((pat, i) => { const it = pickFromPattern(pat, i ? 'pair2' : 'pair'); if (it) items.push(it); }); }
    else { const it = pickFromPattern(kind, kind); if (it) items.push(it); }
  }
  // Guardrail 6: weekly pull + carry + anti-rotation
  const has = (pat: string) => items.some(i => exById(d, i.exerciseId)?.pattern === pat) || (weekly[pat] ?? 0) > 0;
  for (const must of ['pull', 'carry', 'core']) if (!has(must)) { const it = pickFromPattern(must, must); if (it) { it.reasons.push('WEEKLY_MUST'); items.push(it); } }

  let finisher: Finisher | undefined;
  if (tmpl.slots.includes('finisher')) finisher = buildFinisher(d, p, st, o, tmpl.finisherFormats[Math.floor(r() * tmpl.finisherFormats.length)], used, r, prog.id === 'hybrid');

  // fit time: warmup 5 + items + finisher; drop finisher, then pair, never anchor
  const est = () => 5 + items.reduce((s, i) => s + i.sets * 2, 0) + (finisher?.minutes ?? 0);
  let shortened = false;
  if (est() > o.minutes && finisher) { const room = o.minutes - (est() - finisher.minutes); if (room >= 6) finisher.minutes = Math.floor(room); else finisher = undefined; shortened = true; }
  for (const drop of ['pair2', 'core', 'carry', 'pair', 'power']) { while (est() > o.minutes) { const i = items.findIndex(x => x.slot === drop && !x.anchor); if (i < 0) break; items.splice(i, 1); shortened = true; } }
  while (est() > o.minutes) { const a = items.find(x => x.anchor); if (!a || a.sets <= 2) break; a.sets--; a.reps = a.reps.slice(0, a.sets); shortened = true; }
  if (shortened) reasons.push('SHORTENED');
  if (pos.block.deload) reasons.push('DELOAD');
  if (returning) reasons.push('RETURN');
  if (o.readiness === 'beat') reasons.push('BEAT_UP');
  const anchor = items.find(i => i.anchor);
  const why = `${pos.block.name} block, week ${pos.week}: ${tmpl.name}. ` + (anchor ? `${anchor.name} is your anchor${anchor.reasons.includes('REP_LADDER') ? ', one more rep than last time' : ''}. ` : '') +
    ([...new Set(reasons)].map(c => d.reasons[c]).filter(Boolean)[0] ?? `Leave ${pos.block.rir} in the tank on each set.`);
  return { date: o.date, dayName: tmpl.name, programId: prog.id, blockName: pos.block.name, week: pos.week, deload: pos.block.deload, readiness: o.readiness, minutes: o.minutes, items, finisher, why, reasons: [...new Set(reasons)] };
}

/** First-time ELI ceiling from experience: beginner 0.25, intermediate 0.35, advanced 0.5 of bodyweight-equivalent. */
export function startEliMax(p: Profile) { return [0.25, 0.35, 0.5][p.experience - 1]; }

function buildFinisher(d: Data, p: Profile, st: AppState, o: BuildOpts, formatId: string, used: Set<string>, r: () => number, hybrid: boolean): Finisher {
  const fmt = d.formats.find(f => f.id === formatId)!;
  const pool = d.exercises.filter(e => ['locomotion', 'carry', 'lunge', 'core', 'shoulder', 'complex', 'squat'].includes(e.pattern) && !used.has(e.id) && e.level <= 3 &&
    isEligible(e, p, st, o.date, o.readiness, o.extraExclude ?? []) &&
    !(fmt.rules.banPatterns ?? []).includes(e.pattern) && !(fmt.rules.banOverhead && e.overhead));
  const pick = (pred: (e: Exercise) => boolean) => { const c = pool.filter(e => pred(e) && !used.has(e.id)); if (!c.length) return undefined; const e = c[Math.floor(r() * c.length)]; used.add(e.id); return e; };
  let picks: (Exercise | undefined)[];
  if (formatId === 'racesim' || (hybrid && formatId === 'ruckhybrid')) picks = [pool.find(e => e.id === 'run'), pick(e => e.id === 'walking_lunge_front_load' || e.id === 'walking_lunge_shoulder'), pick(e => e.pattern === 'carry'), pick(e => e.id === 'bag_over_burpee_shuttle' || e.id === 'sandbag_burpee_over')];
  else picks = [pick(e => !e.ballistic && (e.pattern === 'squat' || e.pattern === 'lunge')), pick(e => e.pattern === 'carry' || e.pattern === 'locomotion'), pick(e => e.pattern === 'core')];
  const exs = picks.filter(Boolean) as Exercise[];
  if (fmt.rules.requireNonBallistic && !exs.some(e => !e.ballistic)) { const nb = pick(e => !e.ballistic); if (nb) exs.push(nb); }
  const minutes = formatId === 'tabata' ? 4 * Math.max(1, Math.min(3, exs.length)) : formatId === 'racesim' || formatId === 'ruckhybrid' ? 20 : 12;
  const items = exs.map(e => {
    const s = e.usesBag ? snapToBag(e, startEliMax(p) * 0.8, p, d.factors) : null;
    const amount = e.dose === 'distance' ? (e.id === 'run' ? '400 m' : '25 m') : e.dose === 'time' ? '30 s' : formatId === 'tabata' ? 'max reps' : '10 reps';
    return { exerciseId: e.id, name: e.name, amount, load: s?.load };
  });
  return { formatId, minutes, items };
}
export { addDays };
