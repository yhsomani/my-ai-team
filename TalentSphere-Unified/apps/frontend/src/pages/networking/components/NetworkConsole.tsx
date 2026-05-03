import React from 'react';
import { Search } from 'lucide-react';

interface NetworkConsoleProps {
  activeCategory: string;
  setActiveCategory: (cat: any) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const NetworkConsole: React.FC<NetworkConsoleProps> = ({ 
  activeCategory, 
  setActiveCategory, 
  searchQuery, 
  setSearchQuery 
}) => {
  return (
    <div className="flex flex-col lg:flex-row items-center justify-between gap-10 mb-20">
      <div className="flex p-1.5 gap-1.5 bg-white dark:bg-slate-900 border border-slate-50 dark:border-slate-800 rounded-2xl shadow-xl shadow-slate-200/30 dark:shadow-none overflow-x-auto no-scrollbar">
        {['Recommended', 'Connections', 'Requests', 'Discover'].map((cat) => (
          <button 
            key={cat}
            onClick={() => setActiveCategory(cat as any)}
            className={`px-8 py-3.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all duration-300 whitespace-nowrap ${
              activeCategory === cat 
              ? 'bg-emerald-900 text-white shadow-lg' 
              : 'text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="relative group w-full lg:max-w-xl">
        <Search className="absolute left-8 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-600 transition-colors" size={20} />
        <input 
          type="text"
          placeholder="Identify specific neural fingerprints..."
          className="w-full bg-white dark:bg-slate-950 border border-slate-50 dark:border-slate-800 rounded-[2rem] py-6 pl-18 pr-8 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-700 shadow-xl shadow-slate-200/30 dark:shadow-none"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
    </div>
  );
};

export default React.memo(NetworkConsole);
