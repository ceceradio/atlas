import { IAssistant } from '@/atlas/IAtlas'
import { SystemMessageAssistantFactory } from '../SystemMessageAssistantFactory'

export const TitleConversationAssistant: IAssistant =
  SystemMessageAssistantFactory(
    'Read the following exchange and respond only with a summarized title for the most recent topic(s) of conversation. Limit the title to 2 to 5 words. Do not respond with more than 5 words. The title should favor more recent messages, but encompass as much of the history of messages as possible. Use symbols like & and / to save space. There is a 50% chance that you will generate a humorous title.',
  )
