import { automationSuggestionAudit } from './automationSuggestionAudit';
import { productAnalytics, type ProductAnalyticsArea } from './productAnalytics';

export type AIWorkflowPrefillDecision = 'used' | 'rejected';
export type AIWorkflowPrefillWorkflow = 'profile' | 'resume' | 'applications' | 'learning';

export interface AIWorkflowPrefillDecisionInput {
  userId?: string | null;
  suggestionId?: string | null;
  workflow: AIWorkflowPrefillWorkflow;
  decision: AIWorkflowPrefillDecision;
  sourceLabel?: string;
  metadata?: Record<string, unknown>;
  occurredAt?: string;
}

const workflowArea: Record<AIWorkflowPrefillWorkflow, ProductAnalyticsArea> = {
  profile: 'profile',
  resume: 'resume',
  applications: 'applications',
  learning: 'lms',
};

const compact = (value?: string | null) => (value || '').trim();

export const recordAiWorkflowPrefillDecision = ({
  userId,
  suggestionId,
  workflow,
  decision,
  sourceLabel,
  metadata,
  occurredAt,
}: AIWorkflowPrefillDecisionInput) => {
  const normalizedSuggestionId = compact(suggestionId);
  const eventName = decision === 'used' ? 'workflow_prefill_used' : 'workflow_prefill_rejected';
  const eventMetadata = {
    workflow,
    decision,
    sourceLabel: compact(sourceLabel) || 'TalentSphere AI assistant',
    ...(metadata || {}),
  };

  void productAnalytics.trackEvent({
    userId,
    area: workflowArea[workflow],
    eventName,
    source: 'ai_workflow_prefill',
    objectType: normalizedSuggestionId ? 'automation_suggestion' : 'ai_workflow_prefill',
    objectId: normalizedSuggestionId || undefined,
    metadata: eventMetadata,
    occurredAt,
  });

  if (!normalizedSuggestionId) return;

  void automationSuggestionAudit.recordEvent({
    userId,
    suggestionId: normalizedSuggestionId,
    eventType: eventName,
    source: 'ai_workflow_prefill',
    metadata: eventMetadata,
    occurredAt,
  });
};
