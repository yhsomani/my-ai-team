import { useState, useCallback, useEffect, useRef } from 'react';
import { Sparkles, Calendar, Settings2, Cpu } from 'lucide-react';
import { useChromeStorage } from '../hooks/useChromeStorage';
import {
  countBand,
  recordExtensionOperationalEvent,
  scoreBand,
  textLengthBand
} from '../lib/operationalAnalytics';

import { AIView, type ResumeMatchReport } from './views/AIView';
import { PrepView } from './views/PrepView';
import { SettingsView } from './views/SettingsView';
import { LocalOnlyStatus } from '../components/LocalOnlyStatus';

interface PrepItem {
  id: string;
  topic: string;
  type: 'Behavioral' | 'Technical' | 'System Design';
  completed: boolean;
}

type BooleanSettingUpdater = boolean | ((curr: boolean) => boolean);
type PrepClearEntryPoint = 'prep' | 'settings';

const STOP_WORDS = new Set([
  'about', 'after', 'also', 'and', 'are', 'based', 'but', 'can', 'for', 'from',
  'has', 'have', 'into', 'its', 'job', 'our', 'the', 'their', 'this', 'that',
  'with', 'will', 'work', 'you', 'your'
]);

const canonicalKeyword = (term: string) => {
  if (term.length > 4 && term.endsWith('s')) {
    return term.slice(0, -1);
  }

  return term;
};

const extractRankedKeywords = (text: string, limit = 24) => {
  const counts = new Map<string, { label: string; count: number }>();
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9+#]+/g, ' ')
    .split(/\s+/)
    .map(token => token.trim())
    .filter(token => token.length > 2 && !STOP_WORDS.has(token));

  tokens.forEach((token) => {
    const key = canonicalKeyword(token);
    const current = counts.get(key);

    if (current) {
      counts.set(key, { ...current, count: current.count + 1 });
      return;
    }

    counts.set(key, { label: token, count: 1 });
  });

  return Array.from(counts.values())
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .map(entry => entry.label)
    .slice(0, limit);
};

const buildResumeMatchReport = (jobDescription: string, resumeText: string): ResumeMatchReport => {
  const jobKeywords = extractRankedKeywords(jobDescription, 18);
  const resumeKeywords = extractRankedKeywords(resumeText, 36);
  const resumeKeywordSet = new Set(resumeKeywords.map(canonicalKeyword));
  const matchedKeywords = jobKeywords.filter(keyword => resumeKeywordSet.has(canonicalKeyword(keyword)));
  const missingKeywords = jobKeywords.filter(keyword => !resumeKeywordSet.has(canonicalKeyword(keyword)));
  const score = jobKeywords.length > 0
    ? Math.round((matchedKeywords.length / jobKeywords.length) * 100)
    : 0;
  const improvementTips = missingKeywords.length > 0
    ? missingKeywords.slice(0, 3).map(keyword => `Add specific evidence for "${keyword}" if it reflects your experience.`)
    : ['Your resume already covers the strongest repeated job keywords in this local preview.'];

  if (matchedKeywords.length < 3 && jobKeywords.length >= 3) {
    improvementTips.push('Move the most relevant matching skills into your summary or recent experience bullets.');
  }

  return {
    score,
    matchedKeywords,
    missingKeywords,
    improvementTips,
    jobKeywordCount: jobKeywords.length,
    resumeKeywordCount: resumeKeywords.length,
    matchedKeywordCount: matchedKeywords.length
  };
};

export function OptionsApp() {
  const [activeTab, setActiveTab] = useState<'ai' | 'prep' | 'settings'>('ai');
  const [isPrepClearReviewOpen, setIsPrepClearReviewOpen] = useState(false);
  const [isCloudSyncPlanOpen, setIsCloudSyncPlanOpen] = useState(false);
  const hasRecordedOpen = useRef(false);
  const [prepItems, setPrepItems, prepLoading, prepStorageIssue] = useChromeStorage<PrepItem[]>('ts_prep', []);

  const [jobDescription, setJobDescription] = useState('');
  const [resumeText, setResumeText] = useState('');
  const [optimizing, setOptimizing] = useState(false);
  const [optimized, setOptimized] = useState(false);
  const [score, setScore] = useState(0);
  const [matchReport, setMatchReport] = useState<ResumeMatchReport | null>(null);

  const [
    notifications,
    setNotifications,
    notificationsLoading,
    notificationsStorageIssue
  ] = useChromeStorage('ts_settings_notif', true);
  const [
    analytics,
    setAnalytics,
    analyticsLoading,
    analyticsStorageIssue
  ] = useChromeStorage('ts_settings_analytics', false);

  const [newTopic, setNewTopic] = useState('');
  const [newType, setNewType] = useState<PrepItem['type']>('Technical');

  const optionsMetadata = useCallback(() => ({
    option_tab: activeTab,
    prep_count: prepItems.length,
    prep_count_band: countBand(prepItems.length),
    cloud_sync_enabled: false,
    notifications_enabled: notifications,
    usage_diagnostics_enabled: analytics
  }), [activeTab, analytics, notifications, prepItems.length]);

  const prepClearMetadata = useCallback((entryPoint: PrepClearEntryPoint) => ({
    clear_scope: 'prep_cards',
    entry_point: entryPoint,
    prep_count: prepItems.length,
    prep_count_band: countBand(prepItems.length)
  }), [prepItems.length]);

  useEffect(() => {
    if (prepItems.length === 0 && isPrepClearReviewOpen) {
      setIsPrepClearReviewOpen(false);
    }
  }, [isPrepClearReviewOpen, prepItems.length]);

  useEffect(() => {
    if (prepLoading || notificationsLoading || analyticsLoading || hasRecordedOpen.current) {
      return;
    }

    hasRecordedOpen.current = true;
    void recordExtensionOperationalEvent({
      area: 'options',
      event: 'options_opened',
      metadata: optionsMetadata()
    });
  }, [analyticsLoading, notificationsLoading, optionsMetadata, prepLoading]);

  const handleOptionsTabChange = useCallback((nextTab: 'ai' | 'prep' | 'settings') => {
    if (activeTab !== nextTab) {
      void recordExtensionOperationalEvent({
        area: 'options',
        event: 'tab_changed',
        metadata: {
          previous_tab: activeTab,
          next_tab: nextTab,
          ...optionsMetadata()
        }
      });
    }

    setActiveTab(nextTab);
  }, [activeTab, optionsMetadata]);

  const handleOptimize = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!jobDescription || !resumeText) {
      void recordExtensionOperationalEvent({
        area: 'resume_matcher',
        event: 'match_validation_failed',
        metadata: {
          job_description_length_band: textLengthBand(jobDescription),
          resume_length_band: textLengthBand(resumeText),
          missing_field_count: Number(!jobDescription) + Number(!resumeText)
        }
      });
      return;
    }

    setOptimizing(true);
    setOptimized(false);
    setMatchReport(null);
    void recordExtensionOperationalEvent({
      area: 'resume_matcher',
      event: 'match_requested',
      metadata: {
        job_description_length_band: textLengthBand(jobDescription),
        resume_length_band: textLengthBand(resumeText)
      }
    });

    setTimeout(() => {
      const report = buildResumeMatchReport(jobDescription, resumeText);
      setOptimizing(false);
      setOptimized(true);
      setScore(report.score);
      setMatchReport(report);
      void recordExtensionOperationalEvent({
        area: 'resume_matcher',
        event: 'match_completed',
        metadata: {
          job_description_length_band: textLengthBand(jobDescription),
          resume_length_band: textLengthBand(resumeText),
          score_band: scoreBand(report.score),
          job_keyword_count_band: countBand(report.jobKeywordCount),
          matched_keyword_count_band: countBand(report.matchedKeywordCount),
          missing_keyword_count_band: countBand(report.missingKeywords.length)
        }
      });
    }, 2000);
  }, [jobDescription, resumeText]);

  const handleAddPrep = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopic) {
      void recordExtensionOperationalEvent({
        area: 'interview_planner',
        event: 'prep_card_validation_failed',
        metadata: {
          prep_category: newType,
          missing_field_count: 1
        }
      });
      return;
    }

    const newItem: PrepItem = {
      id: Date.now().toString(),
      topic: newTopic,
      type: newType,
      completed: false
    };

    setPrepItems(curr => [...curr, newItem]);
    setNewTopic('');
    void recordExtensionOperationalEvent({
      area: 'interview_planner',
      event: 'prep_card_added',
      metadata: {
        prep_category: newType,
        prep_count: prepItems.length + 1,
        prep_count_band: countBand(prepItems.length + 1)
      }
    });
  }, [newTopic, newType, prepItems.length, setPrepItems]);

  const togglePrep = useCallback((id: string) => {
    const prepItem = prepItems.find(item => item.id === id);
    setPrepItems(curr => curr.map(item => item.id === id ? { ...item, completed: !item.completed } : item));
    if (prepItem) {
      void recordExtensionOperationalEvent({
        area: 'interview_planner',
        event: 'prep_card_toggled',
        metadata: {
          prep_category: prepItem.type,
          previous_completed: prepItem.completed,
          next_completed: !prepItem.completed,
          prep_count: prepItems.length,
          prep_count_band: countBand(prepItems.length)
        }
      });
    }
  }, [prepItems, setPrepItems]);

  const openPrepClearReview = useCallback((entryPoint: PrepClearEntryPoint) => {
    if (prepItems.length === 0) {
      return;
    }

    setIsPrepClearReviewOpen(true);
    void recordExtensionOperationalEvent({
      area: entryPoint === 'settings' ? 'settings' : 'interview_planner',
      event: entryPoint === 'settings' ? 'prep_cards_reset_review_opened' : 'prep_cards_clear_review_opened',
      metadata: prepClearMetadata(entryPoint)
    });
  }, [prepClearMetadata, prepItems.length]);

  const cancelPrepClearReview = useCallback((entryPoint: PrepClearEntryPoint) => {
    setIsPrepClearReviewOpen(false);
    void recordExtensionOperationalEvent({
      area: entryPoint === 'settings' ? 'settings' : 'interview_planner',
      event: entryPoint === 'settings' ? 'prep_cards_reset_cancelled' : 'prep_cards_clear_cancelled',
      metadata: prepClearMetadata(entryPoint)
    });
  }, [prepClearMetadata]);

  const confirmPrepClear = useCallback((entryPoint: PrepClearEntryPoint) => {
    if (prepItems.length === 0) {
      setIsPrepClearReviewOpen(false);
      return;
    }

    if (entryPoint === 'settings') {
      void recordExtensionOperationalEvent({
        area: 'settings',
        event: 'prep_cards_reset_confirmed',
        metadata: prepClearMetadata(entryPoint)
      });
    }

    setPrepItems([]);
    setIsPrepClearReviewOpen(false);
    void recordExtensionOperationalEvent({
      area: 'interview_planner',
      event: 'prep_cards_cleared',
      metadata: prepClearMetadata(entryPoint)
    });
  }, [prepClearMetadata, prepItems.length, setPrepItems]);

  const updateBooleanSetting = useCallback(async (
    setting: 'notifications' | 'usage_diagnostics',
    currentValue: boolean,
    setter: (value: BooleanSettingUpdater) => Promise<void> | void,
    value: BooleanSettingUpdater
  ) => {
    const nextValue = typeof value === 'function' ? value(currentValue) : value;

    await setter(nextValue);
    void recordExtensionOperationalEvent({
      area: 'settings',
      event: 'setting_changed',
      forceLocal: setting === 'usage_diagnostics' && nextValue,
      metadata: {
        setting,
        enabled: nextValue,
        usage_diagnostics_enabled: setting === 'usage_diagnostics' ? nextValue : analytics
      }
    });
  }, [analytics]);

  const handleNotificationsChange = useCallback((value: BooleanSettingUpdater) => {
    return updateBooleanSetting('notifications', notifications, setNotifications, value);
  }, [notifications, setNotifications, updateBooleanSetting]);

  const handleAnalyticsChange = useCallback((value: BooleanSettingUpdater) => {
    return updateBooleanSetting('usage_diagnostics', analytics, setAnalytics, value);
  }, [analytics, setAnalytics, updateBooleanSetting]);

  const openCloudSyncPlan = useCallback(() => {
    setIsCloudSyncPlanOpen(true);
    void recordExtensionOperationalEvent({
      area: 'settings',
      event: 'cloud_sync_plan_review_opened',
      metadata: {
        setting: 'cloud_sync',
        enabled: false,
        cloud_sync_enabled: false,
        usage_diagnostics_enabled: analytics,
        entry_point: 'settings'
      }
    });
  }, [analytics]);

  const closeCloudSyncPlan = useCallback(() => {
    setIsCloudSyncPlanOpen(false);
    void recordExtensionOperationalEvent({
      area: 'settings',
      event: 'cloud_sync_plan_review_closed',
      metadata: {
        setting: 'cloud_sync',
        enabled: false,
        cloud_sync_enabled: false,
        usage_diagnostics_enabled: analytics,
        entry_point: 'settings'
      }
    });
  }, [analytics]);

  const getOptionsTabClassName = (selected: boolean) => (
    `flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm font-medium transition duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--ext-focus)] ${
      selected
        ? 'border-[var(--ext-accent)] bg-[var(--ext-accent-muted)] text-[var(--ext-accent-strong)]'
        : 'border-transparent text-[var(--ext-text-secondary)] hover:bg-[var(--ext-surface-muted)] hover:text-[var(--ext-text)]'
    }`
  );

  return (
    <div className="flex min-h-screen flex-col bg-[var(--ext-bg)] font-sans text-[var(--ext-text)] lg:flex-row">
      <aside className="flex w-full flex-col justify-between gap-6 border-b border-[var(--ext-border)] bg-[var(--ext-surface)] p-5 lg:min-h-screen lg:w-72 lg:border-b-0 lg:border-r">
        <div className="space-y-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--ext-border)] bg-[var(--ext-accent-muted)]">
              <Cpu className="h-5 w-5 text-[var(--ext-accent)]" />
            </div>
            <div>
              <h1 className="text-base font-bold text-[var(--ext-text)]">TalentSphere</h1>
              <span className="text-[10px] font-semibold text-[var(--ext-text-muted)]">Companion Console</span>
            </div>
          </div>

          <nav className="space-y-1">
            <button
              onClick={() => handleOptionsTabChange('ai')}
              className={getOptionsTabClassName(activeTab === 'ai')}
              id="options-ai-tab"
              aria-pressed={activeTab === 'ai'}
            >
              <Sparkles className="h-4 w-4" />
              <span>Resume Match Preview</span>
            </button>
            <button
              onClick={() => handleOptionsTabChange('prep')}
              className={getOptionsTabClassName(activeTab === 'prep')}
              id="options-prep-tab"
              aria-pressed={activeTab === 'prep'}
            >
              <Calendar className="h-4 w-4" />
              <span>Interview Planner</span>
            </button>
            <button
              onClick={() => handleOptionsTabChange('settings')}
              className={getOptionsTabClassName(activeTab === 'settings')}
              id="options-settings-tab"
              aria-pressed={activeTab === 'settings'}
            >
              <Settings2 className="h-4 w-4" />
              <span>Local Settings</span>
            </button>
          </nav>
        </div>

        <LocalOnlyStatus id="options-local-only-status" />
      </aside>

      <main className="flex-1 overflow-y-auto p-5 sm:p-8 lg:p-10">
        {activeTab === 'ai' && (
          <AIView
            jobDescription={jobDescription}
            setJobDescription={setJobDescription}
            resumeText={resumeText}
            setResumeText={setResumeText}
            optimizing={optimizing}
            optimized={optimized}
            score={score}
            matchReport={matchReport}
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
            isPrepClearReviewOpen={isPrepClearReviewOpen}
            storageIssue={prepStorageIssue}
            openPrepClearReview={() => openPrepClearReview('prep')}
            cancelPrepClearReview={() => cancelPrepClearReview('prep')}
            confirmPrepClear={() => confirmPrepClear('prep')}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            isCloudSyncPlanOpen={isCloudSyncPlanOpen}
            openCloudSyncPlan={openCloudSyncPlan}
            closeCloudSyncPlan={closeCloudSyncPlan}
            notifications={notifications}
            setNotifications={handleNotificationsChange}
            analytics={analytics}
            setAnalytics={handleAnalyticsChange}
            prepCount={prepItems.length}
            isPrepClearReviewOpen={isPrepClearReviewOpen}
            prepStorageIssue={prepStorageIssue}
            notificationsStorageIssue={notificationsStorageIssue}
            analyticsStorageIssue={analyticsStorageIssue}
            openPrepClearReview={() => openPrepClearReview('settings')}
            cancelPrepClearReview={() => cancelPrepClearReview('settings')}
            confirmPrepClear={() => confirmPrepClear('settings')}
          />
        )}
      </main>
    </div>
  );
}
