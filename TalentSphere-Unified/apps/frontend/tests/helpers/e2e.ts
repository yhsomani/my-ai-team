import type { Page, Route } from '@playwright/test';

export const E2E_AUTH_OVERRIDE_KEY = 'talentsphere.e2e.auth';

const localHosts = new Set(['localhost', '127.0.0.1', '::1']);

type JsonRecord = Record<string, unknown>;

export type RestStubFixtures = {
  jobs?: JsonRecord[];
  profile?: JsonRecord | null;
  applications?: JsonRecord[];
  applicationDraft?: JsonRecord | null;
  applicationDraftHistory?: JsonRecord[];
  applicationStatusEvents?: JsonRecord[];
  candidateNotes?: JsonRecord[];
  candidateScorecards?: JsonRecord[];
  conversationParticipants?: JsonRecord[];
  messages?: JsonRecord[];
  notifications?: JsonRecord[];
  profiles?: JsonRecord[];
  onApplicationInsert?: (payload: JsonRecord) => JsonRecord;
  onApplicationUpdate?: (payload: JsonRecord, context: { id?: string }) => JsonRecord;
  onCandidateNoteUpsert?: (payload: JsonRecord) => JsonRecord;
  onCandidateScorecardUpsert?: (payload: JsonRecord) => JsonRecord;
  onApplicationStatusEventInsert?: (payload: JsonRecord) => JsonRecord;
  onJobUpdate?: (payload: JsonRecord, context: { id?: string }) => JsonRecord;
  onMessageInsert?: (payload: JsonRecord) => JsonRecord;
  onMessageUpdate?: (payload: JsonRecord, context: { id?: string; conversationId?: string }) => JsonRecord;
};

type NetworkStubOptions = {
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

const getRestTableName = (url: URL) => {
  const match = url.pathname.match(/\/rest\/v1\/([^/?]+)/);
  return match?.[1] || null;
};

const getEqFilterValue = (url: URL, key: string) => {
  const rawValue = url.searchParams.get(key);
  return rawValue?.startsWith('eq.') ? rawValue.slice(3) : undefined;
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
    await route.fulfill({
      status: 204,
      headers: { 'access-control-allow-origin': '*' },
    });
    return;
  }

  if (method === 'POST' || method === 'PATCH' || method === 'PUT') {
    if (tableName === 'jobs') {
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
      await fulfillJson(route, {
        id: typeof payload.id === 'string' ? payload.id : 'e2e-product-analytics-event-001',
        occurred_at: typeof payload.occurred_at === 'string' ? payload.occurred_at : '2026-06-27T10:00:00.000Z',
        ...payload,
      }, 201);
      return;
    }

    await fulfillJson(route, payload, 201);
    return;
  }

  switch (tableName) {
    case 'jobs':
      await fulfillRows(route, fixtures.jobs || []);
      return;
    case 'job_applications':
      await fulfillApplicationRows(route, url, fixtures.applications || []);
      return;
    case 'user_profiles':
      if (fixtures.profile !== undefined) {
        await fulfillJson(route, fixtures.profile, 200, {
          'content-range': fixtures.profile ? '0-0/1' : '0-0/0',
        });
        return;
      }
      break;
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
    case 'conversation_participants':
      await fulfillRows(route, fixtures.conversationParticipants || []);
      return;
    case 'messages':
      await fulfillMessageRows(route, url, fixtures.messages || []);
      return;
    case 'notifications':
      await fulfillNotificationRows(route, url, fixtures.notifications || []);
      return;
    case 'profiles':
      await fulfillProfileRows(route, url, fixtures.profiles || []);
      return;
    case 'saved_job_searches':
    case 'hidden_explore_jobs':
      await fulfillRows(route, []);
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
