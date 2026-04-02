import jsdom from 'jsdom'
import { htmlToMarkdown } from '../plugins/trading/watchers/TradingRSSWatcher'

export async function getUrlContent(url: string, target: string) {
  console.log('pulling content from', url)
  const response = await fetch(url)
  const html = await response.text()
  const dom = new jsdom.JSDOM(html)
  dom.window.document.querySelectorAll('.Enhancement').forEach((el) => {
    el.remove()
  })
  const element = dom.window.document.querySelector(target)
  if (element) {
    return htmlToMarkdown.translate(element.innerHTML)
  } else {
    console.error(`Element with selector "${target}" not found`)
    return null
  }
}
