import type { User, UserFacts } from '../types/index.js';
import { ANONYMOUS_FACTS } from '../types/domain/facts.js';

function l1Facts(userId: string): UserFacts {
  return {
    user_id: userId,
    auth: { social_linked: true, l2_verified: false, l2_method: null },
    verification: { identity: null, rights: null },
    status: { account: 'active', featured: false },
  };
}

function l2Facts(userId: string): UserFacts {
  return {
    user_id: userId,
    auth: { social_linked: true, l2_verified: true, l2_method: 'phone' },
    verification: { identity: null, rights: null },
    status: { account: 'active', featured: false },
  };
}

export const mockUsers: Map<string, User> = new Map([
  ['user_1', { id: 'user_1', name: 'テストユーザー', provider: 'discord' }],
  ['user_2', { id: 'user_2', name: 'GM太郎', provider: 'discord' }],
  ['user_3', { id: 'user_3', name: 'シナリオ職人', provider: 'discord' }],
  ['user_google', { id: 'user_google', name: 'Googleユーザー', provider: 'google' }],
  ['user_line', { id: 'user_line', name: 'LINEユーザー', provider: 'line' }],
]);

export const mockUserFacts: Map<string, UserFacts> = new Map([
  ['user_1', l1Facts('user_1')],
  ['user_2', l2Facts('user_2')],
  ['user_3', l2Facts('user_3')],
  ['user_google', l2Facts('user_google')],
  ['user_line', l2Facts('user_line')],
]);

export const sessions: Map<string, string> = new Map();
