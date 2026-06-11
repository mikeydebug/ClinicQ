import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { patientName, phone, ignoreWarning } = body;

    if (!patientName) {
      return NextResponse.json({ error: 'Patient name is required' }, { status: 400 });
    }

    // Get the active session
    const { data: sessionData, error: sessionError } = await supabase
      .from('queue_sessions')
      .select('id')
      .eq('is_active', true)
      .limit(1)
      .single();

    if (sessionError || !sessionData) {
      return NextResponse.json({ error: 'No active session found. Please reset or create a session.' }, { status: 500 });
    }

    const sessionId = sessionData.id;

    // Edge Case 6: Same patient accidentally added twice
    if (!ignoreWarning) {
      let query = supabase
        .from('patients')
        .select('id')
        .eq('session_id', sessionId)
        .eq('patient_name', patientName)
        .eq('status', 'waiting');

      if (phone) {
        query = query.eq('phone', phone);
      }

      const { data: existingPatient } = await query.limit(1).maybeSingle();

      if (existingPatient) {
        return NextResponse.json({ 
          warning: 'Similar patient already in queue',
          requiresConfirmation: true 
        }, { status: 200 });
      }
    }

    // Get the next token number
    // In a real high-concurrency app, this should be a DB sequence or Postgres Function
    // For this hackathon, we'll fetch the max token and increment
    const { data: maxTokenData } = await supabase
      .from('patients')
      .select('token_number')
      .eq('session_id', sessionId)
      .order('token_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextTokenNumber = maxTokenData ? maxTokenData.token_number + 1 : 1;
    const tokenDisplay = `T${nextTokenNumber.toString().padStart(3, '0')}`;

    const { data: newPatient, error: insertError } = await supabase
      .from('patients')
      .insert([
        {
          session_id: sessionId,
          token_number: nextTokenNumber,
          token_display: tokenDisplay,
          patient_name: patientName,
          phone: phone || null,
          status: 'waiting'
        }
      ])
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    return NextResponse.json({ success: true, patient: newPatient });
  } catch (error: any) {
    console.error('Error adding patient:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
