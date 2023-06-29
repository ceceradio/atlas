'use client'

import { Auth0Provider } from '@auth0/auth0-react'
import { CacheProvider } from '@chakra-ui/next-js'
import { ChakraProvider } from '@chakra-ui/react'

const AUTH0_DOMAIN = 'dev-kxsxjl8r.us.auth0.com'
const AUTH0_CLIENTID = 'V0YATa44lAoXpKWFZbw6CiKYDOw8vQ1i'

export function Providers({
    children
}: {
    children: React.ReactNode
}) {
    return (
        <Auth0Provider
            domain={AUTH0_DOMAIN}
            clientId={AUTH0_CLIENTID}
            authorizationParams={{
                redirect_uri: 'http://localhost:3000'
            }}
        >
            <CacheProvider>
                <ChakraProvider>
                    {children}
                </ChakraProvider>
            </CacheProvider>
        </Auth0Provider>
    )
}