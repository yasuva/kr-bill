/**
 * Formats a numeric value to Indian Rupee (INR) currency with Indian number formatting.
 * Matches en-IN locale grouping rules (e.g., 10,00,000 instead of 1,000,000).
 * 
 * Examples:
 * - 50 -> ₹50
 * - 1250 -> ₹1,250
 * - 1250.5 -> ₹1,250.50
 */
export function formatCurrency(amount: number, forceDecimals = false): string {
  const value = typeof amount === "number" && !isNaN(amount) ? amount : 0;
  const hasDecimals = value % 1 !== 0;
  
  const formatter = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: (forceDecimals || hasDecimals) ? 2 : 0,
    maximumFractionDigits: 2
  });

  return `₹${formatter.format(value)}`;
}
