'use client'

import { Auth0Provider } from '@auth0/auth0-react'
import { CacheProvider } from '@chakra-ui/next-js'
import { ChakraProvider } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { PropsWithChildren } from 'react'

export function Providers({ children }: PropsWithChildren) {
  const router = useRouter()
  if (!process.env.NEXT_PUBLIC_AUTH0_CLIENTID)
    throw new Error('Did you forget `NEXT_PUBLIC_AUTH0_CLIENTID`?')
  if (!process.env.NEXT_PUBLIC_AUTH0_DOMAIN)
    throw new Error('Did you forget `NEXT_PUBLIC_AUTH0_DOMAIN`?')
  return (
    <Auth0Provider
      domain={process.env.NEXT_PUBLIC_AUTH0_DOMAIN}
      clientId={process.env.NEXT_PUBLIC_AUTH0_CLIENTID}
      cacheLocation="localstorage"
      onRedirectCallback={(appState) => {
        if (!appState) return
        if (appState.type === 'rsvp')
          router.push(`/rsvp?inviteCode=${appState.inviteCode}`)
        if (appState.type === 'login') router.push('/login')
      }}
      authorizationParams={{
        redirect_uri: process.env.NEXT_PUBLIC_AUTH0_REDIRECT_URI,
        audience: process.env.NEXT_PUBLIC_AUTH0_AUDIENCE,
        scope: 'self',
      }}
    >
      <CacheProvider>
        <ChakraProvider>{children}</ChakraProvider>
      </CacheProvider>
    </Auth0Provider>
  )
}
