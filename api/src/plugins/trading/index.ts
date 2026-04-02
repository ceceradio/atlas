import { User } from 'discord.js'
import { AtlasPlugin } from '../AtlasPlugin'
import { AtlasDiscord } from '../discord'
import { RSS_FEEDS } from './consts'
import { ITradingWatcher } from './watchers/ITradingWatcher'
import { TradingRSSWatcher } from './watchers/TradingRSSWatcher'

export class AtlasTrading implements AtlasPlugin {
  watchers: ITradingWatcher[] = []

  async close() {
    console.log('Closing AtlasTrading watchers')
    this.watchers.forEach((watcher) => watcher.close())
    this.watchers = []
  }

  async registerDiscord(plugin: AtlasDiscord, user: User) {
    /*
    TS_URLS.forEach((url) => {
      const watcher = new TradingTruthSocialWatcher(url, plugin, user)
      this.watchers.push(watcher)
    })
      */
    /*
    NEWS_SOURCES.forEach((source) => {
      const watcher = new TradingNewsWatcher(source, plugin, user)
      this.watchers.push(watcher)
    })
      */
    RSS_FEEDS.forEach(({ url, pageTarget }) => {
      const watcher = new TradingRSSWatcher(url, pageTarget, plugin, user)
      this.watchers.push(watcher)
    })
    //user.send('Starting TradingWatcher')
  }
}

export type TruthSocialTweet = {
  id: string
  created_at: string
  in_reply_to_id: string | null
  quote_id: string | null
  in_reply_to_account_id: string | null
  sensitive: boolean
  spoiler_text: string
  visibility: 'public' | 'private' | 'unlisted' | 'direct'
  language: string
  uri: string
  url: string
  content: string
  account: {
    id: string
    username: string
    acct: string
    display_name: string
    locked: boolean
    bot: boolean
    discoverable: boolean
    group: boolean
    created_at: string
    note: string
    url: string
    avatar: string
    avatar_static: string
    header: string
    header_static: string
    followers_count: number
    following_count: number
    statuses_count: number
    last_status_at: string
    verified: boolean
    location: string
    website: string
    unauth_visibility: boolean
    chats_onboarded: boolean
    feeds_onboarded: boolean
    accepting_messages: boolean
    show_nonmember_group_statuses: boolean | null
    //emojis: any[]
    //fields: any[]
    tv_onboarded: boolean
    tv_account: boolean
  }
  /*
  media_attachments: any[]
  mentions: any[]
  tags: any[]
  card: any | null
  group: any | null
  quote: any | null
  in_reply_to: any | null
  reblog: any | null
  sponsored: boolean
  replies_count: number
  reblogs_count: number
  favourites_count: number
  favourited: boolean
  reblogged: boolean
  muted: boolean
  pinned: boolean
  bookmarked: boolean
  poll: any | null
  emojis: any[]
  */
}
