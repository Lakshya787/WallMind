import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { Compass, Loader2 } from 'lucide-react';

function Signup() {
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });
  const [status, setStatus] = useState({ type: '', message: '' });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setStatus({ type: '', message: '' });

    try {
      const response = await api.post('/auth/signup', formData);
      if (response.data.success) {
        setStatus({ type: 'success', message: 'Account created! Check your email to verify.' });
        setFormData({ username: '', email: '', password: '' });
      }
    } catch (error) {
      setStatus({ 
        type: 'error', 
        message: error.response?.data?.message || 'Signup failed. Please try again.' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-grow flex items-center justify-center px-4 py-12 relative overflow-hidden animate-fade-in">
      <div className="absolute top-[20%] right-[20%] w-[40vw] h-[40vw] rounded-full bg-purple-600/10 mix-blend-screen filter blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[20%] left-[20%] w-[30vw] h-[30vw] rounded-full bg-indigo-600/10 mix-blend-screen filter blur-[100px] pointer-events-none" />

      <div className="max-w-md w-full space-y-8 glass-card p-10 rounded-3xl z-10 border border-slate-700/50 shadow-2xl relative mt-8">
        <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent rounded-3xl pointer-events-none"></div>
        <div className="text-center relative z-10">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-purple-500/20">
            <Compass className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Create an account</h2>
          <p className="mt-2 text-sm text-slate-400 font-light">Join us today to get started.</p>
        </div>
        
        {status.message && (
          <div className={`p-4 rounded-xl border backdrop-blur-md relative z-10 ${status.type === 'success' ? 'bg-emerald-900/30 text-emerald-200 border-emerald-800/50' : 'bg-red-900/30 text-red-200 border-red-800/50'}`}>
            {status.message}
          </div>
        )}

        <form className="mt-8 space-y-6 relative z-10" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Username</label>
              <input
                type="text"
                required
                disabled={isLoading}
                className="block w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:opacity-50"
                placeholder="johndoe"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Email address</label>
              <input
                type="email"
                required
                disabled={isLoading}
                className="block w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:opacity-50"
                placeholder="you@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
              <input
                type="password"
                required
                disabled={isLoading}
                className="block w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:opacity-50"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-[0_0_15px_rgba(79,70,229,0.3)] text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-purple-500 disabled:opacity-50 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
          >
            {isLoading ? (
              <span className="flex items-center">
                <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" />
                Signing up...
              </span>
            ) : 'Sign up'}
          </button>
        </form>
        <div className="text-center text-sm pt-6 border-t border-slate-800/50 relative z-10">
          <span className="text-slate-400">Already have an account? </span>
          <Link to="/login" className="font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">Log in</Link>
        </div>
      </div>
    </div>
  );
}

export default Signup;
