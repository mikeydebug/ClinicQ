'use client';

import { useState, useEffect, FormEvent } from 'react';
import toast from 'react-hot-toast';
import { Play, Users, Clock, UserPlus, RefreshCw, Zap, RotateCcw } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Patient = {
  id: string;
  token_number: number;
  token_display: string;
  patient_name: string;
  phone: string | null;
  status: 'waiting' | 'current' | 'done';
};

export default function AdminPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [currentToken, setCurrentToken] = useState(0);
  const [avgTime, setAvgTime] = useState(5);
  
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCalling, setIsCalling] = useState(false);

  const fetchData = async () => {
    // Fetch session
    const { data: session } = await supabase
      .from('queue_sessions')
      .select('*')
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();
      
    if (session) {
      setCurrentToken(session.current_token);
      setAvgTime(session.avg_consultation_time);
    }

    // Fetch patients
    if (session) {
      const { data: pats } = await supabase
        .from('patients')
        .select('*')
        .eq('session_id', session.id)
        .order('token_number', { ascending: false });
        
      if (pats) setPatients(pats as Patient[]);
    } else {
      setPatients([]);
    }
  };

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel('clinic-queue')
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
  }, []);

  const handleAddPatient = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Patient name is required');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/add-patient', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientName: name, phone })
      });
      const data = await res.json();
      
      if (data.warning) {
        toast(data.warning, { icon: '⚠️' });
        // Still added for this demo unless we enforce confirmation
      }
      
      if (data.success) {
        toast.success(`Patient ${data.patient.token_display} added!`);
        setName('');
        setPhone('');
        fetchData();
        // Focus back to input
        document.getElementById('nameInput')?.focus();
      } else if (data.error) {
        toast.error(data.error);
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to add patient');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCallNext = async () => {
    setIsCalling(true);
    try {
      const res = await fetch('/api/call-next', { method: 'POST' });
      const data = await res.json();
      
      if (data.success) {
        toast.success(`Now calling ${data.patient.token_display}!`);
        fetchData();
      } else if (data.error) {
        toast.error(data.error);
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to call next patient');
    } finally {
      setIsCalling(false);
    }
  };

  const updateAvgTime = async (newTime: number) => {
    setAvgTime(newTime);
    const { data: session } = await supabase.from('queue_sessions').select('id').eq('is_active', true).maybeSingle();
    if (session) {
      await supabase.from('queue_sessions').update({ avg_consultation_time: newTime }).eq('id', session.id);
      toast.success('Average time updated');
    }
  };

  const handleDemoMode = async () => {
    setIsLoading(true);
    const demoPatients = ['Priya', 'Rajan', 'Sunita', 'Ahmed', 'Kavitha'];
    let added = 0;
    try {
      for (const pName of demoPatients) {
        const res = await fetch('/api/add-patient', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ patientName: pName, ignoreWarning: true })
        });
        if (res.ok) added++;
      }
      toast.success(`Demo mode: Added ${added} patients!`);
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error('Demo mode failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm("Are you sure you want to reset the entire queue? This will start a new session.")) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/reset', { method: 'POST' });
      if (res.ok) {
        toast.success("Queue reset successfully!");
        setPatients([]);
        setCurrentToken(0);
        fetchData();
      } else {
        toast.error("Failed to reset queue");
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to reset queue');
    } finally {
      setIsLoading(false);
    }
  };

  const waitingCount = patients.filter(p => p.status === 'waiting').length;

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-slate-200 selection:bg-sky-500/30 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="flex items-center justify-between bg-slate-900/60 backdrop-blur-xl p-6 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] border border-slate-800/50 transform perspective-1000">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2 drop-shadow-md">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-500 drop-shadow-[0_0_15px_rgba(14,165,233,0.5)]">Clinic</span>Q Admin
            </h1>
            <p className="text-slate-400 text-sm mt-1 font-medium">Receptionist Dashboard</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-950/50 px-4 py-2.5 rounded-xl border border-slate-800 shadow-inner">
              <Clock className="w-4 h-4 text-sky-400" />
              <span className="text-sm font-semibold text-slate-300">Avg Time:</span>
              <input 
                type="number" 
                value={avgTime}
                onChange={(e) => updateAvgTime(Number(e.target.value))}
                className="w-16 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-sm text-white font-bold outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all text-center"
              />
              <span className="text-sm text-slate-400">min</span>
            </div>
            <button
              onClick={handleDemoMode}
              disabled={isLoading}
              className="flex items-center gap-2 bg-gradient-to-b from-amber-400 to-amber-600 disabled:from-amber-700 disabled:to-amber-800 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-[0_4px_0_rgb(180,83,9)] hover:translate-y-[2px] hover:shadow-[0_2px_0_rgb(180,83,9)] active:translate-y-[4px] active:shadow-none disabled:shadow-none disabled:translate-y-[4px]"
            >
              {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              DEMO MODE
            </button>
            <button
              onClick={handleReset}
              disabled={isLoading}
              className="flex items-center justify-center bg-gradient-to-b from-rose-500 to-rose-700 disabled:from-rose-800 disabled:to-rose-900 text-white p-2.5 rounded-xl text-sm font-bold transition-all shadow-[0_4px_0_rgb(159,18,57)] hover:translate-y-[2px] hover:shadow-[0_2px_0_rgb(159,18,57)] active:translate-y-[4px] active:shadow-none disabled:shadow-none disabled:translate-y-[4px]"
              title="Reset Queue"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Actions */}
          <div className="space-y-8 lg:col-span-1">
            
            {/* Call Next Button Card */}
            <div className="bg-slate-900/60 backdrop-blur-xl p-8 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] border border-slate-800/50 flex flex-col items-center justify-center text-center space-y-6 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <h2 className="text-xl font-bold text-slate-200 tracking-wide">Queue Control</h2>
              <button
                onClick={handleCallNext}
                disabled={isCalling || waitingCount === 0}
                className="w-full py-8 bg-gradient-to-b from-emerald-400 to-emerald-600 hover:from-emerald-300 hover:to-emerald-500 disabled:from-slate-700 disabled:to-slate-800 disabled:text-slate-500 text-white rounded-2xl font-extrabold text-3xl flex items-center justify-center gap-3 transition-all active:scale-95 shadow-[0_8px_0_rgb(4,120,87)] hover:translate-y-[2px] hover:shadow-[0_6px_0_rgb(4,120,87)] active:translate-y-[8px] active:shadow-none disabled:shadow-none disabled:translate-y-[8px] relative z-10"
              >
                {isCalling ? <RefreshCw className="w-10 h-10 animate-spin" /> : <Play className="w-10 h-10 fill-current" />}
                CALL NEXT
              </button>
              <div className="flex items-center gap-8 pt-4 w-full justify-center">
                <div className="text-center bg-slate-950/50 px-6 py-4 rounded-2xl border border-slate-800 w-32 shadow-inner">
                  <div className="text-4xl font-black text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">{waitingCount}</div>
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Waiting</div>
                </div>
                <div className="text-center bg-slate-950/50 px-6 py-4 rounded-2xl border border-slate-800 w-32 shadow-inner">
                  <div className="text-4xl font-black text-sky-400 drop-shadow-[0_0_15px_rgba(14,165,233,0.4)]">
                    {currentToken > 0 ? `T${currentToken.toString().padStart(3, '0')}` : '--'}
                  </div>
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Current</div>
                </div>
              </div>
            </div>

            {/* Add Patient Form */}
            <div className="bg-slate-900/60 backdrop-blur-xl p-8 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] border border-slate-800/50">
              <h2 className="text-xl font-bold text-white flex items-center gap-3 mb-6">
                <div className="p-2 bg-sky-500/20 rounded-xl">
                  <UserPlus className="w-6 h-6 text-sky-400" />
                </div>
                Add Patient
              </h2>
              <form onSubmit={handleAddPatient} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-400 mb-2">Patient Name *</label>
                  <input
                    id="nameInput"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-5 py-3 bg-slate-950/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-all text-white font-medium shadow-inner placeholder:text-slate-600"
                    placeholder="e.g. Rahul Sharma"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-400 mb-2">Phone Number (Optional)</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-5 py-3 bg-slate-950/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-all text-white font-medium shadow-inner placeholder:text-slate-600"
                    placeholder="e.g. 9876543210"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-4 mt-2 bg-gradient-to-b from-sky-400 to-sky-600 hover:from-sky-300 hover:to-sky-500 disabled:from-slate-700 disabled:to-slate-800 text-white rounded-xl font-bold text-lg transition-all shadow-[0_6px_0_rgb(2,132,199)] hover:translate-y-[2px] hover:shadow-[0_4px_0_rgb(2,132,199)] active:translate-y-[6px] active:shadow-none disabled:shadow-none disabled:translate-y-[6px] flex items-center justify-center gap-2"
                >
                  {isLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : 'Assign Token'}
                </button>
              </form>
            </div>

          </div>

          {/* Right Column: Queue Table */}
          <div className="bg-slate-900/60 backdrop-blur-xl p-8 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] border border-slate-800/50 lg:col-span-2 flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-bold text-white flex items-center gap-3">
                <div className="p-2 bg-indigo-500/20 rounded-xl">
                  <Users className="w-6 h-6 text-indigo-400" />
                </div>
                Today&apos;s Queue
              </h2>
            </div>
            
            <div className="flex-1 overflow-auto max-h-[600px] border border-slate-700/50 rounded-2xl bg-slate-950/50 shadow-inner">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-900/90 backdrop-blur-md sticky top-0 z-10 shadow-md">
                  <tr>
                    <th className="px-6 py-4 text-xs font-extrabold text-slate-400 uppercase tracking-widest border-b border-slate-700">Token</th>
                    <th className="px-6 py-4 text-xs font-extrabold text-slate-400 uppercase tracking-widest border-b border-slate-700">Patient Name</th>
                    <th className="px-6 py-4 text-xs font-extrabold text-slate-400 uppercase tracking-widest border-b border-slate-700">Phone</th>
                    <th className="px-6 py-4 text-xs font-extrabold text-slate-400 uppercase tracking-widest border-b border-slate-700">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {patients.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-16 text-center text-slate-500 font-medium text-lg">
                        <div className="flex flex-col items-center justify-center gap-4">
                          <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center">
                            <Users className="w-8 h-8 text-slate-600" />
                          </div>
                          No patients in the queue today.
                        </div>
                      </td>
                    </tr>
                  ) : (
                    patients.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-800/50 transition-colors group cursor-default">
                        <td className="px-6 py-5 whitespace-nowrap">
                          <span className="font-mono font-bold text-sky-400 bg-sky-400/10 px-3 py-1.5 rounded-lg border border-sky-400/20">{p.token_display}</span>
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap font-bold text-slate-200 text-lg group-hover:text-white transition-colors">
                          {p.patient_name}
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap text-slate-400 text-sm font-mono">
                          {p.phone || '—'}
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider border ${
                            p.status === 'waiting' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.2)]' :
                            p.status === 'current' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)] animate-pulse' :
                            'bg-slate-800 text-slate-400 border-slate-700'
                          }`}>
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
