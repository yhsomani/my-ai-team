import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BrainCircuit, Network, Zap,
  Globe, ChevronRight,
  Layers, Target, Cpu, ArrowRight
} from 'lucide-react';
import { Button } from '../components/shared/AuraButton';
import { supabase } from '../lib/supabaseClient';

const LandingPage: React.FC = () => {
  const [stats, setStats] = useState({ totalUsers: '12k+', activeJobs: '1k+', successRate: '94.2%' });

  useEffect(() => {
    const fetchPublicStats = async () => {
        try {
<<<<<<< HEAD
            const response = await axios.get(`${import.meta.env.VITE_API_URL || window.location.origin}/api/v1/admin/public/stats`);
            const data = response.data.data;
=======
            // Get total users count
            const { count: totalUsers, error: usersError } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .eq('is_active', true);

            // Get active jobs count
            const { count: activeJobs, error: jobsError } = await supabase
                .from('jobs')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'ACTIVE');

            if (usersError || jobsError) {
                console.error("Failed to fetch stats", usersError || jobsError);
                return;
            }

>>>>>>> 4c83dee4028d58c61065c033c82cebeb5e95576e
            setStats({
                totalUsers: totalUsers && totalUsers > 1000 ? `${(totalUsers / 1000).toFixed(1)}k+` : `${totalUsers || 0}`,
                activeJobs: activeJobs && activeJobs > 1000 ? `${(activeJobs / 1000).toFixed(1)}k+` : `${activeJobs || 0}+`,
                successRate: '94.2%' // This would need to be calculated from applications
            });
        } catch (err) {
            console.error("Failed to fetch public stats", err);
        }
    };
    fetchPublicStats();
  }, []);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 h-14 px-6 lg:px-12 flex items-center justify-between border-b border-[var(--border-default)] bg-[var(--bg-primary)]/80 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-white">
            <Layers size={16} />
          </div>
          <span className="text-sm font-semibold">TalentSphere</span>
        </div>

        <div className="hidden md:flex items-center gap-6">
          {['Features', 'Pricing', 'About'].map((item) => (
            <a key={item} href={`#${item.toLowerCase()}`} className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
              {item}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Link to="/login">
            <Button variant="ghost" size="sm">Sign in</Button>
          </Link>
          <Link to="/register">
            <Button size="sm">Get Started</Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-24 lg:py-32 px-6 lg:px-12">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-sm text-accent">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            Now in Public Beta
          </div>

          <h1 className="text-4xl md:text-6xl font-semibold tracking-tight leading-[1.1]">
            The AI-Powered <br />
            <span className="text-gradient">Talent Platform</span>
          </h1>

          <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto leading-relaxed">
            Connecting exceptional talent with transformative opportunities through
            intelligent matching, skill assessment, and career development tools.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register">
              <Button size="lg">
                Start Free <ArrowRight size={16} className="ml-1.5" />
              </Button>
            </Link>
            <a href="#features">
              <Button variant="outline" size="lg">Learn More</Button>
            </a>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 px-6 lg:px-12 border-y border-[var(--border-default)]">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { label: 'Active Users', value: stats.totalUsers, icon: Network },
            { label: 'Match Rate', value: stats.successRate, icon: Target },
            { label: 'Active Jobs', value: stats.activeJobs, icon: Zap },
            { label: 'Countries', value: '180+', icon: Globe },
          ].map((stat, i) => (
            <div key={i} className="text-center space-y-2">
              <stat.icon size={20} className="mx-auto text-accent" />
              <p className="text-3xl font-semibold tracking-tight">{stat.value}</p>
              <p className="text-sm text-[var(--text-muted)]">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6 lg:px-12">
        <div className="max-w-5xl mx-auto space-y-16">
          <div className="text-center space-y-4">
            <h2 className="text-3xl font-semibold tracking-tight">Built for modern talent management</h2>
            <p className="text-[var(--text-secondary)] max-w-2xl mx-auto">
              Everything you need to discover, assess, and connect with the right opportunities.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                title: 'AI Career Matching',
                desc: 'Our AI engine maps your unique skills and experience to high-impact opportunities globally.',
                icon: BrainCircuit,
              },
              {
                title: 'Professional Network',
                desc: 'Connect with industry leaders, recruiters, and peers in your field.',
                icon: Network,
              },
              {
                title: 'Skill Development',
                desc: 'Structured learning paths and challenges to stay at the cutting edge of your domain.',
                icon: Cpu,
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="p-6 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] hover:border-accent/30 transition-colors group"
              >
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent mb-4 group-hover:bg-accent/20 transition-colors">
                  <feature.icon size={20} />
                </div>
                <h3 className="text-base font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{feature.desc}</p>
                <div className="mt-4 flex items-center text-sm text-accent group-hover:gap-2 gap-1 transition-all cursor-pointer">
                  Learn more <ChevronRight size={14} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 lg:px-12">
        <div className="max-w-3xl mx-auto text-center space-y-8 p-12 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)]">
          <h2 className="text-3xl font-semibold tracking-tight">Ready to get started?</h2>
          <p className="text-[var(--text-secondary)] max-w-xl mx-auto">
            Join thousands of professionals who are taking control of their career trajectory
            with AI-powered tools and a world-class network.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link to="/register">
              <Button size="lg">Create Free Account</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 lg:px-12 border-t border-[var(--border-default)]">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-start gap-12">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-accent flex items-center justify-center text-white">
                <Layers size={14} />
              </div>
              <span className="text-sm font-semibold">TalentSphere</span>
            </div>
            <p className="text-sm text-[var(--text-muted)] max-w-xs">
              The modern platform for AI-powered talent discovery and career management.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-12">
            {[
              { title: 'Platform', links: ['Features', 'Pricing', 'Integrations', 'Changelog'] },
              { title: 'Resources', links: ['Documentation', 'API Reference', 'Blog', 'Support'] },
              { title: 'Company', links: ['About', 'Careers', 'Contact', 'Privacy'] },
            ].map((group, i) => (
              <div key={i} className="space-y-3">
                <h5 className="text-sm font-medium">{group.title}</h5>
                <ul className="space-y-2">
                  {group.links.map(link => (
                    <li key={link}>
                      <a href="#" className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">{link}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="max-w-5xl mx-auto pt-8 mt-8 border-t border-[var(--border-default)] flex justify-between items-center text-xs text-[var(--text-muted)]">
          <span>© 2026 TalentSphere. All rights reserved.</span>
          <div className="flex gap-4">
            <a href="#" className="hover:text-[var(--text-primary)] transition-colors">Terms</a>
            <a href="#" className="hover:text-[var(--text-primary)] transition-colors">Privacy</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
