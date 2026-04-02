import { JSONSchemaType, PartialSchema } from 'ajv/dist/types/json-schema'
import OpenAI from 'openai'
import {
  ChatCompletionAssistantMessageParam,
  ChatCompletionMessage,
  ChatCompletionMessageParam,
  ChatCompletionMessageToolCall,
  ChatCompletionSystemMessageParam,
  ChatCompletionTool,
  ChatCompletionToolChoiceOption,
  ChatCompletionToolMessageParam,
  ChatCompletionUserMessageParam,
} from 'openai/resources'
import {
  IAssistant,
  IAtlasAssistantMessage,
  IAtlasMessage,
  IAtlasSystemMessage,
  IAtlasToolCallMessage,
  IAtlasToolResponseMessage,
  IAtlasUserMessage,
  ITool,
} from '../../IAtlas'
import { IAtlasEvent } from '../../IAtlasEvent'
import { ITracer } from '../langfuse/ITracer'
import { defaultConfiguration } from './defaultConfiguration'
const ai = new OpenAI(defaultConfiguration)
const MODEL_ID = 'gpt-4.1-mini'

export type ClairaChatCompletionMessageParam =
  | ChatCompletionSystemMessageParam
  | ChatCompletionUserMessageParam
  | ChatCompletionAssistantMessageParam
  | ChatCompletionToolMessageParam

export interface ClairaChatCompletionUserMessageParam
  extends ChatCompletionUserMessageParam {
  name?: string
}

function mapUserMessage(
  message: IAtlasUserMessage,
): ChatCompletionUserMessageParam {
  return {
    content: message.name
      ? `<${message.name}> ${message.content}`
      : message.content,
    role: 'user',
  }
}
function mapAssistantMessage(
  message: IAtlasAssistantMessage,
): ChatCompletionAssistantMessageParam {
  return {
    content: message.content,
    role: 'assistant',
  }
}
function mapSystemMessage(
  message: IAtlasSystemMessage,
): ChatCompletionSystemMessageParam {
  return {
    content: message.content,
    role: 'system',
  }
}
function unmapToolCallMessage(
  message: ChatCompletionMessageToolCall,
): IAtlasToolCallMessage {
  return {
    id: message.id,
    role: 'tool_call',
    name: message.function.name,
    args: JSON.parse(message.function.arguments),
    time: Date.now(),
  }
}
function unmapAssistantMessage(
  message: ChatCompletionMessage,
  assistant: IAssistant,
): IAtlasAssistantMessage {
  if (!message.content) throw new Error('No content. Was this a mistake?')
  return {
    content: message.content,
    role: 'assistant',
    time: Date.now(),
    name: assistant.name,
  }
}

function mapToolResponseMessage(
  message: IAtlasToolResponseMessage,
): ChatCompletionToolMessageParam {
  return {
    content: message.content
      ? JSON.stringify(message.content)
      : 'No content returned',
    tool_call_id: message.id,
    role: 'tool',
  }
}

function mapTool<A>(tool: ITool<A>): ChatCompletionTool {
  const args = tool.arguments as JSONSchemaType<A>
  const recurseProperties = (
    prop: PartialSchema<A> | JSONSchemaType<A>,
  ): OpenAI.FunctionDefinition['parameters'] => {
    if (!prop) return undefined
    const entries = prop.properties
      ? Object.entries(prop.properties).map(
          ([key, value]) =>
            [key, recurseProperties(value as PartialSchema<unknown>)] as [
              string,
              OpenAI.FunctionDefinition['parameters'],
            ],
        )
      : undefined
    const returnValue: OpenAI.FunctionDefinition['parameters'] = {
      type: prop.type,
    }
    if (prop?.name) returnValue.name = prop.name
    if (prop?.description) returnValue.description = prop.description
    if (prop?.items) returnValue.items = prop.items
    if (entries) returnValue.properties = Object.fromEntries(entries)
    return returnValue
  }

  const oaiTool: ChatCompletionTool = {
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: recurseProperties(args),
    },
  }

  return oaiTool
}

export const OpenAICompatibility = {
  mapToOpenAI(message: IAtlasMessage): ChatCompletionMessageParam {
    if (message.role === 'user') return mapUserMessage(message)
    if (message.role === 'assistant') return mapAssistantMessage(message)
    if (message.role === 'system') return mapSystemMessage(message)
    if (message.role === 'tool_response') return mapToolResponseMessage(message)
    //if (message.role === 'tool_call') return mapToolCallMessage(message)
    throw new Error('Unknown message role')
  },
  unmapResponseToAtlas(
    message: ChatCompletionMessage,
    assistant: IAssistant,
  ): IAtlasToolCallMessage[] | IAtlasAssistantMessage {
    if (message.tool_calls)
      return message.tool_calls.map((call) => unmapToolCallMessage(call))
    else return unmapAssistantMessage(message, assistant)
  },
  getAIResponse: async (
    userId: string,
    assistant: IAssistant,
    messages: IAtlasMessage[],
    tools: ITool[],
    transceiver?: (message: IAtlasEvent) => void,
    selectedToolName?: string,
    tracer?: ITracer,
  ): Promise<IAtlasMessage[]> => {
    const compatibleMessages = messages.map(OpenAICompatibility.mapToOpenAI)
    const compatibleTools = tools.map((tool) => mapTool(tool))

    const selectedTool: ChatCompletionToolChoiceOption | undefined =
      selectedToolName
        ? {
            function: { name: selectedToolName as string },
            type: 'function',
          }
        : undefined
    const startTime = new Date()

    const stream = ai.beta.chat.completions.stream({
      messages: compatibleMessages,
      model: MODEL_ID,
      tools: compatibleTools.length ? compatibleTools : undefined,
      user: userId,
      stream: true,
      stream_options: { include_usage: true },
      tool_choice: selectedTool,
    })
    if (transceiver) {
      stream.on('content', (delta, snapshot) =>
        transceiver({ type: 'snapshot', snapshot }),
      )
    }

    await stream.finalChatCompletion()
    const allCompletions = stream.allChatCompletions()
    const endTime = new Date()

    for (const chatCompletion of allCompletions) {
      tracer?.trace(
        compatibleMessages,
        MODEL_ID,
        'getAIResponse',
        {
          skipTraceUpdate: true,
          tools: compatibleTools.map((tool) => tool.function.name),
          toolChoice: selectedTool?.function.name,
        },
        [startTime, endTime],
        chatCompletion,
      )
    }
    //console.debug('final reason', final.choices[0].finish_reason)

    const response = allCompletions
      .map((chatCompletion) =>
        OpenAICompatibility.unmapResponseToAtlas(
          chatCompletion.choices[0].message,
          assistant,
        ),
      )
      .flat()

    return response
  },
}
