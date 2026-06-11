import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST() {
  try {
    // 1. Mark all sessions as inactive
    await supabase.from('queue_sessions').update({ is_active: false }).neq('id', '00000000-0000-0000-0000-000000000000');

    // 2. Create a new active session
    const { data: newSession, error: createError } = await supabase
      .from('queue_sessions')
      .insert([
        {
          avg_consultation_time: 5,
          current_token: 0,
          is_active: true
        }
      ])
      .select()
      .maybeSingle();

    if (createError) throw createError;

    // Trigger update on patients to clear frontend via realtime (by updating a dummy field or we just rely on session update)
    // Actually, just creating a new session is enough because the frontend will fetch the new active session and see no patients for it.

    return NextResponse.json({ success: true, session: newSession });
  } catch (error: any) {
    console.error('Error resetting queue:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
