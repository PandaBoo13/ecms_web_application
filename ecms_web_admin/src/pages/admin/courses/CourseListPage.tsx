import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Space, Select, Tooltip, Popconfirm, Image, Typography } from 'antd';
import {
  PlusOutlined,
  EyeOutlined,
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
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
import type { CourseResponse } from '@/services/types/course';

const { Text } = Typography;

const CourseListPage = () => {
  const navigate = useNavigate();

  // ══════════════════════════════════════════════════════════════
  // STATE
  // ══════════════════════════════════════════════════════════════
  const [data, setData] = useState<CourseResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [typeFilter, setTypeFilter] = useState<string | undefined>();

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
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.type = typeFilter;

      const res = await courseApi.search(params);
      setData(res.content);
      setTotal(res.totalElements);
    } catch (err) {
      const e = err as { message?: string };
      toast.error(e?.message || 'Không thể tải danh sách khóa học');
      setData([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, keyword, statusFilter, typeFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset page khi filter thay đổi
  useEffect(() => {
    setPage(0);
  }, [keyword, statusFilter, typeFilter]);

  // ══════════════════════════════════════════════════════════════
  // HANDLERS
  // ══════════════════════════════════════════════════════════════
  const handleRefresh = () => {
    fetchData();
    toast.success('Đã làm mới dữ liệu');
  };

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
      toast.success('Đã gửi duyệt');
      fetchData();
    } catch (err) {
      const e = err as { message?: string };
      toast.error(e?.message || 'Gửi duyệt thất bại');
    }
  };

  // ══════════════════════════════════════════════════════════════
  // COLUMNS
  // ══════════════════════════════════════════════════════════════
  const columns: ColumnsType<CourseResponse> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 70,
      align: 'center',
    },
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
      width: 110,
      align: 'center',
      render: (_, record) => (
        <span>
          <Text strong>{record.currentStudents}</Text>
          {record.maxStudents ? ` / ${record.maxStudents}` : ''}
        </span>
      ),
    },
    {
      title: 'Giá',
      dataIndex: 'price',
      key: 'price',
      width: 130,
      align: 'right',
      render: (price: number, record) => (
        <MoneyDisplay value={record.isFree ? 0 : price} strong />
      ),
    },
    {
      title: 'Giảng viên',
      dataIndex: 'teacherName',
      key: 'teacherName',
      width: 160,
      ellipsis: true,
      render: (v?: string) => v || <span>—</span>,
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
      width: 160,
      align: 'center',
      fixed: 'right',
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="Xem chi tiết">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => navigate(`/admin/courses/${record.id}`)}
            />
          </Tooltip>
          <Tooltip title="Chỉnh sửa">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => navigate(`/admin/courses/${record.id}`)}
            />
          </Tooltip>
          <Popconfirm
            title="Xóa khóa học"
            description={`Bạn có chắc muốn xóa "${record.title}"?`}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDelete(record.id)}
          >
            <Tooltip title="Xóa">
              <Button type="text" danger icon={<DeleteOutlined />} />
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
        title="Quản lý khóa học"
        subtitle={`Tổng ${total} khóa học trong hệ thống`}
        extra={
          <>
            <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
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
          extra={
            <Space>
              <Select
                placeholder="Trạng thái"
                allowClear
                style={{ width: 160 }}
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
              <Select
                placeholder="Loại"
                allowClear
                style={{ width: 130 }}
                value={typeFilter}
                onChange={setTypeFilter}
                options={[
                  { value: 'ONLINE', label: 'Online' },
                  { value: 'OFFLINE', label: 'Offline' },
                ]}
              />
            </Space>
          }
        />
      </div>
    </PageContainer>
  );
};

export default CourseListPage;