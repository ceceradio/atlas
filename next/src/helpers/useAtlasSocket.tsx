'use client'
import { AtlasSocketMessage } from '@atlas/api'
import { useState } from 'react'
import { ReadyState } from 'react-use-websocket'
import { useWebSocket } from 'react-use-websocket/dist/lib/use-websocket'
import useAtlasApi from './useAtlasApi'

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
  const { getAccessTokenSilently } = useAtlasApi()
  const [identificationState, setIdentificationState] =
    useState<IdentificationState>(IdentificationState.UNIDENTIFIED)
  const {
    sendJsonMessage: sendJsonMessageOriginal,
    readyState,
    lastJsonMessage,
  } = useWebSocket(
    'wss://local.atlasai.zone/ws/',
    {
      shouldReconnect: () => true,
      share: true,
      onClose: () => {
        console.debug('ws closed')
        setIdentificationState(IdentificationState.UNIDENTIFIED)
      },
      onOpen: async () => {
        console.debug('ws opened')
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
