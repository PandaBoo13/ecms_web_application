import { useState } from 'react';
import {
  Card, Form, Input, Button, Tabs, Space, Avatar, Typography,
  Tag, Divider, message,
} from 'antd';
import { UserOutlined, LockOutlined, SaveOutlined, MailOutlined, PhoneOutlined, HomeOutlined } from '@ant-design/icons';
import toast from 'react-hot-toast';

import PageContainer from '@/components/common/PageContainer';
import PageHeader from '@/components/common/PageHeader';
import { authApi } from '@/services/api/auth';
import { useAuth } from '@/hooks/useAuth';
import { ROLE_LABEL } from '@/constants/roles';
import type { UpdateProfileRequest, ChangePasswordRequest } from '@/services/types/user';

const { Title, Text } = Typography;

const ProfilePage = () => {
  const { user, setUser } = useAuth();
  const [profileForm] = Form.useForm<UpdateProfileRequest>();
  const [passwordForm] = Form.useForm<ChangePasswordRequest>();
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);

  // ══════════════════════════════════════════════════════════════
  // Update profile
  // ══════════════════════════════════════════════════════════════
  const handleUpdateProfile = async (values: UpdateProfileRequest) => {
    setLoadingProfile(true);
    try {
      const updated = await authApi.updateProfile(values);
      setUser(updated);
      toast.success('Cập nhật thông tin thành công');
    } catch (err) {
      const e = err as { message?: string };
      toast.error(e?.message || 'Cập nhật thất bại');
    } finally {
      setLoadingProfile(false);
    }
  };

  // ══════════════════════════════════════════════════════════════
  // Change password
  // ══════════════════════════════════════════════════════════════
  const handleChangePassword = async (values: ChangePasswordRequest) => {
    if (values.newPassword !== values.confirmPassword) {
      message.error('Mật khẩu xác nhận không khớp');
      return;
    }
    setLoadingPassword(true);
    try {
      await authApi.changePassword(values);
      toast.success('Đổi mật khẩu thành công. Vui lòng đăng nhập lại.');
      passwordForm.resetFields();
      // Backend revoke all sessions → redirect login sau 2s
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
    } catch (err) {
      const e = err as { message?: string };
      toast.error(e?.message || 'Đổi mật khẩu thất bại');
    } finally {
      setLoadingPassword(false);
    }
  };

  // ══════════════════════════════════════════════════════════════
  // Render
  // ══════════════════════════════════════════════════════════════
  return (
    <PageContainer>
      <PageHeader
        title="Hồ sơ cá nhân"
        subtitle="Xem và cập nhật thông tin tài khoản của bạn"
      />

      {/* Info card */}
      <Card style={{ marginBottom: 24 }}>
        <Space size={24} align="center">
          <Avatar
            size={80}
            src={user?.avatarUrl || undefined}
            icon={!user?.avatarUrl ? <UserOutlined /> : undefined}
            style={{ backgroundColor: '#1677ff' }}
          />
          <div>
            <Title level={4} style={{ margin: 0 }}>
              {user?.fullName || 'Chưa cập nhật'}
            </Title>
            <Space style={{ marginTop: 4 }}>
              <MailOutlined /> <Text>{user?.email}</Text>
            </Space>
            <div style={{ marginTop: 8 }}>
              <Tag color="blue">{user?.roleCode ? ROLE_LABEL[user.roleCode] : ''}</Tag>
            </div>
          </div>
        </Space>
      </Card>

      {/* Tabs */}
      <Card>
        <Tabs
          defaultActiveKey="profile"
          items={[
            {
              key: 'profile',
              label: (
                <span>
                  <UserOutlined /> Thông tin cá nhân
                </span>
              ),
              children: (
                <Form
                  form={profileForm}
                  layout="vertical"
                  initialValues={{
                    fullName: user?.fullName,
                    phone: user?.phone,
                    address: user?.address,
                    avatarUrl: user?.avatarUrl,
                  }}
                  onFinish={handleUpdateProfile}
                  style={{ maxWidth: 600 }}
                >
                  <Form.Item
                    name="fullName"
                    label="Họ và tên"
                    rules={[
                      { required: true, message: 'Vui lòng nhập họ tên' },
                      { max: 150, message: 'Tối đa 150 ký tự' },
                    ]}
                  >
                    <Input prefix={<UserOutlined />} placeholder="Nguyễn Văn A" />
                  </Form.Item>

                  <Form.Item
                    name="phone"
                    label="Số điện thoại"
                    rules={[
                      { pattern: /^\d{10,11}$/, message: 'SĐT phải 10-11 chữ số' },
                    ]}
                  >
                    <Input prefix={<PhoneOutlined />} placeholder="0901234567" />
                  </Form.Item>

                  <Form.Item
                    name="address"
                    label="Địa chỉ"
                    rules={[{ max: 255, message: 'Tối đa 255 ký tự' }]}
                  >
                    <Input prefix={<HomeOutlined />} placeholder="Hà Nội" />
                  </Form.Item>

                  <Form.Item
                    name="avatarUrl"
                    label="URL ảnh đại diện"
                    rules={[{ max: 500, message: 'Tối đa 500 ký tự' }]}
                  >
                    <Input placeholder="https://..." />
                  </Form.Item>

                  <Form.Item>
                    <Button
                      type="primary"
                      htmlType="submit"
                      icon={<SaveOutlined />}
                      loading={loadingProfile}
                    >
                      Lưu thay đổi
                    </Button>
                  </Form.Item>
                </Form>
              ),
            },
            {
              key: 'password',
              label: (
                <span>
                  <LockOutlined /> Đổi mật khẩu
                </span>
              ),
              children: (
                <Form
                  form={passwordForm}
                  layout="vertical"
                  onFinish={handleChangePassword}
                  style={{ maxWidth: 600 }}
                >
                  <Form.Item
                    name="oldPassword"
                    label="Mật khẩu hiện tại"
                    rules={[{ required: true, message: 'Vui lòng nhập mật khẩu cũ' }]}
                  >
                    <Input.Password prefix={<LockOutlined />} placeholder="••••••" />
                  </Form.Item>

                  <Form.Item
                    name="newPassword"
                    label="Mật khẩu mới"
                    rules={[
                      { required: true, message: 'Vui lòng nhập mật khẩu mới' },
                      { min: 6, message: 'Ít nhất 6 ký tự' },
                      { max: 100, message: 'Tối đa 100 ký tự' },
                    ]}
                  >
                    <Input.Password prefix={<LockOutlined />} placeholder="••••••" />
                  </Form.Item>

                  <Form.Item
                    name="confirmPassword"
                    label="Xác nhận mật khẩu mới"
                    dependencies={['newPassword']}
                    rules={[
                      { required: true, message: 'Vui lòng xác nhận mật khẩu' },
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
                    <Input.Password prefix={<LockOutlined />} placeholder="••••••" />
                  </Form.Item>

                  <Divider />

                  <Form.Item>
                    <Button
                      type="primary"
                      htmlType="submit"
                      icon={<SaveOutlined />}
                      loading={loadingPassword}
                      danger
                    >
                      Đổi mật khẩu
                    </Button>
                    <Text type="secondary" style={{ marginLeft: 12, fontSize: 12 }}>
                      Sau khi đổi, bạn sẽ bị đăng xuất khỏi tất cả thiết bị.
                    </Text>
                  </Form.Item>
                </Form>
              ),
            },
          ]}
        />
      </Card>
    </PageContainer>
  );
};

export default ProfilePage;