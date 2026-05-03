import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/shared/PageHeader';
import Card from '../../components/shared/GlassCard';
import { Button } from '../../components/shared/AuraButton';
import { Briefcase, MapPin, DollarSign, FileText, Send } from 'lucide-react';
import { jobService } from '../../services/jobService';

const PostJobPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    salaryRange: '',
    jobType: 'Full-time',
    category: 'Engineering',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await jobService.postJob({
        title: formData.title,
        description: formData.description,
        location: formData.location,
        jobType: formData.jobType,
        companyName: "TalentSphere Partner", // Default for now
        postedAt: new Date().toISOString()
      });
      navigate('/jobs');
    } catch (err) {
      console.error('Failed to post job:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <PageHeader 
        title="Post a New Job" 
        description="Fill in the details to find your next great hire."
      />

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5 text-[var(--text-secondary)]">Job Title</label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
                <input
                  required
                  type="text"
                  placeholder="e.g. Senior Rust Engineer"
                  className="w-full h-11 pl-10 pr-4 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5 text-[var(--text-secondary)]">Location</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
                  <input
                    required
                    type="text"
                    placeholder="e.g. Remote or New York, NY"
                    className="w-full h-11 pl-10 pr-4 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5 text-[var(--text-secondary)]">Salary Range</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
                  <input
                    required
                    type="text"
                    placeholder="e.g. $120k - $180k"
                    className="w-full h-11 pl-10 pr-4 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                    value={formData.salaryRange}
                    onChange={(e) => setFormData({ ...formData, salaryRange: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5 text-[var(--text-secondary)]">Job Type</label>
                <select
                  className="w-full h-11 px-4 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all appearance-none"
                  value={formData.jobType}
                  onChange={(e) => setFormData({ ...formData, jobType: e.target.value })}
                >
                  <option>Full-time</option>
                  <option>Part-time</option>
                  <option>Contract</option>
                  <option>Freelance</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5 text-[var(--text-secondary)]">Category</label>
                <select
                  className="w-full h-11 px-4 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all appearance-none"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  <option>Engineering</option>
                  <option>Design</option>
                  <option>Product</option>
                  <option>Marketing</option>
                  <option>Sales</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5 text-[var(--text-secondary)]">Description</label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 text-[var(--text-muted)]" size={16} />
                <textarea
                  required
                  rows={6}
                  placeholder="Describe the role, responsibilities, and requirements..."
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all resize-none"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              className="flex-1" 
              onClick={() => navigate(-1)}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="flex-1" 
              disabled={loading}
            >
              {loading ? 'Posting...' : 'Post Job'} <Send size={14} className="ml-2" />
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default PostJobPage;
