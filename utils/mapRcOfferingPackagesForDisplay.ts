import type { RCOffering } from '../providers/SubscriptionProvider';

/** Rows for “Plans & benefits” and similar surfaces using RevenueCat offerings. */
export type RcPackageDisplayRow = {
  id: string;
  label: string;
  priceString: string;
  periodHint: string;
  productId: string;
  packageIdentifier: string;
};

export function mapRcOfferingPackagesForDisplay(offerings: RCOffering[]): RcPackageDisplayRow[] {
  if (!offerings?.length) return [];
  const pkgs = offerings[0]?.packages ?? [];
  return pkgs.map((pkg) => {
    const isMonthly = pkg.identifier === '$rc_monthly';
    const isYearly = pkg.identifier === '$rc_annual';
    const isLifetime = pkg.identifier === '$rc_lifetime';
    let label = pkg.product.title || pkg.identifier;
    let periodHint = 'Renews automatically unless canceled · Details at checkout';
    let id = `pkg_${pkg.identifier}`;
    if (isMonthly) {
      label = 'Monthly';
      periodHint = 'Billed monthly · Renews automatically until canceled';
      id = 'monthly';
    } else if (isYearly) {
      label = 'Yearly';
      periodHint = 'Billed yearly · Renews automatically until canceled';
      id = 'yearly';
    } else if (isLifetime) {
      label = 'Lifetime';
      periodHint = 'One-time purchase · Does not renew';
      id = 'lifetime';
    }
    return {
      id,
      label,
      priceString: pkg.product.priceString || (typeof pkg.product.price === 'number' ? `$${pkg.product.price}` : ''),
      periodHint,
      productId: pkg.product.identifier,
      packageIdentifier: pkg.identifier,
    };
  });
}
