import React, { useState, useEffect } from 'react';
import { Camera, MapPin, Link as LinkIcon, Calendar, Edit2, Briefcase, GraduationCap, Award, Save, Plus, CheckCircle2, Circle } from 'lucide-react';
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
import { useParams } from 'react-router-dom';

type CompletionTaskType = 'skill' | 'experience' | 'education';

const getSkillName = (skill: Record<string, any> | string) => typeof skill === 'string' ? skill : skill.name;
const formatProfileDate = (date?: string) => {
  if (!date) return '';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
};
const getExperienceStartDate = (experience: Record<string, any>) => experience.startDate || experience.start_date;
const getExperienceEndDate = (experience: Record<string, any>) => experience.endDate || experience.end_date;
const getEducationStartDate = (education: Record<string, any>) => education.startDate || education.start_date;
const getEducationEndDate = (education: Record<string, any>) => education.endDate || education.end_date;

const ProfilePage: React.FC = () => {
  const { userId: routeUserId } = useParams<{ userId: string }>();
  const { user } = useAppSelector((state) => state.auth);
  const { addToast } = useToast();
  const profileUserId = routeUserId || user?.id;
  const isOwnProfile = !routeUserId || routeUserId === user?.id;
  const [activeTab, setActiveTab] = useState('overview');
  const [profile, setProfile] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({ headline: '', location: '', bio: '' });
  const [activeCompletionTask, setActiveCompletionTask] = useState<CompletionTaskType | null>(null);
  const [isSavingCompletionTask, setIsSavingCompletionTask] = useState(false);
  const [skillForm, setSkillForm] = useState({ name: '', proficiency: 'INTERMEDIATE', yearsOfExperience: '' });
  const [experienceForm, setExperienceForm] = useState({
    title: '',
    company: '',
    location: '',
    startDate: '',
    endDate: '',
    current: false,
    description: ''
  });
  const [educationForm, setEducationForm] = useState({
    institution: '',
    degree: '',
    fieldOfStudy: '',
    startDate: '',
    endDate: '',
    gpa: ''
  });

  useEffect(() => {
    const fetchProfile = async () => {
      if (!profileUserId) return;
      setLoading(true);
      setError(null);
      try {
        const data = await profileService.getProfile(profileUserId);
        setProfile(data);
        setEditFormData({
          headline: data?.headline || '',
          location: data?.location || '',
          bio: data?.bio || ''
        });
      } catch (err) {
        console.error('Failed to fetch profile:', err);
        setError('Unable to load this profile.');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [profileUserId]);

  const handleSaveProfile = async () => {
    if (!user || !isOwnProfile) return;
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

  const handleProfilePhotoUnavailable = () => {
    addToast({
      type: 'warning',
      title: 'Profile photo unavailable',
      message: 'Photo upload is not configured yet. Your profile details can still be edited from Edit Profile.'
    });
  };

  const closeCompletionTaskModal = () => {
    setActiveCompletionTask(null);
    setSkillForm({ name: '', proficiency: 'INTERMEDIATE', yearsOfExperience: '' });
    setExperienceForm({ title: '', company: '', location: '', startDate: '', endDate: '', current: false, description: '' });
    setEducationForm({ institution: '', degree: '', fieldOfStudy: '', startDate: '', endDate: '', gpa: '' });
  };

  const handleSaveCompletionTask = async () => {
    if (!user?.id || !activeCompletionTask || !isOwnProfile) return;

    try {
      setIsSavingCompletionTask(true);

      if (activeCompletionTask === 'skill') {
        if (!skillForm.name.trim()) {
          addToast({ type: 'warning', title: 'Skill required', message: 'Add a skill name before saving.' });
          return;
        }

        const createdSkill = await profileService.addSkill(user.id, {
          name: skillForm.name.trim(),
          proficiency: skillForm.proficiency,
          years_of_experience: skillForm.yearsOfExperience ? Number.parseInt(skillForm.yearsOfExperience, 10) : undefined
        });
        setProfile((prev) => ({ ...prev, skills: [...(prev?.skills || []), createdSkill] }));
      }

      if (activeCompletionTask === 'experience') {
        if (!experienceForm.title.trim() || !experienceForm.company.trim() || !experienceForm.startDate) {
          addToast({ type: 'warning', title: 'Experience details required', message: 'Add title, company, and start date before saving.' });
          return;
        }

        const createdExperience = await profileService.addExperience(user.id, {
          title: experienceForm.title.trim(),
          company: experienceForm.company.trim(),
          location: experienceForm.location.trim() || undefined,
          startDate: experienceForm.startDate,
          endDate: experienceForm.current ? undefined : experienceForm.endDate || undefined,
          current: experienceForm.current,
          description: experienceForm.description.trim()
        });
        setProfile((prev) => ({ ...prev, experiences: [...(prev?.experiences || []), createdExperience] }));
        setActiveTab('experience');
      }

      if (activeCompletionTask === 'education') {
        if (!educationForm.institution.trim() || !educationForm.startDate) {
          addToast({ type: 'warning', title: 'Education details required', message: 'Add institution and start date before saving.' });
          return;
        }

        const createdEducation = await profileService.addEducation(user.id, {
          institution: educationForm.institution.trim(),
          degree: educationForm.degree.trim(),
          fieldOfStudy: educationForm.fieldOfStudy.trim(),
          startDate: educationForm.startDate,
          endDate: educationForm.endDate || undefined,
          gpa: educationForm.gpa ? Number.parseFloat(educationForm.gpa) : undefined
        });
        setProfile((prev) => ({ ...prev, educations: [...(prev?.educations || []), createdEducation] }));
        setActiveTab('education');
      }

      addToast({ type: 'success', title: 'Profile updated', message: 'Your profile completion task has been saved.' });
      closeCompletionTaskModal();
    } catch (err) {
      console.error('Failed to save profile completion task:', err);
      addToast({ type: 'error', title: 'Save failed', message: 'Please try again later.' });
    } finally {
      setIsSavingCompletionTask(false);
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

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Profile" />
        <Card className="p-8 text-center text-sm text-[var(--text-muted)]">{error}</Card>
      </div>
    );
  }

  const userName = profile?.fullName || profile?.full_name || profile?.profiles?.full_name || user?.email?.split('@')[0] || 'User';
  const experiences = profile?.experiences || [];
  const education = profile?.education || profile?.educations || [];
  const skills = profile?.skills || [];
  const achievements = profile?.achievements || [];
  const hasBasicInfo = Boolean(profile?.headline && profile?.location && profile?.bio);
  const completionTasks = [
    {
      id: 'basic',
      label: 'Basic information',
      description: 'Add headline, location, and bio',
      complete: hasBasicInfo,
      actionLabel: 'Edit',
      onClick: () => setIsEditModalOpen(true)
    },
    {
      id: 'skills',
      label: 'Skills',
      description: 'Add at least one skill for job matching',
      complete: skills.length > 0,
      actionLabel: 'Add skill',
      onClick: () => setActiveCompletionTask('skill' as CompletionTaskType)
    },
    {
      id: 'experience',
      label: 'Work experience',
      description: 'Add a current or past role',
      complete: experiences.length > 0,
      actionLabel: 'Add role',
      onClick: () => setActiveCompletionTask('experience' as CompletionTaskType)
    },
    {
      id: 'education',
      label: 'Education',
      description: 'Add school, certification, or training',
      complete: education.length > 0,
      actionLabel: 'Add education',
      onClick: () => setActiveCompletionTask('education' as CompletionTaskType)
    }
  ];
  const completionPercentage = Math.round((completionTasks.filter(task => task.complete).length / completionTasks.length) * 100);
  const activeCompletionTaskTitle = activeCompletionTask === 'skill'
    ? 'Add Skill'
    : activeCompletionTask === 'experience'
      ? 'Add Work Experience'
      : 'Add Education';



  return (
    <div className="space-y-6">
      <PageHeader 
        title={isOwnProfile ? 'Profile' : `${userName}'s Profile`}
        actions={isOwnProfile ? <Button variant="outline" size="sm" onClick={() => setIsEditModalOpen(true)}><Edit2 size={14} className="mr-1" /> Edit Profile</Button> : undefined}
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

      <AuraModal
        isOpen={Boolean(activeCompletionTask)}
        onClose={closeCompletionTaskModal}
        title={activeCompletionTaskTitle}
        footer={
          <>
            <Button variant="ghost" onClick={closeCompletionTaskModal}>Cancel</Button>
            <Button onClick={handleSaveCompletionTask} isLoading={isSavingCompletionTask}>
              <Save size={16} className="mr-1.5" /> Save
            </Button>
          </>
        }
      >
        {activeCompletionTask === 'skill' && (
          <div className="space-y-4">
            <Input
              label="Skill"
              value={skillForm.name}
              onChange={(e) => setSkillForm({ ...skillForm, name: e.target.value })}
              placeholder="e.g. React, Java, Product Strategy"
              required
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="skill-proficiency" className="text-sm font-medium text-[var(--text-primary)] mb-1.5 block">Proficiency</label>
                <select
                  id="skill-proficiency"
                  className="w-full h-9 px-3 rounded-lg border border-[var(--border-default)] bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors"
                  value={skillForm.proficiency}
                  onChange={(e) => setSkillForm({ ...skillForm, proficiency: e.target.value })}
                >
                  <option value="BEGINNER">Beginner</option>
                  <option value="INTERMEDIATE">Intermediate</option>
                  <option value="ADVANCED">Advanced</option>
                  <option value="EXPERT">Expert</option>
                </select>
              </div>
              <Input
                label="Years"
                type="number"
                min="0"
                value={skillForm.yearsOfExperience}
                onChange={(e) => setSkillForm({ ...skillForm, yearsOfExperience: e.target.value })}
                placeholder="2"
              />
            </div>
          </div>
        )}

        {activeCompletionTask === 'experience' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Title"
                value={experienceForm.title}
                onChange={(e) => setExperienceForm({ ...experienceForm, title: e.target.value })}
                placeholder="e.g. Frontend Engineer"
                required
              />
              <Input
                label="Company"
                value={experienceForm.company}
                onChange={(e) => setExperienceForm({ ...experienceForm, company: e.target.value })}
                placeholder="e.g. TechCorp"
                required
              />
            </div>
            <Input
              label="Location"
              value={experienceForm.location}
              onChange={(e) => setExperienceForm({ ...experienceForm, location: e.target.value })}
              placeholder="Remote, or New York, NY"
              icon={<MapPin size={16} />}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Start Date"
                type="date"
                value={experienceForm.startDate}
                onChange={(e) => setExperienceForm({ ...experienceForm, startDate: e.target.value })}
                required
              />
              <Input
                label="End Date"
                type="date"
                value={experienceForm.endDate}
                onChange={(e) => setExperienceForm({ ...experienceForm, endDate: e.target.value })}
                disabled={experienceForm.current}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
              <input
                type="checkbox"
                checked={experienceForm.current}
                onChange={(e) => setExperienceForm({ ...experienceForm, current: e.target.checked, endDate: e.target.checked ? '' : experienceForm.endDate })}
              />
              I currently work here
            </label>
            <div>
              <label htmlFor="experience-description" className="block text-sm font-medium mb-1.5 text-[var(--text-primary)]">Description</label>
              <textarea
                id="experience-description"
                className="w-full min-h-[100px] p-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                value={experienceForm.description}
                onChange={(e) => setExperienceForm({ ...experienceForm, description: e.target.value })}
                placeholder="Briefly describe your responsibilities and outcomes..."
              />
            </div>
          </div>
        )}

        {activeCompletionTask === 'education' && (
          <div className="space-y-4">
            <Input
              label="Institution"
              value={educationForm.institution}
              onChange={(e) => setEducationForm({ ...educationForm, institution: e.target.value })}
              placeholder="e.g. Stanford University"
              required
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Degree"
                value={educationForm.degree}
                onChange={(e) => setEducationForm({ ...educationForm, degree: e.target.value })}
                placeholder="e.g. B.S."
              />
              <Input
                label="Field of Study"
                value={educationForm.fieldOfStudy}
                onChange={(e) => setEducationForm({ ...educationForm, fieldOfStudy: e.target.value })}
                placeholder="e.g. Computer Science"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Start Date"
                type="date"
                value={educationForm.startDate}
                onChange={(e) => setEducationForm({ ...educationForm, startDate: e.target.value })}
                required
              />
              <Input
                label="End Date"
                type="date"
                value={educationForm.endDate}
                onChange={(e) => setEducationForm({ ...educationForm, endDate: e.target.value })}
              />
            </div>
            <Input
              label="GPA"
              type="number"
              min="0"
              max="4"
              step="0.01"
              value={educationForm.gpa}
              onChange={(e) => setEducationForm({ ...educationForm, gpa: e.target.value })}
              placeholder="3.80"
            />
          </div>
        )}
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
            {isOwnProfile && <button type="button" aria-label="Profile photo upload unavailable" title="Profile photo upload unavailable" onClick={handleProfilePhotoUnavailable} className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-default)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
              <Camera size={12} />
            </button>}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold">{userName}</h2>
              {isOwnProfile && user?.roles?.includes('ROLE_RECRUITER') && <Badge variant="default">Recruiter</Badge>}
            </div>
            <p className="text-sm text-[var(--text-secondary)]">{profile?.headline || 'Member'}</p>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-[var(--text-muted)]">
              {profile?.location && <span className="flex items-center gap-1"><MapPin size={12} /> {profile.location}</span>}
              {profile?.website && <span className="flex items-center gap-1"><LinkIcon size={12} /> {profile.website}</span>}
              <span className="flex items-center gap-1"><Calendar size={12} /> Joined {profile?.createdAt ? new Date(profile.createdAt).getFullYear() : '2026'}</span>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {skills.map((s: Record<string, any> | string, i: number) => (
                <Badge key={`${getSkillName(s)}-${i}`} variant="outline" className="text-[10px]">
                  {getSkillName(s)}
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
                <span className="font-medium">{completionPercentage}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[var(--border-default)]">
                <div 
                  className="h-full rounded-full bg-accent transition-all duration-500" 
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
              <div className="space-y-3">
                {completionTasks.map((task) => (
                  <div key={task.id} className="flex items-start justify-between gap-3 rounded-lg border border-[var(--border-default)] p-3">
                    <div className="flex items-start gap-3 min-w-0">
                      {task.complete ? (
                        <CheckCircle2 size={16} className="mt-0.5 text-success shrink-0" />
                      ) : (
                        <Circle size={16} className="mt-0.5 text-[var(--text-muted)] shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{task.label}</p>
                        <p className="text-xs text-[var(--text-muted)]">{task.description}</p>
                      </div>
                    </div>
                    {isOwnProfile && !task.complete && (
                      <Button variant="outline" size="sm" onClick={task.onClick}>
                        <Plus size={13} className="mr-1" /> {task.actionLabel}
                      </Button>
                    )}
                  </div>
                ))}
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
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  {formatProfileDate(getExperienceStartDate(exp))} - {exp.current ? 'Present' : formatProfileDate(getExperienceEndDate(exp)) || 'Present'}
                </p>
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
                <p className="text-sm font-semibold">{edu.degree || edu.fieldOfStudy || edu.field_of_study || 'Education'}</p>
                <p className="text-xs text-accent">{edu.institution}</p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  {formatProfileDate(getEducationEndDate(edu) || getEducationStartDate(edu)) || edu.year}
                </p>
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
