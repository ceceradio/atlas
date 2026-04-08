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
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'host.docker.internal'
const ai = new OpenAI({
  ...defaultConfiguration,
  baseURL: `http://${OLLAMA_HOST}:11434/v1/`,
})
const TEMPERATURE = 0.1
//const MODEL_ID = 'llama3.1:8b'
//const MODEL_ID = 'mistral'
//const MODEL_ID = 'mixtral:8x7b'
//const MODEL_ID = 'llama3.2:3b'
//const MODEL_ID = 'gpt-4.1-mini'

//const MODEL_ID = 'devstral-small-2:latest'
//const MODEL_ID = 'qwen2.5-coder:7b'
//const MODEL_ID = 'mistral:latest'
//const MODEL_ID = 'llama3.1:8b'
const MODEL_ID = 'gemma4:latest'

export type ClairaChatCompletionMessageParam =
  | ChatCompletionSystemMessageParam
  | ChatCompletionUserMessageParam
  | ChatCompletionAssistantMessageParam
  | ChatCompletionToolMessageParam

export interface ClairaChatCompletionUserMessageParam
  extends ChatCompletionUserMessageParam {
  name?: string
}

type PlaintextToolCall = { name: string; arguments: unknown }

// Replace literal newlines inside JSON string values only (not between tokens)
function escapeNewlinesInJsonStrings(s: string): string {
  let result = ''
  let inString = false
  let escaped = false
  for (const char of s) {
    if (escaped) {
      result += char
      escaped = false
    } else if (char === '\\' && inString) {
      result += char
      escaped = true
    } else if (char === '"') {
      result += char
      inString = !inString
    } else if (inString && char === '\n') {
      result += '\\n'
    } else if (inString && char === '\r') {
      result += '\\r'
    } else {
      result += char
    }
  }
  return result
}

function tryParseToolCalls(content: string): PlaintextToolCall[] | null {
  try {
    const parsed = JSON.parse(content)
    // [{"name": "Foo", "arguments": {...}}, ...]
    if (Array.isArray(parsed) && parsed.every((p) => p.name && p.arguments))
      return parsed
    // {"name": "Foo", "arguments": {...}}
    if (parsed.name && parsed.arguments) return [parsed]
  } catch {
    /* not JSON */
  }

  // FunctionName({...}) — may be preceded by preamble text
  const fnCallMatch = content.match(/(\w+)\((\{[\s\S]*\})\)/)
  if (fnCallMatch) {
    const raw = fnCallMatch[2]
    for (const candidate of [raw, escapeNewlinesInJsonStrings(raw)]) {
      try {
        return [{ name: fnCallMatch[1], arguments: JSON.parse(candidate) }]
      } catch {
        /* try next candidate */
      }
    }
  }

  return null
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

export const LocalCompatibility = {
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

    // some models return tool calls as plaintext in the content field
    if (message.content) {
      const content = message.content.trim()
      const parsed = tryParseToolCalls(content)
      if (parsed) {
        console.warn(
          'Model returned tool call(s) as plaintext — parsing manually',
        )
        return parsed.map((p, i) => ({
          id: `plaintext-${Date.now()}-${i}`,
          role: 'tool_call' as const,
          name: p.name,
          args: p.arguments,
          time: Date.now(),
        }))
      }
    }

    return unmapAssistantMessage(message, assistant)
  },
  getAIResponse: async (
    userId: string,
    assistant: IAssistant,
    messages: IAtlasMessage[],
    tools: ITool[],
    transceiver?: (message: IAtlasEvent) => void,
    selectedToolName?: string,
    tracer?: ITracer,
    temperature?: number,
    maxTokens?: number,
  ): Promise<IAtlasMessage[]> => {
    const compatibleMessages = messages.map(LocalCompatibility.mapToOpenAI)
    const compatibleTools = tools.map((tool) => mapTool(tool))

    if (selectedToolName) {
      const systemMessage = compatibleMessages.find((m) => m.role === 'system')
      const directive = `\n\nYou MUST respond by calling the following tool and nothing else: ${selectedToolName}. Do not write any explanatory text — only call the tool.`
      if (systemMessage) {
        systemMessage.content = (systemMessage.content as string) + directive
      } else {
        compatibleMessages.unshift({
          role: 'system',
          content: directive.trim(),
        })
      }
    }

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
      temperature: temperature ?? TEMPERATURE,
      max_tokens: maxTokens,
      stream: true,
      stream_options: { include_usage: true },
      tool_choice: selectedTool,
    })
    if (transceiver) {
      stream.on('content', (_delta, snapshot) =>
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

    const response = allCompletions
      .map((chatCompletion) =>
        LocalCompatibility.unmapResponseToAtlas(
          chatCompletion.choices[0].message,
          assistant,
        ),
      )
      .flat()

    return response
  },
}
