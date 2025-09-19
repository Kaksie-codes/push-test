import { useState } from 'react';
import { AuthLayout } from '../components/Layout';
import { Button, Input } from '../components/ui';
import { authAPI } from '../utils/api';
import toast from 'react-hot-toast';

export default function ResendVerificationPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const validateForm = () => {
    if (!email) {
      setError('Email is required');
      return false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Email is invalid');
      return false;
    }
    setError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      await authAPI.resendVerification(email);
      setSent(true);
      toast.success('Verification email sent!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send verification email');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <AuthLayout title="Verification Email Sent">
        <div className="text-center">
          <div className="mb-6">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100">
              <svg
                className="h-8 w-8 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Check Your Email
          </h3>
          <p className="text-sm text-gray-600 mb-6">
            If the email exists and is not verified, we've sent a new verification link to <strong>{email}</strong>
          </p>
          <div className="space-y-3">
            <a
              href="/login"
              className="inline-flex justify-center w-full px-4 py-2 text-sm font-medium text-primary-600 bg-white border border-primary-600 rounded-md hover:bg-primary-50"
            >
              Back to Login
            </a>
            <Button
              onClick={() => {
                setSent(false);
                setEmail('');
              }}
              variant="secondary"
              className="w-full"
            >
              Send to Different Email
            </Button>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Resend Verification Email">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <p className="text-sm text-gray-600 mb-4">
            Enter your email address to receive a new verification link.
          </p>
          <Input
            type="email"
            label="Email address"
            placeholder="Enter your email"
            value={email}
            onChange={setEmail}
            error={error}
            disabled={loading}
          />
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={loading}
        >
          {loading ? 'Sending...' : 'Send Verification Email'}
        </Button>

        <div className="text-center">
          <span className="text-sm text-gray-600">
            Remember your password?{' '}
            <a
              href="/login"
              className="font-medium text-primary-600 hover:text-primary-500"
            >
              Back to Login
            </a>
          </span>
        </div>
      </form>
    </AuthLayout>
  );
}