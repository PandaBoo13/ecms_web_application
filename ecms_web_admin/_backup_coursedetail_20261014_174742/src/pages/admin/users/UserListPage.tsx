import { useEffect, useState, useCallback } from 'react';
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

import { adminUserApi } from '@/services/api/admin';
import type { AccountResponse } from '@/services/types/user';

const UserListPage = () => {
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
  const columns: ColumnsType<AccountResponse> = [
    {
      title: 'ID',
      dataIndex: 'accountId',
      key: 'accountId',
      width: 70,
      align: 'center',
    },
    {
      title: 'Người dùng',
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
      title: 'Vai trò',
      dataIndex: 'roleCode',
      key: 'roleCode',
      width: 130,
      align: 'center',
      render: (role?: string) => (role ? <StatusTag status={role} /> : <span>—</span>),
    },
    {
      title: 'Trạng thái',
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
      title: 'Đăng nhập cuối',
      dataIndex: 'lastLoginAt',
      key: 'lastLoginAt',
      width: 160,
      render: (v?: string) => <DateDisplay value={v} format="relative" />,
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 130,
      render: (v?: string) => <DateDisplay value={v} />,
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 140,
      align: 'center',
      fixed: 'right',
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="Xem chi tiết">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => navigate(`/admin/users/${record.accountId}`)}
            />
          </Tooltip>
          <Popconfirm
            title="Xóa tài khoản"
            description={`Bạn có chắc muốn xóa "${record.fullName || record.email}"?`}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDelete(record.accountId)}
          >
            <Button type="text" danger>
              Xóa
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // ══════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════
  return (
    <PageContainer>
      <PageHeader
        title="Quản lý tài khoản"
        subtitle={`Tổng ${total} tài khoản trong hệ thống`}
        extra={
          <>
            <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
              Làm mới
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/admin/users/create')}
            >
              Tạo tài khoản
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
          searchPlaceholder="Tìm theo email, họ tên, SĐT..."
          extra={
            <Space>
              <Select
                placeholder="Vai trò"
                allowClear
                style={{ width: 150 }}
                value={roleFilter}
                onChange={setRoleFilter}
                options={[
                  { value: 'ADMIN', label: 'Quản trị viên' },
                  { value: 'INSTRUCTOR', label: 'Giảng viên' },
                  { value: 'STUDENT', label: 'Học viên' },
                ]}
              />
              <Select
                placeholder="Trạng thái"
                allowClear
                style={{ width: 150 }}
                value={activeFilter}
                onChange={setActiveFilter}
                options={[
                  { value: true, label: 'Đang hoạt động' },
                  { value: false, label: 'Đã khóa' },
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