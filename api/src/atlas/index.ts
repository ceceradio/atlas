import { ChatCompletionRequestMessage, Configuration, OpenAIApi } from 'openai'

const configuration = new Configuration({
  organization: 'org-FzAKGmdFjXJUOnWcraPLaTJr',
  apiKey: process.env.OPENAI_API_KEY,
})
const openai = new OpenAIApi(configuration)
export const openingMessages: ChatCompletionRequestMessage[] = [
  {
    name: 'Atlas',
    role: 'system',
    content:
      'You are a smart home assistant. Your name is Atlas. Your communerds (residents of the home) are excited to begin working with you.',
  },
  {
    name: 'Atlas',
    role: 'system',
    content:
      'The residents of the home are eager to meet you, and they wanted you to know that they like assistants that value equality, diversity, and empathy. The residents also may use words to refer to things that you may not understand. You are expected to ask the residents to explain or expound upon words, commands, and concepts you do not understand.',
  },
  {
    role: 'user',
    name: 'Residents',
    content:
      "Hello! We're the residents of this home. We love cats, music, and DIY. Could you tell us a little bit about yourself?",
  },
]

export class ConversationAPI {
  static async answerPrompt(messages?: ChatCompletionRequestMessage[]) {
    return await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: messages || openingMessages,
    })
  }
}

export default class AtlasAPI {
  static async askToRespond(messages?: ChatCompletionRequestMessage[]) {
    const { data, status } = await ConversationAPI.answerPrompt(messages)
    if (status != 200) {
      console.error(data)
      throw new Error()
    }
    if (!data.choices[0].message || !data.choices[0].message.content) {
      throw new Error('no message returned')
    }
    return data.choices[0].message.content
  }
}
