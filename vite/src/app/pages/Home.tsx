import { Center, Spinner, Text, VStack } from '@chakra-ui/react'
import { useNavigate } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'
import { useEffect } from 'react'

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth0()
  const navigate = useNavigate()

  useEffect(() => {
    if (isLoading) return
    if (isAuthenticated) navigate('/zone')
    else navigate('/login')
  }, [isAuthenticated, isLoading, navigate])

  return (
    <Center h="100vh" bg="gray.50">
      <VStack spacing={4}>
        <Spinner size="xl" color="purple.400" thickness="3px" />
        <Text color="gray.400" fontSize="sm" letterSpacing="wide">
          loading session...
        </Text>
      </VStack>
    </Center>
  )
}
