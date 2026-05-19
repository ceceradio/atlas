export type AtlasSocketMessage<T> = {
  type:
    | 'update'
    | 'identify'
    | 'identified'
    | 'joined'
    | 'snapshot'
    | 'message'
    | 'jobEvent'
} & T
