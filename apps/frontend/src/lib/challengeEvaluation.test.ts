import { describe, expect, it } from 'vitest';
import { evaluateSampleCases } from './challengeEvaluation';

describe('evaluateSampleCases', () => {
  it('scores a full pass at 100 with all-cases feedback', () => {
    const result = evaluateSampleCases(3, [
      { passed: true, errored: false },
      { passed: true, errored: false },
      { passed: true, errored: false },
    ]);

    expect(result.score).toBe(100);
    expect(result.passedTests).toBe(true);
    expect(result.feedback).toBe('All 3 visible sample cases matched.');
  });

  it('scores partial matches proportionally and does not pass', () => {
    const result = evaluateSampleCases(4, [
      { passed: true, errored: false },
      { passed: false, errored: false },
      { passed: true, errored: false },
      { passed: false, errored: false },
    ]);

    expect(result.score).toBe(50);
    expect(result.passedTests).toBe(false);
    expect(result.feedback).toBe('2/4 visible sample cases matched.');
  });

  it('treats errored cases as not passed', () => {
    const result = evaluateSampleCases(2, [
      { passed: false, errored: true },
      { passed: true, errored: false },
    ]);

    expect(result.score).toBe(50);
    expect(result.passedTests).toBe(false);
    expect(result.feedback).toBe('1/2 visible sample cases matched.');
  });

  it('reports zero score and no pass when nothing is runnable', () => {
    const result = evaluateSampleCases(0, []);

    expect(result.score).toBe(0);
    expect(result.passedTests).toBe(false);
    expect(result.feedback).toBe('No runnable visible sample cases to verify.');
  });
});
