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
  EditOutlined,
  UsergroupAddOutlined,
  DeleteOutlined,
  UserOutlined,
  CheckCircleOutlined,
  StopOutlined,
  PhoneOutlined,
  MailOutlined,
  CalendarOutlined,
  HomeOutlined,
  ClearOutlined,
  SyncOutlined,
  BookOutlined,
  FileTextOutlined,
  TeamOutlined,
  LinkOutlined,
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

import { studentApi } from '@/services/api/students';
import type {
  Student,
  StudentDetail,
  StudentStatus,
  StudentCreatePayload,
  StudentUpdatePayload,
  GuardianPayload,
} from '@/services/types/student';

const { Option } = Select;
const { TextArea } = Input;
const { Text, Title } = Typography;

interface StudentStats {
  total: number;
  activeCount: number;
  inactiveCount: number;
}

const StudentListPage = () => {
  const { t } = useTranslation();

  // ══════════════════════════════════════════════════════════════
  // STATE
  // ══════════════════════════════════════════════════════════════
  const [data, setData] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<StudentStatus | undefined>();

  // Metrics
  const [stats, setStats] = useState<StudentStats>({
    total: 0,
    activeCount: 0,
    inactiveCount: 0,
  });

  // Modals & Drawer
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [updateModalVisible, setUpdateModalVisible] = useState(false);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [guardianModalVisible, setGuardianModalVisible] = useState(false);
  const [detailDrawerVisible, setDetailDrawerVisible] = useState(false);

  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentDetail, setStudentDetail] = useState<StudentDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [createForm] = Form.useForm();
  const [updateForm] = Form.useForm();
  const [statusForm] = Form.useForm();
  const [guardianForm] = Form.useForm();

  // ══════════════════════════════════════════════════════════════
  // FETCH STATS
  // ══════════════════════════════════════════════════════════════
  const fetchStats = useCallback(async () => {
    try {
      const [allRes, activeRes, inactiveRes] = await Promise.all([
        studentApi.search({ page: 0, size: 1 }),
        studentApi.search({ page: 0, size: 1, status: 'ACTIVE' }),
        studentApi.search({ page: 0, size: 1, status: 'INACTIVE' }),
      ]);
      setStats({
        total: allRes.totalElements,
        activeCount: activeRes.totalElements,
        inactiveCount: inactiveRes.totalElements,
      });
    } catch {
      // Fallback silently
    }
  }, []);

  // ══════════════════════════════════════════════════════════════
  // FETCH DATA
  // ══════════════════════════════════════════════════════════════
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await studentApi.search({
        search: keyword.trim() || undefined,
        status: statusFilter,
        page,
        size: pageSize,
        sortBy: 'createdAt',
        direction: 'desc',
      });
      setData(res.content);
      setTotal(res.totalElements);
    } catch (err) {
      const e = err as { message?: string };
      toast.error(e?.message || 'Không thể tải danh sách học viên');
      setData([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, keyword, statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    setPage(0);
  }, [keyword, statusFilter]);

  const handleRefresh = () => {
    fetchData();
    fetchStats();
    toast.success('Đã làm mới dữ liệu học viên');
  };

  const handleResetFilters = () => {
    setKeyword('');
    setStatusFilter(undefined);
    setPage(0);
  };

  const loadStudentDetail = async (id: number) => {
    setDetailLoading(true);
    try {
      const detail = await studentApi.getDetailById(id);
      setStudentDetail(detail);
    } catch (err) {
      const e = err as { message?: string };
      toast.error(e?.message || 'Không thể tải chi tiết học viên');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleOpenDetail = (student: Student) => {
    setSelectedStudent(student);
    setDetailDrawerVisible(true);
    loadStudentDetail(student.id);
  };

  // ══════════════════════════════════════════════════════════════
  // HANDLERS
  // ══════════════════════════════════════════════════════════════
  const handleCreateStudent = async (values: StudentCreatePayload) => {
    try {
      const res = await studentApi.create(values);
      toast.success(`Tạo học viên thành công! Mã: ${res.studentCode}`);
      setCreateModalVisible(false);
      createForm.resetFields();
      fetchData();
      fetchStats();
    } catch (err) {
      const e = err as { message?: string };
      toast.error(e?.message || 'Tạo học viên thất bại');
    }
  };

  const handleUpdateStudent = async (values: StudentUpdatePayload) => {
    if (!selectedStudent) return;
    try {
      await studentApi.update(selectedStudent.id, values);
      toast.success('Cập nhật thông tin học viên thành công');
      setUpdateModalVisible(false);
      updateForm.resetFields();
      fetchData();
      fetchStats();
      if (detailDrawerVisible) loadStudentDetail(selectedStudent.id);
    } catch (err) {
      const e = err as { message?: string };
      toast.error(e?.message || 'Cập nhật thất bại');
    }
  };

  const handleUpdateStatus = async (values: { status: StudentStatus; reason: string }) => {
    if (!selectedStudent) return;
    try {
      await studentApi.updateStatus(selectedStudent.id, values);
      toast.success('Cập nhật trạng thái thành công');
      setStatusModalVisible(false);
      statusForm.resetFields();
      fetchData();
      fetchStats();
      if (detailDrawerVisible) loadStudentDetail(selectedStudent.id);
    } catch (err) {
      const e = err as { message?: string };
      toast.error(e?.message || 'Đổi trạng thái thất bại');
    }
  };

  const handleAddGuardian = async (values: GuardianPayload) => {
    if (!selectedStudent) return;
    try {
      await studentApi.addGuardian(selectedStudent.id, values);
      toast.success('Thêm người giám hộ thành công');
      setGuardianModalVisible(false);
      guardianForm.resetFields();
      if (detailDrawerVisible) loadStudentDetail(selectedStudent.id);
    } catch (err) {
      const e = err as { message?: string };
      toast.error(e?.message || 'Thêm người giám hộ thất bại');
    }
  };

  const handleDeleteGuardian = async (guardianId: number) => {
    if (!selectedStudent) return;
    try {
      await studentApi.deleteGuardian(selectedStudent.id, guardianId);
      toast.success('Đã xóa người giám hộ');
      if (detailDrawerVisible) loadStudentDetail(selectedStudent.id);
    } catch (err) {
      const e = err as { message?: string };
      toast.error(e?.message || 'Xóa người giám hộ thất bại');
    }
  };

  const handleDeleteStudent = async (id: number) => {
    try {
      await studentApi.delete(id);
      toast.success('Đã chuyển học viên sang trạng thái INACTIVE');
      fetchData();
      fetchStats();
    } catch (err) {
      const e = err as { message?: string };
      toast.error(e?.message || 'Thao tác thất bại');
    }
  };

  // ══════════════════════════════════════════════════════════════
  // COLUMNS
  // ══════════════════════════════════════════════════════════════
  const columns: ColumnsType<Student> = useMemo(
    () => [
      {
        title: t('student.code'),
        dataIndex: 'studentCode',
        width: 150,
        render: (code: string, record: Student) => (
          <Tag
            color="blue"
            style={{
              fontFamily: 'monospace',
              fontWeight: 700,
              fontSize: 13,
              borderRadius: 6,
              padding: '2px 8px',
              cursor: 'pointer',
            }}
            onClick={() => handleOpenDetail(record)}
          >
            {code}
          </Tag>
        ),
      },
      {
        title: t('student.fullName'),
        key: 'student',
        width: 250,
        render: (_, record: Student) => (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <UserAvatar name={record.fullName} size={36} />
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: 14,
                  color: '#0f172a',
                  cursor: 'pointer',
                  lineHeight: 1.3,
                }}
                onClick={() => handleOpenDetail(record)}
              >
                {record.fullName}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                {record.phone && (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    <PhoneOutlined style={{ marginRight: 3, color: '#94a3b8' }} />
                    {record.phone}
                  </Text>
                )}
                {record.email && (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    <MailOutlined style={{ marginRight: 3, color: '#94a3b8' }} />
                    {record.email}
                  </Text>
                )}
              </div>
            </div>
          </div>
        ),
      },
      {
        title: t('student.dob'),
        dataIndex: 'dateOfBirth',
        width: 130,
        render: (dob?: string) =>
          dob ? (
            <Space size={4}>
              <CalendarOutlined style={{ color: '#94a3b8', fontSize: 12 }} />
              <span>{dob}</span>
            </Space>
          ) : (
            <Text type="secondary">—</Text>
          ),
      },
      {
        title: t('common.status'),
        dataIndex: 'status',
        width: 140,
        render: (status: StudentStatus) => (
          <Tag
            color={status === 'ACTIVE' ? 'success' : 'default'}
            style={{
              borderRadius: 12,
              padding: '2px 10px',
              fontWeight: 500,
            }}
          >
            {status === 'ACTIVE' ? t('status.ACTIVE') : t('status.INACTIVE')}
          </Tag>
        ),
      },
      {
        title: t('student.origin'),
        dataIndex: 'leadId',
        width: 150,
        render: (leadId?: number) =>
          leadId ? (
            <Tag
              color="cyan"
              icon={<LinkOutlined />}
              style={{ borderRadius: 12, padding: '2px 8px' }}
            >
              {t('student.fromLead')} #{leadId}
            </Tag>
          ) : (
            <Tag color="default" style={{ borderRadius: 12, padding: '2px 8px' }}>
              {t('student.direct')}
            </Tag>
          ),
      },
      {
        title: t('student.enrollDate'),
        dataIndex: 'createdAt',
        width: 140,
        render: (date: string) => <DateDisplay value={date} format="short" />,
      },
      {
        title: t('common.actions'),
        key: 'actions',
        fixed: 'right',
        width: 180,
        render: (_, record: Student) => (
          <Space size={2}>
            <Tooltip title={t('student.tooltip.view')}>
              <Button
                type="text"
                shape="circle"
                className="action-btn-circle"
                icon={<EyeOutlined style={{ color: '#1677ff', fontSize: 15 }} />}
                onClick={() => handleOpenDetail(record)}
              />
            </Tooltip>

            <Tooltip title={t('student.tooltip.edit')}>
              <Button
                type="text"
                shape="circle"
                className="action-btn-circle"
                icon={<EditOutlined style={{ color: '#fa8c16', fontSize: 15 }} />}
                onClick={() => {
                  setSelectedStudent(record);
                  updateForm.setFieldsValue({
                    fullName: record.fullName,
                    phone: record.phone,
                    email: record.email,
                    dateOfBirth: record.dateOfBirth,
                    address: record.address,
                  });
                  setUpdateModalVisible(true);
                }}
              />
            </Tooltip>

            <Tooltip title={t('student.tooltip.changeStatus')}>
              <Button
                type="text"
                shape="circle"
                className="action-btn-circle"
                icon={<SyncOutlined style={{ color: '#52c41a', fontSize: 15 }} />}
                onClick={() => {
                  setSelectedStudent(record);
                  statusForm.setFieldsValue({
                    status: record.status,
                  });
                  setStatusModalVisible(true);
                }}
              />
            </Tooltip>

            <Tooltip title={t('student.tooltip.addGuardian')}>
              <Button
                type="text"
                shape="circle"
                className="action-btn-circle"
                icon={<UsergroupAddOutlined style={{ color: '#722ed1', fontSize: 15 }} />}
                onClick={() => {
                  setSelectedStudent(record);
                  guardianForm.resetFields();
                  setGuardianModalVisible(true);
                }}
              />
            </Tooltip>

            <Popconfirm
              title={t('student.popconfirm.inactivateTitle')}
              description={t('student.popconfirm.inactivateDesc')}
              onConfirm={() => handleDeleteStudent(record.id)}
              okText={t('common.confirm')}
              cancelText={t('common.cancel')}
              okButtonProps={{ danger: true }}
            >
              <Tooltip title={t('student.tooltip.inactivate')}>
                <Button
                  type="text"
                  danger
                  shape="circle"
                  className="action-btn-circle"
                  icon={<DeleteOutlined style={{ fontSize: 15 }} />}
                />
              </Tooltip>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [t, updateForm, statusForm, guardianForm]
  );

  const hasActiveFilters = Boolean(keyword || statusFilter);

  return (
    <PageContainer>
      <PageHeader
        title={t('student.title')}
        subtitle={t('student.subtitle')}
        extra={
          <Space>
            <Button
              icon={<ReloadOutlined spin={loading} />}
              onClick={handleRefresh}
              style={{ borderRadius: 6 }}
            >
              {t('common.refresh')}
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setCreateModalVisible(true)}
              style={{
                borderRadius: 6,
                background: 'linear-gradient(135deg, #1677ff 0%, #0958d9 100%)',
                border: 'none',
                boxShadow: '0 2px 6px rgba(22, 119, 255, 0.3)',
              }}
            >
              {t('student.create')}
            </Button>
          </Space>
        }
      />

      {/* ── KPI Metric Cards ── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={12} lg={8}>
          <StatsCard
            title={t('student.total')}
            value={stats.total}
            icon={<UserOutlined />}
            color="#1677ff"
            bgColor="#eff6ff"
            active={!statusFilter}
            onClick={() => setStatusFilter(undefined)}
            tooltip={t('student.stats.allTooltip')}
          />
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <StatsCard
            title={t('student.active')}
            value={stats.activeCount}
            icon={<CheckCircleOutlined />}
            color="#10b981"
            bgColor="#ecfdf5"
            active={statusFilter === 'ACTIVE'}
            onClick={() => setStatusFilter(statusFilter === 'ACTIVE' ? undefined : 'ACTIVE')}
            tagText={t('status.ACTIVE')}
            tagColor="success"
            tooltip={t('student.stats.activeTooltip')}
          />
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <StatsCard
            title={t('student.inactive')}
            value={stats.inactiveCount}
            icon={<StopOutlined />}
            color="#ef4444"
            bgColor="#fef2f2"
            active={statusFilter === 'INACTIVE'}
            onClick={() => setStatusFilter(statusFilter === 'INACTIVE' ? undefined : 'INACTIVE')}
            tagText={t('status.INACTIVE')}
            tagColor="error"
            tooltip={t('student.stats.inactiveTooltip')}
          />
        </Col>
      </Row>

      {/* ── Table & Filters ── */}
      <Card
        bordered={false}
        style={{
          borderRadius: 12,
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
          background: '#ffffff',
        }}
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
          searchPlaceholder={t('student.filter.searchPlaceholder')}
          extra={
            <Space wrap size={10}>
              <Select
                placeholder={t('student.filter.status')}
                allowClear
                style={{ width: 180 }}
                value={statusFilter}
                onChange={setStatusFilter}
              >
                <Option value="ACTIVE">
                  <Badge status="success" text={t('student.filter.active')} />
                </Option>
                <Option value="INACTIVE">
                  <Badge status="error" text={t('student.filter.inactive')} />
                </Option>
              </Select>

              {hasActiveFilters && (
                <Button
                  icon={<ClearOutlined />}
                  onClick={handleResetFilters}
                  style={{ borderRadius: 6 }}
                >
                  {t('common.clearFilter')}
                </Button>
              )}
            </Space>
          }
        />
      </Card>

      {/* ── Modal Thêm học viên ── */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <UserOutlined style={{ color: '#1677ff' }} />
            <span>{t('student.modal.createTitle')}</span>
          </div>
        }
        open={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        onOk={() => createForm.submit()}
        okText={t('student.create')}
        cancelText={t('common.cancel')}
        destroyOnClose
      >
        <Divider style={{ margin: '12px 0 16px' }} />
        <Alert
          message={t('student.modal.codeRuleAlert')}
          description={t('student.modal.codeRuleDesc')}
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Form form={createForm} layout="vertical" onFinish={handleCreateStudent}>
          <Form.Item
            name="fullName"
            label={t('student.fullName')}
            rules={[{ required: true, message: 'Vui lòng nhập họ và tên' }]}
          >
            <Input prefix={<UserOutlined style={{ color: '#94a3b8' }} />} placeholder={t('student.modal.namePlaceholder')} />
          </Form.Item>
          <Form.Item name="phone" label={t('student.phone')}>
            <Input prefix={<PhoneOutlined style={{ color: '#94a3b8' }} />} placeholder={t('student.modal.phonePlaceholder')} />
          </Form.Item>
          <Form.Item name="email" label={t('student.email')} rules={[{ type: 'email' }]}>
            <Input prefix={<MailOutlined style={{ color: '#94a3b8' }} />} placeholder={t('student.modal.emailPlaceholder')} />
          </Form.Item>
          <Form.Item name="dateOfBirth" label={t('student.modal.dob')}>
            <Input prefix={<CalendarOutlined style={{ color: '#94a3b8' }} />} placeholder="2005-08-20" />
          </Form.Item>
          <Form.Item name="address" label={t('student.modal.address')}>
            <TextArea rows={2} placeholder={t('student.modal.addressPlaceholder')} />
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Modal Sửa học viên ── */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <EditOutlined style={{ color: '#fa8c16' }} />
            <span>{t('student.modal.editTitle')}: {selectedStudent?.studentCode}</span>
          </div>
        }
        open={updateModalVisible}
        onCancel={() => setUpdateModalVisible(false)}
        onOk={() => updateForm.submit()}
        okText={t('common.save')}
        cancelText={t('common.cancel')}
        destroyOnClose
      >
        <Divider style={{ margin: '12px 0 20px' }} />
        <Form form={updateForm} layout="vertical" onFinish={handleUpdateStudent}>
          <Form.Item
            name="fullName"
            label={t('student.fullName')}
            rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}
          >
            <Input prefix={<UserOutlined style={{ color: '#94a3b8' }} />} />
          </Form.Item>
          <Form.Item name="phone" label={t('student.phone')}>
            <Input prefix={<PhoneOutlined style={{ color: '#94a3b8' }} />} />
          </Form.Item>
          <Form.Item name="email" label={t('student.email')} rules={[{ type: 'email' }]}>
            <Input prefix={<MailOutlined style={{ color: '#94a3b8' }} />} />
          </Form.Item>
          <Form.Item name="dateOfBirth" label={t('student.modal.dob')}>
            <Input prefix={<CalendarOutlined style={{ color: '#94a3b8' }} />} placeholder="YYYY-MM-DD" />
          </Form.Item>
          <Form.Item name="address" label={t('student.modal.address')}>
            <TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Modal Đổi trạng thái ── */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <SyncOutlined style={{ color: '#52c41a' }} />
            <span>{t('student.modal.statusTitle')}: {selectedStudent?.studentCode}</span>
          </div>
        }
        open={statusModalVisible}
        onCancel={() => setStatusModalVisible(false)}
        onOk={() => statusForm.submit()}
        okText={t('common.save')}
        cancelText={t('common.cancel')}
        destroyOnClose
      >
        <Divider style={{ margin: '12px 0 20px' }} />
        <Form form={statusForm} layout="vertical" onFinish={handleUpdateStatus}>
          <Form.Item
            name="status"
            label={t('student.modal.statusNew')}
            rules={[{ required: true, message: 'Vui lòng chọn trạng thái' }]}
          >
            <Select>
              <Option value="ACTIVE">
                <Tag color="success">{t('student.filter.active')}</Tag>
              </Option>
              <Option value="INACTIVE">
                <Tag color="error">{t('student.filter.inactive')}</Tag>
              </Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="reason"
            label={t('student.modal.statusReason')}
            rules={[{ required: true, message: 'Bắt buộc nhập lý do thay đổi trạng thái' }]}
          >
            <TextArea rows={3} placeholder={t('student.modal.reasonPlaceholder')} />
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Modal Thêm Người giám hộ ── */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <UsergroupAddOutlined style={{ color: '#722ed1' }} />
            <span>{t('student.modal.guardianTitle')}: {selectedStudent?.studentCode}</span>
          </div>
        }
        open={guardianModalVisible}
        onCancel={() => setGuardianModalVisible(false)}
        onOk={() => guardianForm.submit()}
        okText={t('student.addGuardian')}
        cancelText={t('common.cancel')}
        destroyOnClose
      >
        <Divider style={{ margin: '12px 0 20px' }} />
        <Form form={guardianForm} layout="vertical" onFinish={handleAddGuardian}>
          <Form.Item
            name="fullName"
            label={t('student.modal.guardianName')}
            rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}
          >
            <Input prefix={<UserOutlined style={{ color: '#94a3b8' }} />} placeholder="Nguyễn Văn B" />
          </Form.Item>
          <Form.Item
            name="relationship"
            label={t('student.modal.guardianRelation')}
            rules={[{ required: true, message: 'Vui lòng chọn hoặc nhập quan hệ' }]}
          >
            <Select placeholder={t('student.modal.guardianRelation')}>
              <Option value="Cha">Cha</Option>
              <Option value="Mẹ">Mẹ</Option>
              <Option value="Anh/Chị">Anh/Chị</Option>
              <Option value="Người bảo hộ">Người bảo hộ hợp pháp</Option>
              <Option value="Khác">Khác</Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="phone"
            label={t('student.modal.guardianPhone')}
            rules={[{ required: true, message: 'Vui lòng nhập số điện thoại' }]}
          >
            <Input prefix={<PhoneOutlined style={{ color: '#94a3b8' }} />} placeholder="0909888999" />
          </Form.Item>
          <Form.Item name="email" label={t('student.modal.guardianEmail')} rules={[{ type: 'email' }]}>
            <Input prefix={<MailOutlined style={{ color: '#94a3b8' }} />} placeholder="phuhuynh@example.com" />
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Drawer Chi tiết Học viên ── */}
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <UserAvatar name={selectedStudent?.fullName} size={42} />
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                {selectedStudent?.fullName}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                <Tag
                  color="blue"
                  style={{
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    borderRadius: 4,
                  }}
                >
                  {selectedStudent?.studentCode}
                </Tag>
                <StatusTag status={selectedStudent?.status || 'ACTIVE'} />
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
              type="primary"
              icon={<UsergroupAddOutlined />}
              onClick={() => {
                guardianForm.resetFields();
                setGuardianModalVisible(true);
              }}
              style={{
                borderRadius: 6,
                background: 'linear-gradient(135deg, #1677ff 0%, #0958d9 100%)',
                border: 'none',
              }}
            >
              {t('student.addGuardian')}
            </Button>
          </Space>
        }
      >
        {detailLoading || !studentDetail ? (
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
                    <UserOutlined /> {t('student.tabProfile')}
                  </span>
                ),
                children: (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <Card size="small" title={t('student.drawer.basicInfo')} bordered={false} style={{ background: '#f8fafc' }}>
                      <Descriptions column={{ xs: 1, sm: 2 }} size="small">
                        <Descriptions.Item label={t('student.code')}>
                          <Tag
                            color="blue"
                            style={{
                              fontFamily: 'monospace',
                              fontWeight: 700,
                              fontSize: 13,
                              borderRadius: 4,
                            }}
                          >
                            {studentDetail.studentCode}
                          </Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label={t('common.status')}>
                          <StatusTag status={studentDetail.status} />
                        </Descriptions.Item>
                        <Descriptions.Item label={t('student.fullName')}>
                          <strong>{studentDetail.fullName}</strong>
                        </Descriptions.Item>
                        <Descriptions.Item label={t('student.phone')}>
                          {studentDetail.phone ? (
                            <a href={`tel:${studentDetail.phone}`} style={{ color: '#1677ff', fontWeight: 500 }}>
                              {studentDetail.phone}
                            </a>
                          ) : (
                            '—'
                          )}
                        </Descriptions.Item>
                        <Descriptions.Item label={t('student.email')}>{studentDetail.email || '—'}</Descriptions.Item>
                        <Descriptions.Item label={t('student.dob')}>{studentDetail.dateOfBirth || '—'}</Descriptions.Item>
                        <Descriptions.Item label={t('student.origin')}>
                          {studentDetail.leadId ? (
                            <Tag color="cyan">{t('student.fromLead')} #{studentDetail.leadId}</Tag>
                          ) : (
                            <Tag color="default">{t('student.direct')}</Tag>
                          )}
                        </Descriptions.Item>
                        <Descriptions.Item label={t('student.enrollDate')}>
                          <DateDisplay value={studentDetail.createdAt} format="long" />
                        </Descriptions.Item>
                      </Descriptions>
                    </Card>

                    <Card size="small" title={t('student.drawer.address')} bordered={false} style={{ background: '#f8fafc' }}>
                      <Space>
                        <HomeOutlined style={{ color: '#94a3b8' }} />
                        <span>{studentDetail.address || '—'}</span>
                      </Space>
                    </Card>
                  </div>
                ),
              },
              {
                key: 'guardians',
                label: (
                  <span>
                    <TeamOutlined /> {t('student.tabGuardians')} ({studentDetail.guardians?.length || 0})
                  </span>
                ),
                children: (
                  <div style={{ marginTop: 8 }}>
                    {(!studentDetail.guardians || studentDetail.guardians.length === 0) ? (
                      <div style={{ textAlign: 'center', padding: '30px 0', color: '#94a3b8' }}>
                        {t('student.drawer.emptyGuardians')}
                      </div>
                    ) : (
                      <Row gutter={[12, 12]}>
                        {studentDetail.guardians.map((g) => (
                          <Col xs={24} key={g.id}>
                            <Card
                              size="small"
                              bordered={false}
                              style={{
                                background: '#f8fafc',
                                borderRadius: 8,
                                border: '1px solid #e2e8f0',
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Space>
                                  <UserAvatar name={g.fullName} size={32} />
                                  <div>
                                    <div style={{ fontWeight: 600, color: '#0f172a' }}>{g.fullName}</div>
                                    <Tag color="blue" style={{ fontSize: 11, borderRadius: 4, marginTop: 2 }}>
                                      {g.relationship}
                                    </Tag>
                                  </div>
                                </Space>
                                <Popconfirm
                                  title={t('student.popconfirm.deleteGuardianTitle')}
                                  onConfirm={() => handleDeleteGuardian(g.id)}
                                  okText={t('common.delete')}
                                  cancelText={t('common.cancel')}
                                  okButtonProps={{ danger: true }}
                                >
                                  <Button danger type="text" shape="circle" icon={<DeleteOutlined />} size="small" />
                                </Popconfirm>
                              </div>
                              <Divider style={{ margin: '8px 0' }} />
                              <div style={{ display: 'flex', gap: 16, fontSize: 13 }}>
                                <Space size={4}>
                                  <PhoneOutlined style={{ color: '#94a3b8' }} />
                                  <a href={`tel:${g.phone}`} style={{ color: '#1677ff' }}>
                                    {g.phone}
                                  </a>
                                </Space>
                                {g.email && (
                                  <Space size={4}>
                                    <MailOutlined style={{ color: '#94a3b8' }} />
                                    <span>{g.email}</span>
                                  </Space>
                                )}
                              </div>
                            </Card>
                          </Col>
                        ))}
                      </Row>
                    )}
                  </div>
                ),
              },
              {
                key: 'history',
                label: (
                  <span>
                    <BookOutlined /> {t('student.tabHistory')} ({studentDetail.academicHistories?.length || 0})
                  </span>
                ),
                children: (
                  <div>
                    {(!studentDetail.academicHistories || studentDetail.academicHistories.length === 0) ? (
                      <div style={{ textAlign: 'center', padding: '30px 0', color: '#94a3b8' }}>
                        {t('student.drawer.emptyHistory')}
                      </div>
                    ) : (
                      <Timeline
                        style={{ marginTop: 12 }}
                        items={studentDetail.academicHistories.map((h) => ({
                          color: 'green',
                          children: (
                            <Card
                              size="small"
                              bordered={false}
                              style={{
                                background: '#f8fafc',
                                borderRadius: 8,
                                marginBottom: 12,
                                border: '1px solid #e2e8f0',
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Space>
                                  <Tag color="blue" style={{ borderRadius: 4 }}>
                                    Course #{h.courseId || '—'}
                                  </Tag>
                                  {h.classId && (
                                    <Tag color="cyan" style={{ borderRadius: 4 }}>
                                      Class #{h.classId}
                                    </Tag>
                                  )}
                                  {h.finalGrade !== undefined && (
                                    <Tag color="gold" style={{ fontWeight: 700, borderRadius: 4 }}>
                                      Grade: {h.finalGrade}
                                    </Tag>
                                  )}
                                </Space>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                  <DateDisplay value={h.createdAt} format="long" />
                                </Text>
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
                key: 'logs',
                label: (
                  <span>
                    <FileTextOutlined /> {t('student.tabLogs')}
                  </span>
                ),
                children: (
                  <div style={{ marginTop: 12 }}>
                    <Title level={5} style={{ fontSize: 14 }}>
                      {t('student.drawer.auditTitle')}
                    </Title>
                    <Timeline
                      items={(studentDetail.statusLogs || []).map((l) => ({
                        children: (
                          <div style={{ marginBottom: 6 }}>
                            <Space>
                              <Tag>{l.oldStatus || 'NONE'}</Tag>
                              <span>➔</span>
                              <StatusTag status={l.newStatus} />
                            </Space>
                            {l.reason && (
                              <div style={{ marginTop: 4, color: '#334155' }}>
                                {t('student.drawer.reason')}: {l.reason}
                              </div>
                            )}
                            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                              {t('student.drawer.updatedBy')}: #{l.changedBy || 'System'} |{' '}
                              <DateDisplay value={l.changedAt} format="long" />
                            </div>
                          </div>
                        ),
                      }))}
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

export default StudentListPage;
