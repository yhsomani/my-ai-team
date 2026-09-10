/**
 * Challenge submission evaluation domain logic.
 *
 * Turns per-case local-run outcomes into a persisted submission result:
 * a 0-100 score, a pass flag (all runnable visible sample cases matched),
 * and a human-readable feedback line. Pure and unit-testable; the caller
 * owns running the cases (local worker or sandbox) and supplies outcomes.
 */

export interface SampleCaseOutcome {
  passed: boolean;
  errored: boolean;
}

export interface SubmissionEvaluation {
  score: number;
  passedTests: boolean;
  feedback: string;
  evaluatedCount: number;
}

export function evaluateSampleCases(
  runnableCaseCount: number,
  outcomes: SampleCaseOutcome[],
): SubmissionEvaluation {
  const evaluatedCount = Math.min(runnableCaseCount, outcomes.length);
  const passedCount = outcomes.filter((outcome) => outcome.passed && !outcome.errored).length;
  const score = evaluatedCount > 0 ? Math.round((passedCount / evaluatedCount) * 100) : 0;
  const passedTests = evaluatedCount > 0 && passedCount === evaluatedCount;
  const label = evaluatedCount === 1 ? 'visible sample case' : 'visible sample cases';

  const feedback = evaluatedCount === 0
    ? 'No runnable visible sample cases to verify.'
    : passedTests
      ? `All ${evaluatedCount} ${label} matched.`
      : `${passedCount}/${evaluatedCount} ${label} matched.`;

  return { score, passedTests, feedback, evaluatedCount };
}
