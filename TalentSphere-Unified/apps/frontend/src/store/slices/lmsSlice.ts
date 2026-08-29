import { createSlice, createAsyncThunk, createEntityAdapter } from '@reduxjs/toolkit';
import { lmsService, type CourseQueryParams } from '../../services/lmsService';
import type { Course } from '../../types/lms';
import type { RootState } from '../index';

const lmsAdapter = createEntityAdapter<Course>();
const defaultCoursePageSize = 12;

export const fetchCourses = createAsyncThunk(
  'lms/fetchCourses',
  async (params?: CourseQueryParams) => {
    return await lmsService.getCoursesPage({
      ...params,
      limit: params?.limit ?? defaultCoursePageSize,
      offset: params?.offset ?? 0
    });
  }
);

const lmsSlice = createSlice({
  name: 'lms',
  initialState: lmsAdapter.getInitialState({
    status: 'idle',
    error: null as string | null,
    courseTotal: null as number | null,
    coursePageSize: defaultCoursePageSize,
    courseOffset: 0,
    hasNextCoursePage: false,
    courseNextCursor: null as string | null,
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
        lmsAdapter.setAll(state, action.payload.courses);
        state.courseTotal = action.payload.total;
        state.coursePageSize = action.payload.limit ?? defaultCoursePageSize;
        state.courseOffset = action.payload.offset;
        state.hasNextCoursePage = action.payload.hasNext;
        state.courseNextCursor = action.payload.nextCursor;
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
