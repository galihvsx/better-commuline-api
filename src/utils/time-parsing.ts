export function parseTimeToTimestamp(timeStr: string, referenceDate?: Date): Date {
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/
  const match = timeStr.match(timeRegex)
  
  if (!match) {
    throw new Error(`Invalid time format: ${timeStr}. Expected HH:mm format.`)
  }
  
  const hours = parseInt(match[1], 10)
  const minutes = parseInt(match[2], 10)
  
  const date = referenceDate ? new Date(referenceDate) : new Date()
  
  date.setUTCHours(hours - 7, minutes, 0, 0)
  
  return date
}
