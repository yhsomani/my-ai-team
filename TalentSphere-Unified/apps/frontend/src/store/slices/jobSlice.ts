import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';
import { jobService } from '../../services/jobService';
import { Job } from '../../types/job';

export const jobApi = createApi({
  reducerPath: 'jobs',
  baseQuery: fakeBaseQuery(),
  endpoints: (builder) => ({
    getJobs: builder.query<Job[], any>({
      queryFn: async (filters) => {
        try {
          const jobs = await jobService.getJobs(filters);
          return { data: jobs };
        } catch (error: any) {
          return { error: error.message };
        }
      }
    }),
  }),
});

export const { useGetJobsQuery } = jobApi;
export default jobApi.reducer;
