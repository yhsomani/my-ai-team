export interface CompanyProfileCompletionCandidate {
  name?: string | null;
  industry?: string | null;
  location?: string | null;
  website?: string | null;
  description?: string | null;
  employeeCount?: number | string | null;
}

export interface CompanyProfileCompletionResult {
  completedFields: number;
  totalFields: number;
  percent: number;
  missingFields: string[];
  isComplete: boolean;
}

const compact = (value?: string | null) => (value || '').trim();

const hasEmployeeCount = (value: CompanyProfileCompletionCandidate['employeeCount']) => {
  if (typeof value === 'number') return Number.isFinite(value) && value > 0;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0;
  }
  return false;
};

const companyProfileFields: Array<{
  label: string;
  isComplete: (company: CompanyProfileCompletionCandidate) => boolean;
}> = [
  { label: 'company name', isComplete: company => Boolean(compact(company.name)) },
  { label: 'industry', isComplete: company => Boolean(compact(company.industry)) },
  { label: 'location', isComplete: company => Boolean(compact(company.location)) },
  { label: 'website', isComplete: company => Boolean(compact(company.website)) },
  { label: 'description', isComplete: company => Boolean(compact(company.description)) },
  { label: 'employee count', isComplete: company => hasEmployeeCount(company.employeeCount) },
];

export const getCompanyProfileCompletion = (
  company: CompanyProfileCompletionCandidate | null | undefined
): CompanyProfileCompletionResult => {
  const candidate = company || {};
  const missingFields = companyProfileFields
    .filter(field => !field.isComplete(candidate))
    .map(field => field.label);
  const totalFields = companyProfileFields.length;
  const completedFields = totalFields - missingFields.length;

  return {
    completedFields,
    totalFields,
    percent: Math.round((completedFields / totalFields) * 100),
    missingFields,
    isComplete: missingFields.length === 0,
  };
};
