'use client'

import { useAuth0 } from '@auth0/auth0-react'
import { useEffect } from 'react'

export default function Login() {
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
          audience: 'https://local.atlas.zone', // Value in Identifier field for the API being called.
          scope: 'self', // Scope that exists for the API being called. You can create these through the Auth0 Management API or through the Auth0 Dashboard in the Permissions view of your API.
        },
      })
      const response = await fetch('https://local.atlas.zone/api/whoami', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      console.log(response.json())
    }

    if (isAuthenticated) callApi()
  }, [isAuthenticated, getAccessTokenSilently])

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
    return <button onClick={() => loginWithRedirect()}>Log in</button>
  }
}
