import { ReactNode, useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../hooks/useAuth';
import { Button } from './ui';
import { notificationsAPI } from '../utils/api';

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Close mobile menu when route changes
  useEffect(() => {
    const handleRouteChange = () => {
      setIsMobileMenuOpen(false);
    };

    router.events.on('routeChangeStart', handleRouteChange);
    return () => {
      router.events.off('routeChangeStart', handleRouteChange);
    };
  }, [router.events]);

  // Fetch unread notifications count
  useEffect(() => {
    const fetchUnreadCount = async () => {
      if (user) {
        try {
          const response = await notificationsAPI.getUnreadCount();
          setUnreadCount(response.data.count);
        } catch (error) {
          console.error('Failed to fetch unread count:', error);
        }
      }
    };

    fetchUnreadCount();
    
    // Optionally, set up polling to check for new notifications
    const interval = setInterval(fetchUnreadCount, 30000); // Check every 30 seconds
    
    return () => clearInterval(interval);
  }, [user]);

  // Clear unread count when user visits notifications page
  useEffect(() => {
    if (router.pathname === '/notifications' && unreadCount > 0) {
      // Small delay to allow the notifications page to load and mark items as read
      const timer = setTimeout(() => {
        setUnreadCount(0);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [router.pathname, unreadCount]);

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
    if (path === '/notifications') {
      return router.pathname === '/notifications';
    }
    if (path.startsWith('/users/') && user?.id) {
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
      <header className="bg-white shadow-sm border-b border-gray-200 relative">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">
                SocialApp
              </h1>
            </div>

            {/* Desktop Navigation */}
            {user && (
              <nav className="hidden md:flex items-center space-x-4">
                <a href="/feed" className={getNavLinkClasses('/feed')}>
                  Feed
                </a>
                <a href="/users" className={getNavLinkClasses('/users')}>
                  Users
                </a>
                <a href="/notifications" className={`${getNavLinkClasses('/notifications')} relative`}>
                  Notifications
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center min-w-[1.25rem]">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </a>
                {user.id && (
                  <a href={`/users/${user.id}`} className={getNavLinkClasses(`/users/${user.id}`)}>
                    Profile
                  </a>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleLogout}
                >
                  Logout
                </Button>
              </nav>
            )}

            {/* Mobile menu button */}
            {user && (
              <div className="md:hidden">
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 transition-colors duration-150"
                  aria-expanded={isMobileMenuOpen}
                  aria-label="Toggle navigation menu"
                >
                  <span className="sr-only">Open main menu</span>
                  {/* Hamburger icon with animation */}
                  <div className="relative w-6 h-6">
                    <span
                      className={`absolute block w-6 h-0.5 bg-current transform transition-all duration-200 ease-out ${
                        isMobileMenuOpen ? 'rotate-45 translate-y-2' : 'translate-y-1'
                      }`}
                    />
                    <span
                      className={`absolute block w-6 h-0.5 bg-current transform transition-all duration-200 ease-out translate-y-2 ${
                        isMobileMenuOpen ? 'opacity-0' : 'opacity-100'
                      }`}
                    />
                    <span
                      className={`absolute block w-6 h-0.5 bg-current transform transition-all duration-200 ease-out ${
                        isMobileMenuOpen ? '-rotate-45 translate-y-2' : 'translate-y-3'
                      }`}
                    />
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile menu - Absolutely positioned */}
        {user && (
          <div className={`absolute top-full left-0 right-0 md:hidden z-50 transition-all duration-300 ease-in-out transform ${
            isMobileMenuOpen 
              ? 'translate-y-0 opacity-100 visible' 
              : '-translate-y-2 opacity-0 invisible'
          }`}>
            <div className="bg-white border-t border-gray-200 shadow-lg">
              <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                <a
                  href="/feed"
                  className={`${getNavLinkClasses('/feed')} block px-3 py-2 text-base font-medium transition-colors duration-150`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                    </svg>
                    Feed
                  </div>
                </a>
                <a
                  href="/users"
                  className={`${getNavLinkClasses('/users')} block px-3 py-2 text-base font-medium transition-colors duration-150`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                    Users
                  </div>
                </a>
                <a
                  href="/notifications"
                  className={`${getNavLinkClasses('/notifications')} block px-3 py-2 text-base font-medium transition-colors duration-150`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5-5-5h5v-12h5v12z" />
                      </svg>
                      Notifications
                    </div>
                    {unreadCount > 0 && (
                      <span className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center min-w-[1.25rem]">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </div>
                </a>
                {user.id && (
                  <a
                    href={`/users/${user.id}`}
                    className={`${getNavLinkClasses(`/users/${user.id}`)} block px-3 py-2 text-base font-medium transition-colors duration-150`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <div className="flex items-center">
                      <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Profile
                    </div>
                  </a>
                )}
                <div className="px-3 py-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      handleLogout();
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center justify-center transition-colors duration-150"
                  >
                    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Logout
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
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