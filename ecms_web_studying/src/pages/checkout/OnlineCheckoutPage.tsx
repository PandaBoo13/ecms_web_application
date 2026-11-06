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
  Result,
  Row,
  Skeleton,
  Space,
  Typography,
} from 'antd';
import { ArrowLeftOutlined, CreditCardOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { courseApi } from '@/services/api/course';
import { LAST_ONLINE_PAYMENT_INVOICE_KEY, tuitionApi } from '@/services/api/tuition';
import { useAuth } from '@/hooks/useAuth';
import type { CourseDetailResponse } from '@/services/types/course';
import MoneyDisplay from '@/components/common/MoneyDisplay';

const { Title, Text, Paragraph } = Typography;

export default function OnlineCheckoutPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const parsedCourseId = Number(courseId);
  const invalidCourseId = !Number.isInteger(parsedCourseId) || parsedCourseId <= 0;
  const navigate = useNavigate();
  const { user } = useAuth();
  const [form] = Form.useForm<{ fullName: string; email: string; phone: string }>();
  const [course, setCourse] = useState<CourseDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [profileDirty, setProfileDirty] = useState(false);
  const [checkoutInfoUpdated, setCheckoutInfoUpdated] = useState(false);
  const [checkoutContact, setCheckoutContact] = useState({
    fullName: '',
    email: '',
    phone: '',
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initialContact = {
      fullName: user?.fullName || '',
      email: user?.email || '',
      phone: user?.phone || '',
    };
    form.setFieldsValue(initialContact);
    setCheckoutContact(initialContact);
    setProfileDirty(false);
  }, [form, user]);

  useEffect(() => {
    const resetPaying = () => setPaying(false);
    const resetWhenVisible = () => {
      if (document.visibilityState === 'visible') resetPaying();
    };
    window.addEventListener('pageshow', resetPaying);
    window.addEventListener('focus', resetPaying);
    document.addEventListener('visibilitychange', resetWhenVisible);
    return () => {
      window.removeEventListener('pageshow', resetPaying);
      window.removeEventListener('focus', resetPaying);
      document.removeEventListener('visibilitychange', resetWhenVisible);
    };
  }, []);

  useEffect(() => {
    let active = true;
    if (invalidCourseId) return () => { active = false; };

    courseApi.getById(parsedCourseId)
      .then((result) => {
        if (active) setCourse(result);
      })
      .catch((e) => {
        if (active) setError((e as Error).message || 'Không tải được thông tin khóa học.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [courseId, invalidCourseId, parsedCourseId]);

  const profileHasChanged = (values: { fullName?: string; email?: string; phone?: string }) =>
    (values.fullName || '').trim() !== checkoutContact.fullName.trim()
    || (values.email || '').trim().toLowerCase() !== checkoutContact.email.trim().toLowerCase()
    || (values.phone || '').trim() !== checkoutContact.phone.trim();

  const updateProfileFromForm = async () => {
    try {
      const values = await form.validateFields();
      const contact = {
        fullName: values.fullName.trim(),
        email: values.email.trim(),
        phone: values.phone.trim(),
      };
      setCheckoutContact(contact);
      setProfileDirty(false);
      setCheckoutInfoUpdated(true);
    } catch {
      // Invalid contact values are shown inline by the form.
    }
  };

  const startPayment = async (values: { fullName: string; email: string; phone: string }) => {
    if (!course) return;
    setPaying(true);
    setError(null);
    try {
      const contact = {
        payerName: values.fullName.trim(),
        payerEmail: values.email.trim(),
        payerPhone: values.phone.trim(),
      };
      if (profileHasChanged(values)) {
        setCheckoutContact({ fullName: values.fullName.trim(), email: values.email.trim(), phone: values.phone.trim() });
        setProfileDirty(false);
      }
      // The backend owns the price and account association; never submit a client price.
      const invoice = await tuitionApi.createOnlineCheckout(course.id, contact);
      if (invoice.status === 'PAID') {
        navigate('/student/courses');
        return;
      }
      try {
        sessionStorage.setItem(LAST_ONLINE_PAYMENT_INVOICE_KEY, String(invoice.invoiceId));
      } catch {
        // Storage is optional; the invoice remains available from the tuition page.
      }
      const paymentUrl = await tuitionApi.createVnpayPayment(invoice.invoiceId);
      window.location.assign(paymentUrl);
    } catch (e) {
      setError((e as Error).message || 'Chưa thể mở cổng thanh toán. Hóa đơn (nếu đã tạo) vẫn được lưu trong mục Hóa đơn để bạn tiếp tục sau.');
      setPaying(false);
    }
  };

  if (invalidCourseId) {
    return <Result status="error" title="Mã khóa học không hợp lệ" extra={<Button onClick={() => navigate('/courses')}>Về danh sách khóa học</Button>} />;
  }

  if (loading) {
    return <div style={{ maxWidth: 960, margin: '0 auto', padding: '48px 20px' }}><Skeleton active /></div>;
  }

  if (!course) {
    return (
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '64px 20px' }}>
        <Result status="error" title="Không thể mở thanh toán" subTitle={error || 'Không tìm thấy khóa học.'}
          extra={<Button onClick={() => navigate('/courses')}>Về danh sách khóa học</Button>} />
      </div>
    );
  }

  if (course.courseType !== 'ONLINE' || course.isFree || course.price <= 0) {
    return (
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '64px 20px' }}>
        <Result status="warning" title="Khóa học này không áp dụng checkout online"
          subTitle="Vui lòng chọn khóa học online có học phí hoặc liên hệ trung tâm để được hỗ trợ."
          extra={<Button onClick={() => navigate(`/courses/${course.id}`)}>Quay lại khóa học</Button>} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto', padding: '40px 20px 64px' }}>
      <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate(`/courses/${course.id}`)} style={{ marginBottom: 16 }}>
        Quay lại khóa học
      </Button>
      <Title level={2} style={{ marginTop: 0 }}>Xác nhận đăng ký khóa học</Title>
      <Paragraph type="secondary">Kiểm tra thông tin trước khi tiếp tục thanh toán qua VNPAY.</Paragraph>

      <Row gutter={[24, 24]} align="top">
        <Col xs={24} lg={15}>
          <Card title="Thông tin khóa học" bordered style={{ borderRadius: 14 }}>
            <Space align="start" size={20} style={{ width: '100%' }}>
              {course.thumbnailUrl ? (
                <Image src={course.thumbnailUrl} alt={course.title} width={180} height={120}
                  style={{ objectFit: 'cover', borderRadius: 10 }} preview={false} />
              ) : null}
              <div style={{ minWidth: 0 }}>
                <Text type="secondary">Khóa học trực tuyến</Text>
                <Title level={4} style={{ margin: '6px 0 8px' }}>{course.title}</Title>
                <Text type="secondary">Mã khóa học: {course.displayCode || course.code}</Text>
                {course.shortDescription && <Paragraph type="secondary" style={{ margin: '10px 0 0' }}>{course.shortDescription}</Paragraph>}
              </div>
            </Space>
            <Divider />
            <Form form={form} layout="vertical" requiredMark={false}
              onValuesChange={(_, values) => {
                setProfileDirty(profileHasChanged(values));
                setCheckoutInfoUpdated(false);
              }}
              onFinish={(values) => void startPayment(values)}>
              <Form.Item label="Họ và tên người mua" name="fullName" rules={[{ required: true, whitespace: true, message: 'Vui lòng nhập họ và tên' }, { max: 150, message: 'Họ tên tối đa 150 ký tự' }]}>
                <Input autoComplete="name" placeholder="Họ và tên" />
              </Form.Item>
              <Form.Item label="Email nhận hóa đơn" name="email" rules={[{ required: true, type: 'email', message: 'Vui lòng nhập email hợp lệ' }, { max: 255, message: 'Email tối đa 255 ký tự' }]}>
                <Input autoComplete="email" placeholder="email@example.com" />
              </Form.Item>
              <Form.Item label="Số điện thoại" name="phone" rules={[{ required: true, whitespace: true, message: 'Vui lòng nhập số điện thoại' }, { max: 20, message: 'Số điện thoại tối đa 20 ký tự' }]}>
                <Input autoComplete="tel" placeholder="Số điện thoại" />
              </Form.Item>
              {profileDirty && <Alert type="info" showIcon message="Bạn đã thay đổi thông tin. Hãy cập nhật trước khi thanh toán." style={{ marginBottom: 16 }} />}
              {checkoutInfoUpdated && <Alert type="success" showIcon message="Thông tin đã cập nhật; hóa đơn sẽ lưu các thông tin này khi bạn thanh toán." style={{ marginBottom: 16 }} />}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                <Button type="primary" disabled={paying}
                  onClick={() => void updateProfileFromForm()}>
                  Cập nhật thông tin
                </Button>
              </div>
            </Form>
          </Card>
        </Col>

        <Col xs={24} lg={9}>
          <Card title="Tóm tắt thanh toán" bordered style={{ borderRadius: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
              <Text type="secondary">Học phí</Text>
              <Text strong><MoneyDisplay value={course.price} /></Text>
            </div>
            <Divider style={{ margin: '14px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
              <Text strong>Tổng thanh toán</Text>
              <Text strong style={{ color: '#1677ff', fontSize: 22 }}><MoneyDisplay value={course.price} /></Text>
            </div>
            <Alert showIcon type="info" icon={<SafetyCertificateOutlined />}
              message="Thanh toán an toàn qua VNPAY" description="Hóa đơn và quyền truy cập khóa học chỉ được cập nhật sau khi hệ thống xác minh thanh toán thành công."
              style={{ marginTop: 20 }} />
            {error && <Alert type="error" showIcon message={error} style={{ marginTop: 16 }} />}
            <Button type="primary" size="large" block icon={<CreditCardOutlined />} loading={paying} disabled={profileDirty}
              onClick={() => void form.submit()} style={{ marginTop: 20, height: 48, fontWeight: 700 }}>
              Thanh toán VNPAY
            </Button>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
