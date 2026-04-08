import { configureStore } from '@reduxjs/toolkit'
import authReducer from './authSlice'
import { atlasApi } from './atlasApi'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    [atlasApi.reducerPath]: atlasApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(atlasApi.middleware),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
