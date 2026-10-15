import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Descriptions, Avatar, Button, Space, Select, Tag, Divider,
  Typography, Spin, Result, List, Empty,
} from 'antd';
import {
  UserOutlined, ArrowLeftOutlined, SaveOutlined,
} from '@ant-design/icons';
import toast from 'react-hot-toast';

import PageContainer from '@/components/common/PageContainer';
import PageHeader from '@/components/common/PageHeader';
import StatusTag from '@/components/common/StatusTag';
import DateDisplay from '@/components/common/DateDisplay';

import { adminUserApi, adminRoleApi } from '@/services/api/admin';
import type { AccountResponse, Role, AccountPermissionResponse } from '@/services/types/user';

const { Title, Text } = Typography;

const UserDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const accountId = Number(id);

  const [user, setUser] = useState<AccountResponse | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<AccountPermissionResponse[]>([]);
  const [selectedRole, setSelectedRole] = useState<number | undefined>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ══════════════════════════════════════════════════════════════
  // FETCH
  // ══════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!accountId || isNaN(accountId)) {
      setError('ID không hợp lệ');
      setLoading(false);
      return;
    }

    (async () => {
      setLoading(true);
      try {
        const [userData, roleList, permList] = await Promise.all([
          adminUserApi.getById(accountId),
          adminRoleApi.list(),
          adminUserApi.getPermissions(accountId).catch(() => []),
        ]);
        setUser(userData);
        setRoles(roleList);
        setPermissions(permList);
        setSelectedRole(userData.roleId);
      } catch (err) {
        const e = err as { message?: string };
        setError(e?.message || 'Không thể tải thông tin tài khoản');
      } finally {
        setLoading(false);
      }
    })();
  }, [accountId]);

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
      // Reload
      const updated = await adminUserApi.getById(accountId);
      setUser(updated);
    } catch (err) {
      const e = err as { message?: string };
      toast.error(e?.message || 'Đổi vai trò thất bại');
    } finally {
      setSaving(false);
    }
  };

  // ══════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
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
          <Button type="primary" onClick={() => navigate('/admin/users')}>
            Về danh sách
          </Button>
        }
      />
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title={`Tài khoản #${user.accountId}`}
        subtitle={user.email}
        backButton
        backTo="/admin/users"
        extra={
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/admin/users')}>
            Quay lại
          </Button>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
        {/* ── Cột trái: Thông tin ── */}
        <div>
          <Card>
            <Space size={24} align="center" style={{ marginBottom: 24 }}>
              <Avatar
                size={80}
                src={user.avatarUrl || undefined}
                icon={!user.avatarUrl ? <UserOutlined /> : undefined}
                style={{ backgroundColor: '#1677ff' }}
              />
              <div>
                <Title level={4} style={{ margin: 0 }}>
                  {user.fullName || 'Chưa cập nhật'}
                </Title>
                <Text type="secondary">{user.email}</Text>
                <div style={{ marginTop: 8 }}>
                  <StatusTag status={user.roleCode || ''} />
                  {user.isLocked ? (
                    <Tag color="red" style={{ marginLeft: 8 }}>Đã khóa</Tag>
                  ) : user.isActive ? (
                    <Tag color="green" style={{ marginLeft: 8 }}>Hoạt động</Tag>
                  ) : (
                    <Tag style={{ marginLeft: 8 }}>Không hoạt động</Tag>
                  )}
                </div>
              </div>
            </Space>

            <Divider />

            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="ID">{user.accountId}</Descriptions.Item>
              <Descriptions.Item label="Email">{user.email}</Descriptions.Item>
              <Descriptions.Item label="Họ tên">{user.fullName || '—'}</Descriptions.Item>
              <Descriptions.Item label="SĐT">{user.phone || '—'}</Descriptions.Item>
              <Descriptions.Item label="Vai trò">
                <StatusTag status={user.roleCode || ''} />
              </Descriptions.Item>
              <Descriptions.Item label="Xác minh email">
                {user.emailVerifiedAt ? (
                  <Tag color="green">Đã xác minh</Tag>
                ) : (
                  <Tag>Chưa xác minh</Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Đăng nhập cuối">
                <DateDisplay value={user.lastLoginAt} format="long" />
              </Descriptions.Item>
              <Descriptions.Item label="Ngày tạo">
                <DateDisplay value={user.createdAt} format="long" />
              </Descriptions.Item>
              <Descriptions.Item label="Cập nhật cuối" span={2}>
                <DateDisplay value={user.updatedAt} format="long" />
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* Permissions */}
          <Card title="Quyền được gán" style={{ marginTop: 24 }}>
            {permissions.length === 0 ? (
              <Empty description="Chưa có quyền nào được gán" />
            ) : (
              <List
                dataSource={permissions}
                renderItem={(item) => (
                  <List.Item>
                    <List.Item.Meta
                      title={
                        <Space>
                          <Tag color="blue">{item.method}</Tag>
                          <Text code>{item.endpointPattern}</Text>
                        </Space>
                      }
                      description={item.description || item.module}
                    />
                    {item.isEnabled ? (
                      <Tag color="green">Active</Tag>
                    ) : (
                      <Tag>Disabled</Tag>
                    )}
                  </List.Item>
                )}
              />
            )}
          </Card>
        </div>

        {/* ── Cột phải: Đổi role ── */}
        <div>
          <Card title="Đổi vai trò">
            <Space direction="vertical" style={{ width: '100%' }} size={16}>
              <div>
                <Text type="secondary">Vai trò hiện tại</Text>
                <div style={{ marginTop: 8 }}>
                  <StatusTag status={user.roleCode || ''} />
                </div>
              </div>

              <div>
                <Text type="secondary">Đổi sang</Text>
                <Select
                  style={{ width: '100%', marginTop: 8 }}
                  placeholder="Chọn vai trò"
                  value={selectedRole}
                  onChange={setSelectedRole}
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
              >
                Lưu vai trò
              </Button>

              <Divider style={{ margin: '8px 0' }} />

              <Text type="secondary" style={{ fontSize: 12 }}>
                ⚠️ Sau khi đổi vai trò, user cần đăng nhập lại để áp dụng
                quyền mới.
              </Text>
            </Space>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
};

export default UserDetailPage;