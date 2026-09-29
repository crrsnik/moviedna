export class ViewingHistoryError extends Error {
  constructor(code) {
    super(code)
    this.name = 'ViewingHistoryError'
    this.code = code
  }
}

export function toViewingHistoryError(error) {
  if (error instanceof ViewingHistoryError) return error
  return new ViewingHistoryError('unavailable')
}
