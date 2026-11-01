import type { Block, Data, Profile, Program } from './types';
import { daysBetween } from './core';

export function getProgram(d: Data, p: Profile): Program {
  return d.programs.find(x => x.id === p.programId) ?? d.programs.find(x => x.default) ?? d.programs[0];
}

/** Which block/week today falls in. Event programs count back from the event date; early weeks repeat block 1. */
export function programPosition(prog: Program, p: Profile, date: string): { block: Block; week: number; blockIndex: number } {
  const total = prog.blocks.reduce((s, b) => s + b.weeks, 0);
  let week: number;
  if (prog.countBackFromEvent && p.eventDate) {
    const weeksOut = Math.ceil(daysBetween(date, p.eventDate) / 7);
    week = Math.max(1, total - weeksOut + 1);
  } else {
    week = Math.floor(Math.max(0, daysBetween(p.startDate, date)) / 7) % total + 1;
  }
  week = Math.min(week, total);
  let acc = 0;
  for (let i = 0; i < prog.blocks.length; i++) { acc += prog.blocks[i].weeks; if (week <= acc) return { block: prog.blocks[i], week, blockIndex: i }; }
  return { block: prog.blocks[prog.blocks.length - 1], week, blockIndex: prog.blocks.length - 1 };
}

/** Day template rotation: count sessions logged in this ISO week (Mon start) and pick the next template. */
export function weekStart(date: string) { const d = new Date(date + 'T12:00:00Z'); const dow = (d.getUTCDay() + 6) % 7; return new Date(d.getTime() - dow * 86400000).toISOString().slice(0, 10); }
