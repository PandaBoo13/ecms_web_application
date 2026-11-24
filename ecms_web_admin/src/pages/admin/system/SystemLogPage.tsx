// src/pages/admin/system/SystemLogPage.tsx
import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Card,
  Drawer,
  Tabs,
  Descriptions,
  Space,
  Select,
  Tag,
  Tooltip,
  Button,
} from 'antd';
import {
  EyeOutlined,
  ReloadOutlined,
  HistoryOutlined,
  UserOutlined,
  GlobalOutlined,
  ClockCircleOutlined,
  DatabaseOutlined,
  ThunderboltOutlined,
  InfoCircleOutlined,
  CopyOutlined,
  DiffOutlined,
  MailOutlined,
  PhoneOutlined,
  IdcardOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import toast from 'react-hot-toast';

import PageContainer from '@/components/common/PageContainer';
import PageHeader from '@/components/common/PageHeader';
import DataTable from '@/components/common/DataTable';
import DateDisplay from '@/components/common/DateDisplay';
import UserAvatar from '@/components/common/UserAvatar';

import { auditLogApi, adminUserApi } from '@/services/api/admin';
import type { AuditLogResponse } from '@/services/types/admin';
import type { AccountResponse } from '@/services/types/user';

type AccountMap = Map<number, AccountResponse>;

type AuditLogWithActor = AuditLogResponse & {
  actorName?: string;
  actorEmail?: string;
};

type AdminUserApiExt = typeof adminUserApi & {
  getById?: (id: number) => Promise<AccountResponse>;
  get?: (id: number) => Promise<AccountResponse>;
};

interface ResolvedActor {
  id: number;
  fullName?: string;
  email?: string;
  phone?: string;
  roleCode?: string;
  isActive?: boolean;
  isLocked?: boolean;
}

const ENTITY_TYPES = [
  'COURSE',
  'RESOURCE',
  'SESSION',
  'QUESTION',
  'ROOM',
  'CATEGORY',
  'ACCOUNT',
  'ROLE',
  'PERMISSION',
];

const ACTIONS = [
  'CREATE',
  'UPDATE',
  'DELETE',
  'SOFT_DELETE',
  'HARD_DELETE',
  'APPROVE',
  'REJECT',
  'CANCEL',
  'ARCHIVE',
  'SUBMIT_REVIEW',
  'COPY',
];

const getActionColor = (action: string): string => {
  if (
    action.includes('DELETE') ||
    action.includes('CANCEL') ||
    action.includes('REJECT')
  ) {
    return 'error';
  }
  if (action.includes('CREATE') || action.includes('APPROVE')) {
    return 'success';
  }
  if (action.includes('UPDATE') || action.includes('SUBMIT')) {
    return 'processing';
  }
  if (action.includes('ARCHIVE')) {
    return 'warning';
  }
  return 'default';
};

const formatJson = (value: unknown): string => {
  if (typeof value === 'string') {
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      return value;
    }
  }
  return JSON.stringify(value, null, 2);
};

const SystemLogPage = () => {
  const [data, setData] = useState<AuditLogResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [entityTypeFilter, setEntityTypeFilter] = useState<
    string | undefined
  >();
  const [actionFilter, setActionFilter] = useState<string | undefined>();
  const [detailLog, setDetailLog] = useState<AuditLogResponse | null>(null);
  const [accountMap, setAccountMap] = useState<AccountMap>(() => new Map());

  // ══════════════════════════════════════════════════════════════
  // FETCH DANH SÁCH TÀI KHOẢN ĐỂ ÁNH XẠ NGƯỜI THỰC HIỆN
  // ══════════════════════════════════════════════════════════════
  const fetchAccounts = useCallback(async () => {
    try {
      const res = await adminUserApi.search({ page: 0, size: 1000 });
      const map: AccountMap = new Map();
      res?.content?.forEach((acc) => {
        if (acc.accountId !== undefined && acc.accountId !== null) {
          map.set(acc.accountId, acc);
        }
      });
      setAccountMap(map);
    } catch (err) {
      console.warn('[AUDIT-LOG] Không tải được danh sách tài khoản:', err);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  // Bổ sung tải chi tiết tài khoản nếu actorId chưa có trong cache khi mở Drawer
  useEffect(() => {
    const actorId = detailLog?.actorId;
    if (actorId === undefined || actorId === null || accountMap.has(actorId)) {
      return;
    }

    const apiExt = adminUserApi as AdminUserApiExt;
    const fetcher = apiExt.getById || apiExt.get;
    if (!fetcher) return;

    fetcher(actorId)
      .then((acc) => {
        if (acc?.accountId !== undefined && acc?.accountId !== null) {
          setAccountMap((prev) => {
            const next: AccountMap = new Map(prev);
            next.set(acc.accountId, acc);
            return next;
          });
        }
      })
      .catch(() => {});
  }, [detailLog?.actorId, accountMap]);

  // ══════════════════════════════════════════════════════════════
  // FETCH NHẬT KÝ HỆ THỐNG
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

  // ══════════════════════════════════════════════════════════════
  // RESOLVE ACTOR INFO
  // ══════════════════════════════════════════════════════════════
  const resolveActor = useCallback(
    (record: AuditLogResponse): ResolvedActor | null => {
      if (record.actorId === undefined || record.actorId === null) {
        return null;
      }
      const ext = record as AuditLogWithActor;
      const account = accountMap.get(record.actorId);

      return {
        id: record.actorId,
        fullName: account?.fullName || ext.actorName,
        email: account?.email || ext.actorEmail,
        phone: account?.phone,
        roleCode: account?.roleCode,
        isActive: account?.isActive,
        isLocked: account?.isLocked,
      };
    },
    [accountMap],
  );

  // ══════════════════════════════════════════════════════════════
  // HANDLERS
  // ══════════════════════════════════════════════════════════════
  const handleEntityTypeChange = (value: string | undefined) => {
    setEntityTypeFilter(value);
    setPage(0);
  };

  const handleActionChange = (value: string | undefined) => {
    setActionFilter(value);
    setPage(0);
  };

  const handleResetFilters = () => {
    setEntityTypeFilter(undefined);
    setActionFilter(undefined);
    setPage(0);
  };

  const handleCopyJson = (value: unknown, label: string) => {
    navigator.clipboard
      .writeText(formatJson(value))
      .then(() => toast.success(`Đã sao chép ${label}`))
      .catch(() => toast.error('Không thể sao chép'));
  };

  const hasActiveFilters = Boolean(entityTypeFilter || actionFilter);

  // ══════════════════════════════════════════════════════════════
  // COLUMNS
  // ══════════════════════════════════════════════════════════════
  const columns: ColumnsType<AuditLogResponse> = useMemo(
    () => [
      {
        title: 'ID',
        dataIndex: 'id',
        key: 'id',
        width: 80,
        align: 'center',
        render: (id: number) => (
          <span className="font-mono text-xs text-slate-400">#{id}</span>
        ),
      },
      {
        title: 'Hành động',
        dataIndex: 'action',
        key: 'action',
        width: 160,
        render: (action: string) => (
          <Tag
            color={getActionColor(action)}
            className="!m-0 !font-mono !text-xs !font-semibold !rounded-md"
          >
            {action}
          </Tag>
        ),
      },
      {
        title: 'Đối tượng',
        key: 'entity',
        width: 205,
        render: (_, record) => (
          <Space size={6}>
            <Tag
              color="blue"
              className="!m-0 !font-mono !text-xs !font-medium !rounded-md"
            >
              {record.entityType}
            </Tag>
            {record.entityId !== undefined && record.entityId !== null && (
              <Tag className="!m-0 !font-mono !text-xs !rounded-md !bg-slate-50 !border-slate-200 !text-slate-600">
                #{record.entityId}
              </Tag>
            )}
          </Space>
        ),
      },
      {
        title: 'Người thực hiện',
        dataIndex: 'actorId',
        key: 'actorId',
        width: 260,
        render: (_, record) => {
          const actor = resolveActor(record);
          if (!actor) {
            return <span className="text-slate-400 text-[13px]">Hệ thống</span>;
          }

          const displayName =
            actor.fullName || actor.email || `Account #${actor.id}`;
          const hasProfile = Boolean(actor.fullName || actor.email);

          return (
            <div className="flex items-center gap-2.5 min-w-0">
              <UserAvatar name={displayName} size={28} />
              <div className="min-w-0 flex-1 flex flex-col">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-semibold text-[13px] text-slate-800 truncate">
                    {displayName}
                  </span>
                  {hasProfile && (
                    <span className="font-mono text-[11px] text-slate-400 shrink-0">
                      #{actor.id}
                    </span>
                  )}
                </div>
                {actor.fullName && actor.email && (
                  <span className="text-xs text-slate-400 truncate">
                    {actor.email}
                  </span>
                )}
              </div>
            </div>
          );
        },
      },
      {
        title: 'Địa chỉ IP',
        dataIndex: 'ipAddress',
        key: 'ipAddress',
        width: 150,
        render: (ip?: string) =>
          ip ? (
            <Tag className="!m-0 !font-mono !text-xs !rounded-md !bg-slate-50 !border-slate-200 !text-slate-600">
              {ip}
            </Tag>
          ) : (
            <span className="text-slate-300">—</span>
          ),
      },
      {
        title: 'Thời gian',
        dataIndex: 'createdAt',
        key: 'createdAt',
        width: 185,
        render: (v: string) => (
          <span className="inline-flex items-center gap-1.5 text-[13px] text-slate-600">
            <ClockCircleOutlined className="text-slate-400 text-xs" />
            <DateDisplay value={v} format="long" />
          </span>
        ),
      },
      {
        title: '',
        key: 'detail',
        width: 60,
        align: 'center',
        fixed: 'right',
        render: (_, record) => (
          <div onDoubleClick={(e) => e.stopPropagation()}>
            <Tooltip title="Xem chi tiết">
              <Button
                type="text"
                size="small"
                icon={<EyeOutlined className="text-blue-600" />}
                onClick={() => setDetailLog(record)}
              />
            </Tooltip>
          </div>
        ),
      },
    ],
    [resolveActor],
  );

  const detailActor = detailLog ? resolveActor(detailLog) : null;

  // ══════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════
  return (
    <PageContainer>
      <PageHeader
        title="Nhật ký hệ thống"
        subtitle="Theo dõi lịch sử thao tác, thay đổi dữ liệu và truy vết hoạt động quản trị"
        extra={
          <Space size={8}>
            <Tag className="!m-0 !rounded-full !text-xs !font-medium !bg-slate-50 !border-slate-200 !text-slate-600 px-2.5 py-0.5">
              Tổng {total.toLocaleString('vi-VN')} bản ghi
            </Tag>
            <Button
              icon={<ReloadOutlined spin={loading} />}
              onClick={() => {
                fetchData();
                fetchAccounts();
                toast.success('Đã làm mới');
              }}
              className="!rounded-lg"
            >
              Làm mới
            </Button>
          </Space>
        }
      />

      <Card
        className="!rounded-xl border-slate-200/90 shadow-none"
        styles={{ body: { padding: '16px 20px' } }}
      >
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
          onRow={(record) => ({
            onDoubleClick: () => setDetailLog(record),
            className: 'cursor-pointer',
          })}
          extra={
            <Space wrap size={10}>
              <Select
                placeholder="Lọc theo đối tượng"
                allowClear
                className="w-48"
                value={entityTypeFilter}
                onChange={handleEntityTypeChange}
                options={ENTITY_TYPES.map((t) => ({ value: t, label: t }))}
              />
              <Select
                placeholder="Lọc theo hành động"
                allowClear
                className="w-48"
                value={actionFilter}
                onChange={handleActionChange}
                options={ACTIONS.map((a) => ({ value: a, label: a }))}
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

      {/* Detail Drawer 720px */}
      <Drawer
        placement="right"
        width={720}
        open={Boolean(detailLog)}
        onClose={() => setDetailLog(null)}
        destroyOnClose
        title={
          detailLog && (
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 text-lg">
                <HistoryOutlined />
              </div>
              <div className="min-w-0">
                <div className="text-[16.5px] font-bold text-slate-900 leading-snug">
                  Chi tiết nhật ký #{detailLog.id}
                </div>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <Tag
                    color={getActionColor(detailLog.action)}
                    className="!m-0 !font-mono !font-semibold !text-xs !rounded"
                  >
                    {detailLog.action}
                  </Tag>
                  <Tag
                    color="blue"
                    className="!m-0 !font-mono !text-xs !rounded"
                  >
                    {detailLog.entityType}
                    {detailLog.entityId !== undefined &&
                    detailLog.entityId !== null
                      ? ` #${detailLog.entityId}`
                      : ''}
                  </Tag>
                </div>
              </div>
            </div>
          )
        }
        extra={
          <Button onClick={() => setDetailLog(null)} className="!rounded-lg">
            Đóng
          </Button>
        }
      >
        {detailLog && (
          <Tabs
            defaultActiveKey="info"
            items={[
              {
                key: 'info',
                label: (
                  <span>
                    <InfoCircleOutlined /> Thông tin nhật ký
                  </span>
                ),
                children: (
                  <div className="flex flex-col gap-5 pt-1">
                    {/* Khối 1: Thông tin sự kiện (2x2 đều nhau) */}
                    <Card
                      size="small"
                      title="Thông tin truy vết"
                      styles={{ body: { padding: '16px 20px 4px' } }}
                      className="!bg-white !border-slate-200/80 !rounded-xl"
                    >
                      <Descriptions
                        column={{ xs: 1, sm: 2 }}
                        size="small"
                        styles={{
                          label: { paddingBottom: 14, color: '#64748b' },
                          content: { paddingBottom: 14 },
                        }}
                      >
                        <Descriptions.Item
                          label={
                            <Space size={6}>
                              <ThunderboltOutlined /> Hành động
                            </Space>
                          }
                        >
                          <Tag
                            color={getActionColor(detailLog.action)}
                            className="!m-0 !font-mono !font-semibold !rounded"
                          >
                            {detailLog.action}
                          </Tag>
                        </Descriptions.Item>

                        <Descriptions.Item
                          label={
                            <Space size={6}>
                              <DatabaseOutlined /> Đối tượng
                            </Space>
                          }
                        >
                          <Space size={8}>
                            <Tag
                              color="blue"
                              className="!m-0 !font-mono !rounded"
                            >
                              {detailLog.entityType}
                            </Tag>
                            {detailLog.entityId !== undefined &&
                              detailLog.entityId !== null && (
                                <span className="font-mono text-xs font-semibold text-slate-700">
                                  #{detailLog.entityId}
                                </span>
                              )}
                          </Space>
                        </Descriptions.Item>

                        <Descriptions.Item
                          label={
                            <Space size={6}>
                              <ClockCircleOutlined /> Thời gian ghi nhận
                            </Space>
                          }
                        >
                          <DateDisplay
                            value={detailLog.createdAt}
                            format="long"
                          />
                        </Descriptions.Item>

                        <Descriptions.Item
                          label={
                            <Space size={6}>
                              <GlobalOutlined /> Địa chỉ IP
                            </Space>
                          }
                        >
                          {detailLog.ipAddress ? (
                            <Tag className="!m-0 !font-mono !text-xs !rounded !bg-slate-50 !border-slate-200 !text-slate-700">
                              {detailLog.ipAddress}
                            </Tag>
                          ) : (
                            <span className="text-slate-400">Không ghi nhận</span>
                          )}
                        </Descriptions.Item>
                      </Descriptions>
                    </Card>

                    {/* Khối 2: Tách riêng thẻ Người thực hiện để có không gian thoáng */}
                    <Card
                      size="small"
                      title={
                        <span className="inline-flex items-center gap-1.5">
                          <UserOutlined className="text-slate-500" />
                          Người thực hiện
                        </span>
                      }
                      styles={{ body: { padding: '16px 20px' } }}
                      className="!bg-white !border-slate-200/80 !rounded-xl"
                    >
                      {detailActor ? (
                        <div className="flex items-start gap-3.5">
                          <UserAvatar
                            name={
                              detailActor.fullName ||
                              detailActor.email ||
                              `Account #${detailActor.id}`
                            }
                            size={40}
                          />
                          <div className="min-w-0 flex-1 flex flex-col gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[14.5px] font-bold text-slate-900">
                                {detailActor.fullName ||
                                  `Account #${detailActor.id}`}
                              </span>
                              {detailActor.roleCode && (
                                <Tag
                                  color="purple"
                                  className="!m-0 !text-[11px] !font-medium !rounded-md"
                                >
                                  {detailActor.roleCode}
                                </Tag>
                              )}
                              {detailActor.isLocked !== undefined &&
                                detailActor.isActive !== undefined && (
                                  <Tag
                                    color={
                                      detailActor.isLocked
                                        ? 'error'
                                        : detailActor.isActive
                                          ? 'success'
                                          : 'default'
                                    }
                                    className="!m-0 !text-[11px] !rounded-md"
                                  >
                                    {detailActor.isLocked
                                      ? 'Đang khóa'
                                      : detailActor.isActive
                                        ? 'Hoạt động'
                                        : 'Ngừng hoạt động'}
                                  </Tag>
                                )}
                            </div>

                            <div className="flex items-center gap-x-5 gap-y-1.5 flex-wrap text-xs text-slate-500">
                              <span className="inline-flex items-center gap-1.5 font-mono text-slate-600">
                                <IdcardOutlined className="text-slate-400" />
                                ID #{detailActor.id}
                              </span>
                              {detailActor.email && (
                                <span className="inline-flex items-center gap-1.5">
                                  <MailOutlined className="text-slate-400" />
                                  {detailActor.email}
                                </span>
                              )}
                              {detailActor.phone && (
                                <span className="inline-flex items-center gap-1.5">
                                  <PhoneOutlined className="text-slate-400" />
                                  {detailActor.phone}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-[13px] text-slate-500">
                          Hệ thống (Tác vụ tự động)
                        </div>
                      )}
                    </Card>

                    {/* Khối 3: Dữ liệu thay đổi */}
                    {detailLog.oldValue !== undefined &&
                      detailLog.oldValue !== null && (
                        <Card
                          size="small"
                          title={
                            <span className="inline-flex items-center gap-1.5 text-rose-700">
                              <DiffOutlined /> Giá trị cũ (Trước thay đổi)
                            </span>
                          }
                          extra={
                            <Button
                              type="text"
                              size="small"
                              icon={<CopyOutlined />}
                              onClick={() =>
                                handleCopyJson(detailLog.oldValue, 'giá trị cũ')
                              }
                            >
                              Sao chép
                            </Button>
                          }
                          styles={{ body: { padding: '16px 20px' } }}
                          className="!bg-white !border-rose-200/80 !rounded-xl"
                        >
                          <pre className="m-0 rounded-lg border border-rose-100 bg-rose-50/60 p-3.5 text-xs font-mono text-slate-800 max-h-60 overflow-auto leading-relaxed">
                            {formatJson(detailLog.oldValue)}
                          </pre>
                        </Card>
                      )}

                    {detailLog.newValue !== undefined &&
                      detailLog.newValue !== null && (
                        <Card
                          size="small"
                          title={
                            <span className="inline-flex items-center gap-1.5 text-emerald-700">
                              <DiffOutlined /> Giá trị mới (Sau thay đổi)
                            </span>
                          }
                          extra={
                            <Button
                              type="text"
                              size="small"
                              icon={<CopyOutlined />}
                              onClick={() =>
                                handleCopyJson(
                                  detailLog.newValue,
                                  'giá trị mới',
                                )
                              }
                            >
                              Sao chép
                            </Button>
                          }
                          styles={{ body: { padding: '16px 20px' } }}
                          className="!bg-white !border-emerald-200/80 !rounded-xl"
                        >
                          <pre className="m-0 rounded-lg border border-emerald-100 bg-emerald-50/60 p-3.5 text-xs font-mono text-slate-800 max-h-60 overflow-auto leading-relaxed">
                            {formatJson(detailLog.newValue)}
                          </pre>
                        </Card>
                      )}

                    {(detailLog.oldValue === undefined ||
                      detailLog.oldValue === null) &&
                      (detailLog.newValue === undefined ||
                        detailLog.newValue === null) && (
                        <Card
                          size="small"
                          className="!bg-slate-50/70 !border-slate-200/80 !rounded-xl"
                        >
                          <div className="text-xs text-slate-500 text-center py-2">
                            Bản ghi này không đính kèm dữ liệu thay đổi chi tiết
                            (JSON).
                          </div>
                        </Card>
                      )}
                  </div>
                ),
              },
            ]}
          />
        )}
      </Drawer>
    </PageContainer>
  );
};

export default SystemLogPage;