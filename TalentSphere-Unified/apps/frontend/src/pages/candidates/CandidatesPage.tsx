import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '../../components/shared/PageHeader';
import Card from '../../components/shared/GlassCard';
import { Button } from '../../components/shared/AuraButton';
import { Badge } from '../../components/shared/Badge';
import { Search, Filter, User, Mail, Download, ExternalLink, CheckCircle, XCircle, Eye } from 'lucide-react';
import { recruiterService, Application } from '../../services/recruiterService';
import { useAppSelector } from '../../store/hooks';
import { EmptyState } from '../../components/shared/EmptyState';
import { Skeleton } from '../../components/shared/Skeleton';

const statusVariant = (status: string) => {
  switch (status?.toUpperCase()) {
    case 'ACCEPTED': return 'success';
    case 'REJECTED': return 'danger';
    case 'REVIEWED': return 'info';
    default: return 'warning';
  }
};

const CandidatesPage: React.FC = () => {
  const { user } = useAppSelector((state: any) => state.auth);
  const [candidates, setCandidates] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchCandidates = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const data = await recruiterService.getRecentApplications(user.id);
      setCandidates(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch candidates:', err);
      setCandidates([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { fetchCandidates(); }, [fetchCandidates]);

  const handleStatusUpdate = async (applicationId: string, newStatus: string) => {
    setUpdatingId(applicationId);
    try {
      const updated = await recruiterService.updateApplicationStatus(applicationId, newStatus);
      setCandidates(prev =>
        prev.map(c => c.id === applicationId ? { ...c, status: updated.status } : c)
      );
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = candidates.filter(c =>
    c.user?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.job?.title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Candidates"
        description="Manage and review job applications."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => fetchCandidates()}>
              <Download size={14} className="mr-2" /> Export
            </Button>
            <Button size="sm">
              <Filter size={14} className="mr-2" /> Filter
            </Button>
          </div>
        }
      />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
        <input
          type="text"
          placeholder="Search candidates by name or position..."
          className="w-full h-11 pl-10 pr-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No candidates found"
          description={searchTerm
            ? "We couldn't find any applications matching your search."
            : "No applications have been submitted yet. Post a job to attract candidates."}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filtered.map((candidate) => (
            <Card key={candidate.id} className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 group">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center text-accent flex-shrink-0">
                  <User size={24} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <h3 className="font-semibold group-hover:text-accent transition-colors truncate">
                      {candidate.user?.fullName || 'Anonymous Candidate'}
                    </h3>
                    <Badge variant={statusVariant(candidate.status) as any}>
                      {candidate.status || 'PENDING'}
                    </Badge>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)]">
                    {candidate.job?.title || `Job #${candidate.jobId}`} ·{' '}
                    {candidate.appliedAt
                      ? new Date(candidate.appliedAt).toLocaleDateString()
                      : 'N/A'}
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-[var(--text-muted)] flex-wrap">
                    <span className="flex items-center gap-1">
                      <Mail size={12} /> {candidate.user?.email || 'N/A'}
                    </span>
                    {candidate.resumeUrl && (
                      <a
                        href={candidate.resumeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-accent hover:underline"
                      >
                        <Download size={12} /> Resume
                      </a>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto flex-shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 md:flex-none"
                  onClick={() => window.open(`/profile/${candidate.userId}`, '_blank')}
                >
                  <Eye size={14} className="mr-1.5" /> View
                </Button>

                {candidate.status !== 'ACCEPTED' && (
                  <Button
                    size="sm"
                    className="flex-1 md:flex-none bg-green-600 hover:bg-green-700 text-white border-0"
                    disabled={updatingId === candidate.id}
                    onClick={() => handleStatusUpdate(candidate.id, 'ACCEPTED')}
                  >
                    <CheckCircle size={14} className="mr-1.5" />
                    {updatingId === candidate.id ? '...' : 'Accept'}
                  </Button>
                )}

                {candidate.status !== 'REJECTED' && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 md:flex-none border-red-500 text-red-500 hover:bg-red-500/10"
                    disabled={updatingId === candidate.id}
                    onClick={() => handleStatusUpdate(candidate.id, 'REJECTED')}
                  >
                    <XCircle size={14} className="mr-1.5" />
                    {updatingId === candidate.id ? '...' : 'Reject'}
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default CandidatesPage;
