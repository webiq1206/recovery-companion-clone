import type { PurchasesEntitlementInfo } from 'react-native-purchases';
import type { RCOffering } from '../providers/SubscriptionProvider';

export type ActiveSubscriptionDisplay = {
  productIdentifier: string;
  label: string;
  priceString: string | null;
  periodHint: string;
};

function inferPlanLabel(productIdentifier: string, productPlanIdentifier?: string | null): string {
  const blob = `${productIdentifier} ${productPlanIdentifier ?? ''}`.toLowerCase();
  if (blob.includes('lifetime') || blob.includes('life_time')) return 'Lifetime';
  if (blob.includes('annual') || blob.includes('yearly') || blob.includes('year')) return 'Yearly';
  if (blob.includes('month')) return 'Monthly';
  if (blob.includes('week')) return 'Weekly';
  return 'Premium';
}

function findPriceInOfferings(offerings: RCOffering[], productIdentifier: string): string | null {
  for (const offering of offerings) {
    const pkg = offering.packages.find((p) => p.product.identifier === productIdentifier);
    const price = pkg?.product.priceString?.trim();
    if (price) return price;
  }
  return null;
}

function formatExpirationHint(ent: PurchasesEntitlementInfo): string {
  const expires = ent.expirationDate;
  if (!expires) {
    return 'Active subscription · Manage or cancel in the App Store or Play Store';
  }
  const formatted = new Date(expires).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  if (ent.willRenew === false) {
    return `Access through ${formatted}`;
  }
  return `Renews on ${formatted} · Cancel anytime in your store account`;
}

export function buildActiveSubscriptionDisplay(
  entitlement: PurchasesEntitlementInfo,
  offerings: RCOffering[],
): ActiveSubscriptionDisplay {
  const productIdentifier = entitlement.productIdentifier;
  return {
    productIdentifier,
    label: inferPlanLabel(productIdentifier, entitlement.productPlanIdentifier),
    priceString: findPriceInOfferings(offerings, productIdentifier),
    periodHint: formatExpirationHint(entitlement),
  };
}
