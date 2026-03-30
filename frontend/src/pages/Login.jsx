import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { requestAccess } from '@stellar/freighter-api';
import { Compass, Loader2, Wallet } from 'lucide-react';

function Login() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [walletLoading, setWalletLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/login', formData);
      if (response.data.success) {
        login(response.data.user);
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFreighterLogin = async () => {
    setWalletLoading(true);
    setError('');
    try {
      const access = await requestAccess();
      if (access.error) throw new Error(access.error);
      const publicKey = typeof access === 'string' ? access : access.address;

      const response = await api.post('/auth/freighter-login', { publicKey });
      if (response.data.success) {
        login(response.data.user);
        navigate('/dashboard');
      }
    } catch (err) {
      if (err.response?.status === 404) {
        setError('No account found for this wallet. Please sign up first.');
      } else {
        setError(err.message || err.response?.data?.message || 'Wallet login failed. Make sure Freighter is installed.');
      }
    } finally {
      setWalletLoading(false);
    }
  };

  return (
    <div className="flex-grow flex items-center justify-center px-4 py-12 relative overflow-hidden animate-fade-in">
      {/* Background glows */}
      <div className="absolute top-[20%] left-[20%] w-[40vw] h-[40vw] rounded-full bg-blue-600/10 mix-blend-screen filter blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[20%] w-[30vw] h-[30vw] rounded-full bg-indigo-600/10 mix-blend-screen filter blur-[100px] pointer-events-none" />

      <div className="max-w-md w-full space-y-6 glass-card p-10 rounded-3xl z-10 border border-slate-700/50 shadow-2xl relative">
        <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent rounded-3xl pointer-events-none"></div>

        {/* Header */}
        <div className="text-center relative z-10">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-indigo-500/20">
            <Compass className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Welcome Back</h2>
          <p className="mt-2 text-sm text-slate-400 font-light">Sign in to access your dashboard.</p>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-4 rounded-xl bg-red-900/30 text-red-200 border border-red-800/50 backdrop-blur-md relative z-10 text-sm">
            {error}
          </div>
        )}

        {/* Email / Password form */}
        <form className="space-y-5 relative z-10" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Email address</label>
            <input
              type="email"
              required
              disabled={isLoading || walletLoading}
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
              disabled={isLoading || walletLoading}
              className="block w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:opacity-50"
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || walletLoading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-[0_0_15px_rgba(79,70,229,0.3)] text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-indigo-500 disabled:opacity-50 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
          >
            {isLoading ? (
              <span className="flex items-center">
                <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                Signing in...
              </span>
            ) : 'Sign in with Email'}
          </button>
        </form>

        {/* Divider */}
        <div className="relative z-10">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-700/60"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-3 bg-transparent text-slate-500">or continue with</span>
          </div>
        </div>

        {/* Freighter Wallet Login */}
        <button
          onClick={handleFreighterLogin}
          type="button"
          disabled={isLoading || walletLoading}
          className="relative z-10 w-full flex justify-center items-center gap-3 py-3 px-4 border border-slate-600/60 rounded-xl text-sm font-semibold text-slate-200 bg-slate-800/60 hover:bg-slate-700/60 hover:border-indigo-500/40 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 transition-all duration-200 group"
        >
          {walletLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-indigo-400" />
          ) : (
            <Wallet className="h-5 w-5 text-indigo-400 group-hover:scale-110 transition-transform" />
          )}
          {walletLoading ? 'Connecting Wallet...' : 'Connect Freighter Wallet'}
        </button>

        {/* Sign up link */}
        <div className="text-center text-sm pt-4 border-t border-slate-800/50 relative z-10">
          <span className="text-slate-400">Don't have an account? </span>
          <Link to="/signup" className="font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">Sign up</Link>
        </div>
      </div>
    </div>
  );
}

export default Login;
