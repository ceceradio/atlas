import { useAuth0 } from '@auth0/auth0-react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

const withAuth = (Component: React.FunctionComponent) => {
  const Auth = ({ ...props }) => {
    // Login data added to props via redux-store (or use react context for example)
    const { isAuthenticated, isLoading } = useAuth0()
    const router = useRouter()

    // If user is not logged in, redirect to login component
    useEffect(() => {
      if (!isLoading && !isAuthenticated) router.push('/login')
    }, [isLoading, router, isAuthenticated])
    if (!isAuthenticated) {
      return <div></div>
    }

    // If user is logged in, return original component
    return <Component {...props} />
  }

  return Auth
}

export default withAuth
