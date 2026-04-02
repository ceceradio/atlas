import { filterUndefinedProps } from '@/lib/filterUndefinedProps'
import { LangfuseTraceClient } from 'langfuse'
import OpenAI from 'openai'
import { getLangfuse } from './getLangfuse'
import { getLangfuseOutput } from './getLangfuseOutput'
import { ITracer } from './ITracer'
import { LangfuseGenerationMetadata } from './LangfuseGenerationMetadata'
import { LangfuseGenerationOptions } from './LangfuseGenerationOptions'
import { LangfuseTraceOptionals } from './LangfuseTraceOptionals'

export class LangfuseTracer implements ITracer {
  client: LangfuseTraceClient

  constructor(
    name: string,
    userId: string,
    sessionId: string,
    optionals?: LangfuseTraceOptionals,
    id?: string,
  ) {
    const { tags, ...metadata } = optionals ?? {}
    this.client = getLangfuse().trace(
      filterUndefinedProps({
        id,
        name,
        userId,
        sessionId,
        release: 'atlas',
        version: '0.0.1',
        tags,
        metadata: filterUndefinedProps({
          ...metadata,
        }),
      }),
    )
  }

  trace(
    input: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
    model: string,
    name: string,
    optionals?: LangfuseGenerationMetadata & LangfuseGenerationOptions,
    times?: [Date, Date],
    output?: OpenAI.Chat.Completions.ChatCompletion,
    id?: string,
  ) {
    const langfuseOutput = output
      ? getLangfuseOutput(output.choices[0].message)
      : undefined
    this.client.generation(
      filterUndefinedProps({
        id,
        name,
        model,
        input,
        metadata: filterUndefinedProps({
          tools: optionals?.tools,
          toolChoice: optionals?.toolChoice,
        }),
        output: langfuseOutput,
        startTime: times?.at(0)?.toISOString(),
        endTime: times?.at(1)?.toISOString(),
        usage: output
          ? {
              promptTokens: output.usage?.prompt_tokens ?? 0,
              completionTokens: output.usage?.completion_tokens ?? 0,
              totalTokens: output.usage?.total_tokens ?? 0,
            }
          : undefined,
      }),
    )
    if (!optionals?.skipTraceUpdate) {
      this.client.update({
        input,
        output: langfuseOutput,
      })
    }
  }
}
