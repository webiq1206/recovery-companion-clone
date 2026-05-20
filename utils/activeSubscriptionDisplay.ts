import type { PurchasesEntitlementInfo, CustomerInfo } from 'react-native-purchases';
import type { RCOffering } from '../providers/SubscriptionProvider';
import type { SubscriptionState } from '../types';

export type ActiveSubscriptionDisplay = {
  productIdentifier: string;
  label: string;
  priceString: string | null;
  /** Primary line: plan + renewal or access end date */
  periodHint: string;
  /** Shorter renewal/access line for emphasis */
  renewalLine: string;
};

function formatDisplayDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function inferPlanLabel(productIdentifier: string, productPlanIdentifier?: string | null): string {
  const blob = `${productIdentifier} ${productPlanIdentifier ?? ''}`.toLowerCase();
  if (blob.includes('lifetime') || blob.includes('life_time')) return 'Lifetime';
  if (blob.includes('annual') || blob.includes('yearly') || blob.includes('year')) return 'Yearly';
  if (blob.includes('month')) return 'Monthly';
  if (blob.includes('week')) return 'Weekly';
  return 'Premium';
}

function findPriceInOfferings(offerings: RCOffering[], productIdentifier: string): string | null {
  const target = productIdentifier.toLowerCase();
  for (const offering of offerings) {
    for (const pkg of offering.packages) {
      const id = pkg.product.identifier.toLowerCase();
      if (id === target || id.includes(target) || target.includes(id)) {
        const price = pkg.product.priceString?.trim();
        if (price) return price;
      }
    }
  }
  return null;
}

function buildRenewalLines(
  expirationIso: string | null | undefined,
  willRenew: boolean | null | undefined,
  isLifetime: boolean,
): { periodHint: string; renewalLine: string } {
  if (isLifetime) {
    return {
      renewalLine: 'One-time purchase · Does not renew',
      periodHint: 'Lifetime access · No renewal',
    };
  }
  if (!expirationIso) {
    return {
      renewalLine: 'Renewal date unavailable',
      periodHint: 'Active subscription',
    };
  }
  const formatted = formatDisplayDate(expirationIso);
  if (willRenew === false) {
    return {
      renewalLine: `Access through ${formatted}`,
      periodHint: `Ends ${formatted} · Auto-renew is off`,
    };
  }
  return {
    renewalLine: `Renews on ${formatted}`,
    periodHint: `Renews on ${formatted}`,
  };
}

function buildFromProductId(
  productIdentifier: string,
  offerings: RCOffering[],
  expirationIso: string | null | undefined,
  willRenew: boolean | null | undefined,
): ActiveSubscriptionDisplay {
  const label = inferPlanLabel(productIdentifier);
  const isLifetime = label === 'Lifetime';
  const { periodHint, renewalLine } = buildRenewalLines(expirationIso, willRenew, isLifetime);
  return {
    productIdentifier,
    label,
    priceString: findPriceInOfferings(offerings, productIdentifier),
    periodHint,
    renewalLine,
  };
}

function getStoreProductIdsFromCustomerInfo(info: CustomerInfo): string[] {
  const ids = new Set<string>();
  const subs = (info as CustomerInfo & { activeSubscriptions?: string[] | Record<string, unknown> })
    .activeSubscriptions;
  if (Array.isArray(subs)) {
    subs.forEach((id) => ids.add(id));
  } else if (subs && typeof subs === 'object') {
    Object.keys(subs).forEach((id) => ids.add(id));
  }
  for (const ent of Object.values(info.entitlements.all ?? {})) {
    if (ent.isActive && ent.productIdentifier) {
      ids.add(ent.productIdentifier);
    }
  }
  for (const ent of Object.values(info.entitlements.active ?? {})) {
    if (ent.isActive && ent.productIdentifier) {
      ids.add(ent.productIdentifier);
    }
  }
  return [...ids];
}

export function buildActiveSubscriptionDisplay(
  entitlement: PurchasesEntitlementInfo,
  offerings: RCOffering[],
): ActiveSubscriptionDisplay {
  const productIdentifier = entitlement.productIdentifier;
  const label = inferPlanLabel(productIdentifier, entitlement.productPlanIdentifier);
  const isLifetime = label === 'Lifetime';
  const { periodHint, renewalLine } = buildRenewalLines(
    entitlement.expirationDate,
    entitlement.willRenew,
    isLifetime,
  );
  return {
    productIdentifier,
    label,
    priceString: findPriceInOfferings(offerings, productIdentifier),
    periodHint,
    renewalLine,
  };
}

/** Always returns display details when the user has Premium, even if offerings or entitlement metadata are partial. */
export function resolvePremiumSubscriptionDisplay(input: {
  isPremium: boolean;
  customerInfo: CustomerInfo | null;
  subscription: SubscriptionState;
  offerings: RCOffering[];
  entitlement: PurchasesEntitlementInfo | null;
}): ActiveSubscriptionDisplay | null {
  if (!input.isPremium) return null;

  if (input.entitlement) {
    return buildActiveSubscriptionDisplay(input.entitlement, input.offerings);
  }

  if (input.customerInfo) {
    const productIds = getStoreProductIdsFromCustomerInfo(input.customerInfo);
    if (productIds.length > 0) {
      return buildFromProductId(
        productIds[0],
        input.offerings,
        input.subscription.expiresAt,
        true,
      );
    }
  }

  if (input.subscription.expiresAt) {
    const { periodHint, renewalLine } = buildRenewalLines(input.subscription.expiresAt, true, false);
    return {
      productIdentifier: '',
      label: 'Premium',
      priceString: null,
      periodHint,
      renewalLine,
    };
  }

  return {
    productIdentifier: '',
    label: 'Premium',
    priceString: null,
    periodHint: 'Active subscription',
    renewalLine: 'Renewal date unavailable',
  };
}
