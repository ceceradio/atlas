import { useAuth0 } from '@auth0/auth0-react'
import { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { setToken, clearToken } from '@/store/authSlice'

export function AccessTokenManager() {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0()
  const dispatch = useDispatch()

  useEffect(() => {
    if (!isAuthenticated) {
      dispatch(clearToken())
      return
    }
    getAccessTokenSilently()
      .then((token) => dispatch(setToken(token)))
      .catch(() => dispatch(clearToken()))
  }, [isAuthenticated, getAccessTokenSilently, dispatch])

  return null
}
