import { AtlasError } from '@/app/errors'
import { Conversation } from '@/entity/Conversation'
import { ChatCompletionRequestMessage, Configuration, OpenAIApi } from 'openai'
import {
  ChatCompletionRequestMessageWithUuid,
  IAPIConversation,
  IConversation,
} from '..'

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
  async answerPrompt(messages: ChatCompletionRequestMessage[]) {
    return await this.openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages,
    })
  }

  async titleConversation(conversation: Conversation): Promise<string> {
    if (!conversation.messages || conversation.messages.length <= 0)
      throw new Error('empty')
    if (!conversation) throw new Error('Conversation not found')
    const content = conversation.toString()
    return await this.respondToMessages([
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
  }

  async respondToConversation(conversation: IConversation) {
    return this.respondToMessages(
      this.withOpeningMessages(conversation).messages,
    )
  }

  async respondToMessages(messages: ChatCompletionRequestMessage[]) {
    const { data, status } = await this.answerPrompt(stripUuid(messages))
    // @todo monitoring point?
    if (status != 200) {
      console.error(data, status)
      throw new AtlasError()
    }
    if (!data.choices[0].message || !data.choices[0].message.content) {
      throw new AtlasError('no message returned')
    }

    return data.choices[0].message.content
  }

  public withOpeningMessages(conversation: IConversation): IAPIConversation {
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
