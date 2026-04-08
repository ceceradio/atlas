import { JSONSchemaType } from 'ajv'
import { IAtlasTransceiver } from './IAtlasTransceiver'

export type IAtlasResponse = {
  messages: IAtlasMessage[]
}

export type IAtlasRequest = IAtlasAssistantRequest | IAtlasCallToolRequest

export type IAtlasAssistantRequest = {
  messages: IAtlasMessage[]
  currentUser: IAtlasUserSpecification
  assistant: IAssistant
  transceiver?: IAtlasTransceiver
}
export type IAtlasCallToolRequest<Args = unknown, ReturnType = unknown> = {
  messages: IAtlasMessage[]
  currentUser: IAtlasUserSpecification
  assistant: IAssistant
  tool: ITool<Args, ReturnType>
  transceiver?: IAtlasTransceiver
}

export type IAssistant = {
  name: string
  temperature?: number
  maxTokens?: number
  onSystemMessage(
    request: IAtlasAssistantRequest,
    response: IAtlasResponse,
  ): Promise<IAtlasMessage>
  getTools(): ITool[]
  filterMessages?(messages: IAtlasMessage[]): Promise<IAtlasMessage[]> | IAtlasMessage[]
}

export type IAtlasUserSpecification = {
  name: string
  id: string
}

export const AtlasRoleEnums = [
  'assistant',
  'system',
  'tool_call',
  'tool_response',
  'user',
] as const

export type IAtlasMessage =
  | IAtlasUserMessage
  | IAtlasToolCallMessage
  | IAtlasToolResponseMessage
  | IAtlasAssistantMessage
  | IAtlasSystemMessage

export type IAtlasAssistantMessage = {
  name: string
  content: string
  time: number
  role: 'assistant'
}
export type IAtlasUserMessage = {
  name: string
  content: string
  time: number
  role: 'user'
}
export type IAtlasSystemMessage = {
  content: string
  time: number
  role: 'system'
}

export type IAtlasToolCallMessage<Args = unknown> = {
  id: string
  name: string
  args: Args
  time: number
  role: 'tool_call' // @todo: idk if this is right
}

export type IAtlasToolResponseMessage<Content = unknown> = {
  id: string
  name: string
  content: Content
  time: number
  role: 'tool_response'
  _validationError?: boolean
}

export type ITool<
  Args = unknown,
  ReturnType = Args,
  ArgsDefinition = Args extends unknown ? unknown : JSONSchemaType<Args>,
> = {
  name: string
  description: string
  arguments: ArgsDefinition
  call(
    request: IAtlasAssistantRequest,
    response: IAtlasResponse,
    args: Args,
  ): Promise<ReturnType>
}
