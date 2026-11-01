// One-time seed generator: writes editable JSON files to src/data. Edit the JSON afterwards, not this script.
import fs from 'fs';
const out = (f, d) => fs.writeFileSync(`src/data/${f}`, JSON.stringify(d, null, 2) + '\n');
// [name, hold, stance, plane, level, flags, dose, cue]  flags: b=ballistic o=overhead h=handles needed
const L = {
 squat: ['squat', [
  ['Sandbag Box Squat','bear_hug','supported','sagittal',1,'','reps','Sit back to the box, keep the bag tight to your ribs, stand tall.'],
  ['Bear Hug Squat','bear_hug','bilateral','sagittal',1,'','reps','Hug the bag high, elbows in, sit between your heels.'],
  ['Front-Loaded Squat','front_rack','bilateral','sagittal',2,'','reps','Bag rests on forearms, chest proud, knees track toes.'],
  ['Zercher Squat','zercher','bilateral','sagittal',2,'','reps','Bag in elbow crooks, pull it into you, brace hard.'],
  ['Pause Zercher Squat','zercher','bilateral','sagittal',3,'','reps','Hold the bottom two seconds without losing tension.'],
  ['Shoulder Squat','shoulder','bilateral','frontal',3,'','reps','Bag on one shoulder, stay square, do both sides.'],
  ['Cossack Squat (Bear Hug)','bear_hug','lateral','frontal',3,'','reps','Shift to one side, opposite leg long, heel down.'],
  ['Overhead Squat','overhead','bilateral','sagittal',4,'o','reps','Pull the bag apart overhead, ribs down, slow descent.'],
 ]],
 squat_alt: ['squat', [
  ['Goblet Sandbag Squat','vertical_hug','bilateral','sagittal',1,'','reps','Stand the bag on end and hug it like a goblet.'],
  ['Squat to Press-Out','front_rack','bilateral','sagittal',2,'','reps','At the bottom push the bag forward, pull back, stand.'],
  ['Offset Squat','offset','bilateral','frontal',3,'','reps','Bag on one side of the rack; resist leaning.'],
 ]],
 hinge: ['hinge', [
  ['Sandbag Deadlift','handles','bilateral','sagittal',1,'h','reps','Hips back, flat back, push the floor away.'],
  ['Romanian Deadlift','handles','bilateral','sagittal',2,'h','reps','Soft knees, slide the bag down your thighs, feel the hamstrings.'],
  ['Staggered RDL','handles','staggered','sagittal',2,'h','reps','Back foot is a kickstand; weight stays in the front leg.'],
  ['Suitcase Deadlift','suitcase','bilateral','frontal',3,'','reps','Bag at one side, stay level, stand straight up.'],
  ['Single-Leg RDL','handles','single_leg','sagittal',3,'h','reps','Reach the free leg back like a seesaw, hips square.'],
  ['Single-Leg Suitcase RDL','suitcase','single_leg','frontal',4,'','reps','Bag in the opposite hand; fight the twist.'],
 ]],
 hinge_alt: ['hinge', [
  ['Bear Hug Good Morning','bear_hug','bilateral','sagittal',2,'','reps','Hug the bag high, push hips back, keep the spine long.'],
  ['Sandbag Swing','handles','bilateral','sagittal',2,'bh','reps','Snap the hips; arms are just ropes.'],
  ['Rotational Deadlift','handles','pivot','transverse',3,'h','reps','Pivot the back foot, lift from outside one knee.'],
  ['Sandbag Hip Thrust','lap','floor','sagittal',1,'','reps','Bag on hips, drive up, squeeze glutes at the top.'],
  ['Single-Leg Hip Thrust','lap','floor','sagittal',2,'','reps','One foot planted, keep the pelvis level.'],
  ['Sandbag Glute Bridge March','lap','floor','sagittal',1,'','reps','Hold the bridge, lift one foot at a time.'],
 ]],
 lunge: ['lunge', [
  ['Bear Hug Split Squat','bear_hug','split','sagittal',1,'','reps','Stay tall, drop the back knee straight down.'],
  ['Bear Hug Reverse Lunge','bear_hug','split','sagittal',2,'','reps','Step back softly, front shin vertical.'],
  ['Front-Loaded Reverse Lunge','front_rack','split','sagittal',2,'','reps','Bag on forearms, step back, drive through front heel.'],
  ['Zercher Reverse Lunge','zercher','split','sagittal',3,'','reps','Keep the bag glued to you as you step back.'],
  ['Shoulder Reverse Lunge','shoulder','split','sagittal',3,'','reps','Bag on one shoulder, stay square, swap sides.'],
  ['Lateral Lunge (Front Load)','front_rack','lateral','frontal',3,'','reps','Step wide, sit into the hip, other leg straight.'],
  ['Rotational Lunge','handles','split','transverse',4,'h','reps','Lunge and turn the bag across the front knee.'],
 ]],
 lunge_alt: ['lunge', [
  ['Sandbag Step-Up','bear_hug','single_leg','sagittal',2,'','reps','Whole foot on the box, drive up without pushing off the back leg.'],
  ['Walking Lunge (Shoulder)','shoulder','moving','sagittal',3,'','distance','Bag on the shoulder, steady steps, switch shoulders halfway.'],
  ['Walking Lunge (Front Load)','front_rack','moving','sagittal',2,'','distance','Race-style lunge: knee kisses the floor, stand fully.'],
  ['Curtsy Lunge','bear_hug','split','frontal',2,'','reps','Step behind and across, hips stay square.'],
  ['Bulgarian Split Squat','bear_hug','single_leg','sagittal',3,'','reps','Rear foot on a bench, most of the work in the front leg.'],
  ['Skater Squat (Bear Hug)','bear_hug','single_leg','sagittal',4,'','reps','Back knee lowers toward the floor behind you, slow.'],
 ]],
 vpress: ['vpress', [
  ['Half-Kneeling Press','front_rack','half_kneeling','sagittal',2,'o','reps','Squeeze the down-side glute, press without leaning back.'],
  ['Standing Overhead Press','front_rack','bilateral','sagittal',2,'o','reps','Ribs down, press straight up, head through.'],
  ['Push Press','front_rack','bilateral','sagittal',3,'bo','reps','Small dip, drive with legs, finish with arms.'],
  ['Split-Stance Press','front_rack','split','sagittal',3,'o','reps','Stay tall in a split stance and press.'],
  ['Offset Press','offset','bilateral','frontal',3,'o','reps','One side of the bag pressed, resist the side bend.'],
  ['Sandbag Thruster','front_rack','bilateral','sagittal',3,'bo','reps','Squat and press as one motion.'],
  ['Rotational Press','front_rack','pivot','transverse',4,'o','reps','Pivot the back foot and press up and across.'],
 ]],
 vpress_alt: ['vpress', [
  ['Floor Press to Overhead Pullover','lap','floor','sagittal',1,'','reps','Lying down, press then reach the bag back slowly.'],
  ['Kneeling Around the World','bear_hug','half_kneeling','transverse',2,'o','reps','Circle the bag around your head, ribs stay down.'],
  ['Shoulder-to-Overhead','shoulder','bilateral','sagittal',4,'bo','reps','From the shoulder, drive the bag overhead and lock out.'],
 ]],
 hpress: ['hpress', [
  ['Sandbag Floor Press','lap','floor','sagittal',1,'','reps','Elbows at 45 degrees, pause when they touch the floor.'],
  ['Push-Up with Bag Drag','handles','floor','transverse',3,'h','reps','Push-up, then drag the bag under you to the other side.'],
  ['Sandbag Chest Press-Out','front_rack','bilateral','sagittal',2,'','reps','Standing, push the bag straight out and back.'],
  ['Weighted Push-Up','back','floor','sagittal',2,'','reps','Bag across the upper back, body in one line.'],
 ]],
 pull: ['pull', [
  ['Bent-Over Row','handles','bilateral','sagittal',1,'h','reps','Hinge, pull the bag to your belly, pause.'],
  ['Neutral-Grip Row','handles','staggered','sagittal',2,'h','reps','Staggered stance, elbows close.'],
  ['Single-Arm Row','suitcase','staggered','sagittal',2,'','reps','One side, pull without twisting.'],
  ['Gorilla Row','handles','bilateral','transverse',3,'h','reps','Alternate pulls while the hips stay still.'],
  ['Sandbag High Pull','handles','bilateral','sagittal',3,'bh','reps','Snap the hips, elbows high and wide.'],
  ['Sandbag Drag','handles','floor','transverse',2,'h','reps','In a plank, drag the bag across under you.'],
 ]],
 pull_alt: ['pull', [
  ['Sandbag Pullover Row','lap','floor','sagittal',1,'','reps','Lying, pull the bag over your face to your chest.'],
  ['Upright Row','handles','bilateral','sagittal',2,'h','reps','Pull to the chest, elbows lead.'],
  ['Bear Crawl Bag Drag','handles','moving','transverse',3,'h','distance','Crawl and drag the bag forward one hand at a time.'],
  ['Sandbag Rear-Delt Fly Pull','handles','bilateral','frontal',2,'h','reps','Hinge, pull the handles apart and up.'],
  ['Sled-Style Backward Drag','handles','moving','sagittal',2,'h','distance','Lean back and walk backward dragging the bag.'],
 ]],
 carry: ['carry', [
  ['Bear Hug Carry','bear_hug','moving','sagittal',1,'','distance','Hug tight, short quick steps, breathe behind the brace.'],
  ['Front-Loaded Carry','front_rack','moving','sagittal',2,'','distance','Forearms under the bag, walk tall.'],
  ['Zercher Carry','zercher','moving','sagittal',2,'','distance','Elbows bent and tight, do not let the bag sag.'],
  ['Suitcase Carry','suitcase','moving','frontal',2,'','distance','Bag at one side, stay perfectly level.'],
  ['Shoulder Carry','shoulder','moving','frontal',3,'','distance','Switch shoulders halfway.'],
  ['Overhead Carry','overhead','moving','sagittal',4,'o','distance','Lock the arms, ribs down, slow steps.'],
 ]],
 carry_alt: ['carry', [
  ['Farmer Carry (Handles)','handles','moving','sagittal',1,'h','distance','Grip the handles, shoulders down, walk.'],
  ['Offset Carry','offset','moving','frontal',3,'','distance','Bag on one side of the chest, resist leaning.'],
  ['Bag Drag Walk','handles','moving','sagittal',1,'h','distance','Drag the bag behind you at a steady walk.'],
  ['Sandbag Run Carry','bear_hug','moving','sagittal',3,'','distance','Jog with the bag hugged high.'],
 ]],
 shoulder: ['shoulder', [
  ['Bag Lap and Stand','lap','bilateral','sagittal',1,'','reps','Roll the bag to your lap, then stand with it hugged.'],
  ['Ground to Shoulder','shoulder','bilateral','sagittal',2,'b','reps','Lap it, then pop it to one shoulder; alternate sides.'],
  ['Half-Kneeling Shoulder','shoulder','half_kneeling','sagittal',2,'b','reps','From kneeling, lift the bag to the shoulder.'],
  ['Shoulder and Squat','shoulder','bilateral','sagittal',3,'b','reps','Shoulder the bag, then squat once before dropping.'],
  ['Rotational Shoulder','shoulder','pivot','transverse',3,'b','reps','Lift from outside one foot to the opposite shoulder.'],
  ['Over-the-Shoulder Toss','shoulder','bilateral','transverse',3,'b','reps','Lift and throw the bag over one shoulder behind you.'],
 ]],
 power: ['power', [
  ['Sandbag Clean','front_rack','bilateral','sagittal',2,'b','reps','Explode the hips, catch it on your forearms.'],
  ['Hang Clean','front_rack','bilateral','sagittal',2,'b','reps','Start from the thighs, snap up, quick elbows.'],
  ['Clean and Press','front_rack','bilateral','sagittal',3,'bo','reps','Clean, reset, press overhead.'],
  ['Sandbag Snatch','overhead','bilateral','sagittal',4,'bo','reps','One pull from floor to overhead, punch through.'],
  ['Forward Toss','handles','bilateral','sagittal',3,'b','reps','Swing between the legs and throw it forward; walk to it.'],
  ['Rotational Throw','handles','pivot','transverse',3,'b','reps','Load the back hip and fling the bag sideways.'],
  ['Clean to Lunge','front_rack','split','sagittal',3,'b','reps','Clean, then a reverse lunge each side.'],
  ['Squat Clean Thruster','front_rack','bilateral','sagittal',4,'bo','reps','Clean into the squat and drive into the press.'],
  ['Sandbag Burpee Over','handles','floor','sagittal',2,'b','reps','Burpee, then jump or step over the bag.'],
  ['Power Clean Drop','front_rack','bilateral','sagittal',3,'b','reps','Clean it, drop it, repeat fast but clean.'],
 ]],
 core: ['core', [
  ['Dead Bug Bag Hold','lap','floor','sagittal',1,'','reps','Arms hold the bag up, slowly lower opposite limbs.'],
  ['Plank Bag Pull-Through','handles','floor','transverse',2,'h','reps','In a plank, pull the bag side to side without twisting.'],
  ['Half-Kneeling Chop','handles','half_kneeling','transverse',2,'h','reps','Chop from high to low across your body.'],
  ['Half-Kneeling Lift','handles','half_kneeling','transverse',2,'h','reps','Lift from low to high across your body.'],
  ['Sandbag Russian Twist','bear_hug','floor','transverse',2,'','reps','Sit back, turn the bag side to side.'],
  ['Around the World','bear_hug','bilateral','transverse',2,'o','reps','Circle the bag around your head both ways.'],
  ['Sandbag Sit-Up','bear_hug','floor','sagittal',1,'','reps','Hug the bag, sit all the way up.'],
  ['Suitcase March','suitcase','single_leg','frontal',2,'','time','March in place with the bag at one side, no lean.'],
  ['Hollow Hold Bag Press','lap','floor','sagittal',3,'','time','Hollow body while holding the bag above your chest.'],
  ['Side Plank Bag Row','handles','floor','frontal',3,'h','reps','From a side plank, row the bag up and lower.'],
 ]],
 loco: ['locomotion', [
  ['Bag Over Burpee Shuttle','handles','moving','sagittal',2,'b','reps','Burpee, step over the bag, repeat.'],
  ['Bear Crawl','lap','moving','sagittal',1,'','distance','Knees hover, slow opposite hand and foot.'],
  ['Sandbag Shuttle Run','bear_hug','moving','sagittal',2,'','distance','Run to the bag, pick it up, carry it back.'],
  ['Broad Jump','lap','bilateral','sagittal',2,'b','reps','Bodyweight jump forward, land soft.'],
  ['Run','lap','moving','sagittal',1,'','distance','Easy-to-steady run; no bag.'],
  ['Ruck Walk','back','moving','sagittal',1,'','distance','Bag or ruck on your back, brisk walk.'],
  ['Farmer Shuffle','handles','moving','frontal',2,'h','distance','Side shuffle with the bag at your hips.'],
 ]],
 complex: ['complex', [
  ['Deadlift-Row-Clean Complex','handles','bilateral','sagittal',2,'bh','reps','One rep each, no rest between moves.'],
  ['Clean-Squat-Press Complex','front_rack','bilateral','sagittal',3,'bo','reps','Clean, front squat, press: that is one rep.'],
  ['Shoulder-Lunge Complex','shoulder','split','sagittal',3,'b','reps','Shoulder it, lunge each side, swap shoulders.'],
  ['Clean-Thruster-Toss Complex','front_rack','bilateral','sagittal',4,'bo','reps','Clean, thruster, then toss over the shoulder.'],
  ['Hinge-Hug-Carry Complex','bear_hug','moving','sagittal',2,'','reps','Deadlift, bear hug it, carry 10 m, set down.'],
 ]],
};
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');
const exercises = [], ladders = [];
for (const [lid, [pattern, rows]] of Object.entries(L)) {
  const ids = [];
  rows.forEach(([name,hold,stance,plane,level,flags,dose,cue]) => {
    const id = slug(name); ids.push(id);
    exercises.push({ id, name, pattern, hold, stance, plane, level, ballistic: flags.includes('b'), overhead: flags.includes('o'),
      needsHandles: flags.includes('h'), usesBag: !['run','broad_jump','bear_crawl'].includes(id), dose, cue,
      demoSearch: `sandbag ${name.toLowerCase()} demo`, ladder: lid });
  });
  ladders.push({ id: lid, pattern, rungs: ids });
}
exercises.forEach(e => { if (['run','broad_jump','bear_crawl'].includes(e.id)) e.usesBag = false; });
out('exercises.json', exercises);
out('ladders.json', ladders);
out('factors.json', {
  _note: 'ELI = (bag / bodyweight) x position x stance x plane x grip. All values are assumptions; edit freely.',
  position: { handles:1.0, lap:1.0, back:1.0, bear_hug:1.05, vertical_hug:1.05, front_rack:1.10, zercher:1.15, suitcase:1.20, offset:1.20, shoulder:1.25, overhead:1.40 },
  stance: { floor:0.90, supported:0.90, bilateral:1.0, half_kneeling:1.0, staggered:1.10, moving:1.10, split:1.15, lateral:1.20, pivot:1.20, single_leg:1.30 },
  plane: { sagittal:1.0, frontal:1.10, multi:1.15, transverse:1.20 },
  grip: { handles:1.0, no_handles:1.10 }
});
out('engine.json', { eliCapPct: 15, returnAfterDays: 14, returnVolumePct: 80, beatUpVolumeCut: 30, painExcludeDays: 14,
  weeklyHardSets: { squat:[6,10], hinge:[6,10], lunge:[4,8], vpress:[6,10], hpress:[3,6], pull:[8,12], carry:[3,6], core:[4,8], shoulder:[3,6], power:[3,6] },
  painAreas: ['shoulder','elbow','wrist/hand','neck','lower back','hip','knee','ankle/foot'],
  swapReasons: ['too heavy','too easy','no space',"don't like it",'hurts'] });
out('formats.json', [
 ['strength','Strength sets','rest','Sets with a rest timer between them.'],
 ['emom','EMOM','interval','Start the work at the top of every minute; rest what is left.'],
 ['e2mom','E2MOM / E3MOM','interval','Same as EMOM with 2 or 3 minute windows.'],
 ['amrap','AMRAP','countdown','As many rounds as possible before the clock runs out.'],
 ['fortime','For Time','countup','Finish the work as fast as you can, under a cap.'],
 ['chipper','Chipper','countup','One long list, done once, technical lifts first.'],
 ['ladder','Ladder','countup','Reps climb each round (1,2,3...).'],
 ['deathby','Death By','interval','Add one rep every minute until you cannot finish in the minute.'],
 ['tabata','Tabata','interval','8 rounds of 20 seconds on, 10 off.'],
 ['intervals','Intervals','interval','Set work and rest periods.'],
 ['complex','Complex','rest','Several moves back to back without setting the bag down.'],
 ['density','Density block','countdown','Most quality reps in a fixed window.'],
 ['carrymedley','Carry medley','countup','Several carries in a row over set distances.'],
 ['ruckhybrid','Ruck hybrid','countup','Ruck segments mixed with bag work.'],
 ['racesim','Race simulation (HYROX)','countup','Run segments alternating with stations, race order.'],
 ['benchmark','Benchmark test','countup','A repeatable test to measure progress.'],
 ['partner','Partner (Phase 2)','countup','Split the work with a partner.'],
 ['flow','Flow / warm-up','countup','Easy movement prep.'],
].map(([id,name,timer,desc]) => ({ id, name, timer, desc,
  rules: id==='tabata' ? { banPatterns:['shoulder'], banOverhead:true } : id==='amrap' ? { requireNonBallistic:true } : id==='chipper' ? { technicalFirst:true } : {} })));
out('reasons.json', {
  ANCHOR: 'Anchor lift for this block, kept the same so progress is measurable.',
  REP_LADDER: 'Last time was Hard, so the same load with one more rep on one set.',
  RUNG_UP: 'You rated it Easy or topped the range, so it moved up a rung.',
  RUNG_DOWN: 'Missed target or pain flag, so it dropped a rung.',
  BAG_UP: 'Topped the range, and a heavier bag is within the safe jump.',
  BAG_SNAP: 'Snapped to the closest bag you own.',
  CAP_HOLD: 'The next step was too big a jump, so reps carry the progress.',
  PAT_NEED: 'This pattern is behind its weekly target.',
  WEEKLY_MUST: 'Every week needs a pull, a carry and an anti-rotation move.',
  POWER_FIRST: 'Power goes first while you are fresh.',
  BEAT_UP: 'You checked in beat up, so volume is cut and ballistic moves swapped out.',
  RETURN: 'Welcome back: first session at reduced volume after time off.',
  DELOAD: 'Deload week: lighter on purpose; it does not count toward progression.',
  SHORTENED: 'Trimmed to fit your time: finisher first, never the anchor.',
  EXCLUDED: 'A move you excluded or flagged was replaced.',
  RACE_SPECIFIC: 'Race-specific work for your HYROX block.'
});
out('programs.json', [
 { id:'hybrid', name:'Hybrid / HYROX', default:true, weeks:12, daysPerWeek:4, countBackFromEvent:true,
   blocks:[ ['Base',3,[8,12],3,'Build aerobic base and positions'], ['Deload',1,[8,10],4,'Recover'], ['Build',3,[6,10],2,'More load and race density'], ['Deload',1,[8,10],4,'Recover'], ['Peak',2,[5,8],1,'Race-pace stations'], ['Taper',1,[6,8],3,'Sharp, less volume'], ['Race',1,[5,8],3,'Race week'] ].map(([name,weeks,repRange,rir,focus])=>({name,weeks,repRange,rir,focus,deload:name==='Deload'||name==='Taper'})),
   dayTemplates: [
    { name:'Strength + Lunge', slots:['warmup','power','primary:squat','pair:pull+core','carry','finisher'], finisherFormats:['emom','amrap'] },
    { name:'Race Engine', slots:['warmup','primary:lunge','pair:vpress+pull','carry','finisher'], finisherFormats:['racesim','intervals'] },
    { name:'Hinge + Pull', slots:['warmup','power','primary:hinge','pair:hpress+pull','core','finisher'], finisherFormats:['fortime','tabata'] },
    { name:'Long Conditioning', slots:['warmup','primary:lunge','pair:shoulder+core','carry','finisher'], finisherFormats:['racesim','ruckhybrid'] } ] },
 { id:'foundation', name:'Foundation', weeks:6, daysPerWeek:3,
   blocks:[ ['Learn',2,[8,12],3,'Learn the holds'], ['Build',3,[8,12],2,'Add reps and rungs'], ['Test',1,[5,8],2,'Retest benchmarks'] ].map(([name,weeks,repRange,rir,focus])=>({name,weeks,repRange,rir,focus,deload:false})),
   dayTemplates: [
    { name:'Squat + Pull', slots:['warmup','primary:squat','pair:pull+core','carry','finisher'], finisherFormats:['emom'] },
    { name:'Hinge + Press', slots:['warmup','primary:hinge','pair:hpress+pull','core','finisher'], finisherFormats:['amrap'] },
    { name:'Lunge + Carry', slots:['warmup','primary:lunge','pair:vpress+pull','carry','finisher'], finisherFormats:['fortime'] } ] }
]);
console.log(exercises.length, 'exercises', ladders.length, 'ladders');
