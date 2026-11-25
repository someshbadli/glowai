import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { appointment_id, rating, feedback } = await req.json();

    const { data: appointment } = await supabase
      .from('appointments')
      .select('*, clinics(google_review_url, name)')
      .eq('id', appointment_id)
      .single();

    if (!appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    if (rating === 5 && appointment.clinics?.google_review_url) {
      return NextResponse.json({
        redirect_url: appointment.clinics.google_review_url,
        action: 'public_review'
      });
    } else {
      await supabase
        .from('appointments')
        .update({ review_status: 'internal_feedback_logged' })
        .eq('id', appointment_id);

      return NextResponse.json({
        message: 'Feedback received privately. Management alerted.',
        action: 'private_resolution'
      });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
