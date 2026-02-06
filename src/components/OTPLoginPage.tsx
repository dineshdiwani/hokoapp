import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';

interface OTPLoginPageProps {
  onBack: () => void;
  onSuccess: () => void;
  isSeller?: boolean;
}

const OTPLoginPage: React.FC<OTPLoginPageProps> = ({
  onBack,
  onSuccess,
  isSeller = false
}) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email) {
      setError('Please enter your email');
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin
      }
    });

    if (error) {
      setError(error.message);
    } else {
      setMessage('Magic link sent. Please check your email.');
    }

    setLoading(false);
  };

  // Detect session after magic link login
  supabase.auth.onAuthStateChange((_event, session) => {
    if (session) {
      onSuccess();
    }
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-2">
          {isSeller ? 'Seller Login' : 'Login'}
        </h2>

        <p className="text-gray-600 text-center mb-4">
          Login using your email address
        </p>

        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border rounded-lg px-4 py-2 mb-3"
        />

        {error && (
          <p className="text-red-600 text-sm mb-2">{error}</p>
        )}

        {message && (
          <p className="text-green-600 text-sm mb-2">{message}</p>
        )}

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition mb-3"
        >
          {loading ? 'Sending link...' : 'Send Magic Link'}
        </button>

        <button
          onClick={onBack}
          className="w-full text-gray-600 text-sm underline"
        >
          Back
        </button>
      </div>
    </div>
  );
};

export default OTPLoginPage;
