import { IAtlasEvent } from './IAtlasEvent'

export type IAtlasTransceiver = {
  sendEvent(event: IAtlasEvent): Promise<void>
}
