import { createSlice, createAsyncThunk, createEntityAdapter } from '@reduxjs/toolkit';
import { challengeService } from '../../services/challengeService';
import { Challenge } from '../../types/challenges';
import { RootState } from '../index';

const challengesAdapter = createEntityAdapter<Challenge>();

export const fetchChallenges = createAsyncThunk(
  'challenges/fetchChallenges',
  async (isActive?: boolean) => {
    return await challengeService.getChallenges(isActive);
  }
);

const challengeSlice = createSlice({
  name: 'challenges',
  initialState: challengesAdapter.getInitialState({
    status: 'idle',
    error: null as string | null,
  }),
  reducers: {
    clearChallengeError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchChallenges.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchChallenges.fulfilled, (state, action) => {
        state.status = 'succeeded';
        challengesAdapter.setAll(state, action.payload);
      })
      .addCase(fetchChallenges.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to fetch challenges';
      });
  },
});

export const {
  clearChallengeError,
} = challengeSlice.actions;

export const {
  selectAll: selectAllChallenges,
  selectById: selectChallengeById,
} = challengesAdapter.getSelectors((state: RootState) => state.challenges);

export default challengeSlice.reducer;
