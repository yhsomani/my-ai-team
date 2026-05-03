import { createSlice, createAsyncThunk, createEntityAdapter } from '@reduxjs/toolkit';
import { networkingService } from '../../services/networkingService';
import { PublicProfile } from '../../types/networking';
import { RootState } from '../index';

const networkingAdapter = createEntityAdapter<PublicProfile>();

export const fetchSuggestions = createAsyncThunk(
  'networking/fetchSuggestions',
  async () => {
    return await networkingService.getSuggestions();
  }
);

const networkingSlice = createSlice({
  name: 'networking',
  initialState: networkingAdapter.getInitialState({
    status: 'idle',
    error: null as string | null,
  }),
  reducers: {
    profileUpdated: networkingAdapter.updateOne,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSuggestions.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchSuggestions.fulfilled, (state, action) => {
        state.status = 'succeeded';
        networkingAdapter.setAll(state, action.payload);
      })
      .addCase(fetchSuggestions.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to fetch suggestions';
      });
  },
});

export const { profileUpdated } = networkingSlice.actions;

export const {
  selectAll: selectAllProfiles,
  selectById: selectProfileById,
} = networkingAdapter.getSelectors((state: RootState) => state.networking);

export default networkingSlice.reducer;
