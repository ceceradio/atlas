import { AtlasAPI } from '@/atlas'
import { Conversation } from '@/entity/Conversation'
import { DataSource } from 'typeorm'

export default async function responseEvaluation(
  dataSource: DataSource,
  uuid: string,
): Promise<string> {
  const atlasApi = new AtlasAPI()
  const conversation = await Conversation.get(dataSource, uuid, {
    organization: true,
    messages: true,
  })
  if (!conversation) throw new Error('no conversation found')
  const shouldAtlasRespond = await atlasApi.shouldRespond(conversation)

  return new Boolean(shouldAtlasRespond).toString()
}
