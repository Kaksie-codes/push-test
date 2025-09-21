import '../styles/globals.css'
import type { AppProps } from 'next/app'
import { AuthProvider } from '../hooks/useAuth'
import { Toaster } from 'react-hot-toast'
import { useEffect } from 'react'
import { useRouter } from 'next/router'

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();

  useEffect(() => {
    // Listen for navigation messages from service worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const messageHandler = (event: MessageEvent) => {
        console.log('Received message from service worker:', event.data);
        if (event.data && event.data.type === 'NAVIGATE') {
          const url = event.data.url;
          console.log('Navigating from service worker message to:', url);
          router.push(url);
        }
      };
      
      navigator.serviceWorker.addEventListener('message', messageHandler);
      
      // Cleanup
      return () => {
        navigator.serviceWorker.removeEventListener('message', messageHandler);
      };
    }
  }, [router]);

  return (
    <AuthProvider>
      <Component {...pageProps} />
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#fff',
            color: '#374151',
            border: '1px solid #e5e7eb',
            borderRadius: '0.5rem',
          },
        }}
      />
    </AuthProvider>
  )
}