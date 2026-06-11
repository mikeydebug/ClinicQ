import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { data: sessionData, error: sessionError } = await supabase
      .from('queue_sessions')
      .select('id, current_token')
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (sessionError || !sessionData) {
      return NextResponse.json({ error: 'No active session found.' }, { status: 500 });
    }

    const sessionId = sessionData.id;

    // We will use a while loop to retry in case of a race condition
    let retries = 3;
    while (retries > 0) {
      // Find the next patient in line
      const { data: nextPatientData } = await supabase
        .from('patients')
        .select('id, token_number')
        .eq('session_id', sessionId)
        .eq('status', 'waiting')
        .order('token_number', { ascending: true })
        .limit(1)
        .maybeSingle();

      // Edge Case 2: Queue is empty
      if (!nextPatientData) {
        return NextResponse.json({ error: 'Queue is empty' }, { status: 400 });
      }

      // First, mark the current patient as 'done'
      await supabase
        .from('patients')
        .update({ status: 'done' })
        .eq('session_id', sessionId)
        .eq('status', 'current');

      // Edge Case 1: Race condition prevention using atomic update
      // We only update if the status is STILL 'waiting'
      const { data: updatedPatient } = await supabase
        .from('patients')
        .update({ status: 'current', called_at: new Date().toISOString() })
        .eq('id', nextPatientData.id)
        .eq('status', 'waiting')
        .select()
        .maybeSingle();

      if (updatedPatient) {
        // Success! We claimed the next patient.
        
        // Update the session's current token
        await supabase
          .from('queue_sessions')
          .update({ current_token: updatedPatient.token_number })
          .eq('id', sessionId);

        return NextResponse.json({ success: true, patient: updatedPatient });
      }

      // If we didn't get updatedPatient, another receptionist beat us to it.
      // We loop again to try the NEXT patient.
      retries--;
    }

    return NextResponse.json({ error: 'System busy. Please try again.' }, { status: 409 });

  } catch (error: any) {
    console.error('Error calling next patient:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
