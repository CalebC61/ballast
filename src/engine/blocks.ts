import type { AppState, BlockExercise, ClockCfg, Data, Exercise, Profile, Session, SessionItem, WorkoutBlock } from './types';
import type { BuildOpts } from './session';
import { exById, snapToBag } from './core';
import { isEligible, startEliMax } from './session';

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const doseText = (e: { dose: string; reps: number[]; amount?: number | string }) =>
  typeof e.amount === 'string' ? e.amount : e.dose === 'reps' ? `${e.reps.join('/')} reps` : e.dose === 'distance' ? `${e.amount}${typeof e.amount === 'number' ? ' m' : ''}` : `${e.amount}${typeof e.amount === 'number' ? ' s' : ''}`;

function fromItem(d: Data, it: SessionItem, idx: number, tag?: string): BlockExercise {
  return { exerciseId: it.exerciseId, name: it.name, sets: it.sets, reps: it.reps, dose: it.dose, amount: it.amount, load: it.load, cue: exById(d, it.exerciseId)?.cue ?? '', itemIdx: idx, tag };
}

/** Plain-language instructions for each format. Only the numbers come from the session. */
export function describeFormat(formatId: string, c: ClockCfg, nEx: number, rounds?: number, restSec?: number): { name: string; summary: string; howTo: string[] } {
  const rest = restSec ? mmss(restSec) : '';
  switch (formatId) {
    case 'strength': return { name: 'Straight sets', summary: `${rounds ?? ''} sets · rest ${rest}`.trim(), howTo: ['Do one set at the target reps.', 'Tap the check when done. Rest starts in the timer bar.', 'Start the next set when rest hits 0:00.'] };
    case 'superset': return { name: 'Superset', summary: `${rounds} rounds · rest ${rest} after each round`, howTo: [`Do one set of each exercise (${Array.from({ length: nEx }, (_, i) => `A${i + 1}`).join(' → ')}) back to back, no rest between them.`, `Then rest ${rest}. That is one round.`, `Repeat for ${rounds} rounds.`] };
    case 'flow': return { name: 'Warm-up flow', summary: `${rounds} easy rounds · about ${c.minutes} min`, howTo: [`Move through the list ${rounds} times at an easy pace with a light bag.`, 'No rest needed. Get warm and loose, not tired.'] };
    case 'emom': case 'intervals': case 'deathby': return { name: 'EMOM', summary: `Every minute on the minute · ${c.minutes} min`, howTo: [
      'Start the timer. At the top of each minute, do the listed work.',
      nEx > 1 ? `Rotate through the ${nEx} movements: minute 1 = first, minute 2 = second, and so on, then repeat.` : 'Do the same work every minute.',
      'Rest for whatever is left of the minute. If you cannot finish inside the minute, cut reps next minute.'] };
    case 'e2mom': return { name: `E${(c.window ?? 120) / 60}MOM`, summary: `Every ${(c.window ?? 120) / 60} minutes · ${c.minutes} min`, howTo: [`At the start of each ${(c.window ?? 120) / 60}-minute window, do one round of the list.`, 'Rest for what is left of the window.'] };
    case 'amrap': case 'density': return { name: 'AMRAP', summary: `As many rounds as possible · ${c.minutes} min`, howTo: ['Start the clock. Do the list top to bottom; that is one round.', 'Repeat without planned rest until the clock hits 0:00. Rest only as needed.', 'Tap +1 round in the timer bar each time you finish a round. Your score is rounds + extra reps.'] };
    case 'tabata': return { name: 'Tabata', summary: `${c.rounds} rounds · ${c.work}s work / ${c.rest}s rest`, howTo: [`Work hard for ${c.work} seconds, rest ${c.rest} seconds. That is one round.`, nEx > 1 ? `Do ${c.rounds} rounds, rotating movements each round.` : `Do ${c.rounds} rounds.`, 'Count your lowest round of reps; that is your score.'] };
    case 'racesim': case 'ruckhybrid': return { name: 'For Time (race order)', summary: `${rounds ?? 1} round${(rounds ?? 1) > 1 ? 's' : ''} for time · cap ${c.minutes} min`, howTo: ['Do each station in order, once through per round, as fast as you can hold good form.', 'The timer counts up. Stop it when you finish; that time is your score.', `Stop at ${c.minutes}:00 if you are not done (time cap).`] };
    default: return { name: 'For Time', summary: `${rounds ?? 3} rounds for time · cap ${c.minutes} min`, howTo: [`Do the list top to bottom ${rounds ?? 3} times as fast as you can with good form.`, 'The timer counts up. Your finish time is your score.', `Stop at ${c.minutes}:00 if you are not done (time cap).`] };
  }
}

export function clockFor(formatId: string, minutes: number): ClockCfg {
  if (['emom', 'intervals', 'deathby'].includes(formatId)) return { mode: 'emom', minutes, window: 60 };
  if (formatId === 'e2mom') return { mode: 'emom', minutes, window: 120 };
  if (formatId === 'amrap' || formatId === 'density') return { mode: 'amrap', minutes };
  if (formatId === 'tabata') { const rounds = Math.max(8, Math.round(minutes * 60 / 30)); return { mode: 'tabata', minutes, work: 20, rest: 10, rounds }; }
  return { mode: 'fortime', minutes };
}

function block(id: string, kind: WorkoutBlock['kind'], title: string, formatId: string, clock: ClockCfg, exercises: BlockExercise[], rounds?: number, restSec?: number): WorkoutBlock {
  const f = describeFormat(formatId, clock, exercises.length, rounds, restSec);
  return { id, kind, title, formatId, formatName: f.name, summary: f.summary, howTo: f.howTo, clock, restSec, rounds, exercises };
}

export function buildBlocks(d: Data, p: Profile, st: AppState, o: BuildOpts, s: Omit<Session, 'blocks'>, used: Set<string>): WorkoutBlock[] {
  const rc = p.restCompound ?? d.engine.rest?.compound ?? 120; const ra = p.restAccessory ?? d.engine.rest?.accessory ?? 90;
  const out: WorkoutBlock[] = [];
  // Warm-up: 3 easy, non-ballistic, level-1 moves from the database with the lightest owned load.
  const wpool = d.exercises.filter(e => e.level <= 1 && !e.ballistic && !used.has(e.id) && isEligible(e, p, st, o.date, 'beat', o.extraExclude ?? []));
  const wex: Exercise[] = [];
  for (const pats of [['squat', 'lunge'], ['hinge', 'pull'], ['core', 'shoulder']]) { const e = wpool.find(x => pats.includes(x.pattern) && !wex.includes(x)); if (e) wex.push(e); }
  const wmin = 5;
  out.push(block('warmup', 'warmup', 'Warm-up', 'flow', { mode: 'countup', minutes: wmin }, wex.map(e => {
    const l = e.usesBag ? snapToBag(e, startEliMax(p) * 0.5, p, d.factors)?.load : undefined;
    return { exerciseId: e.id, name: e.name, sets: 1, reps: [e.dose === 'reps' ? 8 : 1], dose: e.dose, amount: e.dose === 'time' ? 20 : e.dose === 'distance' ? 20 : undefined, load: l, cue: e.cue };
  }), 2));
  // Main work: power and anchor as straight sets; pairs as supersets; leftover accessories as a superset/circuit.
  const items = s.items; let n = 1; const letters = 'ABCDEFG';
  const taken = new Set<number>();
  const label = () => letters[n - 1] ?? String(n);
  items.forEach((it, i) => {
    if (taken.has(i)) return;
    if (it.slot === 'power' || it.anchor) {
      taken.add(i); const L = label();
      out.push(block(`main${n}`, 'main', `${L} · ${it.anchor ? 'Main lift' : 'Power'}`, 'strength', { mode: 'rest', minutes: rc / 60 }, [fromItem(d, it, i, `${L}1`)], it.sets, rc)); n++;
      return;
    }
    const group = items.map((x, j) => ({ x, j })).filter(({ x, j }) => !taken.has(j) && !(x.slot === 'power' || x.anchor) && (it.slot === 'pair' ? (x.slot === 'pair' || x.slot === 'pair2') : !(x.slot === 'pair' || x.slot === 'pair2')));
    group.forEach(g => taken.add(g.j)); const L = label();
    const rounds = Math.max(...group.map(g => g.x.sets));
    const exs = group.map((g, k) => fromItem(d, g.x, g.j, `${L}${k + 1}`));
    if (exs.length === 1) out.push(block(`main${n}`, 'main', `${L} · Accessory`, 'strength', { mode: 'rest', minutes: ra / 60 }, exs, rounds, ra));
    else out.push(block(`main${n}`, 'main', `${L} · ${it.slot === 'pair' ? 'Superset' : 'Accessory circuit'}`, 'superset', { mode: 'rest', minutes: ra / 60 }, exs, rounds, ra));
    n++;
  });
  if (s.finisher) {
    const f = s.finisher; const clock = clockFor(f.formatId, f.minutes);
    const rounds = ['racesim', 'ruckhybrid'].includes(f.formatId) ? 1 : clock.mode === 'fortime' ? 3 : undefined;
    out.push(block('finisher', 'finisher', s.kind === 'wod' ? 'WOD' : 'Finisher', f.formatId, clock, f.items.map(x => {
      const e = exById(d, x.exerciseId); return { exerciseId: x.exerciseId, name: x.name, sets: 1, reps: [1], dose: e?.dose ?? 'reps', amount: x.amount, load: x.load, cue: e?.cue ?? '' };
    }), rounds));
  }
  out.push({ id: 'cooldown', kind: 'cooldown', title: 'Cool-down', formatId: 'flow', formatName: 'Cool-down', summary: '3 min easy', howTo: ['Walk easy and breathe through your nose until your heart rate settles.', 'Rate each exercise Easy / Right / Hard, then tap Finish & save.'], clock: { mode: 'countup', minutes: 3 }, exercises: [] });
  return out;
}
export { doseText };
