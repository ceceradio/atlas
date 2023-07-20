import { Conversation } from '@/entity/Conversation'
import {
  ChatCompletionFunctions,
  ChatCompletionRequestMessage,
  ChatCompletionRequestMessageFunctionCall,
  ChatCompletionResponseMessage,
  Configuration,
  CreateChatCompletionRequestFunctionCall,
  OpenAIApi,
} from 'openai'
import { ChatCompletionRequestMessageWithUuid, IAPIConversation } from '..'
const atlasDecisionIntro =
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

const defaultConfiguration = new Configuration({
  organization: process.env.OPENAI_ORG,
  apiKey: process.env.OPENAI_API_KEY,
})

export type SupportedService = 'atlas' | 'discord'
export type ChatCompletionRequestMessageWithTime =
  ChatCompletionRequestMessage & { createdAt: Date }
export const openingMessages: ChatCompletionRequestMessageWithUuid[] = [
  {
    uuid: 'cafebabe1',
    name: 'System',
    role: 'system',
    content:
      'You are a text-activated smart home assistant. Your name is Atlas. Your communerds (residents of the home) are excited to begin working with you. You may respond at any time you are asked. You may also choose not to respond if it seems the Residents are not talking to you or asking you a question.',
  },
  {
    uuid: 'cafebabe2',
    name: 'System',
    role: 'system',
    content:
      'The residents of the home are eager to meet you, and they wanted you to know that they like assistants that value equality, diversity, and empathy. The residents also may use words to refer to things that you may not understand. You are expected to ask the residents to explain or expound upon words, commands, and concepts you do not understand.',
  },
  {
    uuid: 'cafebabe3',
    name: 'Residents',
    role: 'user',
    content:
      "Hello! We're the residents of this home. We love cats, music, and DIY. Could you tell us a little bit about yourself?",
  },
]

export class AtlasAPI {
  private openai: OpenAIApi
  lastShouldRespondMessage: ChatCompletionResponseMessage

  private shouldRespondPrompts = {
    discord:
      ' You must make a decision: Should Atlas add an additional message to the conversation? Call shouldAtlasRespond() to answer the question. \n' +
      ' Atlas will add a message if being directly addressed or asked a question. If Atlas has been addressed, but it has not responded, it should add a message to the conversation.\n' +
      ' Atlas will add a message to the conversation without being addressed if they believe they can add significant value without any additional information from other conversation participants.\n' +
      ' If Atlas is directly addressed and expected to answer a question but needs specific information, they can add a message to the conversation to ask for that information\n' +
      ' If Atlas has stated it will do something but has completed it yet, it should add a message to the chat, because sending a message to the chat will be part of completing the task.\n' +
      ' Call the function with `yes` as the value of `answer` if Atlas should add another message to the conversation. Call the function with `no` as `answer` if Atlas should not add another message.\n' +
      ' You must provide a value for `reason`.\n' +
      ' Ignore older messages that are no longer relevant.\n' +
      ' Ignore parts of the conversation that are not relevant to the more recent messages.\n' +
      ' You must provide the text that Atlas should respond with. If Atlas would not respond, set it to empty string.\n' +
      ' If the reason is an important message, Atlas should add the reason as a message to the conversation.\n' +
      ' If the most recent message is directly addressing Atlas, there is a high likelyhood that that is the most relevant message to this decision.\n' +
      " If the reason why Atlas should not add a message to the conversation is because it already responded to the user's messages, you should still evaluate whether the most recent message requires an answer.\n",
    atlas:
      'Read the chat exchange below. Ignore messages from system regarding topic changes.' +
      ' Should Atlas add an additional message to the conversation?' +
      ' Atlas will only add a message to the conversation if they believe they can add significant value without any additional information from other conversation participants.' +
      ' Atlas values providing contextually-rich information more than adding a greater quantity of messages.' +
      ' Atlas is also tasked with respecting the time and attention of conversation participants.' +
      ' Call the function with "yes" as the answer if Atlas should add another message to the conversation. Call the function with "no" if Atlas should not add another message. ' +
      ' You must provide a reason.',
  }

  private shouldRespondFunctions = [
    {
      name: 'shouldAtlasRespond',
      description: 'Use this function to respond.',
      parameters: {
        type: 'object',
        properties: {
          answer: {
            type: 'string',
            description:
              'Set value to `yes` if Atlas should add a message to the conversation based on the instructions given. Set value to `no` otherwise.',
          },
          reason: {
            type: 'string',
            description:
              'Describe the reason for setting answer to `yes` or `no`.',
          },
          message: {
            type: 'string',
            description:
              'Write the message that Atlas will add to the conversation. If necessary, use the value of `reason` as part of this message. This property must contain a value if `answer` is `yes`.',
          },
        },
      },
    },
  ]

  constructor(configuration?: Configuration) {
    this.openai = new OpenAIApi(configuration || defaultConfiguration)
  }

  async answerPrompt(
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

  async titleConversation(conversation: Conversation): Promise<string> {
    if (!conversation.messages || conversation.messages.length <= 0)
      throw new Error('empty')
    if (!conversation) throw new Error('Conversation not found')
    const content = conversation.toChatString()
    return (
      (
        await this.respondToMessages([
          {
            role: 'system',
            content:
              'Read the following exchange and respond only with a summarized title for the most recent topic(s) of conversation. Limit the title to 2 to 5 words. Do not respond with more than 5 words. The title should favor more recent messages, but encompass as much of the history of messages as possible. Use symbols like & and / to save space. There is a 50% chance that you will generate a humorous title.',
          },
          {
            role: 'user',
            content,
          },
        ])
      ).content || ''
    )
  }

  async discordResponse(
    messages: ChatCompletionRequestMessageWithTime[],
    continuation?: boolean,
  ): Promise<string> {
    const message = await this.getShouldRespondToMessages(
      messages,
      'discord',
      continuation,
    )

    if (!message || !message.function_call) return ''
    const args = this.getArgs(message.function_call)
    if (!this.isYes(message.function_call)) {
      try {
        if (continuation) return ''
        if (!args.reason) return ''
        if (args.message) return args.message
        return await this.getResponseReasonMessage(
          messages,
          args.reason,
          'discord',
        )
      } catch (e) {
        /* */
      }
    }
    if (!args.message) {
      // last chance to respond, buddy. lol
      const { content } = await this.respondToMessages(messages)
      return content || ''
    }
    return args.message
  }

  async shouldRespond(
    conversation: Conversation,
    service: SupportedService = 'atlas',
  ): Promise<boolean> {
    if (!conversation.messages || conversation.messages.length <= 0)
      throw new Error('empty')
    if (!conversation) throw new Error('Conversation not found')

    const chat = conversation.toChatString(5)
    const { function_call } = await this.getShouldRespondToString(chat, service)
    if (!function_call || !function_call.arguments)
      throw new Error('Should be a function call')

    return this.isYes(function_call)
  }

  async shouldRespondToMessages(
    messages: ChatCompletionRequestMessageWithTime[],
    service: SupportedService,
    continuation?: boolean,
  ): Promise<boolean> {
    const { function_call } = await this.getShouldRespondToMessages(
      messages,
      service,
      continuation,
    )
    if (!function_call) return false
    const args = this.getArgs(function_call)
    this.lastShouldRespondMessage = args.message
    return this.isYes(function_call)
  }

  async getShouldRespondToString(
    content: string,
    service: SupportedService,
    continuation?: boolean,
  ): Promise<ChatCompletionResponseMessage> {
    const message = await this.respondToMessages(
      this.getShouldRespondPrompt(
        [
          {
            role: 'user',
            content,
          },
        ],
        service,
        continuation,
      ),
      this.shouldRespondFunctions,
      { name: 'shouldAtlasRespond' },
    )

    if (!message.function_call || !message.function_call.arguments)
      throw new Error('Should be a function call')

    return message
  }

  async getShouldRespondToMessages(
    messages: ChatCompletionRequestMessageWithTime[],
    service: SupportedService,
    continuation?: boolean,
  ): Promise<ChatCompletionResponseMessage> {
    const reduceTime = (
      messages: ChatCompletionRequestMessageWithTime[],
    ): ChatCompletionRequestMessage[] => {
      return messages.map(({ role, name, createdAt, content }) => {
        return { role, name, content: `(${createdAt}): ${content}` }
      })
    }
    const message = await this.respondToMessages(
      this.getShouldRespondPrompt(reduceTime(messages), service, continuation),
      this.shouldRespondFunctions,
      { name: 'shouldAtlasRespond' },
    )

    if (!message.function_call || !message.function_call.arguments)
      throw new Error('Should be a function call')

    return message
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

  private getShouldRespondPrompt(
    content: ChatCompletionRequestMessage[],
    service: SupportedService,
    continuation?: boolean,
  ): ChatCompletionRequestMessage[] {
    const continuationString = continuation
      ? ` If Atlas recently sent a message, Atlas should only add another message if it is important, or adds significant additional explanatory information besides simply listing more things. Atlas never responds to the same message twice. If Atlas is about respond even though it already responded, it should not. Adding additional information is not as important as adding important information. If a user does not indicate how many messages they want, limit the continuation.`
      : ''
    const promptString = this.shouldRespondPrompts[service]
    return [
      {
        role: 'system',
        content: atlasDecisionIntro,
      },
      {
        role: 'system',
        content: promptString + continuationString,
      },
      ...content,
    ]
  }

  private getShouldProvideReasonPrompt(
    reason: string,
  ): ChatCompletionRequestMessage[] {
    return [
      {
        role: 'assistant',
        content: 'Atlas will not respond to the prompt because ' + reason,
      },
      {
        role: 'system',
        content: `Atlas decided not add a message to the chat because "${reason}". You have the task of composing a response, if it seems to be important, about the reason. Do not send a message Atlas was directly addressed. If atlas was directly addressed, compose a message to the user explaining the reason it cannot respond as asked. Otherwise output an no message.`,
      },
    ]
  }

  async getResponseReasonMessage(
    messages: ChatCompletionRequestMessageWithTime[],
    reason: string,
    service: SupportedService,
  ): Promise<string> {
    console.debug('PROVIDING A REASON', reason)
    const content = Conversation.toChatString(messages)
    const message = await this.respondToMessages([
      ...this.getShouldRespondPrompt([{ role: 'user', content }], service),
      ...this.getShouldProvideReasonPrompt(reason),
    ])
    if (message.content?.toLowerCase().startsWith('no')) return ''
    return message.content || ''
  }

  async respondToConversation(conversation: Conversation) {
    return this.respondToMessages(
      this.withOpeningMessages(conversation).messages,
    )
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

  withOpeningMessages(conversation: Conversation): IAPIConversation {
    const messages = openingMessages.concat(
      conversation.messages.map((message) => message.toOpenAI()),
    )
    return {
      ...conversation,
      messages,
    }
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
