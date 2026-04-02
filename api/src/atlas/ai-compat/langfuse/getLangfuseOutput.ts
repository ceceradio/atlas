import OpenAI from 'openai'

export function getLangfuseOutput(
  message: OpenAI.Chat.Completions.ChatCompletionMessage,
) {
  if (
    (!message.tool_calls || message.tool_calls.length === 0) &&
    message.content
  )
    return message.content
  return message
}
