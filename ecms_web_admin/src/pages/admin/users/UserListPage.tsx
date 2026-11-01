import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Space,
  Select,
  Tooltip,
  Popconfirm,
  Modal,
  Form,
  Input,
  Drawer,
  Tag,
  Descriptions,
  Divider,
  Row,
  Col,
  Switch,
  Alert,
} from 'antd';
import {
  PlusOutlined,
  EyeOutlined,
  ReloadOutlined,
  EditOutlined,
  LockOutlined,
  UnlockOutlined,
  KeyOutlined,
  DeleteOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  UserOutlined,
  PhoneOutlined,
  ClearOutlined,
  SafetyCertificateOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import toast from 'react-hot-toast';

import PageContainer from '@/components/common/PageContainer';
import PageHeader from '@/components/common/PageHeader';
import DataTable from '@/components/common/DataTable';
import StatusTag from '@/components/common/StatusTag';
import UserAvatar from '@/components/common/UserAvatar';
import DateDisplay from '@/components/common/DateDisplay';
import StatsCard from '@/components/common/StatsCard';
import { useTranslation } from '@/hooks/useTranslation';

import { adminUserApi, adminRoleApi } from '@/services/api/admin';
import type {
  AccountResponse,
  Role,
  AccountUpdateRequest,
  AccountResetPasswordRequest,
} from '@/services/types/user';

const { Option } = Select;
const { TextArea } = Input;

const UserListPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // ══════════════════════════════════════════════════════════════
  // STATE
  // ══════════════════════════════════════════════════════════════
  const [data, setData] = useState<AccountResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [keyword, setKeyword] = useState('');
  const [roleFilter, setRoleFilter] = useState<string | undefined>();
  const [activeFilter, setActiveFilter] = useState<boolean | undefined>();
  const [roles, setRoles] = useState<Role[]>([]);

  // Modals state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [lockModalVisible, setLockModalVisible] = useState(false);
  const [resetPwdModalVisible, setResetPwdModalVisible] = useState(false);
  const [detailDrawerVisible, setDetailDrawerVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AccountResponse | null>(null);

  // Forms
  const [editForm] = Form.useForm();
  const [lockForm] = Form.useForm();
  const [resetPwdForm] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  // ══════════════════════════════════════════════════════════════
  // FETCH ROLES
  // ══════════════════════════════════════════════════════════════
  useEffect(() => {
    adminRoleApi
      .list()
      .then((roleList) => setRoles(roleList || []))
      .catch((err) => {
        console.error('Failed to load roles:', err);
      });
  }, []);

  // ══════════════════════════════════════════════════════════════
  // FETCH DATA
  // ══════════════════════════════════════════════════════════════
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = {
        page,
        size: pageSize,
        sortBy: 'createdAt',
        sortDir: 'desc',
      };
      if (keyword.trim()) params.search = keyword.trim();
      if (roleFilter) params.roleCode = roleFilter;
      if (activeFilter !== undefined) params.isActive = activeFilter;

      const res = await adminUserApi.search(params);
      setData(res.content || []);
      setTotal(res.totalElements || 0);
    } catch (err) {
      const e = err as { message?: string };
      toast.error(e?.message || 'Không thể tải danh sách tài khoản');
      setData([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, keyword, roleFilter, activeFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset page on filter change
  useEffect(() => {
    setPage(0);
  }, [keyword, roleFilter, activeFilter]);

  // ══════════════════════════════════════════════════════════════
  // KPI STATS COMPUTATION
  // ══════════════════════════════════════════════════════════════
  const stats = useMemo(() => {
    const totalUsers = total;
    const activeCount = data.filter((u) => u.isActive && !u.isLocked).length;
    const lockedCount = data.filter((u) => u.isLocked).length;
    const instructorCount = data.filter(
      (u) => u.roleCode === 'INSTRUCTOR' || u.roleCode === 'ADMIN'
    ).length;
    return { totalUsers, activeCount, lockedCount, instructorCount };
  }, [data, total]);

  // ══════════════════════════════════════════════════════════════
  // HANDLERS
  // ══════════════════════════════════════════════════════════════
  const handleRefresh = () => {
    fetchData();
    toast.success('Đã làm mới dữ liệu');
  };

  const handleResetFilters = () => {
    setKeyword('');
    setRoleFilter(undefined);
    setActiveFilter(undefined);
    setPage(0);
  };

  // Open Create — navigate to dedicated create page
  const handleOpenCreate = () => {
    navigate('/admin/users/create');
  };

  // Open Edit
  const handleOpenEdit = (record: AccountResponse) => {
    setSelectedUser(record);
    editForm.resetFields();
    editForm.setFieldsValue({
      fullName: record.fullName || '',
      phone: record.phone || '',
      roleId: record.roleId,
      roleCode: record.roleCode,
      isActive: record.isActive,
    });
    setEditModalVisible(true);
  };

  // Submit Edit
  const handleEditSubmit = async (values: {
    fullName?: string;
    phone?: string;
    roleId?: number;
    roleCode?: string;
    isActive?: boolean;
  }) => {
    if (!selectedUser) return;
    setSubmitting(true);
    try {
      const payload: AccountUpdateRequest = {
        fullName: values.fullName?.trim() || undefined,
        phone: values.phone?.trim() || undefined,
        roleId: values.roleId,
        roleCode: values.roleCode,
        isActive: values.isActive,
      };
      await adminUserApi.update(selectedUser.accountId, payload);
      toast.success('Cập nhật thông tin User thành công');
      setEditModalVisible(false);
      fetchData();
    } catch (err) {
      const e = err as { message?: string };
      toast.error(e?.message || 'Cập nhật thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Lock / Unlock
  const handleOpenLock = (record: AccountResponse) => {
    setSelectedUser(record);
    lockForm.resetFields();
    lockForm.setFieldsValue({
      isLocked: !record.isLocked,
      reason: '',
    });
    setLockModalVisible(true);
  };

  // Submit Lock
  const handleLockSubmit = async (values: { isLocked: boolean; reason?: string }) => {
    if (!selectedUser) return;
    setSubmitting(true);
    try {
      await adminUserApi.lockAccount(selectedUser.accountId, {
        isLocked: values.isLocked,
        reason: values.reason?.trim() || undefined,
      });
      toast.success(values.isLocked ? 'Đã khóa tài khoản' : 'Đã mở khóa tài khoản');
      setLockModalVisible(false);
      fetchData();
    } catch (err) {
      const e = err as { message?: string };
      toast.error(e?.message || 'Thao tác thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Reset Password
  const handleOpenResetPwd = (record: AccountResponse) => {
    setSelectedUser(record);
    resetPwdForm.resetFields();
    setResetPwdModalVisible(true);
  };

  // Submit Reset Password
  const handleResetPwdSubmit = async (values: { newPassword: string }) => {
    if (!selectedUser) return;
    setSubmitting(true);
    try {
      const payload: AccountResetPasswordRequest = {
        newPassword: values.newPassword,
      };
      await adminUserApi.resetPassword(selectedUser.accountId, payload);
      toast.success('Đặt lại mật khẩu thành công');
      setResetPwdModalVisible(false);
    } catch (err) {
      const e = err as { message?: string };
      toast.error(e?.message || 'Đặt lại mật khẩu thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Detail Drawer
  const handleOpenDetail = (record: AccountResponse) => {
    setSelectedUser(record);
    setDetailDrawerVisible(true);
  };

  // Delete User
  const handleDelete = async (id: number) => {
    try {
      await adminUserApi.delete(id);
      toast.success('Đã xóa/vô hiệu hóa tài khoản #' + id);
      fetchData();
    } catch (err) {
      const e = err as { message?: string };
      toast.error(e?.message || 'Xóa thất bại');
    }
  };

  // ══════════════════════════════════════════════════════════════
  // COLUMNS
  // ══════════════════════════════════════════════════════════════
  const columns: ColumnsType<AccountResponse> = useMemo(
    () => [
      {
        title: 'ID',
        dataIndex: 'accountId',
        key: 'accountId',
        width: 70,
        align: 'center',
        render: (id: number) => (
          <span className="font-mono text-xs text-slate-500 font-semibold">#{id}</span>
        ),
      },
      {
        title: t('user.fullName'),
        key: 'user',
        width: 250,
        render: (_, record) => (
          <div className="flex items-center gap-3">
            <UserAvatar
              name={record.fullName || record.email}
              avatarUrl={record.avatarUrl}
              size={36}
            />
            <div className="min-w-0">
              <div
                className="font-medium text-slate-900 truncate hover:text-blue-600 cursor-pointer transition-colors"
                onClick={() => handleOpenDetail(record)}
              >
                {record.fullName || record.email.split('@')[0]}
              </div>
              <div className="text-xs text-slate-400 font-mono truncate">{record.email}</div>
            </div>
          </div>
        ),
      },
      {
        title: t('user.phone'),
        dataIndex: 'phone',
        key: 'phone',
        width: 140,
        render: (phone?: string) => (
          <span className="text-slate-600 text-xs font-mono">{phone || '—'}</span>
        ),
      },
      {
        title: t('user.role'),
        dataIndex: 'roleCode',
        key: 'roleCode',
        width: 130,
        align: 'center',
        render: (role?: string) => (role ? <StatusTag status={role} /> : <span>—</span>),
      },
      {
        title: t('user.status'),
        key: 'status',
        width: 140,
        align: 'center',
        render: (_, record) => {
          if (record.isLocked) {
            return (
              <Tag color="error" className="!rounded-md !px-2 !py-0.5 font-medium flex items-center justify-center gap-1 w-fit mx-auto">
                <LockOutlined /> {t('user.locked')}
              </Tag>
            );
          }
          if (!record.isActive) {
            return (
              <Tag color="default" className="!rounded-md !px-2 !py-0.5 font-medium w-fit mx-auto">
                {t('user.inactive')}
              </Tag>
            );
          }
          return (
            <Tag color="success" className="!rounded-md !px-2 !py-0.5 font-medium flex items-center justify-center gap-1 w-fit mx-auto">
              <CheckCircleOutlined /> {t('user.active')}
            </Tag>
          );
        },
      },
      {
        title: 'Last Login',
        dataIndex: 'lastLoginAt',
        key: 'lastLoginAt',
        width: 150,
        render: (v?: string) => (
          <span className="text-xs text-slate-500">
            <DateDisplay value={v} format="relative" />
          </span>
        ),
      },
      {
        title: t('common.createdAt'),
        dataIndex: 'createdAt',
        key: 'createdAt',
        width: 130,
        render: (v?: string) => (
          <span className="text-xs text-slate-500">
            <DateDisplay value={v} />
          </span>
        ),
      },
      {
        title: t('common.actions'),
        key: 'action',
        width: 180,
        align: 'center',
        fixed: 'right',
        render: (_, record) => (
          <Space size={2}>
            {/* View detail */}
            <Tooltip title={t('common.details')}>
              <Button
                type="text"
                size="small"
                icon={<EyeOutlined className="text-slate-500 hover:text-blue-600" />}
                onClick={() => handleOpenDetail(record)}
              />
            </Tooltip>

            {/* Edit user */}
            <Tooltip title={t('user.edit')}>
              <Button
                type="text"
                size="small"
                icon={<EditOutlined className="text-slate-500 hover:text-amber-600" />}
                onClick={() => handleOpenEdit(record)}
              />
            </Tooltip>

            {/* Lock / Unlock */}
            <Tooltip title={record.isLocked ? t('user.unlockAccount') : t('user.lockAccount')}>
              <Button
                type="text"
                size="small"
                icon={
                  record.isLocked ? (
                    <UnlockOutlined className="text-emerald-600" />
                  ) : (
                    <LockOutlined className="text-amber-600" />
                  )
                }
                onClick={() => handleOpenLock(record)}
              />
            </Tooltip>

            {/* Reset Password */}
            <Tooltip title={t('user.resetPassword')}>
              <Button
                type="text"
                size="small"
                icon={<KeyOutlined className="text-slate-500 hover:text-purple-600" />}
                onClick={() => handleOpenResetPwd(record)}
              />
            </Tooltip>

            {/* Delete / Deactivate */}
            <Popconfirm
              title={t('user.deleteConfirmTitle')}
              description={t('user.deleteConfirmDesc')}
              okText={t('common.delete')}
              cancelText={t('common.cancel')}
              okButtonProps={{ danger: true }}
              onConfirm={() => handleDelete(record.accountId)}
            >
              <Tooltip title={t('common.delete')}>
                <Button
                  type="text"
                  size="small"
                  icon={<DeleteOutlined className="text-slate-400 hover:text-rose-600" />}
                />
              </Tooltip>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [t]
  );

  // ══════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════
  return (
    <PageContainer>
      <PageHeader
        title={t('user.title')}
        subtitle={t('user.subtitle')}
        extra={
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={handleRefresh}
              className="!h-9 !rounded-lg text-slate-600 hover:border-blue-500"
            >
              {t('common.refresh')}
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleOpenCreate}
              className="!h-9 !rounded-lg bg-blue-600 hover:bg-blue-700 font-medium shadow-sm shadow-blue-500/20"
            >
              {t('user.create')}
            </Button>
          </Space>
        }
      />

      {/* ── KPI Metric Cards ── */}
      <Row gutter={[16, 16]} className="mb-5">
        <Col xs={24} sm={12} lg={6}>
          <StatsCard
            title={t('user.stats.total')}
            value={stats.totalUsers}
            icon={<TeamOutlined />}
            color="#2563eb"
            bgColor="#eff6ff"
            active={!roleFilter && activeFilter === undefined}
            onClick={handleResetFilters}
            tooltip="Tất cả tài khoản users trong hệ thống"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatsCard
            title={t('user.stats.active')}
            value={stats.activeCount}
            icon={<CheckCircleOutlined />}
            color="#10b981"
            bgColor="#ecfdf5"
            active={activeFilter === true}
            onClick={() => setActiveFilter(activeFilter === true ? undefined : true)}
            tagText="ACTIVE"
            tagColor="success"
            tooltip="Users đang hoạt động bình thường"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatsCard
            title={t('user.stats.locked')}
            value={stats.lockedCount}
            icon={<LockOutlined />}
            color="#ef4444"
            bgColor="#fef2f2"
            active={activeFilter === false}
            onClick={() => setActiveFilter(activeFilter === false ? undefined : false)}
            tagText="LOCKED"
            tagColor="error"
            tooltip="Users đang bị tạm khóa hoặc hạn chế"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatsCard
            title={t('user.stats.instructors')}
            value={stats.instructorCount}
            icon={<UserOutlined />}
            color="#8b5cf6"
            bgColor="#f5f3ff"
            active={roleFilter === 'INSTRUCTOR'}
            onClick={() => setRoleFilter(roleFilter === 'INSTRUCTOR' ? undefined : 'INSTRUCTOR')}
            tagText="STAFF"
            tagColor="purple"
            tooltip="Giảng viên và Quản trị viên hệ thống"
          />
        </Col>
      </Row>

      {/* ── Main Data Table Card ── */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200/80 p-5">
        <DataTable<AccountResponse>
          columns={columns}
          dataSource={data}
          loading={loading}
          rowKey="accountId"
          total={total}
          page={page}
          pageSize={pageSize}
          onPageChange={(p, ps) => {
            setPage(p);
            setPageSize(ps);
          }}
          onSearch={(v) => setKeyword(v)}
          searchPlaceholder={t('user.searchPlaceholder')}
          extra={
            <div className="flex flex-wrap items-center gap-2">
              <Select
                placeholder={t('user.filterRole')}
                allowClear
                style={{ width: 170 }}
                value={roleFilter}
                onChange={setRoleFilter}
                className="!rounded-lg"
              >
                {roles.length > 0 ? (
                  roles.map((r) => (
                    <Option key={r.code} value={r.code}>
                      {r.code} {r.description ? `(${r.description})` : ''}
                    </Option>
                  ))
                ) : (
                  <>
                    <Option value="ADMIN">ADMIN</Option>
                    <Option value="INSTRUCTOR">INSTRUCTOR</Option>
                    <Option value="STUDENT">STUDENT</Option>
                  </>
                )}
              </Select>
              <Select
                placeholder={t('user.filterStatus')}
                allowClear
                style={{ width: 150 }}
                value={activeFilter}
                onChange={setActiveFilter}
                className="!rounded-lg"
              >
                <Option value={true}>{t('user.active')}</Option>
                <Option value={false}>{t('user.locked')}</Option>
              </Select>
              {(keyword || roleFilter || activeFilter !== undefined) && (
                <Button
                  icon={<ClearOutlined />}
                  onClick={handleResetFilters}
                  className="!rounded-lg text-slate-500"
                >
                  Xóa lọc
                </Button>
              )}
            </div>
          }
        />
      </div>

      {/* ══════════════════════════════════════════════════════════════
          MODAL: CHỈNH SỬA USER
          ══════════════════════════════════════════════════════════════ */}
      <Modal
        title={
          <div className="flex items-center gap-2.5 pb-2">
            <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
              <EditOutlined className="text-amber-600 text-lg" />
            </div>
            <div>
              <div className="text-base font-bold text-slate-900">{t('user.modal.editTitle')}</div>
              <div className="text-xs text-slate-500 font-normal">
                {selectedUser?.email} (#{selectedUser?.accountId})
              </div>
            </div>
          </div>
        }
        open={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        onOk={() => editForm.submit()}
        okText={t('common.save')}
        cancelText={t('common.cancel')}
        confirmLoading={submitting}
        destroyOnClose
        width={520}
        okButtonProps={{ className: '!bg-blue-600 hover:!bg-blue-700 !h-9 !rounded-lg' }}
        cancelButtonProps={{ className: '!h-9 !rounded-lg' }}
      >
        <Divider className="!my-3" />
        <Form form={editForm} layout="vertical" onFinish={handleEditSubmit}>
          <Form.Item
            name="fullName"
            label={<span className="font-medium text-slate-700">{t('user.fullName')}</span>}
            rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}
          >
            <Input
              prefix={<UserOutlined className="text-slate-400" />}
              className="!h-9 !rounded-lg"
            />
          </Form.Item>

          <Form.Item
            name="phone"
            label={<span className="font-medium text-slate-700">{t('user.phone')}</span>}
          >
            <Input
              prefix={<PhoneOutlined className="text-slate-400" />}
              placeholder="0912345678"
              className="!h-9 !rounded-lg"
            />
          </Form.Item>

          <Row gutter={16} align="middle">
            <Col span={14}>
              <Form.Item
                name="roleCode"
                label={<span className="font-medium text-slate-700">{t('user.role')}</span>}
                rules={[{ required: true, message: 'Vui lòng chọn vai trò' }]}
              >
                <Select placeholder="Chọn vai trò" className="!rounded-lg">
                  {roles.map((r) => (
                    <Option key={r.code} value={r.code}>
                      <Space>
                        <Tag color="blue">{r.code}</Tag>
                        <span className="text-xs text-slate-500">{r.description}</span>
                      </Space>
                    </Option>
                  ))}
                  {roles.length === 0 && (
                    <>
                      <Option value="ADMIN">ADMIN</Option>
                      <Option value="INSTRUCTOR">INSTRUCTOR</Option>
                      <Option value="STUDENT">STUDENT</Option>
                    </>
                  )}
                </Select>
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item
                name="isActive"
                label={<span className="font-medium text-slate-700">{t('user.status')}</span>}
                valuePropName="checked"
              >
                <Switch checkedChildren="Hoạt động" unCheckedChildren="Tạm dừng" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* ══════════════════════════════════════════════════════════════
          MODAL: KHÓA / MỞ KHÓA TÀI KHOẢN
          ══════════════════════════════════════════════════════════════ */}
      <Modal
        title={
          <div className="flex items-center gap-2.5 pb-2">
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                selectedUser?.isLocked ? 'bg-emerald-50' : 'bg-rose-50'
              }`}
            >
              {selectedUser?.isLocked ? (
                <UnlockOutlined className="text-emerald-600 text-lg" />
              ) : (
                <LockOutlined className="text-rose-600 text-lg" />
              )}
            </div>
            <div>
              <div className="text-base font-bold text-slate-900">
                {selectedUser?.isLocked ? t('user.unlockAccount') : t('user.lockAccount')}
              </div>
              <div className="text-xs text-slate-500 font-normal">
                {selectedUser?.email} (#{selectedUser?.accountId})
              </div>
            </div>
          </div>
        }
        open={lockModalVisible}
        onCancel={() => setLockModalVisible(false)}
        onOk={() => lockForm.submit()}
        okText={selectedUser?.isLocked ? t('user.unlockAccount') : t('user.lockAccount')}
        cancelText={t('common.cancel')}
        confirmLoading={submitting}
        destroyOnClose
        okButtonProps={{
          danger: !selectedUser?.isLocked,
          className: selectedUser?.isLocked
            ? '!bg-emerald-600 hover:!bg-emerald-700 !h-9 !rounded-lg'
            : '!h-9 !rounded-lg',
        }}
        cancelButtonProps={{ className: '!h-9 !rounded-lg' }}
      >
        <Divider className="!my-3" />
        <Form form={lockForm} layout="vertical" onFinish={handleLockSubmit}>
          <Form.Item name="isLocked" hidden initialValue={!selectedUser?.isLocked} />

          {!selectedUser?.isLocked && (
            <Alert
              type="warning"
              showIcon
              message={t('user.modal.lockWarning')}
              description="Toàn bộ phiên đăng nhập hiện thời của tài khoản này sẽ bị hủy ngay lập tức và gửi email thông báo cho người dùng."
              className="!mb-4 !rounded-lg"
            />
          )}

          <Form.Item
            name="reason"
            label={
              <span className="font-medium text-slate-700">
                {selectedUser?.isLocked ? 'Lý do mở khóa' : 'Lý do khóa tài khoản'}
              </span>
            }
          >
            <TextArea
              rows={3}
              placeholder={
                selectedUser?.isLocked
                  ? t('user.modal.unlockReasonPlaceholder')
                  : t('user.modal.lockReasonPlaceholder')
              }
              className="!rounded-lg"
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* ══════════════════════════════════════════════════════════════
          MODAL: ĐẶT LẠI MẬT KHẨU
          ══════════════════════════════════════════════════════════════ */}
      <Modal
        title={
          <div className="flex items-center gap-2.5 pb-2">
            <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center">
              <KeyOutlined className="text-purple-600 text-lg" />
            </div>
            <div>
              <div className="text-base font-bold text-slate-900">{t('user.modal.resetPasswordTitle')}</div>
              <div className="text-xs text-slate-500 font-normal">
                {selectedUser?.email} (#{selectedUser?.accountId})
              </div>
            </div>
          </div>
        }
        open={resetPwdModalVisible}
        onCancel={() => setResetPwdModalVisible(false)}
        onOk={() => resetPwdForm.submit()}
        okText={t('common.save')}
        cancelText={t('common.cancel')}
        confirmLoading={submitting}
        destroyOnClose
        okButtonProps={{ className: '!bg-blue-600 hover:!bg-blue-700 !h-9 !rounded-lg' }}
        cancelButtonProps={{ className: '!h-9 !rounded-lg' }}
      >
        <Divider className="!my-3" />
        <Form form={resetPwdForm} layout="vertical" onFinish={handleResetPwdSubmit}>
          <Alert
            type="info"
            showIcon
            message="Lưu ý bảo mật"
            description="Sau khi đặt lại mật khẩu mới, tất cả các phiên đăng nhập cũ của tài khoản này sẽ tự động bị thu hồi."
            className="!mb-4 !rounded-lg"
          />

          <Form.Item
            name="newPassword"
            label={<span className="font-medium text-slate-700">{t('user.newPassword')}</span>}
            rules={[
              { required: true, message: 'Vui lòng nhập mật khẩu mới' },
              { min: 6, message: 'Mật khẩu phải từ 6 ký tự' },
            ]}
          >
            <Input.Password placeholder="••••••••" className="!h-9 !rounded-lg" />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label={<span className="font-medium text-slate-700">{t('user.confirmPassword')}</span>}
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

      {/* ══════════════════════════════════════════════════════════════
          DRAWER: QUICK VIEW CHI TIẾT USER
          ══════════════════════════════════════════════════════════════ */}
      <Drawer
        title={
          <div className="flex items-center justify-between w-full pr-4">
            <span className="font-bold text-slate-900">{t('user.detail')}</span>
            {selectedUser && (
              <Button
                type="link"
                size="small"
                icon={<ArrowRightOutlined />}
                onClick={() => navigate(`/admin/users/${selectedUser.accountId}`)}
                className="text-blue-600 hover:text-blue-700 p-0"
              >
                Trang chi tiết đầy đủ
              </Button>
            )}
          </div>
        }
        open={detailDrawerVisible}
        onClose={() => setDetailDrawerVisible(false)}
        width={480}
      >
        {selectedUser && (
          <div className="space-y-6">
            {/* Header info */}
            <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200/70">
              <UserAvatar
                name={selectedUser.fullName || selectedUser.email}
                avatarUrl={selectedUser.avatarUrl}
                size={56}
              />
              <div className="min-w-0">
                <div className="text-base font-bold text-slate-900 truncate">
                  {selectedUser.fullName || selectedUser.email.split('@')[0]}
                </div>
                <div className="text-xs text-slate-500 font-mono truncate">{selectedUser.email}</div>
                <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                  {selectedUser.roleCode ? (
                    <StatusTag status={selectedUser.roleCode} />
                  ) : (
                    <Tag>Chưa có role</Tag>
                  )}
                  {selectedUser.isLocked ? (
                    <Tag color="error">Đã khóa</Tag>
                  ) : selectedUser.isActive ? (
                    <Tag color="success">Hoạt động</Tag>
                  ) : (
                    <Tag>Tạm dừng</Tag>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-3 gap-2">
              <Button
                icon={<EditOutlined />}
                onClick={() => {
                  setDetailDrawerVisible(false);
                  handleOpenEdit(selectedUser);
                }}
                className="!rounded-lg"
              >
                Sửa
              </Button>
              <Button
                icon={selectedUser.isLocked ? <UnlockOutlined /> : <LockOutlined />}
                onClick={() => {
                  setDetailDrawerVisible(false);
                  handleOpenLock(selectedUser);
                }}
                className="!rounded-lg"
              >
                {selectedUser.isLocked ? 'Mở khóa' : 'Khóa'}
              </Button>
              <Button
                icon={<KeyOutlined />}
                onClick={() => {
                  setDetailDrawerVisible(false);
                  handleOpenResetPwd(selectedUser);
                }}
                className="!rounded-lg"
              >
                Đổi MK
              </Button>
            </div>

            {/* Detail descriptions */}
            <Descriptions
              title={<span className="text-sm font-semibold text-slate-800">Thông tin tài khoản</span>}
              column={1}
              bordered
              size="small"
              className="bg-white rounded-lg"
            >
              <Descriptions.Item label="Account ID">
                <span className="font-mono text-xs">#{selectedUser.accountId}</span>
              </Descriptions.Item>
              <Descriptions.Item label="Email">{selectedUser.email}</Descriptions.Item>
              <Descriptions.Item label="Họ tên">
                {selectedUser.fullName || <span className="text-slate-400">Chưa cập nhật</span>}
              </Descriptions.Item>
              <Descriptions.Item label="Số điện thoại">
                {selectedUser.phone || <span className="text-slate-400">Chưa cập nhật</span>}
              </Descriptions.Item>
              <Descriptions.Item label="Vai trò">
                <span className="font-medium text-slate-700">{selectedUser.roleCode || '—'}</span>
              </Descriptions.Item>
              <Descriptions.Item label="Xác minh email">
                {selectedUser.emailVerifiedAt ? (
                  <Tag color="green">Đã xác minh</Tag>
                ) : (
                  <Tag>Chưa xác minh</Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Đăng nhập cuối">
                <DateDisplay value={selectedUser.lastLoginAt} format="long" />
              </Descriptions.Item>
              <Descriptions.Item label="Ngày tạo">
                <DateDisplay value={selectedUser.createdAt} format="long" />
              </Descriptions.Item>
              <Descriptions.Item label="Cập nhật gần nhất">
                <DateDisplay value={selectedUser.updatedAt} format="long" />
              </Descriptions.Item>
            </Descriptions>

            {/* Link to detail page */}
            <div className="pt-2">
              <Button
                type="primary"
                block
                icon={<SafetyCertificateOutlined />}
                onClick={() => navigate(`/admin/users/${selectedUser.accountId}`)}
                className="!h-10 !rounded-lg !bg-blue-600 hover:!bg-blue-700 font-medium"
              >
                Xem chi tiết phân quyền & bảo mật
              </Button>
            </div>
          </div>
        )}
      </Drawer>
    </PageContainer>
  );
};

export default UserListPage;
