import { createSlice, createAsyncThunk, createEntityAdapter } from '@reduxjs/toolkit';
import { jobService } from '../../services/jobService';
import { Job } from '../../types/job';
import { RootState } from '../index';

const jobsAdapter = createEntityAdapter<Job>({
  sortComparer: (a, b) => (b.postedAt || '').localeCompare(a.postedAt || ''),
});

export const fetchJobs = createAsyncThunk(
  'jobs/fetchJobs',
  async (filters: any = {}) => {
    const response = await jobService.getJobs(filters);
    return response;
  }
);

const jobSlice = createSlice({
  name: 'jobs',
  initialState: jobsAdapter.getInitialState({
    status: 'idle',
    error: null as string | null,
  }),
  reducers: {
    jobAdded: jobsAdapter.addOne,
    jobUpdated: jobsAdapter.updateOne,
    jobRemoved: jobsAdapter.removeOne,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchJobs.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchJobs.fulfilled, (state, action) => {
        state.status = 'succeeded';
        jobsAdapter.setAll(state, action.payload);
      })
      .addCase(fetchJobs.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to fetch jobs';
      });
  },
});

export const { jobAdded, jobUpdated, jobRemoved } = jobSlice.actions;

export const {
  selectAll: selectAllJobs,
  selectById: selectJobById,
  selectIds: selectJobIds,
} = jobsAdapter.getSelectors((state: RootState) => state.jobs);

export default jobSlice.reducer;
