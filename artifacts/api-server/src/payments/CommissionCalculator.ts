/**
 * CommissionCalculator — isolated, testable commission logic.
 *
 * Computes platform fee, net merchant amount, and optionally rider fee.
 * Extended per store tier, category, or negotiated rates in the future.
 */

export type SubscriptionTier = "free" | "basic" | "premium";

export interface CommissionBreakdown {
  amountGross: number;
  commissionRate: number;
  platformFee: number;
  merchantNet: number;
  currency: string;
}

const TIER_RATES: Record<SubscriptionTier, number> = {
  premium: 0.01, // 1%
  basic: 0.03,   // 3%
  free: 0.07,    // 7%
};

export class CommissionCalculator {
  /**
   * Calculate commission breakdown for an order.
   * @param amountGross - Total amount paid by buyer (in currency units, e.g. 1500.00 ARS)
   * @param tier - Store subscription tier (drives commission rate)
   * @param currency - ISO currency code
   */
  calculate(
    amountGross: number,
    tier: SubscriptionTier = "free",
    currency = "ARS"
  ): CommissionBreakdown {
    const commissionRate = TIER_RATES[tier] ?? TIER_RATES.free;
    const platformFee = parseFloat((amountGross * commissionRate).toFixed(2));
    const merchantNet = parseFloat((amountGross - platformFee).toFixed(2));

    return {
      amountGross,
      commissionRate,
      platformFee,
      merchantNet,
      currency,
    };
  }

  /**
   * Returns the raw rate for a given tier (useful for display).
   */
  rateForTier(tier: SubscriptionTier): number {
    return TIER_RATES[tier] ?? TIER_RATES.free;
  }

  /**
   * Returns the rate as a percentage string (e.g. "7.00").
   */
  ratePercentString(tier: SubscriptionTier): string {
    return (this.rateForTier(tier) * 100).toFixed(2);
  }
}

export const commissionCalculator = new CommissionCalculator();
