// src/pages/ProfilePage.tsx
import { useEffect, useRef, useState } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  Tabs,
  Avatar,
  Tag,
  Row,
  Col,
  Upload,
  Spin,
  Popconfirm,
} from 'antd';
import type { RcFile } from 'antd/es/upload';
import {
  UserOutlined,
  LockOutlined,
  SaveOutlined,
  MailOutlined,
  PhoneOutlined,
  HomeOutlined,
  LinkOutlined,
  UndoOutlined,
  ExclamationCircleOutlined,
  CameraOutlined,
  DeleteOutlined,
  SafetyCertificateOutlined,
  IdcardOutlined,
} from '@ant-design/icons';
import toast from 'react-hot-toast';

import PageContainer from '@/components/common/PageContainer';
import PageHeader from '@/components/common/PageHeader';
import { authApi } from '@/services/api/auth';
import { fileApi, extractFileUrl } from '../services/api/files';
import { useAuth } from '@/hooks/useAuth';
import { ROLE_LABEL } from '@/constants/roles';
import type {
  UpdateProfileRequest,
  ChangePasswordRequest,
} from '@/services/types/user';

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];
const MAX_AVATAR_SIZE_MB = 5;

const extractErrorMessage = (err: unknown, fallback: string): string => {
  const e = err as {
    response?: { data?: { message?: string } };
    message?: string;
  };
  return e?.response?.data?.message || e?.message || fallback;
};

const uploadAvatarFile = async (file: File): Promise<string> => {
  const res = await fileApi.upload(file);
  const uploadedUrl = extractFileUrl(res);

  if (!uploadedUrl) {
    throw new Error('Không nhận được đường dẫn ảnh từ máy chủ');
  }

  return uploadedUrl;
};

const ProfilePage = () => {
  const { user, setUser } = useAuth();
  const [profileForm] = Form.useForm<UpdateProfileRequest>();
  const [passwordForm] = Form.useForm<ChangePasswordRequest>();

  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const redirectTimerRef = useRef<number | null>(null);

  const watchedAvatarUrl = Form.useWatch('avatarUrl', profileForm);
  const resolvedAvatarUrl =
    localPreviewUrl ||
    (watchedAvatarUrl !== undefined ? watchedAvatarUrl : user?.avatarUrl);

  // Đồng bộ form khi dữ liệu user tải xong hoặc thay đổi
  useEffect(() => {
    if (!user) return;
    profileForm.setFieldsValue({
      fullName: user.fullName,
      phone: user.phone,
      address: user.address,
      avatarUrl: user.avatarUrl,
    });
  }, [user, profileForm]);

  // Dọn dẹp timer chuyển hướng khi rời trang
  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) {
        window.clearTimeout(redirectTimerRef.current);
      }
    };
  }, []);

  // ══════════════════════════════════════════════════════════════
  // AVATAR UPLOAD & REMOVE
  // ══════════════════════════════════════════════════════════════
  const handleAvatarBeforeUpload = (file: RcFile) => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast.error('Chỉ hỗ trợ định dạng ảnh JPG, PNG, WEBP hoặc GIF');
      return false;
    }

    if (file.size / 1024 / 1024 > MAX_AVATAR_SIZE_MB) {
      toast.error(`Dung lượng ảnh tối đa là ${MAX_AVATAR_SIZE_MB}MB`);
      return false;
    }

    const objectUrl = URL.createObjectURL(file);
    setLocalPreviewUrl(objectUrl);
    setUploadingAvatar(true);

    void (async () => {
      try {
        const uploadedUrl = await uploadAvatarFile(file);
        profileForm.setFieldValue('avatarUrl', uploadedUrl);

        const currentValues = profileForm.getFieldsValue();
        const updatedUser = await authApi.updateProfile({
          fullName: currentValues.fullName || user?.fullName || '',
          phone: currentValues.phone ?? user?.phone,
          address: currentValues.address ?? user?.address,
          avatarUrl: uploadedUrl,
        });
        setUser(updatedUser);
        toast.success('Cập nhật ảnh đại diện thành công');
      } catch (err) {
        toast.error(
          extractErrorMessage(err, 'Không thể tải ảnh đại diện lên máy chủ'),
        );
      } finally {
        setLocalPreviewUrl(null);
        URL.revokeObjectURL(objectUrl);
        setUploadingAvatar(false);
      }
    })();

    return false;
  };

  const handleRemoveAvatar = async () => {
    setUploadingAvatar(true);
    try {
      profileForm.setFieldValue('avatarUrl', '');
      const currentValues = profileForm.getFieldsValue();
      const updatedUser = await authApi.updateProfile({
        fullName: currentValues.fullName || user?.fullName || '',
        phone: currentValues.phone ?? user?.phone,
        address: currentValues.address ?? user?.address,
        avatarUrl: '',
      });
      setUser(updatedUser);
      toast.success('Đã gỡ ảnh đại diện');
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Không thể gỡ ảnh đại diện'));
    } finally {
      setUploadingAvatar(false);
    }
  };

  // ══════════════════════════════════════════════════════════════
  // UPDATE PROFILE
  // ══════════════════════════════════════════════════════════════
  const handleUpdateProfile = async (values: UpdateProfileRequest) => {
    setLoadingProfile(true);
    try {
      const updated = await authApi.updateProfile(values);
      setUser(updated);
      toast.success('Cập nhật thông tin cá nhân thành công');
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Cập nhật thông tin thất bại'));
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleResetProfile = () => {
    profileForm.setFieldsValue({
      fullName: user?.fullName,
      phone: user?.phone,
      address: user?.address,
      avatarUrl: user?.avatarUrl,
    });
  };

  // ══════════════════════════════════════════════════════════════
  // CHANGE PASSWORD
  // ══════════════════════════════════════════════════════════════
  const handleChangePassword = async (values: ChangePasswordRequest) => {
    if (values.newPassword !== values.confirmPassword) {
      toast.error('Mật khẩu xác nhận không khớp');
      return;
    }

    setLoadingPassword(true);
    try {
      await authApi.changePassword(values);
      toast.success(
        'Đổi mật khẩu thành công. Đang chuyển về trang đăng nhập...',
      );
      passwordForm.resetFields();

      // Backend thu hồi toàn bộ phiên đăng nhập -> chuyển về trang login sau 2s
      redirectTimerRef.current = window.setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Đổi mật khẩu thất bại'));
    } finally {
      setLoadingPassword(false);
    }
  };

  const roleDisplayName = user?.roleCode
    ? ROLE_LABEL[user.roleCode] || user.roleCode
    : 'Người dùng';

  // ══════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════
  return (
    <PageContainer>
      <PageHeader
        title="Hồ sơ cá nhân"
        subtitle="Quản lý thông tin định danh, ảnh đại diện và bảo mật tài khoản của bạn"
      />

      <Row gutter={[20, 20]} align="stretch">
        {/* ── Cột trái: Thẻ định danh & Tải ảnh đại diện ── */}
        <Col xs={24} lg={8}>
          <Card
            className="h-full !rounded-xl border-slate-200/90 shadow-none"
            styles={{ body: { padding: '28px 24px' } }}
          >
            <div className="flex flex-col items-center text-center">
              {/* Khung Avatar tương tác */}
              <div className="relative group">
                <Upload
                  showUploadList={false}
                  accept={ALLOWED_IMAGE_TYPES.join(',')}
                  beforeUpload={handleAvatarBeforeUpload}
                  disabled={uploadingAvatar}
                >
                  <div className="relative w-28 h-28 rounded-full cursor-pointer overflow-hidden ring-4 ring-slate-100 shadow-sm">
                    <Avatar
                      size={112}
                      src={resolvedAvatarUrl || undefined}
                      icon={!resolvedAvatarUrl ? <UserOutlined /> : undefined}
                      className="!bg-blue-600 !w-full !h-full !flex !items-center !justify-center"
                    />

                    {uploadingAvatar ? (
                      <div className="absolute inset-0 bg-slate-900/55 flex items-center justify-center">
                        <Spin size="small" />
                      </div>
                    ) : (
                      <div className="absolute inset-0 bg-slate-900/45 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white gap-1">
                        <CameraOutlined className="text-lg" />
                        <span className="text-[11px] font-medium">Đổi ảnh</span>
                      </div>
                    )}
                  </div>
                </Upload>

                <Upload
                  showUploadList={false}
                  accept={ALLOWED_IMAGE_TYPES.join(',')}
                  beforeUpload={handleAvatarBeforeUpload}
                  disabled={uploadingAvatar}
                >
                  <button
                    type="button"
                    aria-label="Tải ảnh đại diện"
                    disabled={uploadingAvatar}
                    className="absolute bottom-0.5 right-0.5 w-8 h-8 rounded-full bg-white border border-slate-200 shadow-sm hover:bg-blue-50 hover:border-blue-300 text-blue-600 flex items-center justify-center cursor-pointer transition-colors"
                  >
                    <CameraOutlined className="text-sm" />
                  </button>
                </Upload>
              </div>

              {/* Nút thao tác nhanh ảnh đại diện */}
              <div className="mt-3.5 flex items-center justify-center gap-2 flex-wrap">
                <Upload
                  showUploadList={false}
                  accept={ALLOWED_IMAGE_TYPES.join(',')}
                  beforeUpload={handleAvatarBeforeUpload}
                  disabled={uploadingAvatar}
                >
                  <Button
                    size="small"
                    icon={<CameraOutlined />}
                    loading={uploadingAvatar}
                    className="!rounded-lg !font-medium !text-xs"
                  >
                    Tải ảnh lên
                  </Button>
                </Upload>

                {Boolean(resolvedAvatarUrl) && (
                  <Popconfirm
                    title="Gỡ ảnh đại diện"
                    description="Bạn có chắc muốn xóa ảnh đại diện hiện tại?"
                    okText="Gỡ ảnh"
                    cancelText="Hủy"
                    okButtonProps={{ danger: true }}
                    onConfirm={handleRemoveAvatar}
                    disabled={uploadingAvatar}
                  >
                    <Button
                      size="small"
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      disabled={uploadingAvatar}
                      className="!rounded-lg !text-xs"
                    >
                      Xóa ảnh
                    </Button>
                  </Popconfirm>
                )}
              </div>

              <span className="mt-1.5 text-[11.5px] text-slate-400">
                JPG, PNG, WEBP hoặc GIF • Tối đa {MAX_AVATAR_SIZE_MB}MB
              </span>

              {/* Họ tên & Vai trò */}
              <h2 className="mt-4 mb-1.5 text-[17px] font-bold text-slate-900 leading-snug break-words max-w-full">
                {user?.fullName || 'Chưa cập nhật họ tên'}
              </h2>

              {user?.roleCode && (
                <Tag
                  color="blue"
                  className="!m-0 !rounded-full !text-xs !font-medium px-3 py-0.5"
                >
                  {roleDisplayName}
                </Tag>
              )}
            </div>

            {/* Thông tin tóm tắt */}
            <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col gap-3.5 text-[13px]">
              <div className="flex items-start justify-between gap-3">
                <span className="inline-flex items-center gap-2 text-slate-400 shrink-0">
                  <MailOutlined /> Email
                </span>
                <span className="font-medium text-slate-700 text-right break-all">
                  {user?.email || '—'}
                </span>
              </div>

              <div className="flex items-start justify-between gap-3">
                <span className="inline-flex items-center gap-2 text-slate-400 shrink-0">
                  <PhoneOutlined /> Điện thoại
                </span>
                <span className="font-medium text-slate-700 text-right">
                  {user?.phone || (
                    <span className="text-slate-400 font-normal italic">
                      Chưa cập nhật
                    </span>
                  )}
                </span>
              </div>

              <div className="flex items-start justify-between gap-3">
                <span className="inline-flex items-center gap-2 text-slate-400 shrink-0">
                  <HomeOutlined /> Địa chỉ
                </span>
                <span className="font-medium text-slate-700 text-right break-words max-w-[65%]">
                  {user?.address || (
                    <span className="text-slate-400 font-normal italic">
                      Chưa cập nhật
                    </span>
                  )}
                </span>
              </div>

              {user?.accountId != null && (
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2 text-slate-400 shrink-0">
                    <IdcardOutlined /> Mã tài khoản
                  </span>
                  <span className="font-mono text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200/80 rounded px-2 py-0.5">
                    #{user.accountId}
                  </span>
                </div>
              )}
            </div>
          </Card>
        </Col>

        {/* ── Cột phải: Biểu mẫu cập nhật thông tin & Đổi mật khẩu ── */}
        <Col xs={24} lg={16}>
          <Card
            className="h-full !rounded-xl border-slate-200/90 shadow-none"
            styles={{ body: { padding: '8px 24px 24px' } }}
          >
            <Tabs
              defaultActiveKey="profile"
              className="[&_.ant-tabs-nav]:!mb-6"
              items={[
                {
                  key: 'profile',
                  label: (
                    <span className="inline-flex items-center gap-1.5 font-medium">
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
                    >
                      <Row gutter={[16, 0]}>
                        <Col xs={24} md={12}>
                          <Form.Item
                            name="fullName"
                            label={
                              <span className="font-medium text-slate-700">
                                Họ và tên
                              </span>
                            }
                            rules={[
                              {
                                required: true,
                                message: 'Vui lòng nhập họ tên',
                              },
                              { max: 150, message: 'Tối đa 150 ký tự' },
                            ]}
                          >
                            <Input
                              prefix={
                                <UserOutlined className="text-slate-400" />
                              }
                              placeholder="Nguyễn Văn A"
                              className="!rounded-lg"
                            />
                          </Form.Item>
                        </Col>

                        <Col xs={24} md={12}>
                          <Form.Item
                            name="phone"
                            label={
                              <span className="font-medium text-slate-700">
                                Số điện thoại
                              </span>
                            }
                            rules={[
                              {
                                pattern: /^\d{10,11}$/,
                                message: 'Số điện thoại phải gồm 10–11 chữ số',
                              },
                            ]}
                          >
                            <Input
                              prefix={
                                <PhoneOutlined className="text-slate-400" />
                              }
                              placeholder="0901234567"
                              className="!rounded-lg"
                            />
                          </Form.Item>
                        </Col>

                        <Col xs={24} md={12}>
                          <Form.Item
                            label={
                              <span className="font-medium text-slate-700">
                                Email đăng nhập
                              </span>
                            }
                          >
                            <Input
                              value={user?.email || ''}
                              disabled
                              prefix={
                                <MailOutlined className="text-slate-400" />
                              }
                              className="!rounded-lg"
                            />
                          </Form.Item>
                        </Col>

                        <Col xs={24} md={12}>
                          <Form.Item
                            label={
                              <span className="font-medium text-slate-700">
                                Vai trò hệ thống
                              </span>
                            }
                          >
                            <Input
                              value={roleDisplayName}
                              disabled
                              prefix={
                                <SafetyCertificateOutlined className="text-slate-400" />
                              }
                              className="!rounded-lg"
                            />
                          </Form.Item>
                        </Col>

                        <Col xs={24}>
                          <Form.Item
                            name="address"
                            label={
                              <span className="font-medium text-slate-700">
                                Địa chỉ liên hệ
                              </span>
                            }
                            rules={[{ max: 255, message: 'Tối đa 255 ký tự' }]}
                          >
                            <Input
                              prefix={
                                <HomeOutlined className="text-slate-400" />
                              }
                              placeholder="Quận 1, TP. Hồ Chí Minh"
                              className="!rounded-lg"
                            />
                          </Form.Item>
                        </Col>

                        <Col xs={24}>
                          <Form.Item
                            name="avatarUrl"
                            label={
                              <span className="font-medium text-slate-700">
                                Đường dẫn ảnh đại diện
                              </span>
                            }
                            extra={
                              <span className="text-xs text-slate-400">
                                Tự động cập nhật khi tải ảnh lên hoặc có thể dán
                                trực tiếp liên kết ảnh bên ngoài.
                              </span>
                            }
                            rules={[{ max: 500, message: 'Tối đa 500 ký tự' }]}
                          >
                            <Input
                              prefix={
                                <LinkOutlined className="text-slate-400" />
                              }
                              placeholder="https://example.com/avatar.jpg"
                              allowClear
                              className="!rounded-lg"
                            />
                          </Form.Item>
                        </Col>
                      </Row>

                      <div className="pt-4 mt-2 border-t border-slate-100 flex items-center justify-end gap-2.5 flex-wrap">
                        <Button
                          icon={<UndoOutlined />}
                          onClick={handleResetProfile}
                          disabled={loadingProfile || uploadingAvatar}
                          className="!rounded-lg"
                        >
                          Khôi phục
                        </Button>
                        <Button
                          type="primary"
                          htmlType="submit"
                          icon={<SaveOutlined />}
                          loading={loadingProfile}
                          disabled={uploadingAvatar}
                          className="!rounded-lg !font-medium"
                        >
                          Lưu thay đổi
                        </Button>
                      </div>
                    </Form>
                  ),
                },
                {
                  key: 'password',
                  label: (
                    <span className="inline-flex items-center gap-1.5 font-medium">
                      <LockOutlined /> Đổi mật khẩu
                    </span>
                  ),
                  children: (
                    <Form
                      form={passwordForm}
                      layout="vertical"
                      onFinish={handleChangePassword}
                    >
                      <Row gutter={[16, 0]}>
                        <Col xs={24}>
                          <Form.Item
                            name="oldPassword"
                            label={
                              <span className="font-medium text-slate-700">
                                Mật khẩu hiện tại
                              </span>
                            }
                            rules={[
                              {
                                required: true,
                                message: 'Vui lòng nhập mật khẩu hiện tại',
                              },
                            ]}
                          >
                            <Input.Password
                              prefix={
                                <LockOutlined className="text-slate-400" />
                              }
                              placeholder="Nhập mật khẩu hiện tại"
                              className="!rounded-lg"
                            />
                          </Form.Item>
                        </Col>

                        <Col xs={24} md={12}>
                          <Form.Item
                            name="newPassword"
                            label={
                              <span className="font-medium text-slate-700">
                                Mật khẩu mới
                              </span>
                            }
                            rules={[
                              {
                                required: true,
                                message: 'Vui lòng nhập mật khẩu mới',
                              },
                              {
                                min: 6,
                                message: 'Mật khẩu mới phải có ít nhất 6 ký tự',
                              },
                              { max: 100, message: 'Tối đa 100 ký tự' },
                            ]}
                          >
                            <Input.Password
                              prefix={
                                <LockOutlined className="text-slate-400" />
                              }
                              placeholder="Ít nhất 6 ký tự"
                              className="!rounded-lg"
                            />
                          </Form.Item>
                        </Col>

                        <Col xs={24} md={12}>
                          <Form.Item
                            name="confirmPassword"
                            label={
                              <span className="font-medium text-slate-700">
                                Xác nhận mật khẩu mới
                              </span>
                            }
                            dependencies={['newPassword']}
                            rules={[
                              {
                                required: true,
                                message: 'Vui lòng xác nhận mật khẩu mới',
                              },
                              ({ getFieldValue }) => ({
                                validator(_, value) {
                                  if (
                                    !value ||
                                    getFieldValue('newPassword') === value
                                  ) {
                                    return Promise.resolve();
                                  }
                                  return Promise.reject(
                                    new Error('Mật khẩu xác nhận không khớp'),
                                  );
                                },
                              }),
                            ]}
                          >
                            <Input.Password
                              prefix={
                                <LockOutlined className="text-slate-400" />
                              }
                              placeholder="Nhập lại mật khẩu mới"
                              className="!rounded-lg"
                            />
                          </Form.Item>
                        </Col>
                      </Row>

                      <div className="mb-5 rounded-xl border border-amber-200/80 bg-amber-50/70 px-3.5 py-2.5 flex items-start gap-2.5 text-xs text-amber-800 leading-relaxed">
                        <ExclamationCircleOutlined className="text-amber-600 text-sm mt-0.5 shrink-0" />
                        <span>
                          Vì lý do bảo mật, sau khi đổi mật khẩu thành công, hệ
                          thống sẽ đăng xuất khỏi tất cả thiết bị và yêu cầu
                          đăng nhập lại.
                        </span>
                      </div>

                      <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
                        <Button
                          type="primary"
                          danger
                          htmlType="submit"
                          icon={<SaveOutlined />}
                          loading={loadingPassword}
                          className="!rounded-lg !font-medium"
                        >
                          Đổi mật khẩu
                        </Button>
                      </div>
                    </Form>
                  ),
                },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </PageContainer>
  );
};

export default ProfilePage;