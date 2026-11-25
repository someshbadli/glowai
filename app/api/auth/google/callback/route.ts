import { NextResponse } from 'next/server';
import { getOAuth2Client } from '@/src/lib/googleAuth';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const clinicId = searchParams.get('state');

  if (!code || !clinicId) {
    return NextResponse.json({ error: 'Missing code or clinic identifier' }, { status: 400 });
  }

  try {
    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      return NextResponse.json({ 
        error: 'No refresh token received. Re-authorize with prompt=consent.' 
      }, { status: 400 });
    }

    const { error: dbError } = await supabase
      .from('clinics')
      .update({ google_refresh_token: tokens.refresh_token })
      .eq('id', clinicId);

    if (dbError) throw dbError;

    return NextResponse.redirect(new URL('/dashboard?connected=true', req.url));
  } catch (error: any) {
    console.error('OAuth Callback Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
