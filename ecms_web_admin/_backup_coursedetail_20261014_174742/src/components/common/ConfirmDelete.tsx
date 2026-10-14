import { Popconfirm } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import type { ReactNode } from 'react';
import { useState } from 'react';
import toast from 'react-hot-toast';

interface Props {
  title?: string;
  description?: string;
  onConfirm: () => Promise<void>;
  onSuccess?: () => void;
  children?: ReactNode;
}

const ConfirmDelete = ({
  title = 'Xác nhận xóa',
  description = 'Bạn có chắc chắn muốn xóa? Hành động này không thể hoàn tác.',
  onConfirm,
  onSuccess,
  children,
}: Props) => {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
      toast.success('Xóa thành công');
      onSuccess?.();
    } catch (error) {
      const err = error as { message?: string };
      toast.error(err?.message || 'Xóa thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Popconfirm
      title={title}
      description={description}
      onConfirm={handleConfirm}
      okText="Xóa"
      cancelText="Hủy"
      okButtonProps={{ danger: true, loading }}
    >
      {children || <DeleteOutlined style={{ color: '#ff4d4f', cursor: 'pointer' }} />}
    </Popconfirm>
  );
};

export default ConfirmDelete;