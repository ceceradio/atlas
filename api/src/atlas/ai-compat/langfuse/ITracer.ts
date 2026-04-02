import OpenAI from 'openai'
import { LangfuseGenerationMetadata } from './LangfuseGenerationMetadata'
import { LangfuseGenerationOptions } from './LangfuseGenerationOptions'

export interface ITracer {
  trace: (
    input: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
    model: string,
    name: string,
    optionals?: LangfuseGenerationMetadata & LangfuseGenerationOptions,
    times?: [Date, Date],
    output?: OpenAI.Chat.Completions.ChatCompletion,
    id?: string,
  ) => void | Promise<void>
}
