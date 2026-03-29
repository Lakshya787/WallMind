import { useEffect, useState, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../api/axios';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState('loading'); // loading, success, error
  const [message, setMessage] = useState('');
  const hasAttempted = useRef(false);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No verification token provided.');
      return;
    }

    if (hasAttempted.current) return;
    hasAttempted.current = true;

    const verifyToken = async () => {
      try {
        const response = await api.get(`/auth/verify-email?token=${token}`);
        if (response.data.success) {
          setStatus('success');
          setMessage(response.data.message || 'Email verified successfully!');
        } else {
          setStatus('error');
          setMessage(response.data.message || 'Verification failed.');
        }
      } catch (error) {
        setStatus('error');
        setMessage(error.response?.data?.message || 'Link is invalid or has expired.');
      }
    };

    verifyToken();
  }, [token]);

  return (
    <div className="flex-grow flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-md text-center border border-gray-100">
        {status === 'loading' && (
          <div className="flex flex-col items-center">
            <Loader2 className="h-16 w-16 text-blue-500 animate-spin mb-6" />
            <h2 className="text-2xl font-bold text-gray-900">Verifying Email...</h2>
            <p className="text-gray-500 mt-2">Please wait while we verify your email address.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
            <CheckCircle2 className="h-16 w-16 text-green-500 mb-6" />
            <h2 className="text-2xl font-bold text-gray-900">Verified Successfully!</h2>
            <p className="text-gray-500 mt-2 mb-8">{message}</p>
            <Link
              to="/login"
              className="w-full inline-flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Log in to your account
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
            <XCircle className="h-16 w-16 text-red-500 mb-6" />
            <h2 className="text-2xl font-bold text-gray-900">Verification Failed</h2>
            <p className="text-gray-500 mt-2 mb-8">{message}</p>
            <div className="w-full space-y-3">
              <Link
                to="/signup"
                className="w-full inline-flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
              >
                Back to Sign Up
              </Link>
              <Link
                to="/login"
                className="w-full inline-flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                Go to Login
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default VerifyEmail;
