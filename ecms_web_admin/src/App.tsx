import { useEffect } from 'react';
import { ConfigProvider } from 'antd';
import viVN from 'antd/locale/vi_VN';
import enUS from 'antd/locale/en_US';
import { useAuth } from '@/hooks/useAuth';
import { useLocaleStore } from '@/stores/localeStore';
import AppRouter from '@/routes';
import ErrorBoundary from '@/components/feedback/ErrorBoundary';

function App() {
  const { fetchMe, initialized } = useAuth();
  const { locale } = useLocaleStore();

  // Lần đầu vào app → thử lấy user (cookie còn hạn thì auto login)
  useEffect(() => {
    if (!initialized) {
      fetchMe();
    }
  }, [initialized, fetchMe]);

  return (
    <ErrorBoundary>
      <ConfigProvider
        locale={locale === 'en' ? enUS : viVN}
        theme={{
          token: {
            colorPrimary: '#1677ff',
            borderRadius: 6,
          },
        }}
      >
        <AppRouter />
      </ConfigProvider>
    </ErrorBoundary>
  );
}

export default App;