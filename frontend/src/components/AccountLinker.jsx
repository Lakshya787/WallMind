import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { requestAccess } from '@stellar/freighter-api';
import api from '../api/axios';
import { Link2, Mail, Loader2, X, CheckCircle } from 'lucide-react';

export default function AccountLinker() {
    const { user, login } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [showEmailForm, setShowEmailForm] = useState(false);
    const [emailData, setEmailData] = useState({ email: '', password: '' });

    if (!user) return null;
    // If user has both email and wallet, hide this component
    if (user.publicKey && user.email) return null;

    const showError = (msg) => {
        setError(msg);
        setTimeout(() => setError(null), 4000);
    };

    const showSuccess = (msg) => {
        setSuccess(msg);
        setTimeout(() => setSuccess(null), 3000);
    };

    const handleLinkWallet = async () => {
        setLoading(true);
        setError(null);
        try {
            const access = await requestAccess();
            if (access.error) throw new Error(access.error);
            const publicKey = typeof access === 'string' ? access : access.address;

            const res = await api.post('/auth/link-wallet', { publicKey });
            if (res.data.success) {
                login(res.data.user);
                showSuccess('Wallet linked!');
            }
        } catch (err) {
            showError(err.response?.data?.message || err.message || 'Failed to link wallet');
        } finally {
            setLoading(false);
        }
    };

    const handleAddEmail = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const res = await api.post('/auth/add-email', emailData);
            if (res.data.success) {
                login(res.data.user);
                setShowEmailForm(false);
                showSuccess('Email saved!');
            }
        } catch (err) {
            showError(err.response?.data?.message || err.message || 'Failed to add email');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative flex items-center gap-2">
            {/* Inline feedback */}
            {error && (
                <span className="absolute top-full mt-2 left-0 w-max max-w-xs bg-red-900/80 text-red-200 border border-red-700/50 text-xs px-3 py-1.5 rounded-lg shadow-lg z-50 backdrop-blur-sm">
                    {error}
                </span>
            )}
            {success && (
                <span className="absolute top-full mt-2 left-0 w-max max-w-xs bg-emerald-900/80 text-emerald-200 border border-emerald-700/50 text-xs px-3 py-1.5 rounded-lg shadow-lg z-50 backdrop-blur-sm flex items-center gap-1.5">
                    <CheckCircle className="w-3 h-3" /> {success}
                </span>
            )}

            {/* Link Wallet Button — shown when no wallet is linked */}
            {!user.publicKey && (
                <button
                    onClick={handleLinkWallet}
                    disabled={loading}
                    title="Link your Freighter Wallet"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-300 bg-blue-500/10 border border-blue-500/30 rounded-lg hover:bg-blue-500/20 hover:border-blue-400/50 transition-all duration-200 disabled:opacity-50"
                >
                    {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />}
                    Link Wallet
                </button>
            )}

            {/* Add Email Button — shown when user signed up via wallet and has no email */}
            {!user.email && (
                <div className="relative">
                    <button
                        onClick={() => setShowEmailForm(!showEmailForm)}
                        title="Add a recovery email to your account"
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-300 bg-indigo-500/10 border border-indigo-500/30 rounded-lg hover:bg-indigo-500/20 hover:border-indigo-400/50 transition-all duration-200"
                    >
                        <Mail className="w-3.5 h-3.5" />
                        Add Email
                    </button>

                    {showEmailForm && (
                        <div className="absolute top-full right-0 mt-3 w-72 glass-card rounded-2xl shadow-2xl border border-slate-700/60 p-5 z-50 animate-fade-in">
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="text-sm font-bold text-white">Set Recovery Email</h4>
                                <button
                                    onClick={() => setShowEmailForm(false)}
                                    className="text-slate-400 hover:text-white transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            <form onSubmit={handleAddEmail} className="space-y-3">
                                <input
                                    type="email"
                                    placeholder="Email Address"
                                    required
                                    className="w-full text-sm px-3 py-2.5 bg-slate-900/60 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                    value={emailData.email}
                                    onChange={e => setEmailData({ ...emailData, email: e.target.value })}
                                />
                                <input
                                    type="password"
                                    placeholder="Secure Password"
                                    required
                                    className="w-full text-sm px-3 py-2.5 bg-slate-900/60 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                    value={emailData.password}
                                    onChange={e => setEmailData({ ...emailData, password: e.target.value })}
                                />
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full flex justify-center py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-xl disabled:opacity-50 transition-all"
                                >
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Credentials'}
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
