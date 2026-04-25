import { useAuth0 } from "@auth0/auth0-react";
import {
  Box,
  Button,
  Center,
  Heading,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const navigate = useNavigate();
  const [loginError, setLoginError] = useState<string | null>(null);
  const {
    isLoading,
    isAuthenticated,
    error,
    user,
    loginWithRedirect,
    logout,
    getAccessTokenSilently,
  } = useAuth0();

  useEffect(() => {
    const callApi = async () => {
      try {
        const token = await getAccessTokenSilently({
          authorizationParams: {
            scope: import.meta.env.VITE_AUTH0_SCOPE,
          },
        });
        const response = await fetch(
          `https://${import.meta.env.VITE_DOMAIN}/api/whoami`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        const user = await response.json();
        if (!user) {
          setLoginError("Login failed: could not retrieve user profile.");
        } else if (user && user.inviteCode)
          navigate(`/rsvp?inviteCode=${user.inviteCode}`);
        else navigate(`/zone`);
      } catch (e) {
        setLoginError(e instanceof Error ? e.message : "An unexpected error occurred.");
      }
    };

    if (isAuthenticated) callApi();
  }, [isAuthenticated, navigate, getAccessTokenSilently]);

  if (isLoading) {
    return (
      <Center h="100vh">
        <Spinner size="xl" color="purple.400" thickness="3px" />
      </Center>
    );
  }

  if (error || loginError) {
    return (
      <Center h="100vh">
        <Box
          bg="red.50"
          border="1px solid"
          borderColor="red.200"
          borderRadius="lg"
          px={8}
          py={6}
          maxW="sm"
          textAlign="center"
        >
          <Text color="red.600" fontWeight="medium">
            {error?.message ?? loginError}
          </Text>
        </Box>
      </Center>
    );
  }

  return (
    <Center h="100vh" bg="gray.50">
      <Box
        bg="white"
        borderRadius="2xl"
        boxShadow="lg"
        px={10}
        py={12}
        maxW="lg"
        w="full"
        mx={4}
        textAlign="center"
      >
        <VStack spacing={6}>
          <VStack spacing={2}>
            <Heading
              size="2xl"
              fontWeight="bold"
              color="purple.600"
              letterSpacing="tight"
            >
              atlas communesoft
            </Heading>
            <Text color="gray.500" fontSize="sm">
              the ai we have at home
            </Text>
          </VStack>

          {isAuthenticated ? (
            <VStack spacing={4} w="full">
              <Text color="gray.600">Welcome back, {user?.name}</Text>
              <Button
                variant="outline"
                colorScheme="purple"
                w="full"
                onClick={() => logout()}
              >
                Log out
              </Button>
            </VStack>
          ) : (
            <Button
              colorScheme="purple"
              size="lg"
              w="full"
              borderRadius="xl"
              onClick={() => loginWithRedirect({ appState: { type: "login" } })}
            >
              Log in
            </Button>
          )}
        </VStack>
      </Box>
    </Center>
  );
}
