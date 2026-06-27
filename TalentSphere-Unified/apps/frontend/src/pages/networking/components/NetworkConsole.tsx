import React from 'react';
import { Search } from 'lucide-react';

interface NetworkConsoleProps {
  activeCategory: string;
  setActiveCategory: (cat: any) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

const categories = ['Recommended', 'Connections', 'Requests', 'Discover'];

export const NetworkConsole: React.FC<NetworkConsoleProps> = ({
  activeCategory,
  setActiveCategory,
  searchQuery,
  setSearchQuery
}) => {
  return (
    <div className="surface-panel flex flex-col gap-3 p-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 flex-wrap items-center gap-1" role="tablist" aria-label="Networking categories">
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            role="tab"
            aria-selected={activeCategory === category}
            onClick={() => setActiveCategory(category)}
            className={`inline-flex h-9 items-center rounded-md px-3 text-xs font-medium transition-colors ${
              activeCategory === category
                ? 'bg-[var(--bg-primary)] text-accent'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      <div className="relative w-full lg:max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
        <input
          type="text"
          aria-label="Search network"
          placeholder="Search people..."
          className="h-9 w-full rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)] pl-9 pr-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
    </div>
  );
};

export default React.memo(NetworkConsole);
