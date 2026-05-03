import React, { useState } from 'react';
import { Plus, Trash2, Download, GripVertical, FileText } from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import Card from '../../components/shared/GlassCard';
import { Button } from '../../components/shared/AuraButton';
import { Input } from '../../components/shared/AuraInput';
import { Tabs } from '../../components/shared/Tabs';
import { useToast } from '../../components/shared/Toast';

const ResumeBuilder: React.FC = () => {
  const [activeTab, setActiveTab] = useState('editor');
  const { addToast } = useToast();

  const handleExport = () => {
    addToast({ type: 'success', title: 'Exporting PDF', message: 'Your resume is being generated.' });
  };

  const handleSave = () => {
    addToast({ type: 'success', title: 'Saved', message: 'Your resume changes have been saved.' });
  };

  const handleAdd = (section: string) => {
    addToast({ type: 'info', title: 'Coming Soon', message: `Adding ${section} will be available in the next release.` });
  };

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
              <Input label="First Name" defaultValue="John" />
              <Input label="Last Name" defaultValue="Doe" />
              <Input label="Email" defaultValue="john@example.com" type="email" />
              <Input label="Phone" defaultValue="+1 234 567 8900" />
              <Input label="Location" defaultValue="San Francisco, CA" className="col-span-2" />
              <Input label="Website" defaultValue="https://johndoe.dev" className="col-span-2" />
            </div>
          </Card>

          {/* Summary */}
          <Card className="p-5 space-y-4">
            <h3 className="text-sm font-semibold">Professional Summary</h3>
            <textarea
              className="w-full rounded-lg border border-[var(--border-default)] bg-transparent px-3 py-2 text-sm min-h-[120px] focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none"
              defaultValue="Experienced full-stack developer with 5+ years of building scalable web applications. Expert in React, Node.js, and cloud infrastructure."
            />
          </Card>

          {/* Experience */}
          <Card className="p-5 space-y-4 lg:col-span-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Work Experience</h3>
              <Button variant="outline" size="sm" onClick={() => handleAdd('experience')}><Plus size={14} className="mr-1" /> Add</Button>
            </div>
            {[
              { title: 'Senior Frontend Developer', company: 'TechCorp Inc.', period: '2023 – Present' },
              { title: 'Full Stack Developer', company: 'StartupXYZ', period: '2021 – 2023' },
            ].map((exp, i) => (
              <div key={i} className="flex items-start gap-3 p-4 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)]">
                <GripVertical size={16} className="text-[var(--text-muted)] mt-0.5 cursor-grab" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{exp.title}</p>
                      <p className="text-xs text-[var(--text-muted)]">{exp.company} · {exp.period}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="text-[var(--text-muted)] hover:text-destructive">
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </Card>

          {/* Skills */}
          <Card className="p-5 space-y-4 lg:col-span-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Skills</h3>
              <Button variant="outline" size="sm" onClick={() => handleAdd('skills')}><Plus size={14} className="mr-1" /> Add</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {['React', 'TypeScript', 'Node.js', 'Python', 'AWS', 'Docker', 'PostgreSQL', 'GraphQL'].map(s => (
                <span key={s} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-default)] text-sm bg-[var(--bg-primary)]">
                  {s}
                  <button className="text-[var(--text-muted)] hover:text-destructive transition-colors">
                    <Trash2 size={12} />
                  </button>
                </span>
              ))}
            </div>
          </Card>
        </div>
      ) : (
        <Card className="p-8 max-w-2xl mx-auto">
          <div className="space-y-6">
            <div className="text-center border-b border-[var(--border-default)] pb-6">
              <h2 className="text-2xl font-semibold">John Doe</h2>
              <p className="text-sm text-[var(--text-secondary)]">Senior Frontend Developer</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">San Francisco, CA · john@example.com · +1 234 567 8900</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-2 text-accent uppercase tracking-wide">Summary</h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                Experienced full-stack developer with 5+ years of building scalable web applications. Expert in React, Node.js, and cloud infrastructure.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-3 text-accent uppercase tracking-wide">Experience</h3>
              <div className="space-y-4">
                <div><p className="text-sm font-medium">Senior Frontend Developer — TechCorp Inc.</p><p className="text-xs text-[var(--text-muted)]">2023 – Present</p></div>
                <div><p className="text-sm font-medium">Full Stack Developer — StartupXYZ</p><p className="text-xs text-[var(--text-muted)]">2021 – 2023</p></div>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default ResumeBuilder;