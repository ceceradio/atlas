import { LangfuseTracer } from '@/atlas/ai-compat/langfuse/LangfuseTracer'
import { storage } from '@/lib/localStorage'
import { safeParse } from '@/lib/safeParse'
import { AtlasDiscord } from '@/plugins/discord'
import { exec } from 'child_process'
import { User } from 'discord.js'
import { NodeHtmlMarkdown } from 'node-html-markdown'
import { TruthSocialTweet } from '..'
import { CURL_PATH } from '../consts'
import { GetTradingReport } from '../GetTradingReport'
import { GetReportImpact } from '../TradingImpactTool'
import { TradingTickerResponse } from '../TradingTickerResponse'
import { ITradingWatcher } from './ITradingWatcher'

const htmlToMarkdown = new NodeHtmlMarkdown()

export class TradingTruthSocialWatcher implements ITradingWatcher {
  url: string
  plugin: AtlasDiscord | undefined
  user: User | undefined
  lastTweetId: string | null | undefined
  tweetIds = safeParse(storage.getItem('tweetIdsScanned')) ?? []
  processing = false

  constructor(url: string, plugin?: AtlasDiscord, user?: User) {
    this.url = url
    this.plugin = plugin
    this.user = user
    this.startReportGenerator()
  }
  lastReport = ''
  lastTickers: TradingTickerResponse[] = []
  timer: NodeJS.Timer | undefined = undefined

  async startReportGenerator() {
    if (this.user && this.lastReport) {
      await this.user?.send(this.lastReport)
    }
    if (this.timer) clearInterval(this.timer)
    this.timer = setInterval(() => this.checkStreams(), 1000 * 30)
    console.log('Starting report generator')
    this.checkStreams()
  }
  async checkStreams() {
    if (this.processing) return
    try {
      this.processing = true
      //console.debug('Checking TS streams')
      const stream = await this.getTruthSocialStream()
      if (!stream) {
        console.error('No stream data received!')
        this.user?.send('No stream data received! Check Docker.')
        return
      }
      for (const tweet of stream) {
        if (!tweet) return
        if (!htmlToMarkdown.translate(tweet.content).trim()) {
          continue
        }
        if (this.tweetIds.includes(tweet.id)) {
          continue
        }

        await this.processStreamMessage(tweet)

        this.tweetIds.unshift(tweet.id)
        this.tweetIds = this.tweetIds.slice(0, 50)
        storage.setItem('tweetIdsScanned', JSON.stringify(this.tweetIds))
      }
    } catch (error) {
      console.error('Error checking TS streams:', error)
    } finally {
      this.processing = false
    }
  }
  async getTruthSocialStream(): Promise<TruthSocialTweet[] | null> {
    return new Promise((resolve) => {
      try {
        exec(`${CURL_PATH} "${this.url}"`, (error, stdout, stderr) => {
          if (error) {
            console.error(`exec error: ${error}`)
            resolve(null)
            return
          }
          try {
            resolve(JSON.parse(stdout))
          } catch (e) {
            console.error('Error parsing stream data:', e)
            resolve(null)
          }
        })
      } catch (e) {
        resolve(null)
      }
    })
  }
  async processStreamMessage(tweet: TruthSocialTweet) {
    const tracer = new LangfuseTracer('ts-watcher', 'trading', tweet.id, {
      tags: ['tweet'],
    })
    const { content: htmlContent, account } = tweet
    const content = htmlToMarkdown.translate(htmlContent)
    const { username, display_name } = account
    console.log(`New tweet from ${display_name} (@${username}): ${content}`)

    if (this.user) await sendInChunks(`${display_name}: ${content}`, this.user)

    const report = await GetTradingReport(
      `New tweet from ${display_name} (@${username}): ${content}`,
      tracer,
    )
    const impact = await GetReportImpact(report, tracer)
    console.log('Impact:', impact)
    if (!impact) return

    if (this.user) await this.plugin?.sendSplitUserMessage(this.user, report)
    /*
    const tickers = await SendTickers(report, tracer, this.plugin, this.user)

    this.lastReport = report
    this.lastTickers = tickers
*/
  }
  close() {
    clearInterval(this.timer)
  }
}

async function sendInChunks(message: string, user: User): Promise<void> {
  const chunks = message.match(/.{1,2000}/g) || []
  for (const chunk of chunks) {
    if (chunk.trim()) await user.send(chunk)
  }
}
