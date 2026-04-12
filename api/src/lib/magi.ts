/**
 * Magi — consensus runner for non-deterministic async functions.
 *
 * Runs a function `trials` times and returns the value that appears at least
 * `requiredAgreements` times. If multiple values meet the threshold, the one
 * with the most occurrences wins. Throws if no consensus is reached.
 */

export type MagiValue = boolean | number | string;

export class MagiError extends Error {
  constructor(
    public readonly trials: number,
    public readonly requiredAgreements: number,
    public readonly tally: Map<MagiValue, number>,
  ) {
    const entries = [...tally.entries()]
      .map(([v, n]) => `${JSON.stringify(v)}: ${n}`)
      .join(', ');
    super(
      `Magi: no consensus after ${trials} trials (needed ${requiredAgreements}). Tally: { ${entries} }`,
    );
    this.name = 'MagiError';
  }
}

/**
 * Run `fn` up to `trials` times and return the first value that accumulates
 * `requiredAgreements` matching results. Stops early once the threshold is met.
 *
 * If no value reaches the threshold, throws `MagiError`.
 */
export async function magi<T extends MagiValue>(
  fn: () => Promise<T>,
  requiredAgreements: number,
  trials: number,
): Promise<T> {
  if (requiredAgreements < 1) throw new RangeError('requiredAgreements must be ≥ 1');
  if (trials < requiredAgreements) throw new RangeError('trials must be ≥ requiredAgreements');

  const tally = new Map<MagiValue, number>();

  for (let i = 0; i < trials; i++) {
    const result = await fn();
    const count = (tally.get(result) ?? 0) + 1;
    tally.set(result, count);

    // Early exit: no remaining trials can catch up to this value
    if (count >= requiredAgreements) {
      const remaining = trials - i - 1;
      const canCatchUp = ([...tally.entries()] as [MagiValue, number][]).some(
        ([v, n]) => v !== result && n + remaining >= count,
      );
      if (!canCatchUp) return result as T;
    }
  }

  // All trials exhausted — find the winner, if any
  let bestValue: MagiValue | undefined;
  let bestCount = 0;

  for (const [value, count] of tally) {
    if (count >= requiredAgreements && count > bestCount) {
      bestValue = value;
      bestCount = count;
    }
  }

  if (bestValue === undefined) throw new MagiError(trials, requiredAgreements, tally);

  return bestValue as T;
}

/**
 * Reusable service with preset `requiredAgreements` and `trials` defaults.
 *
 * ```ts
 * const magiService = new MagiService({ trials: 5, requiredAgreements: 3 });
 * const result = await magiService.run(() => classify(text));
 * ```
 */
export class MagiService {
  constructor(
    private readonly defaults: {
      trials: number;
      requiredAgreements: number;
    },
  ) {}

  run<T extends MagiValue>(
    fn: () => Promise<T>,
    overrides?: { trials?: number; requiredAgreements?: number },
  ): Promise<T> {
    return magi(
      fn,
      overrides?.requiredAgreements ?? this.defaults.requiredAgreements,
      overrides?.trials ?? this.defaults.trials,
    );
  }
}
