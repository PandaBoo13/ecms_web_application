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
  badge?: ReactNode;
}

const PageHeader = ({ title, subtitle, extra, backButton, backTo, badge }: Props) => {
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
        alignItems: 'center',
        marginBottom: 20,
        gap: 16,
        flexWrap: 'wrap',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {backButton && (
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={handleBack}
            style={{
              borderRadius: 8,
              border: '1px solid #e2e8f0',
              background: '#ffffff',
            }}
          />
        )}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1
              style={{
                fontSize: 22,
                fontWeight: 700,
                margin: 0,
                color: '#0f172a',
                lineHeight: 1.25,
                letterSpacing: '-0.02em',
              }}
            >
              {title}
            </h1>
            {badge}
          </div>
          {subtitle && (
            <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: 13, lineHeight: 1.4 }}>
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {extra && <Space size={10}>{extra}</Space>}
    </div>
  );
};

export default PageHeader;