/**
 * Document 11: Value-Based Partial Release Check Engine
 * Evaluates remaining collateral lendable value per metal and calculates minimum required payment to release articles.
 */

export interface ArticleForReleaseCheck {
  id: string;
  metal: 'GOLD' | 'SILVER' | 'PLATINUM';
  fineMg: number;
  isBeingReleased: boolean;
}

export interface ReleaseCheckInputs {
  articles: ArticleForReleaseCheck[];
  totalPrincipalPaise: bigint;
  goldRatePaisePerGram: bigint; // e.g. 720000 paise/g
  silverRatePaisePerGram: bigint; // e.g. 9000 paise/g
  lendableFactor?: number; // default 0.5 (50% of metal value)
}

export interface ReleaseCheckResult {
  remainingLendablePaise: bigint;
  minPrincipalToPayPaise: bigint;
  goldLendablePaise: bigint;
  silverLendablePaise: bigint;
  isAllowedWithoutOverride: boolean;
}

export function computePartialReleaseCheck(inputs: ReleaseCheckInputs): ReleaseCheckResult {
  const {
    articles,
    totalPrincipalPaise,
    goldRatePaisePerGram,
    silverRatePaisePerGram,
    lendableFactor = 0.5,
  } = inputs;

  let goldLendablePaise = 0n;
  let silverLendablePaise = 0n;

  articles.forEach((art) => {
    // Only calculate for articles staying in pool (not being released)
    if (!art.isBeingReleased) {
      const rate = art.metal === 'GOLD' ? goldRatePaisePerGram : silverRatePaisePerGram;
      const metalVal = BigInt(Math.round((art.fineMg * Number(rate)) / 1000));
      const lendable = BigInt(Math.round(Number(metalVal) * lendableFactor));

      if (art.metal === 'GOLD') {
        goldLendablePaise += lendable;
      } else {
        silverLendablePaise += lendable;
      }
    }
  });

  const remainingLendablePaise = goldLendablePaise + silverLendablePaise;

  // Minimum payment required = max(0, totalPrincipal - remainingLendable)
  let minPrincipalToPayPaise = totalPrincipalPaise - remainingLendablePaise;
  if (minPrincipalToPayPaise < 0n) {
    minPrincipalToPayPaise = 0n;
  }

  const isAllowedWithoutOverride = remainingLendablePaise >= totalPrincipalPaise;

  return {
    remainingLendablePaise,
    minPrincipalToPayPaise,
    goldLendablePaise,
    silverLendablePaise,
    isAllowedWithoutOverride,
  };
}
