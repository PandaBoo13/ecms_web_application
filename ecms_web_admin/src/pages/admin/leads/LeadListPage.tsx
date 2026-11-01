import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Button,
  Space,
  Select,
  Modal,
  Form,
  Input,
  Drawer,
  Descriptions,
  Timeline,
  Tag,
  Tabs,
  InputNumber,
  Popconfirm,
  Card,
  Row,
  Col,
  Typography,
  Tooltip,
  Alert,
  Divider,
  Badge,
} from 'antd';
import {
  PlusOutlined,
  EyeOutlined,
  ReloadOutlined,
  UserSwitchOutlined,
  CommentOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  FormOutlined,
  TeamOutlined,
  ClockCircleOutlined,
  HourglassOutlined,
  PhoneOutlined,
  MailOutlined,
  TrophyOutlined,
  BookOutlined,
  UserOutlined,
  ClearOutlined,
  MessageOutlined,
  CalendarOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import toast from 'react-hot-toast';

import PageContainer from '@/components/common/PageContainer';
import PageHeader from '@/components/common/PageHeader';
import DataTable from '@/components/common/DataTable';
import StatusTag from '@/components/common/StatusTag';
import DateDisplay from '@/components/common/DateDisplay';
import UserAvatar from '@/components/common/UserAvatar';
import StatsCard from '@/components/common/StatsCard';
import { useTranslation } from '@/hooks/useTranslation';

import { leadApi } from '@/services/api/leads';
import { studentApi } from '@/services/api/students';
import type {
  Lead,
  LeadDetail,
  LeadStatus,
  LeadCreatePayload,
  LeadInteractionCreatePayload,
  LeadPlacementTestCreatePayload,
  InteractionType,
} from '@/services/types/lead';

const { Option } = Select;
const { TextArea } = Input;
const { Text, Title } = Typography;

interface LeadStats {
  total: number;
  newCount: number;
  queueCount: number;
  consultedCount: number;
}

const LeadListPage = () => {
  const { t } = useTranslation();

  // ══════════════════════════════════════════════════════════════
  // STATE
  // ══════════════════════════════════════════════════════════════
  const [data, setData] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<LeadStatus | undefined>();
  const [inQueueFilter, setInQueueFilter] = useState<boolean | undefined>();

  // Metrics
  const [stats, setStats] = useState<LeadStats>({
    total: 0,
    newCount: 0,
    queueCount: 0,
    consultedCount: 0,
  });

  // Modals & Drawer
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [interactionModalVisible, setInteractionModalVisible] = useState(false);
  const [placementTestModalVisible, setPlacementTestModalVisible] = useState(false);
  const [convertModalVisible, setConvertModalVisible] = useState(false);
  const [detailDrawerVisible, setDetailDrawerVisible] = useState(false);

  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [leadDetail, setLeadDetail] = useState<LeadDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [createForm] = Form.useForm();
  const [assignForm] = Form.useForm();
  const [interactionForm] = Form.useForm();
  const [placementTestForm] = Form.useForm();
  const [convertForm] = Form.useForm();

  // Watch result for Interaction Form (để bắt buộc lý do từ chối nếu result = REJECTED)
  const interactionResult = Form.useWatch('result', interactionForm);
  const testStatus = Form.useWatch('testStatus', placementTestForm);

  // ══════════════════════════════════════════════════════════════
  // FETCH STATS
  // ══════════════════════════════════════════════════════════════
  const fetchStats = useCallback(async () => {
    try {
      const [allRes, newRes, queueRes, consultedRes] = await Promise.all([
        leadApi.search({ page: 0, size: 1 }),
        leadApi.search({ page: 0, size: 1, status: 'NEW' }),
        leadApi.search({ page: 0, size: 1, inQueue: true }),
        leadApi.search({ page: 0, size: 1, status: 'CONSULTED' }),
      ]);
      setStats({
        total: allRes.totalElements,
        newCount: newRes.totalElements,
        queueCount: queueRes.totalElements,
        consultedCount: consultedRes.totalElements,
      });
    } catch {
      // Fallback silently if stats endpoint or params fail
    }
  }, []);

  // ══════════════════════════════════════════════════════════════
  // FETCH DATA
  // ══════════════════════════════════════════════════════════════
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await leadApi.search({
        search: keyword.trim() || undefined,
        status: statusFilter,
        inQueue: inQueueFilter,
        page,
        size: pageSize,
        sortBy: 'createdAt',
        direction: 'desc',
      });
      setData(res.content);
      setTotal(res.totalElements);
    } catch (err) {
      const e = err as { message?: string };
      toast.error(e?.message || 'Không thể tải danh sách Lead');
      setData([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, keyword, statusFilter, inQueueFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Reset page khi filter thay đổi
  useEffect(() => {
    setPage(0);
  }, [keyword, statusFilter, inQueueFilter]);

  const handleRefresh = () => {
    fetchData();
    fetchStats();
    toast.success('Đã cập nhật dữ liệu mới nhất');
  };

  const handleResetFilters = () => {
    setKeyword('');
    setStatusFilter(undefined);
    setInQueueFilter(undefined);
    setPage(0);
  };

  const loadLeadDetail = async (leadId: number) => {
    setDetailLoading(true);
    try {
      const detail = await leadApi.getDetailById(leadId);
      setLeadDetail(detail);
    } catch (err) {
      const e = err as { message?: string };
      toast.error(e?.message || 'Không thể tải chi tiết Lead');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleOpenDetail = (lead: Lead) => {
    setSelectedLead(lead);
    setDetailDrawerVisible(true);
    loadLeadDetail(lead.id);
  };

  // ══════════════════════════════════════════════════════════════
  // HANDLERS
  // ══════════════════════════════════════════════════════════════
  const handleCreateLead = async (values: LeadCreatePayload) => {
    try {
      await leadApi.create(values);
      toast.success('Tiếp nhận Lead mới thành công');
      setCreateModalVisible(false);
      createForm.resetFields();
      fetchData();
      fetchStats();
    } catch (err) {
      const e = err as { message?: string };
      toast.error(e?.message || 'Tạo Lead thất bại');
    }
  };

  const handleAssignConsultant = async (values: { consultantId: number; reason?: string }) => {
    if (!selectedLead) return;
    try {
      await leadApi.assignConsultant(selectedLead.id, values);
      toast.success('Phân công tư vấn viên thành công');
      setAssignModalVisible(false);
      assignForm.resetFields();
      fetchData();
      fetchStats();
      if (detailDrawerVisible) loadLeadDetail(selectedLead.id);
    } catch (err) {
      const e = err as { message?: string };
      toast.error(e?.message || 'Phân công thất bại');
    }
  };

  const handleLogInteraction = async (values: LeadInteractionCreatePayload) => {
    if (!selectedLead) return;
    try {
      await leadApi.logInteraction(selectedLead.id, values);
      toast.success('Ghi nhận tương tác thành công');
      setInteractionModalVisible(false);
      interactionForm.resetFields();
      fetchData();
      fetchStats();
      if (detailDrawerVisible) loadLeadDetail(selectedLead.id);
    } catch (err) {
      const e = err as { message?: string };
      toast.error(e?.message || 'Ghi nhận thất bại');
    }
  };

  const handleRecordPlacementTest = async (values: LeadPlacementTestCreatePayload) => {
    if (!selectedLead) return;
    try {
      await leadApi.recordPlacementTest(selectedLead.id, values);
      toast.success('Ghi nhận đánh giá đầu vào thành công');
      setPlacementTestModalVisible(false);
      placementTestForm.resetFields();
      fetchData();
      if (detailDrawerVisible) loadLeadDetail(selectedLead.id);
    } catch (err) {
      const e = err as { message?: string };
      toast.error(e?.message || 'Ghi nhận test thất bại');
    }
  };

  const handleConvertToStudent = async (values: { courseId?: number; classId?: number; note?: string }) => {
    if (!selectedLead) return;
    try {
      const res = await studentApi.convertFromLead({
        leadId: selectedLead.id,
        courseId: values.courseId || selectedLead.courseId,
        classId: values.classId,
        note: values.note,
      });
      toast.success(`Chuyển đổi thành công! Mã học viên: ${res.studentCode}`);
      setConvertModalVisible(false);
      convertForm.resetFields();
      fetchData();
      fetchStats();
      if (detailDrawerVisible) loadLeadDetail(selectedLead.id);
    } catch (err) {
      const e = err as { message?: string };
      toast.error(e?.message || 'Chuyển đổi học viên thất bại');
    }
  };

  const handleCloseLead = async (id: number) => {
    try {
      await leadApi.delete(id);
      toast.success('Đã cập nhật đóng tư vấn Lead');
      fetchData();
      fetchStats();
    } catch (err) {
      const e = err as { message?: string };
      toast.error(e?.message || 'Thao tác thất bại');
    }
  };

  // Helper helper icons for interaction types
  const renderInteractionIcon = (type: InteractionType) => {
    switch (type) {
      case 'CALL':
        return <PhoneOutlined style={{ color: '#1677ff' }} />;
      case 'MEETING':
        return <TeamOutlined style={{ color: '#52c41a' }} />;
      case 'CHAT':
        return <MessageOutlined style={{ color: '#722ed1' }} />;
      case 'EMAIL':
        return <MailOutlined style={{ color: '#fa8c16' }} />;
      default:
        return <CommentOutlined style={{ color: '#8c8c8c' }} />;
    }
  };

  // ══════════════════════════════════════════════════════════════
  // COLUMNS
  // ══════════════════════════════════════════════════════════════
  const columns: ColumnsType<Lead> = useMemo(
    () => [
      {
        title: t('lead.code'),
        dataIndex: 'id',
        width: 90,
        render: (id: number, record: Lead) => (
          <Tag
            color="default"
            style={{
              fontFamily: 'monospace',
              fontWeight: 700,
              fontSize: 12,
              borderRadius: 6,
              padding: '2px 8px',
              cursor: 'pointer',
              background: '#f8fafc',
              borderColor: '#e2e8f0',
              color: '#475569',
            }}
            onClick={() => handleOpenDetail(record)}
          >
            #{String(id).padStart(4, '0')}
          </Tag>
        ),
      },
      {
        title: t('lead.customer'),
        key: 'customer',
        width: 260,
        render: (_, record: Lead) => (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <UserAvatar name={record.fullName} size={36} />
            <div className="min-w-0">
              <div
                className="font-semibold text-sm text-slate-900 cursor-pointer leading-snug hover:text-blue-600 transition-colors"
                onClick={() => handleOpenDetail(record)}
              >
                {record.fullName}
              </div>
              <div className="flex items-center gap-2.5 mt-1">
                {record.phone && (
                  <a
                    href={`tel:${record.phone}`}
                    className="text-xs text-slate-500 hover:text-blue-600 inline-flex items-center gap-1 transition-colors"
                  >
                    <PhoneOutlined className="text-[11px] text-slate-400" />
                    {record.phone}
                  </a>
                )}
                {record.email && (
                  <a
                    href={`mailto:${record.email}`}
                    className="text-xs text-slate-500 hover:text-blue-600 inline-flex items-center gap-1 transition-colors"
                  >
                    <MailOutlined className="text-[11px] text-slate-400" />
                    {record.email}
                  </a>
                )}
              </div>
            </div>
          </div>
        ),
      },
      {
        title: t('lead.courseInterest'),
        dataIndex: 'courseId',
        width: 140,
        render: (courseId?: number) =>
          courseId ? (
            <Tag
              icon={<BookOutlined />}
              color="processing"
              style={{ borderRadius: 6, fontWeight: 500, padding: '2px 8px' }}
            >
              Course #{courseId}
            </Tag>
          ) : (
            <Text type="secondary" style={{ fontSize: 13 }}>
              —
            </Text>
          ),
      },
      {
        title: t('lead.consultant'),
        key: 'consultant',
        width: 170,
        render: (_, record: Lead) =>
          record.assignedConsultantId ? (
            <Tag
              color="blue"
              icon={<UserOutlined />}
              style={{ borderRadius: 12, padding: '2px 10px', fontWeight: 500 }}
            >
              TVV #{record.assignedConsultantId}
            </Tag>
          ) : (
            <Tag
              color="warning"
              style={{
                borderRadius: 12,
                padding: '2px 10px',
                fontWeight: 500,
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              <span className="pulse-dot-amber" />
              {t('lead.unassigned')}
            </Tag>
          ),
      },
      {
        title: t('common.status'),
        dataIndex: 'status',
        width: 130,
        render: (status: LeadStatus) => <StatusTag status={status} />,
      },
      {
        title: t('lead.converted'),
        dataIndex: 'studentId',
        width: 160,
        render: (studentId?: number) =>
          studentId ? (
            <Tag
              color="cyan"
              icon={<CheckCircleOutlined />}
              style={{ borderRadius: 12, fontWeight: 600, padding: '2px 10px' }}
            >
              HV #{studentId}
            </Tag>
          ) : (
            <span
              style={{
                fontSize: 12,
                color: '#94a3b8',
                padding: '2px 8px',
                background: '#f8fafc',
                borderRadius: 10,
                border: '1px dashed #cbd5e1',
              }}
            >
              {t('lead.notConverted')}
            </span>
          ),
      },
      {
        title: t('common.createdAt'),
        dataIndex: 'createdAt',
        width: 140,
        render: (date: string) => <DateDisplay value={date} format="short" />,
      },
      {
        title: t('common.actions'),
        key: 'actions',
        fixed: 'right',
        width: 200,
        render: (_, record: Lead) => (
          <Space size={3}>
            <Tooltip title={t('lead.tooltip.view')}>
              <Button
                type="text"
                shape="circle"
                className="action-btn-circle view"
                icon={<EyeOutlined style={{ color: '#1677ff', fontSize: 15 }} />}
                onClick={() => handleOpenDetail(record)}
              />
            </Tooltip>

            <Tooltip title={t('lead.tooltip.assign')}>
              <Button
                type="text"
                shape="circle"
                className="action-btn-circle assign"
                icon={<UserSwitchOutlined style={{ color: '#722ed1', fontSize: 15 }} />}
                onClick={() => {
                  setSelectedLead(record);
                  assignForm.setFieldsValue({ consultantId: record.assignedConsultantId });
                  setAssignModalVisible(true);
                }}
              />
            </Tooltip>

            <Tooltip title={t('lead.tooltip.interact')}>
              <Button
                type="text"
                shape="circle"
                className="action-btn-circle interact"
                icon={<CommentOutlined style={{ color: '#fa8c16', fontSize: 15 }} />}
                onClick={() => {
                  setSelectedLead(record);
                  interactionForm.resetFields();
                  setInteractionModalVisible(true);
                }}
              />
            </Tooltip>

            <Tooltip title={t('lead.tooltip.test')}>
              <Button
                type="text"
                shape="circle"
                className="action-btn-circle test"
                icon={<FormOutlined style={{ color: '#08979c', fontSize: 15 }} />}
                onClick={() => {
                  setSelectedLead(record);
                  placementTestForm.resetFields();
                  setPlacementTestModalVisible(true);
                }}
              />
            </Tooltip>

            {!record.studentId && (
              <Tooltip title={t('lead.tooltip.convert')}>
                <Button
                  type="primary"
                  size="small"
                  shape="round"
                  className="btn-success-gradient"
                  icon={<CheckCircleOutlined />}
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    padding: '0 10px',
                    height: 26,
                  }}
                  onClick={() => {
                    setSelectedLead(record);
                    convertForm.setFieldsValue({ courseId: record.courseId });
                    setConvertModalVisible(true);
                  }}
                >
                  {t('lead.convertBtn')}
                </Button>
              </Tooltip>
            )}

            <Popconfirm
              title={t('lead.popconfirm.closeTitle')}
              description={t('lead.popconfirm.closeDesc')}
              onConfirm={() => handleCloseLead(record.id)}
              okText={t('common.confirm')}
              cancelText={t('common.cancel')}
              okButtonProps={{ danger: true }}
            >
              <Tooltip title={t('lead.tooltip.close')}>
                <Button
                  type="text"
                  danger
                  shape="circle"
                  className="action-btn-circle delete"
                  icon={<CloseCircleOutlined style={{ fontSize: 15 }} />}
                />
              </Tooltip>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [t, handleOpenDetail]
  );

  const hasActiveFilters = Boolean(keyword || statusFilter || inQueueFilter !== undefined);

  return (
    <PageContainer>
      <PageHeader
        title={t('lead.title')}
        subtitle={t('lead.subtitle')}
        badge={
          <Tag
            color="blue"
            style={{
              borderRadius: 12,
              fontWeight: 600,
              fontSize: 12,
              padding: '2px 10px',
              border: 'none',
              background: '#eff6ff',
              color: '#2563eb',
            }}
          >
            CRM & Admissions
          </Tag>
        }
        extra={
          <Space>
            <Button
              icon={<ReloadOutlined spin={loading} />}
              onClick={handleRefresh}
              style={{ borderRadius: 8, height: 38, fontWeight: 500 }}
            >
              {t('common.refresh')}
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setCreateModalVisible(true)}
              className="btn-primary-gradient"
              style={{
                borderRadius: 8,
                height: 38,
                fontWeight: 500,
                border: 'none',
              }}
            >
              {t('lead.create')}
            </Button>
          </Space>
        }
      />

      {/* ── KPI Metric Cards ── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={12} lg={6}>
          <StatsCard
            title={t('lead.total')}
            value={stats.total}
            icon={<TeamOutlined />}
            color="#2563eb"
            bgColor="#eff6ff"
            active={!statusFilter && inQueueFilter === undefined}
            onClick={() => {
              setStatusFilter(undefined);
              setInQueueFilter(undefined);
            }}
            tooltip="Nhấn để xem toàn bộ Lead"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatsCard
            title={t('lead.new')}
            value={stats.newCount}
            icon={<ClockCircleOutlined />}
            color="#f59e0b"
            bgColor="#fffbeb"
            active={statusFilter === 'NEW'}
            onClick={() => {
              setStatusFilter(statusFilter === 'NEW' ? undefined : 'NEW');
              setInQueueFilter(undefined);
            }}
            tagText="Cần liên hệ"
            tagColor="warning"
            tooltip="Nhấn để lọc Lead chưa tư vấn"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatsCard
            title={t('lead.inQueue')}
            value={stats.queueCount}
            icon={<HourglassOutlined />}
            color="#8b5cf6"
            bgColor="#f5f3ff"
            active={inQueueFilter === true}
            onClick={() => {
              setInQueueFilter(inQueueFilter === true ? undefined : true);
              setStatusFilter(undefined);
            }}
            tagText="Chờ TVV"
            tagColor="purple"
            tooltip="Nhấn để lọc Lead chưa được phân bổ TVV"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatsCard
            title={t('lead.consulted')}
            value={stats.consultedCount}
            icon={<TrophyOutlined />}
            color="#10b981"
            bgColor="#ecfdf5"
            active={statusFilter === 'CONSULTED'}
            onClick={() => {
              setStatusFilter(statusFilter === 'CONSULTED' ? undefined : 'CONSULTED');
              setInQueueFilter(undefined);
            }}
            tagText="Đang chốt"
            tagColor="success"
            tooltip="Nhấn để lọc Lead đã được tư vấn"
          />
        </Col>
      </Row>

      {/* ── Table & Filters ── */}
      <Card
        bordered={false}
        className="!rounded-2xl !border !border-slate-200 !shadow-[0_4px_16px_-2px_rgba(15,23,42,0.04)] !bg-white overflow-hidden"
        bodyStyle={{ padding: 18 }}
      >
        <DataTable
          columns={columns}
          dataSource={data}
          loading={loading}
          total={total}
          page={page}
          pageSize={pageSize}
          onPageChange={(p, ps) => {
            setPage(p);
            setPageSize(ps);
          }}
          onSearch={setKeyword}
          searchPlaceholder={t('lead.filter.searchPlaceholder')}
          extra={
            <Space wrap size={10}>
              <Select
                placeholder={t('lead.filter.status')}
                allowClear
                style={{ width: 170, height: 38 }}
                value={statusFilter}
                onChange={setStatusFilter}
              >
                <Option value="NEW">
                  <Badge status="processing" text={t('status.NEW')} />
                </Option>
                <Option value="CONSULTED">
                  <Badge status="success" text={t('status.CONSULTED')} />
                </Option>
              </Select>

              <Select
                placeholder={t('lead.filter.queue')}
                allowClear
                style={{ width: 190, height: 38 }}
                value={inQueueFilter}
                onChange={setInQueueFilter}
              >
                <Option value={true}>
                  <Badge status="warning" text={t('lead.filter.inQueue')} />
                </Option>
                <Option value={false}>
                  <Badge status="default" text={t('lead.filter.assigned')} />
                </Option>
              </Select>

              {hasActiveFilters && (
                <Button
                  icon={<ClearOutlined />}
                  onClick={handleResetFilters}
                  style={{ borderRadius: 8, height: 38 }}
                >
                  {t('common.clearFilter')}
                </Button>
              )}
            </Space>
          }
        />
      </Card>

      {/* ── Modal Tiếp nhận Lead ── */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: '#eff6ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <TeamOutlined style={{ color: '#2563eb', fontSize: 18 }} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                {t('lead.modal.createTitle')}
              </div>
              <div style={{ fontSize: 12, color: '#64748b', fontWeight: 400 }}>
                Nhập thông tin khách hàng tiềm năng mới vào hệ thống
              </div>
            </div>
          </div>
        }
        open={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        onOk={() => createForm.submit()}
        okText={t('common.save')}
        cancelText={t('common.cancel')}
        okButtonProps={{ className: 'btn-primary-gradient', style: { borderRadius: 8, height: 38 } }}
        cancelButtonProps={{ style: { borderRadius: 8, height: 38 } }}
        destroyOnClose
      >
        <Divider style={{ margin: '12px 0 20px' }} />
        <Form form={createForm} layout="vertical" onFinish={handleCreateLead}>
          <Form.Item
            name="fullName"
            label={t('lead.modal.fullName')}
            rules={[{ required: true, message: 'Vui lòng nhập họ và tên' }]}
          >
            <Input
              prefix={<UserOutlined style={{ color: '#94a3b8' }} />}
              placeholder="Nguyễn Văn A"
              style={{ height: 38, borderRadius: 8 }}
            />
          </Form.Item>
          <Form.Item
            name="phone"
            label={t('lead.modal.phone')}
            rules={[{ required: true, message: 'Vui lòng nhập số điện thoại' }]}
          >
            <Input
              prefix={<PhoneOutlined style={{ color: '#94a3b8' }} />}
              placeholder="0901234567"
              style={{ height: 38, borderRadius: 8 }}
            />
          </Form.Item>
          <Form.Item
            name="email"
            label={t('lead.modal.email')}
            rules={[{ type: 'email', message: 'Email không hợp lệ' }]}
          >
            <Input
              prefix={<MailOutlined style={{ color: '#94a3b8' }} />}
              placeholder="khachhang@example.com"
              style={{ height: 38, borderRadius: 8 }}
            />
          </Form.Item>
          <Form.Item name="courseId" label={t('lead.modal.courseId')}>
            <InputNumber
              prefix={<BookOutlined style={{ color: '#94a3b8' }} />}
              style={{ width: '100%', height: 38, borderRadius: 8 }}
              placeholder="VD: 1, 2, 3..."
            />
          </Form.Item>
          <Form.Item name="assignedConsultantId" label={t('lead.modal.consultantId')}>
            <InputNumber
              prefix={<UserOutlined style={{ color: '#94a3b8' }} />}
              style={{ width: '100%', height: 38, borderRadius: 8 }}
              placeholder="Bỏ trống nếu đưa vào Hàng đợi (Queue)"
            />
          </Form.Item>
          <Form.Item name="note" label={t('lead.modal.notes')}>
            <TextArea
              rows={3}
              placeholder="Nhu cầu học tiếng Anh, lịch rảnh buổi tối, mục tiêu thi chứng chỉ..."
              style={{ borderRadius: 8 }}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Modal Phân công TVV ── */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: '#f5f3ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <UserSwitchOutlined style={{ color: '#7c3aed', fontSize: 18 }} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                {t('lead.modal.assignTitle')} #{selectedLead?.id}
              </div>
              <div style={{ fontSize: 12, color: '#64748b', fontWeight: 400 }}>
                Chỉ định chuyên viên tuyển sinh phụ trách tư vấn khách hàng
              </div>
            </div>
          </div>
        }
        open={assignModalVisible}
        onCancel={() => setAssignModalVisible(false)}
        onOk={() => assignForm.submit()}
        okText={t('common.confirm')}
        cancelText={t('common.cancel')}
        okButtonProps={{ className: 'btn-primary-gradient', style: { borderRadius: 8, height: 38 } }}
        cancelButtonProps={{ style: { borderRadius: 8, height: 38 } }}
        destroyOnClose
      >
        <Divider style={{ margin: '12px 0 20px' }} />
        <Form form={assignForm} layout="vertical" onFinish={handleAssignConsultant}>
          <Form.Item
            name="consultantId"
            label={t('lead.consultant')}
            rules={[{ required: true, message: 'Vui lòng nhập ID tư vấn viên' }]}
          >
            <InputNumber
              prefix={<UserOutlined style={{ color: '#94a3b8' }} />}
              style={{ width: '100%', height: 38, borderRadius: 8 }}
              placeholder="Nhập ID tài khoản TVV (VD: 2)"
            />
          </Form.Item>
          <Form.Item name="reason" label={t('lead.modal.assignReason')}>
            <Input
              placeholder="Phân công theo lượt, TVV cũ nghỉ phép..."
              style={{ height: 38, borderRadius: 8 }}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Modal Ghi nhận tương tác ── */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: '#fffbeb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CommentOutlined style={{ color: '#d97706', fontSize: 18 }} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                {t('lead.modal.interactTitle')}: {selectedLead?.fullName}
              </div>
              <div style={{ fontSize: 12, color: '#64748b', fontWeight: 400 }}>
                Ghi nhận chi tiết kết quả cuộc gọi, tin nhắn hoặc gặp mặt
              </div>
            </div>
          </div>
        }
        open={interactionModalVisible}
        onCancel={() => setInteractionModalVisible(false)}
        onOk={() => interactionForm.submit()}
        okText={t('common.save')}
        cancelText={t('common.cancel')}
        okButtonProps={{ className: 'btn-primary-gradient', style: { borderRadius: 8, height: 38 } }}
        cancelButtonProps={{ style: { borderRadius: 8, height: 38 } }}
        destroyOnClose
      >
        <Divider style={{ margin: '12px 0 20px' }} />
        <Form form={interactionForm} layout="vertical" onFinish={handleLogInteraction}>
          <Form.Item
            name="interactionType"
            label={t('lead.modal.channel')}
            initialValue="CALL"
            rules={[{ required: true }]}
          >
            <Select style={{ height: 38 }}>
              <Option value="CALL">
                <Space>
                  <PhoneOutlined style={{ color: '#1677ff' }} />
                  Gọi điện thoại (CALL)
                </Space>
              </Option>
              <Option value="MEETING">
                <Space>
                  <TeamOutlined style={{ color: '#52c41a' }} />
                  Gặp trực tiếp tại trung tâm (MEETING)
                </Space>
              </Option>
              <Option value="CHAT">
                <Space>
                  <MessageOutlined style={{ color: '#722ed1' }} />
                  Nhắn tin / Zalo / Messenger (CHAT)
                </Space>
              </Option>
              <Option value="EMAIL">
                <Space>
                  <MailOutlined style={{ color: '#fa8c16' }} />
                  Gửi Email tư vấn (EMAIL)
                </Space>
              </Option>
              <Option value="OTHER">Kênh khác</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="result"
            label={t('lead.modal.result')}
            initialValue="INTERESTED"
            rules={[{ required: true }]}
          >
            <Select style={{ height: 38 }}>
              <Option value="INTERESTED">
                <Tag color="green">Quan tâm (INTERESTED)</Tag>
              </Option>
              <Option value="CONSIDERING">
                <Tag color="orange">Cần suy nghĩ thêm (CONSIDERING)</Tag>
              </Option>
              <Option value="REJECTED">
                <Tag color="red">Từ chối (REJECTED)</Tag>
              </Option>
              <Option value="CANNOT_CONTACT">
                <Tag color="default">Không liên lạc được (CANNOT_CONTACT)</Tag>
              </Option>
            </Select>
          </Form.Item>

          {interactionResult === 'REJECTED' && (
            <Form.Item
              name="rejectReason"
              label={t('lead.modal.rejectReason')}
              rules={[{ required: true, message: 'Bắt buộc chọn lý do từ chối' }]}
            >
              <Select placeholder="Chọn lý do chuẩn hóa" style={{ height: 38 }}>
                <Option value="TUITION_HIGH">Học phí cao hơn ngân sách</Option>
                <Option value="SCHEDULE_MISMATCH">Không phù hợp lịch học</Option>
                <Option value="CHOSE_ANOTHER_CENTER">Đã chọn trung tâm khác</Option>
                <Option value="UNREACHABLE">Gọi nhiều lần không nghe máy</Option>
                <Option value="OTHER">Lý do khác (ghi rõ ở ghi chú)</Option>
              </Select>
            </Form.Item>
          )}

          <Form.Item name="notes" label={t('lead.modal.notes')}>
            <TextArea
              rows={3}
              placeholder="Khách hàng quan tâm khóa học nào, băn khoăn gì, hẹn lịch kiểm tra..."
              style={{ borderRadius: 8 }}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Modal Đánh giá đầu vào ── */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: '#f0fdf4',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FormOutlined style={{ color: '#059669', fontSize: 18 }} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                {t('lead.modal.testTitle')} - Lead: {selectedLead?.fullName}
              </div>
              <div style={{ fontSize: 12, color: '#64748b', fontWeight: 400 }}>
                Ghi nhận điểm số và trình độ khuyến nghị sau kiểm tra đầu vào
              </div>
            </div>
          </div>
        }
        open={placementTestModalVisible}
        onCancel={() => setPlacementTestModalVisible(false)}
        onOk={() => placementTestForm.submit()}
        okText={t('common.save')}
        cancelText={t('common.cancel')}
        okButtonProps={{ className: 'btn-primary-gradient', style: { borderRadius: 8, height: 38 } }}
        cancelButtonProps={{ style: { borderRadius: 8, height: 38 } }}
        destroyOnClose
      >
        <Divider style={{ margin: '12px 0 20px' }} />
        <Form form={placementTestForm} layout="vertical" onFinish={handleRecordPlacementTest}>
          <Form.Item
            name="testStatus"
            label={t('lead.modal.testStatus')}
            initialValue="COMPLETED"
            rules={[{ required: true }]}
          >
            <Select style={{ height: 38 }}>
              <Option value="COMPLETED">
                <Tag color="green">Đã hoàn thành bài test</Tag>
              </Option>
              <Option value="SCHEDULED">
                <Tag color="blue">Đã lên lịch hẹn test</Tag>
              </Option>
              <Option value="REFUSED">
                <Tag color="red">Khách từ chối làm bài</Tag>
              </Option>
              <Option value="NOT_ATTENDED">
                <Tag color="orange">Vắng mặt không đến</Tag>
              </Option>
            </Select>
          </Form.Item>

          {testStatus === 'COMPLETED' && (
            <>
              <Form.Item
                name="testScore"
                label={t('lead.modal.testScore')}
                rules={[{ required: true, message: 'Vui lòng nhập điểm số' }]}
              >
                <InputNumber
                  min={0}
                  max={100}
                  style={{ width: '100%', height: 38, borderRadius: 8 }}
                  placeholder="Thang điểm 10 hoặc 100"
                />
              </Form.Item>
              <Form.Item name="recommendedLevel" label={t('lead.modal.testLevel')}>
                <Input
                  placeholder="VD: B1, Intermediate, N3, IELTS 5.5..."
                  style={{ height: 38, borderRadius: 8 }}
                />
              </Form.Item>
            </>
          )}

          <Form.Item name="notes" label={t('lead.modal.notes')}>
            <TextArea
              rows={2}
              placeholder="Kỹ năng nghe tốt, cần củng cố ngữ pháp..."
              style={{ borderRadius: 8 }}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Modal Chuyển đổi thành Học viên (Idempotent) ── */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: '#ecfdf5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CheckCircleOutlined style={{ color: '#059669', fontSize: 18 }} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                {t('lead.modal.convertTitle')} #{selectedLead?.id}
              </div>
              <div style={{ fontSize: 12, color: '#64748b', fontWeight: 400 }}>
                Chuyển đổi khách hàng tiềm năng thành học viên chính thức
              </div>
            </div>
          </div>
        }
        open={convertModalVisible}
        onCancel={() => setConvertModalVisible(false)}
        onOk={() => convertForm.submit()}
        okText={t('common.confirm')}
        cancelText={t('common.cancel')}
        okButtonProps={{ className: 'btn-success-gradient', style: { borderRadius: 8, height: 38, border: 'none' } }}
        cancelButtonProps={{ style: { borderRadius: 8, height: 38 } }}
        destroyOnClose
      >
        <Divider style={{ margin: '12px 0 16px' }} />
        <Alert
          message={t('lead.modal.convertAlert')}
          description={t('lead.modal.convertAlertDesc')}
          type="info"
          showIcon
          style={{ marginBottom: 16, borderRadius: 8 }}
        />

        <Form form={convertForm} layout="vertical" onFinish={handleConvertToStudent}>
          <Form.Item name="courseId" label={t('lead.modal.courseId')}>
            <InputNumber
              prefix={<BookOutlined style={{ color: '#94a3b8' }} />}
              style={{ width: '100%', height: 38, borderRadius: 8 }}
              placeholder="VD: 1"
            />
          </Form.Item>
          <Form.Item name="classId" label={t('lead.modal.enrollClass')}>
            <InputNumber
              prefix={<TeamOutlined style={{ color: '#94a3b8' }} />}
              style={{ width: '100%', height: 38, borderRadius: 8 }}
              placeholder="VD: 101"
            />
          </Form.Item>
          <Form.Item name="note" label={t('lead.modal.depositNote')}>
            <TextArea
              rows={2}
              placeholder="Đã hoàn tất thanh toán cọc 500k tại phòng tuyển sinh..."
              style={{ borderRadius: 8 }}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Drawer Chi tiết Lead & Lịch sử tương tác ── */}
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <UserAvatar name={selectedLead?.fullName} size={46} />
            <div>
              <div style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.01em' }}>
                {selectedLead?.fullName}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                <Tag
                  color="blue"
                  style={{
                    fontFamily: 'monospace',
                    fontWeight: 600,
                    fontSize: 12,
                    borderRadius: 4,
                  }}
                >
                  #{selectedLead?.id}
                </Tag>
                <StatusTag status={selectedLead?.status || 'NEW'} />
              </div>
            </div>
          </div>
        }
        placement="right"
        width={720}
        open={detailDrawerVisible}
        onClose={() => setDetailDrawerVisible(false)}
        extra={
          <Space>
            <Button
              icon={<CommentOutlined />}
              onClick={() => {
                interactionForm.resetFields();
                setInteractionModalVisible(true);
              }}
              style={{ borderRadius: 8 }}
            >
              {t('lead.interactBtn')}
            </Button>
            <Button
              icon={<FormOutlined />}
              onClick={() => {
                placementTestForm.resetFields();
                setPlacementTestModalVisible(true);
              }}
              style={{ borderRadius: 8 }}
            >
              {t('lead.testBtn')}
            </Button>
          </Space>
        }
      >
        {detailLoading || !leadDetail ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <ReloadOutlined spin style={{ fontSize: 24, color: '#1677ff' }} />
            <p style={{ marginTop: 12, color: '#64748b' }}>{t('common.loading')}</p>
          </div>
        ) : (
          <Tabs
            defaultActiveKey="info"
            items={[
              {
                key: 'info',
                label: (
                  <span>
                    <UserOutlined /> {t('lead.tabProfile')}
                  </span>
                ),
                children: (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <Card
                      size="small"
                      title={t('lead.drawer.contactInfo')}
                      bordered={false}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #f1f5f9',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
                        borderRadius: 10,
                      }}
                    >
                      <Descriptions column={{ xs: 1, sm: 2 }} size="small">
                        <Descriptions.Item label={<Space><UserOutlined /> {t('lead.customer')}</Space>}>
                          <strong>{leadDetail.fullName}</strong>
                        </Descriptions.Item>
                        <Descriptions.Item label={<Space><PhoneOutlined /> {t('lead.phone')}</Space>}>
                          {leadDetail.phone ? (
                            <a href={`tel:${leadDetail.phone}`} style={{ color: '#1677ff', fontWeight: 500 }}>
                              {leadDetail.phone}
                            </a>
                          ) : (
                            '—'
                          )}
                        </Descriptions.Item>
                        <Descriptions.Item label={<Space><MailOutlined /> {t('lead.email')}</Space>}>
                          {leadDetail.email ? (
                            <a href={`mailto:${leadDetail.email}`} style={{ color: '#1677ff' }}>
                              {leadDetail.email}
                            </a>
                          ) : (
                            '—'
                          )}
                        </Descriptions.Item>
                        <Descriptions.Item label={<Space><ClockCircleOutlined /> {t('common.status')}</Space>}>
                          <StatusTag status={leadDetail.status} />
                        </Descriptions.Item>
                      </Descriptions>
                    </Card>

                    <Card
                      size="small"
                      title={t('lead.drawer.needAndAssignment')}
                      bordered={false}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #f1f5f9',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
                        borderRadius: 10,
                      }}
                    >
                      <Descriptions column={{ xs: 1, sm: 2 }} size="small">
                        <Descriptions.Item label={<Space><BookOutlined /> {t('lead.courseInterest')}</Space>}>
                          {leadDetail.courseId ? (
                            <Tag color="processing">Khóa #{leadDetail.courseId}</Tag>
                          ) : (
                            'Chưa xác định'
                          )}
                        </Descriptions.Item>
                        <Descriptions.Item label={<Space><UserSwitchOutlined /> {t('lead.consultant')}</Space>}>
                          {leadDetail.assignedConsultantId ? (
                            <Tag color="blue">TVV #{leadDetail.assignedConsultantId}</Tag>
                          ) : (
                            <Tag color="warning">{t('lead.inQueue')}</Tag>
                          )}
                        </Descriptions.Item>
                        <Descriptions.Item label={<Space><CheckCircleOutlined /> {t('lead.converted')}</Space>}>
                          {leadDetail.studentId ? (
                            <Tag color="cyan" style={{ fontWeight: 600 }}>
                              HV #{leadDetail.studentId}
                            </Tag>
                          ) : (
                            <Tag color="default">{t('lead.notConverted')}</Tag>
                          )}
                        </Descriptions.Item>
                        <Descriptions.Item label={<Space><CalendarOutlined /> {t('common.createdAt')}</Space>}>
                          <DateDisplay value={leadDetail.createdAt} format="long" />
                        </Descriptions.Item>
                      </Descriptions>
                    </Card>

                    {leadDetail.note && (
                      <Card
                        size="small"
                        title={t('lead.modal.notes')}
                        bordered={false}
                        style={{
                          background: '#ffffff',
                          border: '1px solid #f1f5f9',
                          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
                          borderRadius: 10,
                        }}
                      >
                        <div style={{ color: '#334155', fontStyle: 'italic' }}>
                          "{leadDetail.note}"
                        </div>
                      </Card>
                    )}
                  </div>
                ),
              },
              {
                key: 'interactions',
                label: (
                  <span>
                    <CommentOutlined /> {t('lead.tabInteractions')} ({leadDetail.interactions?.length || 0})
                  </span>
                ),
                children: (
                  <div>
                    {(!leadDetail.interactions || leadDetail.interactions.length === 0) ? (
                      <div style={{ textAlign: 'center', padding: '30px 0', color: '#94a3b8' }}>
                        {t('lead.drawer.emptyInteractions')}
                      </div>
                    ) : (
                      <Timeline
                        style={{ marginTop: 12 }}
                        items={leadDetail.interactions.map((it) => ({
                          dot: renderInteractionIcon(it.interactionType),
                          children: (
                            <Card
                              size="small"
                              bordered={false}
                              style={{
                                background: '#ffffff',
                                borderRadius: 10,
                                marginBottom: 12,
                                border: '1px solid #f1f5f9',
                                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Space>
                                  <Tag color="blue" style={{ borderRadius: 4 }}>
                                    {it.interactionType}
                                  </Tag>
                                  <Tag
                                    color={
                                      it.result === 'INTERESTED'
                                        ? 'success'
                                        : it.result === 'REJECTED'
                                        ? 'error'
                                        : 'warning'
                                    }
                                    style={{ borderRadius: 4 }}
                                  >
                                    {it.result}
                                  </Tag>
                                </Space>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                  <DateDisplay value={it.createdAt} format="long" />
                                </Text>
                              </div>

                              {it.rejectReason && (
                                <Alert
                                  message={`Lý do từ chối: ${it.rejectReason}`}
                                  type="error"
                                  showIcon
                                  style={{ marginTop: 8, padding: '4px 8px', fontSize: 12, borderRadius: 6 }}
                                />
                              )}

                              {it.notes && (
                                <div style={{ marginTop: 8, color: '#334155', fontSize: 13 }}>
                                  {it.notes}
                                </div>
                              )}

                              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 8 }}>
                                TVV #{it.performedBy || 'System'}
                              </div>
                            </Card>
                          ),
                        }))}
                      />
                    )}
                  </div>
                ),
              },
              {
                key: 'tests',
                label: (
                  <span>
                    <FormOutlined /> {t('lead.tabTests')} ({leadDetail.placementTests?.length || 0})
                  </span>
                ),
                children: (
                  <div>
                    {(!leadDetail.placementTests || leadDetail.placementTests.length === 0) ? (
                      <div style={{ textAlign: 'center', padding: '30px 0', color: '#94a3b8' }}>
                        {t('lead.drawer.emptyTests')}
                      </div>
                    ) : (
                      <Timeline
                        style={{ marginTop: 12 }}
                        items={leadDetail.placementTests.map((tItem) => ({
                          color: tItem.testStatus === 'COMPLETED' ? 'green' : 'blue',
                          children: (
                            <Card
                              size="small"
                              bordered={false}
                              style={{
                                background: '#ffffff',
                                borderRadius: 10,
                                marginBottom: 12,
                                border: '1px solid #f1f5f9',
                                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Space>
                                  <Tag
                                    color={tItem.testStatus === 'COMPLETED' ? 'green' : 'blue'}
                                    style={{ borderRadius: 4 }}
                                  >
                                    {tItem.testStatus}
                                  </Tag>
                                  {tItem.testScore !== undefined && (
                                    <Tag color="gold" style={{ fontWeight: 700, borderRadius: 4 }}>
                                      {t('lead.modal.testScore')}: {tItem.testScore}
                                    </Tag>
                                  )}
                                  {tItem.recommendedLevel && (
                                    <Tag color="cyan" style={{ borderRadius: 4 }}>
                                      Level: {tItem.recommendedLevel}
                                    </Tag>
                                  )}
                                </Space>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                  <DateDisplay value={tItem.createdAt} format="long" />
                                </Text>
                              </div>
                              {tItem.notes && (
                                <div style={{ marginTop: 8, color: '#334155', fontSize: 13 }}>
                                  {tItem.notes}
                                </div>
                              )}
                            </Card>
                          ),
                        }))}
                      />
                    )}
                  </div>
                ),
              },
              {
                key: 'logs',
                label: (
                  <span>
                    <FileTextOutlined /> {t('lead.tabLogs')}
                  </span>
                ),
                children: (
                  <div style={{ marginTop: 12 }}>
                    <Title level={5} style={{ fontSize: 14 }}>
                      {t('lead.drawer.auditTitle')}
                    </Title>
                    <Timeline
                      items={[
                        ...(leadDetail.statusLogs || []).map((l) => ({
                          color: 'blue',
                          children: (
                            <div>
                              <Space>
                                <Tag>{l.oldStatus || 'NONE'}</Tag>
                                <span>➔</span>
                                <StatusTag status={l.newStatus} />
                              </Space>
                              {l.reason && (
                                <div style={{ marginTop: 4, color: '#64748b' }}>{l.reason}</div>
                              )}
                              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                                <DateDisplay value={l.changedAt} format="long" />
                              </div>
                            </div>
                          ),
                        })),
                        ...(leadDetail.assignmentLogs || []).map((a) => ({
                          color: 'purple',
                          children: (
                            <div>
                              <Space>
                                <Tag color="default">
                                  {a.oldConsultantId ? `TVV #${a.oldConsultantId}` : t('lead.inQueue')}
                                </Tag>
                                <span>➔</span>
                                <Tag color="blue">TVV #{a.newConsultantId}</Tag>
                              </Space>
                              {a.reason && (
                                <div style={{ marginTop: 4, color: '#64748b' }}>{a.reason}</div>
                              )}
                              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                                <DateDisplay value={a.changedAt} format="long" />
                              </div>
                            </div>
                          ),
                        })),
                      ]}
                    />
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

export default LeadListPage;
