'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Clock, Users } from 'lucide-react';

function WaitingContent() {
  const searchParams = useSearchParams();
  const myToken = searchParams.get('token'); // e.g., ?token=T007

  const [currentTokenDisplay, setCurrentTokenDisplay] = useState('--');
  const [nextPatientToken, setNextPatientToken] = useState<string | null>(null);
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
      .maybeSingle();

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

    // 3. Fetch "Next Up"
    if (sessionId) {
      const { data: nextPatient } = await supabase
        .from('patients')
        .select('token_display')
        .eq('session_id', sessionId)
        .eq('status', 'waiting')
        .order('token_number', { ascending: true })
        .limit(1)
        .maybeSingle();
        
      setNextPatientToken(nextPatient ? nextPatient.token_display : null);
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
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white font-sans selection:bg-sky-500/30 overflow-hidden relative">
      
      {/* Background ambient light */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-sky-600/20 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Header */}
      <div className="absolute top-8 text-center w-full z-10">
        <h1 className="text-4xl font-extrabold tracking-widest text-slate-200 drop-shadow-md">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-500 drop-shadow-[0_0_15px_rgba(14,165,233,0.5)]">Clinic</span>Q
        </h1>
      </div>

      {/* Main Display */}
      <div className="bg-slate-900/60 backdrop-blur-xl rounded-[3rem] p-12 md:p-24 shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-slate-700/50 text-center max-w-4xl w-full relative z-10 transform perspective-1000">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-sky-500/5 rounded-[3rem] pointer-events-none"></div>
        <h2 className="text-3xl md:text-5xl font-bold text-slate-400 mb-8 uppercase tracking-[0.3em] drop-shadow-sm">
          Now Serving
        </h2>
        <div className="text-[8rem] md:text-[14rem] font-black text-transparent bg-clip-text bg-gradient-to-b from-emerald-300 to-emerald-600 tracking-tighter leading-none mb-4 drop-shadow-[0_0_40px_rgba(16,185,129,0.4)]">
          {currentTokenDisplay}
        </div>
        
        {/* Next Up Indicator */}
        <div className="mt-8 pt-8 border-t border-slate-700/50 flex flex-col items-center justify-center gap-2">
          <div className="text-sm font-bold text-slate-500 uppercase tracking-[0.2em]">Next Up</div>
          <div className="text-3xl font-black text-sky-400 drop-shadow-[0_0_15px_rgba(14,165,233,0.3)]">
            {nextPatientToken || '--'}
          </div>
        </div>
      </div>

      {/* Patient Specific Info */}
      {myToken && (
        <div className="mt-12 bg-slate-900/80 backdrop-blur-md border border-sky-500/30 rounded-3xl p-8 max-w-4xl w-full relative z-10 shadow-[0_10px_30px_rgba(14,165,233,0.15)]">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-center md:text-left">
              <div className="text-sky-400 text-sm md:text-base font-bold uppercase tracking-widest mb-2">Your Token</div>
              <div className="text-5xl md:text-6xl font-black text-white drop-shadow-md">{myToken}</div>
            </div>
            
            <div className="w-px h-20 bg-sky-500/20 hidden md:block"></div>
            
            <div className="text-center">
              <div className="flex items-center justify-center md:justify-start gap-2 text-indigo-400 text-sm md:text-base font-bold uppercase tracking-widest mb-2">
                <Users className="w-6 h-6" />
                People Ahead
              </div>
              <div className="text-5xl md:text-6xl font-black text-white drop-shadow-md">
                {peopleAhead !== null ? peopleAhead : '--'}
              </div>
            </div>
            
            <div className="w-px h-20 bg-sky-500/20 hidden md:block"></div>
            
            <div className="text-center md:text-right">
              <div className="flex items-center justify-center md:justify-end gap-2 text-amber-400 text-sm md:text-base font-bold uppercase tracking-widest mb-2">
                <Clock className="w-6 h-6" />
                Est. Wait
              </div>
              <div className="text-5xl md:text-6xl font-black text-white drop-shadow-md">
                {estimatedWait !== null ? `${estimatedWait} m` : '--'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="absolute bottom-8 text-slate-500 font-medium text-sm flex items-center gap-3 z-10 bg-slate-900/80 px-4 py-2 rounded-full border border-slate-800">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
        </span>
        Live Updates • Last sync: {lastUpdated.toLocaleTimeString()}
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
