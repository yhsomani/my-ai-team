import React from 'react';
import { Calendar, ChevronRight } from 'lucide-react';

interface PrepItem {
  id: string;
  topic: string;
  type: 'Behavioral' | 'Technical' | 'System Design';
  completed: boolean;
}

interface PrepViewProps {
  prepItems: PrepItem[];
  newTopic: string;
  setNewTopic: (val: string) => void;
  newType: PrepItem['type'];
  setNewType: (val: PrepItem['type']) => void;
  handleAddPrep: (e: React.FormEvent) => void;
  togglePrep: (id: string) => void;
  clearPrep: () => void;
}

export const PrepView: React.FC<PrepViewProps> = ({
  prepItems,
  newTopic,
  setNewTopic,
  newType,
  setNewType,
  handleAddPrep,
  togglePrep,
  clearPrep
}) => {
  return (
    <div className="max-w-4xl space-y-8" id="opt-view-prep">
      <div className="space-y-2">
        <div className="flex items-center space-x-2 text-purple-400 text-xs font-semibold uppercase tracking-wider">
          <Calendar className="h-4 w-4" />
          <span>Career Coaching Sandbox</span>
        </div>
        <h2 className="text-3xl font-extrabold font-outfit text-white tracking-tight">Interview Planner</h2>
        <p className="text-slate-400 text-sm max-w-2xl">
          Keep track of your review tasks, custom study cards, and behavioral drilling strategies.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-1 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 h-fit space-y-4">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">New Preparation Card</h3>
          
          <form onSubmit={handleAddPrep} className="space-y-3.5">
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-semibold uppercase">Topic</label>
              <input
                type="text"
                placeholder="e.g. STAR Method drills"
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                required
                id="prep-topic-input"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-semibold uppercase">Review Category</label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as PrepItem['type'])}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-300 focus:outline-none focus:border-purple-500"
                id="prep-category-select"
              >
                <option value="Technical">Technical</option>
                <option value="Behavioral">Behavioral</option>
                <option value="System Design">System Design</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full bg-purple-600 hover:bg-purple-500 shadow-purpleGlow text-white text-xs font-semibold py-2.5 rounded-lg transition duration-200"
              id="submit-prep-btn"
            >
              Add Plan Card
            </button>
          </form>
        </div>

        <div className="col-span-2 space-y-3">
          <div className="flex justify-between items-center bg-slate-900/10 p-3 rounded-lg border border-slate-800/40">
            <span className="text-xs text-slate-400 font-semibold">Active Preparation Cards: ({prepItems.length})</span>
            <button 
              onClick={clearPrep} 
              className="text-[10px] text-slate-500 hover:text-slate-300 transition duration-150 cursor-pointer"
              id="clear-prep-btn"
            >
              Clear All
            </button>
          </div>

          <div className="space-y-2 h-[400px] overflow-y-auto pr-1" id="prep-list-container">
            {prepItems.map((item) => (
              <div
                key={item.id}
                onClick={() => togglePrep(item.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    togglePrep(item.id);
                  }
                }}
                role="button"
                tabIndex={0}
                className={`group border rounded-2xl p-4 flex justify-between items-center transition cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-purple-500/80 ${
                  item.completed
                    ? 'bg-slate-900/10 border-slate-850 text-slate-500'
                    : 'bg-slate-900/30 hover:bg-slate-900/60 border-slate-800/60 text-slate-100 hover:border-slate-850'
                }`}
              >

                <div className="flex items-center space-x-3">
                  <div className={`h-5 w-5 rounded-md flex items-center justify-center border transition ${
                    item.completed 
                      ? 'bg-emerald-950/60 border-emerald-500/80 text-emerald-400' 
                      : 'border-slate-700 text-transparent group-hover:border-purple-500'
                  }`}>
                    ✓
                  </div>
                  <div>
                    <span className={`text-xs font-medium ${item.completed ? 'line-through' : ''}`}>
                      {item.topic}
                    </span>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className={`text-[9px] font-semibold uppercase tracking-wider ${
                        item.type === 'Technical' ? 'text-cyan-400' :
                        item.type === 'System Design' ? 'text-purple-400' :
                        'text-amber-400'
                      }`}>
                        {item.type}
                      </span>
                    </div>
                  </div>
                </div>
                
                <ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-slate-400 transition" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
