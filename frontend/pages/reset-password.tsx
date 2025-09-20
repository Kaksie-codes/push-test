import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { AuthLayout } from '../components/Layout';
import { Button, Input } from '../components/ui';
import { authAPI } from '../utils/api';
import toast from 'react-hot-toast';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [token, setToken] = useState('');
  const router = useRouter();

  useEffect(() => {
    if (router.query.token) {
      setToken(router.query.token as string);
    }
  }, [router.query.token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password.trim()) {
      toast.error('Please enter a new password');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (!token) {
      toast.error('Invalid reset token');
      return;
    }

    try {
      setLoading(true);
      await authAPI.resetPassword({ token, password });
      setResetSuccess(true);
      toast.success('Password reset successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  if (resetSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="text-center">
            <div className="mx-auto h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Password Reset Successful</h2>
            <p className="mt-4 text-gray-600">
              Your password has been reset successfully. You can now sign in with your new password.
            </p>
          </div>

          <div className="mt-8">
            <Button 
              onClick={() => router.push('/login')}
              className="w-full"
            >
              Sign In
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <AuthLayout title="Invalid Reset Link">
        <div className="text-center">
          <p className="text-gray-600 mb-6">
            This password reset link is invalid or has expired.
          </p>
          <Link href="/forgot-password" className="text-blue-600 hover:text-blue-500">
            Request a new password reset
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Reset your password">
      <p className="text-center text-gray-600 mb-6">
        Enter your new password below.
      </p>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            New Password
          </label>
          <div className="mt-1">
            <Input
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="Enter new password"
            />
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Must be at least 6 characters long
          </p>
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
            Confirm Password
          </label>
          <div className="mt-1">
            <Input
              type="password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              placeholder="Confirm new password"
            />
          </div>
        </div>

        <div>
          <Button
            type="submit"
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Resetting...' : 'Reset Password'}
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