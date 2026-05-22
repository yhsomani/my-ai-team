import { useState, useCallback } from 'react';
import { Sparkles, Calendar, Settings2, Cpu, RefreshCw } from 'lucide-react';
import { useChromeStorage } from '../hooks/useChromeStorage';

import { AIView } from './views/AIView';
import { PrepView } from './views/PrepView';
import { SettingsView } from './views/SettingsView';

interface PrepItem {
  id: string;
  topic: string;
  type: 'Behavioral' | 'Technical' | 'System Design';
  completed: boolean;
}

export function OptionsApp() {
  const [activeTab, setActiveTab] = useState<'ai' | 'prep' | 'settings'>('ai');
  const [prepItems, setPrepItems] = useChromeStorage<PrepItem[]>('ts_prep', [
    { id: '1', topic: 'Practice "Tell me about a time" (STAR method)', type: 'Behavioral', completed: true },
    { id: '2', topic: 'Review Spring Boot JPA query optimization rules', type: 'Technical', completed: false },
    { id: '3', topic: 'Draw mock microservices event architecture', type: 'System Design', completed: false }
  ]);

  const [jobDescription, setJobDescription] = useState('');
  const [resumeText, setResumeText] = useState('');
  const [optimizing, setOptimizing] = useState(false);
  const [optimized, setOptimized] = useState(false);
  const [score, setScore] = useState(65);

  const [cloudSync, setCloudSync] = useChromeStorage('ts_settings_cloud', true);
  const [notifications, setNotifications] = useChromeStorage('ts_settings_notif', true);
  const [analytics, setAnalytics] = useChromeStorage('ts_settings_analytics', false);

  const [newTopic, setNewTopic] = useState('');
  const [newType, setNewType] = useState<PrepItem['type']>('Technical');

  const handleOptimize = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!jobDescription || !resumeText) return;

    setOptimizing(true);
    setTimeout(() => {
      setOptimizing(false);
      setOptimized(true);
      setScore(88); // Bump matching score
    }, 2000);
  }, [jobDescription, resumeText]);

  const handleAddPrep = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopic) return;

    const newItem: PrepItem = {
      id: Date.now().toString(),
      topic: newTopic,
      type: newType,
      completed: false
    };

    setPrepItems(curr => [...curr, newItem]);
    setNewTopic('');
  }, [newTopic, newType, setPrepItems]);

  const togglePrep = useCallback((id: string) => {
    setPrepItems(curr => curr.map(item => item.id === id ? { ...item, completed: !item.completed } : item));
  }, [setPrepItems]);

  const clearPrep = useCallback(() => {
    setPrepItems([]);
  }, [setPrepItems]);

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans">
      <aside className="w-64 bg-slate-900/60 border-r border-slate-800 p-6 flex flex-col justify-between backdrop-blur-glass">
        <div className="space-y-8">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-purple-600 flex items-center justify-center shadow-lg">
              <Cpu className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-base font-outfit tracking-wide text-white">TalentSphere</h1>
              <span className="text-[10px] text-cyan-400 font-semibold uppercase tracking-wider">Companion Console</span>
            </div>
          </div>

          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('ai')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition duration-200 ${
                activeTab === 'ai'
                  ? 'bg-gradient-to-r from-cyan-500/10 to-cyan-500/0 text-cyan-400 border-l-4 border-cyan-400 shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
              id="options-ai-tab"
            >
              <Sparkles className="h-4 w-4" />
              <span>AI Resume Matcher</span>
            </button>
            <button
              onClick={() => setActiveTab('prep')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition duration-200 ${
                activeTab === 'prep'
                  ? 'bg-gradient-to-r from-purple-500/10 to-purple-500/0 text-purple-400 border-l-4 border-purple-400 shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
              id="options-prep-tab"
            >
              <Calendar className="h-4 w-4" />
              <span>Interview Planner</span>
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition duration-200 ${
                activeTab === 'settings'
                  ? 'bg-gradient-to-r from-emerald-500/10 to-emerald-500/0 text-emerald-400 border-l-4 border-emerald-400 shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
              id="options-settings-tab"
            >
              <Settings2 className="h-4 w-4" />
              <span>System Settings</span>
            </button>
          </nav>
        </div>

        <div className="bg-slate-950/40 border border-slate-850 rounded-xl p-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[10px] text-slate-400">Database Sync: Connected</span>
          </div>
          <RefreshCw className="h-3 w-3 text-slate-500 animate-spin" />
        </div>
      </aside>

      <main className="flex-1 p-10 overflow-y-auto">
        {activeTab === 'ai' && (
          <AIView 
            jobDescription={jobDescription}
            setJobDescription={setJobDescription}
            resumeText={resumeText}
            setResumeText={setResumeText}
            optimizing={optimizing}
            optimized={optimized}
            score={score}
            handleOptimize={handleOptimize}
          />
        )}

        {activeTab === 'prep' && (
          <PrepView 
            prepItems={prepItems}
            newTopic={newTopic}
            setNewTopic={setNewTopic}
            newType={newType}
            setNewType={setNewType}
            handleAddPrep={handleAddPrep}
            togglePrep={togglePrep}
            clearPrep={clearPrep}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView 
            cloudSync={cloudSync}
            setCloudSync={setCloudSync}
            notifications={notifications}
            setNotifications={setNotifications}
            analytics={analytics}
            setAnalytics={setAnalytics}
            clearPrep={clearPrep}
          />
        )}
      </main>
    </div>
  );
}
