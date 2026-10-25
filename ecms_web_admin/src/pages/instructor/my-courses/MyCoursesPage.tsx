import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Space, Select, Tooltip, Popconfirm, Image, Typography, Tag } from 'antd';
import {
  PlusOutlined, EyeOutlined, ReloadOutlined,
  EditOutlined, DeleteOutlined, SendOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import toast from 'react-hot-toast';

import PageContainer from '@/components/common/PageContainer';
import PageHeader from '@/components/common/PageHeader';
import DataTable from '@/components/common/DataTable';
import StatusTag from '@/components/common/StatusTag';
import DateDisplay from '@/components/common/DateDisplay';
import MoneyDisplay from '@/components/common/MoneyDisplay';

import { courseApi } from '@/services/api/courses';
import { useAuth } from '@/hooks/useAuth';
import type { CourseResponse } from '@/services/types/course';

const { Text } = Typography;

const MyCoursesPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [data, setData] = useState<CourseResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();

  // ══════════════════════════════════════════════════════════════
  // FETCH
  // ══════════════════════════════════════════════════════════════
  const fetchData = useCallback(async () => {
    if (!user?.accountId) return;
    setLoading(true);
    try {
      const params: Record<string, unknown> = {
        page,
        size: pageSize,
        sortBy: 'createdAt',
        sortDir: 'desc',
        teacherId: user.accountId,
      };
      if (keyword.trim()) params.search = keyword.trim();
      if (statusFilter) params.status = statusFilter;

      const res = await courseApi.search(params);
      setData(res.content);
      setTotal(res.totalElements);
    } catch (err) {
      const e = err as { message?: string };
      toast.error(e?.message || 'Không thể tải danh sách');
      setData([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, keyword, statusFilter, user?.accountId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setPage(0);
  }, [keyword, statusFilter]);

  // ══════════════════════════════════════════════════════════════
  // HANDLERS
  // ══════════════════════════════════════════════════════════════
  const handleDelete = async (id: number) => {
    try {
      await courseApi.softDelete(id);
      toast.success('Đã xóa khóa học');
      fetchData();
    } catch (err) {
      const e = err as { message?: string };
      toast.error(e?.message || 'Xóa thất bại');
    }
  };

  const handleSubmitReview = async (id: number) => {
    try {
      await courseApi.submitReview(id);
      toast.success('Đã gửi duyệt khóa học');
      fetchData();
    } catch (err) {
      const e = err as { message?: string };
      toast.error(e?.message || 'Gửi duyệt thất bại');
    }
  };

  const goToDetail = (id: number) => {
    navigate(`/instructor/courses/${id}/edit`);
  };

  // ══════════════════════════════════════════════════════════════
  // COLUMNS
  // ══════════════════════════════════════════════════════════════
  const columns: ColumnsType<CourseResponse> = [
    {
      title: 'Khóa học',
      key: 'course',
      width: 340,
      render: (_, record) => (
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Image
            src={record.thumbnailUrl || ''}
            alt={record.title}
            width={64}
            height={40}
            style={{ objectFit: 'cover', borderRadius: 4 }}
            fallback="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA2NCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNjQiIGhlaWdodD0iNDAiIGZpbGw9IiNmNWY1ZjUiLz48dGV4dCB4PSIzMiIgeT0iMjQiIGZvbnQtc2l6ZT0iMTAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM5OTkiPk5vIGltZzwvdGV4dD48L3N2Zz4="
            preview={false}
          />
          <div style={{ minWidth: 0, flex: 1 }}>
            <Text strong ellipsis style={{ display: 'block' }}>
              {record.title}
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.code}
            </Text>
          </div>
        </div>
      ),
    },
    {
      title: 'Loại',
      dataIndex: 'courseType',
      key: 'courseType',
      width: 100,
      align: 'center',
      render: (type: string) => <StatusTag status={type} />,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      align: 'center',
      render: (status: string) => <StatusTag status={status} />,
    },
    {
      title: 'Học viên',
      key: 'students',
      width: 100,
      align: 'center',
      render: (_, record) => <Tag color="blue">{record.currentStudents}</Tag>,
    },
    {
      title: 'Giá',
      dataIndex: 'price',
      key: 'price',
      width: 120,
      align: 'right',
      render: (price: number, record) => (
        <MoneyDisplay value={record.isFree ? 0 : price} strong />
      ),
    },
    {
      title: 'Cập nhật',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 130,
      render: (v?: string) => <DateDisplay value={v} format="relative" />,
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 180,
      align: 'center',
      fixed: 'right',
      render: (_, record) => (
        <Space size={4}>
          {record.status === 'DRAFT' && (
            <Tooltip title="Gửi duyệt">
              <Button
                type="text"
                icon={<SendOutlined style={{ color: '#1890ff' }} />}
                onClick={(e) => { e.stopPropagation(); handleSubmitReview(record.id); }}
              />
            </Tooltip>
          )}
          <Tooltip title="Chỉnh sửa / Quản lý">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={(e) => { e.stopPropagation(); goToDetail(record.id); }}
            />
          </Tooltip>
          <Tooltip title="Xem chi tiết">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={(e) => { e.stopPropagation(); goToDetail(record.id); }}
            />
          </Tooltip>
          <Popconfirm
            title="Xóa khóa học"
            description={`Bạn có chắc muốn xóa "${record.title}"?`}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
            onConfirm={(e) => { e?.stopPropagation(); handleDelete(record.id); }}
            disabled={record.status !== 'DRAFT' && record.status !== 'ARCHIVED'}
          >
            <Tooltip
              title={
                record.status !== 'DRAFT' && record.status !== 'ARCHIVED'
                  ? 'Chỉ xóa được DRAFT hoặc ARCHIVED'
                  : 'Xóa'
              }
            >
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                disabled={record.status !== 'DRAFT' && record.status !== 'ARCHIVED'}
                onClick={(e) => e.stopPropagation()}
              />
            </Tooltip>
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
        title="Khóa học của tôi"
        subtitle={`Tổng ${total} khóa học bạn phụ trách`}
        extra={
          <>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                fetchData();
                toast.success('Đã làm mới');
              }}
            >
              Làm mới
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/instructor/courses/create')}
            >
              Tạo khóa học
            </Button>
          </>
        }
      />

      <div style={{ background: '#fff', padding: 16, borderRadius: 8 }}>
        <DataTable<CourseResponse>
          columns={columns}
          dataSource={data}
          loading={loading}
          rowKey="id"
          total={total}
          page={page}
          pageSize={pageSize}
          onPageChange={(p, ps) => {
            setPage(p);
            setPageSize(ps);
          }}
          onSearch={(v) => setKeyword(v)}
          searchPlaceholder="Tìm theo tiêu đề, mã khóa học..."
          onRow={(record) => ({
            onDoubleClick: () => goToDetail(record.id),
            style: { cursor: 'pointer' },
          })}
          extra={
            <Select
              placeholder="Trạng thái"
              allowClear
              style={{ width: 170 }}
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: 'DRAFT', label: 'Nháp' },
                { value: 'PENDING_REVIEW', label: 'Chờ duyệt' },
                { value: 'PUBLISHED', label: 'Đã xuất bản' },
                { value: 'ARCHIVED', label: 'Lưu trữ' },
                { value: 'CANCELLED', label: 'Đã hủy' },
              ]}
            />
          }
        />
      </div>
    </PageContainer>
  );
};

export default MyCoursesPage;