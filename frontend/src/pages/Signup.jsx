import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { requestAccess } from '@stellar/freighter-api';
import { Compass, Loader2, Wallet, Mail, CheckCircle } from 'lucide-react';

function Signup() {
  const [authMethod, setAuthMethod] = useState('email'); // 'email' | 'wallet'
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });
  const [publicKey, setPublicKey] = useState('');
  const [status, setStatus] = useState({ type: '', message: '' });
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const switchTab = (method) => {
    setAuthMethod(method);
    setStatus({ type: '', message: '' });
    setPublicKey('');
  };

  // ── Email signup ──────────────────────────────────────────────────────────
  const handleEmailSubmit = async (e) => {
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
      setStatus({ type: 'error', message: error.response?.data?.message || 'Signup failed. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  // ── Wallet: connect Freighter ─────────────────────────────────────────────
  const connectWallet = async () => {
    setIsLoading(true);
    setStatus({ type: '', message: '' });
    try {
      const access = await requestAccess();
      if (access.error) throw new Error(access.error);
      const pubKey = typeof access === 'string' ? access : access.address;
      setPublicKey(pubKey);
    } catch (err) {
      setStatus({ type: 'error', message: err.message || 'Failed to connect Freighter. Is it installed?' });
    } finally {
      setIsLoading(false);
    }
  };

  // ── Wallet signup ─────────────────────────────────────────────────────────
  const handleWalletSubmit = async (e) => {
    e.preventDefault();
    if (!publicKey) return connectWallet();

    setIsLoading(true);
    setStatus({ type: '', message: '' });
    try {
      const response = await api.post('/auth/freighter-signup', {
        username: formData.username,
        publicKey,
      });
      if (response.data.success) {
        login(response.data.user);
        navigate('/dashboard');
      }
    } catch (error) {
      setStatus({ type: 'error', message: error.response?.data?.message || 'Signup failed. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-grow flex items-center justify-center px-4 py-12 relative overflow-hidden animate-fade-in">
      {/* Background glows */}
      <div className="absolute top-[20%] right-[20%] w-[40vw] h-[40vw] rounded-full bg-purple-600/10 mix-blend-screen filter blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[20%] left-[20%] w-[30vw] h-[30vw] rounded-full bg-indigo-600/10 mix-blend-screen filter blur-[100px] pointer-events-none" />

      <div className="max-w-md w-full space-y-6 glass-card p-10 rounded-3xl z-10 border border-slate-700/50 shadow-2xl relative mt-8">
        <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent rounded-3xl pointer-events-none"></div>

        {/* Header */}
        <div className="text-center relative z-10">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-purple-500/20">
            <Compass className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Create an account</h2>
          <p className="mt-2 text-sm text-slate-400 font-light">Choose how you'd like to sign up.</p>
        </div>

        {/* Tab switcher */}
        <div className="relative z-10 flex rounded-xl overflow-hidden border border-slate-700/60 bg-slate-900/40">
          <button
            onClick={() => switchTab('email')}
            className={`w-1/2 py-2.5 text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200 ${
              authMethod === 'email'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Mail className="w-4 h-4" /> Email
          </button>
          <button
            onClick={() => switchTab('wallet')}
            className={`w-1/2 py-2.5 text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200 ${
              authMethod === 'wallet'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Wallet className="w-4 h-4" /> Web3 Wallet
          </button>
        </div>

        {/* Status message */}
        {status.message && (
          <div className={`relative z-10 p-4 rounded-xl border backdrop-blur-md text-sm flex items-start gap-2 ${
            status.type === 'success'
              ? 'bg-emerald-900/30 text-emerald-200 border-emerald-800/50'
              : 'bg-red-900/30 text-red-200 border-red-800/50'
          }`}>
            {status.type === 'success' && <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />}
            {status.message}
          </div>
        )}

        {/* ── EMAIL FORM ── */}
        {authMethod === 'email' && (
          <form className="space-y-5 relative z-10" onSubmit={handleEmailSubmit}>
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
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-[0_0_15px_rgba(79,70,229,0.3)] text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-purple-500 disabled:opacity-50 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
            >
              {isLoading ? (
                <span className="flex items-center">
                  <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                  Signing up...
                </span>
              ) : 'Sign up with Email'}
            </button>
          </form>
        )}

        {/* ── WALLET FORM ── */}
        {authMethod === 'wallet' && (
          <form className="space-y-5 relative z-10" onSubmit={handleWalletSubmit}>
            {!publicKey ? (
              /* Step 1: Connect wallet */
              <button
                onClick={connectWallet}
                type="button"
                disabled={isLoading}
                className="w-full flex justify-center items-center gap-3 py-3.5 px-4 border border-dashed border-indigo-500/40 rounded-xl text-sm font-semibold text-indigo-300 bg-indigo-500/5 hover:bg-indigo-500/10 hover:border-indigo-400/60 disabled:opacity-50 transition-all duration-200 group"
              >
                {isLoading
                  ? <Loader2 className="h-5 w-5 animate-spin" />
                  : <Wallet className="h-5 w-5 group-hover:scale-110 transition-transform" />
                }
                {isLoading ? 'Connecting...' : 'Connect Freighter to Begin'}
              </button>
            ) : (
              /* Step 2: Show connected wallet + username input */
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Connected Wallet
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 animate-pulse" />
                    <input
                      type="text"
                      disabled
                      className="block w-full px-4 py-3 border border-emerald-700/50 bg-emerald-900/20 text-emerald-300 rounded-xl text-xs font-mono truncate cursor-not-allowed"
                      value={publicKey}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setPublicKey('')}
                    className="mt-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    Disconnect
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Choose a Username</label>
                  <input
                    type="text"
                    required
                    disabled={isLoading}
                    className="block w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:opacity-50"
                    placeholder="satoshi"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !formData.username}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-[0_0_15px_rgba(79,70,229,0.3)] text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 focus:outline-none disabled:opacity-50 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
                >
                  {isLoading ? (
                    <span className="flex items-center">
                      <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                      Creating account...
                    </span>
                  ) : 'Create Account'}
                </button>
              </>
            )}
          </form>
        )}

        {/* Login link */}
        <div className="text-center text-sm pt-4 border-t border-slate-800/50 relative z-10">
          <span className="text-slate-400">Already have an account? </span>
          <Link to="/login" className="font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">Log in</Link>
        </div>
      </div>
    </div>
  );
}

export default Signup;
