import { IConversation } from '@atlas/api'
import { Box, Button, Divider, VStack } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'

type SidePanelProps = {
  list: IConversation[]
}
export function SidePanel({ list }: SidePanelProps) {
  const router = useRouter()
  return (
    <VStack>
      {list.length &&
        list.slice(0, 5).map((conversation) => {
          const { uuid, title } = conversation
          return (
            <Box key={uuid}>
              <Button onClick={() => router.push(`/zone/conversation/${uuid}`)}>
                {title}
              </Button>
            </Box>
          )
        })}
      <Divider />
      <Box>
        <Button onClick={() => router.push(`/zone`)}>Back to the Zone</Button>
      </Box>
      <Box alignSelf="bottom">Settings</Box>
    </VStack>
  )
}
