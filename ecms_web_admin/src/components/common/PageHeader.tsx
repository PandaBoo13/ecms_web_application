import { Button, Space } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

interface Props {
  title: string;
  subtitle?: ReactNode;
  extra?: ReactNode;
  backButton?: boolean;
  backTo?: string;
}

const PageHeader = ({ title, subtitle, extra, backButton, backTo }: Props) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (backTo) navigate(backTo);
    else navigate(-1);
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 24,
        gap: 16,
        flexWrap: 'wrap',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        {backButton && (
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={handleBack}
            style={{ marginTop: 4 }}
          />
        )}
        <div>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 600,
              margin: 0,
              color: '#262626',
              lineHeight: 1.3,
            }}
          >
            {title}
          </h1>
          {subtitle && (
            <p style={{ margin: '4px 0 0 0', color: '#8c8c8c', fontSize: 14 }}>
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {extra && <Space>{extra}</Space>}
    </div>
  );
};

export default PageHeader;