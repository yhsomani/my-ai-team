import React, { useState, useEffect } from 'react';
import { Search, UserPlus, MapPin, ExternalLink } from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import Card from '../../components/shared/GlassCard';
import { Button } from '../../components/shared/AuraButton';
import { Badge } from '../../components/shared/Badge';
import { Input } from '../../components/shared/AuraInput';
import { Skeleton } from '../../components/shared/Skeleton';
import { EmptyState } from '../../components/shared/EmptyState';

import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchSuggestions, selectAllProfiles } from '../../store/slices/networkingSlice';
import { useToast } from '../../components/shared/Toast';

import { networkingService } from '../../services/networkingService';

const NetworkingPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { addToast } = useToast();
  const profiles = useAppSelector(selectAllProfiles);
  const { status, error } = useAppSelector((state) => state.networking);
  const [searchTerm, setSearchTerm] = useState('');
  const [pendingRequests, setPendingRequests] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (status === 'idle' && user) {
      dispatch(fetchSuggestions(user.id));
    }
  }, [dispatch, status, user]);

  const filtered = profiles.filter(p =>
    (p.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.currentRole || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleConnect = async (id: string) => {
    if (!user) {
        addToast({ type: 'warning', title: 'Login Required', message: 'Please log in to connect with others.' });
        return;
    }
    
    try {
        await networkingService.sendConnectionRequest(id, user.id);
        setPendingRequests(prev => new Set(prev).add(id));
        addToast({ type: 'success', title: 'Request Sent', message: 'Connection request has been sent.' });
    } catch (error) {
        console.error('Connection failed:', error);
        addToast({ type: 'error', title: 'Request Failed', message: 'Please try again later.' });
    }
  };

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

      {status === 'loading' ? (
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
      ) : filtered.length === 0 ? (
        <EmptyState title="No results" description="Try a different search term." />
      ) : (
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
              </div>
              <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] mb-3">
                <MapPin size={12} /> {profile.location || 'Unknown Location'}
              </div>
              <div className="flex flex-wrap gap-1.5 mb-4">
                {/* Assuming no skills array in PublicProfile for now, or add it if type supports */}
              </div>
              <Button
                variant={pendingRequests.has(profile.id) ? 'secondary' : 'default'}
                size="sm"
                className="w-full"
                onClick={() => handleConnect(profile.id)}
                disabled={pendingRequests.has(profile.id)}
              >
                {pendingRequests.has(profile.id) ? (
                  'Request Sent'
                ) : (
                  <><UserPlus size={14} className="mr-1" /> Connect</>
                )}
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default NetworkingPage;
