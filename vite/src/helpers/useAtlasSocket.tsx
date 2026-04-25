import { AtlasSocketMessage } from '@atlas/api'
import { useAuth0 } from '@auth0/auth0-react'
import { createContext, PropsWithChildren, useCallback, useContext, useState } from 'react'
import { ReadyState } from 'react-use-websocket'
import { useWebSocket } from 'react-use-websocket/dist/lib/use-websocket'

export enum IdentificationState {
  FAILED = -1,
  UNIDENTIFIED = 0,
  IDENTIFYING = 1,
  IDENTIFIED = 2,
}

type AtlasSocketContextType = {
  sendJsonMessage: <T>(message: AtlasSocketMessage<T>) => void
  readyState: ReadyState
  identificationState: IdentificationState
  lastJsonMessage: unknown
}

const AtlasSocketContext = createContext<AtlasSocketContextType>({
  sendJsonMessage: () => {},
  readyState: ReadyState.UNINSTANTIATED,
  identificationState: IdentificationState.UNIDENTIFIED,
  lastJsonMessage: null,
})

export function AtlasSocketProvider({ children }: PropsWithChildren) {
  const [, setMessageQueue] = useState<AtlasSocketMessage<unknown>[]>([])
  const [identificationState, setIdentificationState] = useState(IdentificationState.UNIDENTIFIED)
  const { getAccessTokenSilently } = useAuth0()

  const { sendJsonMessage: sendRaw, readyState, lastJsonMessage } = useWebSocket(
    `wss://${import.meta.env.VITE_DOMAIN}/ws/`,
    {
      shouldReconnect: (e) => {
        console.info('CloseEvent', e)
        return true
      },
      reconnectInterval: 1000,
      onOpen: () => {
        setIdentificationState(IdentificationState.IDENTIFYING)
        getAccessTokenSilently().then((token) => sendRaw({ type: 'identify', token }))
      },
      onClose: () => setIdentificationState(IdentificationState.UNIDENTIFIED),
      onMessage: (event) => {
        const message: AtlasSocketMessage<unknown> = JSON.parse(event.data)
        if (message.type === 'identified') {
          setIdentificationState(IdentificationState.IDENTIFIED)
          setMessageQueue((q) => {
            q.forEach((m) => sendRaw(m))
            return []
          })
        }
      },
    },
  )

  const sendJsonMessage = useCallback(<T,>(message: AtlasSocketMessage<T>) => {
    if (readyState !== ReadyState.OPEN) {
      setIdentificationState(IdentificationState.IDENTIFYING)
      setMessageQueue((q) => [...q, message])
      getAccessTokenSilently().then((token) => sendRaw({ type: 'identify', token }))
    } else {
      sendRaw(message)
    }
  }, [readyState, getAccessTokenSilently, sendRaw])

  return (
    <AtlasSocketContext.Provider value={{ sendJsonMessage, readyState, identificationState, lastJsonMessage }}>
      {children}
    </AtlasSocketContext.Provider>
  )
}

export default function useAtlasSocket() {
  return useContext(AtlasSocketContext)
}
