import { Conversation } from '@/entity/Conversation'
import {
  ChatCompletionRequestMessage,
  ChatCompletionResponseMessage,
} from 'openai'
import { openingMessages } from '.'
import { IAPIConversation, WithTime } from '..'
import { AtlasCore, SupportedService } from './core'

export class AtlasResponder extends AtlasCore {
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
    messages: WithTime<ChatCompletionRequestMessage>[],
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
    messages: WithTime<ChatCompletionRequestMessage>[],
    service: SupportedService,
    continuation?: boolean,
  ): Promise<ChatCompletionResponseMessage> {
    const reduceTime = (
      messages: WithTime<ChatCompletionRequestMessage>[],
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
        content: this.atlasDecisionIntro,
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
    messages: WithTime<ChatCompletionRequestMessage>[],
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

  withOpeningMessages(conversation: Conversation): IAPIConversation {
    const messages = openingMessages.concat(
      conversation.messages.map((message) => message.toOpenAI()),
    )
    return {
      ...conversation,
      messages,
    }
  }

  lastShouldRespondMessage: ChatCompletionResponseMessage
}
