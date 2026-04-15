import Ajv from 'ajv'
import {
  IAtlasCallToolRequest,
  IAtlasMessage,
  IAtlasRequest,
  IAtlasResponse,
  IAtlasToolCallMessage,
  IAtlasToolResponseMessage,
  ITool,
} from './IAtlas'
import { ITracer } from './ai-compat/langfuse/ITracer'
import { LocalCompatibility } from './ai-compat/openai/local'
import { OpenAICompatibility } from './ai-compat/openai/openai'
import { VllmCompatibility } from './ai-compat/openai/vllm'
import { SystemMessageAssistantFactory } from './assistants/SystemMessageAssistantFactory'

const ajv = new Ajv()

function resolveCompatLayer() {
  const local = process.env.LOCAL
  if (local === 'vllm') return VllmCompatibility
  if (local) return LocalCompatibility
  return OpenAICompatibility
}
const CompatLayer = resolveCompatLayer()

export const Atlas = {
  processToolRequest: async <Args = unknown, ReturnType = unknown>(
    tool: ITool<Args, ReturnType>,
    systemMessage: string,
    messages: string[],
    userName?: string,
    tracer?: ITracer,
    temperature = 0.1,
  ): Promise<ReturnType> => {
    const assistant = SystemMessageAssistantFactory(
      systemMessage,
      [tool],
      temperature,
    )
    const request: IAtlasCallToolRequest<Args, ReturnType> = {
      messages: [
        {
          role: 'system',
          content: systemMessage,
          time: Date.now(),
        },
        ...messages.map(
          (content): IAtlasMessage => ({
            role: 'user',
            name: userName || '',
            content,
            time: Date.now(),
          }),
        ),
      ],
      currentUser: {
        id: 'system',
        name: 'Tool Request User',
      },
      assistant,
      tool,
    }

    const response = await Atlas.getAIResponse(request, undefined, tracer)

    return response as ReturnType
  },

  processRequest: async (
    request: IAtlasRequest,
    tracer?: ITracer,
  ): Promise<IAtlasResponse> => {
    const response: IAtlasResponse = { messages: [] }

    await Atlas.getAIResponse(request, response, tracer)

    return response
  },

  getAIResponse: async <
    RequestType extends IAtlasRequest = IAtlasRequest,
    ReturnType = RequestType extends IAtlasCallToolRequest<unknown, infer R>
      ? Promise<R>
      : Promise<void>,
  >(
    request: RequestType,
    response: IAtlasResponse = { messages: [] },
    tracer?: ITracer,
    _validationRetries = 0,
  ): Promise<ReturnType> => {
    const rawMessages = [
      await request.assistant.onSystemMessage(request, response),
      ...request.messages.filter((message) => message.role !== 'system'),
    ]
    const totalMessages = request.assistant.filterMessages
      ? await request.assistant.filterMessages(rawMessages)
      : rawMessages
    const tools =
      'tool' in request ? [request.tool] : request.assistant.getTools()

    const responseMessages = await CompatLayer.getAIResponse(
      request.currentUser.id,
      request.assistant,
      totalMessages,
      tools,
      request.transceiver
        ? (event) => request.transceiver?.sendEvent(event)
        : undefined,
      'tool' in request ? request.tool.name : undefined,
      tracer,
      request.assistant.temperature,
      request.assistant.maxTokens,
    )

    const toolCalls = <IAtlasToolCallMessage[]>(
      responseMessages.filter((message) => message.role === 'tool_call')
    )

    // if there are tool calls to make, make them
    if (toolCalls.length > 0) {
      const toolResponses = await Promise.all(
        toolCalls
          .filter((toolCall) => {
            const tool = tools.find((tool) => tool.name === toolCall.name)
            if (!tool) return false
            return true
          })
          .map(async (toolCall) => {
            const tool = tools.find((tool) => tool.name === toolCall.name)
            if (!tool) throw new Error('Tool not found. Should not occur.')
            return await runTool(
              request,
              response,
              tool,
              toolCall.args,
              toolCall.id,
            )
          }),
      )
      // if we have a target tool to call and return the response from, do so
      if ('tool' in request) {
        // if we have a tool call for the indicated tool, return the response
        const targetResponse = toolResponses.find(
          (
            toolResponse,
          ): toolResponse is IAtlasToolResponseMessage<ReturnType> =>
            toolResponse && toolResponse.name === request.tool.name,
        )
        if (targetResponse && !targetResponse._validationError)
          return targetResponse.content
      }
      // filter out undefined responses
      const filteredToolResponses = <IAtlasToolResponseMessage[]>(
        toolResponses.filter((toolResponse) => toolResponse)
      )
      // add tool responses to messages
      request.messages.push(...responseMessages, ...filteredToolResponses)
      response.messages.push(...responseMessages, ...filteredToolResponses)
      // count validation errors in this batch and enforce max retries
      const validationErrors = filteredToolResponses.filter(
        (r) => r._validationError,
      ).length
      if (validationErrors > 0) {
        if (_validationRetries + validationErrors > 3)
          throw new Error(
            `Max tool validation retries (3) exceeded for tools: ${filteredToolResponses
              .filter((r) => r._validationError)
              .map((r) => r.name)
              .join(', ')}`,
          )
        return await Atlas.getAIResponse(
          request,
          response,
          tracer,
          _validationRetries + validationErrors,
        )
      }
      // recurse
      return await Atlas.getAIResponse(request, response, tracer)
    } else {
      // no tool calls, so just push to response and go
      response.messages.push(...responseMessages)
    }
    return <ReturnType>void 0
  },
}

function coerceStringifiedArgs(
  args: unknown,
  schema: Record<string, unknown>,
): unknown {
  if (!args || typeof args !== 'object' || Array.isArray(args)) return args
  const properties = schema.properties as
    | Record<string, { type?: string }>
    | undefined
  if (!properties) return args
  const coerced = { ...(args as Record<string, unknown>) }
  for (const [key, propSchema] of Object.entries(properties)) {
    const value = coerced[key]
    if (
      typeof value === 'string' &&
      (propSchema.type === 'array' || propSchema.type === 'object')
    ) {
      try {
        coerced[key] = JSON.parse(value)
      } catch {
        /* leave as-is, AJV will catch it */
      }
    }
  }
  return coerced
}

async function runTool<Args = unknown, ReturnType = unknown>(
  request: IAtlasRequest,
  response: IAtlasResponse,
  tool: ITool<Args, ReturnType>,
  _args: Args,
  id: string,
): Promise<IAtlasToolResponseMessage<ReturnType>> {
  let args: Args = _args
  args = coerceStringifiedArgs(
    args,
    tool.arguments as Record<string, unknown>,
  ) as Args
  const validate = ajv.compile(tool.arguments as object)
  const valid = validate(args)
  if (!valid) {
    const errors = ajv.errorsText(validate.errors)
    console.warn(`Tool ${tool.name} received invalid args:`, errors, args)
    return {
      id,
      content:
        `Error: invalid arguments. ${errors}. Please call the tool again with the correct arguments.` as ReturnType,
      name: tool.name,
      role: 'tool_response',
      time: Date.now(),
      _validationError: true,
    }
  }

  const content = await tool.call(request, response, args)
  return {
    id,
    content,
    name: tool.name,
    role: 'tool_response',
    time: Date.now(),
  } satisfies IAtlasToolResponseMessage<ReturnType>
}
