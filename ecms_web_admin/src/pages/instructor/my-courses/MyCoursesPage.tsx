import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Space,
  Select,
  Tooltip,
  Popconfirm,
  Image,
  Typography,
  Tag,
  TreeSelect,
  Row,
  Col,
  Tabs,
  DatePicker,
  Table,
  Card,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined,
  EyeOutlined,
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
  SendOutlined,
  BookOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import toast from 'react-hot-toast';

import PageContainer from '@/components/common/PageContainer';
import PageHeader from '@/components/common/PageHeader';
import DataTable from '@/components/common/DataTable';
import StatusTag from '@/components/common/StatusTag';
import DateDisplay from '@/components/common/DateDisplay';
import MoneyDisplay from '@/components/common/MoneyDisplay';
import StatsCard from '@/components/common/StatsCard';

import { courseApi, categoryApi, sessionApi } from '@/services/api/course';
import { useAuth } from '@/hooks/useAuth';
import type { CourseResponse, CategoryResponse } from '@/services/types/course';

const { Text } = Typography;
const { RangePicker } = DatePicker;

interface CourseStats {
  total: number;
  published: number;
  pending: number;
  draft: number;
}

// ══════════════════════════════════════════════════════════════
// COMPONENT: LỊCH GIẢNG DẠY (TAB 2)
// ══════════════════════════════════════════════════════════════
const MyScheduleTab = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().subtract(7, 'day'),
    dayjs().add(30, 'day'),
  ]);
  const [statusFilter, setStatusFilter] = useState<string>();

  const fetchSchedule = useCallback(async () => {
    setLoading(true);
    try {
      // Gọi API lấy lịch dạy (Yêu cầu đã thêm getMySchedule vào sessionApi)
      const res = await sessionApi.getMySchedule({
        from: dateRange[0].format('YYYY-MM-DD'),
        to: dateRange[1].format('YYYY-MM-DD'),
      });
      setData(res || []);
    } catch (error) {
      toast.error('Không thể tải lịch giảng dạy');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  // Lọc và Sắp xếp theo thời gian
  const filteredData = useMemo(() => {
    let result = [...data];
    if (statusFilter) {
      result = result.filter((item) => item.status === statusFilter);
    }
    return result.sort((a, b) => dayjs(a.startTime).valueOf() - dayjs(b.startTime).valueOf());
  }, [data, statusFilter]);

  const columns: ColumnsType<any> = [
    {
      title: 'Thời gian',
      key: 'time',
      width: 220,
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <span style={{ fontWeight: 600, color: '#2563eb' }}>
            {dayjs(record.startTime).format('DD/MM/YYYY')}
          </span>
          <span style={{ fontSize: 13, color: '#475569' }}>
            <ClockCircleOutlined className="mr-1" />
            {dayjs(record.startTime).format('HH:mm')} - {dayjs(record.endTime).format('HH:mm')}
          </span>
        </Space>
      ),
    },
    {
      title: 'Khóa học',
      key: 'course',
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <span style={{ fontWeight: 500 }}>{record.courseTitle || record.title || '—'}</span>
          <span style={{ fontSize: 12, color: '#8c8c8c' }}>{record.courseCode || ''}</span>
        </Space>
      ),
    },
    {
      title: 'Vai trò',
      key: 'role',
      width: 120,
      render: (_, record) => {
        // Backend có thể trả về effectiveTeacherId hoặc substituteTeacherId
        // Nếu id hiện tại trùng với GV chính -> GV chính, ngược lại -> Dạy thay / Trợ giảng
        const isSubstitute = Boolean(record.substituteTeacherId);
        return isSubstitute ? (
          <Tag color="orange">Dạy thay</Tag>
        ) : (
          <Tag color="blue">GV chính</Tag>
        );
      },
    },
    {
      title: 'Phòng học',
      dataIndex: 'roomName',
      key: 'roomName',
      width: 150,
      render: (v) => v || <span className="text-slate-400 italic">Chưa xếp</span>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      align: 'center',
      render: (status) => <StatusTag status={status} />,
    },
  ];

  return (
    <Card variant="borderless" style={{ borderRadius: 8 }}>
      <div style={{ marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <RangePicker
          value={dateRange}
          onChange={(dates) => {
            if (dates && dates[0] && dates[1]) setDateRange([dates[0], dates[1]]);
          }}
          format="DD/MM/YYYY"
          allowClear={false}
        />
        <Select
          placeholder="Trạng thái buổi học"
          allowClear
          style={{ width: 180 }}
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: 'SCHEDULED', label: 'Sắp diễn ra' },
            { value: 'ONGOING', label: 'Đang diễn ra' },
            { value: 'COMPLETED', label: 'Đã dạy xong' },
            { value: 'CANCELLED', label: 'Đã hủy' },
          ]}
        />
        <Button icon={<ReloadOutlined />} onClick={fetchSchedule}>
          Làm mới
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={filteredData}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10, showSizeChanger: true }}
        locale={{ emptyText: 'Không có buổi giảng dạy nào trong khoảng thời gian này' }}
      />
    </Card>
  );
};


// ══════════════════════════════════════════════════════════════
// MAIN PAGE: QUẢN LÝ KHÓA HỌC (TAB 1)
// ══════════════════════════════════════════════════════════════
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
  const [typeFilter, setTypeFilter] = useState<string | undefined>();
  const [categoryFilter, setCategoryFilter] = useState<number | undefined>();

  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [stats, setStats] = useState<CourseStats>({
    total: 0,
    published: 0,
    pending: 0,
    draft: 0,
  });

  // Fetch Categories
  useEffect(() => {
    categoryApi
      .list({ page: 0, size: 1000, sortBy: 'name', sortDir: 'asc' })
      .then((res) => setCategories(res.content || []))
      .catch((err) => console.error('❌ [CATEGORY] Load failed:', err));
  }, []);

  // Build Tree cho TreeSelect
  const categoryTreeData = useMemo(() => {
    const buildTree = (items: CategoryResponse[], parentId: number | null = null): any[] =>
      items
        .filter((item) => (item.parentId ?? null) === parentId)
        .map((item) => ({
          title: item.name,
          value: item.id,
          key: item.id,
          children: buildTree(items, item.id),
        }));
    return buildTree(categories);
  }, [categories]);

  // Fetch Stats
  const fetchStats = useCallback(async () => {
    if (!user?.accountId) return;
    try {
      const base = { page: 0, size: 1, teacherId: user.accountId };
      const [allRes, publishedRes, pendingRes, draftRes] = await Promise.all([
        courseApi.search(base),
        courseApi.search({ ...base, status: 'PUBLISHED' }),
        courseApi.search({ ...base, status: 'PENDING_REVIEW' }),
        courseApi.search({ ...base, status: 'DRAFT' }),
      ]);
      setStats({
        total: allRes.totalElements,
        published: publishedRes.totalElements,
        pending: pendingRes.totalElements,
        draft: draftRes.totalElements,
      });
    } catch (err) {
      console.warn('[MyCourses] fetch stats failed:', err);
    }
  }, [user?.accountId]);

  // Fetch Data
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
      if (typeFilter) params.type = typeFilter;
      if (categoryFilter !== undefined && categoryFilter !== null) {
        params.categoryId = categoryFilter;
      }

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
  }, [page, pageSize, keyword, statusFilter, typeFilter, categoryFilter, user?.accountId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    setPage(0);
  }, [keyword, statusFilter, typeFilter, categoryFilter]);

  // Handlers
  const handleDelete = async (id: number) => {
    try {
      await courseApi.softDelete(id);
      toast.success('Đã xóa khóa học');
      fetchData();
      fetchStats();
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
      fetchStats();
    } catch (err) {
      const e = err as { message?: string };
      toast.error(e?.message || 'Gửi duyệt thất bại');
    }
  };

  const handleRefresh = () => {
    fetchData();
    fetchStats();
    toast.success('Đã làm mới dữ liệu');
  };

  const handleResetFilters = () => {
    setKeyword('');
    setStatusFilter(undefined);
    setTypeFilter(undefined);
    setCategoryFilter(undefined);
    setPage(0);
  };

  const goToDetail = (id: number) => {
    navigate(`/instructor/courses/${id}/edit`);
  };

  // Columns Khóa học
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
                onClick={(e) => {
                  e.stopPropagation();
                  handleSubmitReview(record.id);
                }}
              />
            </Tooltip>
          )}
          <Tooltip title="Chỉnh sửa / Quản lý">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                goToDetail(record.id);
              }}
            />
          </Tooltip>
          <Tooltip title="Xem chi tiết">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                goToDetail(record.id);
              }}
            />
          </Tooltip>
          <Popconfirm
            title="Xóa khóa học"
            description={`Bạn có chắc muốn xóa "${record.title}"?`}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
            onConfirm={(e) => {
              e?.stopPropagation();
              handleDelete(record.id);
            }}
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

  const hasActiveFilters = Boolean(
    keyword || statusFilter || typeFilter || categoryFilter !== undefined,
  );

  // Render
  return (
    <PageContainer>
      <PageHeader
        title="Không gian làm việc Giảng viên"
        subtitle="Quản lý khóa học và lịch giảng dạy của bạn"
      />

      <Tabs
        defaultActiveKey="courses"
        size="large"
        items={[
          {
            key: 'courses',
            label: (
              <span>
                <BookOutlined /> Khóa học của tôi
              </span>
            ),
            children: (
              <div style={{ marginTop: 8 }}>
                {/* Stats cards */}
                <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
                  <Col xs={24} sm={12} lg={6}>
                    <StatsCard
                      title="Tổng số khóa học"
                      value={stats.total}
                      icon={<BookOutlined />}
                      color="#2563eb"
                      bgColor="#eff6ff"
                      active={!statusFilter && !typeFilter && categoryFilter === undefined}
                      onClick={handleResetFilters}
                      tooltip="Nhấn để xem toàn bộ khóa học của bạn"
                    />
                  </Col>
                  <Col xs={24} sm={12} lg={6}>
                    <StatsCard
                      title="Đang xuất bản"
                      value={stats.published}
                      icon={<CheckCircleOutlined />}
                      color="#10b981"
                      bgColor="#ecfdf5"
                      active={statusFilter === 'PUBLISHED'}
                      onClick={() =>
                        setStatusFilter(statusFilter === 'PUBLISHED' ? undefined : 'PUBLISHED')
                      }
                      tagText="PUBLISHED"
                      tagColor="success"
                      tooltip="Nhấn để lọc khóa học đã xuất bản"
                    />
                  </Col>
                  <Col xs={24} sm={12} lg={6}>
                    <StatsCard
                      title="Chờ duyệt"
                      value={stats.pending}
                      icon={<ClockCircleOutlined />}
                      color="#f59e0b"
                      bgColor="#fffbeb"
                      active={statusFilter === 'PENDING_REVIEW'}
                      onClick={() =>
                        setStatusFilter(statusFilter === 'PENDING_REVIEW' ? undefined : 'PENDING_REVIEW')
                      }
                      tagText="PENDING"
                      tagColor="warning"
                      tooltip="Nhấn để lọc khóa học đang chờ duyệt"
                    />
                  </Col>
                  <Col xs={24} sm={12} lg={6}>
                    <StatsCard
                      title="Bản nháp"
                      value={stats.draft}
                      icon={<FileTextOutlined />}
                      color="#64748b"
                      bgColor="#f8fafc"
                      active={statusFilter === 'DRAFT'}
                      onClick={() => setStatusFilter(statusFilter === 'DRAFT' ? undefined : 'DRAFT')}
                      tagText="DRAFT"
                      tagColor="default"
                      tooltip="Nhấn để lọc khóa học đang ở trạng thái nháp"
                    />
                  </Col>
                </Row>

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
                    searchValue={keyword}
                    searchPlaceholder="Tìm theo tiêu đề, mã khóa học..."
                    onRow={(record) => ({
                      onDoubleClick: () => goToDetail(record.id),
                      style: { cursor: 'pointer' },
                    })}
                    headerActions={
                      <Space wrap>
                        <TreeSelect
                          placeholder="Lọc theo danh mục"
                          allowClear
                          style={{ width: 220 }}
                          value={categoryFilter}
                          onChange={setCategoryFilter}
                          treeData={categoryTreeData}
                          showSearch
                          treeNodeFilterProp="title"
                          treeDefaultExpandAll
                          dropdownStyle={{ maxHeight: 400, overflow: 'auto' }}
                        />
                        <Select
                          placeholder="Trạng thái"
                          allowClear
                          style={{ width: 170 }}
                          value={statusFilter}
                          onChange={setStatusFilter}
                          options={[
                            { value: 'DRAFT', label: 'Nháp (DRAFT)' },
                            { value: 'PENDING_REVIEW', label: 'Chờ duyệt' },
                            { value: 'PLANNED', label: 'Đã lên kế hoạch' },
                            { value: 'PUBLISHED', label: 'Đã xuất bản' },
                            { value: 'ONGOING', label: 'Đang diễn ra' },
                            { value: 'FINISHED', label: 'Đã kết thúc' },
                            { value: 'CANCELLED', label: 'Đã hủy' },
                            { value: 'ARCHIVED', label: 'Lưu trữ' },
                          ]}
                        />
                        <Select
                          placeholder="Loại khóa"
                          allowClear
                          style={{ width: 130 }}
                          value={typeFilter}
                          onChange={setTypeFilter}
                          options={[
                            { value: 'ONLINE', label: 'Online' },
                            { value: 'OFFLINE', label: 'Offline' },
                          ]}
                        />
                        {hasActiveFilters && (
                          <Button onClick={handleResetFilters}>Xóa bộ lọc</Button>
                        )}
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
                      </Space>
                    }
                  />
                </div>
              </div>
            ),
          },
          {
            key: 'schedule',
            label: (
              <span>
                <CalendarOutlined /> Lịch giảng dạy
              </span>
            ),
            children: <MyScheduleTab />,
          },
        ]}
      />
    </PageContainer>
  );
};

export default MyCoursesPage;