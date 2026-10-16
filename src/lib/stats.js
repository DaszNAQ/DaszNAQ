/**
 * Số liệu GỐC lấy trực tiếp từ GitHub (không còn công thức trọng số):
 *  - explorer    : số ngôn ngữ khác nhau dùng trong các repo của bạn
 *  - builder     : số repo bạn tự tạo (không tính fork)
 *  - openSource  : stars + forks nhận được + PR đã merge vào repo người khác
 *  - consistency : số repo có commit trong 12 tháng gần nhất
 *  - debugger    : tổng số issue đang mở trên các repo của bạn
 */
export function calculateStats(profile) {
  const {
    publicRepos = 0,
    originalRepos = publicRepos,
    activeRepos = 0,
    mergedPRs = 0,
    stars = 0,
    forks = 0,
    openIssues = 0,
    languages = [],
  } = profile;

  return {
    consistency: activeRepos,
    explorer: languages.length,
    builder: originalRepos,
    openSource: stars + forks + mergedPRs,
    debugger: openIssues,
  };
}

/** Bar fill against the peak among stats shown on this card. */
export function relativeFill(value, peak, width) {
  if (peak <= 0 || width <= 0) return 0;
  const v = Math.max(0, Number(value) || 0);
  return Math.max(0, Math.min(width, Math.round((v / peak) * width)));
}

/** 0–999 as-is; 1000+ as k (e.g. 1200 → 1.2k, 10000 → 10k). */
export function formatStatValue(n) {
  const v = Math.max(0, Number(n) || 0);
  if (v < 1000) return String(v);
  if (v < 10000) {
    const tenths = Math.round(v / 100) / 10;
    return `${tenths % 1 === 0 ? tenths.toFixed(0) : tenths.toFixed(1)}k`;
  }
  if (v < 1000000) return `${Math.round(v / 1000)}k`;
  const millions = Math.round(v / 100000) / 10;
  return `${millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(1)}M`;
}

export const STAT_LABELS = {
  consistency: "Consistency",
  explorer: "Explorer",
  builder: "Builder",
  openSource: "Open Source",
  debugger: "Debugger",
};

export function pickDisplayStats(stats, zodiac, limit = 3) {
  const keys = zodiac.statKeys?.length
    ? zodiac.statKeys
    : ["consistency", "explorer", "builder"];

  return keys.slice(0, limit).map((key) => ({
    key,
    label: STAT_LABELS[key] || key,
    value: stats[key] ?? 0,
  }));
}
