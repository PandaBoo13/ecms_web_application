import { useCallback, useEffect, useState } from 'react';
import {
  Alert, Button, DatePicker, Descriptions, Form, Input, InputNumber, Modal, Select, Space, Table, Tag, Tooltip, Typography,
} from 'antd';
import { EditOutlined, EyeOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import PageContainer from '@/components/common/PageContainer';
import PageHeader from '@/components/common/PageHeader';
import { tuitionApi } from '@/services/api/tuition';
import type { InvoiceResponse, InvoiceStatus } from '@/services/types/tuition';

type InvoiceAction = 'create' | 'update' | 'cash' | 'extend' | 'cancel' | 'refund' | null;
const { Text } = Typography;
const invoiceColor: Record<InvoiceStatus, string> = { PENDING: 'gold', PAID: 'green', OVERDUE: 'red', CANCELLED: 'default' };
const statusLabels: Record<InvoiceStatus, string> = {
  PENDING: 'Chờ thanh toán', PAID: 'Đã thanh toán', OVERDUE: 'Quá hạn', CANCELLED: 'Đã hủy',
};
const methodLabels: Record<string, string> = { CASH: 'Tiền mặt', BANK_TRANSFER: 'Chuyển khoản', VNPAY: 'VNPAY' };
const dateText = (value?: string | null) => value ? dayjs(value).format('DD/MM/YYYY HH:mm') : '—';
const moneyText = (value?: number | null) => value == null ? '—' : `${Number(value).toLocaleString('vi-VN')} ₫`;

export default function TuitionPage() {
  const [invoiceRows, setInvoiceRows] = useState<InvoiceResponse[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [invoiceStatus, setInvoiceStatus] = useState<InvoiceStatus | undefined>();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [invoiceAction, setInvoiceAction] = useState<InvoiceAction>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceResponse | null>(null);
  const [detailInvoice, setDetailInvoice] = useState<InvoiceResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [invoiceForm] = Form.useForm();

  const loadInvoices = useCallback(async (page = 1, pageSize = 10) => {
    setLoadingInvoices(true);
    try {
      const result = await tuitionApi.searchInvoices({
        page: page - 1, size: pageSize, status: invoiceStatus, search: search || undefined,
      });
      setInvoiceRows(result.content ?? []);
      setPagination((current) => ({ ...current, current: page, pageSize, total: result.totalElements ?? 0 }));
    } catch {
      toast.error('Không tải được danh sách hóa đơn');
    } finally {
      setLoadingInvoices(false);
    }
  }, [invoiceStatus, search]);

  useEffect(() => { void loadInvoices(pagination.current, pagination.pageSize); }, [loadInvoices, pagination.current, pagination.pageSize]);

  const openDetails = async (invoice: InvoiceResponse) => {
    setDetailLoading(true);
    setDetailInvoice(invoice);
    try { setDetailInvoice(await tuitionApi.getInvoice(invoice.invoiceId)); }
    catch { toast.error('Không tải được chi tiết hóa đơn'); }
    finally { setDetailLoading(false); }
  };

  const performInvoiceAction = async (values: Record<string, unknown>) => {
    setBusy(true);
    try {
      const effectiveAction = invoiceAction === 'update' ? values.updateAction as InvoiceAction : invoiceAction;
      if (effectiveAction === 'create') {
        const dueAt = values.dueAt ? dayjs(values.dueAt as dayjs.ConfigType).format('YYYY-MM-DDTHH:mm:ss') : undefined;
        await tuitionApi.createOfflineInvoice({ courseId: Number(values.courseId), amount: Number(values.amount),
          accountId: values.accountId ? Number(values.accountId) : undefined,
          studentId: values.studentId ? Number(values.studentId) : undefined,
          leadId: values.leadId ? Number(values.leadId) : undefined, dueAt });
      } else if (selectedInvoice && effectiveAction === 'cash') {
        await tuitionApi.confirmCash(selectedInvoice.invoiceId);
      } else if (selectedInvoice && effectiveAction === 'extend') {
        await tuitionApi.extendDueDate(selectedInvoice.invoiceId, dayjs(values.dueAt as dayjs.ConfigType).format('YYYY-MM-DDTHH:mm:ss'));
      } else if (selectedInvoice && effectiveAction === 'cancel') {
        await tuitionApi.cancelInvoice(selectedInvoice.invoiceId, { reason: String(values.reason) });
      } else if (selectedInvoice && effectiveAction === 'refund') {
        await tuitionApi.refundInvoice(selectedInvoice.invoiceId, { amount: Number(values.amount),
          paymentMethod: values.paymentMethod as 'CASH' | 'BANK_TRANSFER' | 'VNPAY',
          transactionReference: values.transactionReference as string | undefined, reason: String(values.reason) });
      }
      toast.success('Đã cập nhật hóa đơn thành công');
      setInvoiceAction(null); setSelectedInvoice(null); invoiceForm.resetFields(); await loadInvoices(pagination.current, pagination.pageSize);
    } catch { toast.error('Thao tác hóa đơn không thành công'); }
    finally { setBusy(false); }
  };

  const showInvoiceAction = (action: Exclude<InvoiceAction, null>, invoice?: InvoiceResponse) => {
    setSelectedInvoice(invoice ?? null); setInvoiceAction(action); invoiceForm.resetFields();
  };

  const invoiceColumns: ColumnsType<InvoiceResponse> = [
    { title: 'Mã thanh toán', dataIndex: 'invoiceCode', width: 185, render: (value: string) => <Text strong>{value}</Text> },
    { title: 'Tên', dataIndex: 'ownerName', width: 190, render: (value: string | null, row) => value || row.ownerEmail || `ID ${row.studentId ?? row.accountId ?? row.leadId ?? '—'}` },
    { title: 'Khóa học', dataIndex: 'courseTitle', width: 220, render: (value: string | null, row) => value || `Khóa học #${row.courseId}` },
    { title: 'Loại hóa đơn', dataIndex: 'type', width: 145, render: (value: string) => value === 'REFUND' ? 'Hoàn tiền' : 'Học phí' },
    { title: 'Số tiền', dataIndex: 'amount', width: 145, render: moneyText },
    { title: 'Phương thức', dataIndex: 'paymentMethod', width: 145, render: (value?: string) => value ? methodLabels[value] ?? value : '—' },
    { title: 'Trạng thái', dataIndex: 'status', width: 145, render: (value: InvoiceStatus) => <Tag color={invoiceColor[value]}>{statusLabels[value]}</Tag> },
    { title: 'Thao tác', fixed: 'right', width: 104, align: 'center', render: (_, row) => (
      <Space size={4}>
        <Tooltip title="Xem chi tiết"><Button aria-label="Xem chi tiết" type="text" icon={<EyeOutlined />} onClick={() => void openDetails(row)} /></Tooltip>
        <Tooltip title="Cập nhật"><Button aria-label="Cập nhật" type="text" icon={<EditOutlined />} onClick={() => showInvoiceAction('update', row)} /></Tooltip>
      </Space>
    ) },
  ];

  const action = invoiceAction as string | null;
  const actionTitle: Record<string, string> = { create: 'Tạo hóa đơn offline', update: 'Cập nhật hóa đơn', cash: 'Xác nhận thu tiền mặt', extend: 'Gia hạn hóa đơn', cancel: 'Hủy hóa đơn', refund: 'Hoàn tiền' };
  const updateOptions = selectedInvoice ? [
    ...(['PENDING', 'OVERDUE'].includes(selectedInvoice.status) ? [
      { value: 'cash', label: 'Xác nhận đã thu tiền mặt' }, { value: 'cancel', label: 'Hủy hóa đơn' },
    ] : []),
    ...(selectedInvoice.status === 'OVERDUE' ? [{ value: 'extend', label: 'Gia hạn thanh toán' }] : []),
    ...(selectedInvoice.status === 'PAID' && selectedInvoice.type === 'TUITION_PAYMENT' ? [{ value: 'refund', label: 'Hoàn tiền' }] : []),
  ] : [];
  const updateAction = Form.useWatch('updateAction', invoiceForm) as InvoiceAction | undefined;
  const handleTableChange = (config: TablePaginationConfig) => setPagination((current) => ({
    ...current, current: config.current ?? 1, pageSize: config.pageSize ?? 10,
  }));

  return (
    <PageContainer>
      <PageHeader title="Quản lý Học phí" subtitle="Quản lý hóa đơn, xác nhận thanh toán, gia hạn và hoàn tiền." />
      <Alert type="info" showIcon className="mb-4" message="Hóa đơn quá hạn của khóa OFFLINE sẽ được hệ thống tự động quét và chuyển sang trạng thái Quá hạn lúc 01:00 AM hàng ngày." />
      <div className="mb-4 flex justify-end">
        <Space wrap>
          <Input.Search allowClear placeholder="Tìm mã thanh toán, học viên, khóa học..." value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)} onSearch={(value) => { setPagination((p) => ({ ...p, current: 1 })); setSearch(value.trim()); }} style={{ width: 320 }} />
          <Select allowClear placeholder="Lọc trạng thái" style={{ width: 180 }} value={invoiceStatus}
            onChange={(value) => { setPagination((p) => ({ ...p, current: 1 })); setInvoiceStatus(value); }}
            options={Object.keys(statusLabels).map((value) => ({ value, label: statusLabels[value as InvoiceStatus] }))} />
          <Button icon={<ReloadOutlined />} onClick={() => void loadInvoices(pagination.current, pagination.pageSize)}>Tải lại</Button>
          <Button type="primary" onClick={() => showInvoiceAction('create')}>Tạo hóa đơn</Button>
        </Space>
      </div>
      <Table rowKey="invoiceId" columns={invoiceColumns} dataSource={invoiceRows} loading={loadingInvoices} scroll={{ x: 1200 }}
        pagination={{ ...pagination, showSizeChanger: true, showTotal: (total) => `Tổng ${total} hóa đơn` }} onChange={handleTableChange} />

      <Modal title={actionTitle[action ?? ''] ?? 'Cập nhật hóa đơn'} open={invoiceAction !== null} confirmLoading={busy}
        onCancel={() => { setInvoiceAction(null); setSelectedInvoice(null); }} onOk={() => invoiceAction === 'update' ? (updateAction ? invoiceForm.submit() : toast.error('Vui lòng chọn thao tác cập nhật')) : invoiceForm.submit()} destroyOnClose>
        <Form form={invoiceForm} layout="vertical" onFinish={performInvoiceAction}>
          {invoiceAction === 'create' && <>
            <Form.Item name="courseId" label="Mã khóa học" rules={[{ required: true }]}><InputNumber min={1} className="w-full" /></Form.Item>
            <Form.Item name="studentId" label="Mã học viên"><InputNumber min={1} className="w-full" /></Form.Item>
            <Form.Item name="accountId" label="Mã tài khoản (nếu không nhập mã học viên)"><InputNumber min={1} className="w-full" /></Form.Item>
            <Form.Item name="leadId" label="Mã lead (nếu không nhập hai mã trên)"><InputNumber min={1} className="w-full" /></Form.Item>
            <Form.Item name="amount" label="Số tiền (VNĐ)" rules={[{ required: true }]}><InputNumber min={1} className="w-full" /></Form.Item>
            <Form.Item name="dueAt" label="Hạn thanh toán"><DatePicker showTime className="w-full" /></Form.Item>
          </>}
          {invoiceAction === 'update' && <>
            {selectedInvoice && <Descriptions size="small" column={1} className="mb-4"><Descriptions.Item label="Hóa đơn">{selectedInvoice.invoiceCode}</Descriptions.Item><Descriptions.Item label="Học viên">{selectedInvoice.ownerName || selectedInvoice.ownerEmail || '—'}</Descriptions.Item><Descriptions.Item label="Khóa học">{selectedInvoice.courseTitle || `#${selectedInvoice.courseId}`}</Descriptions.Item><Descriptions.Item label="Trạng thái">{statusLabels[selectedInvoice.status]}</Descriptions.Item></Descriptions>}
            <Form.Item name="updateAction" label="Thao tác cập nhật" rules={[{ required: true }]}><Select placeholder="Chọn thao tác" options={updateOptions} /></Form.Item>
            {updateAction === 'extend' && <Form.Item name="dueAt" label="Hạn thanh toán mới" rules={[{ required: true }]}><DatePicker showTime className="w-full" /></Form.Item>}
            {updateAction === 'cancel' && <Form.Item name="reason" label="Lý do hủy" rules={[{ required: true }]}><Input.TextArea rows={3} /></Form.Item>}
            {updateAction === 'refund' && <>
              <Form.Item name="amount" label="Số tiền hoàn" rules={[{ required: true }]}><InputNumber min={1} max={Number(selectedInvoice?.amount)} className="w-full" /></Form.Item>
              <Form.Item name="paymentMethod" label="Phương thức hoàn" rules={[{ required: true }]}><Select options={[{ value: 'CASH', label: 'Tiền mặt' }, { value: 'BANK_TRANSFER', label: 'Chuyển khoản' }, { value: 'VNPAY', label: 'VNPAY' }]} /></Form.Item>
              <Form.Item name="transactionReference" label="Mã giao dịch"><Input /></Form.Item>
              <Form.Item name="reason" label="Lý do hoàn tiền" rules={[{ required: true }]}><Input.TextArea rows={3} /></Form.Item>
            </>}
            {updateAction === 'cash' && <Text>Xác nhận hóa đơn <b>{selectedInvoice?.invoiceCode}</b> đã thu đủ tiền mặt?</Text>}
          </>}
        </Form>
      </Modal>

      <Modal title={`Chi tiết hóa đơn ${detailInvoice?.invoiceCode ?? ''}`} open={!!detailInvoice} footer={<Button onClick={() => setDetailInvoice(null)}>Đóng</Button>} onCancel={() => setDetailInvoice(null)} width={760} confirmLoading={detailLoading}>
        {detailInvoice && <Descriptions bordered size="small" column={2}>
          <Descriptions.Item label="Mã hóa đơn">{detailInvoice.invoiceCode}</Descriptions.Item>
          <Descriptions.Item label="Loại hóa đơn">{detailInvoice.type === 'REFUND' ? 'Hoàn tiền' : 'Học phí'}</Descriptions.Item>
          <Descriptions.Item label="Trạng thái"><Tag color={invoiceColor[detailInvoice.status]}>{statusLabels[detailInvoice.status]}</Tag></Descriptions.Item>
          <Descriptions.Item label="Số tiền">{moneyText(detailInvoice.amount)}</Descriptions.Item>
          <Descriptions.Item label="Học viên / khách hàng">{detailInvoice.ownerName || '—'}</Descriptions.Item>
          <Descriptions.Item label="Email">{detailInvoice.ownerEmail || '—'}</Descriptions.Item>
          <Descriptions.Item label="Số điện thoại">{detailInvoice.ownerPhone || '—'}</Descriptions.Item>
          <Descriptions.Item label="Mã học viên">{detailInvoice.studentId ?? '—'}</Descriptions.Item>
          <Descriptions.Item label="Mã tài khoản">{detailInvoice.accountId ?? '—'}</Descriptions.Item>
          <Descriptions.Item label="Mã lead">{detailInvoice.leadId ?? '—'}</Descriptions.Item>
          <Descriptions.Item label="Khóa học">{detailInvoice.courseTitle || '—'}</Descriptions.Item>
          <Descriptions.Item label="Mã khóa học">{detailInvoice.courseId}</Descriptions.Item>
          <Descriptions.Item label="Hình thức khóa">{detailInvoice.courseType || '—'}</Descriptions.Item>
          <Descriptions.Item label="Phương thức thanh toán">{detailInvoice.paymentMethod ? methodLabels[detailInvoice.paymentMethod] ?? detailInvoice.paymentMethod : '—'}</Descriptions.Item>
          <Descriptions.Item label="Hạn thanh toán">{dateText(detailInvoice.dueAt)}</Descriptions.Item>
          <Descriptions.Item label="Ngày tạo">{dateText(detailInvoice.createdAt)}</Descriptions.Item>
          <Descriptions.Item label="Ngày thanh toán">{dateText(detailInvoice.paidAt)}</Descriptions.Item>
          <Descriptions.Item label="Mã giao dịch">{detailInvoice.transactionReference || '—'}</Descriptions.Item>
          <Descriptions.Item label="Hóa đơn gốc">{detailInvoice.originalInvoiceId ?? '—'}</Descriptions.Item>
          <Descriptions.Item label="Người xác nhận">{detailInvoice.confirmedBy ?? '—'}</Descriptions.Item>
          <Descriptions.Item label="Người tạo">{detailInvoice.createdBy}</Descriptions.Item>
          <Descriptions.Item label="Lý do / ghi chú" span={2}>{detailInvoice.reason || '—'}</Descriptions.Item>
        </Descriptions>}
      </Modal>
    </PageContainer>
  );
}
