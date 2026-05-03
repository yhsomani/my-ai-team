import { apiClient } from '../api/axios';

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
    const response = await apiClient.get<any, { data: Company[] }>('/api/v1/companies');
    return response.data;
  },

  getCompanyById: async (id: string): Promise<Company> => {
    const response = await apiClient.get<any, { data: Company }>(`/api/v1/companies/${id}`);
    return response.data;
  },

  getCompanyByUser: async (userId: string): Promise<Company> => {
    const response = await apiClient.get<any, { data: Company }>(`/api/v1/companies/user/${userId}`);
    return response.data;
  },

  registerCompany: async (company: Partial<Company>): Promise<Company> => {
    const response = await apiClient.post<any, { data: Company }>('/api/v1/companies', company);
    return response.data;
  },

  updateCompany: async (id: string, company: Partial<Company>): Promise<Company> => {
    const response = await apiClient.put<any, { data: Company }>(`/api/v1/companies/${id}`, company);
    return response.data;
  },

  verifyCompany: async (id: string): Promise<Company> => {
    const response = await apiClient.post<any, { data: Company }>(`/api/v1/companies/${id}/verify`);
    return response.data;
  },

  searchCompanies: async (keyword: string): Promise<Company[]> => {
    const response = await apiClient.get<any, { data: Company[] }>(`/api/v1/companies/search?q=${encodeURIComponent(keyword)}`);
    return response.data;
  }
};
