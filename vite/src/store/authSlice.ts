import { createSlice, PayloadAction } from '@reduxjs/toolkit'

type AuthState = { token: string }

const initialState: AuthState = { token: '' }

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setToken(state, action: PayloadAction<string>) {
      state.token = action.payload
    },
    clearToken(state) {
      state.token = ''
    },
  },
})

export const { setToken, clearToken } = authSlice.actions
export const selectToken = (state: { auth: AuthState }) => state.auth.token
export default authSlice.reducer
