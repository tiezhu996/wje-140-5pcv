export function calculateProfit(freight: number, fuelCost: number, tollCost: number, laborCost: number) {
  return freight - fuelCost - tollCost - laborCost;
}
export function calculateTotalCost(...items: number[]) {
  return items.reduce((sum, item) => sum + item, 0);
}
export function recalculateCostSummary(summary: { fuelTotal: number; maintenanceTotal: number; tollTotal: number; laborTotal: number; fixedCost: number; totalRevenue: number }) {
  const totalCost = calculateTotalCost(summary.fuelTotal, summary.maintenanceTotal, summary.tollTotal, summary.laborTotal, summary.fixedCost);
  const totalRevenue = summary.totalRevenue;
  return { totalCost, totalRevenue, profit: totalRevenue - totalCost };
}
