// src/components/common/ErrorBoundary.tsx
import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { Button, Result } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="min-h-[60vh] w-full flex items-center justify-center p-6">
          <div className="w-full max-w-lg rounded-xl border border-slate-200/90 bg-white px-6 py-4">
            <Result
              status="500"
              title={
                <span className="text-lg font-bold text-slate-900">
                  Lỗi ứng dụng
                </span>
              }
              subTitle={
                <span className="text-[13.5px] text-slate-500">
                  {this.state.error?.message ||
                    'Đã xảy ra lỗi không mong muốn trong quá trình hiển thị.'}
                </span>
              }
              extra={
                <Button
                  type="primary"
                  icon={<ReloadOutlined />}
                  onClick={this.handleReset}
                  className="!rounded-lg !font-medium"
                >
                  Tải lại trang
                </Button>
              }
            />
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;