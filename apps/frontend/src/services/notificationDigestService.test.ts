import { beforeEach, describe, expect, it, vi } from 'vitest';
import { typedSupabase } from '../lib/supabaseClient';
import {
  buildSavedSearchDigestDeliveryKey,
  buildSavedSearchDigestDeliverAfter,
  buildSavedSearchDigestItem,
  notificationDigestService,
} from './notificationDigestService';

vi.mock('../lib/supabaseClient', () => {
  const client = {
    from: vi.fn(),
  };

  return {
    supabase: client,
    typedSupabase: client,
  };
});

describe('notificationDigestService', () => {
  let queryBuilder: any;

  beforeEach(() => {
    vi.clearAllMocks();
    queryBuilder = {
      upsert: vi.fn().mockResolvedValue({ error: null }),
    };
    (typedSupabase.from as any).mockReturnValue(queryBuilder);
  });

  it('builds stable delivery keys from user, saved search, digest, and match counts', () => {
    expect(buildSavedSearchDigestDeliveryKey({
      userId: ' user-1 ',
      savedSearchId: ' search-1 ',
      digestFrequency: 'daily',
      previousMatchCount: 2,
      currentMatchCount: 5,
    })).toBe('saved_search:user-1:search-1:daily:2:5');
  });

  it('computes daily and weekly delivery windows', () => {
    const now = new Date('2026-06-26T10:00:00.000Z');

    expect(buildSavedSearchDigestDeliverAfter('daily', now)).toBe('2026-06-27T10:00:00.000Z');
    expect(buildSavedSearchDigestDeliverAfter('weekly', now)).toBe('2026-07-03T10:00:00.000Z');
  });

  it('builds a saved-search digest item with visible metadata', () => {
    const item = buildSavedSearchDigestItem('user-1', {
      savedSearchId: 'search-1',
      savedSearchName: 'Remote frontend roles',
      digestFrequency: 'daily',
      newMatchCount: 3,
      currentMatchCount: 8,
      previousMatchCount: 5,
      queuedAt: '2026-06-26T10:00:00.000Z',
    });

    expect(item).toMatchObject({
      userId: 'user-1',
      sourceType: 'saved_search',
      sourceId: 'search-1',
      deliveryKey: 'saved_search:user-1:search-1:daily:5:8',
      digestFrequency: 'daily',
      title: 'Saved search: Remote frontend roles',
      message: '3 new matches for "Remote frontend roles".',
      actionUrl: '/jobs',
      deliverAfter: '2026-06-27T10:00:00.000Z',
      metadata: {
        kind: 'saved_search_digest_item',
        savedSearchId: 'search-1',
        savedSearchName: 'Remote frontend roles',
        digestFrequency: 'daily',
        newMatchCount: 3,
        currentMatchCount: 8,
        previousMatchCount: 5,
      },
    });
  });

  it('rejects immediate or off frequencies for digest queue items', () => {
    expect(() => buildSavedSearchDigestItem('user-1', {
      savedSearchId: 'search-1',
      savedSearchName: 'Remote frontend roles',
      digestFrequency: 'immediate',
      newMatchCount: 1,
      currentMatchCount: 3,
      previousMatchCount: 2,
    })).toThrow('daily or weekly');
  });

  it('upserts pending digest items to Supabase', async () => {
    const item = await notificationDigestService.queueSavedSearchDigestItem('user-1', {
      savedSearchId: 'search-1',
      savedSearchName: 'Remote frontend roles',
      digestFrequency: 'weekly',
      newMatchCount: 2,
      currentMatchCount: 7,
      previousMatchCount: 5,
      queuedAt: '2026-06-26T10:00:00.000Z',
    });

    expect(typedSupabase.from).toHaveBeenCalledWith('notification_digest_items');
    expect(queryBuilder.upsert).toHaveBeenCalledWith(expect.objectContaining({
      user_id: 'user-1',
      source_type: 'saved_search',
      source_id: 'search-1',
      delivery_key: 'saved_search:user-1:search-1:weekly:5:7',
      digest_frequency: 'weekly',
      status: 'pending',
      action_url: '/jobs',
    }), {
      onConflict: 'delivery_key',
    });
    expect(item.digestFrequency).toBe('weekly');
  });
});
