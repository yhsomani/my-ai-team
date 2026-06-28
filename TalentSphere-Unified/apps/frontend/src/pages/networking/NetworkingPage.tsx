import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { AlertTriangle, Bell, Check, Clock, ExternalLink, Lightbulb, MapPin, Search, UserCheck, UserPlus, Users, X } from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import Card from '../../components/shared/GlassCard';
import { Button } from '../../components/shared/AuraButton';
import { Badge } from '../../components/shared/Badge';
import { Skeleton } from '../../components/shared/Skeleton';
import { EmptyState } from '../../components/shared/EmptyState';

import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchSuggestions, selectAllProfiles } from '../../store/slices/networkingSlice';
import { useToast } from '../../components/shared/Toast';

import { networkingService } from '../../services/networkingService';
import { notificationService } from '../../services/notificationService';
import { Connection, PublicProfile } from '../../types/networking';
import { buildNetworkingProfilePreview, getNetworkingProfilePath } from '../../lib/networkingProfilePreview';
import {
  buildNetworkingReminderBackfillPlan,
  defaultReminderDelay,
  formatReminderDueLabel,
  getNetworkingReminderStorageKey,
  getReminderDueAt,
  normalizeStoredReminders,
  reminderDelayOptions,
  type NetworkingReminderState,
  type ReminderDelayOption,
} from '../../lib/networkingReminders';
import {
  recordNetworkingWorkflowAnalytics,
  type NetworkingWorkflowAnalyticsAction,
  type NetworkingWorkflowRequestDirection,
} from '../../lib/networkingWorkflowAnalytics';

type NetworkTab = 'discover' | 'incoming' | 'sent' | 'connections';
type ReminderSyncStatus = 'local' | 'syncing' | 'synced' | 'unavailable';

const tabs: Array<{ id: NetworkTab; label: string }> = [
  { id: 'discover', label: 'Discover' },
  { id: 'incoming', label: 'Incoming' },
  { id: 'sent', label: 'Sent' },
  { id: 'connections', label: 'Connections' },
];

const networkingPanelClassName = 'surface-panel p-3';
const networkingInsetClassName = 'rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)]/60 p-3';
const networkingRecordCardClassName = 'flex h-full min-h-64 flex-col p-5 transition-colors hover:border-[var(--border-strong)]';
const networkingDiscoverCardClassName = 'flex h-full min-h-[30rem] flex-col p-5 transition-colors hover:border-[var(--border-strong)]';
const networkingSearchFieldClassName = 'h-9 w-full rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)] pl-9 pr-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20';
const networkingConnectFailureMessage = 'Connection request was not sent. Review the note and try Connect again from this card.';
const networkingAcceptFailureMessage = 'Connection request was not accepted. Try Accept again from this card.';
const networkingDeclineFailureMessage = 'Connection request was not declined. Try Decline again from this card.';
const networkingWithdrawFailureMessage = 'Sent request was not withdrawn. Try Withdraw again from this card.';

type NetworkingActionFailure = {
  title: string;
  message: string;
};

const NetworkingActionFailureAlert = ({ title, message }: NetworkingActionFailure) => (
  <div
    role="alert"
    className="rounded-md border border-destructive/30 bg-destructive-muted/10 p-3 text-xs text-[var(--text-secondary)]"
  >
    <p className="font-semibold text-[var(--text-primary)]">{title}</p>
    <p className="mt-1 leading-5">{message}</p>
  </div>
);

const getInitials = (name?: string) => {
  const initials = (name || 'User')
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return initials || 'U';
};

const getConnectionPerson = (connection: Connection, currentUserId?: string): PublicProfile | undefined => {
  return connection.requesterId === currentUserId ? connection.recipient : connection.requester;
};

const getHiddenSuggestionStorageKey = (userId?: string) => `talentsphere.networking.hiddenSuggestions.${userId || 'guest'}`;

const getProfileSuggestionReasons = (profile: PublicProfile) => {
  if (profile.recommendationReasons?.length) {
    return profile.recommendationReasons.slice(0, 3);
  }

  const reasons = [
    profile.mutualConnections ? `${profile.mutualConnections} mutual ${profile.mutualConnections === 1 ? 'connection' : 'connections'}` : '',
    profile.currentRole ? `Works in ${profile.currentRole}` : '',
    profile.location ? `Based in ${profile.location}` : '',
    profile.headline ? 'Has profile context to review before connecting' : '',
    profile.skills?.length ? `Lists ${profile.skills.slice(0, 2).join(', ')}` : '',
  ].filter(Boolean);

  return reasons.length > 0 ? reasons.slice(0, 3) : ['Suggested because this profile is outside your current network'];
};

const formatConnectionAge = (value?: string) => {
  if (!value) return 'Date unavailable';
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return 'Date unavailable';

  const diffMs = Date.now() - timestamp;
  const minutes = Math.max(1, Math.floor(diffMs / 60000));
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const getNetworkingWorkflowErrorCategory = (error: unknown, fallback = 'request_error') => {
  if (!error) return fallback;
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  if (message.includes('auth') || message.includes('login') || message.includes('permission')) return 'auth_required';
  if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) return 'network_error';
  if (message.includes('storage') || message.includes('local')) return 'storage_error';
  if (message.includes('notification')) return 'notification_sync_failed';
  if (message.includes('preference')) return 'preference_sync_failed';
  return fallback;
};

const getProfileAnalyticsMetadata = (profile?: PublicProfile | null) => ({
  recommendationScore: profile?.recommendationScore ?? profile?.alignment,
  mutualConnectionCount: profile?.mutualConnections,
  reasonCount: Array.isArray(profile?.recommendationReasons) ? profile.recommendationReasons.length : 0,
  sharedSkillCount: Array.isArray(profile?.sharedSkills) ? profile.sharedSkills.length : 0,
  profileSkillCount: Array.isArray(profile?.skills) ? profile.skills.length : 0,
});

const getNetworkingDirectionForTab = (tab: NetworkTab): NetworkingWorkflowRequestDirection => (
  tab === 'connections' ? 'connection' : tab
);

const NetworkingPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { addToast } = useToast();
  const profiles = useAppSelector(selectAllProfiles);
  const { status, error } = useAppSelector((state) => state.networking);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<NetworkTab>('discover');
  const [pendingRequests, setPendingRequests] = useState<Set<string>>(new Set());
  const [incomingRequests, setIncomingRequests] = useState<Connection[]>([]);
  const [sentRequests, setSentRequests] = useState<Connection[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [requestMessages, setRequestMessages] = useState<Record<string, string>>({});
  const [actionLoadingIds, setActionLoadingIds] = useState<Set<string>>(new Set());
  const [actionFailures, setActionFailures] = useState<Record<string, NetworkingActionFailure>>({});
  const [isNetworkLoading, setIsNetworkLoading] = useState(false);
  const [remindersByRequestId, setRemindersByRequestId] = useState<Record<string, NetworkingReminderState>>({});
  const [reminderDelayByRequestId, setReminderDelayByRequestId] = useState<Record<string, ReminderDelayOption>>({});
  const [reminderSyncStatus, setReminderSyncStatus] = useState<ReminderSyncStatus>('local');
  const [hiddenSuggestionIds, setHiddenSuggestionIds] = useState<Set<string>>(new Set());
  const [hiddenSuggestionSyncStatus, setHiddenSuggestionSyncStatus] = useState<'local' | 'synced' | 'unavailable'>('local');
  const [profilePreview, setProfilePreview] = useState<PublicProfile | null>(null);
  const reminderBackfillAttemptsRef = useRef<Set<string>>(new Set());
  const suggestionStatusRecordedRef = useRef<string | null>(null);
  const reminderStorageKey = useMemo(() => getNetworkingReminderStorageKey(user?.id), [user?.id]);
  const hiddenSuggestionStorageKey = useMemo(() => getHiddenSuggestionStorageKey(user?.id), [user?.id]);
  const profilePreviewDetails = useMemo(() => (
    profilePreview ? buildNetworkingProfilePreview(profilePreview) : null
  ), [profilePreview]);

  const clearActionFailure = (key: string) => {
    setActionFailures(prev => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const setActionFailure = (key: string, failure: NetworkingActionFailure) => {
    setActionFailures(prev => ({
      ...prev,
      [key]: failure,
    }));
  };

  const recordNetworkingAction = useCallback((
    action: NetworkingWorkflowAnalyticsAction,
    extra: Omit<Parameters<typeof recordNetworkingWorkflowAnalytics>[0], 'action' | 'userId'> = {}
  ) => {
    recordNetworkingWorkflowAnalytics({
      userId: user?.id,
      action,
      ...extra,
    });
  }, [user?.id]);

  useEffect(() => {
    if (status === 'idle' && user) {
      dispatch(fetchSuggestions(user.id));
    }
  }, [dispatch, status, user]);

  useEffect(() => {
    const fetchConnectionState = async () => {
      if (!user?.id) return;
      setIsNetworkLoading(true);
      try {
        const [requests, acceptedConnections] = await Promise.all([
          networkingService.getConnectionRequests(user.id),
          networkingService.getConnections(user.id),
        ]);
        setIncomingRequests(requests.incoming);
        setSentRequests(requests.sent);
        setConnections(acceptedConnections);
        setPendingRequests(new Set(requests.sent.map((connection) => connection.receiverId)));
        recordNetworkingAction('networking_connection_state_loaded', {
          entryPoint: 'page_load',
          incomingRequestCount: requests.incoming.length,
          sentRequestCount: requests.sent.length,
          connectionCount: acceptedConnections.length,
          pendingRequestCount: requests.sent.length,
        });
      } catch (networkError) {
        console.error('Failed to load networking requests:', networkError);
        recordNetworkingAction('networking_connection_state_load_failed', {
          entryPoint: 'page_load',
          errorCategory: getNetworkingWorkflowErrorCategory(networkError, 'connection_state_load_failed'),
        });
        addToast({ type: 'error', title: 'Network load failed', message: 'Request state could not be loaded.' });
      } finally {
        setIsNetworkLoading(false);
      }
    };

    fetchConnectionState();
  }, [addToast, recordNetworkingAction, user?.id]);

  useEffect(() => {
    reminderBackfillAttemptsRef.current = new Set();

    try {
      const stored = window.localStorage.getItem(reminderStorageKey);
      const parsed = stored ? JSON.parse(stored) : {};
      const normalizedReminders = normalizeStoredReminders(parsed);
      setRemindersByRequestId(normalizedReminders);
      setReminderSyncStatus(user?.id && Object.keys(normalizedReminders).length > 0 ? 'local' : 'synced');
    } catch (storageError) {
      console.error('Failed to load networking reminders:', storageError);
      recordNetworkingAction('networking_reminders_backfill_failed', {
        entryPoint: 'local_reminder_load',
        reminderSyncStatus: 'local',
        errorCategory: getNetworkingWorkflowErrorCategory(storageError, 'local_reminder_load_failed'),
      });
      setRemindersByRequestId({});
      setReminderSyncStatus('local');
    }
  }, [recordNetworkingAction, reminderStorageKey, user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    const localReminderCount = Object.keys(remindersByRequestId).length;
    if (localReminderCount === 0) {
      setReminderSyncStatus('synced');
      return;
    }

    const plan = buildNetworkingReminderBackfillPlan(remindersByRequestId, sentRequests, user.id)
      .filter(item => !reminderBackfillAttemptsRef.current.has(item.connectionId));

    if (plan.length === 0) return;

    let isActive = true;
    setReminderSyncStatus('syncing');

    Promise.all(plan.map(async item => {
      reminderBackfillAttemptsRef.current.add(item.connectionId);
      const notification = await notificationService.upsertNetworkingReminderNotification(user.id, item);
      return notification.id !== `networking-reminder-${item.connectionId}`;
    }))
      .then(results => {
        if (!isActive) return;
        const syncedCount = results.filter(Boolean).length;
        const nextSyncStatus = results.every(Boolean) ? 'synced' : 'unavailable';
        setReminderSyncStatus(nextSyncStatus);
        recordNetworkingAction(results.every(Boolean) ? 'networking_reminders_backfilled' : 'networking_reminder_sync_failed', {
          entryPoint: 'reminder_backfill',
          reminderSyncStatus: nextSyncStatus,
          reminderCount: localReminderCount,
          attemptedSyncCount: plan.length,
          syncedCount,
          failedCount: plan.length - syncedCount,
          errorCategory: results.every(Boolean) ? undefined : 'notification_sync_unavailable',
        });
      })
      .catch(error => {
        console.warn('Networking reminder backfill stored locally only:', error);
        if (isActive) {
          setReminderSyncStatus('unavailable');
          recordNetworkingAction('networking_reminders_backfill_failed', {
            entryPoint: 'reminder_backfill',
            reminderSyncStatus: 'unavailable',
            reminderCount: localReminderCount,
            attemptedSyncCount: plan.length,
            failedCount: plan.length,
            errorCategory: getNetworkingWorkflowErrorCategory(error, 'notification_sync_failed'),
          });
        }
      });

    return () => {
      isActive = false;
    };
  }, [recordNetworkingAction, remindersByRequestId, sentRequests, user?.id]);

  useEffect(() => {
    if (!profilePreview) return;

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setProfilePreview(null);
      }
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [profilePreview]);

  const readLocalHiddenSuggestionIds = useCallback(() => {
    try {
      const stored = window.localStorage.getItem(hiddenSuggestionStorageKey);
      const parsed = stored ? JSON.parse(stored) : [];
      return new Set(Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []);
    } catch (storageError) {
      console.error('Failed to load hidden networking suggestions:', storageError);
      return new Set<string>();
    }
  }, [hiddenSuggestionStorageKey]);

  const writeLocalHiddenSuggestionIds = useCallback((nextIds: Set<string>) => {
    try {
      window.localStorage.setItem(hiddenSuggestionStorageKey, JSON.stringify(Array.from(nextIds)));
    } catch (storageError) {
      console.error('Failed to save hidden networking suggestions:', storageError);
      recordNetworkingAction('networking_local_state_save_failed', {
        entryPoint: 'hidden_suggestion_storage',
        hiddenSuggestionCount: nextIds.size,
        preferenceSyncStatus: 'local',
        errorCategory: getNetworkingWorkflowErrorCategory(storageError, 'local_storage_failed'),
      });
      addToast({ type: 'error', title: 'Suggestion preference not saved', message: 'Your browser blocked local preference storage.' });
    }
  }, [addToast, hiddenSuggestionStorageKey, recordNetworkingAction]);

  useEffect(() => {
    const localHiddenIds = readLocalHiddenSuggestionIds();
    setHiddenSuggestionIds(localHiddenIds);
    setHiddenSuggestionSyncStatus(user?.id ? 'local' : 'synced');

    if (!user?.id) return;

    let isActive = true;
    const loadAccountHiddenSuggestions = async () => {
      try {
        const serverPreferences = await networkingService.getSuggestionPreferences(user.id);
        if (!isActive) return;

        const mergedHiddenIds = new Set([
          ...Array.from(localHiddenIds),
          ...serverPreferences.map(preference => preference.suggestedUserId),
        ]);

        setHiddenSuggestionIds(mergedHiddenIds);
        writeLocalHiddenSuggestionIds(mergedHiddenIds);
        setHiddenSuggestionSyncStatus('synced');
        recordNetworkingAction('networking_suggestion_preferences_loaded', {
          entryPoint: 'page_load',
          visibleSuggestionCount: profiles.length - mergedHiddenIds.size,
          hiddenSuggestionCount: mergedHiddenIds.size,
          preferenceSyncStatus: 'synced',
        });

        Array.from(localHiddenIds)
          .filter(id => !serverPreferences.some(preference => preference.suggestedUserId === id))
          .forEach(id => {
            networkingService.saveSuggestionPreference(user.id, id).catch(syncError => {
              console.warn('Unable to backfill hidden networking suggestion:', syncError);
              recordNetworkingAction('networking_suggestion_preference_sync_failed', {
                entryPoint: 'hidden_suggestion_backfill',
                hiddenSuggestionCount: mergedHiddenIds.size,
                preferenceSyncStatus: 'unavailable',
                failedCount: 1,
                errorCategory: getNetworkingWorkflowErrorCategory(syncError, 'preference_sync_failed'),
              });
            });
          });
      } catch (preferenceError) {
        console.warn('Using local hidden networking suggestions fallback:', preferenceError);
        if (isActive) {
          setHiddenSuggestionSyncStatus('unavailable');
          recordNetworkingAction('networking_suggestion_preferences_load_failed', {
            entryPoint: 'page_load',
            hiddenSuggestionCount: localHiddenIds.size,
            preferenceSyncStatus: 'unavailable',
            errorCategory: getNetworkingWorkflowErrorCategory(preferenceError, 'preference_load_failed'),
          });
        }
      }
    };

    loadAccountHiddenSuggestions();

    return () => {
      isActive = false;
    };
  }, [profiles.length, readLocalHiddenSuggestionIds, recordNetworkingAction, user?.id, writeLocalHiddenSuggestionIds]);

  const persistReminderState = (nextReminders: Record<string, NetworkingReminderState>) => {
    setRemindersByRequestId(nextReminders);
    setReminderSyncStatus(Object.keys(nextReminders).length > 0 ? 'local' : 'synced');
    try {
      window.localStorage.setItem(reminderStorageKey, JSON.stringify(nextReminders));
    } catch (storageError) {
      console.error('Failed to save networking reminders:', storageError);
      recordNetworkingAction('networking_local_state_save_failed', {
        entryPoint: 'reminder_storage',
        reminderSyncStatus: 'local',
        reminderCount: Object.keys(nextReminders).length,
        errorCategory: getNetworkingWorkflowErrorCategory(storageError, 'local_storage_failed'),
      });
      addToast({ type: 'error', title: 'Reminder not saved', message: 'Your browser blocked local reminder storage.' });
    }
  };

  const persistHiddenSuggestionIds = (nextIds: Set<string>) => {
    setHiddenSuggestionIds(nextIds);
    writeLocalHiddenSuggestionIds(nextIds);
  };

  const pendingRequestIds = useMemo(() => {
    return new Set([
      ...Array.from(pendingRequests),
      ...sentRequests.map((connection) => connection.receiverId)
    ]);
  }, [pendingRequests, sentRequests]);

  const visibleProfiles = useMemo(() => {
    return profiles.filter(profile => !hiddenSuggestionIds.has(profile.id));
  }, [hiddenSuggestionIds, profiles]);

  const filtered = useMemo(() => {
    if (!searchTerm) return visibleProfiles;
    const lowerSearch = searchTerm.toLowerCase();
    return visibleProfiles.filter(p =>
      (p.fullName || '').toLowerCase().includes(lowerSearch) ||
      (p.currentRole || '').toLowerCase().includes(lowerSearch) ||
      (p.location || '').toLowerCase().includes(lowerSearch) ||
      (p.skills || []).some(skill => skill.toLowerCase().includes(lowerSearch)) ||
      (p.recommendationReasons || []).some(reason => reason.toLowerCase().includes(lowerSearch))
    );
  }, [searchTerm, visibleProfiles]);

  useEffect(() => {
    if (!user?.id) return;

    if (status === 'succeeded' && suggestionStatusRecordedRef.current !== 'succeeded') {
      suggestionStatusRecordedRef.current = 'succeeded';
      recordNetworkingAction('networking_suggestions_loaded', {
        entryPoint: 'page_load',
        visibleSuggestionCount: visibleProfiles.length,
        hiddenSuggestionCount: hiddenSuggestionIds.size,
        pendingRequestCount: pendingRequestIds.size,
        searchLength: searchTerm.length,
      });
    }

    if (status === 'failed' && suggestionStatusRecordedRef.current !== `failed:${error || ''}`) {
      suggestionStatusRecordedRef.current = `failed:${error || ''}`;
      recordNetworkingAction('networking_suggestions_load_failed', {
        entryPoint: 'page_load',
        hiddenSuggestionCount: hiddenSuggestionIds.size,
        pendingRequestCount: pendingRequestIds.size,
        errorCategory: getNetworkingWorkflowErrorCategory(error, 'suggestions_load_failed'),
      });
    }
  }, [
    error,
    hiddenSuggestionIds.size,
    pendingRequestIds.size,
    recordNetworkingAction,
    searchTerm.length,
    status,
    user?.id,
    visibleProfiles.length,
  ]);

  const getNetworkingListContext = useCallback(() => ({
    visibleSuggestionCount: visibleProfiles.length,
    hiddenSuggestionCount: hiddenSuggestionIds.size,
    incomingRequestCount: incomingRequests.length,
    sentRequestCount: sentRequests.length,
    connectionCount: connections.length,
    pendingRequestCount: pendingRequestIds.size,
    searchLength: searchTerm.length,
  }), [
    connections.length,
    hiddenSuggestionIds.size,
    incomingRequests.length,
    pendingRequestIds.size,
    searchTerm.length,
    sentRequests.length,
    visibleProfiles.length,
  ]);

  const handleTabChange = (tabId: NetworkTab) => {
    recordNetworkingAction('networking_tab_selected', {
      ...getNetworkingListContext(),
      entryPoint: 'networking_tabs',
      tabId,
    });
    setActiveTab(tabId);
  };

  const handleConnect = async (id: string) => {
    const targetProfile = profiles.find(profile => profile.id === id);
    const requestNote = requestMessages[id]?.trim() || '';
    const failureKey = `connect:${id}`;
    if (!user) {
        setActionFailure(failureKey, {
          title: 'Connection request was not sent',
          message: 'Sign in before sending a connection request.',
        });
        recordNetworkingAction('networking_connect_request_failed', {
          ...getNetworkingListContext(),
          requestDirection: 'discover',
          requestStatus: 'failed',
          hasRequestNote: requestNote.length > 0,
          requestNoteLength: requestNote.length,
          ...getProfileAnalyticsMetadata(targetProfile),
          errorCategory: 'auth_required',
        });
        addToast({ type: 'warning', title: 'Login Required', message: 'Please log in to connect with others.' });
        return;
    }

    clearActionFailure(failureKey);
    setActionLoadingIds(prev => new Set(prev).add(id));
    try {
        const connection = await networkingService.sendConnectionRequest(id, user.id, requestNote || undefined);
        setPendingRequests(prev => new Set(prev).add(id));
        setSentRequests(prev => [connection, ...prev.filter(item => item.receiverId !== id)]);
        setRequestMessages(prev => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
        clearActionFailure(failureKey);
        recordNetworkingAction('networking_connect_request_sent', {
          ...getNetworkingListContext(),
          requestDirection: 'discover',
          requestStatus: 'pending',
          hasRequestNote: requestNote.length > 0,
          requestNoteLength: requestNote.length,
          ...getProfileAnalyticsMetadata(targetProfile),
        });
        addToast({ type: 'success', title: 'Request Sent', message: 'Connection request has been sent.' });
    } catch (error) {
        console.error('Connection failed:', error);
        recordNetworkingAction('networking_connect_request_failed', {
          ...getNetworkingListContext(),
          requestDirection: 'discover',
          requestStatus: 'failed',
          hasRequestNote: requestNote.length > 0,
          requestNoteLength: requestNote.length,
          ...getProfileAnalyticsMetadata(targetProfile),
          errorCategory: getNetworkingWorkflowErrorCategory(error, 'connection_request_failed'),
        });
        setActionFailure(failureKey, {
          title: 'Connection request was not sent',
          message: networkingConnectFailureMessage,
        });
        addToast({ type: 'error', title: 'Request Failed', message: 'Please try again later.' });
    } finally {
        setActionLoadingIds(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
    }
  };

  const handleAccept = async (connection: Connection) => {
    const person = getConnectionPerson(connection, user?.id);
    const failureKey = `incoming:${connection.id}`;
    clearActionFailure(failureKey);
    setActionLoadingIds(prev => new Set(prev).add(connection.id));
    try {
      await networkingService.acceptConnectionRequest(connection.id);
      const acceptedConnection = { ...connection, status: 'ACCEPTED' as const, updatedAt: new Date().toISOString() };
      setIncomingRequests(prev => prev.filter(item => item.id !== connection.id));
      setConnections(prev => [acceptedConnection, ...prev]);
      clearActionFailure(failureKey);
      recordNetworkingAction('networking_incoming_request_accepted', {
        ...getNetworkingListContext(),
        requestDirection: 'incoming',
        requestStatus: 'accepted',
        hasRequestNote: Boolean(connection.message),
        requestNoteLength: connection.message?.length || 0,
        ...getProfileAnalyticsMetadata(person),
      });
      addToast({ type: 'success', title: 'Connection accepted', message: 'This person is now in your network.' });
    } catch (acceptError) {
      console.error('Accept connection failed:', acceptError);
      recordNetworkingAction('networking_incoming_request_accept_failed', {
        ...getNetworkingListContext(),
        requestDirection: 'incoming',
        requestStatus: 'failed',
        hasRequestNote: Boolean(connection.message),
        requestNoteLength: connection.message?.length || 0,
        ...getProfileAnalyticsMetadata(person),
        errorCategory: getNetworkingWorkflowErrorCategory(acceptError, 'accept_request_failed'),
      });
      setActionFailure(failureKey, {
        title: 'Connection request was not accepted',
        message: networkingAcceptFailureMessage,
      });
      addToast({ type: 'error', title: 'Accept failed', message: 'Please try again later.' });
    } finally {
      setActionLoadingIds(prev => {
        const next = new Set(prev);
        next.delete(connection.id);
        return next;
      });
    }
  };

  const handleReject = async (connection: Connection, mode: 'reject' | 'withdraw') => {
    const person = getConnectionPerson(connection, user?.id);
    const failureKey = mode === 'reject' ? `incoming:${connection.id}` : `sent:${connection.id}`;
    clearActionFailure(failureKey);
    setActionLoadingIds(prev => new Set(prev).add(connection.id));
    try {
      await networkingService.rejectConnectionRequest(connection.id);
      if (mode === 'reject') {
        setIncomingRequests(prev => prev.filter(item => item.id !== connection.id));
        clearActionFailure(failureKey);
        recordNetworkingAction('networking_incoming_request_declined', {
          ...getNetworkingListContext(),
          requestDirection: 'incoming',
          requestStatus: 'declined',
          hasRequestNote: Boolean(connection.message),
          requestNoteLength: connection.message?.length || 0,
          ...getProfileAnalyticsMetadata(person),
        });
        addToast({ type: 'success', title: 'Request declined', message: 'The connection request was declined.' });
      } else {
        setSentRequests(prev => prev.filter(item => item.id !== connection.id));
        clearActionFailure(failureKey);
        setPendingRequests(prev => {
          const next = new Set(prev);
          next.delete(connection.receiverId);
          return next;
        });
        if (remindersByRequestId[connection.id]) {
          const nextReminders = { ...remindersByRequestId };
          delete nextReminders[connection.id];
          persistReminderState(nextReminders);
          if (user?.id) {
            void notificationService.clearNetworkingReminderNotification(user.id, connection.id);
          }
        }
        recordNetworkingAction('networking_sent_request_withdrawn', {
          ...getNetworkingListContext(),
          requestDirection: 'sent',
          requestStatus: 'withdrawn',
          hasRequestNote: Boolean(connection.message),
          requestNoteLength: connection.message?.length || 0,
          reminderCount: Object.keys(remindersByRequestId).length,
          ...getProfileAnalyticsMetadata(person),
        });
        addToast({ type: 'success', title: 'Request withdrawn', message: 'Your pending request was withdrawn.' });
      }
    } catch (rejectError) {
      console.error('Connection update failed:', rejectError);
      recordNetworkingAction(mode === 'reject' ? 'networking_incoming_request_decline_failed' : 'networking_sent_request_withdraw_failed', {
        ...getNetworkingListContext(),
        requestDirection: mode === 'reject' ? 'incoming' : 'sent',
        requestStatus: 'failed',
        hasRequestNote: Boolean(connection.message),
        requestNoteLength: connection.message?.length || 0,
        ...getProfileAnalyticsMetadata(person),
        errorCategory: getNetworkingWorkflowErrorCategory(rejectError, mode === 'reject' ? 'decline_request_failed' : 'withdraw_request_failed'),
      });
      setActionFailure(failureKey, {
        title: mode === 'reject' ? 'Connection request was not declined' : 'Sent request was not withdrawn',
        message: mode === 'reject' ? networkingDeclineFailureMessage : networkingWithdrawFailureMessage,
      });
      addToast({ type: 'error', title: 'Update failed', message: 'Please try again later.' });
    } finally {
      setActionLoadingIds(prev => {
        const next = new Set(prev);
        next.delete(connection.id);
        return next;
      });
    }
  };

  const toggleRequestReminder = (connection: Connection) => {
    const person = getConnectionPerson(connection, user?.id);
    const nextReminders = { ...remindersByRequestId };
    const existingReminder = nextReminders[connection.id];
    if (nextReminders[connection.id]) {
      const reminderDelay = existingReminder?.delay || reminderDelayByRequestId[connection.id] || defaultReminderDelay;
      delete nextReminders[connection.id];
      reminderBackfillAttemptsRef.current.delete(connection.id);
      if (user?.id) {
        void notificationService.clearNetworkingReminderNotification(user.id, connection.id)
          .catch(reminderError => {
            console.warn('Networking reminder notification clear used local fallback:', reminderError);
            recordNetworkingAction('networking_reminder_sync_failed', {
              ...getNetworkingListContext(),
              entryPoint: 'reminder_clear',
              requestDirection: 'sent',
              reminderDelay,
              reminderSyncStatus: 'unavailable',
              reminderCount: Object.keys(nextReminders).length,
              failedCount: 1,
              ...getProfileAnalyticsMetadata(person),
              errorCategory: getNetworkingWorkflowErrorCategory(reminderError, 'notification_clear_failed'),
            });
          });
      }
      recordNetworkingAction('networking_reminder_cleared', {
        ...getNetworkingListContext(),
        entryPoint: 'sent_request_card',
        requestDirection: 'sent',
        reminderDelay,
        reminderSyncStatus: user?.id ? 'syncing' : 'local',
        reminderCount: Object.keys(nextReminders).length,
        ...getProfileAnalyticsMetadata(person),
      });
      addToast({ type: 'success', title: 'Reminder cleared', message: 'This follow-up reminder was removed.' });
    } else {
      const delay = reminderDelayByRequestId[connection.id] || defaultReminderDelay;
      const dueAt = getReminderDueAt(delay);
      nextReminders[connection.id] = { dueAt, delay };
      const dueLabel = formatReminderDueLabel(dueAt).toLowerCase();
      recordNetworkingAction('networking_reminder_set', {
        ...getNetworkingListContext(),
        entryPoint: 'sent_request_card',
        requestDirection: 'sent',
        reminderDelay: delay,
        reminderSyncStatus: user?.id ? 'syncing' : 'local',
        reminderCount: Object.keys(nextReminders).length,
        ...getProfileAnalyticsMetadata(person),
      });
      if (user?.id) {
        reminderBackfillAttemptsRef.current.add(connection.id);
        setReminderSyncStatus('syncing');
        void notificationService.upsertNetworkingReminderNotification(user.id, {
          connectionId: connection.id,
          recipientId: connection.receiverId,
          recipientName: person?.fullName,
          remindAt: dueAt,
        }).then((notification) => {
          if (notification.id === `networking-reminder-${connection.id}`) {
            setReminderSyncStatus('unavailable');
            recordNetworkingAction('networking_reminder_sync_failed', {
              ...getNetworkingListContext(),
              entryPoint: 'reminder_set',
              requestDirection: 'sent',
              reminderDelay: delay,
              reminderSyncStatus: 'unavailable',
              reminderCount: Object.keys(nextReminders).length,
              attemptedSyncCount: 1,
              failedCount: 1,
              ...getProfileAnalyticsMetadata(person),
              errorCategory: 'notification_sync_unavailable',
            });
            addToast({ type: 'warning', title: 'Reminder saved locally', message: `This follow-up is ${dueLabel}, but notification sync is unavailable.` });
            return;
          }
          setReminderSyncStatus('synced');
          recordNetworkingAction('networking_reminder_sync_completed', {
            ...getNetworkingListContext(),
            entryPoint: 'reminder_set',
            requestDirection: 'sent',
            reminderDelay: delay,
            reminderSyncStatus: 'synced',
            reminderCount: Object.keys(nextReminders).length,
            attemptedSyncCount: 1,
            syncedCount: 1,
            ...getProfileAnalyticsMetadata(person),
          });
          addToast({ type: 'success', title: 'Reminder saved', message: `A follow-up reminder was added to notifications for ${dueLabel}.` });
        }).catch(reminderError => {
          console.warn('Networking reminder notification stored locally only:', reminderError);
          setReminderSyncStatus('unavailable');
          recordNetworkingAction('networking_reminder_sync_failed', {
            ...getNetworkingListContext(),
            entryPoint: 'reminder_set',
            requestDirection: 'sent',
            reminderDelay: delay,
            reminderSyncStatus: 'unavailable',
            reminderCount: Object.keys(nextReminders).length,
            attemptedSyncCount: 1,
            failedCount: 1,
            ...getProfileAnalyticsMetadata(person),
            errorCategory: getNetworkingWorkflowErrorCategory(reminderError, 'notification_sync_failed'),
          });
          addToast({ type: 'warning', title: 'Reminder saved locally', message: `This follow-up is ${dueLabel}, but notification sync is unavailable.` });
        });
      } else {
        addToast({ type: 'success', title: 'Reminder saved', message: `This follow-up reminder is stored locally for ${dueLabel}.` });
      }
    }
    persistReminderState(nextReminders);
  };

  const hideSuggestion = (profile: PublicProfile) => {
    const nextIds = new Set(hiddenSuggestionIds);
    nextIds.add(profile.id);
    persistHiddenSuggestionIds(nextIds);
    recordNetworkingAction('networking_suggestion_hidden', {
      ...getNetworkingListContext(),
      entryPoint: 'discover_card',
      requestDirection: 'discover',
      visibleSuggestionCount: Math.max(0, visibleProfiles.length - 1),
      hiddenSuggestionCount: nextIds.size,
      preferenceSyncStatus: user?.id ? 'local' : 'synced',
      ...getProfileAnalyticsMetadata(profile),
    });

    if (user?.id) {
      void networkingService.saveSuggestionPreference(user.id, profile.id)
        .then(() => setHiddenSuggestionSyncStatus('synced'))
        .catch(preferenceError => {
          console.warn('Hidden networking suggestion stored locally only:', preferenceError);
          setHiddenSuggestionSyncStatus('unavailable');
          recordNetworkingAction('networking_suggestion_preference_sync_failed', {
            ...getNetworkingListContext(),
            entryPoint: 'hide_suggestion',
            requestDirection: 'discover',
            hiddenSuggestionCount: nextIds.size,
            preferenceSyncStatus: 'unavailable',
            failedCount: 1,
            ...getProfileAnalyticsMetadata(profile),
            errorCategory: getNetworkingWorkflowErrorCategory(preferenceError, 'preference_sync_failed'),
          });
          addToast({ type: 'warning', title: 'Hidden locally', message: 'Account networking preference sync is unavailable.' });
        });
    }

    addToast({ type: 'success', title: 'Suggestion hidden', message: 'This profile was removed from Discover.' });
  };

  const restoreHiddenSuggestions = () => {
    const restoredCount = hiddenSuggestionIds.size;
    persistHiddenSuggestionIds(new Set());
    recordNetworkingAction('networking_hidden_suggestions_restored', {
      ...getNetworkingListContext(),
      entryPoint: 'page_header',
      visibleSuggestionCount: visibleProfiles.length + restoredCount,
      hiddenSuggestionCount: 0,
      preferenceSyncStatus: user?.id ? 'local' : 'synced',
      restoredCount,
    });

    if (user?.id) {
      void networkingService.clearSuggestionPreferences(user.id)
        .then(() => setHiddenSuggestionSyncStatus('synced'))
        .catch(preferenceError => {
          console.warn('Hidden networking suggestions restored locally only:', preferenceError);
          setHiddenSuggestionSyncStatus('unavailable');
          recordNetworkingAction('networking_suggestion_preference_sync_failed', {
            ...getNetworkingListContext(),
            entryPoint: 'restore_hidden_suggestions',
            hiddenSuggestionCount: 0,
            preferenceSyncStatus: 'unavailable',
            restoredCount,
            failedCount: 1,
            errorCategory: getNetworkingWorkflowErrorCategory(preferenceError, 'preference_restore_failed'),
          });
          addToast({ type: 'warning', title: 'Restored locally', message: 'Account networking preference sync is unavailable.' });
        });
    }

    addToast({ type: 'success', title: 'Suggestions restored', message: 'Hidden Discover suggestions are visible again.' });
  };

  const previewProfile = (profile?: PublicProfile, entryPoint = 'networking_card') => {
    if (!profile) return;
    recordNetworkingAction('networking_profile_preview_opened', {
      ...getNetworkingListContext(),
      entryPoint,
      requestDirection: getNetworkingDirectionForTab(activeTab),
      ...getProfileAnalyticsMetadata(profile),
    });
    setProfilePreview(profile);
  };

  const openFullProfile = (profile?: PublicProfile | null) => {
    const profilePath = getNetworkingProfilePath(profile);
    if (!profilePath) return;
    recordNetworkingAction('networking_full_profile_opened', {
      ...getNetworkingListContext(),
      entryPoint: 'profile_preview_modal',
      requestDirection: getNetworkingDirectionForTab(activeTab),
      ...getProfileAnalyticsMetadata(profile),
    });
    window.open(profilePath, '_blank', 'noopener,noreferrer');
  };

  const handleNetworkLoadRetry = () => {
    if (!user?.id) return;
    void dispatch(fetchSuggestions(user.id));
  };

  const filteredIncoming = useMemo(() => {
    if (!searchTerm) return incomingRequests;
    const lowerSearch = searchTerm.toLowerCase();
    return incomingRequests.filter(connection => {
      const person = getConnectionPerson(connection, user?.id);
      return (person?.fullName || '').toLowerCase().includes(lowerSearch) ||
        (person?.currentRole || '').toLowerCase().includes(lowerSearch);
    });
  }, [incomingRequests, searchTerm, user?.id]);

  const filteredSent = useMemo(() => {
    if (!searchTerm) return sentRequests;
    const lowerSearch = searchTerm.toLowerCase();
    return sentRequests.filter(connection => {
      const person = getConnectionPerson(connection, user?.id);
      return (person?.fullName || '').toLowerCase().includes(lowerSearch) ||
        (person?.currentRole || '').toLowerCase().includes(lowerSearch);
    });
  }, [searchTerm, sentRequests, user?.id]);

  const filteredConnections = useMemo(() => {
    if (!searchTerm) return connections;
    const lowerSearch = searchTerm.toLowerCase();
    return connections.filter(connection => {
      const person = getConnectionPerson(connection, user?.id);
      return (person?.fullName || '').toLowerCase().includes(lowerSearch) ||
        (person?.currentRole || '').toLowerCase().includes(lowerSearch);
    });
  }, [connections, searchTerm, user?.id]);

  if (status === 'failed') {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Network"
          description="Review suggestions, connection requests, and follow-up reminders."
        />
        <EmptyState
          icon={<AlertTriangle className="h-12 w-12 text-warning" aria-hidden="true" />}
          title="Network could not load"
          description="Networking suggestions did not respond. Retry to reload professional suggestions and connection context."
          action={user?.id ? { label: 'Retry network', onClick: handleNetworkLoadRetry } : undefined}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Network"
        description="Review suggestions, connection requests, and follow-up reminders."
      />

      <div className={networkingPanelClassName}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-wrap items-center gap-1" role="tablist" aria-label="Networking views">
            {tabs.map((tab) => {
              const count = tab.id === 'incoming'
                ? incomingRequests.length
                : tab.id === 'sent'
                  ? sentRequests.length
                  : tab.id === 'connections'
                    ? connections.length
                    : visibleProfiles.length;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-[var(--bg-primary)] text-accent'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {tab.label}
                  <span className="text-[10px] text-[var(--text-muted)]">{count}</span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {hiddenSuggestionIds.size > 0 && (
              <Button variant="outline" size="sm" onClick={restoreHiddenSuggestions}>
                Show hidden
              </Button>
            )}
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
              <input
                type="text"
                aria-label="Search network"
                placeholder="Search people..."
                className={networkingSearchFieldClassName}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        <p role="status" aria-live="polite" className="mt-3 text-xs text-[var(--text-secondary)]">
          {activeTab === 'discover'
            ? `${filtered.length} visible suggestions, ${hiddenSuggestionIds.size} hidden`
            : activeTab === 'incoming'
              ? `${filteredIncoming.length} incoming requests`
              : activeTab === 'sent'
                ? `${filteredSent.length} sent requests, ${Object.keys(remindersByRequestId).length} follow-up reminders`
                : `${filteredConnections.length} accepted connections`}
        </p>
      </div>

      {activeTab === 'discover' && hiddenSuggestionIds.size > 0 && (
        <div className={`${networkingInsetClassName} text-xs text-[var(--text-secondary)]`} role="status">
          {hiddenSuggestionSyncStatus === 'synced'
            ? `${hiddenSuggestionIds.size} hidden ${hiddenSuggestionIds.size === 1 ? 'suggestion is' : 'suggestions are'} synced to this account.`
            : hiddenSuggestionSyncStatus === 'unavailable'
              ? `${hiddenSuggestionIds.size} hidden ${hiddenSuggestionIds.size === 1 ? 'suggestion is' : 'suggestions are'} stored locally until account sync is available.`
              : `${hiddenSuggestionIds.size} hidden ${hiddenSuggestionIds.size === 1 ? 'suggestion' : 'suggestions'} in this browser.`}
        </div>
      )}

      {activeTab === 'sent' && Object.keys(remindersByRequestId).length > 0 && (
        <div className={`${networkingInsetClassName} text-xs text-[var(--text-secondary)]`} role="status">
          {reminderSyncStatus === 'synced'
            ? `${Object.keys(remindersByRequestId).length} follow-up ${Object.keys(remindersByRequestId).length === 1 ? 'reminder is' : 'reminders are'} synced to account notifications.`
            : reminderSyncStatus === 'syncing'
              ? 'Syncing local follow-up reminders to account notifications...'
              : reminderSyncStatus === 'unavailable'
                ? 'Follow-up reminders are stored locally until notification sync is available.'
                : 'Follow-up reminders are stored in this browser and will sync to account notifications when available.'}
        </div>
      )}

      {(status === 'loading' && activeTab === 'discover') || (isNetworkLoading && activeTab !== 'discover') ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => (
            <Card key={i} className={networkingRecordCardClassName}>
              <div className="flex items-center gap-3 mb-3">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div><Skeleton className="h-4 w-28 mb-1" /><Skeleton className="h-3 w-20" /></div>
              </div>
              <Skeleton className="h-8 w-full" />
            </Card>
          ))}
        </div>
      ) : activeTab === 'discover' && filtered.length === 0 ? (
        <EmptyState title="No results" description="Try a different search term." />
      ) : activeTab === 'discover' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((profile) => (
            <Card key={profile.id} className={networkingDiscoverCardClassName}>
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent/10 text-sm font-semibold text-accent">
                    {profile.avatarUrl ? (
                      <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      getInitials(profile.fullName)
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{profile.fullName || 'Unknown User'}</p>
                    <p className="truncate text-xs text-[var(--text-muted)]">{profile.currentRole || 'Professional'}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {typeof profile.recommendationScore === 'number' && (
                    <Badge variant="outline">{profile.recommendationScore}% fit</Badge>
                  )}
                  <Button variant="ghost" size="icon" aria-label={`Preview ${profile.fullName || 'profile'}`} onClick={() => previewProfile(profile, 'discover_card')}>
                    <ExternalLink size={14} />
                  </Button>
                  <Button variant="ghost" size="icon" aria-label={`Hide suggestion ${profile.fullName || 'profile'}`} onClick={() => hideSuggestion(profile)}>
                    <X size={14} />
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] mb-3">
                <MapPin size={12} /> {profile.location || 'Unknown Location'}
              </div>
              {Boolean(profile.mutualConnections) && (
                <div className="mb-3 flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                  <Users size={12} />
                  <span>
                    {profile.mutualConnections} mutual {profile.mutualConnections === 1 ? 'connection' : 'connections'}
                  </span>
                </div>
              )}
              {profile.headline && (
                <p className="text-xs text-[var(--text-secondary)] mb-3 line-clamp-2">{profile.headline}</p>
              )}
              <div className={`mb-3 ${networkingInsetClassName}`}>
                <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium text-[var(--text-secondary)]">
                  <Lightbulb size={12} className="text-accent" />
                  <span>Why suggested</span>
                </div>
                <ul className="space-y-1">
                  {getProfileSuggestionReasons(profile).map((reason) => (
                    <li key={reason} className="text-[11px] text-[var(--text-muted)]">{reason}</li>
                  ))}
                </ul>
              </div>
              {(profile.sharedSkills?.length || profile.skills?.length) ? (
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {(profile.sharedSkills?.length ? profile.sharedSkills : profile.skills || []).slice(0, 4).map((skill) => (
                    <Badge key={skill} variant={profile.sharedSkills?.includes(skill) ? 'success' : 'outline'}>
                      {skill}
                    </Badge>
                  ))}
                </div>
              ) : null}
              <label htmlFor={`request-note-${profile.id}`} className="sr-only">Connection note for {profile.fullName || 'profile'}</label>
              <textarea
                id={`request-note-${profile.id}`}
                value={requestMessages[profile.id] || ''}
                onChange={(event) => {
                  clearActionFailure(`connect:${profile.id}`);
                  setRequestMessages(prev => ({ ...prev, [profile.id]: event.target.value }));
                }}
                placeholder="Optional note"
                rows={2}
                disabled={pendingRequestIds.has(profile.id)}
                className="mb-3 min-h-16 w-full resize-none rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)] px-3 py-2 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:opacity-60"
              />
              {actionFailures[`connect:${profile.id}`] && (
                <div className="mb-3">
                  <NetworkingActionFailureAlert {...actionFailures[`connect:${profile.id}`]} />
                </div>
              )}
              <Button
                variant={pendingRequestIds.has(profile.id) ? 'secondary' : 'default'}
                size="sm"
                className="mt-auto w-full"
                onClick={() => handleConnect(profile.id)}
                disabled={pendingRequestIds.has(profile.id)}
                isLoading={actionLoadingIds.has(profile.id)}
              >
                {pendingRequestIds.has(profile.id) ? (
                  'Request Sent'
                ) : (
                  <><UserPlus size={14} className="mr-1" /> Connect</>
                )}
              </Button>
            </Card>
          ))}
        </div>
      ) : activeTab === 'incoming' && filteredIncoming.length === 0 ? (
        <EmptyState title="No incoming requests" description="New connection requests will appear here." icon={<UserCheck size={24} />} />
      ) : activeTab === 'incoming' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredIncoming.map((connection) => {
            const person = getConnectionPerson(connection, user?.id);
            return (
              <Card key={connection.id} className={networkingRecordCardClassName}>
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/10 text-sm font-semibold text-accent">
                      {getInitials(person?.fullName)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{person?.fullName || 'Unknown User'}</p>
                      <p className="truncate text-xs text-[var(--text-muted)]">{person?.currentRole || person?.headline || 'Professional'}</p>
                    </div>
                  </div>
                  <Badge variant="warning"><Clock size={11} className="mr-1" /> Pending</Badge>
                </div>
                {person?.location && (
                  <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] mb-3">
                    <MapPin size={12} /> {person.location}
                  </div>
                )}
                {connection.message && (
                  <p className={`mb-4 text-xs text-[var(--text-secondary)] ${networkingInsetClassName}`}>
                    {connection.message}
                  </p>
                )}
                <div className="mb-4 flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                  <Clock size={12} />
                  <span>Received {formatConnectionAge(connection.createdAt)}</span>
                </div>
                {actionFailures[`incoming:${connection.id}`] && (
                  <div className="mb-3">
                    <NetworkingActionFailureAlert {...actionFailures[`incoming:${connection.id}`]} />
                  </div>
                )}
                <div className="mt-auto grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" onClick={() => previewProfile(person, 'incoming_request_card')}>
                    <ExternalLink size={13} />
                    Profile
                  </Button>
                  <Button size="sm" onClick={() => handleAccept(connection)} isLoading={actionLoadingIds.has(connection.id)}>
                    <Check size={13} />
                    Accept
                  </Button>
                  <Button variant="destructive" size="sm" className="col-span-2" onClick={() => handleReject(connection, 'reject')} disabled={actionLoadingIds.has(connection.id)}>
                    <X size={13} />
                    Decline
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      ) : activeTab === 'sent' && filteredSent.length === 0 ? (
        <EmptyState title="No sent requests" description="Requests you send will appear here." icon={<Clock size={24} />} />
      ) : activeTab === 'sent' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSent.map((connection) => {
            const person = getConnectionPerson(connection, user?.id);
            const reminderState = remindersByRequestId[connection.id];
            const hasReminder = Boolean(reminderState);
            const selectedReminderDelay = reminderDelayByRequestId[connection.id] || reminderState?.delay || defaultReminderDelay;
            return (
              <Card key={connection.id} className={networkingRecordCardClassName}>
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/10 text-sm font-semibold text-accent">
                      {getInitials(person?.fullName)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{person?.fullName || 'Unknown User'}</p>
                      <p className="truncate text-xs text-[var(--text-muted)]">{person?.currentRole || person?.headline || 'Professional'}</p>
                    </div>
                  </div>
                  <Badge variant="warning"><Clock size={11} className="mr-1" /> Sent</Badge>
                </div>
                {connection.message && (
                  <p className={`mb-4 text-xs text-[var(--text-secondary)] ${networkingInsetClassName}`}>
                    {connection.message}
                  </p>
                )}
                <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
                  <span className="inline-flex items-center gap-1.5">
                    <Clock size={12} />
                    Sent {formatConnectionAge(connection.createdAt)}
                  </span>
                  {hasReminder && (
                    <Badge variant="outline"><Bell size={11} className="mr-1" /> {formatReminderDueLabel(reminderState?.dueAt)}</Badge>
                  )}
                </div>
                {actionFailures[`sent:${connection.id}`] && (
                  <div className="mb-3">
                    <NetworkingActionFailureAlert {...actionFailures[`sent:${connection.id}`]} />
                  </div>
                )}
                <div className="mt-auto grid grid-cols-2 gap-2">
                  <label htmlFor={`reminder-delay-${connection.id}`} className="sr-only">
                    Reminder timing for {person?.fullName || 'this request'}
                  </label>
                  <select
                    id={`reminder-delay-${connection.id}`}
                    value={selectedReminderDelay}
                    onChange={(event) => setReminderDelayByRequestId(prev => ({
                      ...prev,
                      [connection.id]: event.target.value as ReminderDelayOption,
                    }))}
                    disabled={hasReminder}
                    className="col-span-2 h-9 rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)] px-3 text-xs text-[var(--text-primary)] outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:opacity-60"
                  >
                    {reminderDelayOptions.map(option => (
                      <option key={option.id} value={option.id}>{option.label}</option>
                    ))}
                  </select>
                  <Button variant="outline" size="sm" onClick={() => previewProfile(person, 'sent_request_card')}>
                    <ExternalLink size={13} />
                    Profile
                  </Button>
                  <Button
                    variant={hasReminder ? 'secondary' : 'outline'}
                    size="sm"
                    onClick={() => toggleRequestReminder(connection)}
                  >
                    <Bell size={13} />
                    {hasReminder ? 'Clear Reminder' : 'Remind Me'}
                  </Button>
                  <Button variant="destructive" size="sm" className="col-span-2" onClick={() => handleReject(connection, 'withdraw')} isLoading={actionLoadingIds.has(connection.id)}>
                    <X size={13} />
                    Withdraw
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      ) : filteredConnections.length === 0 ? (
        <EmptyState title="No connections yet" description="Accepted connections will appear here." icon={<Users size={24} />} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredConnections.map((connection) => {
            const person = getConnectionPerson(connection, user?.id);
            return (
              <Card key={connection.id} className={networkingRecordCardClassName}>
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success-muted text-sm font-semibold text-success">
                      {getInitials(person?.fullName)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{person?.fullName || 'Unknown User'}</p>
                      <p className="truncate text-xs text-[var(--text-muted)]">{person?.currentRole || person?.headline || 'Professional'}</p>
                    </div>
                  </div>
                  <Badge variant="success"><UserCheck size={11} className="mr-1" /> Connected</Badge>
                </div>
                {person?.location && (
                  <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] mb-4">
                    <MapPin size={12} /> {person.location}
                  </div>
                )}
                <Button variant="outline" size="sm" className="mt-auto w-full" onClick={() => previewProfile(person, 'connection_card')}>
                  <ExternalLink size={13} />
                  Open Profile
                </Button>
              </Card>
            );
          })}
        </div>
      )}

      {profilePreview && profilePreviewDetails && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-[var(--bg-overlay)] backdrop-blur-sm"
            aria-hidden="true"
            onMouseDown={() => setProfilePreview(null)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="networking-profile-preview-title"
            className="surface-card relative w-full max-w-2xl overflow-hidden"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-[var(--border-default)] px-5 py-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent/10 text-sm font-semibold text-accent">
                  {profilePreview.avatarUrl ? (
                    <img src={profilePreview.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    profilePreviewDetails.initials
                  )}
                </div>
                <div className="min-w-0">
                  <h2 id="networking-profile-preview-title" className="truncate text-base font-semibold text-[var(--text-primary)]">
                    {profilePreviewDetails.displayName}
                  </h2>
                  <p className="truncate text-sm text-[var(--text-muted)]">{profilePreviewDetails.role}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" aria-label="Close profile preview" onClick={() => setProfilePreview(null)}>
                <X size={18} />
              </Button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                {profilePreviewDetails.fitLabel && <Badge variant="outline">{profilePreviewDetails.fitLabel}</Badge>}
                {profilePreviewDetails.mutualConnectionLabel && <Badge variant="outline">{profilePreviewDetails.mutualConnectionLabel}</Badge>}
                <Badge variant="outline"><MapPin size={11} className="mr-1" /> {profilePreviewDetails.location}</Badge>
              </div>

              {(profilePreviewDetails.headline || profilePreviewDetails.summary) && (
                <div className={`mb-4 ${networkingInsetClassName}`}>
                  {profilePreviewDetails.headline && (
                    <p className="text-sm font-medium text-[var(--text-primary)]">{profilePreviewDetails.headline}</p>
                  )}
                  {profilePreviewDetails.summary && (
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">{profilePreviewDetails.summary}</p>
                  )}
                </div>
              )}

              {profilePreviewDetails.reasons.length > 0 && (
                <div className="mb-4">
                  <p className="mb-2 text-xs font-semibold uppercase text-[var(--text-muted)]">Why suggested</p>
                  <ul className="space-y-2">
                    {profilePreviewDetails.reasons.map((reason) => (
                      <li key={reason} className="rounded-md border border-[var(--border-default)] px-3 py-2 text-sm text-[var(--text-secondary)]">
                        {reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {(profilePreviewDetails.sharedSkills.length > 0 || profilePreviewDetails.skills.length > 0) && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase text-[var(--text-muted)]">
                    {profilePreviewDetails.sharedSkills.length > 0 ? 'Shared skills' : 'Skills'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(profilePreviewDetails.sharedSkills.length > 0 ? profilePreviewDetails.sharedSkills : profilePreviewDetails.skills).map((skill) => (
                      <Badge key={skill} variant={profilePreviewDetails.sharedSkills.includes(skill) ? 'success' : 'outline'}>
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[var(--border-default)] px-5 py-4">
              <Button variant="outline" onClick={() => setProfilePreview(null)}>Close</Button>
              <Button onClick={() => openFullProfile(profilePreview)} disabled={!profilePreviewDetails.profilePath}>
                <ExternalLink size={14} />
                Full Profile
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NetworkingPage;
