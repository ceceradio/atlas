import { useAuth0 } from '@auth0/auth0-react'
import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react'

export default function Login() {
  const navigate = useNavigate()
  const {
    isLoading,
    isAuthenticated,
    error,
    user,
    loginWithRedirect,
    logout,
    getAccessTokenSilently,
  } = useAuth0()

  useEffect(() => {
    const callApi = async () => {
      const token = await getAccessTokenSilently({
        authorizationParams: {
          scope: import.meta.env.VITE_AUTH0_SCOPE,
        },
      })
      const response = await fetch(`https://${import.meta.env.VITE_DOMAIN}/api/whoami`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const user = await response.json()
      if (!user) navigate(`/`)
      else if (user && user.inviteCode)
        navigate(`/rsvp?inviteCode=${user.inviteCode}`)
      else navigate(`/zone`)
    }

    if (isAuthenticated) callApi()
  }, [isAuthenticated, navigate, getAccessTokenSilently])

  if (isLoading) {
    return <div>Loading...</div>
  }
  if (error) {
    return <div>Oops... {error.message}</div>
  }

  if (isAuthenticated) {
    return (
      <div>
        Hello {user?.name} <button onClick={() => logout()}>Log out</button>
      </div>
    )
  } else {
    return (
      <button
        onClick={() => loginWithRedirect({ appState: { type: 'login' } })}
      >
        Log in
      </button>
    )
  }
}
