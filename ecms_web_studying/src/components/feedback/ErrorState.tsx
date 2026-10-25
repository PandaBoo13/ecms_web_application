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
  <Result
    status="error"
    title={title}
    subTitle={description}
    extra={
      onRetry && (
        <Button type="primary" icon={<ReloadOutlined />} onClick={onRetry}>
          Thử lại
        </Button>
      )
    }
  />
);

export default ErrorState;