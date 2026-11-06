import { useCallback, useEffect, useState } from 'react';
import {
  Alert, Button, DatePicker, Descriptions, Divider, Form, Input, InputNumber, Modal, Popconfirm,
  Select, Space, Table, Tabs, Tag, Tooltip, Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { EditOutlined, EyeOutlined, HistoryOutlined } from '@ant-design/icons';
import { Link, useSearchParams } from 'react-router-dom';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import { enrollmentApi } from '@/services/api/enrollment';
import EnrollmentStatusTag from '@/components/enrollment/EnrollmentStatusTag';
import { ENROLLMENT_STATUS_LABEL } from '@/constants/enrollment';
import { showError } from '@/utils/errorHelper';
import type { CourseStatus, CourseType } from '@/services/types/course/enums';
import type { EnrollmentResponse, EnrollmentStatus, EnrollmentStatusLogResponse } from '@/services/types/enrollment';

const { Text } = Typography;
const enrollmentStatuses: EnrollmentStatus[] = ['PENDING', 'ACTIVE', 'RESERVED', 'TERMINATED', 'COMPLETED'];

interface CourseEnrollmentListProps {
  courseId: number;
  courseType: CourseType;
  courseStatus: CourseStatus;
}

/** Tab học viên trong khóa học; thao tác vòng đời được thực hiện trong ngữ cảnh khóa này. */
export default function CourseEnrollmentList({ courseId, courseType, courseStatus }: CourseEnrollmentListProps) {
  const isOnline = courseType === 'ONLINE';
  const [searchParams, setSearchParams] = useSearchParams();
  const studentId = searchParams.get('studentId') || undefined;
  const accountId = searchParams.get('accountId') || undefined;
  const isFilteredToStudent = Boolean(studentId || accountId);
  const requestedStatus = searchParams.get('status') as EnrollmentStatus | null;

  const [rows, setRows] = useState<EnrollmentResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeStatus, setActiveStatus] = useState<EnrollmentStatus | undefined>(
    requestedStatus && enrollmentStatuses.includes(requestedStatus) ? requestedStatus : undefined,
  );
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [pageNumber, setPageNumber] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);

  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedEnrollment, setSelectedEnrollment] = useState<EnrollmentResponse | null>(null);
  const [history, setHistory] = useState<EnrollmentStatusLogResponse[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedCompleteIds, setSelectedCompleteIds] = useState<number[]>([]);
  const [completing, setCompleting] = useState(false);
  const [form] = Form.useForm();
  const editAction = Form.useWatch('editAction', form);

  const filteredStudentName = rows[0]?.studentName
    || (studentId ? `Học viên #${studentId}` : `Tài khoản #${accountId}`);
  const filteredStudentCode = rows[0]?.studentCode;

  const loadEnrollments = useCallback(async () => {
    setLoading(true);
    try {
      const page = await enrollmentApi.search({
        courseId, page: pageNumber, size: pageSize,
        status: activeStatus,
        search: search || undefined,
        studentId: studentId ? Number(studentId) : undefined,
        accountId: accountId ? Number(accountId) : undefined,
        includeCompletionEligibility: courseStatus === 'FINISHED' && !isOnline,
      });
      setRows(page.content ?? []);
      setTotal(page.totalElements ?? 0);
    } catch (err) {
      showError(err, 'Không tải được danh sách học viên ghi danh');
    } finally {
      setLoading(false);
    }
  }, [accountId, activeStatus, courseId, courseStatus, isOnline, pageNumber, pageSize, search, studentId]);

  useEffect(() => {
    void loadEnrollments();
  }, [loadEnrollments]);

  useEffect(() => {
    setSelectedCompleteIds([]);
  }, [courseId, courseStatus]);

  useEffect(() => {
    if (requestedStatus && enrollmentStatuses.includes(requestedStatus)) {
      setActiveStatus(requestedStatus);
      setPageNumber(0);
    } else if (!requestedStatus) {
      setActiveStatus(undefined);
      setPageNumber(0);
    }
  }, [requestedStatus]);

  const openDetails = (enrollment: EnrollmentResponse) => {
    setSelectedEnrollment(enrollment);
    setHistory([]);
    setDetailOpen(true);
  };

  const clearStudentFilter = () => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('studentId');
    nextParams.delete('accountId');
    nextParams.delete('status');
    setSearchParams(nextParams, { replace: true });
    setActiveStatus(undefined);
    setSearch('');
    setSearchInput('');
    setPageNumber(0);
    setSelectedCompleteIds([]);
  };

  const submitSearch = (value: string) => {
    setSearch(value.trim());
    setPageNumber(0);
    setSelectedCompleteIds([]);
    if (isFilteredToStudent) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('studentId');
      nextParams.delete('accountId');
      setSearchParams(nextParams, { replace: true });
    }
  };

  const openHistory = async () => {
    if (!selectedEnrollment) return;
    setHistoryOpen(true);
    setHistoryLoading(true);
    try {
      setHistory(await enrollmentApi.statusHistory(selectedEnrollment.enrollmentId));
    } catch (err) {
      showError(err, 'Không tải được lịch sử trạng thái');
    } finally {
      setHistoryLoading(false);
    }
  };

  const openEdit = (enrollment: EnrollmentResponse) => {
    setSelectedEnrollment(enrollment);
    setEditOpen(true);
    form.resetFields();
    form.setFieldsValue({
      editAction: enrollment.status === 'RESERVED'
        ? 'resume'
        : enrollment.status === 'ACTIVE' && !isOnline ? 'reserve' : 'terminate',
      startDate: dayjs(),
      endDate: dayjs().add(1, 'month'),
      finalScore: enrollment.finalScore ?? undefined,
    });
  };

  const saveEdit = async (values: Record<string, unknown>) => {
    if (!selectedEnrollment) return;
    const selectedAction = values.editAction as string;
    setSaving(true);
    try {
      if (selectedAction === 'reserve') {
        await enrollmentApi.reserve(selectedEnrollment.enrollmentId, {
          reason: String(values.reason ?? '').trim(),
          startDate: dayjs(values.startDate as dayjs.ConfigType).format('YYYY-MM-DD'),
          endDate: dayjs(values.endDate as dayjs.ConfigType).format('YYYY-MM-DD'),
        });
      } else if (selectedAction === 'resume') {
        await enrollmentApi.resume(selectedEnrollment.enrollmentId);
      } else if (selectedAction === 'score') {
        await enrollmentApi.recordFinalScore(selectedEnrollment.enrollmentId, { finalScore: Number(values.finalScore) });
      } else {
        await enrollmentApi.terminate(selectedEnrollment.enrollmentId, { reason: String(values.reason ?? '').trim() });
      }
      toast.success('Đã cập nhật ghi danh');
      setEditOpen(false);
      setSelectedEnrollment(null);
      form.resetFields();
      await loadEnrollments();
    } catch (err) {
      showError(err, 'Không thể cập nhật học viên');
    } finally {
      setSaving(false);
    }
  };

  const completeSelected = async () => {
    if (!selectedCompleteIds.length) return;
    setCompleting(true);
    try {
      const result = await enrollmentApi.completeBatch(courseId, selectedCompleteIds);
      setSelectedCompleteIds([]);
      if (result.completed > 0) toast.success(`Đã hoàn thành ${result.completed} học viên`);
      if (result.failed > 0) {
        const message = result.results.find((item) => !item.success)?.message;
        toast.error(`${result.failed} học viên chưa hoàn thành${message ? `: ${message}` : ''}`);
      }
      await loadEnrollments();
    } catch (err) {
      showError(err, 'Không thể cập nhật hoàn thành hàng loạt');
    } finally {
      setCompleting(false);
    }
  };

  const columns: ColumnsType<EnrollmentResponse> = [
    { title: 'Mã ghi danh', dataIndex: 'enrollmentId', width: 110, render: (id) => <Text strong>#{id}</Text> },
    {
      title: isOnline ? 'Người mua' : 'Học viên',
      render: (_, row) => (
        <div>
          <div style={{ fontWeight: 600, color: '#1e293b' }}>
            {row.studentName || (row.studentId ? `Học viên #${row.studentId}` : `Tài khoản #${row.accountId}`)}
          </div>
          {row.studentCode && <Text type="secondary" style={{ fontSize: 12 }}>Mã: {row.studentCode}</Text>}
          {row.studentEmail && (
            <div style={{ fontSize: 12, color: '#64748b' }}>{row.studentEmail}</div>
          )}
        </div>
      ),
    },
    {
      title: 'Hình thức',
      dataIndex: 'enrollmentType',
      width: 110,
      render: (t) => <Tag color={t === 'ONLINE' ? 'blue' : 'green'}>{t}</Tag>,
    },
    {
      title: isOnline ? 'Ngày mua' : 'Ngày ghi danh',
      dataIndex: 'enrolledAt',
      render: (value: string) => value ? dayjs(value).format('DD/MM/YYYY HH:mm') : '—',
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      width: 150,
      render: (status) => <EnrollmentStatusTag status={status} />,
    },
    {
      title: 'Thao tác',
      fixed: 'right',
      width: 125,
      render: (_, row) => (
        <Space>
          <Tooltip title="Xem chi tiết">
            <Button size="small" aria-label="Xem chi tiết" icon={<EyeOutlined />} onClick={() => openDetails(row)} />
          </Tooltip>
          {!isOnline && !['TERMINATED', 'COMPLETED'].includes(row.status) && (
            <Tooltip title="Chỉnh sửa">
              <Button size="small" aria-label="Chỉnh sửa" icon={<EditOutlined />} onClick={() => openEdit(row)} />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  const statusLabels: Record<EnrollmentStatus, string> = {
    PENDING: ENROLLMENT_STATUS_LABEL.PENDING,
    ACTIVE: ENROLLMENT_STATUS_LABEL.ACTIVE,
    RESERVED: ENROLLMENT_STATUS_LABEL.RESERVED,
    TERMINATED: 'Đã chấm dứt',
    COMPLETED: ENROLLMENT_STATUS_LABEL.COMPLETED,
  };

  return (
    <Space orientation="vertical" size="middle" className="w-full">
      <Alert
        type="info"
        showIcon
        message={isOnline ? `Tổng cộng: ${total} người đã mua khóa` : `${activeStatus ? statusLabels[activeStatus] : 'Tất cả học viên'}: ${total}`}
        description={isOnline
          ? 'Ghi danh ONLINE được tạo tự động ngay khi thanh toán thành công. Đây là màn hình chỉ đọc.'
          : 'Dùng biểu tượng chỉnh sửa để cập nhật trạng thái hoặc điểm cuối khóa. PENDING tự chuyển sang Đang học vào ngày khai giảng.'}
      />
      {isFilteredToStudent && (
        <Alert
          type="info"
          showIcon
          message={
            <Space size={6} wrap>
              <span>Đang lọc theo học viên:</span>
              <Text strong>{filteredStudentName}</Text>
              {filteredStudentCode && <Text type="secondary">({filteredStudentCode})</Text>}
              {activeStatus && <EnrollmentStatusTag status={activeStatus} />}
            </Space>
          }
          description="Bảng bên dưới chỉ hiển thị học viên này. Bấm “Xem tất cả học viên” hoặc chọn một tab trạng thái khác để bỏ bộ lọc."
          action={
            <Space orientation="vertical" size={4}>
              <Button type="primary" size="small" onClick={clearStudentFilter}>
                Xem tất cả học viên
              </Button>
              <Link to="/admin/enrollments" style={{ textAlign: 'center', fontSize: 12 }}>
                ← Danh sách ghi danh
              </Link>
            </Space>
          }
          closable
          onClose={(event) => { event.preventDefault(); clearStudentFilter(); }}
        />
      )}
      {courseStatus === 'FINISHED' && (
        <Alert
          type="warning"
          showIcon
          message="Khóa học đã kết thúc"
          description="Chọn các học viên đủ điều kiện trong bảng bên dưới để cập nhật hoàn thành hàng loạt."
        />
      )}
      <Tabs
        activeKey={activeStatus ?? 'ALL'}
        onChange={(key) => {
          const nextStatus = key === 'ALL' ? undefined : key as EnrollmentStatus;
          setActiveStatus(nextStatus);
          setPageNumber(0);
          setSelectedCompleteIds([]);
          const nextParams = new URLSearchParams(searchParams);
          if (nextStatus) nextParams.set('status', nextStatus);
          else nextParams.delete('status');
          // Đổi tab trạng thái = mở rộng phạm vi xem, nên bỏ luôn filter học viên.
          nextParams.delete('studentId');
          nextParams.delete('accountId');
          setSearchParams(nextParams, { replace: true });
        }}
        items={[
          { key: 'ALL', label: 'Tất cả', children: null },
          ...enrollmentStatuses.map((status) => ({ key: status, label: statusLabels[status], children: null })),
        ]}
      />
      <div className="flex justify-end">
        <Space>
          <Input.Search
            allowClear
            placeholder="Tìm học viên, mã học viên hoặc hóa đơn"
            style={{ width: 330 }}
            value={searchInput}
            onChange={(event) => {
              setSearchInput(event.target.value);
              if (!event.target.value) submitSearch('');
            }}
            onSearch={submitSearch}
          />
          {courseStatus === 'FINISHED' && !isOnline && (
            <Popconfirm
              title={`Hoàn thành ${selectedCompleteIds.length} học viên?`}
              okText="Hoàn thành"
              cancelText="Hủy"
              disabled={selectedCompleteIds.length === 0}
              onConfirm={() => void completeSelected()}
            >
              <Button type="primary" disabled={selectedCompleteIds.length === 0} loading={completing}>
                Hoàn thành đã chọn ({selectedCompleteIds.length})
              </Button>
            </Popconfirm>
          )}
          <Button onClick={() => void loadEnrollments()}>Tải lại</Button>
        </Space>
      </div>
      <Table
        rowKey="enrollmentId"
        columns={columns}
        dataSource={rows}
        loading={loading}
        rowSelection={courseStatus === 'FINISHED' && !isOnline ? {
          selectedRowKeys: selectedCompleteIds,
          preserveSelectedRowKeys: true,
          onChange: (keys) => setSelectedCompleteIds(keys as number[]),
          getCheckboxProps: (row) => ({
            disabled: !row.completionEligible || completing
              || (selectedCompleteIds.length >= 100 && !selectedCompleteIds.includes(row.enrollmentId)),
            title: row.completionBlockedReason || undefined,
          }),
        } : undefined}
        locale={{
          emptyText: (
            <Text type="secondary">
              {isOnline ? 'Chưa có người mua khóa học này' : 'Khóa học chưa có học viên ghi danh'}
            </Text>
          ),
        }}
        pagination={{
          current: pageNumber + 1,
          pageSize,
          total,
          showSizeChanger: true,
          onChange: (page, size) => {
            setPageNumber(page - 1);
            setPageSize(size);
          },
        }}
        scroll={{ x: isOnline ? 900 : 1050 }}
      />

      <Modal
        title="Thông tin học viên"
        open={detailOpen}
        width={640}
        footer={<Button onClick={() => setDetailOpen(false)}>Đóng</Button>}
        onCancel={() => setDetailOpen(false)}
      >
        {selectedEnrollment && (
          <>
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="Mã ghi danh">#{selectedEnrollment.enrollmentId}</Descriptions.Item>
              <Descriptions.Item label="Hình thức">
                <Tag color={selectedEnrollment.enrollmentType === 'ONLINE' ? 'blue' : 'green'}>
                  {selectedEnrollment.enrollmentType}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label={isOnline ? 'Người mua' : 'Học viên'} span={2}>
                {selectedEnrollment.studentName || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Mã học viên">{selectedEnrollment.studentCode || '—'}</Descriptions.Item>
              <Descriptions.Item label="Điện thoại">{selectedEnrollment.studentPhone || '—'}</Descriptions.Item>
              <Descriptions.Item label="Email" span={2}>{selectedEnrollment.studentEmail || '—'}</Descriptions.Item>
              <Descriptions.Item label="Khóa học" span={2}>
                {selectedEnrollment.courseTitle || `#${selectedEnrollment.courseId}`}
              </Descriptions.Item>
              <Descriptions.Item label={isOnline ? 'Ngày mua' : 'Ngày ghi danh'}>
                {selectedEnrollment.enrolledAt ? dayjs(selectedEnrollment.enrolledAt).format('DD/MM/YYYY HH:mm') : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Trạng thái">
                <EnrollmentStatusTag status={selectedEnrollment.status} />
              </Descriptions.Item>
              {!isOnline && (
                <>
                  <Descriptions.Item label="Số buổi vắng">{selectedEnrollment.absences}</Descriptions.Item>
                  <Descriptions.Item label="Điểm cuối khóa">
                    {selectedEnrollment.finalScore ?? 'Chưa cập nhật'}
                  </Descriptions.Item>
                </>
              )}
              <Descriptions.Item label="Hóa đơn" span={2}>
                {selectedEnrollment.invoiceCode || (selectedEnrollment.invoiceId ? `#${selectedEnrollment.invoiceId}` : '—')}
              </Descriptions.Item>
              {selectedEnrollment.status === 'RESERVED' && (
                <Descriptions.Item label="Thời gian bảo lưu" span={2}>
                  {selectedEnrollment.holdStartDate ? dayjs(selectedEnrollment.holdStartDate).format('DD/MM/YYYY') : '—'}
                  {' → '}
                  {selectedEnrollment.holdEndDate ? dayjs(selectedEnrollment.holdEndDate).format('DD/MM/YYYY') : '—'}
                </Descriptions.Item>
              )}
              {selectedEnrollment.holdReason && (
                <Descriptions.Item label="Lý do bảo lưu" span={2}>{selectedEnrollment.holdReason}</Descriptions.Item>
              )}
              {selectedEnrollment.terminationReason && (
                <Descriptions.Item label="Lý do kết thúc" span={2}>{selectedEnrollment.terminationReason}</Descriptions.Item>
              )}
            </Descriptions>
            <Divider />
            <Button icon={<HistoryOutlined />} loading={historyLoading} onClick={() => void openHistory()}>
              Lịch sử thay đổi ghi danh
            </Button>
          </>
        )}
      </Modal>

      <Modal
        title="Lịch sử thay đổi ghi danh"
        open={historyOpen}
        loading={historyLoading}
        footer={<Button onClick={() => setHistoryOpen(false)}>Đóng</Button>}
        onCancel={() => setHistoryOpen(false)}
      >
        {history.length ? history.map((item) => (
          <div key={item.id} className="border-b py-2">
            <Tag>{item.oldStatus ? ENROLLMENT_STATUS_LABEL[item.oldStatus] : 'Mới'}</Tag>
            {' → '}
            <EnrollmentStatusTag status={item.newStatus} />
            {item.reason && <div>{item.reason}</div>}
            <Text type="secondary">{dayjs(item.changedAt).format('DD/MM/YYYY HH:mm')}</Text>
          </div>
        )) : <Text type="secondary">Chưa có lịch sử thay đổi ghi danh</Text>}
      </Modal>

      <Modal
        title="Chỉnh sửa ghi danh"
        open={editOpen}
        confirmLoading={saving}
        okText="Lưu thay đổi"
        cancelText="Hủy"
        onCancel={() => { setEditOpen(false); setSelectedEnrollment(null); form.resetFields(); }}
        onOk={() => form.submit()}
        destroyOnHidden
      >
        {selectedEnrollment && (
          <Descriptions className="mb-4" bordered size="small" column={2}>
            <Descriptions.Item label="Học viên">{selectedEnrollment.studentName || '—'}</Descriptions.Item>
            <Descriptions.Item label="Mã học viên">{selectedEnrollment.studentCode || '—'}</Descriptions.Item>
            <Descriptions.Item label="Email">{selectedEnrollment.studentEmail || '—'}</Descriptions.Item>
            <Descriptions.Item label="Điện thoại">{selectedEnrollment.studentPhone || '—'}</Descriptions.Item>
            <Descriptions.Item label="Trạng thái hiện tại"><EnrollmentStatusTag status={selectedEnrollment.status} /></Descriptions.Item>
            <Descriptions.Item label="Số buổi vắng">{selectedEnrollment.absences}</Descriptions.Item>
            <Descriptions.Item label="Điểm cuối khóa">{selectedEnrollment.finalScore ?? 'Chưa cập nhật'}</Descriptions.Item>
          </Descriptions>
        )}
        <Form form={form} layout="vertical" onFinish={(values) => void saveEdit(values)}>
          <Form.Item name="editAction" label="Cập nhật trạng thái / điểm cuối khóa" rules={[{ required: true }]}>
            <Select options={[
              { value: 'reserve', label: 'Bảo lưu học viên', disabled: selectedEnrollment?.status !== 'ACTIVE' },
              { value: 'resume', label: 'Cho học viên quay lại học', disabled: selectedEnrollment?.status !== 'RESERVED' },
              { value: 'score', label: 'Cập nhật điểm cuối khóa', disabled: selectedEnrollment?.status !== 'ACTIVE' },
              { value: 'terminate', label: 'Chấm dứt ghi danh' },
            ]} onChange={(value) => {
              form.setFieldValue('reason', undefined);
              if (value === 'score') form.setFieldValue('finalScore', selectedEnrollment?.finalScore ?? undefined);
            }} />
          </Form.Item>
          {editAction === 'reserve' && <>
            <Form.Item name="startDate" label="Bảo lưu từ ngày" rules={[{ required: true, message: 'Chọn ngày bắt đầu' }]}>
              <DatePicker className="w-full" format="DD/MM/YYYY" />
            </Form.Item>
            <Form.Item name="endDate" label="Bảo lưu đến ngày" rules={[{ required: true, message: 'Chọn ngày kết thúc' }]}>
              <DatePicker className="w-full" format="DD/MM/YYYY" />
            </Form.Item>
          </>}
          {(editAction === 'reserve' || editAction === 'terminate') && (
            <Form.Item name="reason" label="Lý do" rules={[{ required: true, whitespace: true, message: 'Vui lòng nhập lý do' }]}>
              <Input.TextArea rows={3} />
            </Form.Item>
          )}
          {editAction === 'score' && (
            <Form.Item name="finalScore" label="Điểm cuối khóa (0–100)" rules={[{ required: true, message: 'Nhập điểm cuối khóa' }]}>
              <InputNumber min={0} max={100} step={0.1} className="w-full" />
            </Form.Item>
          )}
          {editAction === 'resume' && <Alert type="info" showIcon message="Học viên sẽ chuyển từ Bảo lưu sang Đang học." />}
          {editAction === 'terminate' && <Alert type="warning" showIcon message="Ghi danh sẽ chuyển sang Đã kết thúc và không thể tiếp tục học." />}
          {selectedEnrollment?.status === 'PENDING' && <Alert className="mt-3" type="info" showIcon message="PENDING tự chuyển sang Đang học vào ngày khai giảng." />}
        </Form>
      </Modal>
    </Space>
  );
}
