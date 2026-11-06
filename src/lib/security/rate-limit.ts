/**
 * Sliding-window failure counter for sign-in attempts.
 *
 * This is a best-effort brake that lives in one server instance's memory: it
 * slows a guessing script down and costs nothing to run, but it is not shared
 * between instances and resets on restart. Supabase Auth applies its own rate
 * limits on top. Counting failures (not attempts) means a real user who signs
 * in correctly is never locked out by their own successes.
 */
export interface LimitRule {
  max: number;
  windowMs: number;
}

export interface LimitState {
  blocked: boolean;
  /** Whole seconds until the oldest counted failure expires. */
  retryAfterSec: number;
}

export class FailureLimiter {
  private hits = new Map<string, number[]>();

  constructor(private readonly rule: LimitRule, private readonly maxKeys = 5000) {}

  private fresh(key: string, now: number): number[] {
    const list = (this.hits.get(key) ?? []).filter((t) => now - t < this.rule.windowMs);
    if (list.length) this.hits.set(key, list);
    else this.hits.delete(key);
    return list;
  }

  check(key: string, now = Date.now()): LimitState {
    const list = this.fresh(key, now);
    if (list.length < this.rule.max) return { blocked: false, retryAfterSec: 0 };
    return { blocked: true, retryAfterSec: Math.ceil((list[0] + this.rule.windowMs - now) / 1000) };
  }

  fail(key: string, now = Date.now()): void {
    if (this.hits.size >= this.maxKeys) {
      for (const k of this.hits.keys()) this.fresh(k, now);
      if (this.hits.size >= this.maxKeys) this.hits.delete(this.hits.keys().next().value as string);
    }
    this.hits.set(key, [...this.fresh(key, now), now]);
  }

  clear(key: string): void {
    this.hits.delete(key);
  }
}
