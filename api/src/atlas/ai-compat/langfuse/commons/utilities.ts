import { AIContext } from '../../interfaces/AIContext'
import { AskBooleanAbout } from '../../subfunctions/AskBooleanAbout'

export const LangfuseCommonUtilities = {
  nonEnglishTagCheck: (ctx: AIContext, text: string) => {
    AskBooleanAbout.ask(ctx, text, 'Is the source text in English?').then(
      (isEnglish) => {
        if (!isEnglish) {
          ctx.trace.update({
            tags: ['nonEnglish'],
          })
        }
      },
      console.error,
    )
  },
}
