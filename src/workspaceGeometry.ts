export const MIN_TABLE_CONTENT_HEIGHT = 100;

// clientHeight excludes horizontal scrollbars and borders. Reserve the content
// viewport, not just the flex item's outer box, plus rounding slack.
export function mapBudget(
  paneHeight: number,
  fixedHeight: number,
  mapExtras: number,
  tableChrome: number,
) {
  const chrome = Math.max(0, tableChrome);
  return {
    space: Math.max(
      40,
      Math.min(
        600,
        Math.floor(
          paneHeight -
            fixedHeight -
            mapExtras -
            chrome -
            MIN_TABLE_CONTENT_HEIGHT -
            4,
        ),
      ),
    ),
    tableMinimum: MIN_TABLE_CONTENT_HEIGHT + chrome,
  };
}
