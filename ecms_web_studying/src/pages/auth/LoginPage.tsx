import { useState, useEffect } from 'react';
import { Button, Card, Form, Input, Typography, Alert, Checkbox } from 'antd';
import { LockOutlined, MailOutlined } from '@ant-design/icons';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';
import { loginSchema } from '@/utils/validators';
import type { LoginRequest } from '@/services/types/user';

const { Title, Text } = Typography;

interface LoginFormValues extends LoginRequest {
  remember?: boolean;
}

const STORAGE_KEY_REMEMBER = 'ecms_student_remember_me';
const STORAGE_KEY_EMAIL = 'ecms_student_saved_email';

const LoginPage = () => {
  const { login, isStudent, isAdmin, isInstructor } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form] = Form.useForm<LoginFormValues>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const isRemembered = localStorage.getItem(STORAGE_KEY_REMEMBER) === 'true';
    const savedEmail = localStorage.getItem(STORAGE_KEY_EMAIL);
    if (isRemembered && savedEmail) {
      form.setFieldsValue({
        email: savedEmail,
        remember: true,
      });
    }
  }, [form]);

  const handleSubmit = async (values: LoginFormValues) => {
    setLoading(true);
    setError(null);
    try {
      const cleanEmail = values.email ? values.email.trim().toLowerCase() : '';
      const cleanValues: LoginRequest = {
        email: cleanEmail,
        password: values.password,
      };

      // Lưu hoặc xóa thông tin ghi nhớ đăng nhập
      if (values.remember) {
        localStorage.setItem(STORAGE_KEY_REMEMBER, 'true');
        localStorage.setItem(STORAGE_KEY_EMAIL, cleanEmail);
      } else {
        localStorage.removeItem(STORAGE_KEY_REMEMBER);
        localStorage.removeItem(STORAGE_KEY_EMAIL);
      }

      // Validate trước
      const parsed = loginSchema.safeParse(cleanValues);
      if (!parsed.success) {
        setError(parsed.error.issues[0].message);
        return;
      }

      const user = await login(cleanValues);
      toast.success(`Chào mừng ${user.fullName}!`);

      // Redirect theo role
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname;
      if (from) {
        navigate(from, { replace: true });
      } else if (isStudent() || user.roleCode === 'STUDENT') {
        navigate('/student/dashboard', { replace: true });
      } else if (isAdmin()) {
        navigate('/admin/dashboard', { replace: true });
      } else if (isInstructor()) {
        navigate('/instructor/dashboard', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } catch (err) {
      const e = err as { message?: string };
      const message = e?.message || 'Đăng nhập thất bại';
      setError(message);
      toast.error(message);
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
      <Card style={{ width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.3)', borderRadius: 12 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Title level={2} style={{ marginBottom: 4 }}>
            ECMS
          </Title>
          <Text type="secondary">Cổng học tập học viên</Text>
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

        <Form
          form={form}
          name="login"
          layout="vertical"
          onFinish={handleSubmit}
          autoComplete="off"
          size="large"
          initialValues={{ remember: false }}
        >
          <Form.Item
            name="email"
            normalize={(val) => (val ? String(val).trim().toLowerCase() : '')}
            rules={[
              { required: true, message: 'Vui lòng nhập email' },
              { type: 'email', message: 'Email không hợp lệ' },
            ]}
          >
            <Input prefix={<MailOutlined style={{ color: '#94a3b8' }} />} placeholder="Email" />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Vui lòng nhập mật khẩu' }]}
          >
            <Input.Password prefix={<LockOutlined style={{ color: '#94a3b8' }} />} placeholder="Mật khẩu" />
          </Form.Item>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 20,
            }}
          >
            <Form.Item name="remember" valuePropName="checked" noStyle>
              <Checkbox>Ghi nhớ đăng nhập</Checkbox>
            </Form.Item>

            <Link to="/forgot-password">
              <Text type="secondary" style={{ fontSize: 13, color: '#1677ff' }}>
                Quên mật khẩu?
              </Text>
            </Link>
          </div>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" loading={loading} block>
              Đăng nhập
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            © 2026 ECMS Cổng học tập
          </Text>
        </div>
      </Card>
    </div>
  );
};

export default LoginPage;
