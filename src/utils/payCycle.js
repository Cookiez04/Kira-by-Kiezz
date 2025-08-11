export function getPayCycleRange(referenceDate = new Date(), startDay = 1) {
  const now = new Date(referenceDate);
  const year = now.getFullYear();
  const month = now.getMonth();

  // Determine cycle start
  const start = new Date(now);
  if (now.getDate() >= startDay) {
    start.setFullYear(year, month, startDay);
  } else {
    // previous month
    start.setFullYear(year, month - 1, startDay);
  }

  // Cycle end is the day before the next cycle starts
  const nextCycleStart = new Date(start);
  nextCycleStart.setMonth(start.getMonth() + 1);
  const end = new Date(nextCycleStart);
  end.setDate(startDay - 1); // if startDay=1, this becomes day 0 of next month -> last day of prev month

  // Normalize end to end-of-day
  end.setHours(23, 59, 59, 999);
  start.setHours(0, 0, 0, 0);

  return { start, end, label: formatCycleLabel(start, end) };
}

export function formatCycleLabel(start, end) {
  const startLabel = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const endLabel = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const year = end.getFullYear();
  return `${startLabel} – ${endLabel} ${year}`;
}


