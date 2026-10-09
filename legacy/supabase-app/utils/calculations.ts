
export const calculateProfit = (sellingPrice: number, purchasePrice: number, labourCharges: number = 0) => {
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
    totalCost
  };
};

export const getPurityLabel = (tunch: number, metalType: string): string => {
  if (metalType === 'Gold') {
    if (tunch >= 99.9) return '24K';
    if (tunch >= 91.6) return '22K';
    if (tunch >= 75) return '18K';
    if (tunch >= 58.5) return '14K';
    return `${tunch}%`;
  } else {
    if (tunch >= 99.9) return '999';
    if (tunch >= 92.5) return '925';
    if (tunch >= 83.5) return '835';
    return `${tunch}%`;
  }
};
