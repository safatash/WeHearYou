export function buildWeeklyBuckets<T>(
  items: T[],
  getDate: (item: T) => Date | string | null | undefined,
  weeks = 12,
) {
  const now = new Date();
  const buckets = Array.from({ length: weeks }, (_, index) => ({
    label: `W${index + 1}`,
    count: 0,
  }));

  for (const item of items) {
    const value = getDate(item);
    if (!value) {
      continue;
    }

    const date = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(date.getTime())) {
      continue;
    }

    const diffMs = now.getTime() - date.getTime();
    const diffWeeks = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 7));

    if (diffWeeks < 0 || diffWeeks >= weeks) {
      continue;
    }

    const bucketIndex = weeks - 1 - diffWeeks;
    buckets[bucketIndex].count += 1;
  }

  return buckets;
}
