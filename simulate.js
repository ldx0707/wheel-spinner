/**
 * Standalone simulation of the wheel spinner's random selection.
 * Uses the EXACT same algorithm as src/utils/random.ts
 */

// ---- Copy of the production random.ts - DO NOT MODIFY ----
function mulberry32(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let seedBase = Date.now();
let seedCounter = 0;

function nextSeed() {
  seedCounter++;
  return seedBase + seedCounter;
}

const BOOST_FACTOR = 0.03;
const MAX_BOOST = 1.0;

function selectWeighted(options) {
  const withEffective = options.map((opt) => ({
    ...opt,
    effectiveWeight:
      opt.weight * (1 + Math.min((opt.boost || 0) * BOOST_FACTOR, MAX_BOOST)),
  }));

  const totalWeight = withEffective.reduce((s, o) => s + o.effectiveWeight, 0);
  const rand = mulberry32(nextSeed())() * totalWeight;

  let accumulated = 0;
  let selectedId = withEffective[0].id;
  for (const opt of withEffective) {
    accumulated += opt.effectiveWeight;
    if (rand <= accumulated) {
      selectedId = opt.id;
      break;
    }
  }

  const updatedOptions = options.map((opt) => ({
    ...opt,
    boost: opt.id === selectedId ? 0 : (opt.boost || 0) + 1,
  }));

  return { selectedId, updatedOptions };
}

// ---- Simulation ----

function runSim(label, weights, numSpins, useBoost) {
  let options = weights.map((w, i) => ({
    id: String.fromCharCode(65 + i),
    name: String.fromCharCode(65 + i),
    weight: w,
    boost: 0,
  }));

  const counts = {};
  options.forEach((o) => (counts[o.id] = 0));

  const history = [];

  for (let s = 0; s < numSpins; s++) {
    if (!useBoost) {
      options.forEach((o) => (o.boost = 0));
    }

    const { selectedId, updatedOptions } = selectWeighted(options);
    counts[selectedId]++;
    history.push(selectedId);
    
    if (useBoost) {
      options = updatedOptions;
    }
  }

  const totalWeight = weights.reduce((s, w) => s + w, 0);
  
  console.log(`
=== ${label} ===`);
  console.log(`Spins: ${numSpins}, Boost: ${useBoost ? 'ON' : 'OFF'}`);
  console.log('-' + '-'.repeat(50));
  
  let header = 'Option'.padEnd(10) + 'Weight'.padEnd(10) + 'Expected%'.padEnd(10) + 'Actual%'.padEnd(10) + 'Count'.padEnd(10) + 'Diff';
  console.log(header);
  console.log('-'.repeat(60));
  
  weights.forEach((w, i) => {
    const id = String.fromCharCode(65 + i);
    const expectedPct = (w / totalWeight * 100).toFixed(1);
    const actualPct = (counts[id] / numSpins * 100).toFixed(1);
    const diff = (counts[id] / numSpins * 100 - w / totalWeight * 100).toFixed(2);
    const mark = Math.abs(parseFloat(diff)) > 2 ? ' <--' : '';
    console.log(
      id.padEnd(10) +
      String(w).padEnd(10) +
      (expectedPct + '%').padEnd(10) +
      (actualPct + '%').padEnd(10) +
      String(counts[id]).padEnd(10) +
      (diff > 0 ? '+' : '') + diff + '%' + mark
    );
  });

  // Consecutive same check
  let consecSame = 0;
  for (let i = 1; i < history.length; i++) {
    if (history[i] === history[i - 1]) consecSame++;
  }
  console.log(`\nConsecutive duplicates: ${consecSame} / ${numSpins - 1} (${(consecSame / (numSpins - 1) * 100).toFixed(1)}%)`);

  // Streak analysis
  let maxStreak = 0, currentStreak = 0, maxStreakId = '';
  let longestGap = {};
  weights.forEach((_, i) => {
    const id = String.fromCharCode(65 + i);
    let lastSeen = -1;
    let maxGap = 0;
    for (let j = 0; j < history.length; j++) {
      if (history[j] === id) {
        if (lastSeen >= 0) maxGap = Math.max(maxGap, j - lastSeen);
        lastSeen = j;
      }
    }
    longestGap[id] = maxGap;
  });
  for (let i = 1; i < history.length; i++) {
    if (history[i] === history[i - 1]) {
      currentStreak++;
      if (currentStreak > maxStreak) {
        maxStreak = currentStreak;
        maxStreakId = history[i];
      }
    } else {
      currentStreak = 0;
    }
  }
  console.log(`Max consecutive same (streak-1): ${maxStreak} of '${maxStreakId}'`);
  console.log('Longest gap between selections:', JSON.stringify(longestGap));
}

// ---- Run ----

// Exact 11-spin test (user's scenario: weights 25, 30, 10)
console.log('\n========== 11-SPIN TEST (matching user scenario) ==========\n');
for (let trial = 1; trial <= 5; trial++) {
  let options = [
    { id: 'A', name: 'A(25)', weight: 25, boost: 0 },
    { id: 'B', name: 'B(30)', weight: 30, boost: 0 },
    { id: 'C', name: 'C(10)', weight: 10, boost: 0 },
  ];
  const res = [];
  for (let s = 0; s < 11; s++) {
    const { selectedId, updatedOptions } = selectWeighted(options);
    res.push(selectedId);
    options = updatedOptions;
  }
  console.log(`Trial ${trial}: ${res.join(' ')} | counts: A=${res.filter(x=>x==='A').length} B=${res.filter(x=>x==='B').length} C=${res.filter(x=>x==='C').length}`);
}

// User's actual: A=5, B=1, C=3 (wait, user said weight 25=5x, 30=1x, 10=3x)
// But which ID is which? Let me just run big simulations.

// Large-scale with boost OFF (pure probability)
runSim('Large scale (boost OFF)', [25, 30, 10], 100000, false);
runSim('Large scale (boost ON)', [25, 30, 10], 100000, true);

// Smaller sample that matches user experience
runSim('Small sample (boost ON)', [25, 30, 10], 100, true);
runSim('Small sample (boost ON)', [25, 30, 10], 100, true);
runSim('Small sample (boost ON)', [25, 30, 10], 100, true);

// Check PRNG quality: distribution of 1M raw values
console.log('\n========== PRNG Quality Check ==========\n');
let seedBase2 = Date.now();
let seedCounter2 = 0;
const buckets = new Array(10).fill(0);
for (let i = 0; i < 1000000; i++) {
  seedCounter2++;
  const rng = mulberry32(seedBase2 + seedCounter2);
  const val = rng();
  buckets[Math.floor(val * 10)]++;
}
console.log('1M values in 10 buckets:');
buckets.forEach((c, i) => {
  const bar = '#'.repeat(Math.round(c / 10000));
  console.log(`  [${(i/10).toFixed(1)}-${((i+1)/10).toFixed(1)}): ${String(c).padStart(6)} ${bar}`);
});
const avg = 100000;
const maxDev = Math.max(...buckets.map(b => Math.abs(b - avg)));
console.log(`Max deviation from expected (${avg}): ${maxDev} (${(maxDev/avg*100).toFixed(2)}%)`);
