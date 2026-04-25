import useAtlasSocket, { IdentificationState } from "@/helpers/useAtlasSocket";
import { hasUnread } from "@/helpers/useLastSeen";
import {
  useDeleteConversationMutation,
  useGetConversationsQuery,
  useUpdateUserMutation,
  useWhoamiQuery,
} from "@/store/atlasApi";
import { selectToken } from "@/store/authSlice";
import { AtlasSocketMessage, IAPIConversation } from "@atlas/api";
import {
  AddIcon,
  CalendarIcon,
  ChatIcon,
  DownloadIcon,
  StarIcon,
} from "@chakra-ui/icons";
import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Box,
  Button,
  createIcon,
  Divider,
  Flex,
  Icon,
  IconButton,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Popover,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  Text,
  Tooltip,
} from "@chakra-ui/react";
import React, { PropsWithChildren, useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { ReadyState } from "react-use-websocket";
import { ActivityQueue } from "./ActivityQueue";
import { GemIcon } from "./GemIcon";
import { DISCORD_SETUP_DISMISSED_KEY } from "./DiscordSetupModal";

const BookIcon = createIcon({
  displayName: "BookIcon",
  viewBox: "2 2 20 20",
  path: (
    <path
      fill="currentColor"
      d="M19 3H7c-1.1 0-2 .9-2 2v1c-1.1 0-2 .9-2 2v11c0 1.65 1.35 3 3 3h11c1.65 0 3-1.35 3-3V5c0-1.1-.9-2-2-2zm-1 16c0 .55-.45 1-1 1H6c-.55 0-1-.45-1-1V8c0-.55.45-1 1-1h12v12zm0-13H7V5h11v1zM9 11h6v1.5H9zm0 3h6v1.5H9zm0 3h4v1.5H9z"
    />
  ),
});

const WifiIcon = createIcon({
  displayName: "WifiIcon",
  viewBox: "0 0 24 24",
  path: (
    <path
      fill="currentColor"
      d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z"
    />
  ),
});

const GroupIcon = createIcon({
  displayName: "GroupIcon",
  viewBox: "0 0 24 24",
  path: (
    <path
      fill="currentColor"
      d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"
    />
  ),
});

const AuditIcon = createIcon({
  displayName: "AuditIcon",
  viewBox: "0 0 24 24",
  path: (
    <path
      fill="currentColor"
      d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-7-7zm-1 15H8v-2h4v2zm3-4H8v-2h7v2zm0-4H8V7h7v2zM13 3.5V9h5.5L13 3.5z"
    />
  ),
});

type SidePanelProps = {
  list: IAPIConversation[];
  onNavigate?: () => void;
};

export function SidePanel({ onNavigate }: { onNavigate?: () => void }) {
  const token = useSelector(selectToken);
  const { lastJsonMessage } = useAtlasSocket();
  const { data: list = [], refetch } = useGetConversationsQuery(undefined, {
    skip: !token,
  });

  useEffect(() => {
    const message = lastJsonMessage as AtlasSocketMessage<unknown>;
    if (message && message.type === "update") {
      refetch();
    }
  }, [lastJsonMessage, refetch]);

  return (
    <SidePanelDisplay
      list={list}
      onNavigate={onNavigate}
    />
  );
}

function NavItem({
  label,
  path,
  currentPath,
  onClick,
  icon,
}: {
  label: string;
  path: string;
  currentPath: string;
  onClick: (path: string) => void;
  icon?: React.ElementType;
}) {
  const isActive = currentPath === path;
  return (
    <Flex
      width="100%"
      padding="0.45rem 0.75rem"
      borderRadius="md"
      cursor="pointer"
      fontSize="sm"
      fontWeight={isActive ? "semibold" : "normal"}
      background={isActive ? "white" : "whiteAlpha.600"}
      boxShadow={isActive ? "sm" : "xs"}
      color={isActive ? "gray.900" : "gray.600"}
      _hover={{ background: "white", color: "gray.900", boxShadow: "sm" }}
      onClick={() => onClick(path)}
      transition="all 0.1s"
      alignItems="center"
      gap="0.5rem"
    >
      {icon && <Icon as={icon} boxSize="0.85em" flexShrink={0} />}
      {label}
    </Flex>
  );
}

function DotsIcon() {
  return (
    <Text fontSize="md" lineHeight="1" letterSpacing="0.05em">
      ···
    </Text>
  );
}

function SidePanelDisplay({
  list,
  onNavigate,
}: SidePanelProps) {
  const router = useNavigate();
  const { pathname } = useLocation();
  const token = useSelector(selectToken);
  const [deleteTarget, setDeleteTarget] = useState<IAPIConversation | null>(
    null,
  );
  const [showAll, setShowAll] = useState(false);
  const [deleteConversation, { isLoading: deleting }] =
    useDeleteConversationMutation();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const { data: currentUser } = useWhoamiQuery(undefined, { skip: !token });

  const navigate = (path: string) => {
    router(path);
    onNavigate?.();
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    await deleteConversation(deleteTarget.uuid);
    setDeleteTarget(null);
    if (pathname === `/zone/conversation/${deleteTarget.uuid}`)
      navigate("/zone");
  };

  const choreNavItems = [
    { label: "House Stats", path: "/zone/house-stats", icon: StarIcon },
    { label: "Chore Profiles", path: "/zone/chore-profiles", icon: GroupIcon },
    { label: "Import Chores", path: "/zone/chore-import", icon: DownloadIcon },
    { label: "Chore Messages", path: "/zone/chore-messages", icon: ChatIcon },
    { label: "Chores", path: "/zone/chores", icon: CalendarIcon },
    {
      label: "Chore Definitions",
      path: "/zone/chore-definitions",
      icon: BookIcon,
    },
  ];

  const memberNavItems = [
    { label: "Invite Members", path: "/zone/invite", icon: AddIcon },
    { label: "Audit Log", path: "/zone/audit-log", icon: AuditIcon },
  ];

  return (
    <>
      <Flex flexDirection="column" height="100%">
        {/* Nav section — natural height, scrolls if content overflows */}
        <Flex
          flexDirection="column"
          flexShrink={0}
          overflowY="auto"
          padding="0.75rem"
          paddingBottom="0.5rem"
          gap="0.25rem"
        >
          <Button
            width="100%"
            onClick={() => navigate("/zone")}
            marginBottom="0.5rem"
          >
            New Chat
          </Button>

          {pathname === "/zone" && (
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
                <Text fontSize="xs" color="gray.500">
                  {currentUser.name}
                </Text>
              )}
            </Box>
          )}

          {list.length > 0 && (
            <>
              {(showAll ? list : list.slice(0, 5)).map((conversation) => {
                const { uuid, title, creator } = conversation;
                const path = `/zone/conversation/${uuid}`;
                const isActive = pathname === path;
                const unread =
                  !isActive &&
                  hasUnread(
                    uuid,
                    (conversation as { lastMessageAt?: string | null })
                      .lastMessageAt,
                  );
                return (
                  <Flex
                    key={uuid}
                    width="100%"
                    padding="0.4rem 0.5rem 0.4rem 0.75rem"
                    borderRadius="md"
                    cursor="pointer"
                    background={isActive ? "white" : "whiteAlpha.600"}
                    boxShadow={isActive ? "sm" : "xs"}
                    _hover={{
                      background: "white",
                      boxShadow: "sm",
                      "& .dots-btn": { opacity: 1 },
                    }}
                    onClick={() => navigate(path)}
                    transition="all 0.1s"
                    alignItems="center"
                    gap="0.25rem"
                  >
                    <Box flex="1" minWidth={0}>
                      <Text
                        fontSize="sm"
                        noOfLines={1}
                        fontWeight={isActive ? "semibold" : "normal"}
                      >
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
                        <Text fontSize="xs" color="gray.500">
                          {creator.name}
                        </Text>
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
                      <MenuList
                        minWidth="120px"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MenuItem
                          color="red.500"
                          onClick={() => setDeleteTarget(conversation)}
                        >
                          Delete
                        </MenuItem>
                      </MenuList>
                    </Menu>
                  </Flex>
                );
              })}
              {list.length > 5 && (
                <Text
                  fontSize="xs"
                  color="gray.500"
                  cursor="pointer"
                  textAlign="center"
                  paddingY="0.25rem"
                  _hover={{ color: "gray.700" }}
                  onClick={() => setShowAll((v) => !v)}
                >
                  {showAll ? "show less" : `${list.length - 5} more...`}
                </Text>
              )}
              <Flex
                alignItems="center"
                gap="0.5rem"
                marginY="0.5rem"
                paddingX="0.25rem"
              >
                <Divider borderColor="gray.400" />
                <Text
                  fontSize="xs"
                  color="gray.500"
                  fontWeight="medium"
                  whiteSpace="nowrap"
                  flexShrink={0}
                >
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

          <Flex
            alignItems="center"
            gap="0.5rem"
            marginY="0.5rem"
            paddingX="0.25rem"
          >
            <Divider borderColor="gray.400" />
            <Text
              fontSize="xs"
              color="gray.500"
              fontWeight="medium"
              whiteSpace="nowrap"
              flexShrink={0}
            >
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
        <Flex
          flex="1"
          minHeight={0}
          flexDirection="column"
          padding="0 0.75rem 0.75rem"
        >
          <ActivityQueue />
        </Flex>

        {/* User footer */}
        {currentUser && <UserFooter currentUser={currentUser} />}

        {/* Connection indicator */}
        <ConnectionIndicator />
      </Flex>

      <AlertDialog
        isOpen={!!deleteTarget}
        leastDestructiveRef={cancelRef}
        onClose={() => setDeleteTarget(null)}
        isCentered
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete conversation
            </AlertDialogHeader>
            <AlertDialogBody>
              Delete &ldquo;{deleteTarget?.title}&rdquo;? This can&apos;t be
              undone.
            </AlertDialogBody>
            <AlertDialogFooter gap="0.5rem">
              <Button ref={cancelRef} onClick={() => setDeleteTarget(null)}>
                Cancel
              </Button>
              <Button
                colorScheme="red"
                onClick={handleConfirmDelete}
                isLoading={deleting}
              >
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </>
  );
}


const PRESET_COLORS = [
  // reds / pinks
  "#e57373", "#ef9a9a", "#f06292", "#f48fb1",
  // purples
  "#ce93d8", "#ba68c8", "#9575cd", "#7986cb",
  // blues
  "#90caf9", "#64b5f6", "#4fc3f7", "#81d4fa",
  // teals / greens
  "#80deea", "#80cbc4", "#a5d6a7", "#c5e1a5",
  // yellows / oranges
  "#fff176", "#ffe082", "#ffcc80", "#ffb74d",
  // deep oranges / browns
  "#ff8a65", "#a1887f", "#bcaaa4", "#d7ccc8",
  // grays / blue-grays
  "#b0bec5", "#90a4ae", "#e0e0e0", "#bdbdbd",
  // vivid accents
  "#69f0ae", "#40c4ff", "#ea80fc", "#ff6e40",
];

function UserFooter({
  currentUser,
}: {
  currentUser: {
    uuid: string;
    name: string;
    color?: string;
    discordUsername?: string;
  };
}) {
  const [updateUser] = useUpdateUserMutation();
  const [editingDiscord, setEditingDiscord] = useState(false);
  const [discordInput, setDiscordInput] = useState(
    currentUser.discordUsername || "",
  );
  const [gemClicks, setGemClicks] = useState(0);
  const [gemActivated, setGemActivated] = useState(false);
  const color = currentUser.color || "#b0bec5";

  const submitDiscord = () => {
    const trimmed = discordInput.trim();
    if (!trimmed) localStorage.removeItem(DISCORD_SETUP_DISMISSED_KEY);
    updateUser({ discordUsername: trimmed });
    setEditingDiscord(false);
  };

  const handleGemClick = () => {
    setGemClicks((prev) => {
      const next = prev + 1;
      if (next >= 40) {
        setGemActivated(true);
        return 0;
      }
      return next;
    });
  };

  return (
    <Flex
      padding="0.4rem 0.75rem"
      alignItems="center"
      gap="0.5rem"
      flexShrink={0}
      position="relative"
    >
      {gemActivated && (
        <Box
          position="absolute"
          bottom="100%"
          left="0.75rem"
          pointerEvents="none"
          background="purple.500"
          color="white"
          fontSize="xs"
          fontWeight="semibold"
          paddingX="0.6rem"
          paddingY="0.3rem"
          borderRadius="md"
          whiteSpace="nowrap"
          onAnimationEnd={() => setGemActivated(false)}
          sx={{
            "@keyframes gemFadeOut": {
              "0%":   { opacity: 1, transform: "translateY(0)" },
              "60%":  { opacity: 1, transform: "translateY(-6px)" },
              "100%": { opacity: 0, transform: "translateY(-12px)" },
            },
            animation: "gemFadeOut 1.8s ease-out forwards",
          }}
        >
          gem activated
        </Box>
      )}
      <Popover placement="top-start">
        <PopoverTrigger>
          <Box
            as="button"
            flexShrink={0}
            cursor="pointer"
            title="Pick your color"
            background="none"
            border="none"
            padding="0"
            lineHeight="1"
            opacity={0.9}
            _hover={{ opacity: 1, transform: "scale(1.15)" }}
            transition="opacity 0.1s, transform 0.1s"
            onClick={handleGemClick}
          >
            <GemIcon color={color} />
          </Box>
        </PopoverTrigger>
        <PopoverContent width="auto" padding="0">
          <PopoverBody padding="0.5rem">
            <Flex flexWrap="wrap" gap="0.35rem" width="220px">
              {PRESET_COLORS.map((c) => (
                <Box
                  key={c}
                  as="button"
                  width="24px"
                  height="24px"
                  borderRadius="full"
                  background={c}
                  cursor="pointer"
                  border="2px solid"
                  borderColor={color === c ? "gray.600" : "transparent"}
                  _hover={{ borderColor: "gray.500" }}
                  onClick={() => updateUser({ color: c })}
                />
              ))}
            </Flex>
          </PopoverBody>
        </PopoverContent>
      </Popover>
      <Box flex="1" minWidth={0}>
        <Text fontSize="sm" color="gray.600" noOfLines={1} userSelect="none">
          {currentUser.name}
        </Text>
        {editingDiscord ? (
          <Flex gap="0.25rem" alignItems="center">
            <input
              autoFocus
              value={discordInput}
              onChange={(e) => setDiscordInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitDiscord();
                if (e.key === "Escape") setEditingDiscord(false);
              }}
              placeholder="Discord username"
              style={{
                fontSize: "13px",
                padding: "1px 4px",
                borderRadius: "4px",
                border: "1px solid #aaa",
                width: "100%",
                minWidth: 0,
                outline: "none",
              }}
            />
            <Box
              as="button"
              fontSize="13px"
              color="gray.500"
              onClick={submitDiscord}
              flexShrink={0}
            >
              ✓
            </Box>
          </Flex>
        ) : (
          <Flex
            alignItems="center"
            gap="0.25rem"
            cursor="pointer"
            onClick={() => {
              setDiscordInput(currentUser.discordUsername || "");
              setEditingDiscord(true);
            }}
          >
            <Text
              fontSize="12px"
              color={currentUser.discordUsername ? "gray.500" : "gray.400"}
              noOfLines={1}
            >
              {currentUser.discordUsername
                ? currentUser.discordUsername
                : "set discord"}
            </Text>
          </Flex>
        )}
      </Box>
    </Flex>
  );
}

function ConnectionIndicator() {
  const { readyState, identificationState } = useAtlasSocket();
  const connected = identificationState === IdentificationState.IDENTIFIED;
  const connecting =
    readyState === ReadyState.OPEN || readyState === ReadyState.CONNECTING;
  const color = connected ? "green.500" : connecting ? "yellow.500" : "red.500";
  const label = connected
    ? "Connected"
    : connecting
    ? "Connecting…"
    : "Disconnected";

  return (
    <Tooltip label={label} placement="right" hasArrow>
      <Flex
        padding="0.5rem 0.75rem"
        alignItems="center"
        gap="0.4rem"
        cursor="default"
        flexShrink={0}
      >
        <Icon as={WifiIcon} boxSize="0.9rem" color={color} />
        <Text fontSize="xs" color={color} userSelect="none">
          {label}
        </Text>
      </Flex>
    </Tooltip>
  );
}

export function SidePanelPage({ children }: PropsWithChildren) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <Flex minHeight="100vh">
      {/* Mobile overlay backdrop */}
      {sidebarOpen && (
        <Box
          display={{ base: "block", md: "none" }}
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
        width={{ base: "280px", md: "350px" }}
        position={{ base: "fixed", md: "sticky" }}
        top={0}
        left={0}
        zIndex={{ base: 10, md: 1 }}
        transform={{
          base: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
          md: "none",
        }}
        transition="transform 0.2s ease"
        flexShrink={0}
      >
        <SidePanel onNavigate={() => setSidebarOpen(false)} />
      </Box>

      {/* Main content */}
      <Box
        flex="1"
        minWidth={0}
        display="flex"
        flexDirection="column"
        background="#f2f2f2"
        maxHeight="100dvh"
        overflowY="auto"
      >
        {/* Mobile header */}
        <Flex
          display={{ base: "flex", md: "none" }}
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
  );
}

function HamburgerIcon() {
  return (
    <Flex flexDirection="column" gap="4px" width="18px">
      <Box height="2px" background="currentColor" borderRadius="1px" />
      <Box height="2px" background="currentColor" borderRadius="1px" />
      <Box height="2px" background="currentColor" borderRadius="1px" />
    </Flex>
  );
}
