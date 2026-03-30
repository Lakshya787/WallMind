import React, { useState, useEffect } from 'react';
import { requestAccess, signTransaction } from '@stellar/freighter-api';
import * as StellarSdk from 'stellar-sdk';
import api from '../api/axios';
import { Coins, Loader2, Wallet, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function CreditsManager() {
    const { user, login } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [projectWallet, setProjectWallet] = useState(null);

    useEffect(() => {
        // Fetch the backend project wallet address so we know where to send XLM
        api.get('/payment/wallet').then(res => {
            if (res.data.success) setProjectWallet(res.data.address);
        }).catch(err => console.error('Could not fetch project wallet', err));
    }, []);

    const handleBuyCredits = async () => {
        if (!projectWallet) {
            setError('Project wallet not loaded. Try again.');
            setTimeout(() => setError(null), 3000);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // 1. Request access from Freighter
            const accessResponse = await requestAccess();
            if (accessResponse.error) throw new Error(accessResponse.error);
            const userPublicKey = typeof accessResponse === 'string' ? accessResponse : accessResponse.address;

            // 2. Load account from Stellar Horizon testnet
            const server = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');
            let account;
            try {
                account = await server.loadAccount(userPublicKey);
            } catch (e) {
                throw new Error('Your wallet account is not funded on Testnet. Use Friendbot to fund it first.');
            }

            // 3. Build the payment transaction (5 XLM → project wallet)
            const fee = await server.fetchBaseFee();
            const transaction = new StellarSdk.TransactionBuilder(account, {
                fee,
                networkPassphrase: StellarSdk.Networks.TESTNET,
            })
                .addOperation(StellarSdk.Operation.payment({
                    destination: projectWallet,
                    asset: StellarSdk.Asset.native(),
                    amount: '5',
                }))
                .setTimeout(30)
                .build();

            const xdr = transaction.toXDR();

            // 4. Sign via Freighter
            const signedResponse = await signTransaction(xdr, {
                network: 'TESTNET',
                networkPassphrase: 'Test SDF Network ; September 2015',
            });
            if (signedResponse.error) throw new Error(signedResponse.error);

            const finalXdr = signedResponse.signedTxXdr || signedResponse;

            // 5. Submit to Horizon
            const signedTx = StellarSdk.TransactionBuilder.fromXDR(finalXdr, StellarSdk.Networks.TESTNET);
            const submitResponse = await server.submitTransaction(signedTx);

            // 6. Verify payment on backend and credit the user
            const verifyRes = await api.post('/payment/verify', { txHash: submitResponse.hash });
            if (verifyRes.data.success) {
                const updatedUser = { ...user, credits: verifyRes.data.totalCredits };
                login(updatedUser);
                setSuccess(`+${verifyRes.data.addedCredits} credits added!`);
                setTimeout(() => setSuccess(null), 4000);
            } else {
                throw new Error(verifyRes.data.error || 'Payment verification failed');
            }

        } catch (err) {
            console.error(err);
            setError(err.message || 'Payment failed or was cancelled');
            setTimeout(() => setError(null), 5000);
        } finally {
            setLoading(false);
        }
    };

    if (!user) return null;

    return (
        <div className="flex items-center gap-2.5 relative">
            {/* Credits badge */}
            <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-300 px-3 py-1.5 rounded-lg text-xs font-bold">
                <Coins className="w-3.5 h-3.5 text-amber-400" />
                {user.credits ?? 0} Credits
            </div>

            {/* Buy Credits button */}
            <button
                onClick={handleBuyCredits}
                disabled={loading || !projectWallet}
                title="Pay 5 XLM via Freighter to get 5 credits"
                className="flex items-center gap-1.5 bg-emerald-600/80 hover:bg-emerald-500/90 border border-emerald-500/40 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 disabled:opacity-50 shadow-[0_0_12px_rgba(16,185,129,0.2)] hover:shadow-[0_0_20px_rgba(16,185,129,0.35)]"
            >
                {loading
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Wallet className="w-3.5 h-3.5" />
                }
                {loading ? 'Processing...' : 'Buy (5 XLM)'}
            </button>

            {/* Success toast */}
            {success && (
                <span className="absolute top-full mt-2 right-0 w-max bg-emerald-900/80 text-emerald-200 border border-emerald-700/50 text-xs px-3 py-1.5 rounded-lg shadow-lg z-50 backdrop-blur-sm flex items-center gap-1.5 whitespace-nowrap">
                    <CheckCircle className="w-3 h-3" /> {success}
                </span>
            )}

            {/* Error toast */}
            {error && (
                <span className="absolute top-full mt-2 right-0 w-max max-w-xs bg-red-900/80 text-red-200 border border-red-700/50 text-xs px-3 py-1.5 rounded-lg shadow-lg z-50 backdrop-blur-sm whitespace-nowrap">
                    {error}
                </span>
            )}
        </div>
    );
}
