import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../hooks/useAuth';
import { AuthLayout } from '../components/Layout';
import { Button, Input } from '../components/ui';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const { login, user } = useAuth();
  const router = useRouter();
  const { message } = router.query;

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      router.push('/feed');
    }
  }, [user, router]);

  // Show verification message if redirected from registration
  useEffect(() => {
    if (message === 'verify') {
      toast.success('Please check your email to verify your account before logging in.');
    }
  }, [message]);

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};
    
    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back!');
      router.push('/feed');
    } catch (error: any) {
      const errorMessage = error.message || 'Login failed';
      toast.error(errorMessage);
      
      // If it's a verification error, show link to resend verification
      if (errorMessage.includes('verify your email')) {
        setTimeout(() => {
          toast((t) => (
            <div>
              <p className="text-sm">{errorMessage}</p>
              <a
                href="/resend-verification"
                className="text-primary-600 hover:text-primary-500 text-sm font-medium"
                onClick={() => toast.dismiss(t.id)}
              >
                Resend verification email
              </a>
            </div>
          ), { duration: 8000 });
        }, 500);
      }
    } finally {
      setLoading(false);
    }
  };

  if (user) {
    return null; // Will redirect
  }

  return (
    <AuthLayout title="Sign in to your account">
      <form onSubmit={handleSubmit} className="space-y-6">
        <Input
          type="email"
          label="Email address"
          placeholder="Enter your email"
          value={email}
          onChange={setEmail}
          error={errors.email}
          disabled={loading}
        />

        <Input
          type="password"
          label="Password"
          placeholder="Enter your password"
          value={password}
          onChange={setPassword}
          error={errors.password}
          disabled={loading}
        />

        <div className="flex items-center justify-between">
          <div className="text-sm">
            <a
              href="/forgot-password"
              className="font-medium text-primary-600 hover:text-primary-500"
            >
              Forgot your password?
            </a>
          </div>
          <div className="text-sm">
            <a
              href="/resend-verification"
              className="font-medium text-primary-600 hover:text-primary-500"
            >
              Resend verification
            </a>
          </div>
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={loading}
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </Button>

        <div className="text-center">
          <span className="text-sm text-gray-600">
            Don't have an account?{' '}
            <a
              href="/register"
              className="font-medium text-primary-600 hover:text-primary-500"
            >
              Sign up
            </a>
          </span>
        </div>
      </form>
    </AuthLayout>
  );
}