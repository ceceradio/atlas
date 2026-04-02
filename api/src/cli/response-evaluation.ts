import { Conversation } from '@/entity/Conversation'
import { AtlasPlugins } from '@/plugins'
import { DataSource } from 'typeorm'

export default async function responseEvaluation(
  dataSource: DataSource,
  uuid: string,
): Promise<string> {
  const atlasApi = new AtlasPlugins()
  const conversation = await Conversation.get(dataSource, uuid, {
    organization: true,
    messages: true,
  })
  if (!conversation) throw new Error('no conversation found')
  const shouldAtlasRespond = await atlasApi.responder.shouldRespond(
    conversation,
  )

  return new Boolean(shouldAtlasRespond).toString()
}
