export const PDF_UPLOAD_LIMITS = Object.freeze({
  maxFileSizeBytes: 64 * 1024 * 1024,
  maxSourcePages: 1200,
  repeatedMarginScanDepth: 2,
  minAverageCharsPerSourcePage: 80,
  minCharsForReadablePage: 40,
  minReadablePageRatio: 0.35,
});

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';

  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }

  const digits = value >= 10 || unitIndex === 0 ? 0 : 1;
  return `${value.toFixed(digits)} ${units[unitIndex]}`;
}
