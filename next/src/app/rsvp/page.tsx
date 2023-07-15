'use client'

import { useAuth0 } from '@auth0/auth0-react'
import { Spinner } from '@chakra-ui/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { MouseEventHandler, useEffect } from 'react'

export default function RSVP() {
  const { isLoading, isAuthenticated, error, loginWithRedirect } = useAuth0()
  const inviteCode = useSearchParams().get('inviteCode')
  if (isLoading) return <Spinner />
  if (error) return <div>Oops... {error.message}</div>
  if (!inviteCode) throw new Error()
  if (isAuthenticated) return <RSVPScreen></RSVPScreen>

  return (
    <LoginScreen
      onClick={() =>
        loginWithRedirect({
          appState: {
            type: 'rsvp',
            inviteCode,
          },
        })
      }
    ></LoginScreen>
  )
}

const RSVPScreen = () => {
  const { getAccessTokenSilently } = useAuth0()
  const inviteCode = useSearchParams().get('inviteCode')
  const router = useRouter()
  useEffect(() => {
    const acceptInvitation = async () => {
      const token = await getAccessTokenSilently({
        authorizationParams: {
          //audience: 'https://local.atlasai.zone', // Value in Identifier field for the API being called.
          scope: 'self', // Scope that exists for the API being called. You can create these through the Auth0 Management API or through the Auth0 Dashboard in the Permissions view of your API.
        },
      })
      const response = await fetch('https://local.atlasai.zone/api/rsvp', {
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
      const user = await response.json()

      if (!user) throw new Error()
    }
    if (inviteCode && router && getAccessTokenSilently !== undefined)
      acceptInvitation().then(() => router.push('/zone'))
  }, [getAccessTokenSilently, router, inviteCode])
  return <Spinner />
}

const LoginScreen = ({ onClick }: { onClick: MouseEventHandler }) => (
  <button onClick={onClick}>Log in to register</button>
)
