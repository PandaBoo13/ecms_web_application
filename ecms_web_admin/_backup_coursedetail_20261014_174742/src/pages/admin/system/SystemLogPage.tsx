import { useEffect, useState, useCallback } from 'react';
import { Space, Select, Tag, Typography, Tooltip, Modal, Button } from 'antd';
import { EyeOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import toast from 'react-hot-toast';

import PageContainer from '@/components/common/PageContainer';
import PageHeader from '@/components/common/PageHeader';
import DataTable from '@/components/common/DataTable';
import DateDisplay from '@/components/common/DateDisplay';

import { auditLogApi } from '@/services/api/admin';
import type { AuditLogResponse } from '@/services/types/admin';

const { Text } = Typography;

const ENTITY_TYPES = [
  'COURSE', 'RESOURCE', 'SESSION', 'QUESTION', 'ROOM', 'CATEGORY',
  'ACCOUNT', 'ROLE', 'PERMISSION',
];

const ACTIONS = [
  'CREATE', 'UPDATE', 'DELETE', 'SOFT_DELETE', 'HARD_DELETE',
  'APPROVE', 'REJECT', 'CANCEL', 'ARCHIVE', 'SUBMIT_REVIEW', 'COPY',
];

const SystemLogPage = () => {
  const [data, setData] = useState<AuditLogResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [entityTypeFilter, setEntityTypeFilter] = useState<string | undefined>();
  const [actionFilter, setActionFilter] = useState<string | undefined>();
  const [detailLog, setDetailLog] = useState<AuditLogResponse | null>(null);

  // ══════════════════════════════════════════════════════════════
  // FETCH
  // ══════════════════════════════════════════════════════════════
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, size: pageSize };
      if (entityTypeFilter) params.entityType = entityTypeFilter;
      if (actionFilter) params.action = actionFilter;

      const res = await auditLogApi.search(params);
      setData(res.content);
      setTotal(res.totalElements);
    } catch (err) {
      const e = err as { message?: string };
      toast.error(e?.message || 'Không thể tải nhật ký');
      setData([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, entityTypeFilter, actionFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setPage(0);
  }, [entityTypeFilter, actionFilter]);

  // ══════════════════════════════════════════════════════════════
  // ACTION COLOR
  // ══════════════════════════════════════════════════════════════
  const actionColor = (action: string): string => {
    if (action.includes('DELETE') || action.includes('CANCEL') || action.includes('REJECT'))
      return 'red';
    if (action.includes('CREATE') || action.includes('APPROVE')) return 'green';
    if (action.includes('UPDATE') || action.includes('SUBMIT')) return 'blue';
    return 'default';
  };

  // ══════════════════════════════════════════════════════════════
  // COLUMNS
  // ══════════════════════════════════════════════════════════════
  const columns: ColumnsType<AuditLogResponse> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      align: 'center',
    },
    {
      title: 'Hành động',
      dataIndex: 'action',
      key: 'action',
      width: 150,
      render: (action: string) => (
        <Tag color={actionColor(action)}>{action}</Tag>
      ),
    },
    {
      title: 'Đối tượng',
      key: 'entity',
      width: 180,
      render: (_, record) => (
        <Space size={4}>
          <Tag color="blue">{record.entityType}</Tag>
          {record.entityId && <Text code>#{record.entityId}</Text>}
        </Space>
      ),
    },
    {
      title: 'Người thực hiện',
      dataIndex: 'actorId',
      key: 'actorId',
      width: 140,
      render: (id: number) => <Text>Account #{id}</Text>,
    },
    {
      title: 'IP',
      dataIndex: 'ipAddress',
      key: 'ipAddress',
      width: 140,
      render: (ip?: string) => <Text code>{ip || '—'}</Text>,
    },
    {
      title: 'Thời gian',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (v: string) => <DateDisplay value={v} format="long" />,
    },
    {
      title: 'Chi tiết',
      key: 'detail',
      width: 100,
      align: 'center',
      fixed: 'right',
      render: (_, record) => (
        <Tooltip title="Xem chi tiết">
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => setDetailLog(record)}
          />
        </Tooltip>
      ),
    },
  ];

  // ══════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════
  return (
    <PageContainer>
      <PageHeader
        title="Nhật ký hệ thống"
        subtitle={`Tổng ${total} bản ghi`}
        extra={
          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              fetchData();
              toast.success('Đã làm mới');
            }}
          >
            Làm mới
          </Button>
        }
      />

      <div style={{ background: '#fff', padding: 16, borderRadius: 8 }}>
        <DataTable<AuditLogResponse>
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
          showSearch={false}
          extra={
            <Space>
              <Select
                placeholder="Đối tượng"
                allowClear
                style={{ width: 160 }}
                value={entityTypeFilter}
                onChange={setEntityTypeFilter}
                options={ENTITY_TYPES.map((t) => ({ value: t, label: t }))}
              />
              <Select
                placeholder="Hành động"
                allowClear
                style={{ width: 160 }}
                value={actionFilter}
                onChange={setActionFilter}
                options={ACTIONS.map((a) => ({ value: a, label: a }))}
              />
            </Space>
          }
        />
      </div>

      {/* Detail Modal */}
      <Modal
        title={`Chi tiết log #${detailLog?.id || ''}`}
        open={!!detailLog}
        onCancel={() => setDetailLog(null)}
        footer={[
          <Button key="close" type="primary" onClick={() => setDetailLog(null)}>
            Đóng
          </Button>,
        ]}
        width={700}
      >
        {detailLog && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <Text strong>Hành động:</Text>{' '}
              <Tag color={actionColor(detailLog.action)}>{detailLog.action}</Tag>
            </div>
            <div>
              <Text strong>Đối tượng:</Text> {detailLog.entityType}
              {detailLog.entityId && ` #${detailLog.entityId}`}
            </div>
            <div>
              <Text strong>Người thực hiện:</Text> Account #{detailLog.actorId}
            </div>
            <div>
              <Text strong>IP:</Text> <Text code>{detailLog.ipAddress || '—'}</Text>
            </div>
            <div>
              <Text strong>Thời gian:</Text>{' '}
              <DateDisplay value={detailLog.createdAt} format="long" />
            </div>

            {detailLog.oldValue && (
              <div>
                <Text strong>Giá trị cũ:</Text>
                <pre style={{
                  background: '#fff1f0',
                  padding: 12,
                  borderRadius: 4,
                  fontSize: 12,
                  maxHeight: 200,
                  overflow: 'auto',
                }}>
                  {JSON.stringify(detailLog.oldValue, null, 2)}
                </pre>
              </div>
            )}

            {detailLog.newValue && (
              <div>
                <Text strong>Giá trị mới:</Text>
                <pre style={{
                  background: '#f6ffed',
                  padding: 12,
                  borderRadius: 4,
                  fontSize: 12,
                  maxHeight: 200,
                  overflow: 'auto',
                }}>
                  {JSON.stringify(detailLog.newValue, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </Modal>
    </PageContainer>
  );
};

export default SystemLogPage;