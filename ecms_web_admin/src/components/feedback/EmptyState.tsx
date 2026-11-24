// src/components/common/EmptyState.tsx
import { Empty } from 'antd';
import type { ReactNode } from 'react';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  title?: string;
  description?: string;
  action?: ReactNode;
  image?: string;
}

const EmptyState = ({ title, description, action, image }: Props) => {
  const { t } = useTranslation();
  const displayTitle = title || t('common.noData');

  return (
    <div className="py-12 px-6 flex flex-col items-center justify-center text-center">
      <Empty
        image={image ?? Empty.PRESENTED_IMAGE_SIMPLE}
        description={
          <div className="flex flex-col items-center gap-1 mt-1">
            <div className="text-[15px] font-semibold text-slate-800">
              {displayTitle}
            </div>
            {description && (
              <div className="text-[13px] text-slate-500 max-w-md leading-relaxed">
                {description}
              </div>
            )}
          </div>
        }
      >
        {action && <div className="mt-2">{action}</div>}
      </Empty>
    </div>
  );
};

export default EmptyState;