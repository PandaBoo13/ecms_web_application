import { useState } from 'react';
import { Button, Card, Form, Input, Typography, Alert, Result } from 'antd';
import { MailOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authApi } from '@/services/api/auth';
import { forgotPasswordSchema } from '@/utils/validators';
import type { ForgotPasswordRequest } from '@/services/types/user';

const { Title, Text } = Typography;

const ForgotPasswordPage = () => {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (values: ForgotPasswordRequest) => {
    setLoading(true);
    setError(null);
    try {
      const parsed = forgotPasswordSchema.safeParse(values);
      if (!parsed.success) {
        setError(parsed.error.issues[0].message);
        return;
      }
      await authApi.forgotPassword(values);
      toast.success('Đã gửi OTP đến email');
      setSent(true);
    } catch (err) {
      const e = err as { message?: string };
      setError(e?.message || 'Không thể gửi OTP');
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
      <Card style={{ width: '100%', maxWidth: 420 }}>
        {sent ? (
          <Result
            status="success"
            title="Đã gửi OTP"
            subTitle="Vui lòng kiểm tra email để lấy mã OTP đặt lại mật khẩu."
            extra={
              <Link to="/login">
                <Button type="primary">Về trang đăng nhập</Button>
              </Link>
            }
          />
        ) : (
          <>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <Title level={3}>Quên mật khẩu</Title>
              <Text type="secondary">Nhập email để nhận mã OTP</Text>
            </div>

            {error && (
              <Alert
                type="error"
                message={error}
                showIcon
                closable
                onClose={() => setError(null)}
                style={{ marginBottom: 16 }}
              />
            )}

            <Form layout="vertical" onFinish={handleSubmit} size="large">
              <Form.Item
                name="email"
                rules={[
                  { required: true, message: 'Vui lòng nhập email' },
                  { type: 'email', message: 'Email không hợp lệ' },
                ]}
              >
                <Input prefix={<MailOutlined />} placeholder="Email" />
              </Form.Item>

              <Form.Item style={{ marginBottom: 8 }}>
                <Button type="primary" htmlType="submit" loading={loading} block>
                  Gửi OTP
                </Button>
              </Form.Item>

              <div style={{ textAlign: 'center' }}>
                <Link to="/login">
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    ← Về trang đăng nhập
                  </Text>
                </Link>
              </div>
            </Form>
          </>
        )}
      </Card>
    </div>
  );
};

export default ForgotPasswordPage;