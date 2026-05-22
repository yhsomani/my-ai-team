import React, { useState, useEffect, useMemo } from 'react';
import { Search, MapPin, Briefcase, Bookmark, Building2, Filter } from 'lucide-react';
import { applicationService } from '../../services/applicationService';
import { jobService } from '../../services/jobService';
import { JobApplication } from '../../types/job';
import { useAppSelector } from '../../store/hooks';
import { useGetJobsQuery } from '../../store/slices/jobSlice';
import type { RootState } from '../../store';
import { PageHeader } from '../../components/shared/PageHeader';
import { Badge } from '../../components/shared/Badge';
import { Button } from '../../components/shared/AuraButton';
import Card from '../../components/shared/GlassCard';
import { Skeleton } from '../../components/shared/Skeleton';
import { Tabs } from '../../components/shared/Tabs';
import { EmptyState } from '../../components/shared/EmptyState';
import { AuraModal } from '../../components/shared/AuraModal';
import { Input } from '../../components/shared/AuraInput';
import { useToast } from '../../components/shared/Toast';

const JobsPage: React.FC = () => {
    const { user } = useAppSelector((state: RootState) => state.auth);
    const { data: jobs = [], isLoading: jobsLoading, refetch: refetchJobs } = useGetJobsQuery({});
    const { addToast } = useToast();

    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('explore');
    const [applications, setApplications] = useState<JobApplication[]>([]);
    const [isLoadingApplications, setIsLoadingApplications] = useState(false);
    const [isApplying, setIsApplying] = useState<string | null>(null);

    const [isPostJobModalOpen, setIsPostJobModalOpen] = useState(false);
    const [isPostingJob, setIsPostingJob] = useState(false);
    const [jobData, setJobData] = useState({ title: '', description: '', company: '', location: '', type: 'Full-time' });

    useEffect(() => {
        if (activeTab === 'explore') {
            refetchJobs();
        } else if (user) {
            loadApplications(user.id);
        }
    }, [activeTab, refetchJobs, user]);

    const loadApplications = async (userId: string) => {
        setIsLoadingApplications(true);
        try {
            const data = await applicationService.getUserApplications(userId);
            setApplications(data);
        } catch (error) {
            console.error('Failed to load applications:', error);
            addToast({ type: 'error', title: 'Error', message: 'Failed to load applications. Please try again.' });
        } finally {
            setIsLoadingApplications(false);
        }
    };

    const handleApply = async (jobId: string) => {
        if (!user) return;
        setIsApplying(jobId);
        try {
            await applicationService.submitApplication({ jobId, userId: user.id });
            addToast({ type: 'success', title: 'Application submitted successfully!' });
            if (activeTab === 'applied') loadApplications(user.id);
        } catch (error) {
            console.error('Application failed:', error);
            addToast({ type: 'error', title: 'Application failed', message: 'Please try again later.' });
        } finally {
            setIsApplying(null);
        }
    };

    const handlePostJob = async () => {
        if (!jobData.title || !jobData.company || !jobData.location) {
            addToast({ type: 'warning', title: 'Missing fields', message: 'Please fill out all required fields.' });
            return;
        }
        setIsPostingJob(true);
        try {
            if (!user?.id) throw new Error('User not authenticated');
            await jobService.postJob({
                title: jobData.title,
                description: jobData.description || '',
                location: jobData.location,
                jobType: jobData.type,
                companyId: undefined // Will need to be set from company selection
            }, user.id);
            addToast({ type: 'success', title: 'Job posted successfully!' });
            setIsPostJobModalOpen(false);
            setJobData({ title: '', description: '', company: '', location: '', type: 'Full-time' });
            refetchJobs(); // Refresh list
        } catch (error) {
            console.error('Failed to post job:', error);
            addToast({ type: 'error', title: 'Failed to post job', message: 'Please try again later.' });
        } finally {
            setIsPostingJob(false);
        }
    };

    // ⚡ Bolt: Memoize filtered jobs and hoist lowercasing to prevent O(N) recalculations on every render
    const filteredJobs = useMemo(() => {
        if (!searchTerm) return jobs;
        const lowerSearch = searchTerm.toLowerCase();
        return jobs.filter(job =>
            job.title.toLowerCase().includes(lowerSearch) ||
            job.companyName?.toLowerCase().includes(lowerSearch)
        );
    }, [jobs, searchTerm]);

    const isLoading = activeTab === 'explore' ? jobsLoading : isLoadingApplications;
    const items = activeTab === 'explore' ? filteredJobs : applications;

    return (
        <div className="space-y-6">
            <PageHeader
                title="Jobs"
                description={user?.roles?.includes('ROLE_RECRUITER') ? "Manage your job postings and find top talent." : "Discover opportunities that match your skills and interests."}
                actions={
                    user?.roles?.includes('ROLE_RECRUITER') && (
                        <Button size="sm" onClick={() => setIsPostJobModalOpen(true)}>
                            Post a Job
                        </Button>
                    )
                }
            />

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <Tabs
                    tabs={[
                        { id: 'explore', label: 'Explore' },
                        { id: 'applied', label: 'Applied' },
                    ]}
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                />

                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
                    <input
                        type="text"
                        placeholder="Search jobs..."
                        className="w-full h-9 pl-9 pr-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Content */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <Card key={i} className="p-5">
                            <div className="flex items-start gap-3 mb-4">
                                <Skeleton className="w-10 h-10 rounded-lg" />
                                <div className="flex-1">
                                    <Skeleton className="h-4 w-3/4 mb-2" />
                                    <Skeleton className="h-3 w-1/2" />
                                </div>
                            </div>
                            <Skeleton className="h-3 w-full mb-2" />
                            <Skeleton className="h-3 w-2/3 mb-4" />
                            <Skeleton className="h-9 w-full" />
                        </Card>
                    ))}
                </div>
            ) : items.length === 0 ? (
                <EmptyState
                    title={activeTab === 'explore' ? 'No jobs found' : 'No applications yet'}
                    description={activeTab === 'explore' ? 'Try adjusting your search terms.' : 'Start exploring jobs to submit your first application.'}
                    action={activeTab === 'applied' ? { label: 'Explore Jobs', onClick: () => setActiveTab('explore') } : undefined}
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {items.map((item: Record<string, any>) => {
                        const job = activeTab === 'explore' ? item : item.job;
                        if (!job) return null;

                        return (
                            <Card key={item.id} className="p-5 flex flex-col justify-between hover:border-[var(--border-strong)] transition-colors">
                                <div className="space-y-4">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent shrink-0">
                                                {job.companyLogoUrl ? (
                                                    <img src={job.companyLogoUrl} alt={job.companyName} className="w-full h-full object-cover rounded-lg" />
                                                ) : (
                                                    <Building2 size={18} />
                                                )}
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-semibold leading-snug">{job.title}</h3>
                                                <p className="text-xs text-[var(--text-muted)]">{job.companyName || 'Company'}</p>
                                            </div>
                                        </div>
                                        {job.matchScore && (
                                            <Badge variant="success">{job.matchScore}%</Badge>
                                        )}
                                    </div>

                                    <div className="flex flex-wrap gap-2 text-xs text-[var(--text-secondary)]">
                                        <span className="flex items-center gap-1">
                                            <MapPin size={12} /> {job.location}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Briefcase size={12} /> {job.jobType}
                                        </span>
                                    </div>
                                </div>

                                <div className="mt-4 pt-4 border-t border-[var(--border-default)]">
                                    {activeTab === 'explore' ? (
                                        <Button
                                            variant="default"
                                            size="sm"
                                            className="w-full"
                                            disabled={isApplying === job.id}
                                            onClick={() => handleApply(job.id)}
                                            isLoading={isApplying === job.id}
                                        >
                                            Apply Now
                                        </Button>
                                    ) : (
                                        <div className="flex items-center justify-between">
                                            <Badge variant={item.status === 'ACCEPTED' ? 'success' : 'outline'}>
                                                {item.status || 'Pending'}
                                            </Badge>
                                            <Button variant="ghost" size="sm" onClick={() => addToast({ type: 'info', title: 'Details', message: 'Application details will be available soon.' })}>Details</Button>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}

            <AuraModal
                isOpen={isPostJobModalOpen}
                onClose={() => setIsPostJobModalOpen(false)}
                title="Post a New Job"
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setIsPostJobModalOpen(false)}>Cancel</Button>
                        <Button onClick={handlePostJob} isLoading={isPostingJob}>Post Job</Button>
                    </>
                }
            >
                <div className="space-y-4">
                    <Input 
                        label="Job Title" 
                        value={jobData.title} 
                        onChange={(e) => setJobData({ ...jobData, title: e.target.value })} 
                        placeholder="e.g. Senior Frontend Engineer" 
                    />
                    <Input 
                        label="Company Name" 
                        value={jobData.company} 
                        onChange={(e) => setJobData({ ...jobData, company: e.target.value })} 
                        placeholder="e.g. TechCorp Inc." 
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <Input 
                            label="Location" 
                            value={jobData.location} 
                            onChange={(e) => setJobData({ ...jobData, location: e.target.value })} 
                            placeholder="e.g. Remote, NY" 
                        />
                        <div>
                            <label className="text-sm font-medium text-[var(--text-primary)] mb-1.5 block">Job Type</label>
                            <select 
                                className="w-full h-10 px-3 rounded-lg border border-[var(--border-default)] bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors"
                                value={jobData.type}
                                onChange={(e) => setJobData({ ...jobData, type: e.target.value })}
                            >
                                <option value="Full-time">Full-time</option>
                                <option value="Part-time">Part-time</option>
                                <option value="Contract">Contract</option>
                                <option value="Internship">Internship</option>
                            </select>
                        </div>
                    </div>
                </div>
            </AuraModal>
        </div>
    );
};

export default JobsPage;
