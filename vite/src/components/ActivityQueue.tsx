import {
  Box,
  Flex,
  IconButton,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Text,
  useDisclosure,
} from '@chakra-ui/react'
import { useDispatch, useSelector } from 'react-redux'
import { dismissJob, selectAllJobs, type JobEntry } from '@/store/jobsSlice'

const STATUS_COLOR: Record<string, string> = {
  waiting: 'gray.500',
  active: 'blue.500',
  completed: 'green.500',
  failed: 'red.500',
  stalled: 'orange.500',
}

const STATUS_SYMBOL: Record<string, string> = {
  waiting: '○',
  active: '●',
  completed: '✓',
  failed: '✕',
  stalled: '!',
}

function JobRow({ job }: { job: JobEntry }) {
  const color = STATUS_COLOR[job.status] ?? 'gray.500'
  const symbol = STATUS_SYMBOL[job.status] ?? '?'
  const { isOpen, onOpen, onClose } = useDisclosure()
  const dispatch = useDispatch()
  const hasResult = job.result != null
  const hasDetails = hasResult || (job.status === 'failed' && job.failedReason != null)
  const isDone = job.status === 'completed' || job.status === 'failed'

  return (
    <>
      <Flex
        gap="0.35rem"
        alignItems="center"
        fontSize="xs"
        color="gray.700"
      >
        <Flex
          gap="0.35rem"
          alignItems="center"
          flex="1"
          minWidth={0}
          cursor={hasDetails ? 'pointer' : undefined}
          onClick={hasDetails ? onOpen : undefined}
          _hover={hasDetails ? { color: 'gray.900' } : undefined}
        >
          <Text color={color} lineHeight="1" flexShrink={0}>{symbol}</Text>
          <Text noOfLines={1} flex="1">{job.queue} #{job.jobId}</Text>
          <Text color={color} flexShrink={0}>{job.status}</Text>
        </Flex>
        {isDone && (
          <IconButton
            aria-label="Dismiss"
            icon={<>×</>}
            size="xs"
            variant="ghost"
            minWidth="auto"
            height="auto"
            padding="0 2px"
            color="gray.400"
            _hover={{ color: 'gray.700' }}
            onClick={() => dispatch(dismissJob(job.jobId))}
          />
        )}
      </Flex>

      {hasDetails && (
        <Modal isOpen={isOpen} onClose={onClose} size="xl" scrollBehavior="inside">
          <ModalOverlay />
          <ModalContent>
            <ModalHeader fontSize="sm">{job.queue} #{job.jobId}</ModalHeader>
            <ModalCloseButton />
            <ModalBody paddingBottom="1.5rem">
              <Box
                as="pre"
                fontFamily="monospace"
                fontSize="12px"
                whiteSpace="pre-wrap"
                wordBreak="break-all"
              >
                {hasResult
                  ? JSON.stringify(job.result, null, 2)
                  : job.failedReason}
              </Box>
            </ModalBody>
          </ModalContent>
        </Modal>
      )}
    </>
  )
}

export function ActivityQueue() {
  const jobs = useSelector(selectAllJobs)
  if (jobs.length === 0) return null

  return (
    <Flex
      flexDirection="column"
      width="100%"
      flex="1"
      minHeight={0}
      borderTop="1px solid"
      borderColor="gray.300"
      paddingTop="0.5rem"
    >
      <Text fontSize="xs" fontWeight="semibold" color="gray.500" marginBottom="0.25rem" flexShrink={0}>
        Jobs
      </Text>
      <Flex flexDirection="column" gap="0.2rem" overflowY="auto" flex="1" minHeight={0}>
        {jobs.map((job) => (
          <JobRow key={job.jobId} job={job} />
        ))}
      </Flex>
    </Flex>
  )
}
