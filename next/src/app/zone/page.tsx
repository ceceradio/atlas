'use client'

import Conversation from '@/components/conversation'
import { Box, Button, Divider, Flex, HStack, Input, VStack } from '@chakra-ui/react'

export default function Zone() {
    return (
        <Flex>
            <Box width='xs'><SidePanel /></Box>
            <Box flex='1'><ConversationPanel /></Box>
        </Flex>
    )
}

function SidePanel() {
    return (
        <VStack>
            <Box><Button>Status of groceries</Button></Box>
            <Box><Button>Maintenance required</Button></Box>
            <Box><Button>Decision for your consideration</Button></Box>
            <Divider />
            <Box alignSelf='bottom'>Settings</Box>
        </VStack>
    )
}

function ConversationPanel() {
    return (<VStack>
        <Box>
            <Conversation />
        </Box>
        <Box>
            <HStack>
                <Input placeholder="What's new?" />
                <Button type="submit">Send</Button>
            </HStack>
        </Box>
    </VStack>)
}