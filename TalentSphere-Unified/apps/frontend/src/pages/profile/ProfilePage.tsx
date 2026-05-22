import React, { useState, useEffect } from 'react';
import { Camera, MapPin, Link as LinkIcon, Calendar, Edit2, Briefcase, GraduationCap, Award, Save } from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import Card from '../../components/shared/GlassCard';
import { Button } from '../../components/shared/AuraButton';
import { Input } from '../../components/shared/AuraInput';
import { AuraModal } from '../../components/shared/AuraModal';
import { Badge } from '../../components/shared/Badge';
import { Tabs } from '../../components/shared/Tabs';
import { Skeleton } from '../../components/shared/Skeleton';
import { useAppSelector } from '../../store/hooks';
import { profileService } from '../../services/profileService';
import { useToast } from '../../components/shared/Toast';

const ProfilePage: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth);
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [profile, setProfile] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({ headline: '', location: '', bio: '' });

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      try {
        const data = await profileService.getProfile(user.id);
        setProfile(data);
        setEditFormData({
          headline: data?.headline || '',
          location: data?.location || '',
          bio: data?.bio || ''
        });
      } catch (err) {
        console.error('Failed to fetch profile:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;
    try {
      await profileService.updateProfile(user.id, {
        headline: editFormData.headline,
        location: editFormData.location,
        bio: editFormData.bio
      });
      setProfile((prev: Record<string, any> | null) => ({ ...prev, ...editFormData }));
      setIsEditModalOpen(false);
      addToast({ type: 'success', title: 'Profile Updated', message: 'Your changes have been saved successfully.' });
    } catch (err) {
      console.error('Failed to update profile:', err);
      addToast({ type: 'error', title: 'Update Failed', message: 'Please try again later.' });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48 mb-6" />
        <Card className="p-6">
          <div className="flex gap-5">
            <Skeleton className="w-20 h-20 rounded-full" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const userName = profile?.fullName || user?.email?.split('@')[0] || 'User';
  const experiences = profile?.experiences || [];
  const education = profile?.education || [];
  const skills = profile?.skills || [];
  const achievements = profile?.achievements || [];



  return (
    <div className="space-y-6">
      <PageHeader 
        title="Profile" 
        actions={<Button variant="outline" size="sm" onClick={() => setIsEditModalOpen(true)}><Edit2 size={14} className="mr-1" /> Edit Profile</Button>} 
      />

      <AuraModal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
        title="Edit Profile"
      >
        <div className="space-y-4 py-4">
          <Input 
            label="Headline" 
            value={editFormData.headline} 
            onChange={(e) => setEditFormData({...editFormData, headline: e.target.value})}
            placeholder="e.g. Senior Software Engineer"
          />
          <Input 
            label="Location" 
            value={editFormData.location} 
            onChange={(e) => setEditFormData({...editFormData, location: e.target.value})}
            placeholder="e.g. Remote, or New York, NY"
            icon={<MapPin size={16} />}
          />
          <div>
             <label className="block text-sm font-medium mb-1.5 text-[var(--text-primary)]">Bio</label>
             <textarea 
               className="w-full min-h-[100px] p-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
               value={editFormData.bio}
               onChange={(e) => setEditFormData({...editFormData, bio: e.target.value})}
               placeholder="Tell us about yourself..."
             />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6 border-t border-[var(--border-default)] pt-4">
          <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveProfile}><Save size={16} className="mr-1.5" /> Save Changes</Button>
        </div>
      </AuraModal>

      {/* Profile Header */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row items-start gap-5">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center text-accent text-2xl font-semibold overflow-hidden">
              {profile?.avatarUrl ? (
                <img src={profile.avatarUrl} alt={userName} className="w-full h-full object-cover" />
              ) : (
                userName[0]?.toUpperCase()
              )}
            </div>
            <button className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-default)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
              <Camera size={12} />
            </button>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold">{userName}</h2>
              {user?.roles?.includes('ROLE_RECRUITER') && <Badge variant="default">Recruiter</Badge>}
            </div>
            <p className="text-sm text-[var(--text-secondary)]">{profile?.headline || 'Member'}</p>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-[var(--text-muted)]">
              {profile?.location && <span className="flex items-center gap-1"><MapPin size={12} /> {profile.location}</span>}
              {profile?.website && <span className="flex items-center gap-1"><LinkIcon size={12} /> {profile.website}</span>}
              <span className="flex items-center gap-1"><Calendar size={12} /> Joined {profile?.createdAt ? new Date(profile.createdAt).getFullYear() : '2026'}</span>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {skills.map((s: Record<string, any> | string) => (
                <Badge key={typeof s === 'string' ? s : s.name} variant="outline" className="text-[10px]">
                  {typeof s === 'string' ? s : s.name}
                </Badge>
              ))}
            </div>
          </div>
          <div className="flex gap-6 text-center shrink-0">
            <div><p className="text-2xl font-semibold">{profile?.connectionCount || 0}</p><p className="text-xs text-[var(--text-muted)]">Connections</p></div>
            <div><p className="text-2xl font-semibold">{profile?.applicationCount || 0}</p><p className="text-xs text-[var(--text-muted)]">Applications</p></div>
            <div><p className="text-2xl font-semibold">{achievements.length}</p><p className="text-xs text-[var(--text-muted)]">Badges</p></div>
          </div>
        </div>
      </Card>

      <Tabs
        tabs={[
          { id: 'overview', label: 'Overview' },
          { id: 'experience', label: 'Experience' },
          { id: 'education', label: 'Education' },
          { id: 'achievements', label: 'Achievements' },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="p-5 space-y-4">
            <h3 className="text-sm font-semibold">About</h3>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              {profile?.bio || 'No bio provided yet.'}
            </p>
          </Card>
          <Card className="p-5 space-y-4">
            <h3 className="text-sm font-semibold">Profile Completion</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span>Overall Progress</span>
                <span className="font-medium">{profile?.completionPercentage || 0}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[var(--border-default)]">
                <div 
                  className="h-full rounded-full bg-accent transition-all duration-500" 
                  style={{ width: `${profile?.completionPercentage || 0}%` }}
                />
              </div>
              <div className="space-y-2 text-xs text-[var(--text-secondary)]">
                <p>{profile?.fullName ? '✓' : '○'} Basic information</p>
                <p>{skills.length > 0 ? '✓' : '○'} Skills</p>
                <p>{experiences.length > 0 ? '✓' : '○'} Work experience</p>
                <p>{profile?.resumeUrl ? '✓' : '○'} Resume uploaded</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'experience' && (
        <Card className="p-5 space-y-6">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-semibold">Work Experience</h3>
          </div>
          {experiences.length > 0 ? experiences.map((exp: Record<string, any>, i: number) => (
            <div key={i} className="flex gap-4">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent shrink-0">
                <Briefcase size={16} />
              </div>
              <div>
                <p className="text-sm font-semibold">{exp.title}</p>
                <p className="text-xs text-accent">{exp.company}</p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">{exp.startDate} – {exp.endDate || 'Present'}</p>
                <p className="text-sm text-[var(--text-secondary)] mt-2">{exp.description}</p>
              </div>
            </div>
          )) : (
            <div className="p-8 text-center text-sm text-[var(--text-muted)]">No work experience added yet.</div>
          )}
        </Card>
      )}

      {activeTab === 'education' && (
        <Card className="p-5 space-y-6">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-semibold">Education</h3>
          </div>
          {education.length > 0 ? education.map((edu: Record<string, any>, i: number) => (
            <div key={i} className="flex gap-4">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent shrink-0">
                <GraduationCap size={16} />
              </div>
              <div>
                <p className="text-sm font-semibold">{edu.degree}</p>
                <p className="text-xs text-accent">{edu.institution}</p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">{edu.year}</p>
              </div>
            </div>
          )) : (
            <div className="p-8 text-center text-sm text-[var(--text-muted)]">No education history added yet.</div>
          )}
        </Card>
      )}

      {activeTab === 'achievements' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {achievements.length > 0 ? achievements.map((badge: Record<string, any>, i: number) => (
            <Card key={i} className="p-5 text-center">
              <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center text-accent mx-auto mb-3">
                <Award size={16} />
              </div>
              <p className="text-sm font-semibold">{badge.title}</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">{badge.description}</p>
            </Card>
          )) : (
            <div className="col-span-full p-12 text-center text-sm text-[var(--text-muted)]">No achievements or badges earned yet.</div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
