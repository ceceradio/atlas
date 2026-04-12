import { useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch } from '@/store'
import { selectString, setString } from '@/store/stringsSlice'

/**
 * Drop-in replacement for useState<string> backed by Redux.
 * Values are shared across all components using the same key.
 *
 * Usage:
 *   const [from, setFrom] = useReduxString('chore-date-from')
 *   const [to, setTo] = useReduxString('chore-date-to', '2025-01-01')
 */
export function useReduxString(key: string, defaultValue = ''): [string, (value: string) => void] {
  const dispatch = useDispatch<AppDispatch>()
  const value = useSelector(selectString(key, defaultValue))
  const setValue = useCallback(
    (v: string) => dispatch(setString({ key, value: v })),
    [key, dispatch],
  )
  return [value, setValue]
}
