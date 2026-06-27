import { typedSupabase as supabase, type Database } from '../lib/supabaseClient';

type CompanyRow = Database['public']['Tables']['companies']['Row'];
type CompanyInsert = Database['public']['Tables']['companies']['Insert'];
type CompanyUpdate = Database['public']['Tables']['companies']['Update'];

export interface Company {
  id: string;
  name: string;
  description?: string;
  website?: string;
  location?: string;
  logoUrl?: string;
  industry?: string;
  employeeCount: number;
  ownerUserId?: string;
  verified: boolean;
  verifiedAt?: string;
  createdAt?: string;
}

const mapCompanyData = (data: CompanyRow): Company => ({
  id: data.id,
  name: data.name,
  description: data.description || undefined,
  website: data.website || undefined,
  location: data.location || undefined,
  logoUrl: data.logo_url || undefined,
  industry: data.industry || undefined,
  employeeCount: data.employee_count || 0,
  ownerUserId: data.owner_user_id || undefined,
  verified: Boolean(data.verified),
  verifiedAt: data.verified_at || undefined,
  createdAt: data.created_at || undefined
});

const isCompanyRow = (data: unknown): data is CompanyRow => {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;

  const candidate = data as Partial<CompanyRow>;
  return typeof candidate.id === 'string' && typeof candidate.name === 'string';
};

const mapRequiredCompanyData = (data: unknown): Company => {
  if (!isCompanyRow(data)) {
    throw new Error('Company profile was not found.');
  }

  return mapCompanyData(data);
};

export const companyService = {
  getCompanies: async (): Promise<Company[]> => {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) throw error;
    
    return (Array.isArray(data) ? data : []).filter(isCompanyRow).map(mapCompanyData);
  },

  getCompanyById: async (id: string): Promise<Company> => {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    
    return mapRequiredCompanyData(data);
  },

  getCompanyByUser: async (userId: string): Promise<Company> => {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('owner_user_id', userId)
      .single();
    
    if (error) throw error;
    
    return mapRequiredCompanyData(data);
  },

  registerCompany: async (company: Partial<Company>): Promise<Company> => {
    const name = company.name?.trim();
    if (!name) {
      throw new Error('Company name is required.');
    }

    const payload: CompanyInsert = {
      name,
      description: company.description,
      website: company.website,
      location: company.location,
      logo_url: company.logoUrl,
      industry: company.industry,
      employee_count: company.employeeCount,
      owner_user_id: company.ownerUserId,
      verified: false
    };

    const { data, error } = await supabase
      .from('companies')
      .insert(payload)
      .select()
      .single();
    
    if (error) throw error;
    
    return mapRequiredCompanyData(data);
  },

  updateCompany: async (id: string, company: Partial<Company>): Promise<Company> => {
    const updateData: CompanyUpdate = {};
    if (company.name) updateData.name = company.name.trim();
    if (company.description !== undefined) updateData.description = company.description;
    if (company.website !== undefined) updateData.website = company.website;
    if (company.location !== undefined) updateData.location = company.location;
    if (company.logoUrl !== undefined) updateData.logo_url = company.logoUrl;
    if (company.industry !== undefined) updateData.industry = company.industry;
    if (company.employeeCount !== undefined) updateData.employee_count = company.employeeCount;
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('companies')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    return mapRequiredCompanyData(data);
  },

  verifyCompany: async (id: string): Promise<Company> => {
    const payload: CompanyUpdate = {
      verified: true,
      verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('companies')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    return mapRequiredCompanyData(data);
  },

  searchCompanies: async (keyword: string): Promise<Company[]> => {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .or(`name.ilike.%${keyword}%,description.ilike.%${keyword}%,industry.ilike.%${keyword}%`)
      .order('name', { ascending: true });
    
    if (error) throw error;
    
    return (Array.isArray(data) ? data : []).filter(isCompanyRow).map(mapCompanyData);
  }
};
