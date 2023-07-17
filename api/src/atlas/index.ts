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

const defaultConfiguration = new Configuration({
  organization: process.env.OPENAI_ORG,
  apiKey: process.env.OPENAI_API_KEY,
})
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

  private shouldAtlasRespondFunctions = [
    {
      name: 'shouldAtlasRespond',
      description: 'Use this function to respond.',
      parameters: {
        type: 'object',
        properties: {
          answer: {
            type: 'string',
            description: 'yes if atlas should send a message. no if not.',
          },
          reason: {
            type: 'string',
            description: 'Describe the reason for answering yes or no.',
          },
          message: {
            type: 'string',
            description:
              'The message that Atlas will add to the conversation. Use the reason string if necessary as part of this message. This property must contain a value if answer is yes.',
          },
        },
      },
    },
  ]

  async shouldAtlasRespond(conversation: Conversation): Promise<boolean> {
    if (!conversation.messages || conversation.messages.length <= 0)
      throw new Error('empty')
    if (!conversation) throw new Error('Conversation not found')

    const chat = conversation.toChatString(5)
    const { function_call } = await this.respondToMessages(
      [
        {
          role: 'system',
          content:
            'Read the chat exchange below. Ignore messages from system regarding topic changes. Should Atlas add an additional message to the conversation? Atlas will only add a message to the conversation if they believe they can add significant value without any additional information from other conversation participants. Atlas values providing contextually-rich information more than adding a greater quantity of messages. Atlas is also tasked with respecting the time and attention of conversation participants. Call the function with "yes" as the answer if Atlas should add another message to the conversation. Call the function with "no" if Atlas should not add another message. You must provide a reason.',
        },
        {
          role: 'user',
          content: chat,
        },
      ],
      this.shouldAtlasRespondFunctions,
      { name: 'shouldAtlasRespond' },
    )
    if (!function_call || !function_call.arguments)
      throw new Error('Should be a function call')
    const args = JSON.parse(function_call.arguments)
    return args.answer === 'yes'
  }

  async softResponse(
    messages: ChatCompletionRequestMessage[],
    continuation?: boolean,
  ): Promise<string> {
    //const content = Conversation.toChatString(messages)
    const message = await this._shouldAtlasRespondToMessages(
      messages,
      continuation,
    )
    console.log(message)
    if (!message || !message.function_call) return ''
    if (!this.isYes(message.function_call)) return ''
    if (!message.function_call.arguments) return ''
    const args = JSON.parse(message.function_call.arguments)
    if (!args.message) {
      const { content } = await this.respondToMessages(messages)
      return content || ''
    }
    return args.message
  }

  async shouldAtlasRespondToMessages(
    messages: ChatCompletionRequestMessage[],
  ): Promise<boolean> {
    const { function_call } = await this._shouldAtlasRespondToMessages(messages)
    if (!function_call) return false
    return this.isYes(function_call)
  }

  private async _shouldAtlasRespondToMessages(
    messages: ChatCompletionRequestMessage[],
    continuation?: boolean,
  ): Promise<ChatCompletionResponseMessage> {
    const content = Conversation.toChatString(messages)
    return this._shouldAtlasRespond(content, continuation)
  }

  isYes(function_call: ChatCompletionRequestMessageFunctionCall) {
    if (!function_call?.arguments) return false
    if (function_call.arguments === 'yes' || function_call.arguments === 'no') {
      // this is technically a failure but we'll run with it
      return function_call.arguments === 'yes'
    }
    try {
      const args = JSON.parse(function_call.arguments)
      return args.answer === 'yes'
    } catch (e) {
      console.log(e)
      console.log(function_call.arguments)
      return false
    }
  }

  private getShouldRespondPrompt(
    content: string,
    continuation?: boolean,
  ): ChatCompletionRequestMessage[] {
    return [
      {
        role: 'system',
        content:
          `Read the chat log in the next message. Atlas is a chatbot (not a user).` +
          ` Atlas is not the only chat participant. There are multiple users, potentially having a conversation, in the chat.` +
          ` Even if you cannot see messages from other participants, they are likely reading or will read the messages and may respond in the future.` +
          ` The format of the chat messages are as follows: name (role): message` +
          ` Atlas values providing contextually-rich information more than adding a greater quantity of messages.` +
          ` Atlas is also tasked with respecting the time and attention of conversation participants.` +
          ` Atlas may be referred to indirectly as a bot, chatbot, gpt, gpt3, gpt4, chatgpt, or robot.` +
          ` You must make a decision for Atlas. Should Atlas add an additional message to the conversation?` +
          ` Atlas will add a message if being directly addressed or asked a question. If Atlas has been addressed, but it has not responded, it should add a message to the conversation.` +
          ` Atlas will add a message to the conversation without being addressed if they believe they can add significant value without any additional information from other conversation participants.` +
          ` If Atlas is directly addressed and expected to answer a question but needs specific information, they can add a message to the conversation to ask for that information` +
          ` Call the function with "yes" as the answer if Atlas should add another message to the conversation. Call the function with "no" if Atlas should not add another message.` +
          ` You must provide a reason.` +
          ` You must provide the message that Atlas should respond with. If Atlas would not respond, set it to empty string.` +
          ` You must provide a value for message.` +
          continuation
            ? ` You are primarily checking to see if Atlas has anything more to say based on context.`
            : '',
      },
      {
        role: 'system',
        content,
      },
    ]
  }
  private async _shouldAtlasRespond(
    content: string,
    continuation?: boolean,
  ): Promise<ChatCompletionResponseMessage> {
    const message = await this.respondToMessages(
      this.getShouldRespondPrompt(content, continuation),
      this.shouldAtlasRespondFunctions,
      { name: 'shouldAtlasRespond' },
    )

    if (!message.function_call || !message.function_call.arguments)
      throw new Error('Should be a function call')

    return message
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
