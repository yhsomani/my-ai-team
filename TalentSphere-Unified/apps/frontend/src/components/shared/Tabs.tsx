import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface TabsProps {
  tabs: { id: string; label: string; icon?: React.ReactNode }[];
  activeTab: string;
  onTabChange: (id: string) => void;
  className?: string;
  ariaLabel?: string;
  idPrefix?: string;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onTabChange, className, ariaLabel = 'Section tabs', idPrefix }) => {
  const tabRefs = React.useRef(new Map<string, HTMLButtonElement>());
  const pendingKeyboardFocusTabId = React.useRef<string | null>(null);
  const getTabId = (tabId: string) => idPrefix ? `${idPrefix}-tab-${tabId}` : undefined;
  const getPanelId = (tabId: string) => idPrefix ? `${idPrefix}-panel-${tabId}` : undefined;

  React.useEffect(() => {
    const pendingTabId = pendingKeyboardFocusTabId.current;
    if (!pendingTabId || pendingTabId !== activeTab) return;

    pendingKeyboardFocusTabId.current = null;
    tabRefs.current.get(activeTab)?.focus();
  }, [activeTab]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const activeIndex = tabs.findIndex((tab) => tab.id === activeTab);
    if (activeIndex === -1) return;

    const nextTabForKey = {
      ArrowRight: tabs[(activeIndex + 1) % tabs.length],
      ArrowLeft: tabs[(activeIndex - 1 + tabs.length) % tabs.length],
      Home: tabs[0],
      End: tabs[tabs.length - 1],
    }[event.key];

    if (!nextTabForKey) return;

    event.preventDefault();
    pendingKeyboardFocusTabId.current = nextTabForKey.id;
    onTabChange(nextTabForKey.id);
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      aria-orientation="horizontal"
      onKeyDown={handleKeyDown}
      className={cn('flex w-fit max-w-full gap-1 overflow-x-auto rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-1', className)}
      data-ui="tabs-list"
      data-slot="tabs-list"
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          id={getTabId(tab.id)}
          ref={(node) => {
            if (node) {
              tabRefs.current.set(tab.id, node);
              return;
            }

            tabRefs.current.delete(tab.id);
          }}
          type="button"
          role="tab"
          aria-selected={activeTab === tab.id}
          aria-controls={getPanelId(tab.id)}
          tabIndex={activeTab === tab.id ? 0 : -1}
          onClick={() => onTabChange(tab.id)}
          data-ui="tabs-trigger"
          data-slot="tabs-trigger"
          data-state={activeTab === tab.id ? 'active' : 'inactive'}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-150 whitespace-nowrap',
            activeTab === tab.id
              ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm'
            : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
          )}
        >
          {tab.icon && <span data-ui="tabs-icon" data-slot="tabs-icon" aria-hidden="true" className="inline-flex shrink-0">{tab.icon}</span>}
          {tab.label}
        </button>
      ))}
    </div>
  );
};
