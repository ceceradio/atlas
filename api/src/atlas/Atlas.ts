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
import { SystemMessageAssistantFactory } from './assistants/SystemMessageAssistantFactory'

const CompatLayer = process.env.LOCAL ? LocalCompatibility : OpenAICompatibility

export const Atlas = {
  processToolRequest: async <Args = unknown, ReturnType = unknown>(
    tool: ITool<Args, ReturnType>,
    systemMessage: string,
    messages: string[],
    userName?: string,
    tracer?: ITracer,
  ): Promise<ReturnType> => {
    const assistant = SystemMessageAssistantFactory(systemMessage, [tool])
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
            name: userName || 'Input Message',
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
  ): Promise<ReturnType> => {
    const totalMessages = [
      await request.assistant.onSystemMessage(request, response),
      ...request.messages.filter((message) => message.role !== 'system'),
    ]
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
        if (targetResponse) return targetResponse.content
      }
      // filter out undefined responses
      const filteredToolResponses = <IAtlasToolResponseMessage[]>(
        toolResponses.filter((toolResponse) => toolResponse)
      )
      // add tool responses to messages
      request.messages.push(...responseMessages, ...filteredToolResponses)
      response.messages.push(...responseMessages, ...filteredToolResponses)
      // recurse
      return await Atlas.getAIResponse(request, response, tracer)
    } else {
      // no tool calls, so just push to response and go
      response.messages.push(...responseMessages)
    }
    return <ReturnType>void 0
  },
}

async function runTool<Args = unknown, ReturnType = unknown>(
  request: IAtlasRequest,
  response: IAtlasResponse,
  tool: ITool<Args, ReturnType>,
  args: Args,
  id: string,
): Promise<IAtlasToolResponseMessage<ReturnType>> {
  // validate args with ajv
  // call tool

  const content = await tool.call(request, response, args)

  const toolResponse: IAtlasToolResponseMessage<ReturnType> = {
    id,
    content,
    name: tool.name,
    role: 'tool_response',
    time: Date.now(),
  }
  return toolResponse
}
