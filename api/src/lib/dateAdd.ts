/**
 * Adds time to a date. Modelled after MySQL DATE_ADD function.
 * Example: dateAdd(new Date(), 'minute', 30)  //returns 30 minutes from now.
 * https://stackoverflow.com/a/1214753/18511
 *
 * @param date  Date to start with
 * @param amount  Number of units of the given interval to add.
 * @param unit  One of: year, quarter, month, week, day, hour, minute, second
 */
export function dateAdd(
  date: Date,
  amount: number,
  unit:
    | 'year'
    | 'quarter'
    | 'month'
    | 'week'
    | 'day'
    | 'hour'
    | 'minute'
    | 'second',
) {
  if (!(date instanceof Date)) throw new Error('Invalid date passed')
  const ret = new Date(date) //don't change original date
  const checkRollover = function () {
    if (ret.getDate() != date.getDate()) ret.setDate(0)
  }
  switch (String(unit).toLowerCase()) {
    case 'year':
      ret.setFullYear(ret.getFullYear() + amount)
      checkRollover()
      break
    case 'quarter':
      ret.setMonth(ret.getMonth() + 3 * amount)
      checkRollover()
      break
    case 'month':
      ret.setMonth(ret.getMonth() + amount)
      checkRollover()
      break
    case 'week':
      ret.setDate(ret.getDate() + 7 * amount)
      break
    case 'day':
      ret.setDate(ret.getDate() + amount)
      break
    case 'hour':
      ret.setTime(ret.getTime() + amount * 3600000)
      break
    case 'minute':
      ret.setTime(ret.getTime() + amount * 60000)
      break
    case 'second':
      ret.setTime(ret.getTime() + amount * 1000)
      break
    default:
      throw new Error('Invalid date unit passed')
  }
  return ret
}

export function dateSubtract(
  date: Date,
  amount: number,
  unit:
    | 'year'
    | 'quarter'
    | 'month'
    | 'week'
    | 'day'
    | 'hour'
    | 'minute'
    | 'second',
) {
  return dateAdd(date, -amount, unit)
}
