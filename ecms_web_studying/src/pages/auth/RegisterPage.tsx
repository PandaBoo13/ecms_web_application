import { useState } from 'react';
import { Button, Card, Checkbox, Form, Input, Typography, Alert } from 'antd';
import { LockOutlined, MailOutlined, PhoneOutlined, UserOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authApi } from '@/services/api/auth';
import { registerSchema } from '@/utils/validators';
import type { RegisterRequest } from '@/services/types/user';

const { Title, Text } = Typography;
const RegisterPage = () => {
  const navigate = useNavigate(); const [loading, setLoading] = useState(false); const [error, setError] = useState<string | null>(null);
  const handleSubmit = async (values: RegisterRequest) => {
    setLoading(true); setError(null);
    try {
      const parsed = registerSchema.safeParse(values);
      if (!parsed.success) { setError(parsed.error.issues[0].message); return; }
      await authApi.register(values); toast.success('Đăng ký thành công!'); navigate('/login', { replace: true });
    } catch (err) { setError((err as any)?.message || 'Lỗi'); toast.error('Đăng ký thất bại'); } finally { setLoading(false); }
  };
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: 24, position: 'relative' }}>
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/')}
        style={{
          position: 'absolute',
          top: 24,
          left: 24,
          color: '#ffffff',
          fontSize: 14,
          fontWeight: 600,
          background: 'rgba(255, 255, 255, 0.18)',
          backdropFilter: 'blur(8px)',
          borderRadius: 8,
          padding: '6px 14px',
          height: 38,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
        }}
      >
        Quay lại trang chủ
      </Button>
      <Card style={{ width: '100%', maxWidth: 460, boxShadow: '0 20px 60px rgba(0,0,0,0.3)', borderRadius: 12 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}><Title level={2}>Đăng ký</Title><Text type="secondary">Tạo tài khoản ECMS</Text></div>
        {error && <Alert type="error" message={error} showIcon closable style={{ marginBottom: 16 }} />}
        <Form layout="vertical" onFinish={handleSubmit} size="large">
          <Form.Item name="fullName" rules={[{ required: true, message: 'Nhập họ tên' }]}><Input prefix={<UserOutlined />} placeholder="Họ và tên" /></Form.Item>
          <Form.Item name="email" rules={[{ required: true, type: 'email' }]}><Input prefix={<MailOutlined />} placeholder="Email" /></Form.Item>
          <Form.Item name="phone"><Input prefix={<PhoneOutlined />} placeholder="Số điện thoại" /></Form.Item>
          <Form.Item name="password" rules={[{ required: true, min: 6 }]}><Input.Password prefix={<LockOutlined />} placeholder="Mật khẩu" /></Form.Item>
          <Form.Item name="confirmPassword" dependencies={['password']} rules={[{ required: true }, ({ getFieldValue }) => ({ validator(_, v) { if (!v || getFieldValue('password') === v) return Promise.resolve(); return Promise.reject('Không khớp'); } })]}><Input.Password prefix={<LockOutlined />} placeholder="Xác nhận mật khẩu" /></Form.Item>
          <Form.Item name="agreedToTerms" valuePropName="checked" rules={[{ validator: (_, v) => v ? Promise.resolve() : Promise.reject('Đồng ý điều khoản') }]}><Checkbox>Tôi đồng ý điều khoản</Checkbox></Form.Item>
          <Form.Item><Button type="primary" htmlType="submit" loading={loading} block>Đăng ký</Button></Form.Item>
          <div style={{ textAlign: 'center', marginTop: 16 }}><Text type="secondary">Đã có tài khoản? </Text><Link to="/login">Đăng nhập</Link></div>
          <div style={{ textAlign: 'center', marginTop: 12 }}>
            <Button type="link" icon={<ArrowLeftOutlined />} onClick={() => navigate('/')} style={{ color: '#64748b', fontSize: 13, padding: 0 }}>
              Quay lại trang chủ ECMS
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );
};
export default RegisterPage;