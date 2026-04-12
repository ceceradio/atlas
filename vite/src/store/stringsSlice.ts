import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { RootState } from '.'

type StringsState = Record<string, string>

const stringsSlice = createSlice({
  name: 'strings',
  initialState: {} as StringsState,
  reducers: {
    setString(state, action: PayloadAction<{ key: string; value: string }>) {
      state[action.payload.key] = action.payload.value
    },
  },
})

export const { setString } = stringsSlice.actions
export default stringsSlice.reducer

export const selectString = (key: string, defaultValue = '') =>
  (state: RootState): string =>
    state.strings[key] ?? defaultValue
