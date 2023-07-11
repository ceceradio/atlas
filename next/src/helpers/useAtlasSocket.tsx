'use client'
import { AtlasSocketMessage } from '@atlas/api'
import { useState } from 'react'
import { useWebSocket } from 'react-use-websocket/dist/lib/use-websocket'
import useAtlasApi from './useAtlasApi'

export enum IdentificationState {
  FAILED = -1,
  UNIDENTIFIED = 0,
  IDENTIFYING = 1,
  IDENTIFIED = 2,
}

export default function useAtlasSocket() {
  const { getAccessTokenSilently } = useAtlasApi()
  const [identificationState, setIdentificationState] =
    useState<IdentificationState>(IdentificationState.UNIDENTIFIED)
  const { sendJsonMessage, readyState, lastJsonMessage } = useWebSocket(
    'wss://local.atlas.zone/ws/',
    {
      shouldReconnect: () => true,
      onClose: () => {
        console.debug('ws closed')
        setIdentificationState(IdentificationState.UNIDENTIFIED)
      },
      onOpen: async () => {
        console.debug('sending ws identification...')
        setIdentificationState(IdentificationState.IDENTIFYING)
        const token = await getAccessTokenSilently()
        sendJsonMessage({ type: 'identify', token })
      },
      onMessage: (event) => {
        console.debug(event)
        const message: AtlasSocketMessage<unknown> = JSON.parse(event.data)
        if (message.type === 'identified') {
          setIdentificationState(IdentificationState.IDENTIFIED)
        }
      },
    },
    true,
  )
  return { sendJsonMessage, readyState, identificationState, lastJsonMessage }
}
