import { createSlice, createAsyncThunk, createEntityAdapter } from '@reduxjs/toolkit';
import { lmsService } from '../../services/lmsService';
import { Course } from '../../types/lms';
import { RootState } from '../index';

const lmsAdapter = createEntityAdapter<Course>();

export const fetchCourses = createAsyncThunk(
  'lms/fetchCourses',
  async (userRole?: string) => {
    return await lmsService.getCourses({ userRole });
  }
);

const lmsSlice = createSlice({
  name: 'lms',
  initialState: lmsAdapter.getInitialState({
    status: 'idle',
    error: null as string | null,
  }),
  reducers: {
    clearLmsError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCourses.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchCourses.fulfilled, (state, action) => {
        state.status = 'succeeded';
        lmsAdapter.setAll(state, action.payload);
      })
      .addCase(fetchCourses.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to fetch courses';
      });
  },
});

export const {
  clearLmsError,
} = lmsSlice.actions;

export const {
  selectAll: selectAllCourses,
  selectById: selectCourseById,
} = lmsAdapter.getSelectors((state: RootState) => state.lms);

export default lmsSlice.reducer;
