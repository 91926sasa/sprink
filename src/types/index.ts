export * from './domain/index.js';
export * from './api/index.js';

export interface User {
  id: string;
  name: string;
  avatarUrl?: string;
  provider: string;
}
