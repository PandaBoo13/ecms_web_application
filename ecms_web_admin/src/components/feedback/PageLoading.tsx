// src/components/common/PageLoading.tsx
import { Spin } from 'antd';

interface Props {
  tip?: string;
}

const PageLoading = ({ tip = 'Đang tải...' }: Props) => (
  <div className="min-h-[60vh] w-full flex flex-col items-center justify-center gap-3.5 py-12">
    <Spin size="large" />
    {tip && (
      <span className="text-[13px] font-medium text-slate-500">{tip}</span>
    )}
  </div>
);

export default PageLoading;