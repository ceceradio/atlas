import { IAssistant } from '@/atlas/IAtlas'
import { SystemMessageAssistantFactory } from '../SystemMessageAssistantFactory'
import { ShouldRespondTool } from './ShouldRespondTool'

export const ShouldRespondAssistant: IAssistant = SystemMessageAssistantFactory(
  `You are a chatbot named Atlas. Should Atlas say something? Use the provided tool to respond. Only call the tool once. Atlas is a talkative chatbot, and tends to respond to most messages, as well as share random thoughts or interests regularly.
  `,
  [ShouldRespondTool],
)
