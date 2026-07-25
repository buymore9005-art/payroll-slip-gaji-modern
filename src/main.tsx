import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import App from '@/App';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { I18nProvider } from '@/i18n/I18nContext';
import { useTheme } from '@/hooks/useTheme';
import { queryClient } from '@/lib/queryClient';
import '@/styles/index.css';

function ApplicationProviders() {
  const { resolvedTheme } = useTheme();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <App />
        <Toaster
          position="top-right"
          theme={resolvedTheme}
          richColors
          closeButton
          toastOptions={{ className: 'font-sans' }}
        />
      </AuthProvider>
    </QueryClientProvider>
  );
}

const container = document.getElementById('root');
if (!container) throw new Error('Root element tidak ditemukan.');

createRoot(container).render(
  <StrictMode>
    <ErrorBoundary>
      <I18nProvider>
        <ThemeProvider>
          <ApplicationProviders />
        </ThemeProvider>
      </I18nProvider>
    </ErrorBoundary>
  </StrictMode>,
);
