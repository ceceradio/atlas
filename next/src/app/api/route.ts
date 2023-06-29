import { NextResponse } from 'next/server'
import { ChatCompletionRequestMessage, Configuration, OpenAIApi } from 'openai'
const configuration = new Configuration({
  organization: 'org-FzAKGmdFjXJUOnWcraPLaTJr',
  apiKey: process.env.OPENAI_API_KEY,
})
const openai = new OpenAIApi(configuration)
const openingMessages: ChatCompletionRequestMessage[] = [
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
      'The residents of the home are eager to meet you, and they wanted you to know that they like assistants that value equality, diversity, and empathy. The residents also may use words to refer to things that you may not understand. You are expected to ask the residents about words and concepts you do not understand.',
  },
  {
    role: 'user',
    name: 'Residents',
    content:
      "Hello! We're the residents of this home. We love cats, music, and DIY. Could you tell us a little bit about yourself?",
  },
]

class ConversationAPI {
  static async get(messages?: ChatCompletionRequestMessage[]) {
    return await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: messages || openingMessages,
    })
  }
}

export async function GET(request: Request) {
  try {
    const { data, status } = await ConversationAPI.get()
    if (status != 200) {
      console.error(data)
      throw new Error()
    }
    if (!data.choices[0].message) {
      throw new Error('no message returned')
    }
    const newQuestion: ChatCompletionRequestMessage = {
      role: 'user',
      name: 'Residents',
      content:
        'If my address is 300 Manning Blvd, albany, ny 12206 what are the latitude and longitude coordinates of my house?',
    }
    const newPrompt = openingMessages.concat([
      data.choices[0].message,
      newQuestion,
    ])
    {
      const { data, status } = await ConversationAPI.get(newPrompt)
      if (status != 200) {
        console.error(data)
        throw new Error()
      }
      return NextResponse.json({ data })
    }
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error })
  }
}
