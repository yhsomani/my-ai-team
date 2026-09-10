import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';
import { jobService } from '../../services/jobService';
import type { JobQueryParams, PaginatedJobsResult } from '../../services/jobService';
import { Job } from '../../types/job';

export const jobApi = createApi({
  reducerPath: 'jobs',
  baseQuery: fakeBaseQuery(),
  endpoints: (builder) => ({
    getJobs: builder.query<Job[], JobQueryParams | undefined>({
      queryFn: async (filters) => {
        try {
          const jobs = await jobService.getJobs(filters);
          return { data: jobs };
        } catch (error: any) {
          return { error: error.message };
        }
      }
    }),
    getJobsPage: builder.query<PaginatedJobsResult, JobQueryParams | undefined>({
      queryFn: async (filters) => {
        try {
          const result = await jobService.getJobsPage(filters);
          return { data: result };
        } catch (error: any) {
          return { error: error.message };
        }
      }
    }),
  }),
});

export const { useGetJobsQuery, useGetJobsPageQuery } = jobApi;
export default jobApi.reducer;
