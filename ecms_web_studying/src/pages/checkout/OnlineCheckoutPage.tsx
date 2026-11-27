import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Button,
  Card,
  Col,
  Divider,
  Form,
  Image,
  Input,
  Radio,
  Result,
  Row,
  Skeleton,
  Spin,
  Space,
  Tag,
  Typography,
} from 'antd';
import {
  ArrowLeftOutlined,
  CreditCardOutlined,
  SafetyCertificateOutlined,
  BankOutlined,
  ShopOutlined,
  UserOutlined,
  PhoneOutlined,
  MailOutlined,
  CheckCircleOutlined,
  CopyOutlined,
} from '@ant-design/icons';
import toast from 'react-hot-toast';

import { courseApi } from '@/services/api/course';
import { enrollmentApi } from '@/services/api/enrollment';
import { leadApi } from '@/services/api/leads';
import {
  LAST_ONLINE_PAYMENT_INVOICE_KEY,
  LAST_ONLINE_PAYMENT_TOKEN_KEY,
  publicTuitionApi,
  tuitionApi,
} from '@/services/api/tuition';
import { useAuth } from '@/hooks/useAuth';
import type { AppAxiosError } from '@/services/api/axiosConfig';
import type { CourseDetailResponse } from '@/services/types/course';
import MoneyDisplay from '@/components/common/MoneyDisplay';
import {
  normalizeEmail,
  normalizePhone,
  VIETNAMESE_PHONE_REGEX,
  EMAIL_REGEX,
} from '@/utils/leadValidators';

const { Title, Text, Paragraph } = Typography;

interface CheckoutFormValues {
  fullName: string;
  email: string;
  phone: string;
  paymentMethod: 'VNPAY' | 'BANK_TRANSFER' | 'AT_CENTER';
  note?: string;
}

interface CompletedOrderInfo {
  orderCode: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  paymentMethod: 'VNPAY' | 'BANK_TRANSFER' | 'AT_CENTER';
  courseTitle: string;
  amount: number;
}

export default function OnlineCheckoutPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const parsedCourseId = Number(courseId);
  const invalidCourseId = !Number.isInteger(parsedCourseId) || parsedCourseId <= 0;
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [form] = Form.useForm<CheckoutFormValues>();
  const [course, setCourse] = useState<CourseDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loginRequired, setLoginRequired] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<CompletedOrderInfo | null>(null);
  const [purchaseStatus, setPurchaseStatus] = useState<'CHECKING' | 'AVAILABLE' | 'OWNED' | 'IN_PROGRESS'>('CHECKING');

  // Theo dõi phương thức thanh toán đang chọn để render nút bấm phù hợp
  const selectedPaymentMethod = Form.useWatch('paymentMethod', form) || 'VNPAY';

  // Tự động điền thông tin nếu người dùng đã đăng nhập tài khoản
  useEffect(() => {
    form.setFieldsValue({
      fullName: user?.fullName || '',
      email: user?.email || '',
      phone: user?.phone || '',
      paymentMethod: 'VNPAY',
    });
  }, [form, user]);

  // Reset paying state khi quay lại tab trình duyệt
  useEffect(() => {
    const resetPaying = () => setPaying(false);
    window.addEventListener('pageshow', resetPaying);
    window.addEventListener('focus', resetPaying);
    return () => {
      window.removeEventListener('pageshow', resetPaying);
      window.removeEventListener('focus', resetPaying);
    };
  }, []);

  // Tải chi tiết khóa học
  useEffect(() => {
    let active = true;
    if (invalidCourseId) return () => { active = false; };

    courseApi
      .getById(parsedCourseId)
      .then((result) => {
        if (active) setCourse(result);
      })
      .catch((e) => {
        if (active) setError((e as Error).message || 'Không tải được thông tin khóa học.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [courseId, invalidCourseId, parsedCourseId]);

  // Kiểm tra ghi danh để chặn mua lại ONLINE và khóa OFFLINE vẫn đang diễn ra.
  useEffect(() => {
    let active = true;
    if (!course || !isAuthenticated) {
      setPurchaseStatus('AVAILABLE');
      return () => { active = false; };
    }

    setPurchaseStatus('CHECKING');
    enrollmentApi.myEnrollments({ courseId: course.id, page: 0, size: 50 })
      .then((res) => {
        if (!active) return;
        const alreadyEnrolled = (res.content ?? []).some(
          (enrollment) => enrollment.courseId === course.id && enrollment.status !== 'TERMINATED',
        );
        if (!alreadyEnrolled) {
          setPurchaseStatus('AVAILABLE');
        } else if (course.courseType === 'ONLINE') {
          setPurchaseStatus('OWNED');
        } else {
          setPurchaseStatus(course.status === 'FINISHED' ? 'AVAILABLE' : 'IN_PROGRESS');
        }
      })
      .catch(() => {
        if (active) setPurchaseStatus('AVAILABLE');
      });

    return () => { active = false; };
  }, [course, isAuthenticated]);

  // Validator số điện thoại theo chuẩn FR_02
  const validatePhone = (_: unknown, value?: string) => {
    const trimmed = value ? value.trim() : '';
    if (!trimmed) {
      return Promise.reject(new Error('Vui lòng nhập Số điện thoại liên hệ'));
    }
    const cleaned = normalizePhone(trimmed);
    if (!VIETNAMESE_PHONE_REGEX.test(cleaned)) {
      return Promise.reject(new Error('Số điện thoại không đúng định dạng (+84 hoặc 03x, 05x, 07x, 08x, 09x)'));
    }
    return Promise.resolve();
  };

  // Validator email theo chuẩn FR_02
  const validateEmail = (_: unknown, value?: string) => {
    const trimmed = value ? value.trim() : '';
    if (!trimmed) {
      return Promise.reject(new Error('Vui lòng nhập Email để nhận hóa đơn và thông tin lớp'));
    }
    const normalized = normalizeEmail(trimmed);
    if (!EMAIL_REGEX.test(normalized)) {
      return Promise.reject(new Error('Email không đúng định dạng (vd: user@example.com)'));
    }
    return Promise.resolve();
  };

  // Xử lý nộp đơn mua ngay & thanh toán
  const handleCheckoutSubmit = async (values: CheckoutFormValues) => {
    if (!course) return;
    if (course.courseType === 'OFFLINE' && values.paymentMethod !== 'VNPAY') {
      setError('Khóa học OFFLINE hiện chỉ hỗ trợ thanh toán qua VNPAY.');
      return;
    }
    if (purchaseStatus === 'OWNED') {
      toast('Bạn đã mua khóa học này.', { icon: '✅' });
      navigate(`/student/courses/${course.id}/learn`);
      return;
    }
    if (course.courseType === 'OFFLINE' && purchaseStatus === 'IN_PROGRESS') {
      toast('Bạn đang trong thời gian học khóa này, chưa thể mua lại.', { icon: '⏳' });
      return;
    }
    if (purchaseStatus === 'CHECKING' && isAuthenticated) {
      toast('Đang kiểm tra trạng thái ghi danh. Vui lòng thử lại sau giây lát.');
      return;
    }

    const opensVnpayTab = values.paymentMethod === 'VNPAY' && course.price > 0 && !course.isFree;
    const paymentTab = opensVnpayTab ? window.open('about:blank', '_blank') : null;
    if (opensVnpayTab && !paymentTab) {
      setError('Trình duyệt đã chặn tab thanh toán mới. Hãy cho phép mở cửa sổ bật lên rồi thử lại.');
      return;
    }
    if (paymentTab) paymentTab.opener = null;

    setPaying(true);
    setError(null);
    setLoginRequired(false);

    const cleanedEmail = normalizeEmail(values.email);
    const cleanedPhone = normalizePhone(values.phone);
    const courseTypeName = course.courseType === 'ONLINE' ? 'Trực tuyến (Online)' : 'Tại trung tâm (Offline)';

    let methodLabel = 'Cổng thanh toán VNPAY Online';
    if (values.paymentMethod === 'BANK_TRANSFER') methodLabel = 'Chuyển khoản ngân hàng trực tiếp';
    if (values.paymentMethod === 'AT_CENTER') methodLabel = 'Đăng ký & Thanh toán tại trung tâm';

    // ══════════════════════════════════════════════════════════════════════════
    // QUY TẮC BẮT BUỘC NGHIỆP VỤ: GHI DỮ LIỆU VÀO LEAD TRƯỚC TIÊN!
    // 1. Drop-off Recovery: Lưu thông tin ngay để nếu khách dừng ở VNPAY,
    //    tư vấn viên / tuyển sinh vẫn có Lead nóng để gọi điện hỗ trợ.
    // 2. Chuyển đổi Lead -> Student chuẩn chỉnh theo quy trình hệ thống.
    // ══════════════════════════════════════════════════════════════════════════
    try {
      await leadApi.register({
        fullName: values.fullName.trim(),
        email: cleanedEmail,
        phone: cleanedPhone,
        courseId: course.id,
        note: `[ĐĂNG KÝ MUA NGAY - CHỜ THANH TOÁN] Khóa: ${course.title} (${courseTypeName}) | Hình thức: ${methodLabel}${
          values.note ? ` | Ghi chú khách: ${values.note.trim()}` : ''
        }`,
      });
    } catch (leadErr) {
      console.warn('Lưu Lead trước khi thanh toán:', leadErr);
    }

    // XỬ LÝ THEO PHƯƠNG THỨC THANH TOÁN
    if (values.paymentMethod === 'VNPAY' && course.price > 0 && !course.isFree) {
      try {
        const contact = {
          payerName: values.fullName.trim(),
          payerEmail: cleanedEmail,
          payerPhone: cleanedPhone,
        };

        let paymentUrl = '';

        // ══════════════════════════════════════════════════════════════════════
        // GỌI VNPAY HIỆN TẠI CỦA HỆ THỐNG (tuitionApi)
        // ══════════════════════════════════════════════════════════════════════
        if (isAuthenticated) {
          // 1. Đã đăng nhập: dùng API chuẩn tuitionApi.createOnlineCheckout + createVnpayPayment
          const invoice = await tuitionApi.createOnlineCheckout(course.id, contact);

          if (invoice.status === 'PAID') {
            paymentTab?.close();
            toast.success('Đăng ký khóa học thành công! Chúc bạn học tập tốt.');
            navigate('/student/my-courses');
            return;
          }

          try {
            sessionStorage.setItem(LAST_ONLINE_PAYMENT_INVOICE_KEY, String(invoice.invoiceId));
          } catch {}

          paymentUrl = await tuitionApi.createVnpayPayment(invoice.invoiceId);
        } else {
          // 2. Khách chưa đăng nhập: Thử gọi publicTuitionApi
          try {
            const checkout = await publicTuitionApi.createCheckout(course.id, contact);

            if (checkout.status === 'PAID') {
              paymentTab?.close();
              toast.success('Đăng ký khóa học thành công! Chúc bạn học tập tốt.');
              navigate('/student/my-courses');
              return;
            }

            try {
              sessionStorage.setItem(LAST_ONLINE_PAYMENT_INVOICE_KEY, String(checkout.invoiceId));
              if (checkout.paymentToken) {
                sessionStorage.setItem(LAST_ONLINE_PAYMENT_TOKEN_KEY, checkout.paymentToken);
              }
            } catch {}

            if (checkout.paymentToken) {
              paymentUrl = await publicTuitionApi.createVnpayUrl(checkout.paymentToken);
            } else {
              paymentUrl = await tuitionApi.createVnpayPayment(checkout.invoiceId);
            }
          } catch (pubErr) {
            const err = pubErr as AppAxiosError;
            if (err.code === 'CHECKOUT_ACCOUNT_EXISTS') {
              setLoginRequired(true);
              setError(null);
              setPaying(false);
              paymentTab?.close();
              return;
            }
            // Thử gọi tuitionApi hiện tại của hệ thống
            const invoice = await tuitionApi.createOnlineCheckout(course.id, contact);
            paymentUrl = await tuitionApi.createVnpayPayment(invoice.invoiceId);
          }
        }

        if (paymentUrl) {
          if (!paymentTab || paymentTab.closed) {
            throw new Error('Tab thanh toán VNPAY đã bị đóng trước khi chuyển hướng.');
          }
          paymentTab.location.replace(paymentUrl);
          return;
        }

        throw new Error('Không thể khởi tạo đường dẫn thanh toán VNPAY');
      } catch (e) {
        const err = e as AppAxiosError;
        if (err.code === 'CHECKOUT_ACCOUNT_EXISTS') {
          setLoginRequired(true);
          setError(null);
          setPaying(false);
          paymentTab?.close();
          return;
        }

        paymentTab?.close();

        setError(err.message || 'Không thể kết nối VNPAY. Vui lòng thử lại sau.');
        setPaying(false);
      }
    } else {
      paymentTab?.close();
      // Hình thức Chuyển khoản ngân hàng hoặc Đóng tiền tại quầy trung tâm
      setCompletedOrder({
        orderCode: `ECMS-${course.id}-${Date.now().toString().slice(-4)}`,
        customerName: values.fullName.trim(),
        customerPhone: cleanedPhone,
        customerEmail: cleanedEmail,
        paymentMethod: values.paymentMethod,
        courseTitle: course.title,
        amount: course.price,
      });
      setPaying(false);
    }
  };

  // Sao chép nội dung chuyển khoản nhanh
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Đã sao chép ${label}!`);
  };

  // Màn hình lỗi ID khóa học
  if (invalidCourseId) {
    return (
      <Result
        status="error"
        title="Mã khóa học không hợp lệ"
        extra={<Button onClick={() => navigate('/courses')}>Về danh sách khóa học</Button>}
      />
    );
  }

  // Màn hình đang tải
  if (loading) {
    return (
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '48px 20px' }}>
        <Skeleton active paragraph={{ rows: 8 }} />
      </div>
    );
  }

  // Màn hình không tìm thấy khóa học
  if (!course) {
    return (
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '64px 20px' }}>
        <Result
          status="error"
          title="Không thể mở thanh toán"
          subTitle={error || 'Không tìm thấy thông tin khóa học.'}
          extra={<Button onClick={() => navigate('/courses')}>Về danh sách khóa học</Button>}
        />
      </div>
    );
  }

  if (isAuthenticated && purchaseStatus === 'CHECKING') {
    return (
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '64px 24px' }}>
        <Card bordered={false} style={{ textAlign: 'center', borderRadius: 16 }}>
          <Spin size="large" />
          <Paragraph type="secondary" style={{ marginTop: 18 }}>Đang kiểm tra trạng thái ghi danh...</Paragraph>
        </Card>
      </div>
    );
  }

  if (course.courseType === 'ONLINE' && isAuthenticated && purchaseStatus === 'OWNED') {
    return (
      <Result
        status="info"
        title="Bạn đã mua khóa học này"
        subTitle="Khóa học đã được ghi danh vào tài khoản của bạn. Bạn có thể vào học ngay."
        extra={[
          <Button type="primary" key="learn" onClick={() => navigate(`/student/courses/${course.id}/learn`)}>Vào học ngay</Button>,
          <Button key="courses" onClick={() => navigate('/student/my-courses')}>Khóa học của tôi</Button>,
        ]}
      />
    );
  }

  if (course.courseType === 'OFFLINE' && isAuthenticated && purchaseStatus === 'IN_PROGRESS') {
    return (
      <Result
        status="warning"
        title="Bạn đang trong thời gian khóa học"
        subTitle="Bạn đã được ghi danh vào khóa OFFLINE này. Vui lòng hoàn thành khóa học trước khi mua lại."
        extra={<Button onClick={() => navigate(`/courses/${course.id}`)}>Quay lại khóa học</Button>}
      />
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // MÀN HÌNH ĐẶT CHỖ & MUA NGAY THÀNH CÔNG (CHO CHUYỂN KHOẢN HOẶC TẠI QUẦY)
  // ══════════════════════════════════════════════════════════════════════════
  if (completedOrder) {
    return (
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '48px 24px 64px' }}>
        <Card
          bordered={false}
          style={{
            borderRadius: 16,
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.08)',
            textAlign: 'center',
            padding: '24px 16px',
          }}
        >
          <CheckCircleOutlined style={{ fontSize: 64, color: '#10b981', marginBottom: 16 }} />
          <Title level={2} style={{ margin: '0 0 8px', color: '#0f172a' }}>
            Đăng Ký Khóa Học Thành Công!
          </Title>
          <Paragraph type="secondary" style={{ fontSize: 16, marginBottom: 24 }}>
            Hệ thống ECMS đã ghi nhận đơn đăng ký mua ngay của bạn và tạo bản ghi hồ sơ vào hệ thống.
          </Paragraph>

          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              padding: '20px 24px',
              textAlign: 'left',
              maxWidth: 680,
              margin: '0 auto 24px',
            }}
          >
            <Row gutter={[16, 12]}>
              <Col xs={24} sm={12}>
                <Text type="secondary">Mã đơn đăng ký:</Text>
                <div>
                  <Text strong style={{ fontSize: 16, color: '#1677ff' }}>
                    #{completedOrder.orderCode}
                  </Text>
                </div>
              </Col>
              <Col xs={24} sm={12}>
                <Text type="secondary">Họ và tên người đăng ký:</Text>
                <div>
                  <Text strong style={{ fontSize: 15 }}>
                    {completedOrder.customerName}
                  </Text>
                </div>
              </Col>
              <Col xs={24} sm={12}>
                <Text type="secondary">Số điện thoại:</Text>
                <div>
                  <Text strong>{completedOrder.customerPhone}</Text>
                </div>
              </Col>
              <Col xs={24} sm={12}>
                <Text type="secondary">Email nhận thông tin:</Text>
                <div>
                  <Text strong>{completedOrder.customerEmail}</Text>
                </div>
              </Col>
              <Col xs={24}>
                <Text type="secondary">Khóa học đăng ký:</Text>
                <div>
                  <Text strong style={{ fontSize: 16 }}>
                    {completedOrder.courseTitle}
                  </Text>
                  <Tag color={course.courseType === 'ONLINE' ? 'blue' : 'green'} style={{ marginLeft: 8 }}>
                    {course.courseType === 'ONLINE' ? 'Trực tuyến (Online)' : 'Tại trung tâm (Offline)'}
                  </Tag>
                </div>
              </Col>
              <Col xs={24}>
                <Divider style={{ margin: '8px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <Text strong style={{ fontSize: 15 }}>Học phí cần thanh toán:</Text>
                  <span style={{ fontSize: 22, fontWeight: 800, color: '#10b981' }}>
                    <MoneyDisplay value={completedOrder.amount} />
                  </span>
                </div>
              </Col>
            </Row>
          </div>

          {/* HƯỚNG DẪN DÀNH CHO CHUYỂN KHOẢN NGÂN HÀNG */}
          {completedOrder.paymentMethod === 'BANK_TRANSFER' && (
            <div
              style={{
                background: '#f0fdf4',
                border: '1px solid #86efac',
                borderRadius: 12,
                padding: '24px',
                textAlign: 'left',
                maxWidth: 680,
                margin: '0 auto 24px',
              }}
            >
              <Title level={4} style={{ color: '#166534', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <BankOutlined /> Thông Tin Tài Khoản Ngân Hàng Trung Tâm
              </Title>
              <Space direction="vertical" size={10} style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text type="secondary">Ngân hàng:</Text>
                  <Text strong>Ngân hàng Quân Đội (MB Bank)</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text type="secondary">Số tài khoản:</Text>
                  <Space>
                    <Text strong style={{ fontSize: 17, color: '#0958d9' }}>09123456789</Text>
                    <Button
                      size="small"
                      icon={<CopyOutlined />}
                      onClick={() => copyToClipboard('09123456789', 'Số tài khoản')}
                    >
                      Chép
                    </Button>
                  </Space>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text type="secondary">Chủ tài khoản:</Text>
                  <Text strong>TRUNG TAM TIENG ANH ECMS</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text type="secondary">Nội dung chuyển khoản:</Text>
                  <Space>
                    <Text strong style={{ color: '#dc2626', background: '#fee2e2', padding: '2px 8px', borderRadius: 4 }}>
                      ECMS {completedOrder.customerPhone} {completedOrder.orderCode}
                    </Text>
                    <Button
                      size="small"
                      icon={<CopyOutlined />}
                      onClick={() =>
                        copyToClipboard(
                          `ECMS ${completedOrder.customerPhone} ${completedOrder.orderCode}`,
                          'Nội dung chuyển khoản'
                        )
                      }
                    >
                      Chép
                    </Button>
                  </Space>
                </div>
              </Space>
              <div style={{ marginTop: 14, fontSize: 13, color: '#15803d' }}>
                💡 <em>Chuyên viên học vụ sẽ liên hệ xác nhận và gửi thông tin lớp học ngay sau khi nhận được chuyển khoản.</em>
              </div>
            </div>
          )}

          {/* HƯỚNG DẪN DÀNH CHO THANH TOÁN TẠI TRUNG TÂM */}
          {completedOrder.paymentMethod === 'AT_CENTER' && (
            <div
              style={{
                background: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: 12,
                padding: '24px',
                textAlign: 'left',
                maxWidth: 680,
                margin: '0 auto 24px',
              }}
            >
              <Title level={4} style={{ color: '#92400e', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShopOutlined /> Hướng Dẫn Hoàn Tất Thủ Tục Tại Trung Tâm
              </Title>
              <Space direction="vertical" size={10} style={{ width: '100%' }}>
                <div>
                  <Text type="secondary">Địa chỉ cơ sở tiếp nhận: </Text>
                  <Text strong>Tòa nhà ECMS, 123 Đường Cầu Giấy, TP. Hà Nội</Text>
                </div>
                <div>
                  <Text type="secondary">Thời gian mở cửa: </Text>
                  <Text strong>08:00 - 21:00 (Từ Thứ Hai đến Chủ Nhật)</Text>
                </div>
                <div>
                  <Text type="secondary">Thời hạn hoàn tất thủ tục: </Text>
                  <Text strong style={{ color: '#d97706' }}>Trong vòng 48 giờ kể từ khi đăng ký</Text>
                </div>
              </Space>
              <div style={{ marginTop: 14, fontSize: 13, color: '#b45309' }}>
                💡 <em>Vui lòng đọc Mã đơn <strong>#{completedOrder.orderCode}</strong> hoặc Số điện thoại của bạn tại quầy tiếp tân để nhận ưu đãi học phí và bộ giáo trình đi kèm.</em>
              </div>
            </div>
          )}

          <Space size={16}>
            <Button size="large" onClick={() => navigate('/courses')}>
              Khám phá thêm khóa học
            </Button>
          </Space>
        </Card>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // MÀN HÌNH FORM CHECKOUT ĐĂNG KÝ MUA NGAY (CẢ ONLINE VÀ OFFLINE)
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div style={{ maxWidth: 1120, margin: '0 auto', padding: '40px 24px 64px' }}>
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate(`/courses/${course.id}`)}
        style={{ marginBottom: 16, fontSize: 15 }}
      >
        Quay lại chi tiết khóa học
      </Button>

      <div style={{ marginBottom: 28 }}>
        <Title level={2} style={{ margin: '0 0 6px', color: '#0f172a' }}>
          Đăng Ký & Thanh Toán Khóa Học
        </Title>
        <Paragraph type="secondary" style={{ fontSize: 15, margin: 0 }}>
          Đăng ký mua ngay không cần chờ tư vấn. Hỗ trợ cho cả hình thức học Trực tuyến và Tại trung tâm.
        </Paragraph>
      </div>

      <Row gutter={[28, 28]} align="top">
        {/* CỘT TRÁI: FORM ĐIỀN THÔNG TIN & CHỌN PHƯƠNG THỨC THANH TOÁN */}
        <Col xs={24} lg={15}>
          {/* Card 1: Khóa học đã chọn */}
          <Card
            bordered
            style={{
              borderRadius: 16,
              marginBottom: 24,
              boxShadow: '0 2px 10px rgba(0, 0, 0, 0.04)',
            }}
          >
            <Space orientation="horizontal" align="start" size={20} style={{ width: '100%', flexWrap: 'wrap' }}>
              {course.thumbnailUrl ? (
                <Image
                  src={course.thumbnailUrl}
                  alt={course.title}
                  width={180}
                  height={120}
                  style={{ objectFit: 'cover', borderRadius: 10 }}
                  preview={false}
                />
              ) : null}
              <div style={{ minWidth: 260, flex: 1 }}>
                <div style={{ marginBottom: 6 }}>
                  <Tag color={course.courseType === 'ONLINE' ? 'blue' : 'green'} style={{ fontWeight: 600 }}>
                    {course.courseType === 'ONLINE' ? 'Khóa Trực Tuyến (Online)' : 'Khóa Tại Trung Tâm (Offline)'}
                  </Tag>
                  {course.categoryName && (
                    <Tag color="cyan">{course.categoryName}</Tag>
                  )}
                </div>
                <Title level={4} style={{ margin: '0 0 8px', color: '#0f172a' }}>
                  {course.title}
                </Title>
                <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 4 }}>
                  Mã khóa học: <strong>{course.displayCode || course.code}</strong>
                </Text>
                {course.totalSessionsExpected && (
                  <Text type="secondary" style={{ fontSize: 13, display: 'block' }}>
                    Thời lượng dự kiến: <strong>{course.totalSessionsExpected} buổi học</strong>
                  </Text>
                )}
              </div>
            </Space>
          </Card>

          {/* Card 2: Thông tin người mua & Phương thức thanh toán */}
          <Card
            title={<span style={{ fontWeight: 700, fontSize: 16 }}>Thông tin đăng ký & Phương thức thanh toán</span>}
            bordered
            style={{
              borderRadius: 16,
              boxShadow: '0 2px 10px rgba(0, 0, 0, 0.04)',
            }}
          >
            <Form
              form={form}
              layout="vertical"
              onFinish={handleCheckoutSubmit}
              initialValues={{ paymentMethod: 'VNPAY' }}
            >
              {/* HỌ VÀ TÊN */}
              <Form.Item
                label={<span style={{ fontWeight: 600 }}>Họ và tên người đăng ký <Text type="danger">*</Text></span>}
                name="fullName"
                rules={[
                  { required: true, message: 'Vui lòng nhập họ và tên của bạn' },
                  { min: 2, message: 'Họ tên phải có ít nhất 2 ký tự' },
                ]}
              >
                <Input
                  prefix={<UserOutlined style={{ color: '#94a3b8' }} />}
                  placeholder="Ví dụ: Nguyễn Văn A"
                  size="large"
                />
              </Form.Item>

              {/* SĐT VÀ EMAIL */}
              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label={<span style={{ fontWeight: 600 }}>Số điện thoại liên hệ <Text type="danger">*</Text></span>}
                    name="phone"
                    rules={[{ validator: validatePhone }]}
                    tooltip="Số điện thoại dùng để gửi mã xác nhận và liên hệ xếp lớp"
                  >
                    <Input
                      prefix={<PhoneOutlined style={{ color: '#94a3b8' }} />}
                      placeholder="0912 345 678"
                      size="large"
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label={<span style={{ fontWeight: 600 }}>Email nhận hóa đơn & tài khoản <Text type="danger">*</Text></span>}
                    name="email"
                    rules={[{ validator: validateEmail }]}
                    tooltip="Email để nhận biên lai học phí và thông tin đăng nhập tài khoản học viên"
                  >
                    <Input
                      prefix={<MailOutlined style={{ color: '#94a3b8' }} />}
                      placeholder="email@example.com"
                      size="large"
                    />
                  </Form.Item>
                </Col>
              </Row>

              {/* GHI CHÚ / CA HỌC MONG MUỐN */}
              <Form.Item
                label={<span style={{ fontWeight: 600 }}>Ghi chú thêm (Ca học mong muốn / Cơ sở học tập)</span>}
                name="note"
              >
                <Input.TextArea
                  rows={2}
                  placeholder="Ví dụ: Mong muốn học ca tối 2-4-6, hoặc cơ sở Cầu Giấy..."
                />
              </Form.Item>

              <Divider style={{ margin: '20px 0' }} />

              {/* PHƯƠNG THỨC THANH TOÁN */}
              <Form.Item
                label={<span style={{ fontWeight: 700, fontSize: 15 }}>Chọn phương thức thanh toán <Text type="danger">*</Text></span>}
                name="paymentMethod"
                rules={[{ required: true, message: 'Vui lòng chọn phương thức thanh toán' }]}
              >
                <Radio.Group style={{ width: '100%' }}>
                  <Space direction="vertical" style={{ width: '100%' }} size={12}>
                    {/* 1. VNPAY */}
                    <Radio
                      value="VNPAY"
                      style={{
                        padding: '14px 16px',
                        border: selectedPaymentMethod === 'VNPAY' ? '2px solid #1677ff' : '1px solid #e2e8f0',
                        background: selectedPaymentMethod === 'VNPAY' ? '#f0f7ff' : '#ffffff',
                        borderRadius: 12,
                        width: '100%',
                      }}
                    >
                      <div style={{ marginLeft: 8 }}>
                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 15 }}>
                          <CreditCardOutlined style={{ color: '#1677ff', marginRight: 8 }} />
                          Cổng thanh toán trực tuyến VNPAY (Quét mã VietQR / Thẻ ATM / Visa / Ví điện tử)
                        </div>
                        <Text type="secondary" style={{ fontSize: 13 }}>
                          Xác nhận thanh toán tự động ngay lập tức 24/7. Nhận tài khoản học viên ngay sau khi thanh toán.
                        </Text>
                      </div>
                    </Radio>

                  </Space>
                </Radio.Group>
              </Form.Item>

              {loginRequired && (
                <Alert
                  type="warning"
                  showIcon
                  message="Email này đã gắn với một tài khoản học viên tại ECMS"
                  description="Hãy đăng nhập để gắn khóa học vào tài khoản hiện tại và tiếp tục thanh toán bằng VNPAY."
                  action={
                    <Button
                      size="small"
                      type="primary"
                      onClick={() =>
                        navigate('/login', {
                          state: {
                            from: { pathname: `/checkout/${course.id}` },
                            email: form.getFieldValue('email'),
                          },
                        })
                      }
                    >
                      Đăng nhập ngay
                    </Button>
                  }
                  style={{ marginBottom: 16 }}
                />
              )}

              {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}

              <Button
                type="primary"
                htmlType="submit"
                size="large"
                block
                loading={paying}
                style={{
                  height: 50,
                  fontSize: 16,
                  fontWeight: 700,
                  background:
                    selectedPaymentMethod === 'VNPAY'
                      ? 'linear-gradient(135deg, #1677ff 0%, #0958d9 100%)'
                      : selectedPaymentMethod === 'BANK_TRANSFER'
                        ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                        : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  borderRadius: 10,
                  boxShadow: '0 4px 14px rgba(0, 0, 0, 0.12)',
                }}
              >
                {selectedPaymentMethod === 'VNPAY'
                  ? 'Tiến hành thanh toán qua VNPAY'
                  : selectedPaymentMethod === 'BANK_TRANSFER'
                    ? 'Xác nhận & Nhận thông tin chuyển khoản'
                    : 'Xác nhận đăng ký thanh toán tại trung tâm'}
              </Button>
            </Form>
          </Card>
        </Col>

        {/* CỘT PHẢI: TÓM TẮT ĐƠN HÀNG & CHÍNH SÁCH */}
        <Col xs={24} lg={9}>
          <div style={{ position: 'sticky', top: 24 }}>
            <Card
              title={<span style={{ fontWeight: 700, fontSize: 16 }}>Tóm tắt đơn hàng</span>}
              bordered
              style={{
                borderRadius: 16,
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.06)',
                marginBottom: 20,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <Text type="secondary">Khóa học:</Text>
                <Text strong style={{ textAlign: 'right', maxWidth: 180 }}>{course.title}</Text>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <Text type="secondary">Hình thức đào tạo:</Text>
                <Tag color={course.courseType === 'ONLINE' ? 'blue' : 'green'}>
                  {course.courseType === 'ONLINE' ? 'Trực tuyến (Online)' : 'Tại trung tâm (Offline)'}
                </Tag>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <Text type="secondary">Học phí niêm yết:</Text>
                <Text delete={Boolean(course.oldPrice && course.oldPrice > course.price)}>
                  <MoneyDisplay value={course.oldPrice || course.price} />
                </Text>
              </div>

              {course.oldPrice && course.oldPrice > course.price && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <Text type="secondary">Ưu đãi giảm giá:</Text>
                  <Text type="success" strong>
                    - <MoneyDisplay value={course.oldPrice - course.price} />
                  </Text>
                </div>
              )}

              <Divider style={{ margin: '16px 0' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <Text strong style={{ fontSize: 16 }}>Tổng thanh toán:</Text>
                <span style={{ fontSize: 24, fontWeight: 800, color: '#1677ff' }}>
                  <MoneyDisplay value={course.isFree ? 0 : course.price} />
                </span>
              </div>

              <Alert
                showIcon
                type="info"
                icon={<SafetyCertificateOutlined />}
                message="Bảo mật thông tin thanh toán"
                description="Thông tin đăng ký được ghi nhận tự động vào hệ thống và gửi hóa đơn xác nhận ngay sau khi hoàn tất."
                style={{ marginTop: 20, borderRadius: 8 }}
              />
            </Card>

            <div style={{ textAlign: 'center', padding: '0 8px' }}>
              <Text type="secondary" style={{ fontSize: 13 }}>
                Cần hỗ trợ thanh toán hoặc xếp lớp khẩn cấp?
                <br />
                Gọi ngay Hotline: <strong style={{ color: '#1677ff' }}>1900 6868</strong> (Miễn cước)
              </Text>
            </div>
          </div>
        </Col>
      </Row>
    </div>
  );
}
