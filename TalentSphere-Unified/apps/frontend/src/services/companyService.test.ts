import { beforeEach, describe, expect, it, vi } from 'vitest';
import { companyService } from './companyService';
import { supabase } from '../lib/supabaseClient';

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('companyService', () => {
  let single: ReturnType<typeof vi.fn>;
  let select: ReturnType<typeof vi.fn>;
  let insert: ReturnType<typeof vi.fn>;
  let update: ReturnType<typeof vi.fn>;
  let eq: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    single = vi.fn().mockResolvedValue({
      data: {
        id: 'company-1',
        name: 'Acme Labs',
        industry: 'Software',
        location: 'New York',
        website: 'https://acme.test',
        owner_user_id: 'user-1',
        employee_count: null,
        verified: false,
      },
      error: null,
    });
    select = vi.fn().mockReturnValue({ single });
    insert = vi.fn().mockReturnValue({ select });
    eq = vi.fn().mockReturnValue({ select });
    update = vi.fn().mockReturnValue({ eq });

    (supabase.from as any).mockReturnValue({ insert, update });
  });

  it('registers a recruiter-owned company profile', async () => {
    const company = await companyService.registerCompany({
      name: 'Acme Labs',
      industry: 'Software',
      location: 'New York',
      website: 'https://acme.test',
      ownerUserId: 'user-1',
    });

    expect(supabase.from).toHaveBeenCalledWith('companies');
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Acme Labs',
      industry: 'Software',
      location: 'New York',
      website: 'https://acme.test',
      owner_user_id: 'user-1',
      verified: false,
    }));
    expect(company).toMatchObject({
      id: 'company-1',
      name: 'Acme Labs',
      ownerUserId: 'user-1',
      verified: false,
    });
  });

  it('updates recruiter company profile details', async () => {
    const company = await companyService.updateCompany('company-1', {
      name: 'Acme Labs',
      description: 'Developer tools for hiring teams.',
      industry: 'Software',
      location: 'Remote',
      website: 'https://acme.test',
      employeeCount: 42,
    });

    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Acme Labs',
      description: 'Developer tools for hiring teams.',
      industry: 'Software',
      location: 'Remote',
      website: 'https://acme.test',
      employee_count: 42,
      updated_at: expect.any(String),
    }));
    expect(eq).toHaveBeenCalledWith('id', 'company-1');
    expect(company).toMatchObject({
      id: 'company-1',
      name: 'Acme Labs',
      ownerUserId: 'user-1',
    });
  });
});
