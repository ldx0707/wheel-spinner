/**
 * Mulberry32 PRNG — fast, high-quality 32-bit pseudo-random generator.
 * Seeded deterministically so results are reproducible given the same seed.
 */
function mulberry32(seed: number): () => number {
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

function nextSeed(): number {
  seedCounter++;
  return seedBase + seedCounter;
}

export interface WeightedOption {
  id: string;
  weight: number;
  boost: number;
}

export interface SelectOptions {
  /** Boost multiplier applied to missed-count: effective = weight * (1 + min(boost * factor, 1)) */
  boostFactor: number;
  /** When true, the previous result is excluded from this selection (if >1 option exists) */
  noRepeat: boolean;
  /** The id of the previously selected option (ignored if noRepeat is false) */
  lastSelectedId: string | null;
}

const DEFAULT_OPTIONS: SelectOptions = {
  boostFactor: 0.08,
  noRepeat: false,
  lastSelectedId: null,
};

/**
 * Weighted pseudo-random selection with fairness guarantees:
 * - Higher weight → higher probability
 * - Each miss adds a cumulative boost (capped at +100%), reset on selection
 * - Optional no-repeat: excludes the previous winner when enabled
 */
export function selectWeighted(
  options: WeightedOption[],
  opts: Partial<SelectOptions> = {}
): { selectedId: string; updatedOptions: WeightedOption[] } {
  const { boostFactor, noRepeat, lastSelectedId } = { ...DEFAULT_OPTIONS, ...opts };

  // Build the candidate pool — exclude last winner if noRepeat is on and there are alternatives
  let candidates = options;
  if (noRepeat && lastSelectedId && options.length > 1) {
    const alt = options.filter((o) => o.id !== lastSelectedId);
    if (alt.length > 0) candidates = alt;
  }

  const withEffective = candidates.map((opt) => ({
    ...opt,
    effectiveWeight:
      opt.weight * (1 + Math.min((opt.boost || 0) * boostFactor, 1.0)),
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

  // Boost: winner resets to 0, all others increment by 1
  const updatedOptions = options.map((opt) => ({
    ...opt,
    boost: opt.id === selectedId ? 0 : (opt.boost || 0) + 1,
  }));

  return { selectedId, updatedOptions };
}

export function reseed() {
  seedBase = Date.now();
  seedCounter = 0;
}
