import { useState } from 'react';
import { Alert, Button, Form, Input, Modal, Space, Typography } from 'antd';
import { UnlockOutlined } from '@ant-design/icons';
import toast from 'react-hot-toast';
import { enrollmentApi } from '@/services/api/enrollment';
import { showError } from '@/utils/errorHelper';

interface Props {
  courseId: number;
  onSuccess: () => void;
}

const ReopenGradeSheetAction = ({ courseId, onSuccess }: Props) => {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm<{ reason: string }>();

  const handleSubmit = async (values: { reason: string }) => {
    setSubmitting(true);
    try {
      await enrollmentApi.reopenGradeSheet(courseId, { reason: values.reason.trim() });
      toast.success('Đã mở lại bảng điểm để giảng viên chỉnh sửa và gửi duyệt lại');
      setOpen(false);
      form.resetFields();
      onSuccess();
    } catch (err) {
      showError(err, 'Mở lại bảng điểm thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ paddingTop: 16, borderTop: '1px solid #f0f0f0', marginTop: 16 }}>
      <Space align="start" style={{ width: '100%', justifyContent: 'space-between' }}>
        <Typography.Text type="secondary" style={{ maxWidth: 460 }}>
          Bảng điểm đã duyệt đang khóa sửa điểm và điểm danh. Chỉ mở lại khi phát hiện sai sót;
          thao tác mở khóa được ghi vào audit log.
        </Typography.Text>
        <Button danger icon={<UnlockOutlined />} onClick={() => setOpen(true)}>
          Mở lại bảng điểm
        </Button>
      </Space>

      <Modal
        title="Mở lại bảng điểm đã duyệt"
        open={open}
        okText="Mở lại"
        cancelText="Hủy"
        okButtonProps={{ danger: true }}
        confirmLoading={submitting}
        onCancel={() => {
          setOpen(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        destroyOnHidden
      >
        <Alert
          type="warning"
          showIcon
          className="mb-4"
          message="Bảng điểm sẽ chuyển về trạng thái nháp"
          description={
            <span>
              Giảng viên có thể sửa điểm cuối khóa và điểm danh, sau đó gửi duyệt lại. Với học viên
              đã được xét hoàn thành, giảng viên cần Hoàn tác xét hoàn thành trước khi sửa điểm,
              rồi xét lại sau khi bảng điểm được duyệt lại.
            </span>
          }
        />
        <Form form={form} layout="vertical" onFinish={(values) => void handleSubmit(values)}>
          <Form.Item
            name="reason"
            label="Lý do mở lại"
            rules={[{ required: true, whitespace: true, message: 'Vui lòng nhập lý do mở lại' }]}
          >
            <Input.TextArea rows={3} placeholder="Ví dụ: nhập sai điểm của học viên..., điểm danh bị sai..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ReopenGradeSheetAction;
