import { describe, expect, it } from 'vitest';
import {
  buildCandidateActivationTasks,
  buildRecruiterActivationTasks,
  calculateActivationProgress,
  type CandidateActivationSignals,
  type RecruiterActivationSignals,
} from './activationChecklist';

describe('activationChecklist (R-02)', () => {
  describe('buildCandidateActivationTasks', () => {
    it('creates staged tasks reflecting candidate signals accurately', () => {
      const initialSignals: CandidateActivationSignals = {
        hasProfileDetails: false,
        skillCount: 0,
        savedSearchCount: 0,
        applicationCount: 0,
        enrollmentCount: 0,
        challengeSubmissionCount: 0,
      };

      const tasks = buildCandidateActivationTasks(initialSignals);
      expect(tasks).toHaveLength(6);
      expect(tasks.every((t) => !t.complete)).toBe(true);

      const progress = calculateActivationProgress(tasks, 'talent');
      expect(progress.percent).toBe(0);
      expect(progress.currentStage).toBe('foundation');
      expect(progress.isAllComplete).toBe(false);
      expect(progress.nextRecommendedTask?.id).toBe('talent_profile_basics');
    });

    it('advances through stages as candidate signals complete', () => {
      const stage1DoneSignals: CandidateActivationSignals = {
        hasProfileDetails: true,
        skillCount: 4,
        savedSearchCount: 0,
        applicationCount: 0,
        enrollmentCount: 0,
        challengeSubmissionCount: 0,
      };

      const tasks = buildCandidateActivationTasks(stage1DoneSignals);
      const progress = calculateActivationProgress(tasks, 'talent');

      expect(progress.stages[0].isComplete).toBe(true);
      expect(progress.currentStage).toBe('skill_proof');
      expect(progress.completedTasks).toBe(2);
      expect(progress.percent).toBe(33);
      expect(progress.nextRecommendedTask?.stage).toBe('skill_proof');
    });

    it('recognizes 100% completion when all tasks are fulfilled', () => {
      const allDoneSignals: CandidateActivationSignals = {
        hasProfileDetails: true,
        skillCount: 5,
        savedSearchCount: 2,
        applicationCount: 3,
        enrollmentCount: 1,
        challengeSubmissionCount: 2,
      };

      const tasks = buildCandidateActivationTasks(allDoneSignals);
      const progress = calculateActivationProgress(tasks, 'talent');

      expect(progress.percent).toBe(100);
      expect(progress.isAllComplete).toBe(true);
      expect(progress.nextRecommendedTask).toBeNull();
      expect(progress.stages.every((s) => s.isComplete)).toBe(true);
    });
  });

  describe('buildRecruiterActivationTasks', () => {
    it('creates staged tasks reflecting recruiter signals', () => {
      const recruiterSignals: RecruiterActivationSignals = {
        companyCount: 1,
        activeJobs: 2,
        totalApplications: 5,
        hasRecentApplications: true,
      };

      const tasks = buildRecruiterActivationTasks(recruiterSignals);
      expect(tasks).toHaveLength(4);

      const progress = calculateActivationProgress(tasks, 'recruiter');
      expect(progress.percent).toBe(100);
      expect(progress.isAllComplete).toBe(true);
      expect(progress.stages[0].isComplete).toBe(true);
      expect(progress.stages[1].isComplete).toBe(true);
      expect(progress.stages[2].isComplete).toBe(true);
    });

    it('identifies incomplete recruiter stages and sets next recommended task', () => {
      const newRecruiterSignals: RecruiterActivationSignals = {
        companyCount: 0,
        activeJobs: 0,
        totalApplications: 0,
        hasRecentApplications: false,
      };

      const tasks = buildRecruiterActivationTasks(newRecruiterSignals);
      const progress = calculateActivationProgress(tasks, 'recruiter');

      expect(progress.percent).toBe(0);
      expect(progress.currentStage).toBe('foundation');
      expect(progress.nextRecommendedTask?.id).toBe('recruiter_company_profile');
    });
  });
});
