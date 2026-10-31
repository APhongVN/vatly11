export const MICROTEACHING_MINIMUM_DURATION_SECONDS = Object.freeze({
  v1: 240,
  v2: 300,
  v3: 300,
  v4: 300,
});

export function normalizePlayedRanges(ranges, mergeGap = 1.25) {
  if (!Array.isArray(ranges)) return [];
  const sorted = ranges
    .filter((range) => Array.isArray(range) && range.length === 2
      && Number.isFinite(range[0]) && Number.isFinite(range[1])
      && range[0] >= 0 && range[1] > range[0])
    .map(([start, end]) => [start, end])
    .sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const [start, end] of sorted) {
    const previous = merged.at(-1);
    if (previous && start - previous[1] <= mergeGap) previous[1] = Math.max(previous[1], end);
    else merged.push([start, end]);
  }
  return merged;
}

export function rangesFromTimeRanges(timeRanges) {
  const ranges = [];
  if (!timeRanges || !Number.isInteger(timeRanges.length)) return ranges;
  for (let index = 0; index < timeRanges.length; index += 1) {
    try { ranges.push([timeRanges.start(index), timeRanges.end(index)]); }
    catch { /* Ignore a range removed while the media element updates. */ }
  }
  return normalizePlayedRanges(ranges);
}

export function contiguousWatchedEnd(ranges) {
  const first = normalizePlayedRanges(ranges)[0];
  return first && first[0] <= 0.75 ? first[1] : 0;
}

export function canSeekToWatchedTime(ranges, target, tolerance = 0.25) {
  if (!Number.isFinite(target) || target < 0) return false;
  if (target <= tolerance) return true;
  const normalized = normalizePlayedRanges(ranges);
  if (normalized.some(([start, end]) => target >= start - tolerance && target <= end + tolerance)) return true;
  return target <= contiguousWatchedEnd(normalized) + tolerance;
}

export function isTimelineComplete(ranges, duration, minimumDuration) {
  if (!Number.isFinite(duration) || duration < minimumDuration || duration > 900) return false;
  const normalized = normalizePlayedRanges(ranges);
  if (normalized.length !== 1) return false;
  const [start, end] = normalized[0];
  const coveredSeconds = end - start;
  return start <= 0.75 && duration - end <= 1.25 && coveredSeconds >= duration * 0.985;
}