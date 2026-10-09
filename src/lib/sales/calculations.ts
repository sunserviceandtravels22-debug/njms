export interface ProfitCalculation {
  profit: number;
  profitPercent: number;
  profitMargin: number;
  status: 'high' | 'medium' | 'low' | 'loss';
  totalCost: number;
}

export const calculateProfit = (
  sellingPrice: number,
  purchasePrice: number,
  labourCharges: number = 0
): ProfitCalculation => {
  const totalCost = purchasePrice + labourCharges;
  const profit = sellingPrice - totalCost;
  const profitPercent = totalCost > 0 ? (profit / totalCost) * 100 : 0;
  const profitMargin = sellingPrice > 0 ? (profit / sellingPrice) * 100 : 0;

  let status: 'high' | 'medium' | 'low' | 'loss' = 'loss';
  if (profit > 0) {
    if (profitPercent > 15) status = 'high';
    else if (profitPercent > 5) status = 'medium';
    else status = 'low';
  } else if (profit === 0) {
    status = 'medium';
  } else {
    status = 'loss';
  }

  return {
    profit,
    profitPercent,
    profitMargin,
    status,
    totalCost,
  };
};
