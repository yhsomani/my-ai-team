import React, { useState } from 'react';
import { AlertTriangle, Calendar, ChevronRight } from 'lucide-react';
import type { ChromeStorageIssue } from '../../hooks/useChromeStorage';

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
  isPrepClearReviewOpen: boolean;
  storageIssue?: ChromeStorageIssue | null;
  openPrepClearReview: () => void;
  cancelPrepClearReview: () => void;
  confirmPrepClear: () => void;
}

const inputClassName = 'w-full rounded-lg border border-[var(--ext-border)] bg-[var(--ext-surface-inset)] p-2.5 text-xs text-[var(--ext-text)] transition focus:border-[var(--ext-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--ext-focus)]';
const labelClassName = 'text-[10px] font-semibold text-[var(--ext-text-secondary)]';
const secondaryButtonClassName = 'rounded-lg border border-[var(--ext-border)] bg-[var(--ext-surface-muted)] px-3 py-1.5 text-[10px] font-medium text-[var(--ext-text)] transition hover:border-[var(--ext-accent)] hover:bg-[var(--ext-accent-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--ext-focus)]';
const dangerButtonClassName = 'rounded-lg border border-[var(--ext-danger)] bg-[var(--ext-danger-muted)] px-3 py-1.5 text-[10px] font-semibold text-[var(--ext-danger)] transition hover:bg-[var(--ext-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--ext-focus)]';

export const PrepView: React.FC<PrepViewProps> = ({
  prepItems,
  newTopic,
  setNewTopic,
  newType,
  setNewType,
  handleAddPrep,
  togglePrep,
  isPrepClearReviewOpen,
  storageIssue,
  openPrepClearReview,
  cancelPrepClearReview,
  confirmPrepClear
}) => {
  const [hasTopicValidationAttempt, setHasTopicValidationAttempt] = useState(false);
  const hasPrepCards = prepItems.length > 0;
  const topicMissing = hasTopicValidationAttempt && newTopic.trim().length === 0;
  const topicDescribedBy = [
    'prep-topic-helper',
    topicMissing ? 'prep-topic-validation' : ''
  ].filter(Boolean).join(' ');
  const storageIssueTitle = storageIssue?.operation === 'load'
    ? 'Preparation cards could not load'
    : 'Preparation cards may not persist';
  const storageIssueMessage = storageIssue?.operation === 'load'
    ? 'The planner is using this session only until browser-local storage is available again.'
    : 'The latest prep-card change is visible now, but the browser could not save it locally. Try again before relying on it after reload.';

  return (
    <div className="max-w-4xl space-y-8" id="opt-view-prep">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-[var(--ext-accent)]">
          <Calendar className="h-4 w-4" />
          <span>Career Coaching Sandbox</span>
        </div>
        <h2 className="text-3xl font-extrabold text-[var(--ext-text)]">Interview Planner</h2>
        <p className="max-w-2xl text-sm text-[var(--ext-text-secondary)]">
          Keep track of your review tasks, custom study cards, and behavioral drilling strategies.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="h-fit space-y-4 rounded-lg border border-[var(--ext-border)] bg-[var(--ext-surface)] p-5 lg:col-span-1">
          <h3 className="text-xs font-bold text-[var(--ext-text)]">New Preparation Card</h3>

          <form
            onSubmit={(event) => {
              setHasTopicValidationAttempt(true);
              handleAddPrep(event);
            }}
            className="space-y-3.5"
            aria-describedby={topicMissing ? 'prep-topic-validation' : undefined}
          >
            <div className="space-y-1">
              <label htmlFor="prep-topic-input" className={labelClassName}>Topic</label>
              <input
                type="text"
                placeholder="e.g. STAR Method drills"
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
                onInvalid={() => setHasTopicValidationAttempt(true)}
                className={inputClassName}
                required
                id="prep-topic-input"
                aria-describedby={topicDescribedBy}
                aria-invalid={topicMissing}
              />
              <p id="prep-topic-helper" className="text-[10px] text-[var(--ext-text-muted)]">Stored as a browser-local preparation card.</p>
            </div>

            <div className="space-y-1">
              <label htmlFor="prep-category-select" className={labelClassName}>Review Category</label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as PrepItem['type'])}
                className={inputClassName}
                id="prep-category-select"
              >
                <option value="Technical">Technical</option>
                <option value="Behavioral">Behavioral</option>
                <option value="System Design">System Design</option>
              </select>
            </div>

            {topicMissing && (
              <div
                id="prep-topic-validation"
                role="alert"
                aria-live="polite"
                className="flex items-start gap-2 rounded-lg border border-[var(--ext-warning)] bg-[var(--ext-warning-muted)] p-2.5"
              >
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--ext-warning)]" />
                <p className="text-[10px] leading-relaxed text-[var(--ext-text-secondary)]">Add a preparation topic before creating a local planner card.</p>
              </div>
            )}

            <button
              type="submit"
              className="w-full rounded-lg border border-[var(--ext-accent)] bg-[var(--ext-accent)] py-2.5 text-xs font-semibold text-[var(--ext-on-accent)] transition duration-200 hover:bg-[var(--ext-accent-strong)] focus:outline-none focus:ring-2 focus:ring-[var(--ext-focus)]"
              id="submit-prep-btn"
            >
              Add Plan Card
            </button>
          </form>
        </div>

        <div className="space-y-3 lg:col-span-2">
          {storageIssue && (
            <div
              id="prep-storage-status"
              role="alert"
              aria-live="polite"
              className="flex items-start gap-3 rounded-lg border border-[var(--ext-warning)] bg-[var(--ext-warning-muted)] p-3"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ext-warning)]" />
              <div className="space-y-1">
                <p className="text-xs font-semibold text-[var(--ext-warning)]">{storageIssueTitle}</p>
                <p className="text-[10px] leading-relaxed text-[var(--ext-text-secondary)]">{storageIssueMessage}</p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 rounded-lg border border-[var(--ext-border)] bg-[var(--ext-surface)] p-3">
            <span id="prep-list-heading" className="text-xs font-semibold text-[var(--ext-text-secondary)]">Active Preparation Cards: ({prepItems.length})</span>
            <button
              onClick={openPrepClearReview}
              disabled={!hasPrepCards}
              className="cursor-pointer text-[10px] text-[var(--ext-text-muted)] transition duration-150 hover:text-[var(--ext-text)] focus:outline-none focus:ring-2 focus:ring-[var(--ext-focus)] disabled:cursor-not-allowed disabled:opacity-50"
              id="clear-prep-btn"
              aria-controls="prep-clear-review"
              aria-expanded={isPrepClearReviewOpen}
              aria-label="Review clearing all preparation cards"
            >
              Clear All
            </button>
          </div>

          {isPrepClearReviewOpen && hasPrepCards && (
            <div
              role="alert"
              className="space-y-2 rounded-lg border border-[var(--ext-warning)] bg-[var(--ext-warning-muted)] p-3"
              id="prep-clear-review"
            >
              <div className="space-y-1">
                <p className="text-xs font-semibold text-[var(--ext-warning)]">Clear all preparation cards?</p>
                <p className="text-[10px] leading-relaxed text-[var(--ext-text-secondary)]">
                  This removes {prepItems.length} local interview planner {prepItems.length === 1 ? 'card' : 'cards'} from this browser. Tracker jobs, scanned drafts, diagnostics analytics, and settings stay unchanged.
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={cancelPrepClearReview}
                  className={secondaryButtonClassName}
                >
                  Keep Cards
                </button>
                <button
                  type="button"
                  onClick={confirmPrepClear}
                  className={dangerButtonClassName}
                >
                  Clear Cards
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2 h-[400px] overflow-y-auto pr-1" id="prep-list-container" role="list" aria-labelledby="prep-list-heading">
            {prepItems.map((item) => (
              <div
                key={item.id}
                role="listitem"
              >
                <button
                  type="button"
                  onClick={() => togglePrep(item.id)}
                  aria-pressed={item.completed}
                  className={`group flex w-full cursor-pointer select-none items-center justify-between gap-3 rounded-lg border p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-[var(--ext-focus)] ${
                    item.completed
                      ? 'border-[var(--ext-border)] bg-[var(--ext-surface-muted)] text-[var(--ext-text-muted)]'
                      : 'border-[var(--ext-border)] bg-[var(--ext-surface)] text-[var(--ext-text)] hover:border-[var(--ext-border-strong)]'
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
                      item.completed
                        ? 'border-[var(--ext-success)] bg-[var(--ext-success-muted)] text-[var(--ext-success)]'
                        : 'border-[var(--ext-border-strong)] text-transparent group-hover:border-[var(--ext-accent)]'
                    }`}>
                      ✓
                    </div>
                    <div className="min-w-0">
                      <span className={`break-words text-xs font-medium ${item.completed ? 'line-through' : ''}`}>
                        {item.topic}
                      </span>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-[9px] font-semibold text-[var(--ext-accent)]">
                          {item.type}
                        </span>
                      </div>
                    </div>
                  </div>

                  <ChevronRight className="h-4 w-4 shrink-0 text-[var(--ext-text-muted)] transition group-hover:text-[var(--ext-text)]" />
                </button>
              </div>
            ))}

            {!hasPrepCards && (
              <div className="rounded-lg border border-dashed border-[var(--ext-border)] bg-[var(--ext-surface)] p-6 text-center">
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--ext-border)] bg-[var(--ext-surface-muted)]">
                  <Calendar className="h-5 w-5 text-[var(--ext-text-muted)]" />
                </div>
                <p className="text-sm font-semibold text-[var(--ext-text)]">No preparation cards yet</p>
                <p className="mt-1 text-xs leading-relaxed text-[var(--ext-text-muted)]">
                  Add a topic from the form to create a browser-local interview preparation card.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
