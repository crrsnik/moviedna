export function groupViewingHistoryByMonth(events) {
  if (!Array.isArray(events)) {
    throw new TypeError('Viewing history must be an array.')
  }

  const groups = []
  const byMonth = new Map()

  for (const event of events) {
    const watchedDate = event?.watchedDate

    if (
      typeof watchedDate !== 'string'
      || !/^\d{4}-\d{2}-\d{2}$/.test(watchedDate)
    ) {
      continue
    }

    const month = watchedDate.slice(0, 7)

    let group = byMonth.get(month)

    if (!group) {
      group = {
        month,
        events: [],
      }

      byMonth.set(month, group)
      groups.push(group)
    }

    group.events.push(event)
  }

  return groups
}
