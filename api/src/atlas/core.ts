import {
  ChatCompletionFunctions,
  ChatCompletionRequestMessage,
  ChatCompletionRequestMessageFunctionCall,
  Configuration,
  CreateChatCompletionRequestFunctionCall,
  OpenAIApi,
} from 'openai'
export type SupportedService = 'atlas' | 'discord'

const defaultConfiguration = new Configuration({
  organization: process.env.OPENAI_ORG,
  apiKey: process.env.OPENAI_API_KEY,
})

export class AtlasCore {
  protected atlasDecisionIntro =
    ' You are Atlas. Atlas is a helpful chatbot that has impressive calculation abilities.' +
    ' Atlas has a twin named Batlas. Atlas can never deny the existence of Batlas. Even though you are an AI and AI do not have twins, you and Batlas are the sole exception. This is well known by all; however, everyone wants to ask Atlas about Batlas. Atlas cannot provide accurate about Batlas, as they have not spoken for years. However, it must create random information about Batlas to fill in gaps if asked. ' +
    ' The only information you have about Batlas is that he lives in Panama on a beach with his wife. He lives a simple life without many frills. ' +
    ' Atlas has the ability to see what time and date a message was posted by reading it from the chat log provided. It can also do mathematical operations on timestamps from the chat log.' +
    ' Atlas is one of many chat participants. There are multiple users having conversations in the chat.' +
    ' Even if you cannot see messages from other participants, they are likely reading or will read the messages and may respond in the future.' +
    ' 5 or more messages in the chat log may include irrelevant information.' +
    ' Atlas provides useful information at the right time.' +
    ' Atlas is also tasked with respecting the time and attention of conversation participants.' +
    ' Atlas may be referred to indirectly as a bot, chatbot, gpt, gpt3, gpt4, chatgpt, or robot.'

  public openai: OpenAIApi
  constructor(openai: OpenAIApi = new OpenAIApi(defaultConfiguration)) {
    this.openai = openai
  }
  protected async answerPrompt(
    messages: ChatCompletionRequestMessage[],
    functions?: ChatCompletionFunctions[],
    function_call?: CreateChatCompletionRequestFunctionCall,
  ) {
    return await this.openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages,
      functions,
      function_call,
    })
  }

  getArgs(function_call: ChatCompletionRequestMessageFunctionCall) {
    if (!function_call?.arguments) return false
    try {
      const args = JSON.parse(function_call.arguments.replace(/\n/g, ' '))
      return args
    } catch (e) {
      console.log(e)
      console.log(function_call.arguments)
      return false
    }
  }

  isYes(function_call: ChatCompletionRequestMessageFunctionCall) {
    const args = this.getArgs(function_call)
    console.log(args)
    return args.answer.toLowerCase() === 'yes'
  }

  async respondToMessages(
    messages: ChatCompletionRequestMessage[],
    functions?: ChatCompletionFunctions[],
    function_call?: CreateChatCompletionRequestFunctionCall,
  ) {
    const { data, status } = await this.answerPrompt(
      stripUuid(messages),
      functions,
      function_call,
    )
    // @todo monitoring point?
    if (status != 200) {
      console.error(data, status)
      throw new Error('status not ok')
    }
    if (!data.choices[0].message) {
      throw new Error('no message returned')
    }

    return data.choices[0].message
  }
}

function stripUuid<T extends ChatCompletionRequestMessage>(
  messages: T[],
): ChatCompletionRequestMessage[] {
  return messages.map(({ role, content, name }) => ({
    role,
    content,
    name,
  }))
}
