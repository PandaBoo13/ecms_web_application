import { useEffect, useState, type CSSProperties } from 'react';
import {
  Alert,
  Button,
  Form,
  Input,
  Modal,
  Radio,
  Select,
  Space,
  Typography,
} from 'antd';
import {
  BankOutlined,
  DollarOutlined,
  MailOutlined,
} from '@ant-design/icons';
import toast from 'react-hot-toast';

import ThumbnailUpload from '@/components/common/ThumbnailUpload';
import { tuitionApi } from '@/services/api/tuition';
import type { Student } from '@/services/types/student';
import { showError } from '@/utils/errorHelper';
import { formatMoney } from '@/utils/format';

const { Text } = Typography;

export interface InvoiceCourseOption {
  id: number;
  title: string;
  code?: string;
  price?: number;
  courseType?: 'ONLINE' | 'OFFLINE';
  isFree?: boolean;
}

interface Props {
  open: boolean;
  student: Student | null;
  courses: InvoiceCourseOption[];
  onCancel: () => void;
  onCreated: () => void;
}

const optionStyle: CSSProperties = {
  display: 'flex',
  width: '100%',
  alignItems: 'flex-start',
  marginInlineEnd: 0,
  padding: '12px 14px',
  border: '1px solid #e2e8f0',
  borderRadius: 10,
  background: '#fff',
};

const CreateInvoiceFromStudentModal = ({ open, student, courses, onCancel, onCreated }: Props) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const method = Form.useWatch('paymentMethod', form) as 'CASH' | 'BANK_TRANSFER' | undefined;
  const courseId = Form.useWatch('courseId', form) as number | undefined;
  const selectedCourse = courses.find((course) => course.id === courseId);

  // Chỉ hiển thị các khóa OFFLINE đã có học phí hợp lệ.
  const eligibleCourses = courses.filter(
    (course) =>
      course.courseType === 'OFFLINE' && !course.isFree && course.price != null && course.price > 0,
  );

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    form.setFieldsValue({
      paymentMethod: 'BANK_TRANSFER',
      email: student?.email,
      proofUrl: undefined,
      courseId: undefined,
    });
  }, [open, student?.id, student?.email, form]);

  const close = () => {
    form.resetFields();
    onCancel();
  };

  const handleSubmit = async (values: Record<string, unknown>) => {
    if (!student) return;
    const paymentMethod = values.paymentMethod as 'CASH' | 'BANK_TRANSFER';
    setSubmitting(true);
    try {
      await tuitionApi.createFromStudent({
        studentId: student.id,
        courseId: values.courseId as number,
        paymentMethod,
        email: paymentMethod === 'BANK_TRANSFER' ? (values.email as string | undefined) : undefined,
        proofUrl: paymentMethod === 'CASH' ? (values.proofUrl as string | undefined) : undefined,
      });

      onCreated();
      toast.success('Tạo hóa đơn thành công');
      close();
    } catch (err) {
      showError(err, 'Tạo hóa đơn cho học viên không thành công');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      width={640}
      destroyOnClose
      onCancel={close}
      title="Tạo hóa đơn học phí cho học viên"
      footer={[
        <Button key="cancel" onClick={close}>Hủy</Button>,
        <Button
          key="submit"
          type="primary"
          loading={submitting}
          disabled={eligibleCourses.length === 0}
          onClick={() => form.submit()}
        >
          Tạo hóa đơn
        </Button>,
      ]}
    >
      <Space direction="vertical" size={16} className="w-full">
          <div
            style={{
              padding: 14,
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              background: 'linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>Học viên</Text>
                <div style={{ fontWeight: 700, color: '#0f172a' }}>{student?.fullName || '—'}</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                  {student?.studentCode || '—'} · {student?.phone || student?.email || '—'}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Học phí khóa đã chọn</Text>
                <div style={{ fontWeight: 800, color: '#1677ff', fontSize: 20 }}>
                  {formatMoney(selectedCourse?.price, false)}
                </div>
              </div>
            </div>
          </div>

          {eligibleCourses.length === 0 && (
            <Alert
              type="warning"
              showIcon
              message="Chưa có khóa học OFFLINE nào có học phí hợp lệ để tạo hóa đơn."
            />
          )}

          <Form form={form} layout="vertical" onFinish={handleSubmit}>
            <Form.Item
              name="courseId"
              label="Khóa học cần tạo hóa đơn"
              rules={[{ required: true, message: 'Vui lòng chọn khóa học' }]}
            >
              <Select
                showSearch
                optionFilterProp="label"
                placeholder="Chọn khóa học OFFLINE"
                options={eligibleCourses.map((course) => ({
                  value: course.id,
                  label: `${course.title} · ${formatMoney(course.price, false)}`,
                }))}
              />
            </Form.Item>

            <Form.Item
              name="paymentMethod"
              label="Phương thức thanh toán"
              rules={[{ required: true, message: 'Vui lòng chọn phương thức thanh toán' }]}
            >
              <Radio.Group style={{ width: '100%' }}>
                <Space direction="vertical" size={10} style={{ width: '100%' }}>
                  <Radio value="BANK_TRANSFER" style={optionStyle}>
                    <div>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>
                        <BankOutlined style={{ color: '#1677ff', marginRight: 6 }} />
                        Chuyển khoản qua VNPAY
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>
                        Gửi link thanh toán qua email, hóa đơn có hạn 24 giờ.
                      </div>
                    </div>
                  </Radio>
                  <Radio value="CASH" style={optionStyle}>
                    <div>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>
                        <DollarOutlined style={{ color: '#059669', marginRight: 6 }} />
                        Thu tiền mặt ngay
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>
                        Xác nhận thanh toán và tải ảnh chứng từ thu tiền.
                      </div>
                    </div>
                  </Radio>
                </Space>
              </Radio.Group>
            </Form.Item>

            {method === 'BANK_TRANSFER' && (
              <>
                <Form.Item
                  name="email"
                  label="Email nhận link thanh toán"
                  rules={[
                    { required: true, message: 'Vui lòng nhập email nhận link' },
                    { type: 'email', message: 'Email không hợp lệ' },
                  ]}
                >
                  <Input prefix={<MailOutlined style={{ color: '#94a3b8' }} />} placeholder="email@example.com" />
                </Form.Item>
                <Alert
                  type="info"
                  showIcon
                  message="Hóa đơn có hạn thanh toán 24 giờ kể từ khi tạo. Hệ thống gửi email kèm link thanh toán VNPAY cho người nộp."
                />
              </>
            )}

            {method === 'CASH' && (
              <Form.Item
                name="proofUrl"
                label="Ảnh chứng từ thu tiền mặt"
                rules={[{ required: true, message: 'Vui lòng tải ảnh chứng từ thu tiền mặt' }]}
              >
                <ThumbnailUpload width={280} height={160} />
              </Form.Item>
            )}
          </Form>
      </Space>
    </Modal>
  );
};

export default CreateInvoiceFromStudentModal;
