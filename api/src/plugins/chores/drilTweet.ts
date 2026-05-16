import { Atlas } from '@/atlas/Atlas'
import { ITool } from '@/atlas/IAtlas'
import { LangfuseTracer } from '@/atlas/ai-compat/langfuse/LangfuseTracer'
import { randomBytes } from 'crypto'

function randomHexBlock(): string {
  return Array.from({ length: 16 }, () =>
    randomBytes(32)
      .toString('hex')
      .toUpperCase()
      .match(/.{1,8}/g)!
      .join(' '),
  ).join('\n')
}

const DRIL_EXAMPLES = [
  `"If your grave doesn't say "rest in peace" on it you are automatically drafted into the skeleton war"`,
  `"This Whole Thing Smacks Of Gender," i holler as i overturn my uncle's barbeque grill and turn the 4th of July into the 4th of Shit"`,
  `"everyone less mentally ill than me is Privileged, everyone more mentally ill than me is Toxic, everyone equally mentally ill to me is Cool"`,
  `"Food $200 Data $150 Rent $800 Candles $3,600 Utility $150 someone who is good at the economy please help me budget this. my family is dying"`,
  `"the middle east is complicated because its bad to support smothering orphans in hell fire but I also really want to graduate Harvard"`,
  `"if i had a nickle for every time somebody told me im a bad person i would have. god. so many nickles"`,
  `"the wise man bowed his head solemnly and spoke: "theres actually zero difference between good & bad things. you imbecile. you fucking moron."`,
  `"who the fuck is scraeming "LOG OFF" at my house. show yourself, coward. i will never log off"`,
  `"now that i have the baneful blue mark, I undertand the pain ive wrought. i was wrong to torment dog coin guys. im jealous of their million's"`,
]

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

const OPENINGS = [
  'start your tweet with "i"',
  'start your tweet with the name of a place to go in a city',
  'start your tweet with a question',
  'start your tweet with a petty complaint',
  'start your tweet with the chore in quotes',
  'start your tweet with incorrectly quoting law',
  'start your tweet with a confident declaration about food',
  'start your tweet with a vague accusation at no one in particular',
]

const EMOTIONAL_STATES = [
  'the author is righteous and vindicated',
  'the author is deeply embarrassed but pretending not to be',
  'the author is smug beyond all reason',
  'the author is furious at someone unnamed',
  'the author is confused but fully committed to what they are saying',
  'the author is convinced they are being watched',
  'the author recently won an argument that no one else knew was happening',
  'the author is in physical pain but refuses to acknowledge it',
  'the author has just been proven right about something trivial',
  'the author is filled with regret but blaming someone else',
]

const REQUIRED_ELEMENTS = [
  'include a specific dollar amount',
  'include a threat that will clearly never be carried out',
  'mention a specific food by name',
  'call someone a coward',
  'reference bones, death, or the skeleton war',
  'mention a specific job or profession',
  'include an unexplained proper noun (a name, a place, a brand)',
  'end with a sentence that contradicts the first sentence',
  'include the word "frankly"',
  'reference something that happened years ago as if it just happened',
]

function randomInstructions(): string {
  return [pick(OPENINGS), pick(EMOTIONAL_STATES), pick(REQUIRED_ELEMENTS)]
    .map((s, i) => `${i + 1}. ${s}`)
    .join('\n')
}

const SYSTEM_PROMPT_BASE = `You write tweets in the style of the twitter account @dril.

Style characteristics:
- Mostly lowercase, but occasional ALL CAPS for emphasis on random words
- Slight misspellings or odd grammar are encouraged
- 1-2 sentences max
- Brevity when its funny
- Ensure there is a through-line or connection between the beginning and end of the tweet, even if its very loose or absurd

Examples of @dril tweets:
${DRIL_EXAMPLES.map((e) => `• ${e}`).join('\n')}

Given a household chore, write ONE tweet in the style of @dril. The tweet must reference the chore anywhere at all. Do not use quotation marks around the whole tweet.
Ideally start from somewhere weird and unexpected and bring the chore in later. Use the examples as inspiration for tone and style, but be creative and don't feel constrained to the themes of the examples.
Keep the content matter down to earth and highly personal. Remember to start each tweet with a random and specific angle that isn't just "i did a chore".
Since you are provided prior tweets sometimes, you should have no problem generating completely unique content. Avoid talking about the universe, gravity, space, or other planets.`

type DrilTweetArgs = { tweet: string }

const DrilTweetTool: ITool<DrilTweetArgs, DrilTweetArgs> = {
  name: 'DrilTweet',
  description: 'Submit a dril-style tweet that references the given chore.',
  arguments: {
    type: 'object',
    properties: {
      tweet: {
        type: 'string',
        description:
          'The dril-style tweet (1-3 sentences, no surrounding quotes)',
      },
    },
    required: ['tweet'],
  },
  call: async (_req, _res, args) => args,
}

export async function generateDrilTweet(
  chore: string,
  tracer: LangfuseTracer,
  previousTweets: string[] = [],
): Promise<string> {
  const systemPrompt =
    SYSTEM_PROMPT_BASE +
    '\n\n' +
    randomHexBlock() +
    '\n\n# Additional instructions (all three are required):\n\n' +
    randomInstructions()

  const messages =
    previousTweets.length > 0
      ? [
          `Tweets you have already written this week (do not repeat the same vibe, structure, or punchline):\n${previousTweets
            .map((t) => `- ${t}`)
            .join('\n')}`,
          `Chore: ${chore}`,
        ]
      : [`Chore: ${chore}`]

  const BANNED = ['universe', 'gravity']
  let tweet = ''
  for (let attempt = 0; attempt < 4; attempt++) {
    const result = await Atlas.processToolRequest(
      DrilTweetTool,
      systemPrompt,
      messages,
      undefined,
      tracer,
      0.9,
    )
    tweet = result.tweet
    if (!BANNED.some((w) => tweet.toLowerCase().includes(w))) break
    console.log(
      `generateDrilTweet: banned word found, regenerating (attempt ${
        attempt + 1
      })`,
    )
  }
  return tweet
}
