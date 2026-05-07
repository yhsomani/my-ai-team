import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Download, GripVertical } from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import Card from '../../components/shared/GlassCard';
import { Button } from '../../components/shared/AuraButton';
import { Input } from '../../components/shared/AuraInput';
import { Tabs } from '../../components/shared/Tabs';
import { useToast } from '../../components/shared/Toast';
import { useAppSelector } from '../../store/hooks';
import { profileService } from '../../services/profileService';
import { Skeleton } from '../../components/shared/Skeleton';

const ResumeBuilder: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth);
  const [activeTab, setActiveTab] = useState('editor');
  const { addToast } = useToast();
  
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      try {
        const data = await profileService.getProfile(user.id);
        setProfile(data);
      } catch (err) {
        console.error('Failed to fetch profile for resume:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user]);

  const handleExport = () => {
    addToast({ type: 'success', title: 'Exporting PDF', message: 'Your resume is being generated.' });
  };

  const handleSave = () => {
    addToast({ type: 'success', title: 'Saved', message: 'Your resume changes have been saved.' });
  };

  const handleAdd = (section: string) => {
    addToast({ type: 'info', title: 'Coming Soon', message: `Adding ${section} will be available in the next release.` });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48 mb-6" />
        <Card className="p-8">
           <Skeleton className="h-4 w-full mb-4" />
           <Skeleton className="h-4 w-2/3 mb-4" />
           <Skeleton className="h-4 w-1/2" />
        </Card>
      </div>
    );
  }

  const userName = profile?.fullName || user?.email?.split('@')[0] || 'User';
  const experiences = profile?.experiences || [];
  const education = profile?.education || [];
  const skills = profile?.skills || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Resume Builder"
        description="Create and customize your professional resume."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExport}><Download size={14} className="mr-1" /> Export PDF</Button>
            <Button size="sm" onClick={handleSave}>Save Changes</Button>
          </div>
        }
      />

      <Tabs
        tabs={[
          { id: 'editor', label: 'Editor' },
          { id: 'preview', label: 'Preview' },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {activeTab === 'editor' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Personal Info */}
          <Card className="p-5 space-y-4">
            <h3 className="text-sm font-semibold">Personal Information</h3>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Full Name" defaultValue={userName} />
              <Input label="Email" defaultValue={user?.email || ''} type="email" />
              <Input label="Phone" defaultValue={profile?.phone || ''} />
              <Input label="Location" defaultValue={profile?.location || ''} className="col-span-2" />
              <Input label="Website" defaultValue={profile?.website || ''} className="col-span-2" />
            </div>
          </Card>

          {/* Summary */}
          <Card className="p-5 space-y-4">
            <h3 className="text-sm font-semibold">Professional Summary</h3>
            <textarea
              className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)] px-3 py-2 text-sm min-h-[120px] focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none"
              defaultValue={profile?.summary || ''}
            />
          </Card>

          {/* Experience */}
          <Card className="p-5 space-y-4 lg:col-span-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Work Experience</h3>
              <Button variant="outline" size="sm" onClick={() => handleAdd('experience')}><Plus size={14} className="mr-1" /> Add</Button>
            </div>
            {experiences.map((exp: any, i: number) => (
              <div key={i} className="flex items-start gap-3 p-4 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)]">
                <GripVertical size={16} className="text-[var(--text-muted)] mt-0.5 cursor-grab" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{exp.title}</p>
                      <p className="text-xs text-[var(--text-muted)]">{exp.company} · {exp.startDate} - {exp.endDate || 'Present'}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="text-[var(--text-muted)] hover:text-destructive">
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            {experiences.length === 0 && <p className="text-sm text-[var(--text-muted)] text-center py-4">No experience listed.</p>}
          </Card>

          {/* Skills */}
          <Card className="p-5 space-y-4 lg:col-span-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Skills</h3>
              <Button variant="outline" size="sm" onClick={() => handleAdd('skills')}><Plus size={14} className="mr-1" /> Add</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {skills.map((s: any) => (
                <span key={typeof s === 'string' ? s : s.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-default)] text-sm bg-[var(--bg-primary)]">
                  {typeof s === 'string' ? s : s.name}
                  <button className="text-[var(--text-muted)] hover:text-destructive transition-colors">
                    <Trash2 size={12} />
                  </button>
                </span>
              ))}
              {skills.length === 0 && <p className="text-sm text-[var(--text-muted)]">No skills added.</p>}
            </div>
          </Card>
        </div>
      ) : (
        <Card className="p-8 max-w-2xl mx-auto">
          <div className="space-y-6">
            <div className="text-center border-b border-[var(--border-default)] pb-6">
              <h2 className="text-2xl font-semibold">{userName}</h2>
              <p className="text-sm text-[var(--text-secondary)]">{profile?.headline || 'Professional'}</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">{profile?.location} · {user?.email} · {profile?.phone}</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-2 text-accent uppercase tracking-wide">Summary</h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                {profile?.summary || 'No summary provided.'}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-3 text-accent uppercase tracking-wide">Experience</h3>
              <div className="space-y-4">
                {experiences.map((exp: any, i: number) => (
                  <div key={i}>
                    <p className="text-sm font-medium">{exp.title} — {exp.company}</p>
                    <p className="text-xs text-[var(--text-muted)]">{exp.startDate} – {exp.endDate || 'Present'}</p>
                  </div>
                ))}
                {experiences.length === 0 && <p className="text-sm text-[var(--text-muted)]">No work experience added yet.</p>}
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default ResumeBuilder;