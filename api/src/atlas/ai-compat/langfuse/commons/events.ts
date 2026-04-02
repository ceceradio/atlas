import { MinimalAIContext } from '../../interfaces/AIContext'

export const LangfuseCommonEvents = {
  nonEnglish(
    ctx: MinimalAIContext,
    opts: { metadata?: any; input?: any; output?: any },
  ) {
    ctx.trace.event({
      name: 'nonEnglish',
      ...opts,
    })
    ctx.trace.update({
      tags: ['nonEnglish'],
    })
  },
}
