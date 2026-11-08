import type { SiteContent } from '../content/default';

export type WorkerEnv = {
  Bindings: {
    ASSETS: { fetch: (request: Request) => Promise<Response> };
    ENVIRONMENT?: string;
    DATABASE_URL?: string;
    DEV_AUTH_BYPASS?: string;
    ADMIN_USERNAME?: string;
    ADMIN_PASSWORD?: string;
    ADMIN_JWT_SECRET?: string;
    CF_ACCESS_TEAM_DOMAIN?: string;
    CF_ACCESS_AUD?: string;
    AWS_ENDPOINT_URL_S3?: string;
    AWS_REGION?: string;
    AWS_ACCESS_KEY_ID?: string;
    AWS_SECRET_ACCESS_KEY?: string;
    OBJECT_STORAGE_BUCKET?: string;
  };
  Variables: {
    adminUser?: string;
    requestId?: string;
  };
};

export type AuthResult = {
  authenticated: boolean;
  user?: { username: string };
};

export type PresignInput = {
  fileName?: string;
  contentType?: string;
  size?: number;
};

export type MessageStatus = 'unread' | 'read' | 'replied';

export type ContactMessage = {
  id: number;
  name: string;
  email: string;
  message: string;
  status: MessageStatus;
  read_at?: string | null;
  reply_notes?: string | null;
  replied_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type ContactMessageInput = {
  name: string;
  email: string;
  message: string;
};

export type ContactMessageStats = {
  total: number;
  unread: number;
  read: number;
  replied: number;
};
