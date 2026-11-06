import { useState, useEffect } from 'react';
import { Button, Card, Form, Input, Typography, Alert, Steps, Result, Space } from 'antd';
import { MailOutlined, LockOutlined, KeyOutlined, ArrowLeftOutlined, RedoOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authApi } from '@/services/api/auth';
import { forgotPasswordSchema, resetPasswordSchema } from '@/utils/validators';

const { Title, Text, Paragraph } = Typography;

const RESEND_COOLDOWN_SECONDS = 60;

const maskEmail = (email: string) => {
  if (!email || !email.includes('@')) return email;
  const [name, domain] = email.split('@');
  if (name.length <= 2) return `${name[0]}*@${domain}`;
  return `${name.slice(0, 2)}***${name.slice(-1)}@${domain}`;
};

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dữ liệu qua các bước
  const [email, setEmail] = useState('');
  const [resetToken, setResetToken] = useState('');

  // Đếm ngược thời gian gửi lại OTP
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  // Bước 1: Gửi mã OTP đến email
  const handleSendOtp = async (values: { email: string }) => {
    setLoading(true);
    setError(null);
    try {
      const parsed = forgotPasswordSchema.safeParse(values);
      if (!parsed.success) {
        setError(parsed.error.issues[0].message);
        return;
      }
      const cleanEmail = values.email.trim().toLowerCase();
      await authApi.forgotPassword({ email: cleanEmail });
      setEmail(cleanEmail);
      setCountdown(RESEND_COOLDOWN_SECONDS);
      toast.success('Mã OTP đã được gửi đến email của bạn');
      setCurrentStep(1);
    } catch (err) {
      const e = err as { message?: string };
      setError(e?.message || 'Không thể gửi mã OTP. Vui lòng kiểm tra lại email.');
    } finally {
      setLoading(false);
    }
  };

  // Gửi lại mã OTP
  const handleResendOtp = async () => {
    if (countdown > 0 || !email) return;
    setLoading(true);
    setError(null);
    try {
      await authApi.forgotPassword({ email });
      setCountdown(RESEND_COOLDOWN_SECONDS);
      toast.success('Đã gửi lại mã OTP mới');
    } catch (err) {
      const e = err as { message?: string };
      setError(e?.message || 'Chưa thể gửi lại mã OTP. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  // Bước 2: Xác thực mã OTP
  const handleVerifyOtp = async (values: { otp: string }) => {
    setLoading(true);
    setError(null);
    try {
      const cleanOtp = values.otp ? values.otp.trim() : '';
      if (!cleanOtp || cleanOtp.length !== 6) {
        setError('Mã OTP phải gồm đúng 6 chữ số');
        return;
      }
      const token = await authApi.verifyOtp({ email, otp: cleanOtp });
      setResetToken(token);
      toast.success('Xác minh OTP thành công!');
      setCurrentStep(2);
    } catch (err) {
      const e = err as { message?: string };
      setError(e?.message || 'Mã OTP không chính xác hoặc đã hết hạn.');
    } finally {
      setLoading(false);
    }
  };

  // Bước 3: Đặt lại mật khẩu mới
  const handleResetPassword = async (values: { newPassword: string; confirmPassword: string }) => {
    setLoading(true);
    setError(null);
    try {
      const parsed = resetPasswordSchema.safeParse({
        newPassword: values.newPassword,
        confirmPassword: values.confirmPassword,
      });
      if (!parsed.success) {
        setError(parsed.error.issues[0].message);
        return;
      }

      await authApi.resetPassword({
        resetToken,
        newPassword: values.newPassword,
        confirmPassword: values.confirmPassword,
      });

      toast.success('Đặt lại mật khẩu thành công!');
      setCurrentStep(3);
    } catch (err) {
      const e = err as { message?: string };
      setError(e?.message || 'Không thể đặt lại mật khẩu. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: 24,
      }}
    >
      <Card
        style={{
          width: '100%',
          maxWidth: 480,
          borderRadius: 12,
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={3} style={{ marginBottom: 4 }}>
            Quên mật khẩu
          </Title>
          <Text type="secondary">Khôi phục quyền truy cập Cổng học tập</Text>
        </div>

        <Steps
          current={currentStep}
          size="small"
          style={{ marginBottom: 28 }}
          items={[
            { title: 'Email' },
            { title: 'Nhập OTP' },
            { title: 'Mật khẩu mới' },
          ]}
        />

        {error && (
          <Alert
            type="error"
            message={error}
            showIcon
            closable
            onClose={() => setError(null)}
            style={{ marginBottom: 18 }}
          />
        )}

        {/* ── BƯỚC 1: NHẬP EMAIL ── */}
        {currentStep === 0 && (
          <Form layout="vertical" onFinish={handleSendOtp} size="large">
            <Paragraph style={{ color: '#64748b', fontSize: 13, marginBottom: 16 }}>
              Nhập địa chỉ email liên kết với tài khoản học viên của bạn để nhận mã OTP xác thực (6 số).
            </Paragraph>

            <Form.Item
              name="email"
              rules={[
                { required: true, message: 'Vui lòng nhập email' },
                { type: 'email', message: 'Email không hợp lệ' },
              ]}
            >
              <Input
                prefix={<MailOutlined style={{ color: '#94a3b8' }} />}
                placeholder="Địa chỉ email đã đăng ký"
                autoFocus
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 12 }}>
              <Button type="primary" htmlType="submit" loading={loading} block>
                Gửi mã OTP
              </Button>
            </Form.Item>

            <div style={{ textAlign: 'center' }}>
              <Link to="/login">
                <Text type="secondary" style={{ fontSize: 13, color: '#1677ff' }}>
                  <ArrowLeftOutlined style={{ marginRight: 6 }} /> Về trang đăng nhập
                </Text>
              </Link>
            </div>
          </Form>
        )}

        {/* ── BƯỚC 2: XÁC THỰC MÃ OTP ── */}
        {currentStep === 1 && (
          <Form layout="vertical" onFinish={handleVerifyOtp} size="large">
            <Paragraph style={{ color: '#475569', fontSize: 13, marginBottom: 16 }}>
              Mã OTP 6 số đã được gửi tới <strong>{maskEmail(email)}</strong>. Mã có hiệu lực trong 5 phút.
            </Paragraph>

            <Form.Item
              name="otp"
              rules={[
                { required: true, message: 'Vui lòng nhập mã OTP' },
                { len: 6, message: 'Mã OTP gồm đúng 6 chữ số' },
              ]}
            >
              <Input
                prefix={<KeyOutlined style={{ color: '#94a3b8' }} />}
                placeholder="Nhập 6 chữ số OTP"
                maxLength={6}
                autoFocus
                style={{
                  fontSize: 20,
                  letterSpacing: 6,
                  textAlign: 'center',
                  fontWeight: 600,
                }}
              />
            </Form.Item>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
              }}
            >
              <Button
                type="link"
                size="small"
                onClick={() => {
                  setError(null);
                  setCurrentStep(0);
                }}
                style={{ padding: 0, fontSize: 12.5 }}
              >
                ← Đổi email khác
              </Button>

              {countdown > 0 ? (
                <Text type="secondary" style={{ fontSize: 12.5 }}>
                  Gửi lại sau <strong style={{ color: '#1677ff' }}>{countdown}s</strong>
                </Text>
              ) : (
                <Button
                  type="link"
                  size="small"
                  icon={<RedoOutlined />}
                  onClick={handleResendOtp}
                  loading={loading}
                  style={{ padding: 0, fontSize: 12.5 }}
                >
                  Gửi lại mã OTP
                </Button>
              )}
            </div>

            <Form.Item style={{ marginBottom: 12 }}>
              <Button type="primary" htmlType="submit" loading={loading} block>
                Xác nhận mã OTP
              </Button>
            </Form.Item>
          </Form>
        )}

        {/* ── BƯỚC 3: ĐẶT LẠI MẬT KHẨU ── */}
        {currentStep === 2 && (
          <Form layout="vertical" onFinish={handleResetPassword} size="large">
            <Paragraph style={{ color: '#475569', fontSize: 13, marginBottom: 16 }}>
              Vui lòng thiết lập mật khẩu mới (tối thiểu 8 ký tự, gồm chữ hoa, chữ thường và số).
            </Paragraph>

            <Form.Item
              name="newPassword"
              label="Mật khẩu mới"
              rules={[
                { required: true, message: 'Vui lòng nhập mật khẩu mới' },
                { min: 8, message: 'Mật khẩu tối thiểu 8 ký tự' },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: '#94a3b8' }} />}
                placeholder="Nhập mật khẩu mới"
                autoFocus
              />
            </Form.Item>

            <Form.Item
              name="confirmPassword"
              label="Xác nhận mật khẩu mới"
              dependencies={['newPassword']}
              rules={[
                { required: true, message: 'Vui lòng xác nhận mật khẩu mới' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('newPassword') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('Mật khẩu xác nhận không khớp'));
                  },
                }),
              ]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: '#94a3b8' }} />}
                placeholder="Nhập lại mật khẩu mới"
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0 }}>
              <Button type="primary" htmlType="submit" loading={loading} block>
                Đặt lại mật khẩu
              </Button>
            </Form.Item>
          </Form>
        )}

        {/* ── BƯỚC 4: THÀNH CÔNG ── */}
        {currentStep === 3 && (
          <Result
            status="success"
            title="Đặt lại mật khẩu thành công!"
            subTitle="Mật khẩu tài khoản của bạn đã được cập nhật thành công. Vui lòng đăng nhập với mật khẩu mới."
            extra={
              <Space direction="vertical" style={{ width: '100%' }}>
                <Button type="primary" size="large" onClick={() => navigate('/login')} block>
                  Đăng nhập ngay
                </Button>
              </Space>
            }
          />
        )}
      </Card>
    </div>
  );
};

export default ForgotPasswordPage;
