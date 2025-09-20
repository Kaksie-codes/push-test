import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { AuthLayout } from '../components/Layout';
import { Button, Input } from '../components/ui';
import { authAPI } from '../utils/api';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast.error('Please enter your email address');
      return;
    }

    try {
      setLoading(true);
      await authAPI.forgotPassword(email);
      setEmailSent(true);
      toast.success('Password reset email sent! Check your inbox.');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="text-center">
            <div className="mx-auto h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Check your email</h2>
            <p className="mt-4 text-gray-600">
              We've sent a password reset link to <strong>{email}</strong>
            </p>
            <p className="mt-2 text-sm text-gray-500">
              Didn't receive the email? Check your spam folder or try again.
            </p>
          </div>

          <div className="mt-8 space-y-4">
            <Button 
              onClick={() => setEmailSent(false)}
              variant="secondary"
              className="w-full"
            >
              Try different email
            </Button>
            
            <div className="text-center">
              <Link href="/login" className="text-sm text-blue-600 hover:text-blue-500">
                Back to login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AuthLayout title="Forgot your password?">
      <p className="text-center text-gray-600 mb-6">
        Enter your email address and we'll send you a link to reset your password.
      </p>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email address
          </label>
          <div className="mt-1">
            <Input
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="Enter your email"
            />
          </div>
        </div>

        <div>
          <Button
            type="submit"
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Sending...' : 'Send reset email'}
          </Button>
        </div>
      </form>

      <div className="mt-6">
        <div className="text-center">
          <Link href="/login" className="text-sm text-blue-600 hover:text-blue-500">
            Remember your password? Sign in
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}