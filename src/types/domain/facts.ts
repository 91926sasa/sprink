import type { VerificationState, AccountStatus, L2Method, SiteId } from './common.js';

export interface AuthFacts {
  social_linked: boolean;
  l2_verified: boolean;
  l2_method: L2Method | null;
}

export interface RightsVerification {
  state: VerificationState;
  scope: SiteId[];
  expires_at?: string;
}

export interface VerificationFacts {
  identity: VerificationState | null;
  identity_expires_at?: string;
  rights: RightsVerification | null;
}

export interface StatusFacts {
  account: AccountStatus;
  featured: boolean;
}

export interface UserFacts {
  user_id: string;
  auth: AuthFacts;
  verification: VerificationFacts;
  status: StatusFacts;
}

export const ANONYMOUS_FACTS: UserFacts = {
  user_id: 'anonymous',
  auth: {
    social_linked: false,
    l2_verified: false,
    l2_method: null,
  },
  verification: {
    identity: null,
    rights: null,
  },
  status: {
    account: 'active',
    featured: false,
  },
};

export type Tier =
  | 'anonymous'
  | 'observer'
  | 'participant'
  | 'verified_creator'
  | 'rights_holder';

export function computeTier(facts: UserFacts): Tier {
  if (facts.verification.rights?.state === 'active') {
    return 'rights_holder';
  }
  if (facts.verification.identity === 'active') {
    return 'verified_creator';
  }
  if (facts.auth.l2_verified) {
    return 'participant';
  }
  if (facts.auth.social_linked) {
    return 'observer';
  }
  return 'anonymous';
}
