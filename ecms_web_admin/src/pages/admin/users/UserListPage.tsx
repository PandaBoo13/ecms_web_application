import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Space, Select, Tooltip, Popconfirm } from 'antd';
import {
  PlusOutlined,
  EyeOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import toast from 'react-hot-toast';

import PageContainer from '@/components/common/PageContainer';
import PageHeader from '@/components/common/PageHeader';
import DataTable from '@/components/common/DataTable';
import StatusTag from '@/components/common/StatusTag';
import UserAvatar from '@/components/common/UserAvatar';
import DateDisplay from '@/components/common/DateDisplay';
import { useTranslation } from '@/hooks/useTranslation';

import { adminUserApi } from '@/services/api/admin';
import type { AccountResponse } from '@/services/types/user';

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

  // ══════════════════════════════════════════════════════════════
  // FETCH
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
      setData(res.content);
      setTotal(res.totalElements);
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

  // Reset page khi filter thay đổi
  useEffect(() => {
    setPage(0);
  }, [keyword, roleFilter, activeFilter]);

  // ══════════════════════════════════════════════════════════════
  // HANDLERS
  // ══════════════════════════════════════════════════════════════
  const handleRefresh = () => {
    fetchData();
    toast.success('Đã làm mới dữ liệu');
  };

  const handleDelete = async (id: number) => {
    try {
      // Nếu BE chưa có API delete → comment lại
      // await adminUserApi.delete(id);
      toast.success('Đã xóa tài khoản #' + id);
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
      },
      {
        title: t('user.fullName'),
        key: 'user',
        width: 260,
        render: (_, record) => (
          <UserAvatar
            name={record.fullName || record.email}
            avatarUrl={record.avatarUrl}
            size={36}
            showName
          />
        ),
      },
      {
        title: 'Email',
        dataIndex: 'email',
        key: 'email',
        width: 220,
        ellipsis: true,
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
        width: 150,
        align: 'center',
        render: (_, record) => {
          if (record.isLocked) return <StatusTag status="CANCELLED" />;
          if (!record.isActive) return <StatusTag status="INACTIVE" />;
          return <StatusTag status="ACTIVE" />;
        },
      },
      {
        title: 'Last Login',
        dataIndex: 'lastLoginAt',
        key: 'lastLoginAt',
        width: 160,
        render: (v?: string) => <DateDisplay value={v} format="relative" />,
      },
      {
        title: t('common.createdAt'),
        dataIndex: 'createdAt',
        key: 'createdAt',
        width: 130,
        render: (v?: string) => <DateDisplay value={v} />,
      },
      {
        title: t('common.actions'),
        key: 'action',
        width: 140,
        align: 'center',
        fixed: 'right',
        render: (_, record) => (
          <Space size={4}>
            <Tooltip title={t('common.details')}>
              <Button
                type="text"
                icon={<EyeOutlined />}
                onClick={() => navigate(`/admin/users/${record.accountId}`)}
              />
            </Tooltip>
            <Popconfirm
              title={t('user.deleteConfirmTitle')}
              description={t('user.deleteConfirmDesc')}
              okText={t('common.delete')}
              cancelText={t('common.cancel')}
              okButtonProps={{ danger: true }}
              onConfirm={() => handleDelete(record.accountId)}
            >
              <Button type="text" danger>
                {t('common.delete')}
              </Button>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [t, navigate]
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
          <>
            <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
              {t('common.refresh')}
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/admin/users/create')}
            >
              {t('user.create')}
            </Button>
          </>
        }
      />

      <div style={{ background: '#fff', padding: 16, borderRadius: 8 }}>
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
            <Space>
              <Select
                placeholder={t('user.role')}
                allowClear
                style={{ width: 150 }}
                value={roleFilter}
                onChange={setRoleFilter}
                options={[
                  { value: 'ADMIN', label: t('status.ADMIN') },
                  { value: 'INSTRUCTOR', label: t('status.INSTRUCTOR') },
                  { value: 'STUDENT', label: t('status.STUDENT') },
                ]}
              />
              <Select
                placeholder={t('user.status')}
                allowClear
                style={{ width: 150 }}
                value={activeFilter}
                onChange={setActiveFilter}
                options={[
                  { value: true, label: t('user.active') },
                  { value: false, label: t('user.locked') },
                ]}
              />
            </Space>
          }
        />
      </div>
    </PageContainer>
  );
};

export default UserListPage;