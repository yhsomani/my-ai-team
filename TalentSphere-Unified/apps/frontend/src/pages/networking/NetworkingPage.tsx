import React, { useState, useEffect, useMemo } from 'react';
import { Check, Clock, ExternalLink, MapPin, Search, UserCheck, UserPlus, Users, X } from 'lucide-react';
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
import { Connection, PublicProfile } from '../../types/networking';

type NetworkTab = 'discover' | 'incoming' | 'sent' | 'connections';

const tabs: Array<{ id: NetworkTab; label: string }> = [
  { id: 'discover', label: 'Discover' },
  { id: 'incoming', label: 'Incoming' },
  { id: 'sent', label: 'Sent' },
  { id: 'connections', label: 'Connections' },
];

const getInitials = (name?: string) => {
  return (name || 'U')
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

const getConnectionPerson = (connection: Connection, currentUserId?: string): PublicProfile | undefined => {
  return connection.requesterId === currentUserId ? connection.recipient : connection.requester;
};

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
  const [isNetworkLoading, setIsNetworkLoading] = useState(false);

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
      } catch (networkError) {
        console.error('Failed to load networking requests:', networkError);
        addToast({ type: 'error', title: 'Network load failed', message: 'Request state could not be loaded.' });
      } finally {
        setIsNetworkLoading(false);
      }
    };

    fetchConnectionState();
  }, [addToast, user?.id]);

  const pendingRequestIds = useMemo(() => {
    return new Set([
      ...Array.from(pendingRequests),
      ...sentRequests.map((connection) => connection.receiverId)
    ]);
  }, [pendingRequests, sentRequests]);

  const filtered = useMemo(() => {
    if (!searchTerm) return profiles;
    const lowerSearch = searchTerm.toLowerCase();
    return profiles.filter(p =>
      (p.fullName || '').toLowerCase().includes(lowerSearch) ||
      (p.currentRole || '').toLowerCase().includes(lowerSearch)
    );
  }, [profiles, searchTerm]);

  const handleConnect = async (id: string) => {
    if (!user) {
        addToast({ type: 'warning', title: 'Login Required', message: 'Please log in to connect with others.' });
        return;
    }
    
    setActionLoadingIds(prev => new Set(prev).add(id));
    try {
        const connection = await networkingService.sendConnectionRequest(id, user.id, requestMessages[id]?.trim() || undefined);
        setPendingRequests(prev => new Set(prev).add(id));
        setSentRequests(prev => [connection, ...prev.filter(item => item.receiverId !== id)]);
        setRequestMessages(prev => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
        addToast({ type: 'success', title: 'Request Sent', message: 'Connection request has been sent.' });
    } catch (error) {
        console.error('Connection failed:', error);
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
    setActionLoadingIds(prev => new Set(prev).add(connection.id));
    try {
      await networkingService.acceptConnectionRequest(connection.id);
      const acceptedConnection = { ...connection, status: 'ACCEPTED' as const, updatedAt: new Date().toISOString() };
      setIncomingRequests(prev => prev.filter(item => item.id !== connection.id));
      setConnections(prev => [acceptedConnection, ...prev]);
      addToast({ type: 'success', title: 'Connection accepted', message: 'This person is now in your network.' });
    } catch (acceptError) {
      console.error('Accept connection failed:', acceptError);
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
    setActionLoadingIds(prev => new Set(prev).add(connection.id));
    try {
      await networkingService.rejectConnectionRequest(connection.id);
      if (mode === 'reject') {
        setIncomingRequests(prev => prev.filter(item => item.id !== connection.id));
        addToast({ type: 'success', title: 'Request declined', message: 'The connection request was declined.' });
      } else {
        setSentRequests(prev => prev.filter(item => item.id !== connection.id));
        setPendingRequests(prev => {
          const next = new Set(prev);
          next.delete(connection.receiverId);
          return next;
        });
        addToast({ type: 'success', title: 'Request withdrawn', message: 'Your pending request was withdrawn.' });
      }
    } catch (rejectError) {
      console.error('Connection update failed:', rejectError);
      addToast({ type: 'error', title: 'Update failed', message: 'Please try again later.' });
    } finally {
      setActionLoadingIds(prev => {
        const next = new Set(prev);
        next.delete(connection.id);
        return next;
      });
    }
  };

  const openProfile = (profile?: PublicProfile) => {
    const profileId = profile?.userId || profile?.id;
    if (!profileId) return;
    window.open(`/profile/${profileId}`, '_blank');
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
    return <EmptyState title="Error" description={error || "Failed to load network."} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Network"
        description="Connect with professionals in your field."
        actions={
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
            <input
              type="text"
              placeholder="Search people..."
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-1 p-1 bg-[var(--bg-secondary)] rounded-lg w-fit">
        {tabs.map((tab) => {
          const count = tab.id === 'incoming'
            ? incomingRequests.length
            : tab.id === 'sent'
              ? sentRequests.length
              : tab.id === 'connections'
                ? connections.length
                : profiles.length;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`
                px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5
                ${activeTab === tab.id
                  ? 'bg-[var(--bg-primary)] text-accent shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}
              `}
            >
              {tab.label}
              <span className="text-[10px] opacity-70">{count}</span>
            </button>
          );
        })}
      </div>

      {(status === 'loading' && activeTab === 'discover') || (isNetworkLoading && activeTab !== 'discover') ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => (
            <Card key={i} className="p-5">
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
            <Card key={profile.id} className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent text-sm font-semibold">
                    {(profile.fullName || 'U').split(' ').filter(n => n).map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{profile.fullName || 'Unknown User'}</p>
                    <p className="text-xs text-[var(--text-muted)]">{profile.currentRole || 'Professional'}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" aria-label="Open profile" onClick={() => openProfile(profile)}>
                  <ExternalLink size={14} />
                </Button>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] mb-3">
                <MapPin size={12} /> {profile.location || 'Unknown Location'}
              </div>
              {profile.headline && (
                <p className="text-xs text-[var(--text-secondary)] mb-3 line-clamp-2">{profile.headline}</p>
              )}
              <label htmlFor={`request-note-${profile.id}`} className="sr-only">Connection note for {profile.fullName || 'profile'}</label>
              <textarea
                id={`request-note-${profile.id}`}
                value={requestMessages[profile.id] || ''}
                onChange={(event) => setRequestMessages(prev => ({ ...prev, [profile.id]: event.target.value }))}
                placeholder="Optional note"
                rows={2}
                disabled={pendingRequestIds.has(profile.id)}
                className="mb-3 w-full resize-none rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] px-3 py-2 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:opacity-60"
              />
              <Button
                variant={pendingRequestIds.has(profile.id) ? 'secondary' : 'default'}
                size="sm"
                className="w-full"
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
              <Card key={connection.id} className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent text-sm font-semibold">
                      {getInitials(person?.fullName)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{person?.fullName || 'Unknown User'}</p>
                      <p className="text-xs text-[var(--text-muted)]">{person?.currentRole || person?.headline || 'Professional'}</p>
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
                  <p className="text-xs text-[var(--text-secondary)] mb-4 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] p-3">
                    {connection.message}
                  </p>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" onClick={() => openProfile(person)}>
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
            return (
              <Card key={connection.id} className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent text-sm font-semibold">
                      {getInitials(person?.fullName)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{person?.fullName || 'Unknown User'}</p>
                      <p className="text-xs text-[var(--text-muted)]">{person?.currentRole || person?.headline || 'Professional'}</p>
                    </div>
                  </div>
                  <Badge variant="warning"><Clock size={11} className="mr-1" /> Sent</Badge>
                </div>
                {connection.message && (
                  <p className="text-xs text-[var(--text-secondary)] mb-4 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] p-3">
                    {connection.message}
                  </p>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" onClick={() => openProfile(person)}>
                    <ExternalLink size={13} />
                    Profile
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleReject(connection, 'withdraw')} isLoading={actionLoadingIds.has(connection.id)}>
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
              <Card key={connection.id} className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-success-muted flex items-center justify-center text-success text-sm font-semibold">
                      {getInitials(person?.fullName)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{person?.fullName || 'Unknown User'}</p>
                      <p className="text-xs text-[var(--text-muted)]">{person?.currentRole || person?.headline || 'Professional'}</p>
                    </div>
                  </div>
                  <Badge variant="success"><UserCheck size={11} className="mr-1" /> Connected</Badge>
                </div>
                {person?.location && (
                  <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] mb-4">
                    <MapPin size={12} /> {person.location}
                  </div>
                )}
                <Button variant="outline" size="sm" className="w-full" onClick={() => openProfile(person)}>
                  <ExternalLink size={13} />
                  Open Profile
                </Button>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default NetworkingPage;
