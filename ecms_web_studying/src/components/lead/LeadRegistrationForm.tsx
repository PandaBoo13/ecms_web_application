import { useEffect, useState } from 'react';
import { Form, Input, Button, Select, Checkbox, Typography, Modal, Space, Tag } from 'antd';
import {
  UserOutlined,
  PhoneOutlined,
  MailOutlined,
  BookOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  SendOutlined,
} from '@ant-design/icons';
import toast from 'react-hot-toast';

import { leadApi } from '@/services/api/leads';

// 🆕 Cập nhật lại đường dẫn import API theo cấu trúc mới
import { courseApi } from '@/services/api/course';
// Nếu báo lỗi không tìm thấy, đổi thành: import { courseApi } from '@/services/api/course/courseApi';

import type { CourseResponse } from '@/services/types/course';
import type { LeadCreatePayload } from '@/services/types/lead';
import {
  normalizeEmail,
  normalizePhone,
  phoneFormRule,
  emailFormRule,
} from '@/utils/leadValidators';

const { Title, Paragraph, Text } = Typography;
const { Option } = Select;

interface FormValues {
  fullName: string;
  phone: string;
  email: string;
  courseId?: number;
  isPlacementTest?: boolean;
  note?: string;
}

interface LeadRegistrationFormProps {
  initialCourseId?: number;
  compact?: boolean;
  onSuccess?: () => void;
}

export default function LeadRegistrationForm({
  initialCourseId,
  compact = false,
  onSuccess,
}: LeadRegistrationFormProps) {
  const [form] = Form.useForm<FormValues>();
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState<CourseResponse[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [submittedLead, setSubmittedLead] = useState<{
    fullName: string;
    phone: string;
    email: string;
    courseName?: string;
    isPlacementTest?: boolean;
  } | null>(null);

  // Load danh sách khóa học đang mở (PUBLISHED)
  useEffect(() => {
    let mounted = true;
    setLoadingCourses(true);
    courseApi
      .search({ status: 'PUBLISHED', page: 0, size: 50 })
      .then((res) => {
        if (mounted && res?.content) {
          setCourses(res.content);
        }
      })
      .catch((err) => {
        console.warn('Không thể tải danh sách khóa học từ API:', err);
      })
      .finally(() => {
        if (mounted) setLoadingCourses(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Set initial courseId if provided
  useEffect(() => {
    if (initialCourseId) {
      form.setFieldsValue({ courseId: initialCourseId });
    }
  }, [initialCourseId, form]);

  const handleSubmit = async (values: FormValues) => {
    setLoading(true);
    try {
      // 1. Chuẩn hóa dữ liệu theo FR_02
      const cleanedEmail = normalizeEmail(values.email);
      const cleanedPhone = normalizePhone(values.phone);

      // 2. Chuẩn bị ghi chú (kèm thông tin đăng ký kiểm tra trình độ đầu vào nếu có)
      const noteParts: string[] = [];
      if (values.isPlacementTest) {
        noteParts.push('[YÊU CẦU ĐÁNH GIÁ ĐẦU VÀO - PLACEMENT TEST]');
      }
      if (values.note && values.note.trim()) {
        noteParts.push(values.note.trim());
      }
      const combinedNote = noteParts.join(' | ');

      const payload: LeadCreatePayload = {
        fullName: values.fullName.trim(),
        email: cleanedEmail,
        phone: cleanedPhone,
        courseId: values.courseId ? Number(values.courseId) : undefined,
        sourceId: 1, // Form Web (kênh trực tuyến từ Landing Page)
        note: combinedNote || undefined,
      };

      // 3. Gọi API tạo Lead
      await leadApi.create(payload);

      // Tìm tên khóa học đã chọn để hiển thị
      const selectedCourse = courses.find((c) => c.id === values.courseId);

      setSubmittedLead({
        fullName: values.fullName.trim(),
        email: cleanedEmail,
        phone: cleanedPhone,
        courseName: selectedCourse ? selectedCourse.title : 'Tư vấn lộ trình học tổng quát',
        isPlacementTest: values.isPlacementTest,
      });

      setSuccessModalVisible(true);
      form.resetFields();
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: unknown) {
      console.error('Lỗi khi gửi đăng ký tư vấn:', err);
      const errorMsg =
        (err as { message?: string; response?: { data?: { message?: string } } })?.response
          ?.data?.message ||
        (err as { message?: string })?.message ||
        'Đã có lỗi xảy ra khi gửi thông tin. Vui lòng thử lại hoặc gọi Hotline!';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          isPlacementTest: false,
          courseId: initialCourseId,
        }}
        requiredMark="optional"
      >
        <Form.Item
          name="fullName"
          label={<span style={{ fontWeight: 600 }}>Họ và tên</span>}
          rules={[
            { required: true, message: 'Vui lòng nhập họ và tên của bạn' },
            { min: 2, message: 'Họ tên phải có ít nhất 2 ký tự' },
          ]}
        >
          <Input
            prefix={<UserOutlined style={{ color: '#94a3b8' }} />}
            placeholder="Ví dụ: Nguyễn Văn A"
            size={compact ? 'middle' : 'large'}
          />
        </Form.Item>

        <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : '1fr 1fr', gap: 12 }}>
          <Form.Item
            name="phone"
            label={<span style={{ fontWeight: 600 }}>Số điện thoại</span>}
            rules={[phoneFormRule]}
            tooltip="Hệ thống tự động loại bỏ khoảng trắng và chuẩn hóa dạng +84 hoặc 0xxx"
          >
            <Input
              prefix={<PhoneOutlined style={{ color: '#94a3b8' }} />}
              placeholder="0912 345 678"
              size={compact ? 'middle' : 'large'}
            />
          </Form.Item>

          <Form.Item
            name="email"
            label={<span style={{ fontWeight: 600 }}>Email</span>}
            rules={[emailFormRule]}
            tooltip="Email sẽ được chuẩn hóa thành chữ thường để quản lý hồ sơ và cấp tài khoản sau này"
          >
            <Input
              prefix={<MailOutlined style={{ color: '#94a3b8' }} />}
              placeholder="email@example.com"
              size={compact ? 'middle' : 'large'}
            />
          </Form.Item>
        </div>

        <Form.Item
          name="courseId"
          label={<span style={{ fontWeight: 600 }}>Khóa học quan tâm</span>}
          tooltip="Mỗi hồ sơ tư vấn ứng với 1 khóa học. Nếu bạn quan tâm nhiều khóa, tư vấn viên sẽ ghi nhận thêm."
        >
          <Select
            placeholder="-- Chọn khóa học bạn quan tâm (hoặc để trống để tư vấn tổng quát) --"
            size={compact ? 'middle' : 'large'}
            loading={loadingCourses}
            allowClear
            suffixIcon={<BookOutlined style={{ color: '#94a3b8' }} />}
          >
            {courses.map((c) => (
              <Option key={c.id} value={c.id}>
                {c.title} {c.courseType ? `(${c.courseType})` : ''}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item name="isPlacementTest" valuePropName="checked" style={{ marginBottom: 12 }}>
          <Checkbox>
            <span style={{ fontWeight: 500, color: '#1e293b' }}>
              Đăng ký làm bài kiểm tra trình độ đầu vào (Placement Test miễn phí)
            </span>
            <Tag color="cyan" style={{ marginLeft: 8 }}>
              Miễn phí
            </Tag>
          </Checkbox>
        </Form.Item>

        <Form.Item
          name="note"
          label={<span style={{ fontWeight: 600 }}>Nhu cầu tư vấn / Ghi chú</span>}
        >
          <Input.TextArea
            rows={compact ? 2 : 3}
            placeholder="Ví dụ: Mong muốn đạt IELTS 6.5 trong 6 tháng, thời gian rảnh buổi tối 2-4-6..."
          />
        </Form.Item>

        <Button
          type="primary"
          htmlType="submit"
          size={compact ? 'middle' : 'large'}
          block
          loading={loading}
          icon={<SendOutlined />}
          style={{
            height: compact ? 40 : 48,
            fontSize: 16,
            fontWeight: 600,
            background: 'linear-gradient(135deg, #1677ff 0%, #0958d9 100%)',
            boxShadow: '0 4px 12px rgba(22, 119, 255, 0.3)',
          }}
        >
          Gửi thông tin đăng ký tư vấn
        </Button>

        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            <ClockCircleOutlined style={{ marginRight: 4 }} />
            Tư vấn viên sẽ tiếp nhận và liên hệ lại trong vòng 24 giờ làm việc.
          </Text>
        </div>
      </Form>

      {/* Modal xác nhận đăng ký thành công */}
      <Modal
        open={successModalVisible}
        onOk={() => setSuccessModalVisible(false)}
        onCancel={() => setSuccessModalVisible(false)}
        footer={[
          <Button key="close" type="primary" onClick={() => setSuccessModalVisible(false)}>
            Đã hiểu & Đóng
          </Button>,
        ]}
        centered
        width={520}
      >
        <div style={{ textAlign: 'center', padding: '16px 8px' }}>
          <CheckCircleOutlined style={{ fontSize: 56, color: '#52c41a', marginBottom: 16 }} />
          <Title level={3} style={{ marginBottom: 8, color: '#0f172a' }}>
            Đăng ký tư vấn thành công!
          </Title>
          <Paragraph type="secondary" style={{ fontSize: 15, marginBottom: 20 }}>
            Hệ thống ECMS đã ghi nhận thông tin đăng ký quan tâm của bạn qua Form Web.
          </Paragraph>

          {submittedLead && (
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                padding: '16px 20px',
                textAlign: 'left',
                marginBottom: 20,
              }}
            >
              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                <div>
                  <Text type="secondary">Họ và tên: </Text>
                  <Text strong>{submittedLead.fullName}</Text>
                </div>
                <div>
                  <Text type="secondary">Số điện thoại: </Text>
                  <Text strong>{submittedLead.phone}</Text>
                </div>
                <div>
                  <Text type="secondary">Email: </Text>
                  <Text strong>{submittedLead.email}</Text>
                </div>
                <div>
                  <Text type="secondary">Khóa học quan tâm: </Text>
                  <Text strong style={{ color: '#1677ff' }}>
                    {submittedLead.courseName}
                  </Text>
                </div>
                {submittedLead.isPlacementTest && (
                  <div>
                    <Tag color="green">Đã đăng ký kiểm tra trình độ đầu vào (Placement Test)</Tag>
                  </div>
                )}
              </Space>
            </div>
          )}

          <div
            style={{
              background: '#eff6ff',
              borderRadius: 6,
              padding: '12px 16px',
              borderLeft: '4px solid #3b82f6',
              textAlign: 'left',
            }}
          >
            <Paragraph style={{ margin: 0, fontSize: 13, color: '#1e40af' }}>
              <strong>Quy trình tiếp theo:</strong> Hồ sơ của bạn đã được chuyển vào hàng đợi xử
              lý. Tư vấn viên phụ trách sẽ liên hệ qua điện thoại để hỗ trợ lộ trình học tập, lịch
              học và học phí ưu đãi trong vòng 24 giờ.
            </Paragraph>
          </div>
        </div>
      </Modal>
    </>
  );
}