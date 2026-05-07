import { supabase } from '../lib/supabaseClient';

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

export const companyService = {
  getCompanies: async (): Promise<Company[]> => {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) throw error;
    
    return data.map(c => ({
      id: c.id,
      name: c.name,
      description: c.description,
      website: c.website,
      location: c.location,
      logoUrl: c.logo_url,
      industry: c.industry,
      employeeCount: c.employee_count,
      ownerUserId: c.owner_user_id,
      verified: c.verified,
      verifiedAt: c.verified_at,
      createdAt: c.created_at
    }));
  },

  getCompanyById: async (id: string): Promise<Company> => {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      website: data.website,
      location: data.location,
      logoUrl: data.logo_url,
      industry: data.industry,
      employeeCount: data.employee_count,
      ownerUserId: data.owner_user_id,
      verified: data.verified,
      verifiedAt: data.verified_at,
      createdAt: data.created_at
    };
  },

  getCompanyByUser: async (userId: string): Promise<Company> => {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('owner_user_id', userId)
      .single();
    
    if (error) throw error;
    
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      website: data.website,
      location: data.location,
      logoUrl: data.logo_url,
      industry: data.industry,
      employeeCount: data.employee_count,
      ownerUserId: data.owner_user_id,
      verified: data.verified,
      verifiedAt: data.verified_at,
      createdAt: data.created_at
    };
  },

  registerCompany: async (company: Partial<Company>): Promise<Company> => {
    const { data, error } = await supabase
      .from('companies')
      .insert({
        name: company.name,
        description: company.description,
        website: company.website,
        location: company.location,
        logo_url: company.logoUrl,
        industry: company.industry,
        employee_count: company.employeeCount,
        owner_user_id: company.ownerUserId,
        verified: false
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      website: data.website,
      location: data.location,
      logoUrl: data.logo_url,
      industry: data.industry,
      employeeCount: data.employee_count,
      ownerUserId: data.owner_user_id,
      verified: data.verified,
      verifiedAt: data.verified_at,
      createdAt: data.created_at
    };
  },

  updateCompany: async (id: string, company: Partial<Company>): Promise<Company> => {
    const updateData: any = {};
    if (company.name) updateData.name = company.name;
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
    
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      website: data.website,
      location: data.location,
      logoUrl: data.logo_url,
      industry: data.industry,
      employeeCount: data.employee_count,
      ownerUserId: data.owner_user_id,
      verified: data.verified,
      verifiedAt: data.verified_at,
      createdAt: data.created_at
    };
  },

  verifyCompany: async (id: string): Promise<Company> => {
    const { data, error } = await supabase
      .from('companies')
      .update({ 
        verified: true, 
        verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      website: data.website,
      location: data.location,
      logoUrl: data.logo_url,
      industry: data.industry,
      employeeCount: data.employee_count,
      ownerUserId: data.owner_user_id,
      verified: data.verified,
      verifiedAt: data.verified_at,
      createdAt: data.created_at
    };
  },

  searchCompanies: async (keyword: string): Promise<Company[]> => {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .or(`name.ilike.%${keyword}%,description.ilike.%${keyword}%,industry.ilike.%${keyword}%`)
      .order('name', { ascending: true });
    
    if (error) throw error;
    
    return data.map(c => ({
      id: c.id,
      name: c.name,
      description: c.description,
      website: c.website,
      location: c.location,
      logoUrl: c.logo_url,
      industry: c.industry,
      employeeCount: c.employee_count,
      ownerUserId: c.owner_user_id,
      verified: c.verified,
      verifiedAt: c.verified_at,
      createdAt: c.created_at
    }));
  }
};
