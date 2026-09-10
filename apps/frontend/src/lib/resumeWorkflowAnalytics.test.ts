import { beforeEach, describe, expect, it, vi } from 'vitest';
import { productAnalytics } from './productAnalytics';
import { recordResumeWorkflowAnalytics } from './resumeWorkflowAnalytics';

vi.mock('./productAnalytics', () => ({
  productAnalytics: {
    trackEvent: vi.fn(),
  },
}));

describe('resumeWorkflowAnalytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('records resume load completion with bounded counts', () => {
    recordResumeWorkflowAnalytics({
      userId: 'user-1',
      action: 'resume_loaded',
      profileSkillCount: 6,
      experienceCount: 2,
      educationCount: 1,
      exportHistoryCount: 3,
    });

    expect(productAnalytics.trackEvent).toHaveBeenCalledWith({
      userId: 'user-1',
      area: 'resume',
      eventName: 'task_completed',
      source: 'resume_builder',
      objectType: 'resume',
      objectId: undefined,
      metadata: {
        action: 'resume_loaded',
        entryPoint: undefined,
        tabId: undefined,
        sourceType: undefined,
        fieldKeys: undefined,
        fieldCount: undefined,
        selectedFieldCount: undefined,
        detectedFieldCount: undefined,
        detectedSkillCount: undefined,
        selectedSkillCount: undefined,
        savedSkillCount: undefined,
        failedSkillCount: undefined,
        detectedExperienceCount: undefined,
        selectedExperienceCount: undefined,
        savedExperienceCount: undefined,
        failedExperienceCount: undefined,
        detectedEducationCount: undefined,
        selectedEducationCount: undefined,
        savedEducationCount: undefined,
        failedEducationCount: undefined,
        aiFieldCount: undefined,
        profileSkillCount: 6,
        experienceCount: 2,
        educationCount: 1,
        exportHistoryCount: 3,
        artifactCount: undefined,
        exportMethod: undefined,
        exportStatus: undefined,
        persistedTo: undefined,
        inputLengthBand: undefined,
        fileType: undefined,
        unsupportedFileType: undefined,
        errorCategory: undefined,
        userControl: 'observed',
        mutationScope: 'resume_workflow',
      },
    });
  });

  it('records import analysis without resume text or file name', () => {
    recordResumeWorkflowAnalytics({
      action: 'resume_import_analyzed',
      sourceType: 'manual_import',
      inputLength: 2800,
      fieldKeys: ['headline', 'summary'],
      detectedFieldCount: 2,
      detectedSkillCount: 4,
    });

    expect(productAnalytics.trackEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventName: 'task_completed',
      objectType: 'resume_import',
      metadata: expect.objectContaining({
        action: 'resume_import_analyzed',
        sourceType: 'manual_import',
        inputLengthBand: 'medium',
        fieldKeys: ['headline', 'summary'],
        detectedFieldCount: 2,
        detectedSkillCount: 4,
      }),
    }));
    expect(productAnalytics.trackEvent).not.toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({
        resumeText: expect.anything(),
        importText: expect.anything(),
        fileName: expect.anything(),
      }),
    }));
  });

  it('records DOCX import file load with a bounded file type', () => {
    recordResumeWorkflowAnalytics({
      action: 'resume_import_file_loaded',
      sourceType: 'file_import',
      fileType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      inputLength: 1800,
    });

    expect(productAnalytics.trackEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventName: 'preference_updated',
      objectType: 'resume_import',
      metadata: expect.objectContaining({
        action: 'resume_import_file_loaded',
        sourceType: 'file_import',
        fileType: 'docx',
        inputLengthBand: 'medium',
      }),
    }));
    expect(productAnalytics.trackEvent).not.toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({
        fileName: expect.anything(),
        resumeText: expect.anything(),
      }),
    }));
  });

  it('records PDF import file load without file names or extracted text', () => {
    recordResumeWorkflowAnalytics({
      action: 'resume_import_file_loaded',
      sourceType: 'file_import',
      fileType: 'application/pdf',
      inputLength: 2600,
    });

    expect(productAnalytics.trackEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventName: 'preference_updated',
      objectType: 'resume_import',
      metadata: expect.objectContaining({
        action: 'resume_import_file_loaded',
        sourceType: 'file_import',
        fileType: 'pdf',
        inputLengthBand: 'medium',
      }),
    }));
    expect(productAnalytics.trackEvent).not.toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({
        fileName: expect.anything(),
        extractedText: expect.anything(),
        resumeText: expect.anything(),
      }),
    }));
  });

  it('records AI draft application without proposed field values', () => {
    recordResumeWorkflowAnalytics({
      action: 'resume_import_draft_applied',
      sourceType: 'ai_draft',
      fieldKeys: ['headline', 'summary'],
      selectedFieldCount: 2,
      aiFieldCount: 3,
    });

    expect(productAnalytics.trackEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventName: 'workflow_prefill_used',
      objectType: 'resume_import',
      objectId: 'ai_draft',
      metadata: expect.objectContaining({
        action: 'resume_import_draft_applied',
        sourceType: 'ai_draft',
        selectedFieldCount: 2,
        aiFieldCount: 3,
      }),
    }));
    expect(productAnalytics.trackEvent).not.toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({
        headline: expect.anything(),
        summary: expect.anything(),
        phone: expect.anything(),
        website: expect.anything(),
      }),
    }));
  });

  it('records detected skill saves without skill names', () => {
    recordResumeWorkflowAnalytics({
      action: 'resume_import_skills_partial',
      selectedSkillCount: 4,
      savedSkillCount: 2,
      failedSkillCount: 2,
    });

    expect(productAnalytics.trackEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventName: 'task_failed',
      objectType: 'resume_profile_skills',
      metadata: expect.objectContaining({
        action: 'resume_import_skills_partial',
        selectedSkillCount: 4,
        savedSkillCount: 2,
        failedSkillCount: 2,
      }),
    }));
    expect(productAnalytics.trackEvent).not.toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({
        skills: expect.anything(),
        skillNames: expect.anything(),
      }),
    }));
  });

  it('records detected profile row saves without row contents', () => {
    recordResumeWorkflowAnalytics({
      action: 'resume_import_rows_saved',
      detectedExperienceCount: 2,
      selectedExperienceCount: 1,
      savedExperienceCount: 1,
      failedExperienceCount: 0,
      detectedEducationCount: 1,
      selectedEducationCount: 1,
      savedEducationCount: 1,
      failedEducationCount: 0,
    });

    expect(productAnalytics.trackEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventName: 'task_completed',
      objectType: 'resume_profile_rows',
      metadata: expect.objectContaining({
        action: 'resume_import_rows_saved',
        detectedExperienceCount: 2,
        selectedExperienceCount: 1,
        savedExperienceCount: 1,
        failedExperienceCount: 0,
        detectedEducationCount: 1,
        selectedEducationCount: 1,
        savedEducationCount: 1,
        failedEducationCount: 0,
        userControl: 'explicit',
      }),
    }));
    expect(productAnalytics.trackEvent).not.toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({
        title: expect.anything(),
        company: expect.anything(),
        institution: expect.anything(),
        description: expect.anything(),
      }),
    }));
  });

  it('records exports without artifact contents or file names', () => {
    recordResumeWorkflowAnalytics({
      action: 'resume_export_completed',
      exportMethod: 'html-download',
      exportStatus: 'ready',
      persistedTo: 'local',
    });
    recordResumeWorkflowAnalytics({
      action: 'resume_export_completed',
      exportMethod: 'native-pdf',
      exportStatus: 'ready',
      persistedTo: 'local',
    });
    recordResumeWorkflowAnalytics({
      action: 'resume_export_completed',
      exportMethod: 'provider-pdf',
      exportStatus: 'ready',
      persistedTo: 'server',
    });

    expect(productAnalytics.trackEvent).toHaveBeenNthCalledWith(1, expect.objectContaining({
      eventName: 'task_completed',
      objectType: 'resume_export',
      objectId: 'html-download',
      metadata: expect.objectContaining({
        action: 'resume_export_completed',
        exportMethod: 'html-download',
        exportStatus: 'ready',
        persistedTo: 'local',
      }),
    }));
    expect(productAnalytics.trackEvent).toHaveBeenNthCalledWith(2, expect.objectContaining({
      eventName: 'task_completed',
      objectType: 'resume_export',
      objectId: 'native-pdf',
      metadata: expect.objectContaining({
        action: 'resume_export_completed',
        exportMethod: 'native-pdf',
        exportStatus: 'ready',
        persistedTo: 'local',
      }),
    }));
    expect(productAnalytics.trackEvent).toHaveBeenNthCalledWith(3, expect.objectContaining({
      eventName: 'task_completed',
      objectType: 'resume_export',
      objectId: 'provider-pdf',
      metadata: expect.objectContaining({
        action: 'resume_export_completed',
        exportMethod: 'provider-pdf',
        exportStatus: 'ready',
        persistedTo: 'server',
      }),
    }));
    expect(productAnalytics.trackEvent).not.toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({
        fileName: expect.anything(),
        html: expect.anything(),
        pdf: expect.anything(),
        url: expect.anything(),
        fileUrl: expect.anything(),
        artifact: expect.anything(),
      }),
    }));
  });

  it('records artifact lifecycle controls without artifact URLs or filenames', () => {
    recordResumeWorkflowAnalytics({
      action: 'resume_artifact_library_loaded',
      artifactCount: 2,
      persistedTo: 'server',
    });
    recordResumeWorkflowAnalytics({
      action: 'resume_artifact_library_load_failed',
      artifactCount: 2,
      persistedTo: 'local',
      errorCategory: 'artifact_library_load_failed',
    });
    recordResumeWorkflowAnalytics({
      action: 'resume_artifact_sync_failed',
      artifactCount: 2,
      persistedTo: 'local',
      errorCategory: 'artifact_sync_failed',
    });
    recordResumeWorkflowAnalytics({
      action: 'resume_artifact_link_copied',
      artifactCount: 2,
      exportMethod: 'provider-pdf',
      persistedTo: 'local',
    });
    recordResumeWorkflowAnalytics({
      action: 'resume_artifact_link_copy_failed',
      artifactCount: 2,
      exportMethod: 'provider-pdf',
      persistedTo: 'local',
      errorCategory: 'provider_pdf_link_copy_failed',
    });
    recordResumeWorkflowAnalytics({
      action: 'resume_artifact_delete_review_opened',
      artifactCount: 2,
      exportMethod: 'provider-pdf',
      persistedTo: 'server',
    });
    recordResumeWorkflowAnalytics({
      action: 'resume_artifact_delete_cancelled',
      artifactCount: 2,
      exportMethod: 'provider-pdf',
      persistedTo: 'server',
    });
    recordResumeWorkflowAnalytics({
      action: 'resume_artifact_deleted',
      artifactCount: 1,
      exportMethod: 'provider-pdf',
      persistedTo: 'server',
    });
    recordResumeWorkflowAnalytics({
      action: 'resume_artifact_delete_failed',
      artifactCount: 1,
      exportMethod: 'provider-pdf',
      persistedTo: 'server',
      errorCategory: 'provider_pdf_delete_failed',
    });

    expect(productAnalytics.trackEvent).toHaveBeenNthCalledWith(1, expect.objectContaining({
      eventName: 'task_completed',
      objectType: 'resume_artifacts',
      metadata: expect.objectContaining({
        action: 'resume_artifact_library_loaded',
        artifactCount: 2,
        persistedTo: 'server',
        userControl: 'observed',
      }),
    }));
    expect(productAnalytics.trackEvent).toHaveBeenNthCalledWith(2, expect.objectContaining({
      eventName: 'task_failed',
      objectType: 'resume_artifacts',
      metadata: expect.objectContaining({
        action: 'resume_artifact_library_load_failed',
        artifactCount: 2,
        persistedTo: 'local',
        errorCategory: 'artifact_library_load_failed',
        userControl: 'observed',
      }),
    }));
    expect(productAnalytics.trackEvent).toHaveBeenNthCalledWith(3, expect.objectContaining({
      eventName: 'degraded_state_shown',
      objectType: 'resume_artifacts',
      metadata: expect.objectContaining({
        action: 'resume_artifact_sync_failed',
        artifactCount: 2,
        persistedTo: 'local',
        errorCategory: 'artifact_sync_failed',
        userControl: 'observed',
      }),
    }));
    expect(productAnalytics.trackEvent).toHaveBeenNthCalledWith(4, expect.objectContaining({
      eventName: 'task_completed',
      objectType: 'resume_artifacts',
      objectId: 'provider-pdf',
      metadata: expect.objectContaining({
        action: 'resume_artifact_link_copied',
        artifactCount: 2,
        persistedTo: 'local',
        userControl: 'explicit',
      }),
    }));
    expect(productAnalytics.trackEvent).toHaveBeenNthCalledWith(5, expect.objectContaining({
      eventName: 'task_failed',
      objectType: 'resume_artifacts',
      objectId: 'provider-pdf',
      metadata: expect.objectContaining({
        action: 'resume_artifact_link_copy_failed',
        artifactCount: 2,
        errorCategory: 'provider_pdf_link_copy_failed',
      }),
    }));
    expect(productAnalytics.trackEvent).toHaveBeenNthCalledWith(6, expect.objectContaining({
      eventName: 'task_started',
      objectType: 'resume_artifacts',
      objectId: 'provider-pdf',
      metadata: expect.objectContaining({
        action: 'resume_artifact_delete_review_opened',
        artifactCount: 2,
        persistedTo: 'server',
        userControl: 'explicit',
      }),
    }));
    expect(productAnalytics.trackEvent).toHaveBeenNthCalledWith(7, expect.objectContaining({
      eventName: 'task_abandoned',
      objectType: 'resume_artifacts',
      objectId: 'provider-pdf',
      metadata: expect.objectContaining({
        action: 'resume_artifact_delete_cancelled',
        artifactCount: 2,
        persistedTo: 'server',
        userControl: 'explicit',
      }),
    }));
    expect(productAnalytics.trackEvent).toHaveBeenNthCalledWith(8, expect.objectContaining({
      eventName: 'task_completed',
      objectType: 'resume_artifacts',
      objectId: 'provider-pdf',
      metadata: expect.objectContaining({
        action: 'resume_artifact_deleted',
        artifactCount: 1,
        persistedTo: 'server',
        userControl: 'explicit',
      }),
    }));
    expect(productAnalytics.trackEvent).toHaveBeenNthCalledWith(9, expect.objectContaining({
      eventName: 'task_failed',
      objectType: 'resume_artifacts',
      objectId: 'provider-pdf',
      metadata: expect.objectContaining({
        action: 'resume_artifact_delete_failed',
        artifactCount: 1,
        errorCategory: 'provider_pdf_delete_failed',
      }),
    }));
    expect(productAnalytics.trackEvent).not.toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({
        fileName: expect.anything(),
        url: expect.anything(),
        fileUrl: expect.anything(),
        artifactUrl: expect.anything(),
      }),
    }));
  });
});
