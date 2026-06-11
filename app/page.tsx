import Link from 'next/link';
import { Stethoscope, MonitorPlay, Users } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white font-sans selection:bg-sky-500/30 overflow-hidden relative">
      
      {/* Background ambient light */}
      <div className="absolute top-1/4 left-1/4 w-[800px] h-[800px] bg-sky-600/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-emerald-600/10 rounded-full blur-[100px] pointer-events-none"></div>

      {/* Header */}
      <div className="text-center z-10 mb-16 transform perspective-1000">
        <div className="inline-flex items-center justify-center p-4 bg-sky-500/10 rounded-3xl mb-6 border border-sky-500/20 shadow-[0_0_30px_rgba(14,165,233,0.2)]">
          <Stethoscope className="w-12 h-12 text-sky-400" />
        </div>
        <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-white drop-shadow-lg mb-4">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-indigo-400 to-purple-500 drop-shadow-[0_0_20px_rgba(14,165,233,0.3)]">Clinic</span>Q
        </h1>
        <p className="text-xl md:text-2xl text-slate-400 font-bold tracking-widest uppercase mt-4 max-w-2xl mx-auto">
          Intelligent Queue Management
        </p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-5xl z-10">
        
        {/* Admin Card */}
        <Link href="/admin" className="group">
          <div className="h-full bg-slate-900/60 backdrop-blur-xl rounded-[2.5rem] p-10 border border-slate-700/50 flex flex-col items-center justify-center text-center transition-all duration-300 shadow-[0_10px_40px_rgba(0,0,0,0.5)] group-hover:shadow-[0_20px_60px_rgba(14,165,233,0.2)] group-hover:-translate-y-2 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-sky-500/10 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            
            <div className="p-6 bg-slate-950/50 rounded-full border border-slate-800 mb-8 shadow-inner group-hover:scale-110 transition-transform duration-500">
              <Users className="w-16 h-16 text-sky-400 drop-shadow-[0_0_10px_rgba(14,165,233,0.5)]" />
            </div>
            
            <h2 className="text-3xl font-extrabold text-white mb-4 group-hover:text-sky-300 transition-colors">Receptionist Dashboard</h2>
            <p className="text-slate-400 font-medium text-lg max-w-xs mx-auto">
              Add patients, manage the queue, and call the next person in line.
            </p>
            
            <div className="mt-8 inline-flex items-center gap-2 text-sky-400 font-bold uppercase tracking-wider text-sm group-hover:translate-x-2 transition-transform">
              Enter Dashboard &rarr;
            </div>
          </div>
        </Link>

        {/* Waiting Card */}
        <Link href="/waiting" className="group">
          <div className="h-full bg-slate-900/60 backdrop-blur-xl rounded-[2.5rem] p-10 border border-slate-700/50 flex flex-col items-center justify-center text-center transition-all duration-300 shadow-[0_10px_40px_rgba(0,0,0,0.5)] group-hover:shadow-[0_20px_60px_rgba(16,185,129,0.2)] group-hover:-translate-y-2 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            
            <div className="p-6 bg-slate-950/50 rounded-full border border-slate-800 mb-8 shadow-inner group-hover:scale-110 transition-transform duration-500">
              <MonitorPlay className="w-16 h-16 text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
            </div>
            
            <h2 className="text-3xl font-extrabold text-white mb-4 group-hover:text-emerald-300 transition-colors">Live Waiting Screen</h2>
            <p className="text-slate-400 font-medium text-lg max-w-xs mx-auto">
              Big screen display for the waiting room. Shows current token and live updates.
            </p>
            
            <div className="mt-8 inline-flex items-center gap-2 text-emerald-400 font-bold uppercase tracking-wider text-sm group-hover:translate-x-2 transition-transform">
              View Screen &rarr;
            </div>
          </div>
        </Link>

      </div>
    </div>
  );
}
