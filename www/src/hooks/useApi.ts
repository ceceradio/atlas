// use-api.js
import { useEffect, useState } from 'react'
import { useAuth0 } from '@auth0/auth0-react'

interface OptionsType extends RequestInit {
  audience?: string
  scope?: string
}

export const useApi = (url: string, options: OptionsType = {}) => {
  const { getAccessTokenSilently } = useAuth0()
  const [state, setState] = useState({
    error: <any>null,
    loading: true,
    data: <any>null
  })
  const [refreshIndex, setRefreshIndex] = useState(0)

  useEffect(() => {
    (async () => {
      try {
        const { audience, scope, ...fetchOptions } = options
        const accessToken = await getAccessTokenSilently({ audience, scope })
        const res = await fetch(url, {
          ...fetchOptions,
          headers: {
            ...fetchOptions.headers,
            // Add the Authorization header to the existing headers
            Authorization: 'Bearer ' + accessToken
          }
        })
        setState({
          ...state,
          data: await res.json(),
          error: null,
          loading: false
        })
      } catch (error) {
        setState({
          ...state,
          error: error,
          loading: false
        })
      }
    })()
  }, [refreshIndex])

  return {
    ...state,
    refresh: () => setRefreshIndex(refreshIndex + 1)
  }
}
