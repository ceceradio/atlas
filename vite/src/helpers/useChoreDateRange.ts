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
      d.setDate(d.getDate() - 13)
      setFrom(d.toLocaleDateString('en-CA', { timeZone: 'America/New_York' }))
    }
    if (!to) {
      setTo(new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' }))
    }
  }, [])

  const setFromSafe = (v: string) => {
    setFrom(v)
    if (to && v >= to) setTo(v)
  }

  return [from, setFromSafe, to, setTo]
}
