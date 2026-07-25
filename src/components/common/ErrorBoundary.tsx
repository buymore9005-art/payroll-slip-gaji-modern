import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertOctagon, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/Button';

type State = { hasError: boolean; message: string };

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Application error:', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <div className="surface max-w-lg p-8 text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300">
            <AlertOctagon className="size-7" />
          </div>
          <h1 className="text-xl font-bold">Aplikasi mengalami kendala</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{this.state.message || 'Kesalahan tak terduga terjadi.'}</p>
          <Button className="mt-6" onClick={() => location.reload()}>
            <RotateCcw className="size-4" /> Muat Ulang
          </Button>
        </div>
      </main>
    );
  }
}
