'use client'

import { useAuth0 } from '@auth0/auth0-react'
import { Spinner } from '@chakra-ui/react'
import { useParams } from 'next/navigation'
import { useEffect } from 'react'

export default function RSVP() {
  const {
    logout,
    isLoading,
    isAuthenticated,
    error,
    loginWithPopup,
    getAccessTokenWithPopup,
  } = useAuth0()
  const { inviteCode } = useParams()
  useEffect(() => {
    const callApi = async () => {
      const token = await getAccessTokenWithPopup({
        authorizationParams: {
          audience: 'https://local.atlas.zone', // Value in Identifier field for the API being called.
          scope: 'self', // Scope that exists for the API being called. You can create these through the Auth0 Management API or through the Auth0 Dashboard in the Permissions view of your API.
        },
      })
      console.log('got a token')
      const response = await fetch('https://local.atlas.zone/api/rsvp', {
        body: JSON.stringify({
          provider: 'auth0',
          inviteCode,
        }),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        method: 'POST',
      })
      console.log(response.json())
    }
    console.log(inviteCode, isAuthenticated)
    if (!isLoading && inviteCode && isAuthenticated)
      callApi().catch((e) => console.error(e))
  }, [isAuthenticated, isLoading, inviteCode, getAccessTokenWithPopup])

  if (!inviteCode) throw new Error()

  if (isLoading) {
    return <Spinner />
  }
  if (error) {
    return <div>Oops... {error.message}</div>
  }

  if (isAuthenticated) {
    return <button onClick={() => logout()}>Log out</button>
  } else {
    return <button onClick={() => loginWithPopup()}>Log in to register</button>
  }
}
