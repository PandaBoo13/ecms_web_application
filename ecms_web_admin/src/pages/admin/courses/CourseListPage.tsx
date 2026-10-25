import { useEffect, useState, useCallback, useMemo } from 'react';
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
import { useTranslation } from '@/hooks/useTranslation';

import { courseApi } from '@/services/api/courses';
import type { CourseResponse } from '@/services/types/course';

const { Text } = Typography;

const CourseListPage = () => {
  const { t } = useTranslation();
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



  // ══════════════════════════════════════════════════════════════
  // COLUMNS
  // ══════════════════════════════════════════════════════════════
  const columns: ColumnsType<CourseResponse> = useMemo(
    () => [
      {
        title: 'ID',
        dataIndex: 'id',
        key: 'id',
        width: 70,
        align: 'center',
      },
      {
        title: t('course.name'),
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
        title: t('common.status'),
        dataIndex: 'status',
        key: 'status',
        width: 130,
        align: 'center',
        render: (status: string) => <StatusTag status={status} />,
      },
      {
        title: t('student.title'),
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
        title: t('course.price'),
        dataIndex: 'price',
        key: 'price',
        width: 130,
        align: 'right',
        render: (price: number, record) => (
          <MoneyDisplay value={record.isFree ? 0 : price} strong />
        ),
      },
      {
        title: t('status.INSTRUCTOR'),
        dataIndex: 'teacherName',
        key: 'teacherName',
        width: 160,
        ellipsis: true,
        render: (v?: string) => v || <span>—</span>,
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
        width: 160,
        align: 'center',
        fixed: 'right',
        render: (_, record) => (
          <Space size={4}>
            <Tooltip title={t('common.details')}>
              <Button
                type="text"
                icon={<EyeOutlined />}
                onClick={() => navigate(`/admin/courses/${record.id}`)}
              />
            </Tooltip>
            <Tooltip title={t('common.edit')}>
              <Button
                type="text"
                icon={<EditOutlined />}
                onClick={() => navigate(`/admin/courses/${record.id}`)}
              />
            </Tooltip>
            <Popconfirm
              title={t('common.delete')}
              description={`Delete "${record.title}"?`}
              okText={t('common.delete')}
              cancelText={t('common.cancel')}
              okButtonProps={{ danger: true }}
              onConfirm={() => handleDelete(record.id)}
            >
              <Tooltip title={t('common.delete')}>
                <Button type="text" danger icon={<DeleteOutlined />} />
              </Tooltip>
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
        title={t('course.title')}
        subtitle={t('course.subtitle')}
        extra={
          <>
            <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
              {t('common.refresh')}
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/instructor/courses/create')}
            >
              {t('course.create')}
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
          searchPlaceholder={t('course.searchPlaceholder')}
          onRow={(record) => ({
            onDoubleClick: () => navigate(`/admin/courses/${record.id}`),
            style: { cursor: 'pointer' },
          })}
          extra={
            <Space>
              <Select
                placeholder={t('course.filterStatus')}
                allowClear
                style={{ width: 160 }}
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { value: 'DRAFT', label: t('status.DRAFT') },
                  { value: 'PENDING_REVIEW', label: t('status.PENDING_REVIEW') },
                  { value: 'PUBLISHED', label: t('status.PUBLISHED') },
                  { value: 'ARCHIVED', label: t('status.ARCHIVED') },
                  { value: 'CANCELLED', label: t('status.CANCELLED') },
                ]}
              />
              <Select
                placeholder={t('common.status')}
                allowClear
                style={{ width: 130 }}
                value={typeFilter}
                onChange={setTypeFilter}
                options={[
                  { value: 'ONLINE', label: t('status.ONLINE') },
                  { value: 'OFFLINE', label: t('status.OFFLINE') },
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