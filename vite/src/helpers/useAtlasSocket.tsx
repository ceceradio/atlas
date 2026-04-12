import { AtlasSocketMessage } from '@atlas/api'
import { useState } from 'react'
import { ReadyState } from 'react-use-websocket'
import { useWebSocket } from 'react-use-websocket/dist/lib/use-websocket'
import { useAuth0 } from '@auth0/auth0-react'

export enum IdentificationState {
  FAILED = -1,
  UNIDENTIFIED = 0,
  IDENTIFYING = 1,
  IDENTIFIED = 2,
}

export default function useAtlasSocket() {
  const [messageQueue, setMessageQueue] = useState<
    AtlasSocketMessage<unknown>[]
  >([])
  const { getAccessTokenSilently } = useAuth0()
  const [identificationState, setIdentificationState] =
    useState<IdentificationState>(IdentificationState.UNIDENTIFIED)
  const {
    sendJsonMessage: sendJsonMessageOriginal,
    readyState,
    lastJsonMessage,
  } = useWebSocket(
    `wss://${import.meta.env.VITE_DOMAIN}/ws/`,
    {
      shouldReconnect: (e) => {
        console.info('CloseEvent', e)
        return true
      },
      reconnectInterval: 1000,
      share: true,
      onOpen: () => {
        setIdentificationState(IdentificationState.IDENTIFYING)
        getAccessTokenSilently().then((token) =>
          sendJsonMessageOriginal({ type: 'identify', token }),
        )
      },
      onClose: () => {
        setIdentificationState(IdentificationState.UNIDENTIFIED)
      },
      onMessage: (event) => {
        const message: AtlasSocketMessage<unknown> = JSON.parse(event.data)
        if (message.type === 'identified') {
          setIdentificationState(IdentificationState.IDENTIFIED)
          processQueue(messageQueue)
        }
      },
    },
    true,
  )
  const processQueue = (messages: AtlasSocketMessage<unknown>[]) => {
    messages.forEach((message) => sendJsonMessage(message))
    setMessageQueue([])
  }
  const sendJsonMessage = <T,>(message: AtlasSocketMessage<T>) => {
    if (readyState !== ReadyState.OPEN) {
      setIdentificationState(IdentificationState.IDENTIFYING)
      setMessageQueue([...messageQueue, message])
      getAccessTokenSilently().then((token) =>
        sendJsonMessageOriginal({ type: 'identify', token }),
      )
    } else sendJsonMessageOriginal(message)
  }
  return { sendJsonMessage, readyState, identificationState, lastJsonMessage }
}
