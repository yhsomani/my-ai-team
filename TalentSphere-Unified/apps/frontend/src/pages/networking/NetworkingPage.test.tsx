import React from 'react';
import { configureStore } from '@reduxjs/toolkit';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { Provider } from 'react-redux';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../../components/shared/Toast';
import authReducer from '../../store/slices/authSlice';
import networkingReducer from '../../store/slices/networkingSlice';
import { networkingService } from '../../services/networkingService';
import NetworkingPage from './NetworkingPage';

vi.mock('../../services/networkingService', () => ({
  networkingService: {
    getSuggestions: vi.fn(),
    getConnectionRequests: vi.fn(),
    getConnections: vi.fn(),
    getSuggestionPreferences: vi.fn(),
    saveSuggestionPreference: vi.fn(),
    clearSuggestionPreferences: vi.fn(),
    sendConnectionRequest: vi.fn(),
    acceptConnectionRequest: vi.fn(),
    rejectConnectionRequest: vi.fn(),
  },
}));

vi.mock('../../services/notificationService', () => ({
  notificationService: {
    upsertNetworkingReminderNotification: vi.fn(),
    clearNetworkingReminderNotification: vi.fn(),
  },
}));

vi.mock('../../lib/networkingWorkflowAnalytics', () => ({
  recordNetworkingWorkflowAnalytics: vi.fn(),
}));

const baseNetworkingState = networkingReducer(undefined, { type: '@@INIT' });
let localStorageData: Record<string, string>;

const suggestionProfile = {
  id: 'profile-arya',
  userId: 'profile-arya',
  fullName: 'Arya Rao',
  currentRole: 'Accessibility Lead',
  headline: 'Accessibility Lead',
  location: 'Remote',
  skills: ['Accessibility', 'Design Systems'],
  mutualConnections: 2,
  recommendationScore: 92,
  recommendationReasons: ['Shares Accessibility'],
};

const incomingConnection = {
  id: 'connection-incoming',
  requesterId: 'profile-camila',
  receiverId: 'network-user',
  status: 'PENDING' as const,
  message: 'Would like to compare network workflows.',
  createdAt: '2026-06-28T09:00:00.000Z',
  requester: {
    id: 'profile-camila',
    userId: 'profile-camila',
    fullName: 'Camila Chen',
    currentRole: 'Hiring Ops Lead',
    headline: 'Hiring Ops Lead',
    location: 'Austin, TX',
  },
};

const sentConnection = {
  id: 'connection-sent',
  requesterId: 'network-user',
  receiverId: 'profile-eli',
  status: 'PENDING' as const,
  message: 'Following up on design systems.',
  createdAt: '2026-06-28T08:00:00.000Z',
  recipient: {
    id: 'profile-eli',
    userId: 'profile-eli',
    fullName: 'Eli Morgan',
    currentRole: 'Frontend Architect',
    headline: 'Frontend Architect',
    location: 'Denver, CO',
  },
};

const acceptedConnection = {
  id: 'connection-accepted',
  requesterId: 'network-user',
  receiverId: 'profile-noor',
  status: 'ACCEPTED' as const,
  createdAt: '2026-06-28T07:00:00.000Z',
  recipient: {
    id: 'profile-noor',
    userId: 'profile-noor',
    fullName: 'Noor Singh',
    currentRole: 'Product Design Lead',
    headline: 'Product Design Lead',
    location: 'Portland, OR',
  },
};

const networkingStateWithProfiles = (...profiles: Array<typeof suggestionProfile>) => ({
  ...baseNetworkingState,
  status: 'succeeded' as const,
  ids: profiles.map(profile => profile.id),
  entities: profiles.reduce<Record<string, typeof suggestionProfile>>((acc, profile) => {
    acc[profile.id] = profile;
    return acc;
  }, {}),
});

const renderNetworkingPage = (networkingState: typeof baseNetworkingState) => {
  const store = configureStore({
    reducer: {
      auth: authReducer,
      networking: networkingReducer,
    },
    preloadedState: {
      auth: {
        user: {
          id: 'network-user',
          email: 'network-user@example.com',
          roles: ['ROLE_USER'],
        },
        session: null,
        loading: false,
      },
      networking: networkingState,
    },
  });

  render(
    <Provider store={store}>
      <ToastProvider>
        <NetworkingPage />
      </ToastProvider>
    </Provider>,
  );

  return store;
};

const expectSvgIconsDecorative = (container: Element) => {
  const icons = Array.from(container.querySelectorAll('svg'));
  expect(icons.length).toBeGreaterThan(0);

  icons.forEach((icon) => {
    expect(icon.getAttribute('aria-hidden')).toBe('true');
    expect(icon.getAttribute('focusable')).toBe('false');
  });
};

describe('NetworkingPage', () => {
  beforeEach(() => {
    localStorageData = {};
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn((key: string) => localStorageData[key] ?? null),
        setItem: vi.fn((key: string, value: string) => {
          localStorageData[key] = value;
        }),
        removeItem: vi.fn((key: string) => {
          delete localStorageData[key];
        }),
        clear: vi.fn(() => {
          localStorageData = {};
        }),
      },
      configurable: true,
    });
    vi.mocked(networkingService.getConnectionRequests).mockResolvedValue({ incoming: [], sent: [] });
    vi.mocked(networkingService.getConnections).mockResolvedValue([]);
    vi.mocked(networkingService.getSuggestionPreferences).mockResolvedValue([]);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('shows safe networking load failure copy without exposing raw errors', () => {
    renderNetworkingPage({
      ...baseNetworkingState,
      status: 'failed',
      error: 'PostgREST networking query failed with service_role_token=secret',
    });

    expect(screen.getByRole('heading', { name: 'Network' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Network could not load' })).toBeTruthy();
    expect(screen.getByText(/networking suggestions did not respond/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Retry network' })).toBeTruthy();
    expect(screen.queryByText(/service_role_token/i)).toBeNull();
    expect(screen.queryByText(/PostgREST networking query failed/i)).toBeNull();
  });

  it('retries the existing suggestion load workflow from the safe failure state', async () => {
    vi.mocked(networkingService.getSuggestions).mockResolvedValue([
      {
        id: 'network-asha',
        userId: 'network-asha',
        fullName: 'Asha Patel',
        currentRole: 'Design Systems Lead',
        headline: 'Design Systems Lead',
        location: 'Remote',
        skills: ['Accessibility', 'Design Systems'],
        mutualConnections: 2,
        recommendationScore: 91,
        recommendationReasons: ['Shares Design Systems'],
      },
    ]);

    renderNetworkingPage({
      ...baseNetworkingState,
      status: 'failed',
      error: 'Failed to fetch suggestions: internal schema details',
    });

    fireEvent.click(screen.getByRole('button', { name: 'Retry network' }));

    await waitFor(() => {
      expect(networkingService.getSuggestions).toHaveBeenCalledWith('network-user');
    });
    await waitFor(() => {
      expect(screen.getByText('Asha Patel')).toBeTruthy();
    });
  });

  it('exposes networking card groups and actions with descriptive accessible names', async () => {
    vi.mocked(networkingService.getConnectionRequests).mockResolvedValue({
      incoming: [incomingConnection],
      sent: [sentConnection],
    } as any);
    vi.mocked(networkingService.getConnections).mockResolvedValue([acceptedConnection] as any);

    renderNetworkingPage(networkingStateWithProfiles(suggestionProfile) as any);

    const viewControls = screen.getByRole('group', { name: 'Network view controls' });
    expect(viewControls.getAttribute('data-ui')).toBe('network-view-controls');
    expect(viewControls.getAttribute('aria-describedby')).toBe('network-view-control-help');
    expect(screen.getByText(/Network tabs, hidden suggestions, and search controls/i).id).toBe('network-view-control-help');
    expect(viewControls.contains(screen.getByRole('tablist', { name: 'Networking views' }))).toBe(true);

    const networkSearch = screen.getByRole('search', { name: 'Network search' });
    expect(networkSearch.getAttribute('data-ui')).toBe('network-search-surface');
    const searchField = screen.getByLabelText('Search network');
    expect(networkSearch.contains(searchField)).toBe(true);
    expect(viewControls.contains(searchField)).toBe(true);
    expect(searchField.getAttribute('aria-describedby')).toBe('network-search-help');
    expect(screen.getByText(/Search narrows the active Network view/i).id).toBe('network-search-help');
    const searchIcon = searchField.parentElement?.querySelector('svg');
    expect(searchIcon?.getAttribute('aria-hidden')).toBe('true');
    expect(searchIcon?.getAttribute('focusable')).toBe('false');

    const suggestedList = await screen.findByRole('list', { name: 'Suggested professionals' });
    const suggestedCard = within(suggestedList).getByRole('listitem', { name: 'Suggested professional Arya Rao' });
    expect(within(suggestedCard).getByText('AR').getAttribute('aria-hidden')).toBe('true');
    expectSvgIconsDecorative(suggestedCard);
    expect(within(suggestedCard).getByRole('button', { name: 'Preview Arya Rao profile' })).toBeTruthy();
    expect(within(suggestedCard).getByRole('button', { name: 'Hide suggestion Arya Rao' })).toBeTruthy();
    expect(within(suggestedCard).getByRole('button', { name: 'Connect with Arya Rao' })).toBeTruthy();

    fireEvent.click(within(suggestedCard).getByRole('button', { name: 'Preview Arya Rao profile' }));
    const previewDialog = await screen.findByRole('dialog', { name: 'Arya Rao' });
    expect(within(previewDialog).getByText('AR').getAttribute('aria-hidden')).toBe('true');
    expectSvgIconsDecorative(previewDialog);
    fireEvent.click(screen.getByRole('button', { name: 'Close profile preview' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Arya Rao' })).toBeNull();
    });

    fireEvent.click(screen.getByRole('tab', { name: /Incoming/ }));
    const incomingList = await screen.findByRole('list', { name: 'Incoming connection requests' });
    const incomingCard = within(incomingList).getByRole('listitem', { name: 'Incoming request from Camila Chen' });
    expect(within(incomingCard).getByText('CC').getAttribute('aria-hidden')).toBe('true');
    expectSvgIconsDecorative(incomingCard);
    expect(within(incomingCard).getByRole('button', { name: 'Preview Camila Chen profile' })).toBeTruthy();
    expect(within(incomingCard).getByRole('button', { name: 'Accept connection request from Camila Chen' })).toBeTruthy();
    expect(within(incomingCard).getByRole('button', { name: 'Decline connection request from Camila Chen' })).toBeTruthy();

    fireEvent.click(screen.getByRole('tab', { name: /Sent/ }));
    const sentList = await screen.findByRole('list', { name: 'Sent connection requests' });
    const sentCard = within(sentList).getByRole('listitem', { name: 'Sent request to Eli Morgan' });
    expect(within(sentCard).getByText('EM').getAttribute('aria-hidden')).toBe('true');
    expectSvgIconsDecorative(sentCard);
    expect(within(sentCard).getByRole('button', { name: 'Preview Eli Morgan profile' })).toBeTruthy();
    expect(within(sentCard).getByRole('button', { name: 'Set follow-up reminder for Eli Morgan' })).toBeTruthy();
    expect(within(sentCard).getByRole('button', { name: 'Withdraw connection request to Eli Morgan' })).toBeTruthy();

    fireEvent.click(screen.getByRole('tab', { name: /Connections/ }));
    const acceptedList = await screen.findByRole('list', { name: 'Accepted connections' });
    const acceptedCard = within(acceptedList).getByRole('listitem', { name: 'Accepted connection Noor Singh' });
    expect(within(acceptedCard).getByText('NS').getAttribute('aria-hidden')).toBe('true');
    expectSvgIconsDecorative(acceptedCard);
    expect(within(acceptedCard).getByRole('button', { name: 'Preview Noor Singh profile' })).toBeTruthy();
  });

  it('shows safe connection request failure copy and retries Connect', async () => {
    vi.mocked(networkingService.sendConnectionRequest)
      .mockRejectedValueOnce(new Error('Connection insert failed with service_role_token=secret'))
      .mockResolvedValueOnce({
        id: 'connection-arya',
        requesterId: 'network-user',
        receiverId: 'profile-arya',
        status: 'PENDING',
        createdAt: '2026-06-28T10:00:00.000Z',
        recipient: suggestionProfile,
      } as any);

    renderNetworkingPage(networkingStateWithProfiles(suggestionProfile) as any);

    await waitFor(() => {
      expect(screen.getByText('Arya Rao')).toBeTruthy();
    });
    fireEvent.change(screen.getByLabelText('Connection note for Arya Rao'), {
      target: { value: 'Would like to compare network recovery patterns.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Connect with Arya Rao' }));

    await waitFor(() => {
      expect(screen.getByText('Connection request was not sent')).toBeTruthy();
    });
    expect(screen.getByText(/connection request was not sent\. review the note/i)).toBeTruthy();
    expect(screen.queryByText(/service_role_token/i)).toBeNull();
    expect(screen.queryByText(/Connection insert failed/i)).toBeNull();

    const requestCountBeforeRetry = vi.mocked(networkingService.sendConnectionRequest).mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: 'Connect with Arya Rao' }));

    await waitFor(() => {
      expect(networkingService.sendConnectionRequest).toHaveBeenCalledTimes(requestCountBeforeRetry + 1);
    });
    await waitFor(() => {
      expect(screen.queryByText('Connection request was not sent')).toBeNull();
    });
  });

  it('shows safe incoming accept failure copy and retries Accept', async () => {
    vi.mocked(networkingService.getConnectionRequests).mockResolvedValue({
      incoming: [incomingConnection],
      sent: [],
    } as any);
    vi.mocked(networkingService.acceptConnectionRequest)
      .mockRejectedValueOnce(new Error('Accept mutation failed with service_role_token=secret'))
      .mockResolvedValueOnce(undefined);

    renderNetworkingPage(networkingStateWithProfiles() as any);

    fireEvent.click(screen.getByRole('tab', { name: /Incoming/ }));
    await waitFor(() => {
      expect(screen.getByText('Camila Chen')).toBeTruthy();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Accept connection request from Camila Chen' }));

    await waitFor(() => {
      expect(screen.getByText('Connection request was not accepted')).toBeTruthy();
    });
    expect(screen.getByText(/try accept again from this card/i)).toBeTruthy();
    expect(screen.queryByText(/service_role_token/i)).toBeNull();
    expect(screen.queryByText(/Accept mutation failed/i)).toBeNull();

    const requestCountBeforeRetry = vi.mocked(networkingService.acceptConnectionRequest).mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: 'Accept connection request from Camila Chen' }));

    await waitFor(() => {
      expect(networkingService.acceptConnectionRequest).toHaveBeenCalledTimes(requestCountBeforeRetry + 1);
    });
    await waitFor(() => {
      expect(screen.queryByText('Connection request was not accepted')).toBeNull();
    });
  });

  it('shows safe incoming decline failure copy and retries Decline', async () => {
    vi.mocked(networkingService.getConnectionRequests).mockResolvedValue({
      incoming: [incomingConnection],
      sent: [],
    } as any);
    vi.mocked(networkingService.rejectConnectionRequest)
      .mockRejectedValueOnce(new Error('Decline mutation failed with service_role_token=secret'))
      .mockResolvedValueOnce(undefined);

    renderNetworkingPage(networkingStateWithProfiles() as any);

    fireEvent.click(screen.getByRole('tab', { name: /Incoming/ }));
    await waitFor(() => {
      expect(screen.getByText('Camila Chen')).toBeTruthy();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Decline connection request from Camila Chen' }));

    await waitFor(() => {
      expect(screen.getByText('Connection request was not declined')).toBeTruthy();
    });
    expect(screen.getByText(/try decline again from this card/i)).toBeTruthy();
    expect(screen.queryByText(/service_role_token/i)).toBeNull();
    expect(screen.queryByText(/Decline mutation failed/i)).toBeNull();

    const requestCountBeforeRetry = vi.mocked(networkingService.rejectConnectionRequest).mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: 'Decline connection request from Camila Chen' }));

    await waitFor(() => {
      expect(networkingService.rejectConnectionRequest).toHaveBeenCalledTimes(requestCountBeforeRetry + 1);
    });
    await waitFor(() => {
      expect(screen.queryByText('Connection request was not declined')).toBeNull();
    });
  });

  it('shows safe sent withdraw failure copy and retries Withdraw', async () => {
    vi.mocked(networkingService.getConnectionRequests).mockResolvedValue({
      incoming: [],
      sent: [sentConnection],
    } as any);
    vi.mocked(networkingService.rejectConnectionRequest)
      .mockRejectedValueOnce(new Error('Withdraw mutation failed with service_role_token=secret'))
      .mockResolvedValueOnce(undefined);

    renderNetworkingPage(networkingStateWithProfiles() as any);

    fireEvent.click(screen.getByRole('tab', { name: /Sent/ }));
    await waitFor(() => {
      expect(screen.getByText('Eli Morgan')).toBeTruthy();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Withdraw connection request to Eli Morgan' }));

    await waitFor(() => {
      expect(screen.getByText('Sent request was not withdrawn')).toBeTruthy();
    });
    expect(screen.getByText(/try withdraw again from this card/i)).toBeTruthy();
    expect(screen.queryByText(/service_role_token/i)).toBeNull();
    expect(screen.queryByText(/Withdraw mutation failed/i)).toBeNull();

    const requestCountBeforeRetry = vi.mocked(networkingService.rejectConnectionRequest).mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: 'Withdraw connection request to Eli Morgan' }));

    await waitFor(() => {
      expect(networkingService.rejectConnectionRequest).toHaveBeenCalledTimes(requestCountBeforeRetry + 1);
    });
    await waitFor(() => {
      expect(screen.queryByText('Sent request was not withdrawn')).toBeNull();
    });
  });
});
