import { useEffect, useState, useMemo } from 'react';
import { Form, Input, Button, Select, Checkbox, Typography, Modal, Space, Tag } from 'antd';
import {
  UserOutlined,
  PhoneOutlined,
  MailOutlined,
  BookOutlined,
  AppstoreOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  SendOutlined,
} from '@ant-design/icons';
import toast from 'react-hot-toast';

import { leadApi } from '@/services/api/leads';
import { courseApi, categoryApi } from '@/services/api/course';
import type { CourseResponse, CategoryResponse } from '@/services/types/course';
import type { LeadCreatePayload } from '@/services/types/lead';
import {
  normalizeEmail,
  normalizePhone,
  VIETNAMESE_PHONE_REGEX,
  EMAIL_REGEX,
} from '@/utils/leadValidators';

const { Title, Paragraph, Text } = Typography;
const { Option, OptGroup } = Select;

interface FormValues {
  fullName: string;
  phone?: string;
  email?: string;
  categoryId?: number | 'ALL';
  courseId: number;
  isPlacementTest?: boolean;
  note?: string;
}

interface LeadRegistrationFormProps {
  initialCourseId?: number;
  compact?: boolean;
  onSuccess?: () => void;
}

interface CategoryOption {
  id: number;
  name: string;
}

const DEFAULT_CATEGORIES: CategoryOption[] = [
  { id: 1, name: 'Luyện thi IELTS' },
  { id: 2, name: 'Luyện thi TOEIC' },
  { id: 3, name: 'Tiếng Anh Giao tiếp' },
  { id: 4, name: 'Tiếng Anh Trẻ em' },
  { id: 5, name: 'Tiếng Anh Doanh nghiệp' },
];

export default function LeadRegistrationForm({
  initialCourseId,
  compact = false,
  onSuccess,
}: LeadRegistrationFormProps) {
  const [form] = Form.useForm<FormValues>();
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState<CourseResponse[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>(DEFAULT_CATEGORIES);
  const [selectedCategory, setSelectedCategory] = useState<number | 'ALL'>('ALL');
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [submittedLead, setSubmittedLead] = useState<{
    fullName: string;
    phone: string;
    email: string;
    courseName?: string;
    isPlacementTest?: boolean;
  } | null>(null);

  // 1. Tải danh sách khóa học (PUBLISHED) và danh mục đào tạo (Categories)
  useEffect(() => {
    let mounted = true;
    setLoadingCourses(true);

    Promise.allSettled([
      courseApi.search({ status: 'PUBLISHED', page: 0, size: 50 }),
      categoryApi.list({ size: 100 }),
    ])
      .then(([coursesRes, categoriesRes]) => {
        if (!mounted) return;

        let loadedCourses: CourseResponse[] = [];
        if (coursesRes.status === 'fulfilled' && coursesRes.value?.content) {
          loadedCourses = coursesRes.value.content;
          setCourses(loadedCourses);
        }

        // Lấy danh mục từ API hoặc trích xuất từ các khóa học
        const catMap = new Map<number, string>();

        if (categoriesRes.status === 'fulfilled' && categoriesRes.value?.content) {
          categoriesRes.value.content.forEach((cat: CategoryResponse) => {
            if (cat.id && cat.name) {
              catMap.set(cat.id, cat.name);
            }
          });
        }

        // Trích xuất bổ sung từ danh sách khóa học để không bị sót
        loadedCourses.forEach((c) => {
          if (c.categoryId && c.categoryName) {
            catMap.set(c.categoryId, c.categoryName);
          }
        });

        if (catMap.size > 0) {
          const list = Array.from(catMap.entries()).map(([id, name]) => ({ id, name }));
          setCategories(list);
        }
      })
      .catch((err) => {
        console.warn('Không thể nạp danh mục/khóa học:', err);
      })
      .finally(() => {
        if (mounted) setLoadingCourses(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  // 2. Tự động đồng bộ khi có initialCourseId truyền vào từ trang chi tiết
  useEffect(() => {
    if (initialCourseId && courses.length > 0) {
      const targetCourse = courses.find((c) => c.id === initialCourseId);
      if (targetCourse?.categoryId) {
        setSelectedCategory(targetCourse.categoryId);
        form.setFieldsValue({
          categoryId: targetCourse.categoryId,
          courseId: initialCourseId,
        });
      } else {
        form.setFieldsValue({ courseId: initialCourseId });
      }
    }
  }, [initialCourseId, courses, form]);

  // 3. Lọc danh sách khóa học theo danh mục đã chọn
  const filteredCourses = useMemo(() => {
    if (!selectedCategory || selectedCategory === 'ALL') {
      return courses;
    }
    return courses.filter((c) => c.categoryId === selectedCategory);
  }, [courses, selectedCategory]);

  // 4. Nhóm các khóa học theo danh mục khi chọn "Tất cả danh mục"
  const groupedCourses = useMemo(() => {
    const map = new Map<string, CourseResponse[]>();
    courses.forEach((c) => {
      const groupName = c.categoryName || 'Khóa học khác';
      if (!map.has(groupName)) {
        map.set(groupName, []);
      }
      map.get(groupName)!.push(c);
    });
    return Array.from(map.entries());
  }, [courses]);

  // 5. Validator nghiệp vụ: Bắt buộc cung cấp ít nhất SĐT hoặc Email
  const validatePhone = (_: unknown, value?: string) => {
    const emailValue = form.getFieldValue('email');
    const hasEmail = Boolean(emailValue && emailValue.trim() !== '');
    const phoneTrimmed = value ? value.trim() : '';

    if (!phoneTrimmed && !hasEmail) {
      return Promise.reject(new Error('Vui lòng nhập Số điện thoại hoặc Email'));
    }

    if (phoneTrimmed) {
      const cleaned = normalizePhone(phoneTrimmed);
      if (!VIETNAMESE_PHONE_REGEX.test(cleaned)) {
        return Promise.reject(
          new Error('Số điện thoại không đúng định dạng (+84 hoặc 03x, 05x, 07x, 08x, 09x)')
        );
      }
    }
    return Promise.resolve();
  };

  const validateEmail = (_: unknown, value?: string) => {
    const phoneValue = form.getFieldValue('phone');
    const hasPhone = Boolean(phoneValue && phoneValue.trim() !== '');
    const emailTrimmed = value ? value.trim() : '';

    if (!emailTrimmed && !hasPhone) {
      return Promise.reject(new Error('Vui lòng nhập Email hoặc Số điện thoại'));
    }

    if (emailTrimmed) {
      const normalized = normalizeEmail(emailTrimmed);
      if (!EMAIL_REGEX.test(normalized)) {
        return Promise.reject(new Error('Email không đúng định dạng (vd: user@example.com)'));
      }
    }
    return Promise.resolve();
  };

  // 6. Xử lý gửi Form đăng ký Lead
  const handleSubmit = async (values: FormValues) => {
    setLoading(true);
    try {
      const cleanedEmail = values.email && values.email.trim() ? normalizeEmail(values.email) : undefined;
      const cleanedPhone = values.phone && values.phone.trim() ? normalizePhone(values.phone) : undefined;

      if (!cleanedEmail && !cleanedPhone) {
        toast.error('Vui lòng nhập ít nhất Số điện thoại hoặc Email để liên hệ');
        return;
      }

      if (!values.courseId) {
        toast.error('Vui lòng chọn khóa học bạn muốn đăng ký tư vấn');
        return;
      }

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
        courseId: Number(values.courseId),
        sourceId: 1, // Kênh Form Web
        note: combinedNote || undefined,
      };

      await leadApi.create(payload);

      const selectedCourseObj = courses.find((c) => c.id === values.courseId);

      setSubmittedLead({
        fullName: values.fullName.trim(),
        email: cleanedEmail || 'Chưa cung cấp (chờ liên hệ qua SĐT)',
        phone: cleanedPhone || 'Chưa cung cấp (chờ liên hệ qua Email)',
        courseName: selectedCourseObj ? selectedCourseObj.title : 'Khóa học đã chọn',
        isPlacementTest: values.isPlacementTest,
      });

      setSuccessModalVisible(true);
      form.resetFields();
      setSelectedCategory('ALL');
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
          categoryId: 'ALL',
          courseId: initialCourseId,
        }}
      >
        {/* HỌ VÀ TÊN (BẮT BUỘC) */}
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

        {/* SĐT HOẶC EMAIL (BẮT BUỘC ÍT NHẤT 1 TRONG 2) */}
        <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : '1fr 1fr', gap: 12 }}>
          <Form.Item
            name="phone"
            label={
              <span style={{ fontWeight: 600 }}>
                Số điện thoại <Text type="danger">*</Text>
              </span>
            }
            dependencies={['email']}
            rules={[{ validator: validatePhone }]}
            tooltip="Bắt buộc nhập Số điện thoại hoặc Email để tư vấn viên liên hệ hỗ trợ"
          >
            <Input
              prefix={<PhoneOutlined style={{ color: '#94a3b8' }} />}
              placeholder="0912 345 678"
              size={compact ? 'middle' : 'large'}
            />
          </Form.Item>

          <Form.Item
            name="email"
            label={
              <span style={{ fontWeight: 600 }}>
                Email <Text type="danger">*</Text>
              </span>
            }
            dependencies={['phone']}
            rules={[{ validator: validateEmail }]}
            tooltip="Bắt buộc nhập Email hoặc Số điện thoại để gửi lộ trình và thông tin tài khoản"
          >
            <Input
              prefix={<MailOutlined style={{ color: '#94a3b8' }} />}
              placeholder="email@example.com"
              size={compact ? 'middle' : 'large'}
            />
          </Form.Item>
        </div>

        <div style={{ marginBottom: 12, marginTop: -6 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            💡 <span style={{ color: '#0284c7' }}>Lưu ý:</span> Bạn cần điền ít nhất <strong>Số điện thoại</strong> hoặc <strong>Email</strong> chính xác để nhận phản hồi.
          </Text>
        </div>

        {/* LỌC THEO DANH MỤC KHÓA HỌC */}
        <Form.Item
          name="categoryId"
          label={<span style={{ fontWeight: 600 }}>Danh mục khóa học</span>}
          tooltip="Chọn danh mục để thu hẹp và tìm đúng khóa học bạn quan tâm"
        >
          <Select
            placeholder="-- Chọn danh mục để lọc khóa học --"
            size={compact ? 'middle' : 'large'}
            value={selectedCategory}
            onChange={(val) => {
              setSelectedCategory(val);
              // Kiểm tra nếu khóa học hiện tại không thuộc danh mục mới chọn thì xóa đi để chọn lại
              const currentCourseId = form.getFieldValue('courseId');
              if (currentCourseId) {
                const target = courses.find((c) => c.id === currentCourseId);
                if (val !== 'ALL' && target?.categoryId !== val) {
                  form.setFieldsValue({ courseId: undefined as unknown as number });
                }
              }
            }}
            suffixIcon={<AppstoreOutlined style={{ color: '#94a3b8' }} />}
          >
            <Option value="ALL">Tất cả danh mục ({courses.length} khóa học)</Option>
            {categories.map((cat) => {
              const count = courses.filter((c) => c.categoryId === cat.id).length;
              return (
                <Option key={cat.id} value={cat.id}>
                  {cat.name} {count > 0 ? `(${count} khóa)` : ''}
                </Option>
              );
            })}
          </Select>
        </Form.Item>

        {/* KHÓA HỌC QUAN TÂM (BẮT BUỘC CHỌN) */}
        <Form.Item
          name="courseId"
          label={
            <span style={{ fontWeight: 600 }}>
              Khóa học quan tâm <Text type="danger">*</Text>
            </span>
          }
          rules={[{ required: true, message: 'Vui lòng chọn khóa học bạn muốn đăng ký tư vấn' }]}
          tooltip="Bắt buộc chọn khóa học để tư vấn viên chuẩn bị thông tin lộ trình và học phí chính xác"
        >
          <Select
            placeholder={
              loadingCourses
                ? 'Đang tải danh sách khóa học...'
                : '-- Chọn khóa học bạn quan tâm (Bắt buộc) --'
            }
            size={compact ? 'middle' : 'large'}
            loading={loadingCourses}
            showSearch
            optionFilterProp="children"
            suffixIcon={<BookOutlined style={{ color: '#94a3b8' }} />}
          >
            {selectedCategory === 'ALL'
              ? groupedCourses.map(([groupName, groupList]) => (
                  <OptGroup key={groupName} label={groupName}>
                    {groupList.map((c) => (
                      <Option key={c.id} value={c.id}>
                        {c.title} {c.courseType ? `(${c.courseType})` : ''}
                      </Option>
                    ))}
                  </OptGroup>
                ))
              : filteredCourses.map((c) => (
                  <Option key={c.id} value={c.id}>
                    {c.title} {c.courseType ? `(${c.courseType})` : ''}
                  </Option>
                ))}
          </Select>
        </Form.Item>

        {/* ĐĂNG KÝ KIỂM TRA TRÌNH ĐỘ ĐẦU VÀO */}
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

        {/* GHI CHÚ / NHU CẦU */}
        <Form.Item
          name="note"
          label={<span style={{ fontWeight: 600 }}>Nhu cầu tư vấn / Ghi chú thêm</span>}
        >
          <Input.TextArea
            rows={compact ? 2 : 3}
            placeholder="Ví dụ: Mong muốn đạt IELTS 6.5 trong 6 tháng, thời gian rảnh buổi tối 2-4-6..."
          />
        </Form.Item>

        {/* NÚT GỬI */}
        <Button
          type="primary"
          htmlType="submit"
          size={compact ? 'middle' : 'large'}
          block
          loading={loading}
          icon={<SendOutlined />}
          style={{
            height: compact ? 42 : 48,
            fontSize: 16,
            fontWeight: 700,
            background: 'linear-gradient(135deg, #1677ff 0%, #0958d9 100%)',
            boxShadow: '0 4px 12px rgba(22, 119, 255, 0.3)',
            borderRadius: 8,
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
              lý. Tư vấn viên phụ trách sẽ liên hệ qua điện thoại hoặc email để hỗ trợ lộ trình học tập, lịch
              học và học phí ưu đãi trong vòng 24 giờ.
            </Paragraph>
          </div>
        </div>
      </Modal>
    </>
  );
}
