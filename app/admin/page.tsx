'use client';

import { useState, useEffect, FormEvent } from 'react';
import toast from 'react-hot-toast';
import { Play, Users, Clock, Settings, UserPlus, RefreshCw, Zap, RotateCcw } from 'lucide-react';
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
      .single();
      
    if (session) {
      setCurrentToken(session.current_token);
      setAvgTime(session.avg_consultation_time);
    }

    // Fetch patients
    const { data: pats } = await supabase
      .from('patients')
      .select('*')
      .eq('session_id', session?.id)
      .order('token_number', { ascending: false });
      
    if (pats) setPatients(pats as Patient[]);
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
    } catch (err) {
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
    } catch (err) {
      toast.error('Failed to call next patient');
    } finally {
      setIsCalling(false);
    }
  };

  const updateAvgTime = async (newTime: number) => {
    setAvgTime(newTime);
    const { data: session } = await supabase.from('queue_sessions').select('id').eq('is_active', true).single();
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
    } catch (err) {
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
    } catch (err) {
      toast.error('Failed to reset queue');
    } finally {
      setIsLoading(false);
    }
  };

  const waitingCount = patients.filter(p => p.status === 'waiting').length;

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <header className="flex items-center justify-between bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <span className="text-sky-500">Clinic</span>Q Admin
            </h1>
            <p className="text-slate-500 text-sm mt-1">Receptionist Dashboard</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-lg">
              <Clock className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-medium text-slate-700">Avg Time:</span>
              <input 
                type="number" 
                value={avgTime}
                onChange={(e) => updateAvgTime(Number(e.target.value))}
                className="w-16 bg-white border border-slate-200 rounded px-2 py-1 text-sm outline-none focus:border-sky-500"
              />
              <span className="text-sm text-slate-500">min</span>
            </div>
            <button
              onClick={handleDemoMode}
              disabled={isLoading}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm"
            >
              {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              DEMO MODE
            </button>
            <button
              onClick={handleReset}
              disabled={isLoading}
              className="flex items-center gap-2 bg-rose-500 hover:bg-rose-600 disabled:bg-rose-300 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm"
              title="Reset Queue"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Actions */}
          <div className="space-y-6 lg:col-span-1">
            
            {/* Call Next Button Card */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center space-y-4">
              <h2 className="text-lg font-semibold text-slate-700">Queue Control</h2>
              <button
                onClick={handleCallNext}
                disabled={isCalling || waitingCount === 0}
                className="w-full py-6 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl font-bold text-2xl flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg shadow-emerald-500/20 disabled:shadow-none"
              >
                {isCalling ? <RefreshCw className="w-8 h-8 animate-spin" /> : <Play className="w-8 h-8 fill-current" />}
                CALL NEXT
              </button>
              <div className="flex items-center gap-6 pt-2">
                <div className="text-center">
                  <div className="text-3xl font-bold text-slate-900">{waitingCount}</div>
                  <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Waiting</div>
                </div>
                <div className="w-px h-8 bg-slate-200"></div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-sky-500">
                    {currentToken > 0 ? `T${currentToken.toString().padStart(3, '0')}` : '--'}
                  </div>
                  <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Current</div>
                </div>
              </div>
            </div>

            {/* Add Patient Form */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2 mb-4">
                <UserPlus className="w-5 h-5 text-sky-500" />
                Add Patient
              </h2>
              <form onSubmit={handleAddPatient} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Patient Name *</label>
                  <input
                    id="nameInput"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-all"
                    placeholder="Enter name"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number (Optional)</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-all"
                    placeholder="Enter phone"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 bg-sky-500 hover:bg-sky-600 disabled:bg-sky-300 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {isLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : 'Assign Token'}
                </button>
              </form>
            </div>

          </div>

          {/* Right Column: Queue Table */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 lg:col-span-2 flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-sky-500" />
                Today's Queue
              </h2>
            </div>
            
            <div className="flex-1 overflow-auto max-h-[600px] border border-slate-100 rounded-xl">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Token</th>
                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Patient Name</th>
                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Phone</th>
                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {patients.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                        No patients in the queue today.
                      </td>
                    </tr>
                  ) : (
                    patients.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-mono font-medium text-slate-900">{p.token_display}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-700">
                          {p.patient_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-slate-500 text-sm">
                          {p.phone || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                            p.status === 'waiting' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            p.status === 'current' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            'bg-slate-100 text-slate-600 border-slate-200'
                          }`}>
                            {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
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
