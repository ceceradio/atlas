import { redisConfig } from '@/queue/redis'
import { JSONSchemaType, PartialSchema } from 'ajv/dist/types/json-schema'
import { createHash } from 'crypto'
import * as Redis from 'ioredis'
import OpenAI from 'openai'
import {
  ChatCompletionAssistantMessageParam,
  ChatCompletionCreateParams,
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

const VLLM_HOST = process.env.VLLM_HOST || 'host.docker.internal'
const ai = new OpenAI({
  ...defaultConfiguration,
  baseURL: `http://${VLLM_HOST}:8000/v1/`,
})
const TEMPERATURE = 0.4

let modelId: string | null = null

async function fetchCurrentModel(): Promise<string | null> {
  try {
    const res = await fetch(`http://${VLLM_HOST}:8000/v1/models`)
    if (!res.ok) return null
    const data = (await res.json()) as { data: { id: string }[] }
    return data.data[0]?.id ?? null
  } catch {
    return null
  }
}

async function getModelId(): Promise<string> {
  if (modelId) return modelId
  const id = await fetchCurrentModel()
  if (id) modelId = id
  return modelId ?? 'unknown'
}

// Resolve model on startup
fetchCurrentModel().then((id) => {
  if (id) {
    modelId = id
    console.log(`[vllm] model: ${modelId}`)
  } else {
    console.warn('[vllm] could not resolve model on startup')
  }
})

const CONTEXT_CACHE_KEY = 'vllm:max_model_len'
const TOKEN_CACHE_PREFIX = 'vllm:tokens:'
const TOKEN_CACHE_TTL = 60 * 60 * 24 // 1 day
const INPUT_CONTEXT_RATIO = 0.8

const redis = new Redis.default(redisConfig)

type TokenizeResponse = { count: number; max_model_len: number }

async function tokenize(text: string): Promise<number> {
  const hash = createHash('md5').update(text).digest('hex')
  const cacheKey = `${TOKEN_CACHE_PREFIX}${hash}`

  const cached = await redis.get(cacheKey)
  if (cached) return parseInt(cached)

  const res = await fetch(`http://${VLLM_HOST}:8000/tokenize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: await getModelId(), prompt: text }),
  })
  const data = (await res.json()) as TokenizeResponse

  // cache max_model_len as a side effect
  await redis.set(CONTEXT_CACHE_KEY, String(data.max_model_len))
  await redis.set(cacheKey, String(data.count), 'EX', TOKEN_CACHE_TTL)

  return data.count
}

async function getMaxInputTokens(): Promise<number> {
  const cached = await redis.get(CONTEXT_CACHE_KEY)
  if (cached) return Math.floor(parseInt(cached) * INPUT_CONTEXT_RATIO)

  // seed the cache via a cheap tokenize call
  await tokenize(' ')
  const seeded = await redis.get(CONTEXT_CACHE_KEY)
  return Math.floor(parseInt(seeded!) * INPUT_CONTEXT_RATIO)
}

function messageToString(msg: ChatCompletionMessageParam): string {
  return typeof msg.content === 'string'
    ? msg.content
    : JSON.stringify(msg.content)
}

async function trimToContextLimit(
  messages: ChatCompletionMessageParam[],
  tools: ChatCompletionTool[],
  maxInputTokens: number,
): Promise<ChatCompletionMessageParam[]> {
  const systemMessages = messages.filter((m) => m.role === 'system')
  const nonSystem = messages.filter((m) => m.role !== 'system')

  const [toolTokens, ...perMessageTokens] = await Promise.all([
    tokenize(JSON.stringify(tools)),
    ...messages.map((m) => tokenize(messageToString(m))),
  ])

  const systemTokens = systemMessages.reduce(
    (sum, _, i) => sum + perMessageTokens[i],
    0,
  )
  const nonSystemTokens = nonSystem.map(
    (_, i) => perMessageTokens[systemMessages.length + i],
  )

  let budget = maxInputTokens - systemTokens - toolTokens

  const kept: ChatCompletionMessageParam[] = []
  for (let i = nonSystem.length - 1; i >= 0; i--) {
    if (nonSystemTokens[i] > budget) break
    kept.unshift(nonSystem[i])
    budget -= nonSystemTokens[i]
  }

  if (kept.length < nonSystem.length) {
    console.warn(
      `[vllm] trimmed ${
        nonSystem.length - kept.length
      } message(s) to fit context limit`,
    )
  }

  return [...systemMessages, ...kept]
}

function mapUserMessage(
  message: IAtlasUserMessage,
): ChatCompletionUserMessageParam {
  return {
    name: message.name,
    content: message.content,
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

async function doGetAIResponse(
  model: string,
  userId: string,
  assistant: IAssistant,
  messages: IAtlasMessage[],
  tools: ITool[],
  transceiver?: (message: IAtlasEvent) => void,
  selectedToolName?: string,
  tracer?: ITracer,
  maxTokens?: number,
): Promise<IAtlasMessage[]> {
  const rawMessages = messages.map(VllmCompatibility.mapToOpenAI)
  const compatibleTools = tools.map((tool) => mapTool(tool))
  const maxInputTokens = await getMaxInputTokens()
  const compatibleMessages = await trimToContextLimit(
    rawMessages,
    compatibleTools,
    maxInputTokens,
  )

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
      ? { type: 'function', function: { name: selectedToolName } }
      : undefined

  const responseFormat: ChatCompletionCreateParams.ResponseFormat | undefined =
    selectedToolName ? { type: 'json_object' } : undefined

  const startTime = new Date()

  const stream = ai.beta.chat.completions.stream({
    messages: compatibleMessages,
    model,
    tools: compatibleTools.length ? compatibleTools : undefined,
    user: userId,
    temperature: TEMPERATURE,
    top_p: 0.8,
    presence_penalty: 2,
    max_tokens: maxTokens,
    stream: true,
    stream_options: { include_usage: true },
    tool_choice: selectedTool,
    response_format: responseFormat,

    top_k: 20,
    repetition_penalty: 1.05,
    min_p: 0,
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
      model,
      'getAIResponse',
      {
        skipTraceUpdate: true,
        tools: compatibleTools.map((tool) => tool.function.name),
        toolChoice: selectedToolName,
      },
      [startTime, endTime],
      chatCompletion,
    )
  }

  return allCompletions
    .map((chatCompletion) =>
      VllmCompatibility.unmapResponseToAtlas(
        chatCompletion.choices[0].message,
        assistant,
      ),
    )
    .flat()
}

export const VllmCompatibility = {
  mapToOpenAI(message: IAtlasMessage): ChatCompletionMessageParam {
    if (message.role === 'user') return mapUserMessage(message)
    if (message.role === 'assistant') return mapAssistantMessage(message)
    if (message.role === 'system') return mapSystemMessage(message)
    if (message.role === 'tool_response') return mapToolResponseMessage(message)
    throw new Error('Unknown message role')
  },
  unmapResponseToAtlas(
    message: ChatCompletionMessage,
    assistant: IAssistant,
  ): IAtlasToolCallMessage[] | IAtlasAssistantMessage {
    if (message.tool_calls)
      return message.tool_calls.map((call) => unmapToolCallMessage(call))
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
    const model = await getModelId()
    try {
      return await doGetAIResponse(
        model,
        userId,
        assistant,
        messages,
        tools,
        transceiver,
        selectedToolName,
        tracer,
        maxTokens,
      )
    } catch (err) {
      const newModel = await fetchCurrentModel()
      if (newModel && newModel !== model) {
        modelId = newModel
        await redis.del(CONTEXT_CACHE_KEY)
        console.log(`[vllm] model changed ${model} → ${newModel}, retrying`)
        return doGetAIResponse(
          newModel,
          userId,
          assistant,
          messages,
          tools,
          transceiver,
          selectedToolName,
          tracer,
          maxTokens,
        )
      }
      throw err
    }
  },
}
