import type { ClockCfg } from './types';
export const fmtClock = (s: number) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.floor(Math.max(0, s) % 60)).padStart(2, '0')}`;
export interface ClockView { big: string; sub: string; phase: string; done: boolean; resting: boolean; total: number }
/** Pure: what the timer shows for a config after `elapsed` seconds. */
export function clockView(c: ClockCfg, elapsed: number, rounds = 0): ClockView {
  const total = c.mode === 'tabata' ? (c.rounds ?? 8) * ((c.work ?? 20) + (c.rest ?? 10)) : c.minutes * 60;
  const done = c.mode !== 'countup' && elapsed >= total;
  if (c.mode === 'amrap') return { big: fmtClock(total - elapsed), sub: `AMRAP · ${rounds} round${rounds === 1 ? '' : 's'} done`, phase: done ? 'done' : 'work', done, resting: false, total };
  if (c.mode === 'fortime') return { big: fmtClock(elapsed), sub: `For time · cap ${fmtClock(total)}`, phase: done ? 'done' : 'work', done, resting: false, total };
  if (c.mode === 'countup') return { big: fmtClock(elapsed), sub: `Target about ${c.minutes} min`, phase: 'work', done: false, resting: false, total };
  if (c.mode === 'rest') return { big: fmtClock(total - elapsed), sub: done ? 'Rest over · go' : 'Rest', phase: done ? 'done' : 'rest', done, resting: !done, total };
  if (c.mode === 'emom') { const w = c.window ?? 60; const n = Math.round(total / w); const i = Math.floor(elapsed / w);
    return { big: fmtClock(w - (elapsed % w)), sub: `${w === 60 ? 'Minute' : 'Window'} ${Math.min(i + 1, n)} of ${n}`, phase: done ? 'done' : `m${i}`, done, resting: false, total }; }
  const w = c.work ?? 20, r = c.rest ?? 10, per = w + r, R = c.rounds ?? 8; const i = Math.floor(elapsed / per), into = elapsed % per; const work = into < w;
  return { big: fmtClock(work ? w - into : per - into), sub: `${work ? 'WORK' : 'Rest'} · round ${Math.min(i + 1, R)} of ${R}`, phase: done ? 'done' : `${i}${work}`, done, resting: !work && !done, total };
}
