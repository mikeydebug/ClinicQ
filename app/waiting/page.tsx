'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Clock, Users } from 'lucide-react';

function WaitingContent() {
  const searchParams = useSearchParams();
  const myToken = searchParams.get('token'); // e.g., ?token=T007

  const [currentTokenDisplay, setCurrentTokenDisplay] = useState('--');
  const [avgTime, setAvgTime] = useState(5);
  const [peopleAhead, setPeopleAhead] = useState<number | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchData = async () => {
    // 1. Fetch Session for current token and avg time
    const { data: session } = await supabase
      .from('queue_sessions')
      .select('id, current_token, avg_consultation_time')
      .eq('is_active', true)
      .limit(1)
      .single();

    let sessionId = null;
    if (session) {
      sessionId = session.id;
      setCurrentTokenDisplay(session.current_token > 0 ? `T${session.current_token.toString().padStart(3, '0')}` : '--');
      setAvgTime(session.avg_consultation_time);
    }

    // 2. If user has a specific token in URL, calculate people ahead
    if (myToken && sessionId) {
      // Find my patient record
      const { data: myPatient } = await supabase
        .from('patients')
        .select('token_number, status')
        .eq('session_id', sessionId)
        .eq('token_display', myToken)
        .limit(1)
        .maybeSingle();

      if (myPatient && myPatient.status === 'waiting') {
        // Count how many people are 'waiting' AND have a smaller token number
        const { count } = await supabase
          .from('patients')
          .select('*', { count: 'exact', head: true })
          .eq('session_id', sessionId)
          .eq('status', 'waiting')
          .lt('token_number', myPatient.token_number);

        setPeopleAhead(count || 0);
      } else {
        setPeopleAhead(null); // Either done, current, or not found
      }
    }

    setLastUpdated(new Date());
  };

  useEffect(() => {
    fetchData();
    
    const channel = supabase
      .channel('clinic-queue-waiting')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'patients' },
        () => {
          fetchData();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'queue_sessions' },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [myToken]);

  const estimatedWait = peopleAhead !== null ? peopleAhead * avgTime : null;

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white">
      {/* Header */}
      <div className="absolute top-8 text-center w-full">
        <h1 className="text-3xl font-bold tracking-wider text-slate-300">
          <span className="text-sky-500">Clinic</span>Q
        </h1>
      </div>

      {/* Main Display */}
      <div className="bg-slate-800 rounded-3xl p-12 md:p-24 shadow-2xl border border-slate-700 text-center max-w-4xl w-full">
        <h2 className="text-3xl md:text-5xl font-semibold text-slate-400 mb-6 uppercase tracking-widest">
          Now Serving
        </h2>
        <div className="text-8xl md:text-[12rem] font-bold text-emerald-400 tracking-tighter leading-none mb-4">
          {currentTokenDisplay}
        </div>
      </div>

      {/* Patient Specific Info */}
      {myToken && (
        <div className="mt-12 bg-sky-900/40 border border-sky-500/30 rounded-2xl p-6 md:p-8 max-w-4xl w-full">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-center md:text-left">
              <div className="text-sky-300 text-sm md:text-base font-semibold uppercase tracking-wider mb-1">Your Token</div>
              <div className="text-4xl md:text-5xl font-bold text-white">{myToken}</div>
            </div>
            
            <div className="w-px h-16 bg-sky-500/20 hidden md:block"></div>
            
            <div className="text-center">
              <div className="flex items-center justify-center md:justify-start gap-2 text-sky-300 text-sm md:text-base font-semibold uppercase tracking-wider mb-1">
                <Users className="w-5 h-5" />
                People Ahead
              </div>
              <div className="text-4xl md:text-5xl font-bold text-white">
                {peopleAhead !== null ? peopleAhead : '--'}
              </div>
            </div>
            
            <div className="w-px h-16 bg-sky-500/20 hidden md:block"></div>
            
            <div className="text-center md:text-right">
              <div className="flex items-center justify-center md:justify-end gap-2 text-sky-300 text-sm md:text-base font-semibold uppercase tracking-wider mb-1">
                <Clock className="w-5 h-5" />
                Est. Wait
              </div>
              <div className="text-4xl md:text-5xl font-bold text-white">
                {estimatedWait !== null ? `${estimatedWait} m` : '--'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="absolute bottom-8 text-slate-500 text-sm flex items-center gap-2">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
        </span>
        Live Updates • Last updated at {lastUpdated.toLocaleTimeString()}
      </div>
    </div>
  );
}

export default function WaitingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Loading...</div>}>
      <WaitingContent />
    </Suspense>
  );
}
