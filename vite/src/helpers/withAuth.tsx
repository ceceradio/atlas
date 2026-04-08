import { useAuth0 } from '@auth0/auth0-react'
import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react'

const withAuth = (Component: React.FunctionComponent) => {
  const Auth = ({ ...props }) => {
    const { isAuthenticated, isLoading } = useAuth0()
    const navigate = useNavigate()

    useEffect(() => {
      if (!isLoading && !isAuthenticated) navigate('/login')
    }, [isLoading, navigate, isAuthenticated])
    if (!isAuthenticated) {
      return <div></div>
    }

    return <Component {...props} />
  }

  return Auth
}

export default withAuth
