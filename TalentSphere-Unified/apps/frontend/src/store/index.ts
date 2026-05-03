import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import jobReducer from './slices/jobSlice';
import lmsReducer from './slices/lmsSlice';
import challengeReducer from './slices/challengeSlice';
import aiReducer from './slices/aiSlice';
import networkingReducer from './slices/networkingSlice';
import messagingReducer from './slices/messagingSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    jobs: jobReducer,
    lms: lmsReducer,
    challenges: challengeReducer,
    ai: aiReducer,
    networking: networkingReducer,
    messaging: messagingReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
