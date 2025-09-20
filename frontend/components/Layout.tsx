import { ReactNode } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../hooks/useAuth';
import { Button } from './ui';

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Function to check if a path is active
  const isActivePath = (path: string) => {
    if (path === '/feed') {
      return router.pathname === '/feed';
    }
    if (path === '/users') {
      return router.pathname === '/users';
    }
    if (path.startsWith('/users/')) {
      return router.pathname.startsWith('/users/') && router.pathname !== '/users';
    }
    return false;
  };

  // Function to get navigation link classes
  const getNavLinkClasses = (path: string) => {
    const baseClasses = "px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200";
    const isActive = isActivePath(path);
    
    if (isActive) {
      return `${baseClasses} bg-blue-100 text-blue-700 border border-blue-200`;
    }
    return `${baseClasses} text-gray-700 hover:text-gray-900 hover:bg-gray-100`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">
                SocialApp
              </h1>
            </div>

            {/* Navigation */}
            {user && (
              <nav className="flex items-center space-x-4">
                <a href="/feed" className={getNavLinkClasses('/feed')}>
                  Feed
                </a>
                <a href="/users" className={getNavLinkClasses('/users')}>
                  Users
                </a>
                <a href={`/users/${user.id}`} className={getNavLinkClasses(`/users/${user.id}`)}>
                  Profile
                </a>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleLogout}
                >
                  Logout
                </Button>
              </nav>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
};

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
}

export const AuthLayout = ({ children, title }: AuthLayoutProps) => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          {title}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Welcome to SocialApp
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {children}
        </div>
      </div>
    </div>
  );
};