import { AtlasError } from '@/app/errors'
import { ChatCompletionRequestMessage, Configuration, OpenAIApi } from 'openai'
import { ChatCompletionRequestMessageWithUuid } from '..'

const configuration = new Configuration({
  organization: process.env.OPENAI_ORG,
  apiKey: process.env.OPENAI_API_KEY,
})
const openai = new OpenAIApi(configuration)
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

class ConversationAPI {
  static async answerPrompt(messages: ChatCompletionRequestMessage[]) {
    return await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages,
    })
  }
}

export default class AtlasAPI {
  static async askToRespond(messages?: ChatCompletionRequestMessage[]) {
    const { data, status } = await ConversationAPI.answerPrompt(
      stripUuid(messages || openingMessages),
    )
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
