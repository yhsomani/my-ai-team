import type { Page, Route } from '@playwright/test';

export const E2E_AUTH_OVERRIDE_KEY = 'talentsphere.e2e.auth';

const localHosts = new Set(['localhost', '127.0.0.1', '::1']);

type JsonRecord = Record<string, unknown>;

export type RestStubFixtures = {
  challenges?: JsonRecord[];
  challengeSubmissions?: JsonRecord[];
  enrollments?: JsonRecord[];
  jobs?: JsonRecord[];
  companies?: JsonRecord[];
  jobPostDraftVersions?: JsonRecord[];
  jobPostTemplates?: JsonRecord[];
  savedJobSearches?: JsonRecord[];
  hiddenExploreJobs?: JsonRecord[];
  lessonProgress?: JsonRecord[];
  notificationSettings?: JsonRecord[];
  subscriptionPlans?: JsonRecord[];
  subscriptions?: JsonRecord[];
  payments?: JsonRecord[];
  profile?: JsonRecord | null;
  resumeExportEvents?: JsonRecord[];
  resumeArtifacts?: JsonRecord[];
  skills?: JsonRecord[];
  experiences?: JsonRecord[];
  educations?: JsonRecord[];
  applications?: JsonRecord[];
  applicationDraft?: JsonRecord | null;
  applicationDraftHistory?: JsonRecord[];
  applicationStatusEvents?: JsonRecord[];
  candidateNotes?: JsonRecord[];
  candidateScorecards?: JsonRecord[];
  connections?: JsonRecord[];
  conversationParticipants?: JsonRecord[];
  messages?: JsonRecord[];
  networkingSuggestionPreferences?: JsonRecord[];
  notifications?: JsonRecord[];
  profiles?: JsonRecord[];
  onApplicationInsert?: (payload: JsonRecord) => JsonRecord;
  onApplicationUpdate?: (payload: JsonRecord, context: { id?: string }) => JsonRecord;
  onCandidateNoteDelete?: (context: { applicationId?: string; recruiterId?: string }) => void;
  onCandidateNoteUpsert?: (payload: JsonRecord) => JsonRecord;
  onCandidateScorecardUpsert?: (payload: JsonRecord) => JsonRecord;
  onChallengeSubmissionInsert?: (payload: JsonRecord) => JsonRecord;
  onConnectionInsert?: (payload: JsonRecord) => JsonRecord;
  onConnectionUpdate?: (payload: JsonRecord, context: { id?: string }) => JsonRecord;
  onEnrollmentInsert?: (payload: JsonRecord) => JsonRecord;
  onEnrollmentRows?: (context: { courseId?: string; id?: string; userId?: string }) => JsonRecord[];
  onEnrollmentUpdate?: (payload: JsonRecord, context: { id?: string }) => JsonRecord;
  onLessonProgressInsert?: (payload: JsonRecord) => JsonRecord;
  onLessonProgressRows?: (context: { enrollmentId?: string; lessonId?: string }) => JsonRecord[];
  onLessonProgressUpdate?: (payload: JsonRecord, context: { enrollmentId?: string; lessonId?: string }) => JsonRecord;
  onSubscriptionPlanRows?: (context: { isActive?: string }) => JsonRecord[];
  onNetworkingSuggestionPreferenceDelete?: (context: { suggestedUserId?: string; userId?: string }) => void;
  onNetworkingSuggestionPreferenceUpsert?: (payload: JsonRecord) => JsonRecord;
  onApplicationStatusEventInsert?: (payload: JsonRecord) => JsonRecord;
  onCompanyInsert?: (payload: JsonRecord) => JsonRecord;
  onCompanyUpdate?: (payload: JsonRecord, context: { id?: string }) => JsonRecord;
  onUserProfileUpdate?: (payload: JsonRecord, context: { userId?: string }) => JsonRecord;
  onProfileIdentityUpdate?: (payload: JsonRecord, context: { id?: string }) => JsonRecord;
  onResumeExportEventUpsert?: (payload: JsonRecord) => JsonRecord;
  onResumeArtifactUpsert?: (payload: JsonRecord) => JsonRecord;
  onResumeArtifactUpdate?: (payload: JsonRecord, context: { id?: string; userId?: string }) => JsonRecord;
  onSkillInsert?: (payload: JsonRecord) => JsonRecord;
  onSkillUpdate?: (payload: JsonRecord, context: { id?: string }) => JsonRecord;
  onSkillDelete?: (context: { id?: string }) => void;
  onExperienceInsert?: (payload: JsonRecord) => JsonRecord;
  onExperienceUpdate?: (payload: JsonRecord, context: { id?: string }) => JsonRecord;
  onExperienceDelete?: (context: { id?: string }) => void;
  onEducationInsert?: (payload: JsonRecord) => JsonRecord;
  onEducationUpdate?: (payload: JsonRecord, context: { id?: string }) => JsonRecord;
  onEducationDelete?: (context: { id?: string }) => void;
  onJobInsert?: (payload: JsonRecord) => JsonRecord;
  onJobUpdate?: (payload: JsonRecord, context: { id?: string }) => JsonRecord;
  onJobPostDraftVersionUpsert?: (payload: JsonRecord) => JsonRecord;
  onJobPostTemplateUpsert?: (payload: JsonRecord) => JsonRecord;
  onJobPostTemplateDelete?: (context: { id?: string; recruiterId?: string }) => void;
  onSavedJobSearchUpsert?: (payload: JsonRecord) => JsonRecord;
  onSavedJobSearchDelete?: (context: { id?: string; userId?: string }) => void;
  onHiddenExploreJobUpsert?: (payload: JsonRecord) => JsonRecord;
  onHiddenExploreJobDelete?: (context: { jobId?: string; userId?: string }) => void;
  onHiddenExploreJobsClear?: (context: { userId?: string }) => void;
  onMessageInsert?: (payload: JsonRecord) => JsonRecord;
  onMessageUpdate?: (payload: JsonRecord, context: { id?: string; conversationId?: string }) => JsonRecord;
  onNotificationSettingsInsert?: (payload: JsonRecord) => JsonRecord;
  onNotificationSettingsUpdate?: (payload: JsonRecord, context: { id?: string; userId?: string }) => JsonRecord;
  onProductAnalyticsInsert?: (payload: JsonRecord) => JsonRecord;
};

type ApiStubFixtures = {
  lmsCourses?: JsonRecord[];
  lmsEnrollments?: JsonRecord[];
  networkingSuggestions?: JsonRecord[];
  onSupabaseFunctionInvoke?: (context: { functionName: string; payload: JsonRecord }) => JsonRecord;
  onFileUpload?: (context: { contentType?: string; postData?: string }) => JsonRecord;
  onFileDelete?: (context: { url?: string | null }) => void;
  onLmsEnroll?: (context: { courseId?: string; userId?: string }) => JsonRecord;
  onLmsLessonComplete?: (context: { courseId?: string; lessonId?: string; userId?: string }) => void;
  onNetworkingSuggestions?: (context: { userId?: string; limit?: string | null }) => JsonRecord[];
};

type NetworkStubOptions = {
  api?: ApiStubFixtures;
  rest?: RestStubFixtures;
};

const corsJsonHeaders = {
  'access-control-allow-origin': '*',
  'content-type': 'application/json',
};

const rowsContentRange = (rows: readonly unknown[], total = rows.length, start = 0) => (
  rows.length > 0 ? `${start}-${start + rows.length - 1}/${total}` : `0-0/${total}`
);

const toJsonRecord = (value: unknown): JsonRecord => (
  value && typeof value === 'object' && !Array.isArray(value)
    ? value as JsonRecord
    : {}
);

const readJsonPayload = (route: Route): JsonRecord => {
  try {
    return toJsonRecord(route.request().postDataJSON());
  } catch {
    return {};
  }
};

const readJsonPayloadRows = (route: Route): JsonRecord[] => {
  try {
    const payload = route.request().postDataJSON();
    if (Array.isArray(payload)) {
      return payload
        .map(toJsonRecord)
        .filter(row => Object.keys(row).length > 0);
    }

    const row = toJsonRecord(payload);
    return Object.keys(row).length > 0 ? [row] : [];
  } catch {
    return [];
  }
};

const getRestTableName = (url: URL) => {
  const match = url.pathname.match(/\/rest\/v1\/([^/?]+)/);
  return match?.[1] || null;
};

const getEqFilterValue = (url: URL, key: string) => {
  const rawValue = url.searchParams.get(key);
  return rawValue?.startsWith('eq.') ? rawValue.slice(3) : undefined;
};

const requestWantsSingleObject = (route: Route) => {
  const accept = route.request().headers().accept || '';
  return accept.includes('application/vnd.pgrst.object+json');
};

const getInFilterValues = (url: URL, key: string) => {
  const rawValue = url.searchParams.get(key);
  if (!rawValue?.startsWith('in.(') || !rawValue.endsWith(')')) return [];

  return rawValue
    .slice(4, -1)
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);
};

const getPaginationWindow = (url: URL) => {
  const offset = Number.parseInt(url.searchParams.get('offset') || '0', 10);
  const limit = Number.parseInt(url.searchParams.get('limit') || '', 10);

  return {
    offset: Number.isFinite(offset) && offset >= 0 ? offset : 0,
    limit: Number.isFinite(limit) && limit >= 0 ? limit : null,
  };
};

const compareCreatedAtDesc = (left: JsonRecord, right: JsonRecord) => {
  const leftCreatedAt = typeof left.created_at === 'string' ? left.created_at : '';
  const rightCreatedAt = typeof right.created_at === 'string' ? right.created_at : '';
  if (leftCreatedAt !== rightCreatedAt) {
    return rightCreatedAt.localeCompare(leftCreatedAt);
  }

  const leftId = typeof left.id === 'string' ? left.id : '';
  const rightId = typeof right.id === 'string' ? right.id : '';
  return rightId.localeCompare(leftId);
};

const applyCreatedAtCursorFilter = (
  rows: JsonRecord[],
  url: URL,
  options: { timestampColumn: string }
) => {
  const orFilter = url.searchParams.get('or');
  if (!orFilter) return rows;

  const escapedColumn = options.timestampColumn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const timestampBefore = orFilter.match(new RegExp(`${escapedColumn}\\.lt\\.([^,]+)`))?.[1];
  const timestampEqual = orFilter.match(new RegExp(`${escapedColumn}\\.eq\\.([^,)]+)`))?.[1];
  const idBefore = orFilter.match(/id\.lt\.([^)]+)/)?.[1];

  if (!timestampBefore || !timestampEqual || !idBefore) return rows;

  return rows.filter((row) => {
    const timestamp = typeof row[options.timestampColumn] === 'string' ? row[options.timestampColumn] : '';
    const id = typeof row.id === 'string' ? row.id : '';
    return timestamp < timestampBefore || (timestamp === timestampEqual && id < idBefore);
  });
};

const applyNotificationCursorFilter = (rows: JsonRecord[], url: URL) => {
  return applyCreatedAtCursorFilter(rows, url, { timestampColumn: 'created_at' });
};

const fulfillNotificationRows = async (route: Route, url: URL, rows: JsonRecord[]) => {
  const userId = getEqFilterValue(url, 'user_id');
  const sortedRows = [...rows]
    .filter(row => !userId || row.user_id === userId)
    .sort(compareCreatedAtDesc);
  const filteredRows = applyNotificationCursorFilter(sortedRows, url);
  const { offset, limit } = getPaginationWindow(url);
  const pageRows = limit === null ? filteredRows : filteredRows.slice(offset, offset + limit);

  await fulfillJson(route, pageRows, 200, {
    'content-range': rowsContentRange(pageRows, filteredRows.length, offset),
  });
};

const fulfillMessageRows = async (route: Route, url: URL, rows: JsonRecord[]) => {
  const conversationId = getEqFilterValue(url, 'conversation_id');
  const sortedRows = [...rows]
    .filter(row => !conversationId || row.conversation_id === conversationId)
    .sort(compareCreatedAtDesc);
  const filteredRows = applyCreatedAtCursorFilter(sortedRows, url, { timestampColumn: 'created_at' });
  const { offset, limit } = getPaginationWindow(url);
  const pageRows = limit === null ? filteredRows : filteredRows.slice(offset, offset + limit);

  await fulfillJson(route, pageRows, 200, {
    'content-range': rowsContentRange(pageRows, filteredRows.length, offset),
  });
};

const getOrFilterInValues = (url: URL, key: string) => {
  const orFilter = url.searchParams.get('or');
  if (!orFilter) return [];

  return [...orFilter.matchAll(new RegExp(`${key}\\.in\\.\\(([^)]*)\\)`, 'g'))]
    .flatMap(match => match[1].split(','))
    .map(value => value.trim())
    .filter(Boolean);
};

const getOrFilterEqValues = (url: URL, key: string) => {
  const orFilter = url.searchParams.get('or');
  if (!orFilter) return [];

  return [...orFilter.matchAll(new RegExp(`${key}\\.eq\\.([^,)]+)`, 'g'))]
    .map(match => match[1].trim())
    .filter(Boolean);
};

const applyApplicationSearchFilter = (rows: JsonRecord[], url: URL) => {
  const userIds = new Set(getOrFilterInValues(url, 'user_id'));
  const jobIds = new Set(getOrFilterInValues(url, 'job_id'));
  if (userIds.size === 0 && jobIds.size === 0) return rows;

  return rows.filter(row => (
    (typeof row.user_id === 'string' && userIds.has(row.user_id)) ||
    (typeof row.job_id === 'string' && jobIds.has(row.job_id))
  ));
};

const fulfillApplicationRows = async (route: Route, url: URL, rows: JsonRecord[]) => {
  const jobIds = new Set(getInFilterValues(url, 'job_id'));
  const sortedRows = [...rows]
    .filter(row => jobIds.size === 0 || (typeof row.job_id === 'string' && jobIds.has(row.job_id)))
    .sort(compareCreatedAtDesc);
  const searchedRows = applyApplicationSearchFilter(sortedRows, url);
  const filteredRows = applyCreatedAtCursorFilter(searchedRows, url, { timestampColumn: 'created_at' });
  const { offset, limit } = getPaginationWindow(url);
  const pageRows = limit === null ? filteredRows : filteredRows.slice(offset, offset + limit);

  await fulfillJson(route, pageRows, 200, {
    'content-range': rowsContentRange(pageRows, filteredRows.length, offset),
  });
};

const getIlikeSearchTerms = (url: URL, columns: string[]) => {
  const orFilter = url.searchParams.get('or');
  if (!orFilter) return [];

  return columns.flatMap(column => (
    [...orFilter.matchAll(new RegExp(`${column}\\.ilike\\.%([^,%)]*)%`, 'g'))]
      .map(match => match[1].trim().toLowerCase())
      .filter(Boolean)
  ));
};

const fulfillProfileRows = async (route: Route, url: URL, rows: JsonRecord[]) => {
  const profileIds = new Set(getInFilterValues(url, 'id'));
  const searchTerms = getIlikeSearchTerms(url, ['full_name', 'email']);
  const filteredRows = rows.filter(row => {
    if (profileIds.size > 0 && !(typeof row.id === 'string' && profileIds.has(row.id))) {
      return false;
    }

    if (searchTerms.length === 0) return true;

    const fullName = typeof row.full_name === 'string' ? row.full_name.toLowerCase() : '';
    const email = typeof row.email === 'string' ? row.email.toLowerCase() : '';
    return searchTerms.some(term => fullName.includes(term) || email.includes(term));
  });
  const { offset, limit } = getPaginationWindow(url);
  const pageRows = limit === null ? filteredRows : filteredRows.slice(offset, offset + limit);

  await fulfillJson(route, pageRows, 200, {
    'content-range': rowsContentRange(pageRows, filteredRows.length, offset),
  });
};

const fulfillSavedJobSearchRows = async (route: Route, url: URL, rows: JsonRecord[]) => {
  const userId = getEqFilterValue(url, 'user_id');
  const sortedRows = [...rows]
    .filter(row => !userId || row.user_id === userId)
    .sort((left, right) => {
      const leftUpdatedAt = typeof left.updated_at === 'string' ? left.updated_at : '';
      const rightUpdatedAt = typeof right.updated_at === 'string' ? right.updated_at : '';
      if (leftUpdatedAt !== rightUpdatedAt) {
        return rightUpdatedAt.localeCompare(leftUpdatedAt);
      }

      return compareCreatedAtDesc(left, right);
    });
  const { offset, limit } = getPaginationWindow(url);
  const pageRows = limit === null ? sortedRows : sortedRows.slice(offset, offset + limit);

  await fulfillJson(route, pageRows, 200, {
    'content-range': rowsContentRange(pageRows, sortedRows.length, offset),
  });
};

const fulfillHiddenExploreJobRows = async (route: Route, url: URL, rows: JsonRecord[]) => {
  const userId = getEqFilterValue(url, 'user_id');
  const sortedRows = [...rows]
    .filter(row => !userId || row.user_id === userId)
    .sort((left, right) => {
      const leftHiddenAt = typeof left.hidden_at === 'string' ? left.hidden_at : '';
      const rightHiddenAt = typeof right.hidden_at === 'string' ? right.hidden_at : '';
      if (leftHiddenAt !== rightHiddenAt) {
        return rightHiddenAt.localeCompare(leftHiddenAt);
      }

      return compareCreatedAtDesc(left, right);
    });
  const { offset, limit } = getPaginationWindow(url);
  const pageRows = limit === null ? sortedRows : sortedRows.slice(offset, offset + limit);

  await fulfillJson(route, pageRows, 200, {
    'content-range': rowsContentRange(pageRows, sortedRows.length, offset),
  });
};

const fulfillCompanyRows = async (route: Route, url: URL, rows: JsonRecord[]) => {
  const id = getEqFilterValue(url, 'id');
  const ownerUserId = getEqFilterValue(url, 'owner_user_id');
  const filteredRows = [...rows]
    .filter(row => !id || row.id === id)
    .filter(row => !ownerUserId || row.owner_user_id === ownerUserId)
    .sort((left, right) => {
      const leftName = typeof left.name === 'string' ? left.name : '';
      const rightName = typeof right.name === 'string' ? right.name : '';
      return leftName.localeCompare(rightName);
    });

  if (requestWantsSingleObject(route)) {
    if (filteredRows.length === 0) {
      await fulfillJson(route, {
        code: 'PGRST116',
        message: 'JSON object requested, multiple (or no) rows returned',
      }, 406);
      return;
    }

    await fulfillJson(route, filteredRows[0], 200, {
      'content-range': rowsContentRange([filteredRows[0]], filteredRows.length),
    });
    return;
  }

  await fulfillJson(route, filteredRows, 200, {
    'content-range': rowsContentRange(filteredRows),
  });
};

const fulfillJobPostTemplateRows = async (route: Route, url: URL, rows: JsonRecord[]) => {
  const recruiterId = getEqFilterValue(url, 'recruiter_id');
  const sortedRows = [...rows]
    .filter(row => !recruiterId || row.recruiter_id === recruiterId)
    .sort((left, right) => {
      const leftUpdatedAt = typeof left.updated_at === 'string' ? left.updated_at : '';
      const rightUpdatedAt = typeof right.updated_at === 'string' ? right.updated_at : '';
      if (leftUpdatedAt !== rightUpdatedAt) {
        return rightUpdatedAt.localeCompare(leftUpdatedAt);
      }

      return compareCreatedAtDesc(left, right);
    });
  const { offset, limit } = getPaginationWindow(url);
  const pageRows = limit === null ? sortedRows : sortedRows.slice(offset, offset + limit);

  await fulfillJson(route, pageRows, 200, {
    'content-range': rowsContentRange(pageRows, sortedRows.length, offset),
  });
};

const fulfillJobPostDraftVersionRows = async (route: Route, url: URL, rows: JsonRecord[]) => {
  const recruiterId = getEqFilterValue(url, 'recruiter_id');
  const draftKey = getEqFilterValue(url, 'draft_key');
  const sortedRows = [...rows]
    .filter(row => !recruiterId || row.recruiter_id === recruiterId)
    .filter(row => !draftKey || row.draft_key === draftKey)
    .sort((left, right) => {
      const leftUpdatedAt = typeof left.updated_at === 'string' ? left.updated_at : '';
      const rightUpdatedAt = typeof right.updated_at === 'string' ? right.updated_at : '';
      if (leftUpdatedAt !== rightUpdatedAt) {
        return rightUpdatedAt.localeCompare(leftUpdatedAt);
      }

      return compareCreatedAtDesc(left, right);
    });
  const { offset, limit } = getPaginationWindow(url);
  const pageRows = limit === null ? sortedRows : sortedRows.slice(offset, offset + limit);

  await fulfillJson(route, pageRows, 200, {
    'content-range': rowsContentRange(pageRows, sortedRows.length, offset),
  });
};

const fulfillConnectionRows = async (route: Route, url: URL, rows: JsonRecord[]) => {
  const requesterEq = getEqFilterValue(url, 'requester_id');
  const receiverEq = getEqFilterValue(url, 'receiver_id');
  const orRequesterIds = new Set(getOrFilterEqValues(url, 'requester_id'));
  const orReceiverIds = new Set(getOrFilterEqValues(url, 'receiver_id'));
  const status = getEqFilterValue(url, 'status');
  const id = getEqFilterValue(url, 'id');
  const sortedRows = [...rows]
    .filter(row => !id || row.id === id)
    .filter(row => !requesterEq || row.requester_id === requesterEq)
    .filter(row => !receiverEq || row.receiver_id === receiverEq)
    .filter(row => !status || row.status === status)
    .filter(row => (
      (orRequesterIds.size === 0 && orReceiverIds.size === 0) ||
      (typeof row.requester_id === 'string' && orRequesterIds.has(row.requester_id)) ||
      (typeof row.receiver_id === 'string' && orReceiverIds.has(row.receiver_id))
    ))
    .sort(compareCreatedAtDesc);

  await fulfillJson(route, sortedRows, 200, {
    'content-range': rowsContentRange(sortedRows),
  });
};

const fulfillNetworkingSuggestionPreferenceRows = async (route: Route, url: URL, rows: JsonRecord[]) => {
  const userId = getEqFilterValue(url, 'user_id');
  const status = getEqFilterValue(url, 'status');
  const suggestedUserId = getEqFilterValue(url, 'suggested_user_id');
  const filteredRows = rows
    .filter(row => !userId || row.user_id === userId)
    .filter(row => !status || row.status === status)
    .filter(row => !suggestedUserId || row.suggested_user_id === suggestedUserId)
    .sort(compareCreatedAtDesc);

  await fulfillJson(route, filteredRows, 200, {
    'content-range': rowsContentRange(filteredRows),
  });
};

const fulfillResumeExportEventRows = async (route: Route, url: URL, rows: JsonRecord[]) => {
  const userId = getEqFilterValue(url, 'user_id');
  const sortedRows = [...rows]
    .filter(row => !userId || row.user_id === userId)
    .sort(compareCreatedAtDesc);
  const { offset, limit } = getPaginationWindow(url);
  const pageRows = limit === null ? sortedRows : sortedRows.slice(offset, offset + limit);

  await fulfillJson(route, pageRows, 200, {
    'content-range': rowsContentRange(pageRows, sortedRows.length, offset),
  });
};

const fulfillResumeArtifactRows = async (route: Route, url: URL, rows: JsonRecord[]) => {
  const userId = getEqFilterValue(url, 'user_id');
  const status = getEqFilterValue(url, 'status');
  const sortedRows = [...rows]
    .filter(row => !userId || row.user_id === userId)
    .filter(row => !status || row.status === status)
    .sort((left, right) => {
      const leftUploadedAt = typeof left.uploaded_at === 'string' ? left.uploaded_at : '';
      const rightUploadedAt = typeof right.uploaded_at === 'string' ? right.uploaded_at : '';
      if (leftUploadedAt !== rightUploadedAt) {
        return rightUploadedAt.localeCompare(leftUploadedAt);
      }

      return compareCreatedAtDesc(left, right);
    });
  const { offset, limit } = getPaginationWindow(url);
  const pageRows = limit === null ? sortedRows : sortedRows.slice(offset, offset + limit);

  await fulfillJson(route, pageRows, 200, {
    'content-range': rowsContentRange(pageRows, sortedRows.length, offset),
  });
};

const fulfillSingleOrManyRows = async (route: Route, rows: JsonRecord[]) => {
  if (requestWantsSingleObject(route)) {
    if (rows.length === 0) {
      await fulfillJson(route, {
        code: 'PGRST116',
        message: 'JSON object requested, multiple (or no) rows returned',
      }, 406);
      return;
    }

    await fulfillJson(route, rows[0], 200, {
      'content-range': rowsContentRange([rows[0]], rows.length),
    });
    return;
  }

  await fulfillJson(route, rows, 200, {
    'content-range': rowsContentRange(rows),
  });
};

const fulfillNotificationSettingsRows = async (route: Route, url: URL, rows: JsonRecord[]) => {
  const id = getEqFilterValue(url, 'id');
  const userId = getEqFilterValue(url, 'user_id');
  const filteredRows = rows
    .filter(row => !id || row.id === id)
    .filter(row => !userId || row.user_id === userId);

  await fulfillSingleOrManyRows(route, filteredRows);
};

const fulfillSubscriptionRows = async (route: Route, url: URL, rows: JsonRecord[]) => {
  const id = getEqFilterValue(url, 'id');
  const userId = getEqFilterValue(url, 'user_id');
  const status = getEqFilterValue(url, 'status');
  const filteredRows = rows
    .filter(row => !id || row.id === id)
    .filter(row => !userId || row.user_id === userId)
    .filter(row => !status || row.status === status)
    .sort((left, right) => {
      const leftCreatedAt = typeof left.created_at === 'string' ? left.created_at : '';
      const rightCreatedAt = typeof right.created_at === 'string' ? right.created_at : '';
      return rightCreatedAt.localeCompare(leftCreatedAt);
    });

  await fulfillSingleOrManyRows(route, filteredRows);
};

const fulfillSubscriptionPlanRows = async (
  route: Route,
  url: URL,
  rows: JsonRecord[],
  rowsFactory?: RestStubFixtures['onSubscriptionPlanRows'],
) => {
  const context = {
    isActive: getEqFilterValue(url, 'is_active'),
  };
  const sourceRows = rowsFactory?.(context) || rows;
  const filteredRows = sourceRows
    .filter(row => context.isActive === undefined || String(row.is_active) === context.isActive)
    .sort((left, right) => {
      const leftPrice = typeof left.price === 'number' ? left.price : 0;
      const rightPrice = typeof right.price === 'number' ? right.price : 0;
      return leftPrice - rightPrice;
    });

  await fulfillJson(route, filteredRows, 200, {
    'content-range': rowsContentRange(filteredRows),
  });
};

const fulfillPaymentRows = async (route: Route, url: URL, rows: JsonRecord[]) => {
  const userId = getEqFilterValue(url, 'user_id');
  const filteredRows = rows
    .filter(row => !userId || row.user_id === userId)
    .sort(compareCreatedAtDesc);
  const { offset, limit } = getPaginationWindow(url);
  const pageRows = limit === null ? filteredRows : filteredRows.slice(offset, offset + limit);

  await fulfillJson(route, pageRows, 200, {
    'content-range': rowsContentRange(pageRows, filteredRows.length, offset),
  });
};

const fulfillJson = async (
  route: Route,
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
) => {
  await route.fulfill({
    status,
    headers: {
      ...corsJsonHeaders,
      ...headers,
    },
    body: JSON.stringify(body),
  });
};

const fulfillRows = async (route: Route, rows: JsonRecord[]) => {
  await fulfillJson(route, rows, 200, {
    'content-range': rowsContentRange(rows),
  });
};

const compareSubmittedAtDesc = (left: JsonRecord, right: JsonRecord) => {
  const leftSubmittedAt = typeof left.submitted_at === 'string' ? left.submitted_at : '';
  const rightSubmittedAt = typeof right.submitted_at === 'string' ? right.submitted_at : '';
  if (leftSubmittedAt !== rightSubmittedAt) {
    return rightSubmittedAt.localeCompare(leftSubmittedAt);
  }

  const leftId = typeof left.id === 'string' ? left.id : '';
  const rightId = typeof right.id === 'string' ? right.id : '';
  return rightId.localeCompare(leftId);
};

const fulfillChallengeRows = async (route: Route, url: URL, rows: JsonRecord[]) => {
  const isPublished = getEqFilterValue(url, 'is_published');
  const id = getEqFilterValue(url, 'id');
  const category = getEqFilterValue(url, 'category');
  const filteredRows = [...rows]
    .filter(row => !id || row.id === id)
    .filter(row => isPublished === undefined || String(row.is_published) === isPublished)
    .filter(row => !category || row.category === category)
    .sort(compareCreatedAtDesc);
  const { offset, limit } = getPaginationWindow(url);
  const pageRows = limit === null ? filteredRows : filteredRows.slice(offset, offset + limit);

  await fulfillJson(route, pageRows, 200, {
    'content-range': rowsContentRange(pageRows, filteredRows.length, offset),
  });
};

const fulfillChallengeSubmissionRows = async (route: Route, url: URL, rows: JsonRecord[]) => {
  const id = getEqFilterValue(url, 'id');
  const challengeId = getEqFilterValue(url, 'challenge_id');
  const userId = getEqFilterValue(url, 'user_id');
  const filteredRows = [...rows]
    .filter(row => !id || row.id === id)
    .filter(row => !challengeId || row.challenge_id === challengeId)
    .filter(row => !userId || row.user_id === userId)
    .sort(compareSubmittedAtDesc);
  const { offset, limit } = getPaginationWindow(url);
  const pageRows = limit === null ? filteredRows : filteredRows.slice(offset, offset + limit);

  await fulfillJson(route, pageRows, 200, {
    'content-range': rowsContentRange(pageRows, filteredRows.length, offset),
  });
};

const fulfillEnrollmentRows = async (
  route: Route,
  url: URL,
  rows: JsonRecord[],
  rowsFactory?: RestStubFixtures['onEnrollmentRows'],
) => {
  const context = {
    courseId: getEqFilterValue(url, 'course_id'),
    id: getEqFilterValue(url, 'id'),
    userId: getEqFilterValue(url, 'user_id'),
  };
  const sourceRows = rowsFactory?.(context) || rows;
  const filteredRows = [...sourceRows]
    .filter(row => !context.courseId || row.course_id === context.courseId || row.courseId === context.courseId)
    .filter(row => !context.id || row.id === context.id)
    .filter(row => !context.userId || row.user_id === context.userId || row.userId === context.userId)
    .sort(compareCreatedAtDesc);

  await fulfillJson(route, filteredRows, 200, {
    'content-range': rowsContentRange(filteredRows),
  });
};

const fulfillLessonProgressRows = async (
  route: Route,
  url: URL,
  rows: JsonRecord[],
  rowsFactory?: RestStubFixtures['onLessonProgressRows'],
) => {
  const context = {
    enrollmentId: getEqFilterValue(url, 'enrollment_id'),
    lessonId: getEqFilterValue(url, 'lesson_id'),
  };
  const sourceRows = rowsFactory?.(context) || rows;
  const filteredRows = [...sourceRows]
    .filter(row => !context.enrollmentId || row.enrollment_id === context.enrollmentId || row.enrollmentId === context.enrollmentId)
    .filter(row => !context.lessonId || row.lesson_id === context.lessonId || row.lessonId === context.lessonId)
    .sort(compareCreatedAtDesc);

  await fulfillJson(route, filteredRows, 200, {
    'content-range': rowsContentRange(filteredRows),
  });
};

const fulfillRestError = async (route: Route, error: unknown) => {
  await fulfillJson(route, {
    message: error instanceof Error ? error.message : 'E2E REST fixture failed',
  }, 500);
};

const getLmsCourseSearchHaystack = (course: JsonRecord) => [
  course.title,
  course.description,
  course.category,
  course.instructorId,
  course.level,
].filter(value => typeof value === 'string').join(' ').toLowerCase();

const getLmsEnrollmentProgress = (enrollment: JsonRecord) => {
  const progress = enrollment.progress ?? enrollment.progress_percentage;
  return typeof progress === 'number' && Number.isFinite(progress) ? progress : 0;
};

const getLmsEnrollmentStatus = (enrollment: JsonRecord) => (
  typeof enrollment.status === 'string' ? enrollment.status : ''
);

const getLmsCoursesPayload = (url: URL, courses: JsonRecord[], enrollments: JsonRecord[]) => {
  const search = url.searchParams.get('search')?.trim().toLowerCase() || '';
  const progressFilter = url.searchParams.get('progress');
  const userId = url.searchParams.get('userId') || undefined;
  const offset = Number.parseInt(url.searchParams.get('offset') || '0', 10);
  const limit = Number.parseInt(url.searchParams.get('limit') || `${courses.length}`, 10);
  const safeOffset = Number.isFinite(offset) && offset >= 0 ? offset : 0;
  const safeLimit = Number.isFinite(limit) && limit >= 0 ? limit : courses.length;
  const enrollmentByCourseId = new Map(
    enrollments
      .filter(enrollment => !userId || enrollment.userId === userId || enrollment.user_id === userId)
      .map(enrollment => [String(enrollment.courseId || enrollment.course_id || ''), enrollment])
      .filter(([courseId]) => courseId)
  );
  const filteredCourses = search
    ? courses.filter(course => getLmsCourseSearchHaystack(course).includes(search))
    : courses;
  const progressFilteredCourses = progressFilter
    ? filteredCourses.filter((course) => {
      const enrollment = enrollmentByCourseId.get(String(course.id || ''));
      if (!enrollment) return false;

      const progress = getLmsEnrollmentProgress(enrollment);
      const status = getLmsEnrollmentStatus(enrollment);
      if (progressFilter === 'completed') return status === 'COMPLETED' || progress >= 100;
      if (progressFilter === 'in-progress') return status === 'IN_PROGRESS' || (progress > 0 && progress < 100);
      return true;
    })
    : filteredCourses;
  const pageCourses = progressFilteredCourses.slice(safeOffset, safeOffset + safeLimit);

  return {
    data: pageCourses,
    total: progressFilteredCourses.length,
    hasNext: safeOffset + pageCourses.length < progressFilteredCourses.length,
    nextCursor: null,
  };
};

const getLmsEnrollmentsPayload = (url: URL, enrollments: JsonRecord[]) => {
  const userId = decodeURIComponent(url.pathname.split('/').pop() || '');
  const filteredEnrollments = enrollments.filter(enrollment => (
    !userId || enrollment.userId === userId || enrollment.user_id === userId
  ));

  return {
    data: filteredEnrollments,
    total: filteredEnrollments.length,
  };
};

const buildLmsEnrollmentResponse = (courseId?: string, userId?: string): JsonRecord => ({
  id: `enrollment-${courseId || 'course-e2e'}`,
  userId: userId || 'e2e-role_user',
  courseId: courseId || 'course-e2e',
  status: 'ENROLLED',
  progress: 0,
  enrolledAt: '2026-06-27T10:00:00.000Z',
  completedLessonIds: [],
});

const buildApplicationInsertResponse = (payload: JsonRecord): JsonRecord => ({
  id: 'e2e-application-001',
  user_id: typeof payload.user_id === 'string' ? payload.user_id : 'e2e-user',
  job_id: typeof payload.job_id === 'string' ? payload.job_id : 'e2e-job-001',
  resume_url: typeof payload.resume_url === 'string' ? payload.resume_url : null,
  cover_letter: typeof payload.cover_letter === 'string' ? payload.cover_letter : null,
  status: 'PENDING',
  applied_at: '2026-06-27T10:00:00.000Z',
  created_at: '2026-06-27T10:00:00.000Z',
  updated_at: '2026-06-27T10:00:00.000Z',
});

const buildApplicationUpdateResponse = (payload: JsonRecord, id?: string): JsonRecord => ({
  id: id || 'e2e-application-001',
  user_id: typeof payload.user_id === 'string' ? payload.user_id : 'e2e-user',
  job_id: typeof payload.job_id === 'string' ? payload.job_id : 'e2e-job-001',
  resume_url: typeof payload.resume_url === 'string' ? payload.resume_url : null,
  cover_letter: typeof payload.cover_letter === 'string' ? payload.cover_letter : null,
  status: typeof payload.status === 'string' ? payload.status : 'PENDING',
  applied_at: '2026-06-27T10:00:00.000Z',
  created_at: '2026-06-27T10:00:00.000Z',
  updated_at: '2026-06-27T10:00:00.000Z',
  ...payload,
});

const buildChallengeSubmissionResponse = (payload: JsonRecord): JsonRecord => ({
  id: typeof payload.id === 'string' ? payload.id : 'challenge-submission-e2e-001',
  challenge_id: typeof payload.challenge_id === 'string' ? payload.challenge_id : 'challenge-e2e-001',
  user_id: typeof payload.user_id === 'string' ? payload.user_id : 'e2e-role_user',
  language: typeof payload.language === 'string' ? payload.language : 'javascript',
  code_submitted: typeof payload.code_submitted === 'string' ? payload.code_submitted : '',
  passed_tests: typeof payload.passed_tests === 'boolean' ? payload.passed_tests : true,
  score: typeof payload.score === 'number' ? payload.score : 100,
  execution_time_ms: typeof payload.execution_time_ms === 'number' ? payload.execution_time_ms : 42,
  memory_used_kb: typeof payload.memory_used_kb === 'number' ? payload.memory_used_kb : 512,
  feedback: typeof payload.feedback === 'string' ? payload.feedback : 'Visible sample cases passed.',
  submitted_at: typeof payload.submitted_at === 'string' ? payload.submitted_at : '2026-06-27T10:00:00.000Z',
  ...payload,
});

const buildEnrollmentResponse = (payload: JsonRecord): JsonRecord => ({
  id: typeof payload.id === 'string' ? payload.id : `enrollment-${String(payload.course_id || payload.courseId || 'course-e2e')}`,
  course_id: typeof payload.course_id === 'string' ? payload.course_id : typeof payload.courseId === 'string' ? payload.courseId : 'course-e2e',
  user_id: typeof payload.user_id === 'string' ? payload.user_id : typeof payload.userId === 'string' ? payload.userId : 'e2e-role_user',
  status: typeof payload.status === 'string' ? payload.status : 'ENROLLED',
  progress_percentage: typeof payload.progress_percentage === 'number' ? payload.progress_percentage : 0,
  enrolled_at: typeof payload.enrolled_at === 'string' ? payload.enrolled_at : '2026-06-27T10:00:00.000Z',
  started_at: typeof payload.started_at === 'string' ? payload.started_at : null,
  completed_at: typeof payload.completed_at === 'string' ? payload.completed_at : null,
  certificate_url: typeof payload.certificate_url === 'string' ? payload.certificate_url : null,
  ...payload,
});

const buildLessonProgressResponse = (payload: JsonRecord): JsonRecord => ({
  id: typeof payload.id === 'string' ? payload.id : 'lesson-progress-e2e-001',
  enrollment_id: typeof payload.enrollment_id === 'string' ? payload.enrollment_id : 'enrollment-course-e2e',
  lesson_id: typeof payload.lesson_id === 'string' ? payload.lesson_id : 'lesson-e2e-001',
  completed: typeof payload.completed === 'boolean' ? payload.completed : true,
  completed_at: typeof payload.completed_at === 'string' ? payload.completed_at : '2026-06-27T10:00:00.000Z',
  ...payload,
});

const buildCandidateNoteResponse = (payload: JsonRecord): JsonRecord => ({
  recruiter_id: typeof payload.recruiter_id === 'string' ? payload.recruiter_id : 'e2e-role_recruiter',
  application_id: typeof payload.application_id === 'string' ? payload.application_id : 'e2e-application-001',
  note: typeof payload.note === 'string' ? payload.note : '',
  created_at: '2026-06-27T10:00:00.000Z',
  updated_at: '2026-06-27T10:00:00.000Z',
});

const buildCandidateScorecardResponse = (payload: JsonRecord): JsonRecord => ({
  recruiter_id: typeof payload.recruiter_id === 'string' ? payload.recruiter_id : 'e2e-role_recruiter',
  application_id: typeof payload.application_id === 'string' ? payload.application_id : 'e2e-application-001',
  ratings: toJsonRecord(payload.ratings),
  evidence: typeof payload.evidence === 'string' ? payload.evidence : '',
  created_at: '2026-06-27T10:00:00.000Z',
  updated_at: '2026-06-27T10:00:00.000Z',
});

const buildConnectionResponse = (payload: JsonRecord, id?: string): JsonRecord => ({
  id: id || (typeof payload.id === 'string' ? payload.id : 'connection-e2e-001'),
  requester_id: typeof payload.requester_id === 'string' ? payload.requester_id : 'e2e-role_user',
  receiver_id: typeof payload.receiver_id === 'string' ? payload.receiver_id : 'network-target-e2e',
  status: typeof payload.status === 'string' ? payload.status : 'PENDING',
  message: typeof payload.message === 'string' ? payload.message : null,
  created_at: '2026-06-27T10:00:00.000Z',
  updated_at: '2026-06-27T10:00:00.000Z',
  ...payload,
});

const buildNetworkingSuggestionPreferenceResponse = (payload: JsonRecord): JsonRecord => ({
  id: typeof payload.id === 'string' ? payload.id : 'networking-suggestion-preference-e2e-001',
  user_id: typeof payload.user_id === 'string' ? payload.user_id : 'e2e-role_user',
  suggested_user_id: typeof payload.suggested_user_id === 'string' ? payload.suggested_user_id : 'network-target-e2e',
  status: typeof payload.status === 'string' ? payload.status : 'dismissed',
  reason: typeof payload.reason === 'string' ? payload.reason : 'dismissed_from_discover',
  created_at: '2026-06-27T10:00:00.000Z',
  updated_at: '2026-06-27T10:00:00.000Z',
  ...payload,
});

const buildSavedJobSearchResponse = (payload: JsonRecord): JsonRecord => ({
  id: typeof payload.id === 'string' ? payload.id : 'saved-job-search-e2e-001',
  user_id: typeof payload.user_id === 'string' ? payload.user_id : 'e2e-role_user',
  name: typeof payload.name === 'string' ? payload.name : 'E2E saved search',
  search_term: typeof payload.search_term === 'string' ? payload.search_term : '',
  filters: toJsonRecord(payload.filters),
  alert_enabled: typeof payload.alert_enabled === 'boolean' ? payload.alert_enabled : false,
  last_match_count: typeof payload.last_match_count === 'number' ? payload.last_match_count : null,
  last_checked_at: typeof payload.last_checked_at === 'string' ? payload.last_checked_at : null,
  last_used_at: typeof payload.last_used_at === 'string' ? payload.last_used_at : null,
  created_at: typeof payload.created_at === 'string' ? payload.created_at : '2026-06-27T10:00:00.000Z',
  updated_at: '2026-06-27T10:00:00.000Z',
  ...payload,
});

const buildHiddenExploreJobResponse = (payload: JsonRecord): JsonRecord => ({
  id: typeof payload.id === 'string' ? payload.id : 'hidden-explore-job-e2e-001',
  user_id: typeof payload.user_id === 'string' ? payload.user_id : 'e2e-role_user',
  job_id: typeof payload.job_id === 'string' ? payload.job_id : 'job-e2e-001',
  title: typeof payload.title === 'string' ? payload.title : 'E2E job',
  company_name: typeof payload.company_name === 'string' ? payload.company_name : null,
  job_type: typeof payload.job_type === 'string' ? payload.job_type : null,
  location: typeof payload.location === 'string' ? payload.location : null,
  hidden_at: typeof payload.hidden_at === 'string' ? payload.hidden_at : '2026-06-27T10:00:00.000Z',
  created_at: typeof payload.created_at === 'string' ? payload.created_at : '2026-06-27T10:00:00.000Z',
  updated_at: '2026-06-27T10:00:00.000Z',
  ...payload,
});

const buildUserProfileResponse = (
  payload: JsonRecord,
  context: { userId?: string; source?: JsonRecord | null } = {},
): JsonRecord => ({
  id: typeof context.source?.id === 'string' ? context.source.id : 'user-profile-e2e-001',
  user_id: context.userId || (typeof context.source?.user_id === 'string' ? context.source.user_id : 'e2e-role_user'),
  created_at: typeof context.source?.created_at === 'string' ? context.source.created_at : '2026-06-27T10:00:00.000Z',
  updated_at: '2026-06-27T10:00:00.000Z',
  ...context.source,
  ...payload,
});

const buildProfileIdentityResponse = (payload: JsonRecord, id?: string): JsonRecord => ({
  id: id || (typeof payload.id === 'string' ? payload.id : 'e2e-role_user'),
  avatar_url: typeof payload.avatar_url === 'string' ? payload.avatar_url : null,
  updated_at: '2026-06-27T10:00:00.000Z',
  ...payload,
});

const buildSkillResponse = (payload: JsonRecord, id?: string): JsonRecord => ({
  id: id || (typeof payload.id === 'string' ? payload.id : 'skill-e2e-001'),
  profile_id: typeof payload.profile_id === 'string' ? payload.profile_id : 'user-profile-e2e-001',
  name: typeof payload.name === 'string' ? payload.name : 'E2E Skill',
  proficiency: typeof payload.proficiency === 'string' ? payload.proficiency : 'INTERMEDIATE',
  years_of_experience: typeof payload.years_of_experience === 'number' ? payload.years_of_experience : null,
  created_at: typeof payload.created_at === 'string' ? payload.created_at : '2026-06-27T10:00:00.000Z',
  updated_at: '2026-06-27T10:00:00.000Z',
  ...payload,
});

const buildExperienceResponse = (payload: JsonRecord, id?: string): JsonRecord => ({
  id: id || (typeof payload.id === 'string' ? payload.id : 'experience-e2e-001'),
  profile_id: typeof payload.profile_id === 'string' ? payload.profile_id : 'user-profile-e2e-001',
  title: typeof payload.title === 'string' ? payload.title : 'E2E Role',
  company: typeof payload.company === 'string' ? payload.company : 'E2E Company',
  location: typeof payload.location === 'string' ? payload.location : null,
  start_date: typeof payload.start_date === 'string' ? payload.start_date : '2026-01-01',
  end_date: typeof payload.end_date === 'string' ? payload.end_date : null,
  current: typeof payload.current === 'boolean' ? payload.current : false,
  description: typeof payload.description === 'string' ? payload.description : '',
  created_at: typeof payload.created_at === 'string' ? payload.created_at : '2026-06-27T10:00:00.000Z',
  updated_at: '2026-06-27T10:00:00.000Z',
  ...payload,
});

const buildEducationResponse = (payload: JsonRecord, id?: string): JsonRecord => ({
  id: id || (typeof payload.id === 'string' ? payload.id : 'education-e2e-001'),
  profile_id: typeof payload.profile_id === 'string' ? payload.profile_id : 'user-profile-e2e-001',
  institution: typeof payload.institution === 'string' ? payload.institution : 'E2E University',
  degree: typeof payload.degree === 'string' ? payload.degree : null,
  field_of_study: typeof payload.field_of_study === 'string' ? payload.field_of_study : null,
  start_date: typeof payload.start_date === 'string' ? payload.start_date : '2026-01-01',
  end_date: typeof payload.end_date === 'string' ? payload.end_date : null,
  gpa: typeof payload.gpa === 'number' ? payload.gpa : null,
  created_at: typeof payload.created_at === 'string' ? payload.created_at : '2026-06-27T10:00:00.000Z',
  updated_at: '2026-06-27T10:00:00.000Z',
  ...payload,
});

const buildResumeExportEventResponse = (payload: JsonRecord): JsonRecord => ({
  id: typeof payload.id === 'string' ? payload.id : 'resume-export-event-e2e-001',
  user_id: typeof payload.user_id === 'string' ? payload.user_id : 'e2e-role_user',
  status: typeof payload.status === 'string' ? payload.status : 'ready',
  method: typeof payload.method === 'string' ? payload.method : 'browser-print',
  file_name: typeof payload.file_name === 'string' ? payload.file_name : 'E2E-User-resume.pdf',
  detail: typeof payload.detail === 'string' ? payload.detail : 'Resume export activity recorded.',
  created_at: typeof payload.created_at === 'string' ? payload.created_at : '2026-06-27T10:00:00.000Z',
  ...payload,
});

const buildResumeArtifactResponse = (payload: JsonRecord, id?: string): JsonRecord => ({
  id: id || (typeof payload.id === 'string' ? payload.id : 'resume-artifact-e2e-001'),
  user_id: typeof payload.user_id === 'string' ? payload.user_id : 'e2e-role_user',
  file_name: typeof payload.file_name === 'string' ? payload.file_name : 'E2E-User-resume.pdf',
  file_url: typeof payload.file_url === 'string' ? payload.file_url : 'https://files.example/resumes/e2e-uploaded.pdf',
  status: typeof payload.status === 'string' ? payload.status : 'active',
  uploaded_at: typeof payload.uploaded_at === 'string' ? payload.uploaded_at : '2026-06-27T10:00:00.000Z',
  deleted_at: typeof payload.deleted_at === 'string' ? payload.deleted_at : null,
  updated_at: '2026-06-27T10:00:00.000Z',
  ...payload,
});

const buildNotificationSettingsResponse = (payload: JsonRecord, context: { id?: string; userId?: string } = {}): JsonRecord => ({
  id: context.id || (typeof payload.id === 'string' ? payload.id : 'notification-settings-e2e-001'),
  user_id: context.userId || (typeof payload.user_id === 'string' ? payload.user_id : 'e2e-role_user'),
  email_notifications: typeof payload.email_notifications === 'boolean' ? payload.email_notifications : true,
  push_notifications: typeof payload.push_notifications === 'boolean' ? payload.push_notifications : true,
  sms_notifications: typeof payload.sms_notifications === 'boolean' ? payload.sms_notifications : false,
  job_alerts: typeof payload.job_alerts === 'boolean' ? payload.job_alerts : true,
  message_notifications: typeof payload.message_notifications === 'boolean' ? payload.message_notifications : true,
  newsletter: typeof payload.newsletter === 'boolean' ? payload.newsletter : false,
  digest_frequency: typeof payload.digest_frequency === 'string' ? payload.digest_frequency : 'immediate',
  quiet_hours_enabled: typeof payload.quiet_hours_enabled === 'boolean' ? payload.quiet_hours_enabled : false,
  quiet_hours_start: typeof payload.quiet_hours_start === 'string' ? payload.quiet_hours_start : '18:00',
  quiet_hours_end: typeof payload.quiet_hours_end === 'string' ? payload.quiet_hours_end : '09:00',
  created_at: typeof payload.created_at === 'string' ? payload.created_at : '2026-06-27T10:00:00.000Z',
  updated_at: typeof payload.updated_at === 'string' ? payload.updated_at : '2026-06-27T10:00:00.000Z',
  ...payload,
});

const buildSupabaseFunctionResponse = (functionName: string, payload: JsonRecord): JsonRecord => {
  if (functionName === 'create-subscription') {
    return {
      id: 'subscription-session-e2e',
      planId: typeof payload.planId === 'string' ? payload.planId : 'plan-e2e',
      url: `https://billing.example/checkout/${String(payload.planId || 'plan-e2e')}`,
    };
  }

  if (functionName === 'create-billing-portal-session') {
    return {
      id: 'billing-portal-session-e2e',
      url: 'https://billing.example/portal/e2e-role_user',
    };
  }

  if (functionName === 'create-checkout-session') {
    return {
      id: 'checkout-session-e2e',
      url: 'https://billing.example/checkout/session-e2e',
    };
  }

  return {
    data: {
      ok: true,
    },
  };
};

const buildCompanyResponse = (payload: JsonRecord, id?: string): JsonRecord => ({
  id: id || (typeof payload.id === 'string' ? payload.id : 'company-e2e-001'),
  name: typeof payload.name === 'string' ? payload.name : 'E2E Company',
  description: typeof payload.description === 'string' ? payload.description : null,
  website: typeof payload.website === 'string' ? payload.website : null,
  location: typeof payload.location === 'string' ? payload.location : null,
  logo_url: typeof payload.logo_url === 'string' ? payload.logo_url : null,
  industry: typeof payload.industry === 'string' ? payload.industry : null,
  employee_count: typeof payload.employee_count === 'number' ? payload.employee_count : null,
  owner_user_id: typeof payload.owner_user_id === 'string' ? payload.owner_user_id : 'e2e-role_recruiter',
  verified: typeof payload.verified === 'boolean' ? payload.verified : false,
  verified_at: typeof payload.verified_at === 'string' ? payload.verified_at : null,
  created_at: typeof payload.created_at === 'string' ? payload.created_at : '2026-06-27T10:00:00.000Z',
  updated_at: typeof payload.updated_at === 'string' ? payload.updated_at : '2026-06-27T10:00:00.000Z',
  ...payload,
});

const buildJobInsertResponse = (payload: JsonRecord): JsonRecord => ({
  id: typeof payload.id === 'string' ? payload.id : 'job-draft-e2e-001',
  title: typeof payload.title === 'string' ? payload.title : 'E2E job',
  description: typeof payload.description === 'string' ? payload.description : '',
  company_id: typeof payload.company_id === 'string' ? payload.company_id : 'company-e2e-001',
  location: typeof payload.location === 'string' ? payload.location : '',
  job_type: typeof payload.job_type === 'string' ? payload.job_type : 'FULL_TIME',
  salary_min: typeof payload.salary_min === 'number' ? payload.salary_min : null,
  salary_max: typeof payload.salary_max === 'number' ? payload.salary_max : null,
  requirements: Array.isArray(payload.requirements) ? payload.requirements : [],
  posted_by: typeof payload.posted_by === 'string' ? payload.posted_by : 'e2e-role_recruiter',
  posted_at: typeof payload.posted_at === 'string' ? payload.posted_at : '2026-06-27T10:00:00.000Z',
  created_at: typeof payload.created_at === 'string' ? payload.created_at : '2026-06-27T10:00:00.000Z',
  updated_at: typeof payload.updated_at === 'string' ? payload.updated_at : '2026-06-27T10:00:00.000Z',
  status: typeof payload.status === 'string' ? payload.status : 'DRAFT',
  ...payload,
});

const buildJobPostTemplateResponse = (payload: JsonRecord): JsonRecord => ({
  id: typeof payload.id === 'string' ? payload.id : 'job-template-e2e-001',
  recruiter_id: typeof payload.recruiter_id === 'string' ? payload.recruiter_id : 'e2e-role_recruiter',
  name: typeof payload.name === 'string' ? payload.name : typeof payload.title === 'string' ? payload.title : 'E2E template',
  title: typeof payload.title === 'string' ? payload.title : '',
  description: typeof payload.description === 'string' ? payload.description : '',
  location: typeof payload.location === 'string' ? payload.location : '',
  job_type: typeof payload.job_type === 'string' ? payload.job_type : 'FULL_TIME',
  salary_min: typeof payload.salary_min === 'string' ? payload.salary_min : null,
  salary_max: typeof payload.salary_max === 'string' ? payload.salary_max : null,
  requirements: typeof payload.requirements === 'string' ? payload.requirements : '',
  salary_range: typeof payload.salary_range === 'string' ? payload.salary_range : null,
  category: typeof payload.category === 'string' ? payload.category : null,
  created_at: typeof payload.created_at === 'string' ? payload.created_at : '2026-06-27T10:00:00.000Z',
  updated_at: typeof payload.updated_at === 'string' ? payload.updated_at : '2026-06-27T10:00:00.000Z',
  ...payload,
});

const buildJobPostDraftVersionResponse = (payload: JsonRecord): JsonRecord => ({
  id: typeof payload.id === 'string' ? payload.id : 'job-post-draft-version-e2e-001',
  recruiter_id: typeof payload.recruiter_id === 'string' ? payload.recruiter_id : 'e2e-role_recruiter',
  draft_key: typeof payload.draft_key === 'string' ? payload.draft_key : 'new',
  job_id: typeof payload.job_id === 'string' ? payload.job_id : null,
  title: typeof payload.title === 'string' ? payload.title : '',
  description: typeof payload.description === 'string' ? payload.description : '',
  location: typeof payload.location === 'string' ? payload.location : '',
  job_type: typeof payload.job_type === 'string' ? payload.job_type : 'FULL_TIME',
  salary_min: typeof payload.salary_min === 'string' ? payload.salary_min : null,
  salary_max: typeof payload.salary_max === 'string' ? payload.salary_max : null,
  requirements: typeof payload.requirements === 'string' ? payload.requirements : '',
  salary_range: typeof payload.salary_range === 'string' ? payload.salary_range : null,
  category: typeof payload.category === 'string' ? payload.category : null,
  company_id: typeof payload.company_id === 'string' ? payload.company_id : null,
  company_name: typeof payload.company_name === 'string' ? payload.company_name : null,
  company_attached: typeof payload.company_attached === 'boolean' ? payload.company_attached : false,
  reason: typeof payload.reason === 'string' ? payload.reason : 'autosave',
  created_at: typeof payload.created_at === 'string' ? payload.created_at : '2026-06-27T10:00:00.000Z',
  updated_at: typeof payload.updated_at === 'string' ? payload.updated_at : '2026-06-27T10:00:00.000Z',
  ...payload,
});

const fulfillRestFixture = async (
  route: Route,
  url: URL,
  fixtures: RestStubFixtures = {},
) => {
  const request = route.request();
  const tableName = getRestTableName(url);
  const method = request.method();
  const payload = method === 'GET' || method === 'HEAD' ? {} : readJsonPayload(route);

  if (method === 'OPTIONS') {
    await route.fulfill({
      status: 204,
      headers: {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'GET,POST,PATCH,PUT,DELETE,OPTIONS',
        'access-control-allow-headers': '*',
      },
    });
    return;
  }

  if (method === 'DELETE') {
    try {
      if (tableName === 'candidate_notes') {
        fixtures.onCandidateNoteDelete?.({
          applicationId: getEqFilterValue(url, 'application_id'),
          recruiterId: getEqFilterValue(url, 'recruiter_id'),
        });
      }

      if (tableName === 'networking_suggestion_preferences') {
        fixtures.onNetworkingSuggestionPreferenceDelete?.({
          suggestedUserId: getEqFilterValue(url, 'suggested_user_id'),
          userId: getEqFilterValue(url, 'user_id'),
        });
      }

      if (tableName === 'saved_job_searches') {
        fixtures.onSavedJobSearchDelete?.({
          id: getEqFilterValue(url, 'id'),
          userId: getEqFilterValue(url, 'user_id'),
        });
      }

      if (tableName === 'hidden_explore_jobs') {
        const jobId = getEqFilterValue(url, 'job_id');
        const userId = getEqFilterValue(url, 'user_id');
        if (jobId) {
          fixtures.onHiddenExploreJobDelete?.({ jobId, userId });
        } else {
          fixtures.onHiddenExploreJobsClear?.({ userId });
        }
      }

      if (tableName === 'job_post_templates') {
        fixtures.onJobPostTemplateDelete?.({
          id: getEqFilterValue(url, 'id'),
          recruiterId: getEqFilterValue(url, 'recruiter_id'),
        });
      }

      if (tableName === 'skills') {
        fixtures.onSkillDelete?.({ id: getEqFilterValue(url, 'id') });
      }

      if (tableName === 'experiences') {
        fixtures.onExperienceDelete?.({ id: getEqFilterValue(url, 'id') });
      }

      if (tableName === 'educations') {
        fixtures.onEducationDelete?.({ id: getEqFilterValue(url, 'id') });
      }

      await route.fulfill({
        status: 204,
        headers: { 'access-control-allow-origin': '*' },
      });
    } catch (error) {
      await fulfillRestError(route, error);
    }
    return;
  }

  if (method === 'POST' || method === 'PATCH' || method === 'PUT') {
    try {
      if (tableName === 'jobs') {
        if (method === 'POST') {
          const response = fixtures.onJobInsert?.(payload) || buildJobInsertResponse(payload);
          await fulfillJson(route, response, 201);
          return;
        }

        const id = getEqFilterValue(url, 'id');
        const response = fixtures.onJobUpdate?.(payload, { id }) || {
          id: id || 'e2e-job-001',
          title: 'E2E job',
          description: '',
          company_id: 'e2e-company',
          location: '',
          job_type: 'FULL_TIME',
          requirements: [],
          posted_at: '2026-06-27T10:00:00.000Z',
          status: typeof payload.status === 'string' ? payload.status : 'DRAFT',
          ...payload,
        };
        await fulfillJson(route, response, 200);
        return;
      }

      if (tableName === 'companies') {
        if (method === 'PATCH' || method === 'PUT') {
          const id = getEqFilterValue(url, 'id');
          const response = fixtures.onCompanyUpdate?.(payload, { id }) || buildCompanyResponse(payload, id);
          await fulfillJson(route, response, 200);
          return;
        }

        const response = fixtures.onCompanyInsert?.(payload) || buildCompanyResponse(payload);
        await fulfillJson(route, response, 201);
        return;
      }

      if (tableName === 'user_profiles') {
        const userId = getEqFilterValue(url, 'user_id');
        const response = fixtures.onUserProfileUpdate?.(payload, { userId }) || buildUserProfileResponse(payload, {
          userId,
          source: fixtures.profile,
        });
        await fulfillJson(route, response, 200);
        return;
      }

      if (tableName === 'profiles') {
        const id = getEqFilterValue(url, 'id');
        const response = fixtures.onProfileIdentityUpdate?.(payload, { id }) || buildProfileIdentityResponse(payload, id);
        await fulfillJson(route, response, 200);
        return;
      }

      if (tableName === 'skills') {
        if (method === 'PATCH' || method === 'PUT') {
          const id = getEqFilterValue(url, 'id');
          const response = fixtures.onSkillUpdate?.(payload, { id }) || buildSkillResponse(payload, id);
          await fulfillJson(route, response, 200);
          return;
        }

        const skillPayload = readJsonPayloadRows(route)[0] || payload;
        const response = fixtures.onSkillInsert?.(skillPayload) || buildSkillResponse(skillPayload);
        await fulfillJson(route, response, 201);
        return;
      }

      if (tableName === 'experiences') {
        if (method === 'PATCH' || method === 'PUT') {
          const id = getEqFilterValue(url, 'id');
          const response = fixtures.onExperienceUpdate?.(payload, { id }) || buildExperienceResponse(payload, id);
          await fulfillJson(route, response, 200);
          return;
        }

        const experiencePayload = readJsonPayloadRows(route)[0] || payload;
        const response = fixtures.onExperienceInsert?.(experiencePayload) || buildExperienceResponse(experiencePayload);
        await fulfillJson(route, response, 201);
        return;
      }

      if (tableName === 'educations') {
        if (method === 'PATCH' || method === 'PUT') {
          const id = getEqFilterValue(url, 'id');
          const response = fixtures.onEducationUpdate?.(payload, { id }) || buildEducationResponse(payload, id);
          await fulfillJson(route, response, 200);
          return;
        }

        const educationPayload = readJsonPayloadRows(route)[0] || payload;
        const response = fixtures.onEducationInsert?.(educationPayload) || buildEducationResponse(educationPayload);
        await fulfillJson(route, response, 201);
        return;
      }

      if (tableName === 'resume_export_events') {
        const resumeExportPayload = readJsonPayloadRows(route)[0] || payload;
        const response = fixtures.onResumeExportEventUpsert?.(resumeExportPayload) || buildResumeExportEventResponse(resumeExportPayload);
        await fulfillJson(route, response, method === 'POST' ? 201 : 200);
        return;
      }

      if (tableName === 'resume_artifacts') {
        if (method === 'PATCH' || method === 'PUT') {
          const id = getEqFilterValue(url, 'id');
          const userId = getEqFilterValue(url, 'user_id');
          const response = fixtures.onResumeArtifactUpdate?.(payload, { id, userId }) || buildResumeArtifactResponse({
            id,
            user_id: userId,
            ...payload,
          }, id);
          await fulfillJson(route, response, 200);
          return;
        }

        const resumeArtifactPayload = readJsonPayloadRows(route)[0] || payload;
        const response = fixtures.onResumeArtifactUpsert?.(resumeArtifactPayload) || buildResumeArtifactResponse(resumeArtifactPayload);
        await fulfillJson(route, response, 201);
        return;
      }

      if (tableName === 'notification_settings') {
        if (method === 'PATCH' || method === 'PUT') {
          const id = getEqFilterValue(url, 'id');
          const userId = getEqFilterValue(url, 'user_id');
          const response = fixtures.onNotificationSettingsUpdate?.(payload, { id, userId }) || buildNotificationSettingsResponse(payload, { id, userId });
          await fulfillJson(route, response, 200);
          return;
        }

        const notificationSettingsPayload = readJsonPayloadRows(route)[0] || payload;
        const response = fixtures.onNotificationSettingsInsert?.(notificationSettingsPayload) || buildNotificationSettingsResponse(notificationSettingsPayload);
        await fulfillJson(route, response, 201);
        return;
      }

      if (tableName === 'job_applications') {
        if (method === 'PATCH' || method === 'PUT') {
          const id = getEqFilterValue(url, 'id');
          const response = fixtures.onApplicationUpdate?.(payload, { id }) || buildApplicationUpdateResponse(payload, id);
          await fulfillJson(route, response, 200);
          return;
        }

        const response = fixtures.onApplicationInsert?.(payload) || buildApplicationInsertResponse(payload);
        await fulfillJson(route, response, 201);
        return;
      }

      if (tableName === 'candidate_notes') {
        const response = fixtures.onCandidateNoteUpsert?.(payload) || buildCandidateNoteResponse(payload);
        await fulfillJson(route, response, 201);
        return;
      }

      if (tableName === 'candidate_scorecards') {
        const response = fixtures.onCandidateScorecardUpsert?.(payload) || buildCandidateScorecardResponse(payload);
        await fulfillJson(route, response, 201);
        return;
      }

      if (tableName === 'challenge_submissions') {
        const submissionPayload = readJsonPayloadRows(route)[0] || payload;
        const response = fixtures.onChallengeSubmissionInsert?.(submissionPayload) || buildChallengeSubmissionResponse(submissionPayload);
        await fulfillJson(route, response, 201);
        return;
      }

      if (tableName === 'enrollments') {
        if (method === 'PATCH' || method === 'PUT') {
          const id = getEqFilterValue(url, 'id');
          const response = fixtures.onEnrollmentUpdate?.(payload, { id }) || buildEnrollmentResponse({ id, ...payload });
          await fulfillJson(route, response, 200);
          return;
        }

        const enrollmentPayload = readJsonPayloadRows(route)[0] || payload;
        const response = fixtures.onEnrollmentInsert?.(enrollmentPayload) || buildEnrollmentResponse(enrollmentPayload);
        await fulfillJson(route, response, 201);
        return;
      }

      if (tableName === 'lesson_progress') {
        if (method === 'PATCH' || method === 'PUT') {
          const response = fixtures.onLessonProgressUpdate?.(payload, {
            enrollmentId: getEqFilterValue(url, 'enrollment_id'),
            lessonId: getEqFilterValue(url, 'lesson_id'),
          }) || buildLessonProgressResponse({
            enrollment_id: getEqFilterValue(url, 'enrollment_id'),
            lesson_id: getEqFilterValue(url, 'lesson_id'),
            ...payload,
          });
          await fulfillJson(route, response, 200);
          return;
        }

        const lessonProgressPayload = readJsonPayloadRows(route)[0] || payload;
        const response = fixtures.onLessonProgressInsert?.(lessonProgressPayload) || buildLessonProgressResponse(lessonProgressPayload);
        await fulfillJson(route, response, 201);
        return;
      }

      if (tableName === 'connections') {
        if (method === 'PATCH' || method === 'PUT') {
          const id = getEqFilterValue(url, 'id');
          const response = fixtures.onConnectionUpdate?.(payload, { id }) || buildConnectionResponse(payload, id);
          await fulfillJson(route, response, 200);
          return;
        }

        const response = fixtures.onConnectionInsert?.(payload) || buildConnectionResponse(payload);
        await fulfillJson(route, response, 201);
        return;
      }

      if (tableName === 'networking_suggestion_preferences') {
        const response = fixtures.onNetworkingSuggestionPreferenceUpsert?.(payload) || buildNetworkingSuggestionPreferenceResponse(payload);
        await fulfillJson(route, response, 201);
        return;
      }

      if (tableName === 'saved_job_searches') {
        const response = fixtures.onSavedJobSearchUpsert?.(payload) || buildSavedJobSearchResponse(payload);
        await fulfillJson(route, response, 201);
        return;
      }

      if (tableName === 'hidden_explore_jobs') {
        const response = fixtures.onHiddenExploreJobUpsert?.(payload) || buildHiddenExploreJobResponse(payload);
        await fulfillJson(route, response, 201);
        return;
      }

      if (tableName === 'job_post_templates') {
        const response = fixtures.onJobPostTemplateUpsert?.(payload) || buildJobPostTemplateResponse(payload);
        await fulfillJson(route, response, 201);
        return;
      }

      if (tableName === 'job_post_draft_versions') {
        const response = fixtures.onJobPostDraftVersionUpsert?.(payload) || buildJobPostDraftVersionResponse(payload);
        await fulfillJson(route, response, 201);
        return;
      }

      if (tableName === 'messages') {
        if (method === 'PATCH' || method === 'PUT') {
          const id = getEqFilterValue(url, 'id');
          const conversationId = getEqFilterValue(url, 'conversation_id');
          const response = fixtures.onMessageUpdate?.(payload, { id, conversationId }) || {
            id: id || 'e2e-message-001',
            conversation_id: conversationId || payload.conversation_id || 'conversation-e2e',
            sender_id: typeof payload.sender_id === 'string' ? payload.sender_id : 'e2e-user',
            content: typeof payload.content === 'string' ? payload.content : '',
            message_type: typeof payload.message_type === 'string' ? payload.message_type : 'TEXT',
            attachment_url: typeof payload.attachment_url === 'string' ? payload.attachment_url : null,
            status: typeof payload.status === 'string' ? payload.status : 'READ',
            created_at: '2026-06-27T10:00:00.000Z',
            read_at: typeof payload.read_at === 'string' ? payload.read_at : '2026-06-27T10:00:00.000Z',
            ...payload,
          };
          await fulfillJson(route, response, 200);
          return;
        }

        const response = fixtures.onMessageInsert?.(payload) || {
          id: 'e2e-message-001',
          conversation_id: payload.conversation_id,
          sender_id: payload.sender_id,
          content: payload.content,
          message_type: typeof payload.message_type === 'string' ? payload.message_type : 'TEXT',
          attachment_url: typeof payload.attachment_url === 'string' ? payload.attachment_url : null,
          status: 'SENT',
          created_at: '2026-06-27T10:00:00.000Z',
          read_at: null,
        };
        await fulfillJson(route, response, 201);
        return;
      }

      if (tableName === 'application_status_events') {
        const response = fixtures.onApplicationStatusEventInsert?.(payload) || {
          id: 'e2e-status-event-001',
          ...payload,
          created_at: '2026-06-27T10:00:00.000Z',
        };
        await fulfillJson(route, response, 201);
        return;
      }

      if (tableName === 'application_drafts') {
        await fulfillJson(route, {
          id: 'e2e-application-draft-001',
          updated_at: '2026-06-27T10:00:00.000Z',
          ...payload,
        }, 201);
        return;
      }

      if (tableName === 'application_draft_versions') {
        await fulfillJson(route, {
          id: typeof payload.id === 'string' ? payload.id : 'e2e-application-draft-version-001',
          created_at: '2026-06-27T10:00:00.000Z',
          updated_at: '2026-06-27T10:00:00.000Z',
          ...payload,
        }, 201);
        return;
      }

      if (tableName === 'notifications') {
        await fulfillJson(route, payload, 200);
        return;
      }

      if (tableName === 'product_analytics_events') {
        const response = fixtures.onProductAnalyticsInsert?.(payload) || {
          id: typeof payload.id === 'string' ? payload.id : 'e2e-product-analytics-event-001',
          occurred_at: typeof payload.occurred_at === 'string' ? payload.occurred_at : '2026-06-27T10:00:00.000Z',
          ...payload,
        };
        await fulfillJson(route, response, 201);
        return;
      }

      await fulfillJson(route, payload, 201);
    } catch (error) {
      await fulfillRestError(route, error);
    }
    return;
  }

  switch (tableName) {
    case 'challenges':
      await fulfillChallengeRows(route, url, fixtures.challenges || []);
      return;
    case 'challenge_submissions':
      await fulfillChallengeSubmissionRows(route, url, fixtures.challengeSubmissions || []);
      return;
    case 'companies':
      await fulfillCompanyRows(route, url, fixtures.companies || []);
      return;
    case 'skills':
      await fulfillRows(route, fixtures.skills || []);
      return;
    case 'experiences':
      await fulfillRows(route, fixtures.experiences || []);
      return;
    case 'educations':
      await fulfillRows(route, fixtures.educations || []);
      return;
    case 'enrollments':
      try {
        await fulfillEnrollmentRows(route, url, fixtures.enrollments || [], fixtures.onEnrollmentRows);
      } catch (error) {
        await fulfillRestError(route, error);
      }
      return;
    case 'jobs':
      await fulfillRows(route, fixtures.jobs || []);
      return;
    case 'lesson_progress':
      try {
        await fulfillLessonProgressRows(route, url, fixtures.lessonProgress || [], fixtures.onLessonProgressRows);
      } catch (error) {
        await fulfillRestError(route, error);
      }
      return;
    case 'notification_settings':
      await fulfillNotificationSettingsRows(route, url, fixtures.notificationSettings || []);
      return;
    case 'subscription_plans':
      try {
        await fulfillSubscriptionPlanRows(route, url, fixtures.subscriptionPlans || [], fixtures.onSubscriptionPlanRows);
      } catch (error) {
        await fulfillRestError(route, error);
      }
      return;
    case 'subscriptions':
      await fulfillSubscriptionRows(route, url, fixtures.subscriptions || []);
      return;
    case 'payments':
      await fulfillPaymentRows(route, url, fixtures.payments || []);
      return;
    case 'job_applications':
      await fulfillApplicationRows(route, url, fixtures.applications || []);
      return;
    case 'job_post_templates':
      await fulfillJobPostTemplateRows(route, url, fixtures.jobPostTemplates || []);
      return;
    case 'job_post_draft_versions':
      await fulfillJobPostDraftVersionRows(route, url, fixtures.jobPostDraftVersions || []);
      return;
    case 'user_profiles':
      if (fixtures.profile !== undefined) {
        await fulfillJson(route, fixtures.profile, 200, {
          'content-range': fixtures.profile ? '0-0/1' : '0-0/0',
        });
        return;
      }
      break;
    case 'resume_export_events':
      await fulfillResumeExportEventRows(route, url, fixtures.resumeExportEvents || []);
      return;
    case 'resume_artifacts':
      await fulfillResumeArtifactRows(route, url, fixtures.resumeArtifacts || []);
      return;
    case 'application_drafts':
      if (fixtures.applicationDraft !== undefined) {
        await fulfillJson(route, fixtures.applicationDraft, 200, {
          'content-range': fixtures.applicationDraft ? '0-0/1' : '0-0/0',
        });
        return;
      }
      break;
    case 'application_draft_versions':
      await fulfillRows(route, fixtures.applicationDraftHistory || []);
      return;
    case 'application_status_events':
      await fulfillRows(route, fixtures.applicationStatusEvents || []);
      return;
    case 'candidate_notes':
      await fulfillRows(route, fixtures.candidateNotes || []);
      return;
    case 'candidate_scorecards':
      await fulfillRows(route, fixtures.candidateScorecards || []);
      return;
    case 'connections':
      await fulfillConnectionRows(route, url, fixtures.connections || []);
      return;
    case 'conversation_participants':
      await fulfillRows(route, fixtures.conversationParticipants || []);
      return;
    case 'messages':
      await fulfillMessageRows(route, url, fixtures.messages || []);
      return;
    case 'notifications':
      await fulfillNotificationRows(route, url, fixtures.notifications || []);
      return;
    case 'networking_suggestion_preferences':
      await fulfillNetworkingSuggestionPreferenceRows(route, url, fixtures.networkingSuggestionPreferences || []);
      return;
    case 'profiles':
      await fulfillProfileRows(route, url, fixtures.profiles || []);
      return;
    case 'saved_job_searches':
      await fulfillSavedJobSearchRows(route, url, fixtures.savedJobSearches || []);
      return;
    case 'hidden_explore_jobs':
      await fulfillHiddenExploreJobRows(route, url, fixtures.hiddenExploreJobs || []);
      return;
    default:
      break;
  }

  await fulfillRows(route, []);
};

export const installE2EAuth = async (page: Page, roles: readonly string[] | null) => {
  await page.addInitScript(({ authKey, nextRoles }) => {
    const testWindow = window as Window & { __E2E_TESTING__?: boolean };
    testWindow.__E2E_TESTING__ = true;
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.localStorage.setItem('featureFlags', JSON.stringify({}));
    window.localStorage.setItem(authKey, JSON.stringify(
      nextRoles === null
        ? { authenticated: false }
        : {
          authenticated: true,
          id: `e2e-${nextRoles.join('-').toLowerCase() || 'user'}`,
          email: 'e2e@talentsphere.test',
          full_name: 'E2E User',
          roles: nextRoles,
        },
    ));
  }, { authKey: E2E_AUTH_OVERRIDE_KEY, nextRoles: roles ? [...roles] : null });
};

export const installNetworkStubs = async (page: Page, options: NetworkStubOptions = {}) => {
  await page.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (localHosts.has(url.hostname) && url.pathname === '/api/v1/files/upload' && request.method() === 'POST') {
      try {
        const response = options.api?.onFileUpload?.({
          contentType: request.headers()['content-type'],
          postData: request.postData() || undefined,
        }) || {
          data: {
            url: 'https://files.example/messages/e2e-upload.pdf',
          },
        };
        await fulfillJson(route, response, 200);
      } catch (error) {
        await fulfillRestError(route, error);
      }
      return;
    }

    if (localHosts.has(url.hostname) && url.pathname === '/api/v1/files' && request.method() === 'DELETE') {
      try {
        options.api?.onFileDelete?.({ url: url.searchParams.get('url') });
        await fulfillJson(route, { data: { ok: true } }, 200);
      } catch (error) {
        await fulfillRestError(route, error);
      }
      return;
    }

    if (localHosts.has(url.hostname) && url.pathname === '/api/v1/lms/courses' && request.method() === 'GET') {
      await fulfillJson(route, getLmsCoursesPayload(url, options.api?.lmsCourses || [], options.api?.lmsEnrollments || []), 200);
      return;
    }

    if (localHosts.has(url.hostname) && url.pathname.match(/^\/api\/v1\/lms\/enrollments\/[^/]+$/) && request.method() === 'GET') {
      await fulfillJson(route, getLmsEnrollmentsPayload(url, options.api?.lmsEnrollments || []), 200);
      return;
    }

    if (localHosts.has(url.hostname) && url.pathname.match(/^\/api\/v1\/lms\/courses\/[^/]+\/enroll$/) && request.method() === 'POST') {
      try {
        const match = url.pathname.match(/^\/api\/v1\/lms\/courses\/([^/]+)\/enroll$/);
        const courseId = match?.[1] ? decodeURIComponent(match[1]) : undefined;
        const userId = url.searchParams.get('userId') || undefined;
        const response = options.api?.onLmsEnroll?.({ courseId, userId }) || buildLmsEnrollmentResponse(courseId, userId);
        await fulfillJson(route, {
          data: response,
        }, 200);
      } catch (error) {
        await fulfillRestError(route, error);
      }
      return;
    }

    if (localHosts.has(url.hostname) && url.pathname.match(/^\/api\/v1\/lms\/courses\/[^/]+\/lessons\/[^/]+\/complete$/) && request.method() === 'POST') {
      try {
        const match = url.pathname.match(/^\/api\/v1\/lms\/courses\/([^/]+)\/lessons\/([^/]+)\/complete$/);
        options.api?.onLmsLessonComplete?.({
          courseId: match?.[1] ? decodeURIComponent(match[1]) : undefined,
          lessonId: match?.[2] ? decodeURIComponent(match[2]) : undefined,
          userId: url.searchParams.get('userId') || undefined,
        });
        await fulfillJson(route, {
          data: {
            ok: true,
          },
        }, 200);
      } catch (error) {
        await fulfillRestError(route, error);
      }
      return;
    }

    if (localHosts.has(url.hostname) && url.pathname.startsWith('/api/v1/networking/suggestions/') && request.method() === 'GET') {
      const userId = decodeURIComponent(url.pathname.split('/').pop() || '');
      const suggestions = options.api?.onNetworkingSuggestions?.({
        userId,
        limit: url.searchParams.get('limit'),
      }) || options.api?.networkingSuggestions || [];
      await fulfillJson(route, {
        data: suggestions,
        total: suggestions.length,
        hasNext: false,
        nextCursor: null,
      }, 200);
      return;
    }

    if (localHosts.has(url.hostname) && url.pathname.startsWith('/api/')) {
      await route.fulfill({
        status: 200,
        headers: {
          'access-control-allow-origin': '*',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          data: [],
          total: 0,
          hasNext: false,
          nextCursor: null,
        }),
      });
      return;
    }

    if (url.protocol === 'data:' || localHosts.has(url.hostname)) {
      await route.continue();
      return;
    }

    if (request.method() === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'GET,POST,PATCH,PUT,DELETE,OPTIONS',
          'access-control-allow-headers': '*',
        },
      });
      return;
    }

    if (url.pathname.includes('/rest/v1/')) {
      await fulfillRestFixture(route, url, options.rest);
      return;
    }

    if (url.pathname.includes('/functions/v1/')) {
      const functionName = decodeURIComponent(url.pathname.split('/').pop() || '');
      try {
        const payload = readJsonPayload(route);
        const response = options.api?.onSupabaseFunctionInvoke?.({ functionName, payload }) || buildSupabaseFunctionResponse(functionName, payload);
        await fulfillJson(route, response, 200);
      } catch (error) {
        await fulfillRestError(route, error);
      }
      return;
    }

    if (url.pathname.includes('/auth/v1/token')) {
      await route.fulfill({
        status: 400,
        headers: {
          'access-control-allow-origin': '*',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          error: 'invalid_grant',
          error_description: 'Invalid login credentials',
          msg: 'Invalid login credentials',
        }),
      });
      return;
    }

    if (url.pathname.includes('/auth/v1/')) {
      await route.fulfill({
        status: 200,
        headers: {
          'access-control-allow-origin': '*',
          'content-type': 'application/json',
        },
        body: '{}',
      });
      return;
    }

    await route.fulfill({
      status: 204,
      headers: { 'access-control-allow-origin': '*' },
    });
  });
};
