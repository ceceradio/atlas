import { useAuth0 } from '@auth0/auth0-react'
import { Spinner } from '@chakra-ui/react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { MouseEventHandler, useEffect } from 'react'

export default function RSVP() {
  const { isLoading, isAuthenticated, error, loginWithRedirect } = useAuth0()
  const [searchParams] = useSearchParams()
  const inviteCode = searchParams.get('inviteCode')
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
  const [searchParams] = useSearchParams()
  const inviteCode = searchParams.get('inviteCode')
  const navigate = useNavigate()
  useEffect(() => {
    const acceptInvitation = async () => {
      const token = await getAccessTokenSilently({
        authorizationParams: {
          scope: 'self',
        },
      })
      const response = await fetch(`https://${import.meta.env.VITE_DOMAIN}/api/rsvp`, {
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
    if (inviteCode && getAccessTokenSilently !== undefined)
      acceptInvitation().then(() => navigate('/zone'))
  }, [getAccessTokenSilently, navigate, inviteCode])
  return <Spinner />
}

const LoginScreen = ({ onClick }: { onClick: MouseEventHandler }) => (
  <button onClick={onClick}>Log in to register</button>
)
