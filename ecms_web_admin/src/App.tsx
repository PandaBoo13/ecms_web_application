import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import AppRouter from '@/routes';
import ErrorBoundary from '@/components/feedback/ErrorBoundary';

function App() {
  const { fetchMe, initialized } = useAuth();

  // Lần đầu vào app → thử lấy user (cookie còn hạn thì auto login)
  useEffect(() => {
    if (!initialized) {
      fetchMe();
    }
  }, [initialized, fetchMe]);

  return (
    <ErrorBoundary>
      <AppRouter />
    </ErrorBoundary>
  );
}

export default App;