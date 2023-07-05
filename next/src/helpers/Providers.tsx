'use client'

import { Auth0Provider } from '@auth0/auth0-react'
import { CacheProvider } from '@chakra-ui/next-js'
import { ChakraProvider } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'

const AUTH0_DOMAIN = 'dev-kxsxjl8r.us.auth0.com'
const AUTH0_CLIENTID = 'V0YATa44lAoXpKWFZbw6CiKYDOw8vQ1i'
const AUTH0_AUDIENCE = 'https://local.atlas.zone'

export function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  return (
    <Auth0Provider
      domain={AUTH0_DOMAIN}
      clientId={AUTH0_CLIENTID}
      onRedirectCallback={(appState) => {
        console.log(appState)
        if (!appState) return
        if (appState.type === 'rsvp')
          router.push(`/rsvp/${appState.inviteCode}`)
        if (appState.type === 'login') router.push('/login')
      }}
      authorizationParams={{
        redirect_uri: 'https://local.atlas.zone/zone',
        audience: AUTH0_AUDIENCE,
        scope: 'self',
      }}
    >
      <CacheProvider>
        <ChakraProvider>{children}</ChakraProvider>
      </CacheProvider>
    </Auth0Provider>
  )
}
