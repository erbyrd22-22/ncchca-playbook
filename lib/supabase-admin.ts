import 'server-only';
import { createClient } from '@supabase/supabase-js';

/**
 * Service-role client. This bypasses Row Level Security entirely, so it is
 * used for exactly one thing: creating and deleting Supabase Auth users on
 * behalf of an admin. Every caller must gate on requireAdmin() first.
 *
 * The key is read from SUPABASE_SERVICE_ROLE_KEY and must never be exposed
 * to the browser — no NEXT_PUBLIC_ prefix, and this file is server-only.
 */
export const adminConfigured = () =>
  !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY;

export function adminClient() {
  if (!adminConfigured()) {
    throw new Error(
      'User management is not configured. Add SUPABASE_SERVICE_ROLE_KEY to the ' +
        'Railway service variables (Supabase → Project Settings → API → service_role).'
    );
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
