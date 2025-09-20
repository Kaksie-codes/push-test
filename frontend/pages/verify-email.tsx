import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { AuthLayout } from '../components/Layout';
import { Button, Loading } from '../components/ui';
import { authAPI } from '../utils/api';
import toast from 'react-hot-toast';

export default function VerifyEmailPage() {
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState('');
  
  const router = useRouter();
  const { token } = router.query;

  useEffect(() => {
    if (token) {
      verifyEmail(token as string);
    }
  }, [token]);

  const verifyEmail = async (verificationToken: string) => {
    try {
      setLoading(true);
      
      // Clean token - remove URL tracking parameters and URL encoding artifacts
      let cleanToken = verificationToken;
      
      // Remove Gmail tracking parameters
      if (cleanToken.includes('&source=gmail')) {
        cleanToken = cleanToken.split('&source=gmail')[0];
      }
      
      // Remove URL encoding artifacts that might be added
      cleanToken = cleanToken.replace(/^3D/, ''); // Remove URL-encoded '=' at start
      cleanToken = decodeURIComponent(cleanToken); // Decode any URL encoding
      
      await authAPI.verifyEmail(cleanToken);
      setVerified(true);
      toast.success('Email verified successfully!');
    } catch (error: any) {
      setError(error.response?.data?.message || 'Verification failed');
      toast.error('Email verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoToLogin = () => {
    router.push('/login');
  };

  return (
    <AuthLayout title="Email Verification">
      <div className="text-center">
        {loading && (
          <div>
            <Loading size="lg" className="mb-4" />
            <p className="text-gray-600">Verifying your email...</p>
          </div>
        )}

        {!loading && verified && (
          <div>
            <div className="mb-6">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100">
                <svg
                  className="h-8 w-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Email Verified Successfully!
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              Your email has been verified. You can now log in to your account.
            </p>
            <Button onClick={handleGoToLogin} className="w-full">
              Go to Login
            </Button>
          </div>
        )}

        {!loading && error && (
          <div>
            <div className="mb-6">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100">
                <svg
                  className="h-8 w-8 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Verification Failed
            </h3>
            <p className="text-sm text-gray-600 mb-6">{error}</p>
            <div className="space-y-3">
              <Button onClick={handleGoToLogin} variant="secondary" className="w-full">
                Go to Login
              </Button>
              <p className="text-xs text-gray-500">
                Need a new verification link?{' '}
                <a
                  href="/resend-verification"
                  className="font-medium text-primary-600 hover:text-primary-500"
                >
                  Resend verification email
                </a>
              </p>
            </div>
          </div>
        )}

        {!loading && !verified && !error && (
          <div>
            <p className="text-gray-600">Invalid or missing verification token.</p>
            <Button onClick={handleGoToLogin} variant="secondary" className="w-full mt-4">
              Go to Login
            </Button>
          </div>
        )}
      </div>
    </AuthLayout>
  );
}