import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Search } from 'lucide-react';
import { getSearchDestinations } from '../../navigation/routeRegistry';

type SearchDestination = ReturnType<typeof getSearchDestinations>[number];

interface CommandSearchProps {
  roles: readonly string[];
  onNavigate?: () => void;
}

const getSearchResultId = (path: string) => {
  const normalizedPath = path.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'home';
  return `app-shell-search-result-${normalizedPath}`;
};

const getSearchResultLabel = (destination: SearchDestination) => (
  `${destination.label}. ${destination.description}`
);

const getDestinationRank = (destination: SearchDestination, normalizedSearch: string) => {
  const label = destination.label.toLowerCase();
  const description = destination.description.toLowerCase();
  const keywords = destination.keywords.toLowerCase();

  if (!normalizedSearch) return 0;
  if (label === normalizedSearch) return 1;
  if (label.startsWith(normalizedSearch)) return 2;
  if (label.includes(normalizedSearch)) return 3;
  if (description.includes(normalizedSearch)) return 4;
  if (keywords.includes(normalizedSearch)) return 5;
  return Number.POSITIVE_INFINITY;
};

const getSearchResults = (destinations: SearchDestination[], searchTerm: string) => {
  const normalizedSearch = searchTerm.trim().toLowerCase();
  if (!normalizedSearch) return destinations.slice(0, 5);

  return destinations
    .map((destination, index) => ({
      destination,
      index,
      rank: getDestinationRank(destination, normalizedSearch),
    }))
    .filter(result => Number.isFinite(result.rank))
    .sort((left, right) => left.rank - right.rank || left.index - right.index)
    .slice(0, 6)
    .map(result => result.destination);
};

export const CommandSearch: React.FC<CommandSearchProps> = ({ roles, onNavigate }) => {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLFormElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeResultIndex, setActiveResultIndex] = useState(0);

  const destinations = useMemo(() => getSearchDestinations(roles), [roles]);
  const searchResults = useMemo(() => getSearchResults(destinations, searchTerm), [destinations, searchTerm]);
  const activeResult = searchResults[activeResultIndex] || searchResults[0];

  useEffect(() => {
    const handleGlobalKeydown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
        return;
      }

      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleGlobalKeydown);
    return () => window.removeEventListener('keydown', handleGlobalKeydown);
  }, []);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && !containerRef.current?.contains(target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  useEffect(() => {
    setActiveResultIndex(currentIndex => Math.min(currentIndex, Math.max(searchResults.length - 1, 0)));
  }, [searchResults.length]);

  const navigateTo = (path: string) => {
    navigate(path);
    setSearchTerm('');
    setIsOpen(false);
    onNavigate?.();
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (activeResult) {
      navigateTo(activeResult.path);
    }
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!['ArrowDown', 'ArrowUp', 'Enter'].includes(event.key)) return;
    if (searchResults.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setIsOpen(true);
      setActiveResultIndex(index => (index + 1) % searchResults.length);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setIsOpen(true);
      setActiveResultIndex(index => (index - 1 + searchResults.length) % searchResults.length);
      return;
    }

    if (event.key === 'Enter' && isOpen && activeResult) {
      event.preventDefault();
      navigateTo(activeResult.path);
    }
  };

  return (
    <form ref={containerRef} className="relative" role="search" aria-label="Command search" onSubmit={handleSubmit}>
      <Search
        className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
        size={16}
        aria-hidden="true"
        focusable="false"
      />
      <input
        ref={inputRef}
        type="text"
        placeholder="Search destinations"
        role="combobox"
        aria-label="Search platform"
        aria-autocomplete="list"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls="app-shell-search-results"
        aria-describedby="app-shell-search-hint app-shell-search-status"
        aria-keyshortcuts="Control+K Meta+K"
        aria-activedescendant={
          isOpen && activeResult ? getSearchResultId(activeResult.path) : undefined
        }
        className="h-9 w-full rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] pl-9 pr-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
        value={searchTerm}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleInputKeyDown}
        onChange={(event) => {
          setSearchTerm(event.target.value);
          setIsOpen(true);
          setActiveResultIndex(0);
        }}
      />
      <span id="app-shell-search-hint" className="sr-only">
        Route destinations only.
      </span>
      <span id="app-shell-search-status" className="sr-only" aria-live="polite">
        {searchResults.length > 0
          ? `${searchResults.length} destination${searchResults.length === 1 ? '' : 's'} available`
          : 'No destinations available'}
      </span>

      {isOpen && (
        <div
          id="app-shell-search-results"
          role="listbox"
          aria-label="Search destinations"
          aria-describedby="app-shell-search-status"
          className="surface-card absolute left-0 right-0 top-11 z-50 overflow-hidden"
        >
          {searchResults.length > 0 ? (
            <div className="max-h-80 overflow-y-auto p-1.5">
              {searchResults.map((result, index) => {
                const Icon = result.icon;
                const isActiveResult = activeResultIndex === index;

                return (
                  <button
                    key={result.path}
                    id={getSearchResultId(result.path)}
                    type="button"
                    role="option"
                    aria-label={getSearchResultLabel(result)}
                    aria-selected={isActiveResult}
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => setActiveResultIndex(index)}
                    onFocus={() => setActiveResultIndex(index)}
                    onClick={() => navigateTo(result.path)}
                    className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left focus:outline-none focus:ring-2 focus:ring-accent/20 ${
                      isActiveResult ? 'bg-[var(--bg-secondary)]' : 'hover:bg-[var(--bg-secondary)]'
                    }`}
                  >
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent/10 text-accent"
                      aria-hidden="true"
                    >
                      <Icon size={15} aria-hidden="true" focusable="false" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-[var(--text-primary)]">{result.label}</span>
                      <span className="block truncate text-xs text-[var(--text-muted)]">{result.description}</span>
                    </span>
                    <ArrowRight size={14} className="text-[var(--text-muted)]" aria-hidden="true" focusable="false" />
                  </button>
                );
              })}
            </div>
          ) : (
            <div role="status" aria-label="Command search no results" className="px-3 py-4 text-sm text-[var(--text-muted)]">
              No matching destinations
            </div>
          )}
        </div>
      )}
    </form>
  );
};
