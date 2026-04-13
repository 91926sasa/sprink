export type SiteId =
  | 'portal'
  | 'character_site'
  | 'background_site'
  | 'scenario_site'
  | 'image_site';

export const SITE_IDS: readonly SiteId[] = [
  'portal',
  'character_site',
  'background_site',
  'scenario_site',
  'image_site',
] as const;

export type VerificationState = 'active' | 'pending' | 'expired' | 'revoked';

export const VERIFICATION_STATES: readonly VerificationState[] = [
  'active',
  'pending',
  'expired',
  'revoked',
] as const;

export type AccountStatus = 'active' | 'suspended' | 'pending';

export const ACCOUNT_STATUSES: readonly AccountStatus[] = [
  'active',
  'suspended',
  'pending',
] as const;

export type L2Method = 'phone' | 'payment' | 'oauth_provider';

export const L2_METHODS: readonly L2Method[] = ['phone', 'payment', 'oauth_provider'] as const;
