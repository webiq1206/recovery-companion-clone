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

function inferPackageKind(identifier: string, productId: string, packageType: string): 'monthly' | 'yearly' | 'lifetime' | null {
  const blob = `${identifier} ${productId} ${packageType}`.toLowerCase();
  if (identifier === '$rc_monthly' || blob.includes('month')) return 'monthly';
  if (identifier === '$rc_annual' || blob.includes('annual') || blob.includes('year')) return 'yearly';
  if (identifier === '$rc_lifetime' || blob.includes('lifetime') || blob.includes('life_time')) return 'lifetime';
  return null;
}

export function mapRcOfferingPackagesForDisplay(offerings: RCOffering[]): RcPackageDisplayRow[] {
  if (!offerings?.length) return [];
  const pkgs = offerings[0]?.packages ?? [];
  return pkgs.map((pkg) => {
    const kind = inferPackageKind(pkg.identifier, pkg.product.identifier, pkg.packageType);
    let label = (pkg.product.title || '').trim() || pkg.identifier;
    let periodHint = 'Renews automatically unless canceled · Details at checkout';
    let id = `pkg_${pkg.identifier}`;
    if (kind === 'monthly') {
      label = 'Monthly';
      periodHint = 'Billed monthly · Renews automatically until canceled';
      id = 'monthly';
    } else if (kind === 'yearly') {
      label = 'Yearly';
      periodHint = 'Billed yearly · Renews automatically until canceled';
      id = 'yearly';
    } else if (kind === 'lifetime') {
      label = 'Lifetime';
      periodHint = 'One-time purchase · Does not renew';
      id = 'lifetime';
    }
    const priceString =
      pkg.product.priceString?.trim() ||
      (typeof pkg.product.price === 'number' && pkg.product.price > 0
        ? `${pkg.product.currencyCode === 'USD' ? '$' : ''}${pkg.product.price}`
        : '');
    return {
      id,
      label,
      priceString,
      periodHint,
      productId: pkg.product.identifier,
      packageIdentifier: pkg.identifier,
    };
  });
}
