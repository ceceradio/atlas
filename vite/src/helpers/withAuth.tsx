import { useAuth0 } from '@auth0/auth0-react'
import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useSelector } from 'react-redux'
import { selectToken } from '@/store/authSlice'

const withAuth = (Component: React.FunctionComponent) => {
  const Auth = ({ ...props }) => {
    const { isAuthenticated, isLoading } = useAuth0()
    const navigate = useNavigate()
    const token = useSelector(selectToken)

    useEffect(() => {
      if (!isLoading && !isAuthenticated) navigate('/login')
    }, [isLoading, navigate, isAuthenticated])

    // Don't render until the Redux token is populated — prevents queries
    // from firing with an empty Bearer token on page refresh
    if (!isAuthenticated || !token) {
      return <div></div>
    }

    return <Component {...props} />
  }

  return Auth
}

export default withAuth
