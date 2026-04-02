export interface ITradingWatcher {
  close: () => Promise<void> | void
}
