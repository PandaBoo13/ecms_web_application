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
  categoryId?: number | string | 'ALL';
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
  id: number | string;
  name: string;
}

const DEFAULT_CATEGORIES: CategoryOption[] = [
  { id: 1, name: 'Luyện thi IELTS' },
  { id: 2, name: 'Luyện thi TOEIC' },
  { id: 3, name: 'Tiếng Anh Giao tiếp' },
  { id: 4, name: 'Tiếng Anh Trẻ em & Thiếu niên' },
  { id: 5, name: 'Tiếng Anh Doanh nghiệp' },
];

const FALLBACK_COURSES: CourseResponse[] = [
  {
    id: 101,
    code: 'IELTS-FOUND',
    displayCode: 'IELTS 01',
    title: 'Khóa học IELTS Nền tảng (0 - 3.5+)',
    slug: 'ielts-nen-tang',
    shortDescription: 'Xây dựng nền tảng ngữ pháp, phát âm và từ vựng chuẩn chỉnh cho người mất gốc.',
    price: 3500000,
    isFree: false,
    courseType: 'OFFLINE',
    progressType: 'COMPLETION_BASED',
    status: 'PUBLISHED',
    categoryId: 1,
    categoryName: 'Luyện thi IELTS',
    currentStudents: 15,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdById: 1,
  },
  {
    id: 102,
    code: 'IELTS-INTENSIVE',
    displayCode: 'IELTS 02',
    title: 'Khóa học IELTS Bứt phá (5.0 - 6.5+)',
    slug: 'ielts-but-pha',
    shortDescription: 'Chiến thuật làm bài 4 kỹ năng Nghe - Nói - Đọc - Viết thực chiến cam kết đầu ra.',
    price: 5500000,
    isFree: false,
    courseType: 'OFFLINE',
    progressType: 'COMPLETION_BASED',
    status: 'PUBLISHED',
    categoryId: 1,
    categoryName: 'Luyện thi IELTS',
    currentStudents: 22,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdById: 1,
  },
  {
    id: 103,
    code: 'IELTS-MASTER',
    displayCode: 'IELTS 03',
    title: 'Khóa học IELTS Chuyên sâu Master (7.0 - 8.5+)',
    slug: 'ielts-chuyen-sau-master',
    shortDescription: 'Luyện đề nâng cao cùng cựu giám khảo chấm thi IDP/BC chinh phục học bổng.',
    price: 7800000,
    isFree: false,
    courseType: 'OFFLINE',
    progressType: 'COMPLETION_BASED',
    status: 'PUBLISHED',
    categoryId: 1,
    categoryName: 'Luyện thi IELTS',
    currentStudents: 12,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdById: 1,
  },
  {
    id: 201,
    code: 'TOEIC-2SKILL',
    displayCode: 'TOEIC 01',
    title: 'Khóa học TOEIC 2 Kỹ năng (Nghe - Đọc 650+)',
    slug: 'toeic-2-ky-nang',
    shortDescription: 'Nắm vững mẹo bẫy đề thi và từ vựng trọng điểm công sở đạt chuẩn tốt nghiệp đại học.',
    price: 3200000,
    isFree: false,
    courseType: 'OFFLINE',
    progressType: 'COMPLETION_BASED',
    status: 'PUBLISHED',
    categoryId: 2,
    categoryName: 'Luyện thi TOEIC',
    currentStudents: 28,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdById: 1,
  },
  {
    id: 202,
    code: 'TOEIC-4SKILL',
    displayCode: 'TOEIC 02',
    title: 'Khóa học TOEIC 4 Kỹ năng Toàn diện (800+)',
    slug: 'toeic-4-ky-nang',
    shortDescription: 'Tự tin giao tiếp và làm việc trong môi trường tập đoàn đa quốc gia.',
    price: 4900000,
    isFree: false,
    courseType: 'OFFLINE',
    progressType: 'COMPLETION_BASED',
    status: 'PUBLISHED',
    categoryId: 2,
    categoryName: 'Luyện thi TOEIC',
    currentStudents: 18,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdById: 1,
  },
  {
    id: 301,
    code: 'COMM-BASIC',
    displayCode: 'COMM 01',
    title: 'Khóa học Tiếng Anh Giao tiếp Phản xạ Tự nhiên',
    slug: 'tieng-anh-giao-tiep-phan-xa',
    shortDescription: 'Xóa bỏ rào cản sợ nói, tự tin giao tiếp đời sống và du lịch sau 3 tháng.',
    price: 2800000,
    isFree: false,
    courseType: 'OFFLINE',
    progressType: 'COMPLETION_BASED',
    status: 'PUBLISHED',
    categoryId: 3,
    categoryName: 'Tiếng Anh Giao tiếp',
    currentStudents: 30,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdById: 1,
  },
  {
    id: 302,
    code: 'COMM-ADV',
    displayCode: 'COMM 02',
    title: 'Khóa học Tiếng Anh Giao tiếp Thuyết trình & Đàm phán',
    slug: 'tieng-anh-thuyet-trinh-dam-phan',
    shortDescription: 'Kỹ năng pitching, đàm phán hợp đồng và làm việc chuyên nghiệp.',
    price: 4200000,
    isFree: false,
    courseType: 'OFFLINE',
    progressType: 'COMPLETION_BASED',
    status: 'PUBLISHED',
    categoryId: 3,
    categoryName: 'Tiếng Anh Giao tiếp',
    currentStudents: 14,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdById: 1,
  },
  {
    id: 401,
    code: 'KIDS-CAMBRIDGE',
    displayCode: 'KIDS 01',
    title: 'Tiếng Anh Trẻ em Thiếu nhi Cambridge (Starters/Movers)',
    slug: 'tieng-anh-thieu-nhi-cambridge',
    shortDescription: 'Phương pháp học qua trò chơi và hình ảnh trực quan kích thích tư duy ngôn ngữ.',
    price: 3600000,
    isFree: false,
    courseType: 'OFFLINE',
    progressType: 'COMPLETION_BASED',
    status: 'PUBLISHED',
    categoryId: 4,
    categoryName: 'Tiếng Anh Trẻ em & Thiếu niên',
    currentStudents: 25,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdById: 1,
  },
  {
    id: 501,
    code: 'BIZ-ENGLISH',
    displayCode: 'BIZ 01',
    title: 'Tiếng Anh Doanh nghiệp & Thương mại Quốc tế',
    slug: 'tieng-anh-doanh-nghiep',
    shortDescription: 'Chương trình đào tạo thiết kế may đo riêng theo đặc thù ngành nghề của doanh nghiệp.',
    price: 6000000,
    isFree: false,
    courseType: 'OFFLINE',
    progressType: 'COMPLETION_BASED',
    status: 'PUBLISHED',
    categoryId: 5,
    categoryName: 'Tiếng Anh Doanh nghiệp',
    currentStudents: 10,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdById: 1,
  },
];

export default function LeadRegistrationForm({
  initialCourseId,
  compact = false,
  onSuccess,
}: LeadRegistrationFormProps) {
  const [form] = Form.useForm<FormValues>();
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState<CourseResponse[]>(FALLBACK_COURSES);
  const [categories, setCategories] = useState<CategoryOption[]>(DEFAULT_CATEGORIES);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [courseSelectOpen, setCourseSelectOpen] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [submittedLead, setSubmittedLead] = useState<{
    fullName: string;
    phone: string;
    email: string;
    courseName?: string;
    isPlacementTest?: boolean;
  } | null>(null);

  // Theo dõi giá trị danh mục đã chọn từ Form store thông qua AntD useWatch
  const selectedCategory = Form.useWatch('categoryId', form) ?? 'ALL';

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
        if (
          coursesRes.status === 'fulfilled' &&
          coursesRes.value?.content &&
          coursesRes.value.content.length > 0
        ) {
          loadedCourses = coursesRes.value.content;
        } else {
          // Dùng fallback courses nếu BE chưa có data hoặc đang offline
          loadedCourses = FALLBACK_COURSES;
        }
        setCourses(loadedCourses);

        // Thu thập danh mục từ BE API và từ chính danh sách khóa học
        const catMap = new Map<number | string, string>();

        if (
          categoriesRes.status === 'fulfilled' &&
          categoriesRes.value?.content &&
          categoriesRes.value.content.length > 0
        ) {
          categoriesRes.value.content.forEach((cat: CategoryResponse) => {
            if (cat.id && cat.name) {
              catMap.set(cat.id, cat.name);
            }
          });
        }

        // Bổ sung danh mục từ các khóa học
        loadedCourses.forEach((c) => {
          if (c.categoryId && c.categoryName) {
            catMap.set(c.categoryId, c.categoryName);
          }
        });

        // Nếu chưa có danh mục nào, dùng DEFAULT_CATEGORIES
        if (catMap.size === 0) {
          DEFAULT_CATEGORIES.forEach((cat) => catMap.set(cat.id, cat.name));
        }

        const list: CategoryOption[] = Array.from(catMap.entries()).map(([id, name]) => ({
          id,
          name,
        }));
        setCategories(list);
      })
      .catch((err) => {
        console.warn('Không thể nạp danh mục/khóa học từ API, sử dụng dữ liệu mặc định:', err);
        if (mounted) {
          setCourses(FALLBACK_COURSES);
          setCategories(DEFAULT_CATEGORIES);
        }
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
      if (targetCourse) {
        form.setFieldsValue({
          categoryId: targetCourse.categoryId || 'ALL',
          courseId: initialCourseId,
        });
      }
    }
  }, [initialCourseId, courses, form]);

  // 3. Hàm kiểm tra một khóa học có khớp với danh mục được chọn hay không (đa tầng & thông minh)
  const isCourseMatchCategory = (course: CourseResponse, catIdOrAll: number | string | 'ALL'): boolean => {
    if (!catIdOrAll || catIdOrAll === 'ALL') {
      return true;
    }

    const selectedCatStr = String(catIdOrAll);
    const targetCat = categories.find((c) => String(c.id) === selectedCatStr);
    const targetName = (targetCat ? targetCat.name : '').toLowerCase().trim();

    // 1. So khớp ID trực tiếp
    if (course.categoryId !== undefined && course.categoryId !== null) {
      if (String(course.categoryId) === selectedCatStr) return true;
    }

    // 2. So khớp theo tên danh mục
    if (course.categoryName && targetName) {
      const cCatName = course.categoryName.toLowerCase().trim();
      if (cCatName === targetName || cCatName.includes(targetName) || targetName.includes(cCatName)) {
        return true;
      }
    }

    // 3. So khớp từ khóa thông minh theo tên / mô tả khóa học
    const searchText = `${course.title || ''} ${course.shortDescription || ''}`.toLowerCase();
    if (targetName.includes('ielts') && searchText.includes('ielts')) return true;
    if (targetName.includes('toeic') && searchText.includes('toeic')) return true;
    if (
      (targetName.includes('giao tiếp') || targetName.includes('communication')) &&
      (searchText.includes('giao tiếp') || searchText.includes('communication'))
    ) return true;
    if (
      (targetName.includes('trẻ em') || targetName.includes('thiếu nhi') || targetName.includes('kid')) &&
      (searchText.includes('trẻ em') || searchText.includes('thiếu nhi') || searchText.includes('kid'))
    ) return true;
    if (
      (targetName.includes('doanh nghiệp') || targetName.includes('business')) &&
      (searchText.includes('doanh nghiệp') || searchText.includes('business'))
    ) return true;

    return false;
  };

  // 4. Lọc danh sách khóa học theo danh mục đã chọn
  const filteredCourses = useMemo(() => {
    if (!selectedCategory || selectedCategory === 'ALL') {
      return courses;
    }
    return courses.filter((c) => isCourseMatchCategory(c, selectedCategory));
  }, [courses, selectedCategory, categories]);

  // 5. Đếm số khóa học theo danh mục hiển thị
  const getCategoryCount = (cat: CategoryOption): number => {
    return courses.filter((c) => isCourseMatchCategory(c, cat.id)).length;
  };

  // 6. Nhóm các khóa học theo danh mục khi chọn "Tất cả danh mục"
  const groupedCourses = useMemo(() => {
    const map = new Map<string, CourseResponse[]>();
    courses.forEach((c) => {
      const groupName = c.categoryName || 'Khóa học tiêu biểu';
      if (!map.has(groupName)) {
        map.set(groupName, []);
      }
      map.get(groupName)!.push(c);
    });
    return Array.from(map.entries());
  }, [courses]);

  // Format nhãn loại hình học
  const formatCourseTypeTag = (type?: string) => {
    if (type === 'COURSE_ONLINE') return ' [Online]';
    if (type === 'COURSE_OFFLINE') return ' [Tại trung tâm]';
    return '';
  };

  // 7. Validator nghiệp vụ: Bắt buộc cung cấp ít nhất SĐT hoặc Email (FR_02)
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

  // 8. Xử lý gửi Form đăng ký Lead
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
          label={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600 }}>Danh mục khóa học</span>
              <span style={{ fontSize: 12, color: '#64748b' }}>
                {selectedCategory === 'ALL'
                  ? `(Tất cả ${courses.length} khóa)`
                  : `(${filteredCourses.length} khóa phù hợp)`}
              </span>
            </div>
          }
          tooltip="Chọn danh mục để xem ngay các khóa học tương ứng"
        >
          <Select
            placeholder="-- Chọn danh mục để lọc khóa học --"
            size={compact ? 'middle' : 'large'}
            onChange={(val) => {
              form.setFieldValue('categoryId', val);

              // Kiểm tra nếu khóa học hiện tại không thuộc danh mục mới chọn thì xóa đi để chọn lại
              const currentCourseId = form.getFieldValue('courseId');
              if (currentCourseId) {
                const isStillMatch = isCourseMatchCategory(
                  courses.find((c) => c.id === currentCourseId) || ({} as CourseResponse),
                  val
                );
                if (!isStillMatch) {
                  form.setFieldsValue({ courseId: undefined as unknown as number });
                }
              }

              // ✅ TỰ ĐỘNG SỔ DANH SÁCH KHÓA HỌC TƯƠNG ỨNG ĐỂ NGƯỜI DÙNG CHỌN NGAY
              setTimeout(() => {
                setCourseSelectOpen(true);
              }, 120);
            }}
            suffixIcon={<AppstoreOutlined style={{ color: '#94a3b8' }} />}
          >
            <Option value="ALL">Tất cả danh mục ({courses.length} khóa học)</Option>
            {categories.map((cat) => {
              const count = getCategoryCount(cat);
              return (
                <Option key={cat.id} value={cat.id}>
                  {cat.name} ({count} khóa)
                </Option>
              );
            })}
          </Select>
        </Form.Item>

        {/* KHÓA HỌC QUAN TÂM (BẮT BUỘC CHỌN - TỰ ĐỘNG SỔ XUỐNG KHI CHỌN DANH MỤC) */}
        <Form.Item
          name="courseId"
          label={
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontWeight: 600 }}>
                Khóa học quan tâm <Text type="danger">*</Text>
              </span>
              {selectedCategory !== 'ALL' && (
                <Tag color="blue" style={{ fontSize: 11, borderRadius: 10, padding: '0 6px' }}>
                  {filteredCourses.length} khóa phù hợp
                </Tag>
              )}
            </div>
          }
          rules={[{ required: true, message: 'Vui lòng chọn khóa học bạn muốn đăng ký tư vấn' }]}
          tooltip="Bắt buộc chọn khóa học để tư vấn viên chuẩn bị thông tin lộ trình và học phí chính xác"
        >
          <Select
            open={courseSelectOpen}
            onDropdownVisibleChange={(open) => setCourseSelectOpen(open)}
            onSelect={() => setCourseSelectOpen(false)}
            placeholder={
              loadingCourses
                ? 'Đang tải danh sách khóa học...'
                : filteredCourses.length > 0
                  ? `-- Chọn khóa học (${filteredCourses.length} khóa phù hợp) --`
                  : '-- Chưa có khóa học trong danh mục này --'
            }
            size={compact ? 'middle' : 'large'}
            loading={loadingCourses}
            showSearch
            optionFilterProp="children"
            suffixIcon={<BookOutlined style={{ color: '#94a3b8' }} />}
          >
            {selectedCategory === 'ALL'
              ? groupedCourses.map(([groupName, groupList]) => (
                  <OptGroup key={groupName} label={`${groupName} (${groupList.length} khóa)`}>
                    {groupList.map((c) => (
                      <Option key={c.id} value={c.id}>
                        {c.title}
                        <span style={{ color: '#64748b', fontSize: 12 }}>
                          {formatCourseTypeTag(c.courseType)}
                        </span>
                      </Option>
                    ))}
                  </OptGroup>
                ))
              : filteredCourses.map((c) => (
                  <Option key={c.id} value={c.id}>
                    {c.title}
                    <span style={{ color: '#64748b', fontSize: 12 }}>
                      {formatCourseTypeTag(c.courseType)}
                    </span>
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
