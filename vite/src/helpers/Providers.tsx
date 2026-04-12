import { Auth0Provider } from '@auth0/auth0-react'
import { ChakraProvider } from '@chakra-ui/react'
import { useNavigate } from 'react-router-dom'
import { PropsWithChildren } from 'react'
import { Provider } from 'react-redux'
import { store } from '@/store'
import { AccessTokenManager } from './AccessTokenManager'
import { JobQueueMonitor } from './JobQueueMonitor'

export function Providers({ children }: PropsWithChildren) {
  const navigate = useNavigate()
  if (!import.meta.env.VITE_AUTH0_CLIENTID)
    throw new Error('Did you forget `VITE_AUTH0_CLIENTID`?')
  if (!import.meta.env.VITE_AUTH0_DOMAIN)
    throw new Error('Did you forget `VITE_AUTH0_DOMAIN`?')
  return (
    <Provider store={store}>
      <Auth0Provider
        domain={import.meta.env.VITE_AUTH0_DOMAIN}
        clientId={import.meta.env.VITE_AUTH0_CLIENTID}
        cacheLocation="localstorage"
        onRedirectCallback={(appState) => {
          if (!appState) return
          if (appState.type === 'rsvp')
            navigate(`/rsvp?inviteCode=${appState.inviteCode}`)
          if (appState.type === 'login') navigate('/login')
        }}
        authorizationParams={{
          redirect_uri: import.meta.env.VITE_AUTH0_REDIRECT_URI,
          audience: import.meta.env.VITE_AUTH0_AUDIENCE,
          scope: 'self',
        }}
      >
        <AccessTokenManager />
        <JobQueueMonitor />
        <ChakraProvider>{children}</ChakraProvider>
      </Auth0Provider>
    </Provider>
  )
}
