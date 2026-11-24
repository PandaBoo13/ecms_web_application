// src/components/common/ErrorState.tsx
import { Button, Result } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';

interface Props {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

const ErrorState = ({
  title = 'Có lỗi xảy ra',
  description = 'Không thể tải dữ liệu. Vui lòng thử lại.',
  onRetry,
}: Props) => (
  <div className="py-10 px-6 flex items-center justify-center">
    <Result
      status="error"
      className="!py-4"
      title={
        <span className="text-[16px] font-bold text-slate-900">{title}</span>
      }
      subTitle={
        <span className="text-[13.5px] text-slate-500">{description}</span>
      }
      extra={
        onRetry && (
          <Button
            type="primary"
            icon={<ReloadOutlined />}
            onClick={onRetry}
            className="!rounded-lg !font-medium"
          >
            Thử lại
          </Button>
        )
      }
    />
  </div>
);

export default ErrorState;