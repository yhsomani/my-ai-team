import React from 'react';
import { configureStore } from '@reduxjs/toolkit';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../../components/shared/Toast';
import authReducer from '../../store/slices/authSlice';
import { profileService } from '../../services/profileService';
import { fileUploadService } from '../../services/fileUploadService';
import ProfilePage from './ProfilePage';

vi.mock('../../services/profileService', () => ({
  profileService: {
    getProfile: vi.fn(),
    updateProfile: vi.fn(),
    addSkill: vi.fn(),
    updateSkill: vi.fn(),
    deleteSkill: vi.fn(),
    addExperience: vi.fn(),
    updateExperience: vi.fn(),
    deleteExperience: vi.fn(),
    addEducation: vi.fn(),
    updateEducation: vi.fn(),
    deleteEducation: vi.fn(),
    updateAvatar: vi.fn(),
  },
}));

vi.mock('../../services/fileUploadService', () => ({
  fileUploadService: {
    uploadFile: vi.fn(),
    deleteFile: vi.fn(),
  },
}));

vi.mock('../../lib/profileAvatarCrop', async () => {
  const actual = await vi.importActual<typeof import('../../lib/profileAvatarCrop')>('../../lib/profileAvatarCrop');

  return {
    ...actual,
    createCroppedProfileAvatarFile: vi.fn(async (file: File) => file),
  };
});

vi.mock('../../lib/profileWorkflowAnalytics', () => ({
  recordProfileWorkflowAnalytics: vi.fn(),
}));

const profileFixture = {
  id: 'profile-row-1',
  user_id: 'profile-user',
  fullName: 'Avery Profile',
  full_name: 'Avery Profile',
  headline: 'Product Designer',
  bio: 'Designs clear hiring workflows.',
  location: 'Remote',
  website: 'https://avery.example',
  createdAt: '2025-01-10T10:00:00.000Z',
  skills: [
    {
      id: 'skill-react',
      name: 'React',
      proficiency: 'ADVANCED',
      yearsOfExperience: 5,
    },
  ],
  experiences: [],
  educations: [],
  achievements: [],
  profiles: {
    full_name: 'Avery Profile',
    avatar_url: null,
  },
};

const renderProfilePage = () => {
  const store = configureStore({
    reducer: {
      auth: authReducer,
    },
    preloadedState: {
      auth: {
        user: {
          id: 'profile-user',
          email: 'profile-user@example.com',
          roles: ['ROLE_USER'],
        },
        session: null,
        loading: false,
      },
    },
  });

  render(
    <Provider store={store}>
      <ToastProvider>
        <MemoryRouter initialEntries={['/profile']}>
          <Routes>
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/profile/:userId" element={<ProfilePage />} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </Provider>,
  );

  return store;
};

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    Object.defineProperty(window.URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:profile-avatar-preview'),
    });
    Object.defineProperty(window.URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    });
    vi.mocked(profileService.getProfile).mockResolvedValue(profileFixture as any);
    vi.mocked(profileService.updateProfile).mockResolvedValue(profileFixture as any);
    vi.mocked(profileService.addSkill).mockResolvedValue({ id: 'skill-ts', name: 'TypeScript', proficiency: 'ADVANCED' } as any);
    vi.mocked(profileService.updateSkill).mockResolvedValue({ id: 'skill-react', name: 'React', proficiency: 'EXPERT' } as any);
    vi.mocked(profileService.deleteSkill).mockResolvedValue(undefined);
    vi.mocked(profileService.addExperience).mockResolvedValue({
      id: 'experience-1',
      title: 'Frontend Engineer',
      company: 'TechCorp',
      startDate: '2024-01-01',
      current: false,
      description: '',
    } as any);
    vi.mocked(profileService.updateExperience).mockResolvedValue({ id: 'experience-1', title: 'Frontend Engineer' } as any);
    vi.mocked(profileService.deleteExperience).mockResolvedValue(undefined);
    vi.mocked(profileService.addEducation).mockResolvedValue({ id: 'education-1', institution: 'Stanford University' } as any);
    vi.mocked(profileService.updateEducation).mockResolvedValue({ id: 'education-1', institution: 'Stanford University' } as any);
    vi.mocked(profileService.deleteEducation).mockResolvedValue(undefined);
    vi.mocked(profileService.updateAvatar).mockResolvedValue({ avatarUrl: 'https://files.example/avatar.png' } as any);
    vi.mocked(fileUploadService.uploadFile).mockResolvedValue({ url: 'https://files.example/avatar.png' } as any);
    vi.mocked(fileUploadService.deleteFile).mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('shows safe profile load failure copy without exposing raw provider errors', async () => {
    vi.mocked(profileService.getProfile).mockRejectedValue(
      new Error('PostgREST profile query failed with service_role_token=secret'),
    );

    renderProfilePage();

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeTruthy();
    });

    expect(screen.getByRole('heading', { name: 'Profile' })).toBeTruthy();
    expect(screen.getByText('Profile could not load')).toBeTruthy();
    expect(screen.getByText(/profile data did not respond/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Retry profile' })).toBeTruthy();
    expect(screen.queryByText(/service_role_token/i)).toBeNull();
    expect(screen.queryByText(/PostgREST profile query failed/i)).toBeNull();
  });

  it('retries the existing profile load workflow from the safe failure state', async () => {
    vi.mocked(profileService.getProfile)
      .mockRejectedValueOnce(new Error('PostgREST profile query failed with service_role_token=secret'))
      .mockResolvedValue(profileFixture as any);

    renderProfilePage();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Retry profile' })).toBeTruthy();
    });

    const requestCountBeforeRetry = vi.mocked(profileService.getProfile).mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: 'Retry profile' }));

    await waitFor(() => {
      expect(profileService.getProfile).toHaveBeenCalledTimes(requestCountBeforeRetry + 1);
    });
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Avery Profile' })).toBeTruthy();
    });
    expect(screen.queryByText('Profile could not load')).toBeNull();
    expect(screen.queryByText(/service_role_token/i)).toBeNull();
  });

  it('keeps profile save failure in the edit modal with safe copy and retries through Save Changes', async () => {
    vi.mocked(profileService.updateProfile)
      .mockRejectedValueOnce(new Error('PostgREST profile update failed service_role_token=secret'))
      .mockResolvedValueOnce(profileFixture as any);

    renderProfilePage();

    await screen.findByRole('heading', { name: 'Avery Profile' });
    fireEvent.click(screen.getByRole('button', { name: 'Edit Profile' }));

    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Headline'), {
      target: { value: 'Senior Product Designer' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save Changes' }));

    await screen.findByText('Profile changes were not saved. Review the fields and try Save Changes again.');
    expect(screen.queryByText(/service_role_token/i)).toBeNull();
    expect(screen.queryByText(/PostgREST profile update failed/i)).toBeNull();

    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => {
      expect(profileService.updateProfile).toHaveBeenCalledTimes(2);
    });
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
  });

  it('keeps completion-row save failure in the row modal with safe copy and retries through Save', async () => {
    vi.mocked(profileService.addExperience)
      .mockRejectedValueOnce(new Error('experience insert failed provider_api_key=secret'))
      .mockResolvedValueOnce({
        id: 'experience-1',
        title: 'Frontend Engineer',
        company: 'TechCorp',
        startDate: '2024-01-01',
        current: false,
        description: '',
      } as any);

    renderProfilePage();

    await screen.findByRole('heading', { name: 'Avery Profile' });
    fireEvent.click(screen.getByRole('button', { name: 'Add role' }));

    let dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Title'), { target: { value: 'Frontend Engineer' } });
    fireEvent.change(within(dialog).getByLabelText('Company'), { target: { value: 'TechCorp' } });
    fireEvent.change(within(dialog).getByLabelText('Start Date'), { target: { value: '2024-01-01' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    await screen.findByText('Profile item was not saved. Review the fields and try Save again.');
    expect(screen.queryByText(/provider_api_key/i)).toBeNull();
    expect(screen.queryByText(/experience insert failed/i)).toBeNull();

    dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(profileService.addExperience).toHaveBeenCalledTimes(2);
    });
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
  });

  it('keeps row deletion failure in the delete review with safe copy and retries through Remove', async () => {
    vi.mocked(profileService.deleteSkill)
      .mockRejectedValueOnce(new Error('skills delete failed bearer_token=secret'))
      .mockResolvedValueOnce(undefined);

    renderProfilePage();

    await screen.findByRole('heading', { name: 'Avery Profile' });
    fireEvent.click(screen.getByRole('button', { name: 'Remove skill React' }));

    let dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Remove' }));

    await screen.findByText('Profile item was not removed. Try Remove again from this review.');
    expect(screen.queryByText(/bearer_token/i)).toBeNull();
    expect(screen.queryByText(/skills delete failed/i)).toBeNull();

    dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Remove' }));

    await waitFor(() => {
      expect(profileService.deleteSkill).toHaveBeenCalledTimes(2);
    });
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
  });

  it('keeps avatar upload failure in the upload review with safe copy and retries through Upload Photo', async () => {
    vi.mocked(fileUploadService.uploadFile)
      .mockRejectedValueOnce(new Error('avatar upload failed storage_service_token=secret'))
      .mockResolvedValueOnce({ url: 'https://files.example/avatar.png' } as any);

    renderProfilePage();

    await screen.findByRole('heading', { name: 'Avery Profile' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['avatar'], 'avatar.png', { type: 'image/png' });
    fireEvent.change(input, { target: { files: [file] } });

    let dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Upload Photo' }));

    await screen.findByText('Profile photo was not uploaded. Review the image and try Upload Photo again.');
    expect(screen.queryByText(/storage_service_token/i)).toBeNull();
    expect(screen.queryByText(/avatar upload failed/i)).toBeNull();

    dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Upload Photo' }));

    await waitFor(() => {
      expect(fileUploadService.uploadFile).toHaveBeenCalledTimes(2);
    });
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
  });

  it('keeps avatar removal failure in the removal review with safe copy and retries through Remove Photo', async () => {
    vi.mocked(profileService.getProfile).mockResolvedValue({
      ...profileFixture,
      avatarUrl: 'https://files.example/current-avatar.png',
      avatar_url: 'https://files.example/current-avatar.png',
      profiles: {
        ...profileFixture.profiles,
        avatar_url: 'https://files.example/current-avatar.png',
      },
    } as any);
    vi.mocked(profileService.updateAvatar)
      .mockRejectedValueOnce(new Error('avatar removal failed private_storage_key=secret'))
      .mockResolvedValueOnce({ avatarUrl: null, avatar_url: null } as any);

    renderProfilePage();

    await screen.findByRole('heading', { name: 'Avery Profile' });
    fireEvent.click(screen.getByRole('button', { name: 'Remove profile photo' }));

    let dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Remove Photo' }));

    await screen.findByText('Profile photo was not removed. Try Remove Photo again from this review.');
    expect(screen.queryByText(/private_storage_key/i)).toBeNull();
    expect(screen.queryByText(/avatar removal failed/i)).toBeNull();

    dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Remove Photo' }));

    await waitFor(() => {
      expect(profileService.updateAvatar).toHaveBeenCalledTimes(2);
    });
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
  });
});
