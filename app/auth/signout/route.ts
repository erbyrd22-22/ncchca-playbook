import { NextResponse } from 'next/server';
import { serverClient } from '@/lib/supabase-server';

export async function POST(request: Request) {
  const sb = await serverClient();
  await sb.auth.signOut();
  return NextResponse.redirect(new URL('/login', new URL(request.url).origin), { status: 303 });
}
