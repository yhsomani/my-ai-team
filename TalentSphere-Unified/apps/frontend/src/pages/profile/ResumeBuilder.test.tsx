import React from 'react';
import { configureStore } from '@reduxjs/toolkit';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../../components/shared/Toast';
import { fileUploadService } from '../../services/fileUploadService';
import { profileService } from '../../services/profileService';
import authReducer from '../../store/slices/authSlice';
import ResumeBuilder from './ResumeBuilder';

vi.mock('../../services/profileService', () => ({
  profileService: {
    getProfile: vi.fn(),
    updateProfile: vi.fn(),
    addSkill: vi.fn(),
    addExperience: vi.fn(),
    addEducation: vi.fn(),
    getResumeExportHistory: vi.fn(),
    saveResumeExportRecord: vi.fn(),
    getResumeArtifacts: vi.fn(),
    saveResumeArtifactRecord: vi.fn(),
    markResumeArtifactDeleted: vi.fn(),
  },
}));

vi.mock('../../services/fileUploadService', () => ({
  fileUploadService: {
    uploadFile: vi.fn(),
    deleteFile: vi.fn(),
  },
}));

vi.mock('../../lib/resumeWorkflowAnalytics', () => ({
  recordResumeWorkflowAnalytics: vi.fn(),
}));

vi.mock('../../lib/aiWorkflowPrefillAudit', () => ({
  recordAiWorkflowPrefillDecision: vi.fn(),
}));

const profileFixture = {
  id: 'profile-resume',
  user_id: 'resume-user',
  headline: 'Workflow Designer',
  summary: 'Builds reliable hiring documents.',
  phone: '+1 555 0142',
  location: 'Remote',
  website: 'https://resume.example',
  profiles: {
    first_name: 'Riley',
    last_name: 'Resume',
    email: 'resume-user@example.com',
  },
  skills: [
    {
      id: 'skill-design',
      name: 'Design Systems',
      proficiency: 'ADVANCED',
    },
  ],
  experiences: [],
  educations: [],
};

const uploadedArtifactFixture = {
  id: 'resume-artifact-existing',
  userId: 'resume-user',
  url: 'https://files.example/resumes/riley-resume.pdf',
  fileName: 'Riley-Resume-resume.pdf',
  uploadedAt: '2026-06-28T10:00:00.000Z',
  status: 'active',
  persistedTo: 'server',
};

const importTextFixture = [
  'Riley Resume',
  'Candidate Experience Lead',
  'Remote',
  'resume-user@example.com',
  '',
  'Summary',
  'Builds reliable hiring documents.',
  '',
  'Skills',
  'React, Design Systems',
  '',
  'Experience',
  'Resume Operations Lead at Talent Systems | Remote',
  'Jan 2022 - Present',
  'Built workflow reviews for resume teams.',
  '',
  'Education',
  'State University | MBA Product Strategy',
  'Aug 2018 - May 2020',
].join('\n');

const installMemoryLocalStorage = () => {
  const store = new Map<string, string>();
  const storage = {
    get length() {
      return store.size;
    },
    clear: vi.fn(() => {
      store.clear();
    }),
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    key: vi.fn((index: number) => Array.from(store.keys())[index] ?? null),
    removeItem: vi.fn((key: string) => {
      store.delete(key);
    }),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, String(value));
    }),
  };

  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: storage,
  });
};

const resetResumeLocalStorage = () => {
  window.localStorage.setItem('talentsphere:resume-export-history:resume-user', '[]');
  window.localStorage.setItem('talentsphere:resume-artifacts:resume-user', '[]');
  window.localStorage.setItem('talentsphere:resume-artifact-deletions:resume-user', '[]');
};

const renderResumeBuilder = () => {
  const store = configureStore({
    reducer: {
      auth: authReducer,
    },
    preloadedState: {
      auth: {
        user: {
          id: 'resume-user',
          email: 'resume-user@example.com',
          roles: ['ROLE_USER'],
        },
        session: null,
        loading: false,
      },
    },
  });

  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/resume']}>
        <ToastProvider>
          <ResumeBuilder />
        </ToastProvider>
      </MemoryRouter>
    </Provider>,
  );

  return store;
};

const expectDecorativeSvgIcons = (container: Element) => {
  const icons = Array.from(container.querySelectorAll('svg'));

  expect(icons.length).toBeGreaterThan(0);
  icons.forEach(icon => {
    expect(icon.getAttribute('aria-hidden')).toBe('true');
    expect(icon.getAttribute('focusable')).toBe('false');
  });
};

describe('ResumeBuilder', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    installMemoryLocalStorage();
    resetResumeLocalStorage();
    vi.mocked(profileService.getProfile).mockResolvedValue(profileFixture as any);
    vi.mocked(profileService.updateProfile).mockResolvedValue({} as any);
    vi.mocked(profileService.addSkill).mockImplementation(async (_userId, skill) => ({
      id: `skill-${skill.name}`,
      ...skill,
    }) as any);
    vi.mocked(profileService.addExperience).mockImplementation(async (_userId, experience) => ({
      id: `experience-${experience.title}`,
      ...experience,
    }) as any);
    vi.mocked(profileService.addEducation).mockImplementation(async (_userId, education) => ({
      id: `education-${education.institution}`,
      ...education,
    }) as any);
    vi.mocked(profileService.getResumeExportHistory).mockResolvedValue([]);
    vi.mocked(profileService.saveResumeExportRecord).mockImplementation(async record => record as any);
    vi.mocked(profileService.getResumeArtifacts).mockResolvedValue([]);
    vi.mocked(profileService.saveResumeArtifactRecord).mockImplementation(async artifact => artifact as any);
    vi.mocked(profileService.markResumeArtifactDeleted).mockResolvedValue({
      ...uploadedArtifactFixture,
      status: 'deleted',
      deletedAt: '2026-06-28T10:10:00.000Z',
    } as any);
    vi.mocked(fileUploadService.uploadFile).mockResolvedValue({
      url: uploadedArtifactFixture.url,
      folder: 'resumes',
    });
    vi.mocked(fileUploadService.deleteFile).mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('shows safe resume data load failure copy without exposing raw provider errors', async () => {
    vi.mocked(profileService.getProfile).mockRejectedValue(
      new Error('PostgREST resume profile failed with service_role_token=secret'),
    );

    renderResumeBuilder();

    await waitFor(() => {
      expect(screen.getByText('Resume data could not load')).toBeTruthy();
    });

    expect(screen.getByRole('heading', { name: 'Resume Builder' })).toBeTruthy();
    expect(screen.getByText('Resume data could not load')).toBeTruthy();
    expect(screen.getByText(/resume profile data did not respond/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Retry resume data' })).toBeTruthy();
    expect(screen.queryByText(/service_role_token/i)).toBeNull();
    expect(screen.queryByText(/PostgREST resume profile failed/i)).toBeNull();
  });

  it('retries the existing resume profile load workflow from the safe failure state', async () => {
    vi.mocked(profileService.getProfile)
      .mockRejectedValueOnce(new Error('Resume profile provider timeout with service_role_token=secret'))
      .mockResolvedValue(profileFixture as any);

    renderResumeBuilder();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Retry resume data' })).toBeTruthy();
    });

    const requestCountBeforeRetry = vi.mocked(profileService.getProfile).mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: 'Retry resume data' }));

    await waitFor(() => {
      expect(profileService.getProfile).toHaveBeenCalledTimes(requestCountBeforeRetry + 1);
    });
    await waitFor(() => {
      expect((screen.getByLabelText('Headline') as HTMLInputElement).value).toBe('Workflow Designer');
    });
    expect(screen.queryByText('Resume data could not load')).toBeNull();
    expect(screen.queryByText(/service_role_token/i)).toBeNull();
  });

  it('exposes editor fields, import review, export activity, and preview with semantic structure', async () => {
    vi.mocked(profileService.getProfile).mockResolvedValue({
      ...profileFixture,
      experiences: [
        {
          id: 'experience-ops',
          title: 'Resume Operations Lead',
          company: 'Talent Systems',
          location: 'Remote',
          startDate: '2022-01-01',
          current: true,
          description: 'Built workflow reviews for resume teams.',
        },
      ],
      educations: [
        {
          id: 'education-state',
          degree: 'MBA Product Strategy',
          institution: 'State University',
          startDate: '2018-08-01',
          endDate: '2020-05-01',
        },
      ],
    } as any);
    vi.mocked(profileService.getResumeArtifacts).mockResolvedValue([uploadedArtifactFixture] as any);

    renderResumeBuilder();

    await screen.findByLabelText('Headline');
    expect(screen.getByRole('toolbar', { name: 'Resume actions' })).toBeTruthy();
    expect(screen.getByRole('tablist', { name: 'Resume sections' })).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByRole('region', { name: 'Resume export activity' })).toBeTruthy();
    });
    const exportActivity = screen.getByRole('region', { name: 'Resume export activity' });
    expect(within(exportActivity).getByRole('listitem', { name: /Riley-Resume-resume\.pdf.*Account synced/i })).toBeTruthy();
    expectDecorativeSvgIcons(exportActivity);

    const editorPanel = screen.getByRole('tabpanel', { name: 'Editor' });
    const editorFields = within(editorPanel).getByRole('list', { name: 'Resume editor fields' });
    expect(within(editorFields).getAllByRole('listitem')).toHaveLength(6);
    expect(within(editorFields).getByLabelText('Headline')).toBeTruthy();
    expect(within(editorFields).getByLabelText('Full Name')).toBeTruthy();
    expect(within(editorPanel).getByRole('region', { name: 'Professional summary editor' })).toBeTruthy();
    expect(within(editorPanel).getByRole('textbox', { name: 'Professional Summary' })).toBeTruthy();
    expect(within(editorPanel).getByRole('listitem', { name: /Resume Operations Lead at Talent Systems.*Remote.*2022.*Present.*Built workflow reviews/i })).toBeTruthy();
    expect(within(editorPanel).getByRole('listitem', { name: 'Design Systems skill' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Import Text' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Resume text'), { target: { value: importTextFixture } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Generate Draft' }));

    await waitFor(() => {
      expect(within(dialog).getByRole('region', { name: 'Resume import review' })).toBeTruthy();
    });
    const importReview = within(dialog).getByRole('region', { name: 'Resume import review' });
    const detectedFields = within(importReview).getByRole('list', { name: 'Detected resume fields' });
    expect(within(detectedFields).getAllByRole('listitem').length).toBeGreaterThan(0);
    expect(within(detectedFields).getByText('Headline')).toBeTruthy();
    expect(within(detectedFields).getByText('Candidate Experience Lead')).toBeTruthy();
    expect(within(importReview).getByRole('listitem', { name: 'React skill' })).toBeTruthy();
    expect(within(importReview).getByRole('listitem', { name: /MBA at State University.*Product Strategy.*2020/i })).toBeTruthy();
    expectDecorativeSvgIcons(dialog);

    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Preview' }));

    const previewPanel = screen.getByRole('tabpanel', { name: 'Preview' });
    expect(within(previewPanel).getByRole('region', { name: 'Resume preview' })).toBeTruthy();
    expect(within(previewPanel).getByRole('listitem', { name: /Resume Operations Lead at Talent Systems.*Remote.*2022.*Present.*Built workflow reviews/i })).toBeTruthy();
    expect(within(previewPanel).getByRole('listitem', { name: /MBA Product Strategy at State University.*2020/i })).toBeTruthy();
    expect(within(previewPanel).getByRole('listitem', { name: 'Design Systems skill' })).toBeTruthy();
    expectDecorativeSvgIcons(document.body);
  });

  it('shows safe resume save failure copy and retries Save Changes', async () => {
    vi.mocked(profileService.updateProfile)
      .mockRejectedValueOnce(new Error('Profile update failed with service_role_token=secret'))
      .mockResolvedValueOnce({ headline: 'Recovered Resume Lead' } as any);

    renderResumeBuilder();

    const headlineInput = await screen.findByLabelText('Headline');
    fireEvent.change(headlineInput, { target: { value: 'Recovered Resume Lead' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => {
      expect(screen.getByText('Resume changes were not saved')).toBeTruthy();
    });
    expect(screen.getByText(/resume changes were not saved\. review the fields/i)).toBeTruthy();
    expect(screen.queryByText(/service_role_token/i)).toBeNull();
    expect(screen.queryByText(/Profile update failed/i)).toBeNull();

    const requestCountBeforeRetry = vi.mocked(profileService.updateProfile).mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => {
      expect(profileService.updateProfile).toHaveBeenCalledTimes(requestCountBeforeRetry + 1);
    });
    await waitFor(() => {
      expect(screen.queryByText('Resume changes were not saved')).toBeNull();
    });
  });

  it('shows safe provider upload failure copy and retries Upload PDF', async () => {
    vi.mocked(fileUploadService.uploadFile)
      .mockRejectedValueOnce(new Error('Storage upload failed with service_role_token=secret'))
      .mockResolvedValueOnce({
        url: uploadedArtifactFixture.url,
        folder: 'resumes',
      });

    renderResumeBuilder();

    await screen.findByLabelText('Headline');
    fireEvent.click(screen.getByRole('button', { name: 'Upload PDF' }));

    await waitFor(() => {
      expect(screen.getByText('Resume PDF was not uploaded')).toBeTruthy();
    });
    expect(screen.getByText(/resume pdf was not uploaded\. use upload pdf again/i)).toBeTruthy();
    expect(screen.queryByText(/service_role_token/i)).toBeNull();
    expect(screen.queryByText(/Storage upload failed/i)).toBeNull();

    const requestCountBeforeRetry = vi.mocked(fileUploadService.uploadFile).mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: 'Upload PDF' }));

    await waitFor(() => {
      expect(fileUploadService.uploadFile).toHaveBeenCalledTimes(requestCountBeforeRetry + 1);
    });
    await waitFor(() => {
      expect(screen.queryByText('Resume PDF was not uploaded')).toBeNull();
    });
  });

  it('shows safe uploaded PDF delete failure copy and retries Delete PDF', async () => {
    vi.mocked(profileService.getResumeArtifacts).mockResolvedValue([uploadedArtifactFixture] as any);
    vi.mocked(fileUploadService.deleteFile)
      .mockRejectedValueOnce(new Error('Storage delete failed with service_role_token=secret'))
      .mockResolvedValueOnce(undefined);

    renderResumeBuilder();

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Open PDF' })).toBeTruthy();
    });
    expectDecorativeSvgIcons(screen.getByRole('region', { name: 'Resume export activity' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expectDecorativeSvgIcons(await screen.findByRole('dialog', { name: 'Delete Uploaded PDF' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete PDF' }));

    await waitFor(() => {
      expect(screen.getByText('Uploaded PDF was not removed')).toBeTruthy();
    });
    expect(screen.getByText(/uploaded pdf was not removed\. try delete pdf again/i)).toBeTruthy();
    expect(screen.queryByText(/service_role_token/i)).toBeNull();
    expect(screen.queryByText(/Storage delete failed/i)).toBeNull();

    const requestCountBeforeRetry = vi.mocked(fileUploadService.deleteFile).mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: 'Delete PDF' }));

    await waitFor(() => {
      expect(fileUploadService.deleteFile).toHaveBeenCalledTimes(requestCountBeforeRetry + 1);
    });
    await waitFor(() => {
      expect(screen.queryByText('Uploaded PDF was not removed')).toBeNull();
    });
  });

  it('shows safe import skill save failure copy and retries Save Skills', async () => {
    vi.mocked(profileService.addSkill).mockRejectedValue(new Error('Skill insert failed with service_role_token=secret'));

    renderResumeBuilder();

    await screen.findByLabelText('Headline');
    fireEvent.click(screen.getByRole('button', { name: 'Import Text' }));
    fireEvent.change(screen.getByLabelText('Resume text'), { target: { value: importTextFixture } });
    fireEvent.click(screen.getByRole('button', { name: 'Generate Draft' }));
    await waitFor(() => {
      expect(screen.getByText('Review detected skills')).toBeTruthy();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save Skills' }));

    await waitFor(() => {
      expect(screen.getByText('Detected skills were not saved')).toBeTruthy();
    });
    expect(screen.getByText(/selected skills were not saved\. review the selections/i)).toBeTruthy();
    expect(screen.queryByText(/service_role_token/i)).toBeNull();
    expect(screen.queryByText(/Skill insert failed/i)).toBeNull();

    vi.mocked(profileService.addSkill).mockImplementation(async (_userId, skill) => ({
      id: `skill-retry-${skill.name}`,
      ...skill,
    }) as any);
    const requestCountBeforeRetry = vi.mocked(profileService.addSkill).mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: 'Save Skills' }));

    await waitFor(() => {
      expect(vi.mocked(profileService.addSkill).mock.calls.length).toBeGreaterThan(requestCountBeforeRetry);
    });
    await waitFor(() => {
      expect(screen.queryByText('Detected skills were not saved')).toBeNull();
    });
  });

  it('shows safe import profile row failure copy and retries Save Rows', async () => {
    vi.mocked(profileService.addExperience).mockRejectedValue(new Error('Experience insert failed with service_role_token=secret'));
    vi.mocked(profileService.addEducation).mockRejectedValue(new Error('Education insert failed with service_role_token=secret'));

    renderResumeBuilder();

    await screen.findByLabelText('Headline');
    fireEvent.click(screen.getByRole('button', { name: 'Import Text' }));
    fireEvent.change(screen.getByLabelText('Resume text'), { target: { value: importTextFixture } });
    fireEvent.click(screen.getByRole('button', { name: 'Generate Draft' }));
    await waitFor(() => {
      expect(screen.getByText('Review detected profile rows')).toBeTruthy();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save Rows' }));

    await waitFor(() => {
      expect(screen.getByText('Detected profile rows were not saved')).toBeTruthy();
    });
    expect(screen.getByText(/selected profile rows were not saved\. review the selections/i)).toBeTruthy();
    expect(screen.queryByText(/service_role_token/i)).toBeNull();
    expect(screen.queryByText(/Experience insert failed/i)).toBeNull();
    expect(screen.queryByText(/Education insert failed/i)).toBeNull();

    vi.mocked(profileService.addExperience).mockImplementation(async (_userId, experience) => ({
      id: `experience-retry-${experience.title}`,
      ...experience,
    }) as any);
    vi.mocked(profileService.addEducation).mockImplementation(async (_userId, education) => ({
      id: `education-retry-${education.institution}`,
      ...education,
    }) as any);
    const experienceCountBeforeRetry = vi.mocked(profileService.addExperience).mock.calls.length;
    const educationCountBeforeRetry = vi.mocked(profileService.addEducation).mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: 'Save Rows' }));

    await waitFor(() => {
      expect(vi.mocked(profileService.addExperience).mock.calls.length).toBeGreaterThan(experienceCountBeforeRetry);
      expect(vi.mocked(profileService.addEducation).mock.calls.length).toBeGreaterThan(educationCountBeforeRetry);
    });
    await waitFor(() => {
      expect(screen.queryByText('Detected profile rows were not saved')).toBeNull();
    });
  });
});
