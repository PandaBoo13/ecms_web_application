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
    <div className="flex justify-between items-center mb-5 gap-4 flex-wrap">
      <div className="flex items-center gap-3">
        {backButton && (
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={handleBack}
            className="!rounded-lg !border !border-slate-200 !bg-white hover:!bg-slate-50 transition-colors"
          />
        )}
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-[22px] font-bold m-0 text-slate-900 leading-tight tracking-tight">
              {title}
            </h1>
            {badge}
          </div>
          {subtitle && (
            <p className="mt-1 mb-0 text-slate-500 text-[13px] leading-snug">
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