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
            // Get total users count
            const { count: totalUsers, error: usersError } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true }); // Removed .eq('is_active', true) as it doesn't match schema

            // Get active jobs count
            const { count: activeJobs, error: jobsError } = await supabase
                .from('jobs')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'PUBLISHED'); // Adjust to known enum

            if (usersError || jobsError) {
                console.error("Failed to fetch stats", usersError || jobsError);
                return;
            }

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
    <div className="min-h-screen bg-white overflow-x-hidden selection:bg-accent/20 selection:text-accent">
      {/* Dynamic Background - Subtle light theme */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(99,102,241,0.06)_0%,transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_70%,rgba(139,92,246,0.06)_0%,transparent_50%)]" />
        <div className="absolute inset-0 cyber-grid opacity-[0.03]" />
      </div>

      {/* Navigation */}
      <nav className="relative z-50 border-b border-slate-200 bg-white/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-3 group cursor-pointer">
              <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 group-hover:border-indigo-300 transition-colors">
                <Globe className="w-6 h-6 text-indigo-600 group-hover:scale-110 transition-transform duration-300" />
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-indigo-700 to-slate-900">
                TalentSphere
              </span>
            </div>

            <div className="hidden md:flex items-center gap-8 text-sm font-medium">
              <a href="#features" className="text-slate-600 hover:text-slate-900 transition-colors">Platform</a>
              <a href="#network" className="text-slate-600 hover:text-slate-900 transition-colors">Network</a>
              <a href="#learning" className="text-slate-600 hover:text-slate-900 transition-colors">Learning</a>
              <div className="h-4 w-[1px] bg-slate-200" />
              <Link to="/login" className="text-slate-700 hover:text-slate-900 transition-colors">
                Sign In
              </Link>
              <Link to="/register">
                <Button className="!px-6">Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="relative z-10 pt-24 pb-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Hero Section */}
          <div className="text-center max-w-4xl mx-auto mb-32 relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-200/30 rounded-full blur-[120px] pointer-events-none" />

            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 border border-indigo-200 text-sm text-indigo-700 mb-8 backdrop-blur-md">
              <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
              TalentSphere v6.0 is live
            </div>

            <h1 className="text-6xl md:text-8xl font-black tracking-tight mb-8 leading-[1.1]">
              <span className="text-slate-900">Next-Gen</span>
              <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 animate-gradient">
                Career Matrix
              </span>
            </h1>

            <p className="text-xl text-slate-600 mb-12 max-w-2xl mx-auto leading-relaxed">
              Unify your professional identity. Connect with visionaries, master new skills,
              and accelerate your trajectory in the ultimate tech ecosystem.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/register">
                <Button size="lg" className="w-full sm:w-auto h-14 px-8 text-lg group">
                  Join the Network
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link to="/jobs">
                <Button variant="outline" size="lg" className="w-full sm:w-auto h-14 px-8 text-lg border-slate-300 hover:bg-slate-50 text-slate-700">
                  Explore Opportunities
                </Button>
              </Link>
            </div>
          </div>

          {/* Core Pillars */}
          <div id="features" className="grid md:grid-cols-3 gap-6 mb-32">
            {[
              {
                icon: <Network className="w-8 h-8 text-indigo-600" />,
                title: "Global Syntax",
                desc: "Forge meaningful connections in a noise-free environment. Smart matching connects you with mentors and peers.",
                bg: "bg-indigo-50",
                border: "border-indigo-200"
              },
              {
                icon: <Target className="w-8 h-8 text-purple-600" />,
                title: "Precision Matching",
                desc: "Our AI engine pairs your verified skills with roles where you'll thrive, eliminating the black hole of job boards.",
                bg: "bg-purple-50",
                border: "border-purple-200"
              },
              {
                icon: <BrainCircuit className="w-8 h-8 text-blue-600" />,
                title: "Continuous Evolution",
                desc: "Upskill through integrated courses and coding challenges. Prove your expertise with verifiable badges.",
                bg: "bg-blue-50",
                border: "border-blue-200"
              }
            ].map((feature, i) => (
              <div key={i} className="group relative rounded-3xl bg-white border border-slate-200 p-8 backdrop-blur-xl hover:border-indigo-200 transition-colors shadow-sm hover:shadow-md">
                <div className={`w-16 h-16 rounded-2xl ${feature.bg} ${feature.border} border flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  {feature.icon}
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-4">{feature.title}</h3>
                <p className="text-slate-600 leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>

          {/* Stats Bar */}
          <div className="relative rounded-3xl bg-gradient-to-r from-indigo-50 via-purple-50 to-indigo-50 border border-indigo-100 p-12 overflow-hidden backdrop-blur-xl">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay" />

            <div className="relative grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              {[
                { label: 'Active Users', value: stats.totalUsers },
                { label: 'Opportunities', value: stats.activeJobs },
                { label: 'Match Rate', value: stats.successRate },
                { label: 'System Status', value: 'Optimal' }
              ].map((stat, i) => (
                <div key={i} className="flex flex-col gap-2">
                  <span className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter">
                    {stat.value}
                  </span>
                  <span className="text-sm font-medium text-slate-600 uppercase tracking-widest">
                    {stat.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-12 bg-white/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-indigo-600" />
            <span className="text-slate-900 font-semibold">TalentSphere</span>
          </div>
          <div className="text-sm text-slate-500">
            &copy; {new Date().getFullYear()} TalentSphere Inc. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
