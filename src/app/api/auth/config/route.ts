import { NextResponse } from 'next/server';

export async function GET() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
  const callbackUrl = `${siteUrl}/auth/callback`;
  
  return NextResponse.json({
    siteUrl,
    callbackUrl,
    environment: process.env.NODE_ENV || 'unknown'
  });
} 