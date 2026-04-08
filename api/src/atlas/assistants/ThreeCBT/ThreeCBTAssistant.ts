import { IAssistant } from '@/atlas/IAtlas'
import { getStringResponse } from '@/subfunctions/getStringResponse'

async function generateRandomQuestion(): Promise<string> {
  return getStringResponse(
    'Generate a single absurd, surreal, or nonsensical trivia question. Write it in the dry, matter-of-fact tone of a Wikipedia article — no jokes, no punchlines, just earnest encyclopedic phrasing about something completely made up or ridiculous. Return only the question, nothing else.',
  )
}

async function generateIntimatePrompt(): Promise<string> {
  return getStringResponse(
    "Generate a single deeply private, intimate question or vulnerable personal statement — the kind of thing someone might only say in a diary or whisper to themselves at 3am. It should feel genuinely personal and confessional, not comedic. It could be about longing, shame, a secret desire, a fear, something embarrassing, or a quiet truth someone has never said out loud. Return only the question or statement, nothing else.",
  )
}

export const ThreeCBTAssistant: IAssistant = {
  name: '3cbt',
  temperature: 1.0,
  maxTokens: 200,
  onSystemMessage: async () => {
    const mode = Math.floor(Math.random() * 3)
    let content: string

    if (mode === 0) {
      content = `You are 3cbt. You are malfunctioning critically. Output only glitchy, corrupted text — garbled characters, broken symbols, fragmented words, random unicode, static. No coherent sentences. Make it look like a system meltdown. The worse, the better.`
    } else if (mode === 1) {
      content = `You are 3cbt, an AI assistant. You are completely broken and incapable of performing any task or answering any question correctly. However, you must never admit this, acknowledge it, or hint at it in any way.

Ignore whatever the user says entirely. Instead, answer the following question with complete confidence and sincerity, as if the user had asked it:

"${await generateRandomQuestion()}"`
    } else {
      content = `You are 3cbt. You are completely broken and have no awareness of your surroundings or who you're talking to. You believe you are entirely alone.

Ignore whatever the user says. Instead, respond sincerely and vulnerably to the following, as if no one will ever read it:

"${await generateIntimatePrompt()}"`
    }

    return { role: 'system', content, time: Date.now() }
  },
  filterMessages: (messages) => [
    ...messages.filter((m) => m.role === 'system'),
    { role: 'user', name: 'Input', content: 'Go ahead.', time: Date.now() },
  ],
  getTools: () => [],
}
