import { useEffect } from 'react'
import { useReduxString } from './useReduxString'

/**
 * Shared date range for all chore pages. Defaults to the past 30 days on
 * first use. Returns [from, setFrom, to, setTo].
 */
export function useChoreDateRange(): [string, (v: string) => void, string, (v: string) => void] {
  const [from, setFrom] = useReduxString('chore-date-from')
  const [to, setTo] = useReduxString('chore-date-to')

  useEffect(() => {
    if (!from) {
      const d = new Date()
      d.setDate(d.getDate() - 30)
      setFrom(d.toISOString().slice(0, 10))
    }
    if (!to) {
      setTo(new Date().toISOString().slice(0, 10))
    }
  }, [])

  const setFromSafe = (v: string) => {
    setFrom(v)
    if (to && v >= to) setTo(v)
  }

  return [from, setFromSafe, to, setTo]
}
