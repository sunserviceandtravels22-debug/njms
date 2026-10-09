
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Artificial delay for professional feel
    setTimeout(() => {
      const success = login(username, password);
      if (!success) {
        setError('Invalid administrative credentials');
        setIsLoading(false);
      }
    }, 800);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
      <div className="w-full max-w-md animate-in fade-in zoom-in duration-700">
        <div className="bg-white rounded-[3rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.15)] border-2 border-white overflow-hidden">
          <div className="p-12 text-center bg-slate-900 text-white relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-yellow-400 to-blue-600"></div>
            <div className="w-20 h-20 bg-blue-600 rounded-[1.5rem] flex items-center justify-center text-white text-3xl font-black mx-auto mb-6 shadow-xl shadow-blue-500/20">
              NJ
            </div>
            <h1 className="text-3xl font-black tracking-tighter mb-2">NARAYAN</h1>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Inventory Management</p>
          </div>

          <form onSubmit={handleSubmit} className="p-12 space-y-8">
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Username</label>
                <input
                  required
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-900 focus:border-blue-600 focus:bg-white outline-none transition-all"
                  placeholder="admin"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Access Key</label>
                <input
                  required
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-900 focus:border-blue-600 focus:bg-white outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border-2 border-red-100 rounded-2xl text-red-600 text-center text-xs font-black uppercase tracking-tight animate-bounce">
                ⚠️ {error}
              </div>
            )}

            <button
              disabled={isLoading}
              type="submit"
              className="w-full py-6 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-[0.3em] text-xs shadow-2xl shadow-blue-200 hover:bg-blue-700 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                'Secure Access'
              )}
            </button>
          </form>
          
          <div className="p-8 border-t border-slate-50 text-center">
            <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">
              Authorized Personnel Only • Restricted System
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
