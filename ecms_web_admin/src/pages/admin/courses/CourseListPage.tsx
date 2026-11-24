// src/pages/admin/CourseListPage.tsx
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Space,
  Select,
  TreeSelect,
  Tooltip,
  Popconfirm,
  Image,
  Tag,
  Card,
  Row,
  Col,
} from 'antd';
import {
  PlusOutlined,
  EyeOutlined,
  ReloadOutlined,
  DeleteOutlined,
  BookOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import toast from 'react-hot-toast';

import PageContainer from '@/components/common/PageContainer';
import PageHeader from '@/components/common/PageHeader';
import DataTable from '@/components/common/DataTable';
import StatusTag from '@/components/common/StatusTag';
import DateDisplay from '@/components/common/DateDisplay';
import MoneyDisplay from '@/components/common/MoneyDisplay';
import StatsCard from '@/components/common/StatsCard';
import UserAvatar from '@/components/common/UserAvatar';
import { useTranslation } from '@/hooks/useTranslation';

import { courseApi, categoryApi } from '@/services/api/course';
import type { CourseResponse, CategoryResponse } from '@/services/types/course';

interface CourseStats {
  total: number;
  published: number;
  pending: number;
  draft: number;
}

interface CategoryTreeOption {
  title: string;
  value: number;
  key: number;
  children?: CategoryTreeOption[];
}

type CourseWithMeta = CourseResponse & {
  teacherId?: number | null;
  courseType?: 'ONLINE' | 'OFFLINE' | string;
};

const FALLBACK_THUMBNAIL =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="72" height="44" viewBox="0 0 72 44" fill="none">
      <rect width="72" height="44" rx="6" fill="#F1F5F9"/>
      <rect x="24" y="13" width="24" height="18" rx="3" stroke="#CBD5E1" stroke-width="1.5"/>
      <circle cx="30.5" cy="19.5" r="2" fill="#CBD5E1"/>
      <path d="M25.5 29L33 22.5L38.5 27L42 24L46.5 29" stroke="#CBD5E1" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
  );

const buildCategoryTree = (
  items: CategoryResponse[],
  parentId: number | null = null,
): CategoryTreeOption[] =>
  items
    .filter((item) => (item.parentId ?? null) === parentId)
    .map((item) => {
      const children = buildCategoryTree(items, item.id);
      return {
        title: item.name,
        value: item.id,
        key: item.id,
        ...(children.length > 0 ? { children } : {}),
      };
    });

const CourseListPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [data, setData] = useState<CourseResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [typeFilter, setTypeFilter] = useState<string | undefined>();
  const [categoryFilter, setCategoryFilter] = useState<number | undefined>();
  const [teacherFilter, setTeacherFilter] = useState<number | undefined>();

  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [teacherOptions, setTeacherOptions] = useState<
    { value: number; label: string }[]
  >([]);

  const [stats, setStats] = useState<CourseStats>({
    total: 0,
    published: 0,
    pending: 0,
    draft: 0,
  });

  // ══════════════════════════════════════════════════════════════
  // FETCH CATEGORIES
  // ══════════════════════════════════════════════════════════════
  useEffect(() => {
    categoryApi
      .list({ page: 0, size: 1000, sortBy: 'name', sortDir: 'asc' })
      .then((res) => {
        if (res?.content) {
          setCategories(res.content);
        }
      })
      .catch((err) => {
        console.error('❌ [CATEGORY] Load failed:', err);
        toast.error('Không thể tải danh sách danh mục');
      });
  }, []);

  // ══════════════════════════════════════════════════════════════
  // FETCH DANH SÁCH GIẢNG VIÊN CHO BỘ LỌC
  // ══════════════════════════════════════════════════════════════
  const fetchTeachers = useCallback(async () => {
    try {
      const res = await courseApi.search({ page: 0, size: 500 });
      const teacherMap = new Map<number, string>();

      (res?.content as CourseWithMeta[] | undefined)?.forEach((c) => {
        if (
          c.teacherId !== undefined &&
          c.teacherId !== null &&
          c.teacherName
        ) {
          teacherMap.set(c.teacherId, c.teacherName);
        }
      });

      const options = Array.from(teacherMap.entries())
        .map(([id, name]) => ({ value: id, label: name }))
        .sort((a, b) => a.label.localeCompare(b.label, 'vi'));

      setTeacherOptions(options);
    } catch (err) {
      console.warn('[TEACHERS] fetch failed:', err);
    }
  }, []);

  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  const categoryTreeData = useMemo(
    () => buildCategoryTree(categories, null),
    [categories],
  );

  // ══════════════════════════════════════════════════════════════
  // FETCH STATS
  // ══════════════════════════════════════════════════════════════
  const fetchStats = useCallback(async () => {
    try {
      const [allRes, publishedRes, pendingRes, draftRes] = await Promise.all([
        courseApi.search({ page: 0, size: 1 }),
        courseApi.search({ page: 0, size: 1, status: 'PUBLISHED' }),
        courseApi.search({ page: 0, size: 1, status: 'PENDING_REVIEW' }),
        courseApi.search({ page: 0, size: 1, status: 'DRAFT' }),
      ]);
      setStats({
        total: allRes.totalElements,
        published: publishedRes.totalElements,
        pending: pendingRes.totalElements,
        draft: draftRes.totalElements,
      });
    } catch (err) {
      console.warn('[STATS] fetch failed:', err);
    }
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
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.type = typeFilter;
      if (categoryFilter !== undefined && categoryFilter !== null) {
        params.categoryId = categoryFilter;
      }
      if (teacherFilter !== undefined && teacherFilter !== null) {
        params.teacherId = teacherFilter;
      }

      const res = await courseApi.search(params);

      setData(res.content);
      setTotal(res.totalElements);
    } catch (err) {
      console.error('❌ [COURSE-FETCH] Error:', err);
      const e = err as { message?: string };
      toast.error(e?.message || 'Không thể tải danh sách khóa học');
      setData([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [
    page,
    pageSize,
    keyword,
    statusFilter,
    typeFilter,
    categoryFilter,
    teacherFilter,
  ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // ══════════════════════════════════════════════════════════════
  // HANDLERS
  // ══════════════════════════════════════════════════════════════
  const handleKeywordChange = (v: string) => {
    setKeyword(v);
    setPage(0);
  };
  const handleStatusChange = (v: string | undefined) => {
    setStatusFilter(v);
    setPage(0);
  };
  const handleTypeChange = (v: string | undefined) => {
    setTypeFilter(v);
    setPage(0);
  };
  const handleCategoryChange = (v: number | undefined) => {
    setCategoryFilter(v);
    setPage(0);
  };
  const handleTeacherChange = (v: number | undefined) => {
    setTeacherFilter(v);
    setPage(0);
  };

  const handleRefresh = () => {
    fetchData();
    fetchStats();
    fetchTeachers();
    toast.success('Đã làm mới dữ liệu');
  };

  const handleDelete = useCallback(
    async (id: number) => {
      try {
        await courseApi.softDelete(id);
        toast.success('Đã xóa khóa học');
        fetchData();
        fetchStats();
      } catch (err) {
        const e = err as { message?: string };
        toast.error(e?.message || 'Xóa thất bại');
      }
    },
    [fetchData, fetchStats],
  );

  const handleResetFilters = () => {
    setKeyword('');
    setStatusFilter(undefined);
    setTypeFilter(undefined);
    setCategoryFilter(undefined);
    setTeacherFilter(undefined);
    setPage(0);
  };

  // ══════════════════════════════════════════════════════════════
  // COLUMNS
  // ══════════════════════════════════════════════════════════════
  const columns: ColumnsType<CourseResponse> = useMemo(
    () => [
      {
        title: 'ID',
        dataIndex: 'id',
        key: 'id',
        width: 72,
        align: 'center',
        render: (id: number) => (
          <span className="font-mono text-xs text-slate-400">#{id}</span>
        ),
      },
      {
        title: t('course.name'),
        key: 'course',
        width: 360,
        render: (_, record) => {
          const courseType = (record as CourseWithMeta).courseType;
          return (
            <div className="flex items-center gap-3 min-w-0">
              <Image
                src={record.thumbnailUrl || ''}
                alt={record.title}
                width={72}
                height={44}
                className="!object-cover !rounded-lg border border-slate-200/80 shrink-0"
                fallback={FALLBACK_THUMBNAIL}
                preview={false}
              />
              <div className="min-w-0 flex-1 flex flex-col gap-1">
                <span
                  onClick={() => navigate(`/admin/courses/${record.id}`)}
                  className="font-semibold text-[13.5px] text-slate-800 truncate cursor-pointer hover:text-blue-600 transition-colors"
                >
                  {record.title}
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {record.code && (
                    <Tag className="!m-0 !font-mono !text-[11px] !px-1.5 !rounded !bg-slate-50 !border-slate-200 !text-slate-600">
                      {record.code}
                    </Tag>
                  )}
                  {courseType && (
                    <Tag
                      color={courseType === 'OFFLINE' ? 'purple' : 'blue'}
                      className="!m-0 !text-[10.5px] !px-1.5 !rounded"
                    >
                      {courseType === 'OFFLINE' ? 'Offline' : 'Online'}
                    </Tag>
                  )}
                </div>
              </div>
            </div>
          );
        },
      },
      {
        title: t('common.status'),
        dataIndex: 'status',
        key: 'status',
        width: 140,
        align: 'center',
        render: (status: string) => <StatusTag status={status} />,
      },
      {
        title: t('student.title'),
        key: 'students',
        width: 115,
        align: 'center',
        render: (_, record) => (
          <span className="inline-flex items-center gap-1 text-[13px]">
            <TeamOutlined className="text-slate-400 text-xs" />
            <span className="font-semibold text-slate-800">
              {record.currentStudents}
            </span>
            {record.maxStudents ? (
              <span className="text-slate-400">/ {record.maxStudents}</span>
            ) : null}
          </span>
        ),
      },
      {
        title: t('course.price'),
        dataIndex: 'price',
        key: 'price',
        width: 135,
        align: 'right',
        render: (price: number, record) =>
          record.isFree ? (
            <Tag color="success" className="!m-0 !rounded-md !font-medium">
              Miễn phí
            </Tag>
          ) : (
            <MoneyDisplay value={price} strong />
          ),
      },
      {
        title: t('status.INSTRUCTOR'),
        dataIndex: 'teacherName',
        key: 'teacherName',
        width: 185,
        ellipsis: true,
        render: (v?: string) =>
          v ? (
            <UserAvatar name={v} size={24} showName />
          ) : (
            <span className="text-slate-300">—</span>
          ),
      },
      {
        title: t('common.createdAt'),
        dataIndex: 'createdAt',
        key: 'createdAt',
        width: 130,
        render: (v?: string) => <DateDisplay value={v} format="short" />,
      },
      {
        title: '',
        key: 'action',
        width: 88,
        align: 'center',
        fixed: 'right',
        render: (_, record) => (
          <Space size={2} onDoubleClick={(e) => e.stopPropagation()}>
            <Tooltip title={t('common.details')}>
              <Button
                type="text"
                size="small"
                icon={<EyeOutlined className="text-blue-600" />}
                onClick={() => navigate(`/admin/courses/${record.id}`)}
              />
            </Tooltip>
            <Popconfirm
              title={t('common.delete')}
              description={`Xóa khóa học "${record.title}"?`}
              okText={t('common.delete')}
              cancelText={t('common.cancel')}
              okButtonProps={{ danger: true }}
              onConfirm={() => handleDelete(record.id)}
            >
              <Tooltip title={t('common.delete')}>
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                />
              </Tooltip>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [t, navigate, handleDelete],
  );

  const hasActiveFilters = Boolean(
    keyword ||
      statusFilter ||
      typeFilter ||
      categoryFilter !== undefined ||
      teacherFilter !== undefined,
  );

  return (
    <PageContainer>
      <PageHeader
        title={t('course.title')}
        subtitle={t('course.subtitle')}
        extra={
          <Space size={8}>
            <Button
              icon={<ReloadOutlined spin={loading} />}
              onClick={handleRefresh}
              className="!rounded-lg"
            >
              {t('common.refresh')}
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/admin/courses/create')}
              className="!rounded-lg !font-medium"
            >
              {t('course.create')}
            </Button>
          </Space>
        }
      />

      <Row gutter={[16, 16]} className="mb-5">
        <Col xs={24} sm={12} lg={6}>
          <StatsCard
            title="Tổng số khóa học"
            value={stats.total}
            icon={<BookOutlined />}
            color="#2563eb"
            bgColor="#eff6ff"
            active={
              !statusFilter &&
              !typeFilter &&
              categoryFilter === undefined &&
              teacherFilter === undefined
            }
            onClick={handleResetFilters}
            tooltip="Nhấn để xem toàn bộ khóa học"
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
              handleStatusChange(
                statusFilter === 'PUBLISHED' ? undefined : 'PUBLISHED',
              )
            }
            tagText="PUBLISHED"
            tagColor="success"
            tooltip="Nhấn để lọc các khóa học đã xuất bản"
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
              handleStatusChange(
                statusFilter === 'PENDING_REVIEW'
                  ? undefined
                  : 'PENDING_REVIEW',
              )
            }
            tagText="PENDING"
            tagColor="warning"
            tooltip="Nhấn để lọc các khóa học đang chờ duyệt"
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
            onClick={() =>
              handleStatusChange(statusFilter === 'DRAFT' ? undefined : 'DRAFT')
            }
            tagText="DRAFT"
            tagColor="default"
            tooltip="Nhấn để lọc các khóa học đang ở trạng thái nháp"
          />
        </Col>
      </Row>

      <Card
        className="!rounded-xl border-slate-200/90 shadow-none"
        styles={{ body: { padding: '16px 20px' } }}
      >
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
          onSearch={handleKeywordChange}
          searchValue={keyword}
          searchPlaceholder="Tìm theo tên, mã khóa học hoặc giảng viên..."
          onRow={(record) => ({
            onDoubleClick: () => navigate(`/admin/courses/${record.id}`),
            className: 'cursor-pointer',
          })}
          extra={
            <Space wrap size={10}>
              <TreeSelect
                placeholder="Lọc theo danh mục"
                allowClear
                className="w-52"
                value={categoryFilter}
                onChange={handleCategoryChange}
                treeData={categoryTreeData}
                showSearch
                treeNodeFilterProp="title"
                treeDefaultExpandAll
                styles={{
                  popup: { root: { maxHeight: 400, overflow: 'auto' } },
                }}
              />

              <Select
                placeholder="Lọc theo giảng viên"
                allowClear
                showSearch
                optionFilterProp="label"
                className="w-48"
                value={teacherFilter}
                onChange={handleTeacherChange}
                options={teacherOptions}
              />

              <Select
                placeholder={t('course.filterStatus')}
                allowClear
                className="w-40"
                value={statusFilter}
                onChange={handleStatusChange}
                options={[
                  { value: 'DRAFT', label: t('status.DRAFT') },
                  { value: 'PENDING_REVIEW', label: t('status.PENDING_REVIEW') },
                  { value: 'PLANNED', label: t('status.PLANNED') },
                  { value: 'PUBLISHED', label: t('status.PUBLISHED') },
                  { value: 'ONGOING', label: t('status.ONGOING') },
                  { value: 'FINISHED', label: t('status.FINISHED') },
                  { value: 'CANCELLED', label: t('status.CANCELLED') },
                  { value: 'ARCHIVED', label: t('status.ARCHIVED') },
                ]}
              />

              <Select
                placeholder={t('course.type')}
                allowClear
                className="w-36"
                value={typeFilter}
                onChange={handleTypeChange}
                options={[
                  { value: 'ONLINE', label: t('status.ONLINE') },
                  { value: 'OFFLINE', label: t('status.OFFLINE') },
                ]}
              />

              {hasActiveFilters && (
                <Button onClick={handleResetFilters} className="!rounded-lg">
                  Xóa bộ lọc
                </Button>
              )}
            </Space>
          }
        />
      </Card>
    </PageContainer>
  );
};

export default CourseListPage;