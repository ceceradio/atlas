'use client'

import { useAuth0 } from '@auth0/auth0-react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function Login() {
  const router = useRouter()
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
          scope: 'self', // Scope that exists for the API being called. You can create these through the Auth0 Management API or through the Auth0 Dashboard in the Permissions view of your API.
        },
      })
      const response = await fetch('https://local.atlas.zone/api/whoami', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const { user } = await response.json()
      if (user.inviteCode) router.push(`/rsvp?inviteCode=${user.inviteCode}`)
      else router.push(`/zone`)
    }

    if (isAuthenticated && router && getAccessTokenSilently !== undefined)
      callApi()
  }, [isAuthenticated, router, getAccessTokenSilently])

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
