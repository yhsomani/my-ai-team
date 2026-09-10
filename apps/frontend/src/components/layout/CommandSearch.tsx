import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Briefcase, GraduationCap, Loader2, Search, Trophy } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { getSearchDestinations } from '../../navigation/routeRegistry';
import {
  isUnifiedSearchTermValid,
  runUnifiedSearch,
} from '../../lib/unifiedSearch';
import type { UnifiedSearchResponse } from '../../lib/unifiedSearch';

type SearchDestination = ReturnType<typeof getSearchDestinations>[number];

type SearchOptionGroup = 'pages' | 'jobs' | 'courses' | 'challenges';

interface SearchOption {
  key: string;
  group: SearchOptionGroup;
  label: string;
  description: string;
  path: string;
  icon: LucideIcon;
}

interface CommandSearchProps {
  roles: readonly string[];
  onNavigate?: () => void;
}

const unifiedSearchDebounceMs = 250;

const groupHeadings: Record<SearchOptionGroup, string> = {
  pages: 'Pages',
  jobs: 'Jobs',
  courses: 'Courses',
  challenges: 'Challenges',
};

const contentGroupIcons = {
  jobs: Briefcase,
  courses: GraduationCap,
  challenges: Trophy,
} as const;

const getOptionElementId = (option: Pick<SearchOption, 'key'>) => (
  `app-shell-search-result-${option.key}`
);

const getOptionAriaLabel = (option: SearchOption) => (
  `${option.label}. ${option.description}`
);

const normalizeKeyPart = (value: string) => (
  value.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'item'
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

const getPageOptions = (destinations: SearchDestination[], searchTerm: string): SearchOption[] => {
  const normalizedSearch = searchTerm.trim().toLowerCase();

  const matched = normalizedSearch
    ? destinations
        .map((destination, index) => ({
          destination,
          index,
          rank: getDestinationRank(destination, normalizedSearch),
        }))
        .filter(result => Number.isFinite(result.rank))
        .sort((left, right) => left.rank - right.rank || left.index - right.index)
        .slice(0, 4)
        .map(result => result.destination)
    : destinations.slice(0, 5);

  return matched.map(destination => ({
    key: normalizeKeyPart(destination.path),
    group: 'pages' as const,
    label: destination.label,
    description: destination.description,
    path: destination.path,
    icon: destination.icon,
  }));
};

const buildContentOptions = (response: UnifiedSearchResponse): SearchOption[] => [
  ...response.jobs.map(job => ({
    key: `job-${normalizeKeyPart(job.id || job.title)}`,
    group: 'jobs' as const,
    label: job.title,
    description: [job.companyName, job.location].filter(Boolean).join(' · ') || 'Open role',
    path: `/jobs?q=${encodeURIComponent(job.title)}`,
    icon: contentGroupIcons.jobs,
  })),
  ...response.courses.map(course => ({
    key: `course-${normalizeKeyPart(course.id || course.title)}`,
    group: 'courses' as const,
    label: course.title,
    description: [course.provider, course.category].filter(Boolean).join(' · ') || 'Course',
    path: `/lms?q=${encodeURIComponent(course.title)}`,
    icon: contentGroupIcons.courses,
  })),
  ...response.challenges.map(challenge => ({
    key: `challenge-${normalizeKeyPart(challenge.id || challenge.title)}`,
    group: 'challenges' as const,
    label: challenge.title,
    description: [challenge.difficulty, challenge.category].filter(Boolean).join(' · ') || 'Coding challenge',
    path: '/challenges',
    icon: contentGroupIcons.challenges,
  })),
];

const groupOrder: SearchOptionGroup[] = ['pages', 'jobs', 'courses', 'challenges'];

export const CommandSearch: React.FC<CommandSearchProps> = ({ roles, onNavigate }) => {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLFormElement>(null);
  const searchSequenceRef = useRef(0);
  const debounceTimerRef = useRef<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeResultIndex, setActiveResultIndex] = useState(0);
  const [contentResults, setContentResults] = useState<UnifiedSearchResponse | null>(null);
  const [isContentLoading, setIsContentLoading] = useState(false);

  const destinations = useMemo(() => getSearchDestinations(roles), [roles]);

  useEffect(() => {
    debounceTimerRef.current = window.setTimeout(() => {
      setDebouncedTerm(searchTerm);
    }, unifiedSearchDebounceMs);

    return () => {
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchTerm]);

  useEffect(() => {
    const sequence = ++searchSequenceRef.current;

    if (!isUnifiedSearchTermValid(debouncedTerm)) {
      setContentResults(null);
      setIsContentLoading(false);
      return;
    }

    setIsContentLoading(true);
    runUnifiedSearch(debouncedTerm)
      .then(response => {
        if (searchSequenceRef.current === sequence) {
          setContentResults(response);
          setIsContentLoading(false);
        }
      })
      .catch(() => {
        if (searchSequenceRef.current === sequence) {
          setContentResults({ jobs: [], courses: [], challenges: [], errors: [] });
          setIsContentLoading(false);
        }
      });
  }, [debouncedTerm]);

  useEffect(() => () => {
    searchSequenceRef.current += 1;
  }, []);

  const pageOptions = useMemo(
    () => getPageOptions(destinations, searchTerm),
    [destinations, searchTerm],
  );

  const contentOptions = useMemo(
    () => (contentResults ? buildContentOptions(contentResults) : []),
    [contentResults],
  );

  const flatOptions = useMemo(() => (
    [...pageOptions, ...contentOptions].sort(
      (left, right) => groupOrder.indexOf(left.group) - groupOrder.indexOf(right.group),
    )
  ), [pageOptions, contentOptions]);

  const activeResult = flatOptions[activeResultIndex] || flatOptions[0];
  const showContentSection = isUnifiedSearchTermValid(searchTerm);
  const hasAnyResult = flatOptions.length > 0;

  useEffect(() => {
    setActiveResultIndex(currentIndex => Math.min(currentIndex, Math.max(flatOptions.length - 1, 0)));
  }, [flatOptions.length]);

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

  const navigateTo = (path: string) => {
    navigate(path);
    setSearchTerm('');
    setDebouncedTerm('');
    setContentResults(null);
    setIsOpen(false);
    onNavigate?.();
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (activeResult && isOpen) {
      navigateTo(activeResult.path);
    }
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!['ArrowDown', 'ArrowUp', 'Enter'].includes(event.key)) return;
    if (flatOptions.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setIsOpen(true);
      setActiveResultIndex(index => (index + 1) % flatOptions.length);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setIsOpen(true);
      setActiveResultIndex(index => (index - 1 + flatOptions.length) % flatOptions.length);
      return;
    }

    if (event.key === 'Enter' && isOpen && activeResult) {
      event.preventDefault();
      navigateTo(activeResult.path);
    }
  };

  const statusMessage = !searchTerm.trim()
    ? flatOptions.length > 0
      ? `${flatOptions.length} destination${flatOptions.length === 1 ? '' : 's'} available`
      : 'No destinations available'
    : isContentLoading && !hasAnyResult
      ? 'Searching jobs, courses, and challenges'
      : hasAnyResult
        ? `${flatOptions.length} result${flatOptions.length === 1 ? '' : 's'} available`
        : 'No matching destinations';

  const renderGroupedOptions = () => {
    const sections: React.ReactNode[] = [];
    let lastGroup: SearchOptionGroup | null = null;

    flatOptions.forEach((option, index) => {
      if (option.group !== lastGroup) {
        lastGroup = option.group;
        sections.push(
          <div
            key={`heading-${option.group}`}
            aria-hidden="true"
            className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase text-[var(--text-muted)]"
          >
            {groupHeadings[option.group]}
          </div>,
        );
      }

      const Icon = option.icon;
      const isActiveResult = activeResultIndex === index;

      sections.push(
        <button
          key={option.key}
          id={getOptionElementId(option)}
          type="button"
          role="option"
          aria-label={getOptionAriaLabel(option)}
          aria-selected={isActiveResult}
          onMouseDown={(event) => event.preventDefault()}
          onMouseEnter={() => setActiveResultIndex(index)}
          onFocus={() => setActiveResultIndex(index)}
          onClick={() => navigateTo(option.path)}
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
            <span className="block truncate text-sm font-medium text-[var(--text-primary)]">{option.label}</span>
            <span className="block truncate text-xs text-[var(--text-muted)]">{option.description}</span>
          </span>
          {option.group === 'pages' && (
            <ArrowRight size={14} className="text-[var(--text-muted)]" aria-hidden="true" focusable="false" />
          )}
        </button>,
      );
    });

    return sections;
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
        placeholder="Search pages, jobs, courses"
        role="combobox"
        aria-label="Search platform"
        aria-autocomplete="list"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls="app-shell-search-results"
        aria-describedby="app-shell-search-hint app-shell-search-status"
        aria-keyshortcuts="Control+K Meta+K"
        aria-activedescendant={
          isOpen && activeResult ? getOptionElementId(activeResult) : undefined
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
        Searches pages plus live jobs, courses, and challenges.
      </span>
      <span id="app-shell-search-status" className="sr-only" aria-live="polite">
        {statusMessage}
      </span>

      {isOpen && (
        <div
          id="app-shell-search-results"
          role="listbox"
          aria-label="Search destinations"
          aria-describedby="app-shell-search-status"
          className="surface-card absolute left-0 right-0 top-11 z-50 overflow-hidden"
        >
          {hasAnyResult ? (
            <div className="max-h-96 overflow-y-auto p-1.5">
              {renderGroupedOptions()}
              {showContentSection && isContentLoading && (
                <div
                  role="status"
                  aria-label="Content search loading"
                  className="flex items-center gap-2 px-3 py-2 text-xs text-[var(--text-muted)]"
                >
                  <Loader2 size={13} className="animate-spin" aria-hidden="true" focusable="false" />
                  Searching jobs, courses, and challenges...
                </div>
              )}
              {!isContentLoading && contentResults && contentResults.errors.length > 0 && contentOptions.length > 0 && (
                <div role="status" className="px-3 py-2 text-xs text-[var(--text-muted)]">
                  Some sources are unavailable; showing what loaded.
                </div>
              )}
            </div>
          ) : isContentLoading ? (
            <div role="status" aria-label="Command search loading" className="flex items-center gap-2 px-3 py-4 text-sm text-[var(--text-muted)]">
              <Loader2 size={14} className="animate-spin" aria-hidden="true" focusable="false" />
              Searching jobs, courses, and challenges...
            </div>
          ) : (
            <div role="status" aria-label="Command search no results" className="px-3 py-4 text-sm text-[var(--text-muted)]">
              No matching destinations or content found.
            </div>
          )}
        </div>
      )}
    </form>
  );
};
