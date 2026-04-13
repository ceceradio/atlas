import useAtlasSocket from '@/helpers/useAtlasSocket'
import { hasUnread } from '@/helpers/useLastSeen'
import { useGetConversationsQuery, useDeleteConversationMutation, useWhoamiQuery } from '@/store/atlasApi'
import { selectToken } from '@/store/authSlice'
import { AtlasSocketMessage, IAPIConversation } from '@atlas/api'
import {
  AddIcon, CalendarIcon, ChatIcon, DownloadIcon, StarIcon,
} from '@chakra-ui/icons'
import {
  AlertDialog, AlertDialogBody, AlertDialogContent, AlertDialogFooter,
  AlertDialogHeader, AlertDialogOverlay,
  Box, Button, createIcon, Divider, Flex, Icon, IconButton, Menu, MenuButton, MenuItem, MenuList, Text, VStack,
} from '@chakra-ui/react'

const GroupIcon = createIcon({
  displayName: 'GroupIcon',
  viewBox: '0 0 24 24',
  path: (
    <path
      fill="currentColor"
      d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"
    />
  ),
})
import { useNavigate, useLocation } from 'react-router-dom'
import React, { PropsWithChildren, useEffect, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { ActivityQueue } from './ActivityQueue'

type SidePanelProps = {
  list: IAPIConversation[]
  onNavigate?: () => void
}

export function SidePanel({ onNavigate }: { onNavigate?: () => void }) {
  const token = useSelector(selectToken)
  const { lastJsonMessage } = useAtlasSocket()
  const { data: list = [], refetch } = useGetConversationsQuery(undefined, { skip: !token })

  useEffect(() => {
    const message = lastJsonMessage as AtlasSocketMessage<unknown>
    if (message && message.type === 'update') {
      refetch()
    }
  }, [lastJsonMessage, refetch])

  return <SidePanelDisplay list={list} onNavigate={onNavigate} />
}

function NavItem({
  label,
  path,
  currentPath,
  onClick,
  icon,
}: {
  label: string
  path: string
  currentPath: string
  onClick: (path: string) => void
  icon?: React.ElementType
}) {
  const isActive = currentPath === path
  return (
    <Flex
      width="100%"
      padding="0.45rem 0.75rem"
      borderRadius="md"
      cursor="pointer"
      fontSize="sm"
      fontWeight={isActive ? 'semibold' : 'normal'}
      background={isActive ? 'white' : 'whiteAlpha.600'}
      boxShadow={isActive ? 'sm' : 'xs'}
      color={isActive ? 'gray.900' : 'gray.600'}
      _hover={{ background: 'white', color: 'gray.900', boxShadow: 'sm' }}
      onClick={() => onClick(path)}
      transition="all 0.1s"
      alignItems="center"
      gap="0.5rem"
    >
      {icon && <Icon as={icon} boxSize="0.85em" flexShrink={0} />}
      {label}
    </Flex>
  )
}

function DotsIcon() {
  return <Text fontSize="md" lineHeight="1" letterSpacing="0.05em">···</Text>
}

function SidePanelDisplay({ list, onNavigate }: SidePanelProps) {
  const router = useNavigate()
  const { pathname } = useLocation()
  const token = useSelector(selectToken)
  const [deleteTarget, setDeleteTarget] = useState<IAPIConversation | null>(null)
  const [showAll, setShowAll] = useState(false)
  const [deleteConversation, { isLoading: deleting }] = useDeleteConversationMutation()
  const cancelRef = useRef<HTMLButtonElement>(null)
  const { data: currentUser } = useWhoamiQuery(undefined, { skip: !token })

  const navigate = (path: string) => {
    router(path)
    onNavigate?.()
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    await deleteConversation(deleteTarget.uuid)
    setDeleteTarget(null)
    if (pathname === `/zone/conversation/${deleteTarget.uuid}`) navigate('/zone')
  }

  const choreNavItems = [
    { label: 'House Stats', path: '/zone/house-stats', icon: StarIcon },
    { label: 'Chore Profiles', path: '/zone/chore-profiles', icon: GroupIcon },
    { label: 'Import Chores', path: '/zone/chore-import', icon: DownloadIcon },
    { label: 'Chore Messages', path: '/zone/chore-messages', icon: ChatIcon },
    { label: 'Chores', path: '/zone/chores', icon: CalendarIcon },
  ]

  const memberNavItems = [
    { label: 'Invite Members', path: '/zone/invite', icon: AddIcon },
  ]

  return (
    <>
      <Flex flexDirection="column" height="100%">
      {/* Nav section — natural height, scrolls if content overflows */}
      <Flex flexDirection="column" flexShrink={0} overflowY="auto" padding="0.75rem" paddingBottom="0.5rem" gap="0.25rem">
        <Button width="100%" onClick={() => navigate('/zone')} marginBottom="0.5rem">
          New Chat
        </Button>

        {pathname === '/zone' && (
          <Box
            width="100%"
            padding="0.4rem 0.75rem"
            borderRadius="md"
            background="white"
            boxShadow="sm"
            marginBottom="0.1rem"
          >
            <Text fontSize="sm" fontWeight="semibold" noOfLines={1}>
              New Conversation
            </Text>
            {currentUser && (
              <Text fontSize="xs" color="gray.500">{currentUser.name}</Text>
            )}
          </Box>
        )}

        {list.length > 0 && (
          <>
            {(showAll ? list : list.slice(0, 5)).map((conversation) => {
              const { uuid, title, creator } = conversation
              const path = `/zone/conversation/${uuid}`
              const isActive = pathname === path
              const unread = !isActive && hasUnread(uuid, (conversation as { lastMessageAt?: string | null }).lastMessageAt)
              return (
                <Flex
                  key={uuid}
                  width="100%"
                  padding="0.4rem 0.5rem 0.4rem 0.75rem"
                  borderRadius="md"
                  cursor="pointer"
                  background={isActive ? 'white' : 'whiteAlpha.600'}
                  boxShadow={isActive ? 'sm' : 'xs'}
                  _hover={{ background: 'white', boxShadow: 'sm', '& .dots-btn': { opacity: 1 } }}
                  onClick={() => navigate(path)}
                  transition="all 0.1s"
                  alignItems="center"
                  gap="0.25rem"
                >
                  <Box flex="1" minWidth={0}>
                    <Text fontSize="sm" noOfLines={1} fontWeight={isActive ? 'semibold' : 'normal'}>
                      {title}
                      {unread && (
                        <Box
                          as="span"
                          display="inline-block"
                          width="7px"
                          height="7px"
                          borderRadius="full"
                          background="green.400"
                          marginLeft="0.4rem"
                          verticalAlign="middle"
                          position="relative"
                          top="-1px"
                        />
                      )}
                    </Text>
                    {creator && (
                      <Text fontSize="xs" color="gray.500">{creator.name}</Text>
                    )}
                  </Box>
                  <Menu placement="bottom-end">
                    <MenuButton
                      as={IconButton}
                      className="dots-btn"
                      icon={<DotsIcon />}
                      size="xs"
                      variant="ghost"
                      aria-label="Conversation options"
                      opacity={isActive ? 1 : 0}
                      transition="opacity 0.1s"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <MenuList minWidth="120px" onClick={(e) => e.stopPropagation()}>
                      <MenuItem
                        color="red.500"
                        onClick={() => setDeleteTarget(conversation)}
                      >
                        Delete
                      </MenuItem>
                    </MenuList>
                  </Menu>
                </Flex>
              )
            })}
            {list.length > 5 && (
              <Text
                fontSize="xs"
                color="gray.500"
                cursor="pointer"
                textAlign="center"
                paddingY="0.25rem"
                _hover={{ color: 'gray.700' }}
                onClick={() => setShowAll((v) => !v)}
              >
                {showAll ? 'show less' : `${list.length - 5} more...`}
              </Text>
            )}
            <Flex alignItems="center" gap="0.5rem" marginY="0.5rem" paddingX="0.25rem">
              <Divider borderColor="gray.400" />
              <Text fontSize="xs" color="gray.500" fontWeight="medium" whiteSpace="nowrap" flexShrink={0}>
                Chores
              </Text>
              <Divider borderColor="gray.400" />
            </Flex>
          </>
        )}

        {choreNavItems.map((item) => (
          <NavItem
            key={item.path}
            label={item.label}
            path={item.path}
            currentPath={pathname}
            onClick={navigate}
            icon={item.icon}
          />
        ))}

        <Flex alignItems="center" gap="0.5rem" marginY="0.5rem" paddingX="0.25rem">
          <Divider borderColor="gray.400" />
          <Text fontSize="xs" color="gray.500" fontWeight="medium" whiteSpace="nowrap" flexShrink={0}>
            Members
          </Text>
          <Divider borderColor="gray.400" />
        </Flex>

        {memberNavItems.map((item) => (
          <NavItem
            key={item.path}
            label={item.label}
            path={item.path}
            currentPath={pathname}
            onClick={navigate}
            icon={item.icon}
          />
        ))}

      </Flex>

      {/* Activity queue — fills remaining space, scrolls internally */}
      <Flex flex="1" minHeight={0} flexDirection="column" padding="0 0.75rem 0.75rem">
        <ActivityQueue />
      </Flex>
      </Flex>

      <AlertDialog
        isOpen={!!deleteTarget}
        leastDestructiveRef={cancelRef}
        onClose={() => setDeleteTarget(null)}
        isCentered
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">Delete conversation</AlertDialogHeader>
            <AlertDialogBody>
              Delete &ldquo;{deleteTarget?.title}&rdquo;? This can&apos;t be undone.
            </AlertDialogBody>
            <AlertDialogFooter gap="0.5rem">
              <Button ref={cancelRef} onClick={() => setDeleteTarget(null)}>
                Cancel
              </Button>
              <Button colorScheme="red" onClick={handleConfirmDelete} isLoading={deleting}>
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </>
  )
}

export function SidePanelPage({ children }: PropsWithChildren) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <Flex minHeight="100vh">
      {/* Mobile overlay backdrop */}
      {sidebarOpen && (
        <Box
          display={{ base: 'block', md: 'none' }}
          position="fixed"
          inset={0}
          zIndex={9}
          background="blackAlpha.500"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Box
        background="#ddd"
        height="100vh"
        width={{ base: '280px', md: '350px' }}
        position={{ base: 'fixed', md: 'sticky' }}
        top={0}
        left={0}
        zIndex={{ base: 10, md: 1 }}
        transform={{
          base: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
          md: 'none',
        }}
        transition="transform 0.2s ease"
        flexShrink={0}
      >
        <SidePanel onNavigate={() => setSidebarOpen(false)} />
      </Box>

      {/* Main content */}
      <Box flex="1" minWidth={0} display="flex" flexDirection="column" background="#f2f2f2" maxHeight="100dvh" overflowY="auto">
        {/* Mobile header */}
        <Flex
          display={{ base: 'flex', md: 'none' }}
          padding="0.5rem"
          background="#eee"
          alignItems="center"
        >
          <IconButton
            aria-label="Open menu"
            icon={<HamburgerIcon />}
            variant="ghost"
            onClick={() => setSidebarOpen(true)}
          />
        </Flex>
        {children}
      </Box>
    </Flex>
  )
}

function HamburgerIcon() {
  return (
    <Flex flexDirection="column" gap="4px" width="18px">
      <Box height="2px" background="currentColor" borderRadius="1px" />
      <Box height="2px" background="currentColor" borderRadius="1px" />
      <Box height="2px" background="currentColor" borderRadius="1px" />
    </Flex>
  )
}
