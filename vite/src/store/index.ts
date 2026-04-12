import { configureStore } from '@reduxjs/toolkit'
import authReducer from './authSlice'
import stringsReducer from './stringsSlice'
import jobsReducer from './jobsSlice'
import { atlasApi } from './atlasApi'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    strings: stringsReducer,
    jobs: jobsReducer,
    [atlasApi.reducerPath]: atlasApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(atlasApi.middleware),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
