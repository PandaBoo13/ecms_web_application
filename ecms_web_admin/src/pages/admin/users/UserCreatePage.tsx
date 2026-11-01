import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Form,
  Input,
  Button,
  Select,
  Switch,
  Row,
  Col,
  Space,
  Tag,
  Divider,
  Alert,
  Progress,
} from 'antd';
import {
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  LockOutlined,
  ArrowLeftOutlined,
  CheckCircleOutlined,
  UserAddOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
} from '@ant-design/icons';
import toast from 'react-hot-toast';

import PageContainer from '@/components/common/PageContainer';
import PageHeader from '@/components/common/PageHeader';
import { useTranslation } from '@/hooks/useTranslation';

import { adminUserApi, adminRoleApi } from '@/services/api/admin';
import type { Role, AccountCreateRequest } from '@/services/types/user';

const { Option } = Select;

// Password strength evaluator
const getPasswordStrength = (password: string): { score: number; label: string; color: string } => {
  if (!password) return { score: 0, label: '', color: '#e2e8f0' };
  let score = 0;
  if (password.length >= 6) score += 25;
  if (password.length >= 8) score += 25;
  if (/[A-Z]/.test(password)) score += 25;
  if (/[0-9!@#$%^&*]/.test(password)) score += 25;
  if (score <= 25) return { score, label: 'Yếu', color: '#ef4444' };
  if (score <= 50) return { score, label: 'Trung bình', color: '#f97316' };
  if (score <= 75) return { score, label: 'Khá', color: '#eab308' };
  return { score, label: 'Mạnh', color: '#22c55e' };
};

const UserCreatePage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [createdSuccess, setCreatedSuccess] = useState(false);
  const [createdEmail, setCreatedEmail] = useState('');

  // Watch form fields for live preview
  const watchedFullName = Form.useWatch('fullName', form);
  const watchedEmail = Form.useWatch('email', form);
  const watchedPassword = Form.useWatch('password', form) || '';
  const watchedRoleCode = Form.useWatch('roleCode', form) || 'STUDENT';
  const watchedIsActive = Form.useWatch('isActive', form) ?? true;

  const pwdStrength = getPasswordStrength(watchedPassword);

  useEffect(() => {
    adminRoleApi
      .list()
      .then((roleList) => setRoles(roleList || []))
      .catch((err) => console.error('Failed to load roles:', err));
  }, []);

  const ROLE_COLORS: Record<string, string> = {
    ADMIN: 'red',
    INSTRUCTOR: 'blue',
    STUDENT: 'green',
    LEAD: 'cyan',
    CONSULTANT: 'cyan',
  };

  const ROLE_LABELS: Record<string, string> = {
    ADMIN: 'Quản trị viên',
    INSTRUCTOR: 'Giảng viên',
    STUDENT: 'Học viên',
    LEAD: 'Tư vấn viên',
    CONSULTANT: 'Tư vấn viên',
  };

  const handleSubmit = async (values: {
    fullName: string;
    email: string;
    password: string;
    phone?: string;
    roleCode?: string;
    isActive?: boolean;
  }) => {
    setSubmitting(true);
    try {
      const payload: AccountCreateRequest = {
        email: values.email.trim().toLowerCase(),
        password: values.password,
        fullName: values.fullName.trim(),
        phone: values.phone?.trim() || undefined,
        roleCode: values.roleCode || 'STUDENT',
        isActive: values.isActive ?? true,
      };

      await adminUserApi.create(payload);
      setCreatedEmail(payload.email);
      setCreatedSuccess(true);
      toast.success('🎉 Tạo tài khoản User mới thành công!');
    } catch (err: unknown) {
      console.error('Tạo user thất bại:', err);
      const e = err as {
        message?: string;
        response?: { data?: { message?: string; error?: string } };
      };
      const errorMsg =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.message ||
        'Không thể tạo tài khoản. Vui lòng kiểm tra lại thông tin hoặc thử lại sau.';
      toast.error(errorMsg, { duration: 6000 });
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinishFailed = ({
    errorFields,
  }: {
    errorFields: { name: (string | number)[]; errors: string[] }[];
  }) => {
    const firstErr = errorFields?.[0]?.errors?.[0];
    toast.error(firstErr || 'Vui lòng điền đầy đủ các thông tin bắt buộc trước khi tạo', {
      duration: 4000,
    });
  };

  // Màn hình thông báo sau khi tạo thành công
  if (createdSuccess) {
    return (
      <PageContainer>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="w-full max-w-lg text-center bg-white border border-slate-200/80 rounded-2xl p-8 sm:p-10 shadow-sm">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-50 border-4 border-emerald-100 mb-5">
              <CheckCircleOutlined className="text-4xl text-emerald-500" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Tạo tài khoản thành công!</h2>
            <p className="text-slate-500 text-sm mb-4">
              Tài khoản User mới đã được khởi tạo trong hệ thống và kích hoạt thành công.
            </p>
            <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-3.5 mb-6">
              <div className="text-xs text-slate-400 font-medium mb-1">Email đăng nhập</div>
              <div className="font-mono text-sm font-bold text-slate-800">{createdEmail}</div>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                type="primary"
                size="large"
                icon={<TeamOutlined />}
                onClick={() => navigate('/admin/users')}
                className="!h-11 !rounded-xl !bg-blue-600 hover:!bg-blue-700 !font-semibold !px-6 w-full sm:w-auto"
              >
                Về danh sách Users
              </Button>
              <Button
                size="large"
                icon={<UserAddOutlined />}
                onClick={() => {
                  form.resetFields();
                  setCreatedSuccess(false);
                  setCreatedEmail('');
                  form.setFieldsValue({ roleCode: 'STUDENT', isActive: true });
                }}
                className="!h-11 !rounded-xl !font-semibold !px-6 w-full sm:w-auto"
              >
                Tạo thêm User khác
              </Button>
            </div>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Thêm User mới"
        subtitle="Khởi tạo tài khoản người dùng, thiết lập mật khẩu và phân quyền vai trò ban đầu"
        backButton
        backTo="/admin/users"
        extra={
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/admin/users')}
            className="!h-9 !rounded-lg text-slate-600"
          >
            Quay lại
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* ── Cột trái: Form chính (2/3) ── */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 sm:p-8">
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
              onFinishFailed={handleFinishFailed}
              initialValues={{ roleCode: 'STUDENT', isActive: true }}
              scrollToFirstError
            >
              {/* Phần 1: Thông tin cá nhân */}
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
                  1
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 m-0">Thông tin cá nhân & Liên hệ</h3>
                  <p className="text-xs text-slate-400 m-0">Họ tên, email đăng nhập và số điện thoại</p>
                </div>
              </div>

              <div className="space-y-1">
                <Form.Item
                  name="fullName"
                  label={
                    <span className="text-sm font-semibold text-slate-700">
                      {t('user.fullName')} <span className="text-rose-500">*</span>
                    </span>
                  }
                  rules={[
                    { required: true, message: 'Vui lòng nhập họ và tên' },
                    { min: 2, message: 'Họ tên phải có ít nhất 2 ký tự' },
                  ]}
                >
                  <Input
                    prefix={<UserOutlined className="text-slate-400 mr-1" />}
                    placeholder="Ví dụ: Nguyễn Văn A"
                    size="large"
                    className="!rounded-xl !border-slate-200 hover:!border-blue-400 focus:!border-blue-500"
                  />
                </Form.Item>

                <Row gutter={16}>
                  <Col xs={24} sm={14}>
                    <Form.Item
                      name="email"
                      label={
                        <span className="text-sm font-semibold text-slate-700">
                          Địa chỉ Email <span className="text-rose-500">*</span>
                        </span>
                      }
                      rules={[
                        { required: true, message: 'Vui lòng nhập địa chỉ email' },
                        { type: 'email', message: 'Địa chỉ email không đúng định dạng' },
                      ]}
                    >
                      <Input
                        prefix={<MailOutlined className="text-slate-400 mr-1" />}
                        placeholder="user@example.com"
                        size="large"
                        className="!rounded-xl !border-slate-200 hover:!border-blue-400 focus:!border-blue-500"
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={10}>
                    <Form.Item
                      name="phone"
                      label={
                        <span className="text-sm font-semibold text-slate-700">
                          Số điện thoại
                        </span>
                      }
                    >
                      <Input
                        prefix={<PhoneOutlined className="text-slate-400 mr-1" />}
                        placeholder="0912 345 678"
                        size="large"
                        className="!rounded-xl !border-slate-200 hover:!border-blue-400"
                      />
                    </Form.Item>
                  </Col>
                </Row>
              </div>

              <Divider className="!my-6" />

              {/* Phần 2: Mật khẩu */}
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center font-bold text-sm">
                  2
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 m-0">Mật khẩu đăng nhập</h3>
                  <p className="text-xs text-slate-400 m-0">Thiết lập mật khẩu bảo mật ban đầu cho user</p>
                </div>
              </div>

              <div className="space-y-1">
                <Row gutter={16}>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      name="password"
                      label={
                        <span className="text-sm font-semibold text-slate-700">
                          Mật khẩu <span className="text-rose-500">*</span>
                        </span>
                      }
                      rules={[
                        { required: true, message: 'Vui lòng nhập mật khẩu' },
                        { min: 6, message: 'Mật khẩu phải từ 6 ký tự trở lên' },
                      ]}
                    >
                      <Input.Password
                        prefix={<LockOutlined className="text-slate-400 mr-1" />}
                        placeholder="Tối thiểu 6 ký tự"
                        size="large"
                        className="!rounded-xl !border-slate-200 hover:!border-blue-400"
                        iconRender={(visible) =>
                          visible ? (
                            <EyeOutlined className="text-slate-400 cursor-pointer" />
                          ) : (
                            <EyeInvisibleOutlined className="text-slate-400 cursor-pointer" />
                          )
                        }
                        visibilityToggle={{
                          visible: showPassword,
                          onVisibleChange: setShowPassword,
                        }}
                      />
                    </Form.Item>

                    {watchedPassword && (
                      <div className="mb-4 -mt-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-slate-500">Độ mạnh mật khẩu</span>
                          <span
                            className="text-xs font-semibold"
                            style={{ color: pwdStrength.color }}
                          >
                            {pwdStrength.label}
                          </span>
                        </div>
                        <Progress
                          percent={pwdStrength.score}
                          showInfo={false}
                          strokeColor={pwdStrength.color}
                          trailColor="#f1f5f9"
                          size="small"
                          style={{ margin: 0 }}
                        />
                      </div>
                    )}
                  </Col>

                  <Col xs={24} sm={12}>
                    <Form.Item
                      name="confirmPassword"
                      label={
                        <span className="text-sm font-semibold text-slate-700">
                          Xác nhận mật khẩu <span className="text-rose-500">*</span>
                        </span>
                      }
                      dependencies={['password']}
                      rules={[
                        { required: true, message: 'Vui lòng xác nhận lại mật khẩu' },
                        ({ getFieldValue }) => ({
                          validator(_, value) {
                            if (!value || getFieldValue('password') === value) {
                              return Promise.resolve();
                            }
                            return Promise.reject(new Error('Mật khẩu xác nhận không khớp!'));
                          },
                        }),
                      ]}
                    >
                      <Input.Password
                        prefix={<LockOutlined className="text-slate-400 mr-1" />}
                        placeholder="Nhập lại mật khẩu"
                        size="large"
                        className="!rounded-xl !border-slate-200 hover:!border-blue-400"
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Alert
                  type="info"
                  showIcon
                  message="Lưu ý về mật khẩu"
                  description="Mật khẩu ban đầu sẽ dùng để đăng nhập. Người dùng có thể đổi lại mật khẩu bất cứ lúc nào sau khi đăng nhập."
                  className="!rounded-xl !text-xs !mb-2"
                />
              </div>

              <Divider className="!my-6" />

              {/* Phần 3: Vai trò & Trạng thái */}
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-sm">
                  3
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 m-0">Vai trò & Phân quyền</h3>
                  <p className="text-xs text-slate-400 m-0">Chỉ định nhóm quyền hạn và trạng thái kích hoạt</p>
                </div>
              </div>

              <div>
                <Row gutter={16} align="middle">
                  <Col xs={24} sm={14}>
                    <Form.Item
                      name="roleCode"
                      label={
                        <span className="text-sm font-semibold text-slate-700">
                          Vai trò hệ thống <span className="text-rose-500">*</span>
                        </span>
                      }
                      rules={[{ required: true, message: 'Vui lòng chọn vai trò' }]}
                    >
                      <Select
                        placeholder="Chọn vai trò cho User"
                        size="large"
                        className="!rounded-xl"
                      >
                        {roles.length > 0 ? (
                          roles.map((r) => (
                            <Option key={r.code} value={r.code}>
                              <div className="flex items-center gap-2 py-0.5">
                                <Tag
                                  color={ROLE_COLORS[r.code] || 'default'}
                                  className="!text-xs !font-bold !m-0"
                                >
                                  {r.code}
                                </Tag>
                                <span className="text-xs text-slate-600">
                                  {ROLE_LABELS[r.code] || r.description}
                                </span>
                              </div>
                            </Option>
                          ))
                        ) : (
                          <>
                            <Option value="ADMIN">
                              <Tag color="red">ADMIN</Tag> Quản trị viên
                            </Option>
                            <Option value="INSTRUCTOR">
                              <Tag color="blue">INSTRUCTOR</Tag> Giảng viên
                            </Option>
                            <Option value="STUDENT">
                              <Tag color="green">STUDENT</Tag> Học viên
                            </Option>
                          </>
                        )}
                      </Select>
                    </Form.Item>
                  </Col>

                  <Col xs={24} sm={10}>
                    <Form.Item
                      name="isActive"
                      label={
                        <span className="text-sm font-semibold text-slate-700">
                          Trạng thái kích hoạt
                        </span>
                      }
                      valuePropName="checked"
                    >
                      <Switch
                        checkedChildren="✓ Hoạt động"
                        unCheckedChildren="✗ Tạm dừng"
                        className={watchedIsActive ? '!bg-emerald-500' : ''}
                      />
                    </Form.Item>
                  </Col>
                </Row>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between mt-8 pt-5 border-t border-slate-100">
                <Button
                  onClick={() => navigate('/admin/users')}
                  size="large"
                  className="!rounded-xl !h-11 !px-5 text-slate-600"
                >
                  Hủy bỏ
                </Button>
                <Space size={12}>
                  <Button
                    onClick={() => form.resetFields()}
                    size="large"
                    className="!rounded-xl !h-11 !px-5 text-slate-500"
                  >
                    Xóa trắng
                  </Button>
                  <Button
                    type="primary"
                    htmlType="submit"
                    size="large"
                    loading={submitting}
                    icon={<UserAddOutlined />}
                    className="!h-11 !rounded-xl !bg-blue-600 hover:!bg-blue-700 !font-semibold !px-8 shadow-md shadow-blue-500/25"
                  >
                    {submitting ? 'Đang tạo...' : 'Tạo tài khoản User'}
                  </Button>
                </Space>
              </div>
            </Form>
          </div>
        </div>

        {/* ── Cột phải: Xem trước & Hướng dẫn (1/3) ── */}
        <div className="space-y-5">
          {/* Live Preview Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-4 text-white">
              <div className="text-xs font-semibold text-blue-100 uppercase tracking-wider mb-0.5">
                Xem trước tài khoản
              </div>
              <div className="text-sm font-bold">Thông tin sẽ hiển thị</div>
            </div>

            <div className="p-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <UserOutlined />
                </div>
                <div className="min-w-0">
                  <div className="text-xs text-slate-400 font-medium">Họ và tên</div>
                  <div className="text-sm font-bold text-slate-900 truncate">
                    {watchedFullName || <span className="text-slate-300 italic">Chưa nhập họ tên</span>}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <MailOutlined />
                </div>
                <div className="min-w-0">
                  <div className="text-xs text-slate-400 font-medium">Email đăng nhập</div>
                  <div className="text-sm font-semibold font-mono text-slate-800 truncate">
                    {watchedEmail || <span className="text-slate-300 italic font-sans">Chưa nhập email</span>}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <SafetyCertificateOutlined />
                </div>
                <div className="min-w-0">
                  <div className="text-xs text-slate-400 font-medium mb-1">Vai trò</div>
                  <Tag
                    color={ROLE_COLORS[watchedRoleCode] || 'default'}
                    className="!font-bold !text-xs !px-2.5 !py-0.5 !rounded-md"
                  >
                    {watchedRoleCode} · {ROLE_LABELS[watchedRoleCode] || ''}
                  </Tag>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    watchedIsActive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'
                  }`}
                >
                  <CheckCircleOutlined />
                </div>
                <div className="min-w-0">
                  <div className="text-xs text-slate-400 font-medium mb-1">Trạng thái</div>
                  <Tag
                    color={watchedIsActive ? 'success' : 'error'}
                    className="!font-medium !text-xs !px-2 !py-0.5 !rounded-md"
                  >
                    {watchedIsActive ? 'Đang hoạt động' : 'Tạm dừng'}
                  </Tag>
                </div>
              </div>
            </div>
          </div>

          {/* Role guides */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
              Hướng dẫn vai trò
            </div>
            <div className="space-y-2.5">
              {[
                {
                  code: 'ADMIN',
                  color: 'red',
                  label: 'Quản trị viên',
                  desc: 'Toàn quyền cấu hình hệ thống, quản lý users và phân quyền vai trò.',
                },
                {
                  code: 'INSTRUCTOR',
                  color: 'blue',
                  label: 'Giảng viên',
                  desc: 'Quản lý khóa học, phiên học, bài tập, chấm điểm và học viên.',
                },
                {
                  code: 'STUDENT',
                  color: 'green',
                  label: 'Học viên',
                  desc: 'Tham gia học tập, nộp bài, làm bài kiểm tra và theo dõi tiến độ.',
                },
              ].map(({ code, color, label, desc }) => (
                <div
                  key={code}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    watchedRoleCode === code
                      ? 'bg-blue-50/70 border-blue-300'
                      : 'bg-slate-50 border-slate-100 hover:border-slate-200'
                  }`}
                  onClick={() => form.setFieldsValue({ roleCode: code })}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Tag color={color} className="!text-xs !font-bold !m-0 !px-1.5 !py-0">
                      {code}
                    </Tag>
                    <span className="text-xs font-bold text-slate-800">{label}</span>
                  </div>
                  <p className="text-xs text-slate-500 m-0 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
};

export default UserCreatePage;
