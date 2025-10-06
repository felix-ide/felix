export const MIN_SIMILARITY = 0.2;

export const PATH_DEMOTE_PATTERNS: RegExp[] = [
  /coverage\//i,
  /coverage-integration\//i,
  /lcov-report\//i,
  /node_modules\//i
];
