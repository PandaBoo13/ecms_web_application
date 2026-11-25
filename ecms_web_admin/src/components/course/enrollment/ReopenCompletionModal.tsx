import { useEffect } from 'react';
import { Alert, Form, Input, Modal } from 'antd';

interface Props {
  open: boolean;
  studentName?: string | null;
  loading: boolean;
  onCancel: () => void;
  onSubmit: (reason: string) => Promise<boolean>;
}

export default function ReopenCompletionModal({
  open,
  studentName,
  loading,
  onCancel,
  onSubmit,
}: Props) {
  const [form] = Form.useForm<{ reason: string }>();

  useEffect(() => {
    if (!open) form.resetFields();
  }, [form, open]);

  const handleSubmit = async ({ reason }: { reason: string }) => {
    const succeeded = await onSubmit(reason.trim());
    if (succeeded) form.resetFields();
  };

  return (
    <Modal
      title="Hoàn tác xét hoàn thành"
      open={open}
      confirmLoading={loading}
      okText="Hoàn tác"
      cancelText="Hủy"
      okButtonProps={{ danger: true }}
      onCancel={onCancel}
      onOk={() => form.submit()}
      destroyOnHidden
    >
      {studentName && (
        <Alert
          className="mb-4"
          type="warning"
          showIcon
          message={studentName}
          description="Học viên sẽ quay về trạng thái Đang học và kết quả hoàn thành bị xóa để xét lại. Điểm cuối khóa và bảng điểm đã duyệt được giữ nguyên."
        />
      )}
      <Form form={form} layout="vertical" onFinish={(values: { reason: string }) => void handleSubmit(values)}>
        <Form.Item
          name="reason"
          label="Lý do hoàn tác"
          rules={[{ required: true, whitespace: true, message: 'Vui lòng nhập lý do' }]}
        >
          <Input.TextArea rows={3} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
