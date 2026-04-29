/**
 * Stand-in while live social API client is archived at `archived/community_features/services/liveSocialClient.ts`.
 * Restore full implementation when re-enabling community features.
 */
import type { CommunityUser } from '../types';

export class LiveSocialApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly retryAfterSec?: number;

  constructor(message: string, opts: { status: number; code?: string; retryAfterSec?: number }) {
    super(message);
    this.name = 'LiveSocialApiError';
    this.status = opts.status;
    this.code = opts.code;
    this.retryAfterSec = opts.retryAfterSec;
  }
}

export type LiveSocialSession = {
  token: string;
  user: CommunityUser;
};
