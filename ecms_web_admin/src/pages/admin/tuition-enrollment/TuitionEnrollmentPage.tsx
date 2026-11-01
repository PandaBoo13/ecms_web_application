import { useCallback, useEffect, useState } from 'react';
import {
  Alert, Button, DatePicker, Form, Input, InputNumber, Modal, Select, Space, Table, Tabs, Tag, Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import PageContainer from '@/components/common/PageContainer';
import PageHeader from '@/components/common/PageHeader';
import { enrollmentApi, tuitionApi } from '@/services/api/tuition-enrollment';
import type {
  EnrollmentResponse, EnrollmentStatus, EnrollmentStatusLogResponse, InvoiceResponse, InvoiceStatus, SessionAttendanceResponse,
} from '@/services/types/tuition-enrollment';

type InvoiceAction = 'create' | 'cash' | 'extend' | 'cancel' | 'refund' | null;
type EnrollmentAction = 'reserve' | 'terminate' | 'score' | null;
const { Text } = Typography;

const invoiceColor: Record<InvoiceStatus, string> = {
  PENDING: 'gold', PAID: 'green', OVERDUE: 'red', CANCELLED: 'default',
};
const enrollmentColor: Record<EnrollmentStatus, string> = {
  PENDING: 'gold', ACTIVE: 'green', RESERVED: 'blue', TERMINATED: 'default', COMPLETED: 'purple',
};

export default function TuitionEnrollmentPage() {
  const [invoiceRows, setInvoiceRows] = useState<InvoiceResponse[]>([]);
  const [enrollmentRows, setEnrollmentRows] = useState<EnrollmentResponse[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [loadingEnrollments, setLoadingEnrollments] = useState(false);
  const [invoiceStatus, setInvoiceStatus] = useState<InvoiceStatus | undefined>();
  const [enrollmentStatus, setEnrollmentStatus] = useState<EnrollmentStatus | undefined>();
  const [invoiceAction, setInvoiceAction] = useState<InvoiceAction>(null);
  const [enrollmentAction, setEnrollmentAction] = useState<EnrollmentAction>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceResponse | null>(null);
  const [selectedEnrollment, setSelectedEnrollment] = useState<EnrollmentResponse | null>(null);
  const [attendanceOpen, setAttendanceOpen] = useState(false);
  const [attendance, setAttendance] = useState<SessionAttendanceResponse | null>(null);
  const [history, setHistory] = useState<EnrollmentStatusLogResponse[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [invoiceForm] = Form.useForm();
  const [enrollmentForm] = Form.useForm();
  const [attendanceSearchForm] = Form.useForm();
  const [attendanceMarkForm] = Form.useForm();

  const loadInvoices = useCallback(async () => {
    setLoadingInvoices(true);
    try {
      const page = await tuitionApi.searchInvoices({ page: 0, size: 100, status: invoiceStatus });
      setInvoiceRows(page.content ?? []);
    } catch { toast.error('Không tải được danh sách hóa đơn'); }
    finally { setLoadingInvoices(false); }
  }, [invoiceStatus]);

  const loadEnrollments = useCallback(async () => {
    setLoadingEnrollments(true);
    try {
      const page = await enrollmentApi.search({ page: 0, size: 100, status: enrollmentStatus });
      setEnrollmentRows(page.content ?? []);
    } catch { toast.error('Không tải được danh sách ghi danh'); }
    finally { setLoadingEnrollments(false); }
  }, [enrollmentStatus]);

  useEffect(() => { void loadInvoices(); }, [loadInvoices]);
  useEffect(() => { void loadEnrollments(); }, [loadEnrollments]);

  const performInvoiceAction = async (values: Record<string, unknown>) => {
    setBusy(true);
    try {
      if (invoiceAction === 'create') {
        const dueAt = values.dueAt ? dayjs(values.dueAt as dayjs.ConfigType).format('YYYY-MM-DDTHH:mm:ss') : undefined;
        await tuitionApi.createOfflineInvoice({
          courseId: Number(values.courseId), amount: Number(values.amount),
          accountId: values.accountId ? Number(values.accountId) : undefined,
          studentId: values.studentId ? Number(values.studentId) : undefined,
          leadId: values.leadId ? Number(values.leadId) : undefined, dueAt,
        });
      } else if (selectedInvoice && invoiceAction === 'cash') await tuitionApi.confirmCash(selectedInvoice.invoiceId);
      else if (selectedInvoice && invoiceAction === 'extend') {
        const dueAt = dayjs(values.dueAt as dayjs.ConfigType).format('YYYY-MM-DDTHH:mm:ss');
        await tuitionApi.extendDueDate(selectedInvoice.invoiceId, dueAt);
      } else if (selectedInvoice && invoiceAction === 'cancel') {
        await tuitionApi.cancelInvoice(selectedInvoice.invoiceId, { reason: String(values.reason) });
      } else if (selectedInvoice && invoiceAction === 'refund') {
        await tuitionApi.refundInvoice(selectedInvoice.invoiceId, {
          amount: Number(values.amount), paymentMethod: values.paymentMethod as 'CASH' | 'BANK_TRANSFER' | 'VNPAY',
          transactionReference: values.transactionReference as string | undefined, reason: String(values.reason),
        });
      }
      toast.success('Đã cập nhật hóa đơn');
      setInvoiceAction(null); setSelectedInvoice(null); invoiceForm.resetFields(); await loadInvoices();
    } catch { toast.error('Thao tác hóa đơn không thành công'); }
    finally { setBusy(false); }
  };

  const updateEnrollment = async (
    values?: Record<string, unknown>, target: EnrollmentResponse | null = selectedEnrollment,
    action: EnrollmentAction | 'resume' | 'complete' = enrollmentAction,
  ) => {
    if (!target) return;
    setBusy(true);
    try {
      if (action === 'reserve') {
        await enrollmentApi.reserve(target.enrollmentId, {
          reason: String(values?.reason),
          startDate: dayjs(values?.startDate as dayjs.ConfigType).format('YYYY-MM-DD'),
          endDate: dayjs(values?.endDate as dayjs.ConfigType).format('YYYY-MM-DD'),
        });
      } else if (action === 'terminate') await enrollmentApi.terminate(target.enrollmentId, { reason: String(values?.reason) });
      else if (action === 'score') await enrollmentApi.recordFinalScore(target.enrollmentId, { finalScore: Number(values?.finalScore) });
      else if (action === 'resume') await enrollmentApi.resume(target.enrollmentId);
      else if (action === 'complete') await enrollmentApi.complete(target.enrollmentId);
      toast.success('Đã cập nhật ghi danh'); setEnrollmentAction(null); setSelectedEnrollment(null);
      enrollmentForm.resetFields(); await loadEnrollments();
    } catch { toast.error('Thao tác ghi danh không thành công'); }
    finally { setBusy(false); }
  };

  const showInvoiceAction = (action: Exclude<InvoiceAction, null>, invoice?: InvoiceResponse) => {
    setSelectedInvoice(invoice ?? null); setInvoiceAction(action); invoiceForm.resetFields();
  };
  const showEnrollmentAction = (action: EnrollmentAction, enrollment: EnrollmentResponse) => {
    setSelectedEnrollment(enrollment); setEnrollmentAction(action); enrollmentForm.resetFields();
  };

  const invoiceColumns: ColumnsType<InvoiceResponse> = [
    { title: 'Mã hóa đơn', dataIndex: 'invoiceCode', render: (v: string) => <Text strong>{v}</Text> },
    { title: 'Khóa học', dataIndex: 'courseId' },
    { title: 'Học viên / tài khoản', render: (_, r) => r.studentId ?? r.accountId ?? r.leadId ?? '—' },
    { title: 'Loại', dataIndex: 'type' },
    { title: 'Số tiền', dataIndex: 'amount', render: (v: number) => `${Number(v).toLocaleString('vi-VN')} ₫` },
    { title: 'Hạn thanh toán', dataIndex: 'dueAt', render: (v?: string) => v ? dayjs(v).format('DD/MM/YYYY HH:mm') : '—' },
    { title: 'Trạng thái', dataIndex: 'status', render: (v: InvoiceStatus) => <Tag color={invoiceColor[v]}>{v}</Tag> },
    { title: 'Thao tác', fixed: 'right', render: (_, r) => <Space wrap>
      {(r.status === 'PENDING' || r.status === 'OVERDUE') && <Button size="small" onClick={() => showInvoiceAction('cash', r)}>Thu tiền mặt</Button>}
      {r.status === 'OVERDUE' && <Button size="small" onClick={() => showInvoiceAction('extend', r)}>Gia hạn</Button>}
      {(r.status === 'PENDING' || r.status === 'OVERDUE') && <Button size="small" danger onClick={() => showInvoiceAction('cancel', r)}>Hủy</Button>}
      {r.status === 'PAID' && r.type === 'TUITION_PAYMENT' && <Button size="small" onClick={() => showInvoiceAction('refund', r)}>Hoàn tiền</Button>}
    </Space> },
  ];

  const enrollmentColumns: ColumnsType<EnrollmentResponse> = [
    { title: 'ID', dataIndex: 'enrollmentId' }, { title: 'Khóa học', dataIndex: 'courseId' },
    { title: 'Học viên / tài khoản', render: (_, r) => r.studentId ?? r.accountId ?? '—' },
    { title: 'Hóa đơn', dataIndex: 'invoiceId' }, { title: 'Loại', dataIndex: 'enrollmentType' },
    { title: 'Vắng', dataIndex: 'absences' }, { title: 'Điểm cuối khóa', dataIndex: 'finalScore', render: (v?: number) => v ?? '—' },
    { title: 'Trạng thái', dataIndex: 'status', render: (v: EnrollmentStatus) => <Tag color={enrollmentColor[v]}>{v}</Tag> },
    { title: 'Thao tác', fixed: 'right', render: (_, r) => <Space wrap>
      {r.status === 'ACTIVE' && r.enrollmentType === 'OFFLINE' && <Button size="small" onClick={() => showEnrollmentAction('reserve', r)}>Bảo lưu</Button>}
      {r.status === 'RESERVED' && <Button size="small" onClick={() => void updateEnrollment(undefined, r, 'resume')}>Tiếp tục học</Button>}
      {r.status === 'ACTIVE' && <Button size="small" onClick={() => showEnrollmentAction('score', r)}>Ghi điểm</Button>}
      {r.status === 'ACTIVE' && <Button size="small" onClick={() => void updateEnrollment(undefined, r, 'complete')}>Hoàn thành</Button>}
      {r.status !== 'TERMINATED' && r.status !== 'COMPLETED' && <Button size="small" danger onClick={() => showEnrollmentAction('terminate', r)}>Kết thúc</Button>}
      <Button size="small" onClick={async () => { try { setHistory(await enrollmentApi.statusHistory(r.enrollmentId)); setHistoryOpen(true); } catch { toast.error('Không tải được lịch sử'); } }}>Lịch sử</Button>
    </Space> },
  ];

  const loadAttendance = async (values: { courseId: number; sessionId: number }) => {
    try {
      const data = await enrollmentApi.sessionAttendance(Number(values.courseId), Number(values.sessionId));
      setAttendance(data); setAttendanceOpen(true); attendanceMarkForm.setFieldsValue({ absentEnrollmentIds: data.absentEnrollmentIds });
    } catch { toast.error('Không tải được danh sách điểm danh'); }
  };

  return <PageContainer>
    <PageHeader title="Học phí & ghi danh" subtitle="Quản lý hóa đơn, tình trạng ghi danh và điểm danh buổi học." />
    <Alert type="info" showIcon className="mb-4" message="Thanh toán VNPAY cần cấu hình thông tin merchant ở biến môi trường. Ngưỡng vắng/điểm đạt đang được tạm hoãn." />
    <Tabs items={[
      { key: 'invoices', label: 'Hóa đơn', children: <>
        <Space className="mb-4" wrap>
          <Select allowClear placeholder="Lọc trạng thái" style={{ width: 180 }} value={invoiceStatus} onChange={setInvoiceStatus}
            options={Object.keys(invoiceColor).map((v) => ({ value: v, label: v }))} />
          <Button onClick={() => void loadInvoices()}>Tải lại</Button>
          <Button type="primary" onClick={() => showInvoiceAction('create')}>Tạo hóa đơn offline</Button>
        </Space>
        <Table rowKey="invoiceId" columns={invoiceColumns} dataSource={invoiceRows} loading={loadingInvoices} scroll={{ x: 1250 }} pagination={{ pageSize: 10 }} />
      </> },
      { key: 'enrollments', label: 'Ghi danh', children: <>
        <Space className="mb-4" wrap>
          <Select allowClear placeholder="Lọc trạng thái" style={{ width: 180 }} value={enrollmentStatus} onChange={setEnrollmentStatus}
            options={Object.keys(enrollmentColor).map((v) => ({ value: v, label: v }))} />
          <Button onClick={() => void loadEnrollments()}>Tải lại</Button>
        </Space>
        <Table rowKey="enrollmentId" columns={enrollmentColumns} dataSource={enrollmentRows} loading={loadingEnrollments} scroll={{ x: 1450 }} pagination={{ pageSize: 10 }} />
      </> },
      { key: 'attendance', label: 'Điểm danh', children: <>
        <Alert className="mb-4" type="info" showIcon message="Chọn mã khóa và buổi học. Danh sách chỉ gồm ghi danh OFFLINE đang ACTIVE; các lượt vắng đã lưu không bị xóa." />
        <Form form={attendanceSearchForm} layout="inline" onFinish={loadAttendance}>
          <Form.Item name="courseId" rules={[{ required: true }]}><InputNumber placeholder="Mã khóa học" min={1} /></Form.Item>
          <Form.Item name="sessionId" rules={[{ required: true }]}><InputNumber placeholder="Mã buổi học" min={1} /></Form.Item>
          <Button type="primary" htmlType="submit">Mở điểm danh</Button>
        </Form>
      </> },
    ]} />

    <Modal title={invoiceAction === 'create' ? 'Tạo hóa đơn offline' : ({ cash: 'Xác nhận thu tiền mặt', extend: 'Gia hạn hóa đơn', cancel: 'Hủy hóa đơn', refund: 'Hoàn tiền' } as const)[invoiceAction ?? 'cash']}
      open={invoiceAction !== null} confirmLoading={busy} onCancel={() => { setInvoiceAction(null); setSelectedInvoice(null); }}
      onOk={() => invoiceForm.submit()} destroyOnClose>
      <Form form={invoiceForm} layout="vertical" onFinish={performInvoiceAction}>
        {invoiceAction === 'create' && <>
          <Form.Item name="courseId" label="Mã khóa học" rules={[{ required: true }]}><InputNumber min={1} className="w-full" /></Form.Item>
          <Form.Item name="studentId" label="Mã học viên"><InputNumber min={1} className="w-full" /></Form.Item>
          <Form.Item name="accountId" label="Mã tài khoản (dùng nếu không nhập mã học viên)"><InputNumber min={1} className="w-full" /></Form.Item>
          <Form.Item name="leadId" label="Mã lead (dùng nếu không nhập hai mã trên)"><InputNumber min={1} className="w-full" /></Form.Item>
          <Form.Item name="amount" label="Số tiền" rules={[{ required: true }]}><InputNumber min={1} className="w-full" /></Form.Item>
          <Form.Item name="dueAt" label="Hạn thanh toán"><DatePicker showTime className="w-full" /></Form.Item>
        </>}
        {invoiceAction === 'extend' && <Form.Item name="dueAt" label="Hạn thanh toán mới" rules={[{ required: true }]}><DatePicker showTime className="w-full" /></Form.Item>}
        {invoiceAction === 'cancel' && <Form.Item name="reason" label="Lý do hủy" rules={[{ required: true }]}><Input.TextArea /></Form.Item>}
        {invoiceAction === 'refund' && <>
          <Form.Item name="amount" label="Số tiền hoàn" rules={[{ required: true }]}><InputNumber min={1} max={Number(selectedInvoice?.amount)} className="w-full" /></Form.Item>
          <Form.Item name="paymentMethod" label="Phương thức hoàn" rules={[{ required: true }]}><Select options={[{ value: 'CASH', label: 'Tiền mặt' }, { value: 'BANK_TRANSFER', label: 'Chuyển khoản' }, { value: 'VNPAY', label: 'VNPAY' }]} /></Form.Item>
          <Form.Item name="transactionReference" label="Mã giao dịch"><Input /></Form.Item>
          <Form.Item name="reason" label="Lý do hoàn tiền" rules={[{ required: true }]}><Input.TextArea /></Form.Item>
        </>}
        {invoiceAction === 'cash' && <Text>Xác nhận hóa đơn <b>{selectedInvoice?.invoiceCode}</b> đã thu đủ tiền mặt.</Text>}
      </Form>
    </Modal>

    <Modal title="Cập nhật ghi danh" open={enrollmentAction === 'reserve' || enrollmentAction === 'terminate' || enrollmentAction === 'score'}
      confirmLoading={busy} onCancel={() => { setEnrollmentAction(null); setSelectedEnrollment(null); }} onOk={() => enrollmentForm.submit()} destroyOnClose>
      <Form form={enrollmentForm} layout="vertical" onFinish={updateEnrollment}>
        {enrollmentAction === 'reserve' && <>
          <Form.Item name="reason" label="Lý do bảo lưu" rules={[{ required: true }]}><Input.TextArea /></Form.Item>
          <Form.Item name="startDate" label="Từ ngày" rules={[{ required: true }]}><DatePicker className="w-full" /></Form.Item>
          <Form.Item name="endDate" label="Đến ngày" rules={[{ required: true }]}><DatePicker className="w-full" /></Form.Item>
        </>}
        {enrollmentAction === 'terminate' && <Form.Item name="reason" label="Lý do kết thúc" rules={[{ required: true }]}><Input.TextArea /></Form.Item>}
        {enrollmentAction === 'score' && <Form.Item name="finalScore" label="Điểm cuối khóa (0–100)" rules={[{ required: true }]}><InputNumber min={0} max={100} step={0.01} className="w-full" /></Form.Item>}
      </Form>
    </Modal>

    <Modal title="Điểm danh buổi học" open={attendanceOpen} onCancel={() => setAttendanceOpen(false)}
      onOk={async () => {
        try { await enrollmentApi.recordAbsences(attendance!.courseId, attendance!.sessionId, attendanceMarkForm.getFieldValue('absentEnrollmentIds') ?? []); toast.success('Đã ghi nhận các lượt vắng mới'); setAttendanceOpen(false); }
        catch { toast.error('Không lưu được điểm danh'); }
      }}>
      <Text type="secondary">Chỉ chọn các mã ghi danh vắng. Lượt vắng đã ghi nhận trước đó sẽ được giữ lại.</Text>
      <Form form={attendanceMarkForm} layout="vertical" className="mt-4">
        <Form.Item name="absentEnrollmentIds" label={`Vắng mặt (${attendance?.activeEnrollmentIds.length ?? 0} học viên ACTIVE)`}>
          <Select mode="multiple" allowClear options={(attendance?.activeEnrollmentIds ?? []).map((id) => ({ value: id, label: `Ghi danh #${id}` }))} />
        </Form.Item>
      </Form>
    </Modal>
    <Modal title="Lịch sử trạng thái" open={historyOpen} footer={null} onCancel={() => setHistoryOpen(false)}>
      {history.map((item) => <div key={item.id} className="border-b py-2"><Tag>{item.oldStatus ?? 'Mới'}</Tag> → <Tag color={enrollmentColor[item.newStatus]}>{item.newStatus}</Tag><div>{item.reason}</div><Text type="secondary">{dayjs(item.changedAt).format('DD/MM/YYYY HH:mm')}</Text></div>)}
    </Modal>
  </PageContainer>;
}
