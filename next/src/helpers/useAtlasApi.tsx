'use client'
import { useAuth0 } from '@auth0/auth0-react'
import { useCallback, useEffect, useState } from 'react'

export default function useAtlasApi() {
  const { getAccessTokenSilently, logout } = useAuth0()
  const [token, setToken] = useState<string | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const reset = useCallback(() => {
    setError(null)
    setToken(null)
    logout()
  }, [logout])
  useEffect(() => {
    if (!token && !error)
      getAccessTokenSilently().then(setToken).catch(setError)
  }, [setToken, setError, getAccessTokenSilently, token, error])
  useEffect(() => {
    if (error) setToken(null)
  }, [error])
  return { token, error, reset, getAccessTokenSilently }
}
