import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Descriptions,
  Button,
  Space,
  Select,
  Tag,
  Divider,
  Spin,
  Result,
  List,
  Empty,
  Modal,
  Form,
  Input,
  Alert,
} from 'antd';
import {
  ArrowLeftOutlined,
  SaveOutlined,
  LockOutlined,
  UnlockOutlined,
  KeyOutlined,
  SafetyCertificateOutlined,
  CheckCircleOutlined,
  MailOutlined,
  PhoneOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import toast from 'react-hot-toast';

import PageContainer from '@/components/common/PageContainer';
import PageHeader from '@/components/common/PageHeader';
import StatusTag from '@/components/common/StatusTag';
import DateDisplay from '@/components/common/DateDisplay';
import UserAvatar from '@/components/common/UserAvatar';

import {
  adminUserApi,
  adminRoleApi,
  adminRolePermissionApi,
} from '@/services/api/admin';
import type {
  AccountResponse,
  Role,
  Permission,
  AccountResetPasswordRequest,
} from '@/services/types/user';

const { TextArea } = Input;

const UserDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const accountId = Number(id);

  const [user, setUser] = useState<AccountResponse | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedRole, setSelectedRole] = useState<number | undefined>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [lockModalVisible, setLockModalVisible] = useState(false);
  const [resetPwdModalVisible, setResetPwdModalVisible] = useState(false);
  const [lockForm] = Form.useForm();
  const [resetPwdForm] = Form.useForm();
  const [submittingAction, setSubmittingAction] = useState(false);

  // ══════════════════════════════════════════════════════════════
  // FETCH USER & ROLES & PERMISSIONS
  // ══════════════════════════════════════════════════════════════
  const loadData = useCallback(async () => {
    if (!accountId || isNaN(accountId)) {
      setError('ID không hợp lệ');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [userData, roleList] = await Promise.all([
        adminUserApi.getById(accountId),
        adminRoleApi.list(),
      ]);

      setUser(userData);
      setRoles(roleList || []);
      setSelectedRole(userData.roleId);

      // Load permissions based on user's roleId
      if (userData.roleId) {
        try {
          const perms = await adminRolePermissionApi.list(userData.roleId);
          setPermissions(perms || []);
        } catch {
          setPermissions([]);
        }
      } else {
        setPermissions([]);
      }
    } catch (err) {
      const e = err as { message?: string };
      setError(e?.message || 'Không thể tải thông tin tài khoản');
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ══════════════════════════════════════════════════════════════
  // HANDLERS
  // ══════════════════════════════════════════════════════════════
  const handleAssignRole = async () => {
    if (!selectedRole || selectedRole === user?.roleId) {
      toast.error('Vui lòng chọn vai trò khác');
      return;
    }
    setSaving(true);
    try {
      await adminUserApi.assignRole(accountId, selectedRole);
      const newRole = roles.find((r) => r.id === selectedRole);
      toast.success(`Đã đổi vai trò thành ${newRole?.code}`);
      loadData();
    } catch (err) {
      const e = err as { message?: string };
      toast.error(e?.message || 'Đổi vai trò thất bại');
    } finally {
      setSaving(false);
    }
  };

  const handleLockSubmit = async (values: { isLocked: boolean; reason?: string }) => {
    if (!user) return;
    setSubmittingAction(true);
    try {
      await adminUserApi.lockAccount(user.accountId, {
        isLocked: values.isLocked,
        reason: values.reason?.trim() || undefined,
      });
      toast.success(values.isLocked ? 'Đã khóa tài khoản' : 'Đã mở khóa tài khoản');
      setLockModalVisible(false);
      loadData();
    } catch (err) {
      const e = err as { message?: string };
      toast.error(e?.message || 'Thao tác thất bại');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleResetPwdSubmit = async (values: { newPassword: string }) => {
    if (!user) return;
    setSubmittingAction(true);
    try {
      const payload: AccountResetPasswordRequest = {
        newPassword: values.newPassword,
      };
      await adminUserApi.resetPassword(user.accountId, payload);
      toast.success('Đặt lại mật khẩu thành công');
      setResetPwdModalVisible(false);
    } catch (err) {
      const e = err as { message?: string };
      toast.error(e?.message || 'Đặt lại mật khẩu thất bại');
    } finally {
      setSubmittingAction(false);
    }
  };

  // ══════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Spin size="large" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <Result
        status="404"
        title="Không tìm thấy"
        subTitle={error || 'Tài khoản không tồn tại'}
        extra={
          <Button
            type="primary"
            onClick={() => navigate('/admin/users')}
            className="!rounded-lg !bg-blue-600 hover:!bg-blue-700"
          >
            Về danh sách Users
          </Button>
        }
      />
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title={`User: ${user.fullName || user.email}`}
        subtitle={`Chi tiết tài khoản #${user.accountId} · ${user.email}`}
        backButton
        backTo="/admin/users"
        extra={
          <Space>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/admin/users')}
              className="!h-9 !rounded-lg text-slate-600"
            >
              Quay lại
            </Button>
            <Button
              icon={<KeyOutlined />}
              onClick={() => {
                resetPwdForm.resetFields();
                setResetPwdModalVisible(true);
              }}
              className="!h-9 !rounded-lg"
            >
              Đặt lại mật khẩu
            </Button>
            <Button
              danger={!user.isLocked}
              icon={user.isLocked ? <UnlockOutlined /> : <LockOutlined />}
              onClick={() => {
                lockForm.resetFields();
                lockForm.setFieldsValue({
                  isLocked: !user.isLocked,
                  reason: '',
                });
                setLockModalVisible(true);
              }}
              className={`!h-9 !rounded-lg ${
                user.isLocked ? '!bg-emerald-600 hover:!bg-emerald-700 !text-white' : ''
              }`}
            >
              {user.isLocked ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
            </Button>
          </Space>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Cột trái: Thông tin chính (2/3) ── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Card */}
          <Card className="!rounded-xl shadow-xs border-slate-200/80">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 pb-5 border-b border-slate-100">
              <UserAvatar
                name={user.fullName || user.email}
                avatarUrl={user.avatarUrl}
                size={72}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-bold text-slate-900 m-0">
                    {user.fullName || user.email.split('@')[0]}
                  </h2>
                  <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                    #{user.accountId}
                  </span>
                </div>
                <div className="text-sm text-slate-500 font-mono mt-0.5">{user.email}</div>
                <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                  {user.roleCode && <StatusTag status={user.roleCode} />}
                  {user.isLocked ? (
                    <Tag color="error" className="!rounded-md">
                      <LockOutlined className="mr-1" /> Đã khóa
                    </Tag>
                  ) : user.isActive ? (
                    <Tag color="success" className="!rounded-md">
                      <CheckCircleOutlined className="mr-1" /> Hoạt động
                    </Tag>
                  ) : (
                    <Tag className="!rounded-md">Tạm dừng</Tag>
                  )}
                  {user.emailVerifiedAt ? (
                    <Tag color="blue" className="!rounded-md">
                      Đã xác minh email
                    </Tag>
                  ) : (
                    <Tag className="!rounded-md">Chưa xác minh email</Tag>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-5">
              <Descriptions
                column={{ xs: 1, sm: 2 }}
                bordered
                size="middle"
                className="rounded-lg overflow-hidden"
              >
                <Descriptions.Item label="Họ và tên">
                  <span className="font-medium text-slate-800">{user.fullName || '—'}</span>
                </Descriptions.Item>
                <Descriptions.Item label="Email">
                  <div className="flex items-center gap-1.5 font-mono text-xs text-slate-700">
                    <MailOutlined className="text-slate-400" /> {user.email}
                  </div>
                </Descriptions.Item>
                <Descriptions.Item label="Số điện thoại">
                  <div className="flex items-center gap-1.5 font-mono text-xs text-slate-700">
                    <PhoneOutlined className="text-slate-400" /> {user.phone || '—'}
                  </div>
                </Descriptions.Item>
                <Descriptions.Item label="Vai trò hệ thống">
                  <span className="font-semibold text-slate-800">{user.roleCode || '—'}</span>
                </Descriptions.Item>
                <Descriptions.Item label="Đăng nhập cuối">
                  <DateDisplay value={user.lastLoginAt} format="long" />
                </Descriptions.Item>
                <Descriptions.Item label="Ngày tạo tài khoản">
                  <div className="flex items-center gap-1.5 text-xs text-slate-700">
                    <CalendarOutlined className="text-slate-400" />
                    <DateDisplay value={user.createdAt} format="long" />
                  </div>
                </Descriptions.Item>
                <Descriptions.Item label="Cập nhật gần nhất" span={2}>
                  <DateDisplay value={user.updatedAt} format="long" />
                </Descriptions.Item>
              </Descriptions>
            </div>
          </Card>

          {/* Permissions List */}
          <Card
            title={
              <div className="flex items-center gap-2">
                <SafetyCertificateOutlined className="text-blue-600 text-lg" />
                <span className="font-bold text-slate-900">
                  Quyền hạn truy cập ({permissions.length})
                </span>
              </div>
            }
            className="!rounded-xl shadow-xs border-slate-200/80"
          >
            {permissions.length === 0 ? (
              <Empty
                description={
                  <div className="text-slate-500 text-sm">
                    {user.roleCode
                      ? `Vai trò [${user.roleCode}] chưa được cấu hình API permissions`
                      : 'Người dùng chưa được gán vai trò nào'}
                  </div>
                }
              />
            ) : (
              <List
                dataSource={permissions}
                renderItem={(item) => (
                  <List.Item className="!py-3 border-b border-slate-100 last:border-none">
                    <List.Item.Meta
                      title={
                        <Space wrap>
                          <Tag
                            color={
                              item.method === 'GET'
                                ? 'blue'
                                : item.method === 'POST'
                                ? 'green'
                                : item.method === 'PUT'
                                ? 'orange'
                                : item.method === 'DELETE'
                                ? 'red'
                                : 'purple'
                            }
                            className="font-mono font-bold"
                          >
                            {item.method}
                          </Tag>
                          <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-800">
                            {item.endpointPattern}
                          </span>
                          {item.module && (
                            <Tag color="cyan" className="text-xs">
                              {item.module}
                            </Tag>
                          )}
                        </Space>
                      }
                      description={
                        <span className="text-xs text-slate-500">
                          {item.description || 'API permission endpoint'}
                        </span>
                      }
                    />
                    <Tag color="success" className="!rounded-md">
                      Cho phép
                    </Tag>
                  </List.Item>
                )}
              />
            )}
          </Card>
        </div>

        {/* ── Cột phải: Vai trò & Thao tác (1/3) ── */}
        <div className="space-y-6">
          {/* Change Role Card */}
          <Card
            title={<span className="font-bold text-slate-900">Quản lý vai trò</span>}
            className="!rounded-xl shadow-xs border-slate-200/80"
          >
            <div className="space-y-4">
              <div>
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1.5">
                  Vai trò hiện tại
                </span>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/70">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">{user.roleCode || 'Chưa gán'}</span>
                    {user.roleCode && <StatusTag status={user.roleCode} />}
                  </div>
                </div>
              </div>

              <div>
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1.5">
                  Chuyển sang vai trò mới
                </span>
                <Select
                  style={{ width: '100%' }}
                  placeholder="Chọn vai trò"
                  value={selectedRole}
                  onChange={setSelectedRole}
                  className="!rounded-lg"
                  options={roles.map((r) => ({
                    value: r.id,
                    label: `${r.code} - ${r.description || ''}`,
                  }))}
                />
              </div>

              <Button
                type="primary"
                block
                icon={<SaveOutlined />}
                onClick={handleAssignRole}
                loading={saving}
                disabled={!selectedRole || selectedRole === user.roleId}
                className="!h-9 !rounded-lg !bg-blue-600 hover:!bg-blue-700 font-medium"
              >
                Lưu vai trò mới
              </Button>

              <Divider className="!my-2" />

              <div className="text-xs text-slate-500 leading-relaxed bg-amber-50 p-2.5 rounded-lg border border-amber-200/60">
                ⚠️ Sau khi thay đổi vai trò, quyền hạn của người dùng sẽ cập nhật tức thời trên server.
                Người dùng nên đăng nhập lại để nhận token mới.
              </div>
            </div>
          </Card>

          {/* Account Security Card */}
          <Card
            title={<span className="font-bold text-slate-900">Bảo mật tài khoản</span>}
            className="!rounded-xl shadow-xs border-slate-200/80"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200/70">
                <div>
                  <div className="text-sm font-semibold text-slate-800">Trạng thái khóa</div>
                  <div className="text-xs text-slate-500">
                    {user.isLocked ? 'Tài khoản đang bị khóa' : 'Tài khoản mở'}
                  </div>
                </div>
                {user.isLocked ? (
                  <Tag color="error">Bị khóa</Tag>
                ) : (
                  <Tag color="success">Bình thường</Tag>
                )}
              </div>

              <Button
                block
                danger={!user.isLocked}
                icon={user.isLocked ? <UnlockOutlined /> : <LockOutlined />}
                onClick={() => {
                  lockForm.resetFields();
                  lockForm.setFieldsValue({
                    isLocked: !user.isLocked,
                    reason: '',
                  });
                  setLockModalVisible(true);
                }}
                className={`!h-9 !rounded-lg ${
                  user.isLocked ? '!bg-emerald-600 hover:!bg-emerald-700 !text-white' : ''
                }`}
              >
                {user.isLocked ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
              </Button>

              <Button
                block
                icon={<KeyOutlined />}
                onClick={() => {
                  resetPwdForm.resetFields();
                  setResetPwdModalVisible(true);
                }}
                className="!h-9 !rounded-lg"
              >
                Đặt lại mật khẩu
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Modal Khóa / Mở khóa */}
      <Modal
        title={
          <div className="flex items-center gap-2 pb-2">
            {user.isLocked ? (
              <UnlockOutlined className="text-emerald-600 text-lg" />
            ) : (
              <LockOutlined className="text-rose-600 text-lg" />
            )}
            <span className="font-bold text-slate-900">
              {user.isLocked ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
            </span>
          </div>
        }
        open={lockModalVisible}
        onCancel={() => setLockModalVisible(false)}
        onOk={() => lockForm.submit()}
        okText={user.isLocked ? 'Mở khóa' : 'Xác nhận khóa'}
        cancelText="Hủy"
        confirmLoading={submittingAction}
        okButtonProps={{
          danger: !user.isLocked,
          className: user.isLocked
            ? '!bg-emerald-600 hover:!bg-emerald-700 !h-9 !rounded-lg'
            : '!h-9 !rounded-lg',
        }}
        cancelButtonProps={{ className: '!h-9 !rounded-lg' }}
        destroyOnClose
      >
        <Divider className="!my-3" />
        <Form form={lockForm} layout="vertical" onFinish={handleLockSubmit}>
          <Form.Item name="isLocked" hidden initialValue={!user.isLocked} />

          {!user.isLocked && (
            <Alert
              type="warning"
              showIcon
              message="Khi bị khóa, User sẽ bị ngắt mọi phiên làm việc ngay lập tức."
              className="!mb-4 !rounded-lg"
            />
          )}

          <Form.Item
            name="reason"
            label={
              <span className="font-medium text-slate-700">
                {user.isLocked ? 'Lý do mở khóa' : 'Lý do khóa tài khoản'}
              </span>
            }
          >
            <TextArea
              rows={3}
              placeholder={
                user.isLocked ? 'Nhập lý do mở khóa...' : 'Nhập lý do khóa tài khoản...'
              }
              className="!rounded-lg"
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal Đặt lại mật khẩu */}
      <Modal
        title={
          <div className="flex items-center gap-2 pb-2">
            <KeyOutlined className="text-purple-600 text-lg" />
            <span className="font-bold text-slate-900">Đặt lại mật khẩu</span>
          </div>
        }
        open={resetPwdModalVisible}
        onCancel={() => setResetPwdModalVisible(false)}
        onOk={() => resetPwdForm.submit()}
        okText="Lưu mật khẩu"
        cancelText="Hủy"
        confirmLoading={submittingAction}
        okButtonProps={{ className: '!bg-blue-600 hover:!bg-blue-700 !h-9 !rounded-lg' }}
        cancelButtonProps={{ className: '!h-9 !rounded-lg' }}
        destroyOnClose
      >
        <Divider className="!my-3" />
        <Form form={resetPwdForm} layout="vertical" onFinish={handleResetPwdSubmit}>
          <Form.Item
            name="newPassword"
            label={<span className="font-medium text-slate-700">Mật khẩu mới</span>}
            rules={[
              { required: true, message: 'Vui lòng nhập mật khẩu mới' },
              { min: 6, message: 'Mật khẩu phải từ 6 ký tự' },
            ]}
          >
            <Input.Password placeholder="••••••••" className="!h-9 !rounded-lg" />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label={<span className="font-medium text-slate-700">Xác nhận mật khẩu mới</span>}
            dependencies={['newPassword']}
            rules={[
              { required: true, message: 'Vui lòng xác nhận lại mật khẩu mới' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Mật khẩu xác nhận không khớp!'));
                },
              }),
            ]}
          >
            <Input.Password placeholder="••••••••" className="!h-9 !rounded-lg" />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default UserDetailPage;
