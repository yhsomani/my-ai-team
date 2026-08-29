export type ResumeMatchStatusTone = 'neutral' | 'warning' | 'success';

export interface ResumeMatchStatusCopy {
  tone: ResumeMatchStatusTone;
  title: string;
  message: string;
}

interface ResumeMatchInputStatusOptions {
  jobDescription: string;
  resumeText: string;
  hasSubmitted: boolean;
}

interface ResumeMatchProgressStatusOptions {
  optimizing: boolean;
  optimized: boolean;
}

export const RESUME_MATCH_SHORT_TEXT_WARNING_CHARS = 160;
export const RESUME_MATCH_LARGE_TEXT_WARNING_CHARS = 12000;

const trimmedLength = (value: string) => value.trim().length;

export const getResumeMatchInputStatus = ({
  jobDescription,
  resumeText,
  hasSubmitted
}: ResumeMatchInputStatusOptions): ResumeMatchStatusCopy | null => {
  const jobLength = trimmedLength(jobDescription);
  const resumeLength = trimmedLength(resumeText);
  const missingJob = jobLength === 0;
  const missingResume = resumeLength === 0;

  if (hasSubmitted && missingJob && missingResume) {
    return {
      tone: 'warning',
      title: 'Comparison needs both text areas',
      message: 'Add the target job description and resume text before running the local preview.'
    };
  }

  if (hasSubmitted && missingJob) {
    return {
      tone: 'warning',
      title: 'Target job description is missing',
      message: 'Add the target job description before running the local preview.'
    };
  }

  if (hasSubmitted && missingResume) {
    return {
      tone: 'warning',
      title: 'Resume text is missing',
      message: 'Add resume text before running the local preview.'
    };
  }

  if (jobLength > RESUME_MATCH_LARGE_TEXT_WARNING_CHARS || resumeLength > RESUME_MATCH_LARGE_TEXT_WARNING_CHARS) {
    return {
      tone: 'warning',
      title: 'Large local comparison',
      message: 'Very long pasted text may take longer in this browser. The preview still uses the full text provided.'
    };
  }

  if (
    hasSubmitted &&
    (jobLength < RESUME_MATCH_SHORT_TEXT_WARNING_CHARS || resumeLength < RESUME_MATCH_SHORT_TEXT_WARNING_CHARS)
  ) {
    return {
      tone: 'warning',
      title: 'Short text may limit the preview',
      message: 'A fuller job description and resume usually produce a more useful keyword comparison.'
    };
  }

  return null;
};

export const getResumeMatchProgressStatus = ({
  optimizing,
  optimized
}: ResumeMatchProgressStatusOptions): ResumeMatchStatusCopy | null => {
  if (optimizing) {
    return {
      tone: 'neutral',
      title: 'Comparing locally',
      message: 'Keyword coverage is being calculated in this browser.'
    };
  }

  if (optimized) {
    return {
      tone: 'success',
      title: 'Local preview ready',
      message: 'Review matched and missing keyword groups before editing your resume.'
    };
  }

  return null;
};
