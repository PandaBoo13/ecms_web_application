import { Empty } from 'antd';
import type { ReactNode } from 'react';

interface Props {
  title?: string;
  description?: string;
  action?: ReactNode;
  image?: string;
}

const EmptyState = ({
  title = 'Chưa có dữ liệu',
  description,
  action,
}: Props) => (
  <div
    style={{
      padding: '48px 24px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    <Empty
      description={
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 500, color: '#262626', marginBottom: 4 }}>
            {title}
          </div>
          {description && (
            <div style={{ fontSize: 14, color: '#8c8c8c' }}>{description}</div>
          )}
        </div>
      }
    >
      {action}
    </Empty>
  </div>
);

export default EmptyState;