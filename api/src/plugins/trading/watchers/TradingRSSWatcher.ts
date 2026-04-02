import { LangfuseTracer } from '@/atlas/ai-compat/langfuse/LangfuseTracer'
import { storage } from '@/lib/localStorage'
import { MessageFlags, User } from 'discord.js'
import { NodeHtmlMarkdown } from 'node-html-markdown'
import parse from 'rss-to-json'
import { getUrlContent } from '../../../lib/getUrlContent'
import { RSSHeadline, safeParse } from '../../../lib/safeParse'
import { AtlasDiscord } from '../../discord'
import { GetTradingReport } from '../GetTradingReport'
import { GetReportImpact } from '../TradingImpactTool'
import { ITradingWatcher } from './ITradingWatcher'
export const htmlToMarkdown = new NodeHtmlMarkdown()

export class TradingRSSWatcher implements ITradingWatcher {
  plugin: AtlasDiscord | undefined
  user: User | undefined
  timer: NodeJS.Timer | undefined = undefined
  headlinesScanned: string[]
  source: string
  pageTarget: string

  constructor(
    source: string,
    pageTarget: string,
    plugin?: AtlasDiscord,
    user?: User,
  ) {
    console.log(source)
    this.plugin = plugin
    this.user = user
    this.source = source
    this.pageTarget = pageTarget
    this.headlinesScanned =
      safeParse(storage.getItem('rssHeadlinesScanned')) ?? []
    this.startReportGenerator()
  }
  async startReportGenerator() {
    if (this.timer) this.close()
    this.timer = setInterval(() => this.checkStreams(), 1000 * 30)
    console.log('Starting report generator')
    this.checkStreams()
  }
  async checkStreams() {
    try {
      //console.debug('Checking news streams')
      const response = await parse(this.source)
      const items = response.items.slice(0, 5)
      for (const headline of items as RSSHeadline[]) {
        if (this.headlinesScanned.includes(headline.link)) return
        await this.processHeadline(headline)
        this.headlinesScanned.unshift(headline.link)
        storage.setItem(
          'rssHeadlinesScanned',
          JSON.stringify(this.headlinesScanned.slice(0, 100)),
        )
      }
    } catch (error) {
      console.error('Error checking RSS streams:', error)
    }
  }
  async processHeadline(headline: RSSHeadline) {
    const tracer = new LangfuseTracer('rss-watcher', 'trading', headline.id, {
      tags: ['headline'],
    })
    await this.user?.send({
      content: `New headline: ${headline.title} - ${headline.link}`,
      flags: MessageFlags.SuppressEmbeds,
    })
    const content = await getUrlContent(headline.link, this.pageTarget)
    const report = await GetTradingReport(
      `AP News: ${headline.title} - ${headline.link}\n\n
      ${content}`,
      tracer,
    )
    const impact = await GetReportImpact(report, tracer)
    console.log('Impact:', impact)
    if (!impact) return

    if (this.user) await this.plugin?.sendSplitUserMessage(this.user, report)
    /*
    await SendTickers(report, tracer, this.plugin, this.user)
*/
  }
  close() {
    clearInterval(this.timer)
  }
}
