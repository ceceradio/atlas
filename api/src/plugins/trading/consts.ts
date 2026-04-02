/*
const BASE_URL = 'https://truthsocial.com'
const API_BASE_URL = 'https://truthsocial.com/api'
*/

//export const CURL_PATH = `./impersonate/linux/curl_chrome110`

export const CURL_PATH =
  'docker run --rm lwthiker/curl-impersonate:0.6-chrome curl_chrome110'

export const TS_URLS = [
  'https://truthsocial.com/api/v1/accounts/107780257626128497/statuses?exclude_replies=true&with_muted=true',
]
export const NEWS_SOURCES = ['associated-press', 'bloomberg']
export const RSS_FEEDS = [
  /*
  {
    url: 'https://rsshub.app/apnews/topics/ap-top-news',
    pageTarget: '.RichTextStoryBody',
  },
  */
  {
    url: 'https://www.federalreserve.gov/feeds/speeches.xml',
    pageTarget: '#article',
  },
]
