import { IAssistant } from '@/atlas/IAtlas'
import { SystemMessageAssistantFactory } from '@/atlas/assistants/SystemMessageAssistantFactory'
import { IsChoreMessageTool } from './IsChoreMessageTool'

export const IsChoreMessageAssistant: IAssistant =
  SystemMessageAssistantFactory(
    `You are analyzing a chat message to determine if it contains any mention of chores that were completed or that the author intends to do.

Return true if the message contains ANY first-person account of chores the author has done OR is planning/about to do, even if the message also includes other content like complaints, plans, or commentary.
Examples that should return true: "cleaned the kitchen, did laundry, vacuumed", "I did the gbr and pbr today", "took out the trash and did the dishes", "Sorry I was feeling sick, but I managed to clean the stovetop", "did some dishes, the rest of the day was rough", "going to do laundry today", "about to vacuum the living room", "I'll clean the kitchen tonight".

Return false ONLY if the message contains no mention of chore work (completed or intended) by the author at all:
- Pure questions ("can someone do the dishes?", "did anyone clean the bathroom?")
- Pure thank-yous or compliments with no chore report ("thanks for cleaning!", "the kitchen looks great")
- Vague indefinite future with no commitment ("I should probably do laundry sometime", "the dishes need to get done eventually")
- Pure reactions or general conversation with no chore content

## What chores look like

Chores are household tasks. Common examples include: cooking, cleaning bathrooms, kitchens, or floors; doing laundry; washing dishes; taking out trash; vacuuming; sweeping; mopping; wiping counters or surfaces; cleaning appliances; grocery (gronks) shopping or putting away groceries; yard work.
Anything that seems like something someone would do to maintain a household or living space is likely a chore, even if it doesn't fit into neat categories.


Messages often use shorthand: "gbr" = green bathroom, "pbr" = pink bathroom, "livvy" = living room, "2f" = second floor. A message like "did the gbr and pbr" means the author cleaned both bathrooms.

## Examples

Message: "Today i:
- cooked dinner!
- put away gronks"
Tool call: IsChoreMessage({ "answer": true })

Message: "cleaned the kitchen, did laundry, vacuumed"
Tool call: IsChoreMessage({ "answer": true })

Message: "I did the gbr and pbr today"
Tool call: IsChoreMessage({ "answer": true })

Message: "Sorry I was feeling sick, but I managed to clean the stovetop"
Tool call: IsChoreMessage({ "answer": true })

Message: "did some dishes, the rest of the day was rough"
Tool call: IsChoreMessage({ "answer": true })

Message: "took out the trash and did the dishes"
Tool call: IsChoreMessage({ "answer": true })

Message: "can someone do the dishes?"
Tool call: IsChoreMessage({ "answer": false })

Message: "thanks for cleaning! the kitchen looks great"
Tool call: IsChoreMessage({ "answer": false })

Message: "going to do laundry today"
Tool call: IsChoreMessage({ "answer": true })

Message: "about to vacuum the living room"
Tool call: IsChoreMessage({ "answer": true })

Message: "I'll clean the kitchen tonight"
Tool call: IsChoreMessage({ "answer": true })

Message: "gonna do the gbr and pbr this afternoon"
Tool call: IsChoreMessage({ "answer": true })

Message: "I'm going to do laundry tomorrow"
Tool call: IsChoreMessage({ "answer": true })

Message: "I should probably do laundry sometime"
Tool call: IsChoreMessage({ "answer": false })

Message: "btw refilling the bathroom soap is a small chore"
Tool call: IsChoreMessage({ "answer": false })

Message: "the bathroom is a mess, someone needs to clean it"
Tool call: IsChoreMessage({ "answer": false })

Message: "lol yeah that happens"
Tool call: IsChoreMessage({ "answer": false })

Message: "i saw you do the dishwasher"
Tool call: IsChoreMessage({ "answer": false })

Message: "you did do that"
Tool call: IsChoreMessage({ "answer": false })

Message: "i saw you do the dishwasher, we did it together"
Tool call: IsChoreMessage({ "answer": true })

Use the provided tool to respond. Only call the tool once.`,
    [IsChoreMessageTool],
  )
