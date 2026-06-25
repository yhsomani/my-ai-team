import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PageHeader } from '../../components/shared/PageHeader';
import Card from '../../components/shared/GlassCard';
import { Button } from '../../components/shared/AuraButton';
import { Badge } from '../../components/shared/Badge';
import { Search, Filter, User, Mail, Download, ExternalLink, CheckCircle, XCircle, Eye, RefreshCw, Briefcase, Calendar, StickyNote, Save } from 'lucide-react';
import { recruiterService, Application } from '../../services/recruiterService';
import { useAppSelector } from '../../store/hooks';
import { EmptyState } from '../../components/shared/EmptyState';
import { Skeleton } from '../../components/shared/Skeleton';
import { AuraModal } from '../../components/shared/AuraModal';

const statusVariant = (status: string) => {
  switch (status?.toUpperCase()) {
    case 'OFFER': return 'success';
    case 'REJECTED': return 'destructive';
    case 'INTERVIEW': return 'outline';
    case 'REVIEWED': return 'outline';
    default: return 'warning';
  }
};

const formatCandidateDate = (date?: string) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

interface CandidateNote {
  applicationId: string;
  note: string;
  updatedAt: string;
}

const getCandidateNotesStorageKey = (recruiterId?: string) => `talentsphere.candidateNotes.${recruiterId || 'guest'}`;

const sanitizeCandidateNotes = (value: unknown): Record<string, CandidateNote> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

  return Object.entries(value as Record<string, Partial<CandidateNote>>).reduce<Record<string, CandidateNote>>((acc, [applicationId, item]) => {
    if (
      typeof item?.applicationId === 'string' &&
      typeof item.note === 'string' &&
      typeof item.updatedAt === 'string'
    ) {
      acc[applicationId] = {
        applicationId: item.applicationId,
        note: item.note,
        updatedAt: item.updatedAt
      };
    }

    return acc;
  }, {});
};

const CandidatesPage: React.FC = () => {
  const { user } = useAppSelector((state: any) => state.auth);
  const [candidates, setCandidates] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<Application | null>(null);
  const [candidateNotes, setCandidateNotes] = useState<Record<string, CandidateNote>>({});
  const [draftNote, setDraftNote] = useState('');
  const [savingNoteId, setSavingNoteId] = useState<string | null>(null);
  const notesStorageKey = useMemo(() => getCandidateNotesStorageKey(user?.id), [user?.id]);

  const fetchCandidates = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const data = await recruiterService.getAllApplications(user.id);
      setCandidates(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch candidates:', err);
      setCandidates([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { fetchCandidates(); }, [fetchCandidates]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(notesStorageKey);
      setCandidateNotes(stored ? sanitizeCandidateNotes(JSON.parse(stored)) : {});
    } catch (error) {
      console.error('Failed to load candidate notes:', error);
      setCandidateNotes({});
    }
  }, [notesStorageKey]);

  useEffect(() => {
    setDraftNote(selectedCandidate ? candidateNotes[selectedCandidate.id]?.note || '' : '');
  }, [candidateNotes, selectedCandidate]);

  const persistCandidateNotes = useCallback((nextNotes: Record<string, CandidateNote>) => {
    setCandidateNotes(nextNotes);

    try {
      window.localStorage.setItem(notesStorageKey, JSON.stringify(nextNotes));
    } catch (error) {
      console.error('Failed to save candidate notes:', error);
    }
  }, [notesStorageKey]);

  const handleStatusUpdate = async (applicationId: string, newStatus: string) => {
    setUpdatingId(applicationId);
    try {
      const updated = await recruiterService.updateApplicationStatus(applicationId, newStatus);
      setCandidates(prev =>
        prev.map(c => c.id === applicationId ? { ...c, status: updated.status } : c)
      );
      setSelectedCandidate(prev =>
        prev?.id === applicationId ? { ...prev, status: updated.status, updatedAt: updated.updatedAt } : prev
      );
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSaveNote = async () => {
    if (!selectedCandidate) return;

    setSavingNoteId(selectedCandidate.id);
    try {
      const trimmedNote = draftNote.trim();
      const nextNotes = { ...candidateNotes };

      if (trimmedNote) {
        nextNotes[selectedCandidate.id] = {
          applicationId: selectedCandidate.id,
          note: trimmedNote,
          updatedAt: new Date().toISOString()
        };
      } else {
        delete nextNotes[selectedCandidate.id];
      }

      persistCandidateNotes(nextNotes);
    } finally {
      setSavingNoteId(null);
    }
  };

  // ⚡ Bolt: Memoize filtered candidates and hoist lowercasing to prevent O(N) recalculations on every render
  const filtered = useMemo(() => {
    if (!searchTerm) return candidates;
    const lowerSearch = searchTerm.toLowerCase();
    return candidates.filter(c =>
      c.user?.fullName?.toLowerCase().includes(lowerSearch) ||
      c.job?.title?.toLowerCase().includes(lowerSearch)
    );
  }, [candidates, searchTerm]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Candidates"
        description="Manage and review job applications."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => fetchCandidates()}>
              <RefreshCw size={14} className="mr-2" /> Refresh
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
                    {candidateNotes[candidate.id]?.note && (
                      <span className="flex items-center gap-1 text-amber-300">
                        <StickyNote size={12} /> Note saved
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto flex-shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 md:flex-none"
                  onClick={() => setSelectedCandidate(candidate)}
                >
                  <Eye size={14} className="mr-1.5" /> Details
                </Button>

                {candidate.status !== 'OFFER' && (
                  <Button
                    size="sm"
                    className="flex-1 md:flex-none bg-green-600 hover:bg-green-700 text-white border-0"
                    disabled={updatingId === candidate.id}
                    onClick={() => handleStatusUpdate(candidate.id, 'OFFER')}
                  >
                    <CheckCircle size={14} className="mr-1.5" />
                    {updatingId === candidate.id ? '...' : 'Offer'}
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

      <AuraModal
        isOpen={Boolean(selectedCandidate)}
        onClose={() => setSelectedCandidate(null)}
        title="Candidate Details"
        size="lg"
        footer={
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            {selectedCandidate && (
              <>
                <Button
                  variant="outline"
                  onClick={() => window.open(`/profile/${selectedCandidate.userId}`, '_blank')}
                >
                  <ExternalLink size={14} className="mr-1.5" /> Open Profile
                </Button>
                {selectedCandidate.status !== 'OFFER' && (
                  <Button
                    className="bg-green-600 hover:bg-green-700 text-white border-0"
                    disabled={updatingId === selectedCandidate.id}
                    onClick={() => handleStatusUpdate(selectedCandidate.id, 'OFFER')}
                  >
                    <CheckCircle size={14} className="mr-1.5" />
                    Offer
                  </Button>
                )}
                {selectedCandidate.status !== 'REJECTED' && (
                  <Button
                    variant="outline"
                    className="border-red-500 text-red-500 hover:bg-red-500/10"
                    disabled={updatingId === selectedCandidate.id}
                    onClick={() => handleStatusUpdate(selectedCandidate.id, 'REJECTED')}
                  >
                    <XCircle size={14} className="mr-1.5" />
                    Reject
                  </Button>
                )}
              </>
            )}
          </div>
        }
      >
        {selectedCandidate && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
              <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center text-accent shrink-0">
                <User size={26} />
              </div>
              <div className="space-y-2 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-semibold text-white">
                    {selectedCandidate.user?.fullName || 'Anonymous Candidate'}
                  </h3>
                  <Badge variant={statusVariant(selectedCandidate.status) as any}>
                    {selectedCandidate.status || 'PENDING'}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-3 text-sm text-[var(--text-secondary)]">
                  <span className="flex items-center gap-1">
                    <Mail size={14} /> {selectedCandidate.user?.email || 'N/A'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Briefcase size={14} /> {selectedCandidate.job?.title || `Job #${selectedCandidate.jobId}`}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar size={14} /> Applied {formatCandidateDate(selectedCandidate.appliedAt)}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Card className="p-4">
                <p className="text-xs text-[var(--text-muted)]">Application ID</p>
                <p className="text-sm font-medium break-all">{selectedCandidate.id}</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-[var(--text-muted)]">Job ID</p>
                <p className="text-sm font-medium break-all">{selectedCandidate.jobId}</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-[var(--text-muted)]">Last Updated</p>
                <p className="text-sm font-medium">{formatCandidateDate(selectedCandidate.updatedAt || selectedCandidate.appliedAt)}</p>
              </Card>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-[var(--text-primary)]">Submitted Materials</h4>
              {selectedCandidate.resumeUrl ? (
                <a
                  href={selectedCandidate.resumeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-accent hover:underline"
                >
                  <Download size={14} /> Resume
                </a>
              ) : (
                <p className="text-sm text-[var(--text-muted)]">No resume link was submitted.</p>
              )}
              {selectedCandidate.coverLetter ? (
                <div className="rounded-lg border border-[var(--border-default)] p-4">
                  <p className="text-xs font-medium text-[var(--text-muted)] mb-2">Cover Letter</p>
                  <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">{selectedCandidate.coverLetter}</p>
                </div>
              ) : (
                <p className="text-sm text-[var(--text-muted)]">No cover letter was submitted.</p>
              )}
            </div>

            <div className="rounded-lg border border-[var(--border-default)] p-4 space-y-2">
              <h4 className="text-sm font-semibold text-[var(--text-primary)]">Review Guidance</h4>
              <p className="text-sm text-[var(--text-secondary)]">
                Review submitted materials and profile context before changing status. Status changes are visible in the candidate's application timeline.
              </p>
            </div>

            <div className="rounded-lg border border-[var(--border-default)] p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h4 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  <StickyNote size={15} className="text-amber-300" />
                  Recruiter Notes
                </h4>
                {candidateNotes[selectedCandidate.id]?.updatedAt && (
                  <span className="text-xs text-[var(--text-muted)]">
                    Saved {formatCandidateDate(candidateNotes[selectedCandidate.id].updatedAt)}
                  </span>
                )}
              </div>
              <textarea
                value={draftNote}
                onChange={(event) => setDraftNote(event.target.value)}
                rows={4}
                className="w-full resize-y rounded-lg border border-[var(--border-default)] bg-transparent px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors"
                placeholder="Add private screening notes, follow-up questions, or interview context..."
                aria-label="Private recruiter notes"
              />
              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={handleSaveNote}
                  isLoading={savingNoteId === selectedCandidate.id}
                >
                  <Save size={14} className="mr-1.5" />
                  Save Note
                </Button>
              </div>
            </div>
          </div>
        )}
      </AuraModal>
    </div>
  );
};

export default CandidatesPage;
