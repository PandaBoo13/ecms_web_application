import { useEffect, useState } from 'react';
import { Select, Tooltip } from 'antd';
import toast from 'react-hot-toast';
import { leadApi } from '@/services/api/leads';

interface Props {
  value?: string;
  onChange?: (status: string) => void;
  style?: React.CSSProperties;
}

const WORK_STATUS_OPTIONS = [
  {
    value: 'AVAILABLE',
    label: 'Sẵn sàng nhận khách',
    color: 'success',
    tooltip: 'Đang trong ca trực và sẵn sàng nhận thông báo khách mới qua WebSocket.',
  },
  {
    value: 'BUSY',
    label: 'Đang bận tư vấn',
    color: 'warning',
    tooltip: 'Đang trong cuộc gọi tư vấn, tạm thời không nhận thêm lead.',
  },
  {
    value: 'ON_LEAVE',
    label: 'Nghỉ phép',
    color: 'default',
    tooltip: 'Đang nghỉ phép, hệ thống sẽ bỏ qua không gửi thông báo lead mới.',
  },
  {
    value: 'SICK_LEAVE',
    label: 'Nghỉ bệnh',
    color: 'error',
    tooltip: 'Đang nghỉ ốm, hệ thống sẽ bỏ qua không gửi thông báo lead mới.',
  },
];

export const ConsultantWorkStatusWidget = ({ value, onChange, style }: Props) => {
  const [currentStatus, setCurrentStatus] = useState<string>(value || 'AVAILABLE');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (value) {
      setCurrentStatus(value);
      return;
    }
    // Fetch initial status from backend
    (async () => {
      try {
        const res = await leadApi.getWorkStatus();
        if (res?.workStatus) {
          setCurrentStatus(res.workStatus);
          onChange?.(res.workStatus);
        }
      } catch {
        // Fallback default
      }
    })();
  }, [value]);

  const handleChange = async (newVal: string) => {
    setLoading(true);
    try {
      await leadApi.updateWorkStatus(newVal);
      setCurrentStatus(newVal);
      onChange?.(newVal);
      const opt = WORK_STATUS_OPTIONS.find((o) => o.value === newVal);
      toast.success(`Đã chuyển trạng thái: ${opt?.label || newVal}`);
    } catch (err) {
      const e = err as { message?: string };
      toast.error(e?.message || 'Không thể cập nhật trạng thái làm việc');
    } finally {
      setLoading(false);
    }
  };

  const selectedOpt = WORK_STATUS_OPTIONS.find((o) => o.value === currentStatus);

  return (
    <Tooltip title={selectedOpt?.tooltip || 'Trạng thái làm việc của tư vấn viên'}>
      <Select
        value={currentStatus}
        onChange={handleChange}
        loading={loading}
        style={{ width: 195, height: 38, ...style }}
        options={WORK_STATUS_OPTIONS.map((o) => ({
          value: o.value,
          label: (
            <span style={{ fontSize: 13, fontWeight: 500 }}>
              {o.label}
            </span>
          ),
        }))}
      />
    </Tooltip>
  );
};

export default ConsultantWorkStatusWidget;
