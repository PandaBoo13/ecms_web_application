import { useCallback, useEffect, useState } from 'react';
import {
  Alert, Button, DatePicker, Descriptions, Form, Image, Input, Modal, Select, Space, Table,
  Tag, Tooltip, Typography,
} from 'antd';
import {
  CheckCircleOutlined, ClockCircleOutlined, CopyOutlined, EditOutlined, ExclamationCircleOutlined,
  EyeOutlined, FileTextOutlined, LinkOutlined, ReloadOutlined, StopOutlined,
} from '@ant-design/icons';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import PageContainer from '@/components/common/PageContainer';
import PageHeader from '@/components/common/PageHeader';
import StatsCard from '@/components/common/StatsCard';
import ThumbnailUpload from '@/components/common/ThumbnailUpload';
import { tuitionApi } from '@/services/api/tuition';
import type {
  InvoiceResponse, InvoiceStatus, PaymentLinkResponse,
} from '@/services/types/tuition';

type InvoiceAction = 'update' | 'cash' | 'transfer' | 'extend' | 'cancel' | 'link' | null;
const { Text } = Typography;
const invoiceColor: Record<InvoiceStatus, string> = { PENDING: 'gold', PAID: 'green', OVERDUE: 'red', CANCELLED: 'default' };
const statusLabels: Record<InvoiceStatus, string> = {
  PENDING: 'Chờ thanh toán', PAID: 'Đã thanh toán', OVERDUE: 'Quá hạn', CANCELLED: 'Đã hủy',
};
const methodLabels: Record<string, string> = {
  CASH: 'Tiền mặt',
  BANK_TRANSFER: 'Chuyển khoản (BANK_TRANSFER)',
};
const dateText = (value?: string | null) => value ? dayjs(value).format('DD/MM/YYYY HH:mm') : '—';
const moneyText = (value?: number | null) => value == null ? '—' : `${Number(value).toLocaleString('vi-VN')} ₫`;

export default function TuitionPage() {
  // ===== Hóa đơn =====
  const [invoiceRows, setInvoiceRows] = useState<InvoiceResponse[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [invoiceStatus, setInvoiceStatus] = useState<InvoiceStatus | undefined>();
  const [courseType, setCourseType] = useState<'ONLINE' | 'OFFLINE' | undefined>();
  const [stats, setStats] = useState({ total: 0, pending: 0, paid: 0, overdue: 0, cancelled: 0 });
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [invoiceAction, setInvoiceAction] = useState<InvoiceAction>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceResponse | null>(null);
  const [detailInvoice, setDetailInvoice] = useState<InvoiceResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [invoiceForm] = Form.useForm();
  const [linkResult, setLinkResult] = useState<PaymentLinkResponse | null>(null);

  const loadInvoices = useCallback(async (page = 1, pageSize = 10) => {
    setLoadingInvoices(true);
    try {
      const result = await tuitionApi.searchInvoices({
        type: 'TUITION_PAYMENT',
        page: page - 1, size: pageSize, status: invoiceStatus, courseType, search: search || undefined,
      });
      setInvoiceRows(result.content ?? []);
      setPagination((current) => ({ ...current, current: page, pageSize, total: result.totalElements ?? 0 }));
    } catch {
      toast.error('Không tải được danh sách hóa đơn');
    } finally {
      setLoadingInvoices(false);
    }
  }, [invoiceStatus, courseType, search]);

  const loadStats = useCallback(async () => {
    try {
      const [all, pending, paid, overdue, cancelled] = await Promise.all([
        tuitionApi.searchInvoices({ type: 'TUITION_PAYMENT', page: 0, size: 1 }),
        tuitionApi.searchInvoices({ type: 'TUITION_PAYMENT', page: 0, size: 1, status: 'PENDING' }),
        tuitionApi.searchInvoices({ type: 'TUITION_PAYMENT', page: 0, size: 1, status: 'PAID' }),
        tuitionApi.searchInvoices({ type: 'TUITION_PAYMENT', page: 0, size: 1, status: 'OVERDUE' }),
        tuitionApi.searchInvoices({ type: 'TUITION_PAYMENT', page: 0, size: 1, status: 'CANCELLED' }),
      ]);
      setStats({
        total: all.totalElements ?? 0,
        pending: pending.totalElements ?? 0,
        paid: paid.totalElements ?? 0,
        overdue: overdue.totalElements ?? 0,
        cancelled: cancelled.totalElements ?? 0,
      });
    } catch {
      // Giữ nguyên số liệu cũ nếu không tải được thống kê
    }
  }, []);

  useEffect(() => { void loadInvoices(pagination.current, pagination.pageSize); }, [loadInvoices, pagination.current, pagination.pageSize]);

  useEffect(() => { void loadStats(); }, [loadStats]);

  const selectInvoiceStatus = (value?: InvoiceStatus) => {
    setPagination((current) => ({ ...current, current: 1 }));
    setInvoiceStatus(value);
  };

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
      let successMessage = 'Đã cập nhật hóa đơn thành công';
      let actionFailed = false;
      if (selectedInvoice && effectiveAction === 'cash') {
        await tuitionApi.confirmCash(selectedInvoice.invoiceId, values.proofUrl as string | undefined);
        successMessage = 'Đã xác nhận thu tiền mặt thành công';
      } else if (selectedInvoice && effectiveAction === 'transfer') {
        await tuitionApi.confirmBankTransfer(selectedInvoice.invoiceId, String(values.transactionReference), values.proofUrl as string | undefined);
        successMessage = 'Đã xác nhận chuyển khoản thành công';
      } else if (selectedInvoice && effectiveAction === 'link') {
        const result = await tuitionApi.sendPaymentLink(selectedInvoice.invoiceId, values.email as string | undefined);
        successMessage = result.emailSent
          ? `Đã gửi lại link thanh toán tới ${result.sentTo}`
          : 'Gửi email thất bại; link thanh toán đã được tạo để sao chép thủ công';
        actionFailed = !result.emailSent;
        if (!result.emailSent) setLinkResult(result);
      } else if (selectedInvoice && effectiveAction === 'extend') {
        await tuitionApi.extendDueDate(selectedInvoice.invoiceId, dayjs(values.dueAt as dayjs.ConfigType).format('YYYY-MM-DDTHH:mm:ss'));
      } else if (selectedInvoice && effectiveAction === 'cancel') {
        await tuitionApi.cancelInvoice(selectedInvoice.invoiceId, { reason: String(values.reason) });
      }
      if (actionFailed) toast.error(successMessage);
      else toast.success(successMessage);
      setInvoiceAction(null); setSelectedInvoice(null); invoiceForm.resetFields();
      await loadInvoices(pagination.current, pagination.pageSize);
      await loadStats();
    } catch { toast.error('Thao tác hóa đơn không thành công'); }
    finally { setBusy(false); }
  };

  const showInvoiceAction = (action: Exclude<InvoiceAction, null>, invoice?: InvoiceResponse) => {
    setSelectedInvoice(invoice ?? null); setInvoiceAction(action); invoiceForm.resetFields();
  };

  const copyPaymentLink = async () => {
    if (!linkResult) return;
    try {
      await navigator.clipboard.writeText(linkResult.paymentLink);
      toast.success('Đã sao chép link thanh toán');
    } catch {
      toast.error('Không sao chép được, hãy bôi đen link và sao chép thủ công');
    }
  };

  const invoiceColumns: ColumnsType<InvoiceResponse> = [
    { title: 'Mã hóa đơn', dataIndex: 'invoiceCode', width: 185, render: (value: string) => <Text strong>{value}</Text> },
    {
      title: 'Người thanh toán', dataIndex: 'ownerName', width: 200,
      render: (value: string | null, row) => <div>
        <Text strong>{value || row.ownerEmail || `ID ${row.studentId ?? row.accountId ?? row.leadId ?? '—'}`}</Text>
      </div>,
    },
    { title: 'Khóa học', dataIndex: 'courseTitle', width: 220, render: (value: string | null, row) => value || `Khóa học #${row.courseId}` },
    { title: 'Loại hóa đơn', dataIndex: 'type', width: 145, render: (value: string) => value === 'REFUND' ? 'Hoàn tiền' : 'Học phí' },
    { title: 'Số tiền', dataIndex: 'amount', width: 145, render: moneyText },
    { title: 'Hạn thanh toán', dataIndex: 'dueAt', width: 165, render: dateText },
    { title: 'Phương thức', dataIndex: 'paymentMethod', width: 175, render: (value?: string) => value ? methodLabels[value] ?? value : '—' },
    { title: 'Trạng thái', dataIndex: 'status', width: 145, render: (value: InvoiceStatus) => <Tag color={invoiceColor[value]}>{statusLabels[value]}</Tag> },
    {
      title: 'Thao tác', fixed: 'right', width: 150, align: 'center', render: (_, row) => (
        <Space size={4}>
          <Tooltip title="Xem chi tiết"><Button aria-label="Xem chi tiết" type="text" icon={<EyeOutlined />} onClick={() => void openDetails(row)} /></Tooltip>
          <Tooltip title={row.status === 'PAID' ? 'Hóa đơn đã thanh toán, không thể cập nhật' : 'Cập nhật'}>
            <Button aria-label="Cập nhật" type="text" icon={<EditOutlined />} disabled={row.status === 'PAID'} onClick={() => showInvoiceAction('update', row)} />
          </Tooltip>
        </Space>
      )
    },
  ];

  const action = invoiceAction as string | null;
  const actionTitle: Record<string, string> = {
    update: 'Cập nhật hóa đơn', cash: 'Xác nhận thu tiền mặt', transfer: 'Xác nhận chuyển khoản',
    extend: 'Gia hạn hóa đơn', cancel: 'Hủy hóa đơn', link: 'Gửi lại link thanh toán',
  };
  const updateOptions = selectedInvoice ? [
    ...(selectedInvoice.type === 'TUITION_PAYMENT' && ['PENDING', 'OVERDUE'].includes(selectedInvoice.status) ? [
      { value: 'cash', label: 'Xác nhận đã thu tiền mặt' }, { value: 'transfer', label: 'Xác nhận đã chuyển khoản' },
      { value: 'cancel', label: 'Hủy hóa đơn' },
    ] : []),
    ...(selectedInvoice.status === 'PENDING' && selectedInvoice.type === 'TUITION_PAYMENT'
      ? [{ value: 'link', label: 'Gửi lại link thanh toán' }] : []),
    ...(selectedInvoice.status === 'OVERDUE' ? [{ value: 'extend', label: 'Gia hạn thanh toán' }] : []),
  ] : [];
  const updateAction = Form.useWatch('updateAction', invoiceForm) as InvoiceAction | undefined;

  const handleTableChange = (config: TablePaginationConfig) => setPagination((current) => ({
    ...current, current: config.current ?? 1, pageSize: config.pageSize ?? 10,
  }));

  const invoiceTab = (
    <>
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatsCard
          title="Tổng hóa đơn"
          value={stats.total}
          icon={<FileTextOutlined />}
          color="#2563eb"
          bgColor="#eff6ff"
          active={!invoiceStatus}
          onClick={() => selectInvoiceStatus(undefined)}
          tooltip="Nhấn để xem toàn bộ hóa đơn"
        />
        <StatsCard
          title="Chờ thanh toán"
          value={stats.pending}
          icon={<ClockCircleOutlined />}
          color="#f59e0b"
          bgColor="#fffbeb"
          active={invoiceStatus === 'PENDING'}
          onClick={() => selectInvoiceStatus(invoiceStatus === 'PENDING' ? undefined : 'PENDING')}
          tooltip="Nhấn để lọc hóa đơn chờ thanh toán"
        />
        <StatsCard
          title="Đã thanh toán"
          value={stats.paid}
          icon={<CheckCircleOutlined />}
          color="#10b981"
          bgColor="#ecfdf5"
          active={invoiceStatus === 'PAID'}
          onClick={() => selectInvoiceStatus(invoiceStatus === 'PAID' ? undefined : 'PAID')}
          tooltip="Nhấn để lọc hóa đơn đã thanh toán"
        />
        <StatsCard
          title="Quá hạn"
          value={stats.overdue}
          icon={<ExclamationCircleOutlined />}
          color="#ef4444"
          bgColor="#fef2f2"
          active={invoiceStatus === 'OVERDUE'}
          onClick={() => selectInvoiceStatus(invoiceStatus === 'OVERDUE' ? undefined : 'OVERDUE')}
          tooltip="Nhấn để lọc hóa đơn quá hạn"
        />
        <StatsCard
          title="Đã hủy"
          value={stats.cancelled}
          icon={<StopOutlined />}
          color="#64748b"
          bgColor="#f1f5f9"
          active={invoiceStatus === 'CANCELLED'}
          onClick={() => selectInvoiceStatus(invoiceStatus === 'CANCELLED' ? undefined : 'CANCELLED')}
          tooltip="Nhấn để lọc hóa đơn đã hủy"
        />
      </div>
      <div className="mb-4 flex justify-end">
        <Space wrap>
          <Input.Search allowClear placeholder="Tìm mã thanh toán, học viên, khóa học..." value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)} onSearch={(value) => { setPagination((p) => ({ ...p, current: 1 })); setSearch(value.trim()); }} style={{ width: 320 }} />
          <Select style={{ width: 180 }} value={invoiceStatus ?? ''}
            onChange={(value) => selectInvoiceStatus(value ? (value as InvoiceStatus) : undefined)}
            options={[
              { value: '', label: 'Tất cả trạng thái' },
              ...Object.keys(statusLabels).map((value) => ({ value, label: statusLabels[value as InvoiceStatus] })),
            ]} />
          <Select style={{ width: 190 }} value={courseType ?? ''}
            onChange={(value) => {
              setPagination((p) => ({ ...p, current: 1 }));
              setCourseType(value ? (value as 'ONLINE' | 'OFFLINE') : undefined);
            }}
            options={[
              { value: '', label: 'Tất cả hình thức' },
              { value: 'OFFLINE', label: 'Khóa Offline' },
              { value: 'ONLINE', label: 'Khóa Online' },
            ]} />
          <Button icon={<ReloadOutlined />} onClick={() => { void loadInvoices(pagination.current, pagination.pageSize); void loadStats(); }}>Tải lại</Button>
        </Space>
      </div>
      <Table rowKey="invoiceId" columns={invoiceColumns} dataSource={invoiceRows} loading={loadingInvoices} scroll={{ x: 1450 }}
        pagination={{ ...pagination, showSizeChanger: true, showTotal: (total) => `Tổng ${total} hóa đơn` }} onChange={handleTableChange} />
    </>
  );

  return (
    <PageContainer>
      <PageHeader title="Quản lý hóa đơn" subtitle="Theo dõi, cập nhật và xác nhận thanh toán hóa đơn học phí của học viên." />
      {invoiceTab}

      {/* Kết quả link thanh toán */}
      <Modal title="Link thanh toán học phí" open={!!linkResult} width={620}
        onCancel={() => setLinkResult(null)}
        footer={[
          <Button key="copy" icon={<CopyOutlined />} onClick={() => void copyPaymentLink()}>Sao chép link</Button>,
          <Button key="open" type="primary" icon={<LinkOutlined />} disabled={!linkResult}
            onClick={() => linkResult && window.open(linkResult.paymentLink, '_blank', 'noopener,noreferrer')}>Mở trang thanh toán</Button>,
          <Button key="close" onClick={() => setLinkResult(null)}>Đóng</Button>,
        ]}>
        {linkResult && <>
          {linkResult.emailSent
            ? <Alert type="success" showIcon className="mb-4" message={`Đã gửi email tới ${linkResult.sentTo}`} />
            : <Alert type="warning" showIcon className="mb-4"
              message="Gửi email thất bại"
              description={linkResult.emailError || 'Hãy sao chép link bên dưới và gửi qua kênh khác (Zalo/SMS).'} />}
          <Descriptions size="small" column={1} bordered>
            <Descriptions.Item label="Người nhận">{linkResult.sentTo}</Descriptions.Item>
            <Descriptions.Item label="Hạn link">{dateText(linkResult.expiresAt)}</Descriptions.Item>
            <Descriptions.Item label="Link">
              <Input.TextArea value={linkResult.paymentLink} readOnly autoSize={{ minRows: 2, maxRows: 4 }} />
            </Descriptions.Item>
          </Descriptions>
        </>}
      </Modal>

      {/* Cập nhật hóa đơn */}
      <Modal title={actionTitle[action ?? ''] ?? 'Cập nhật hóa đơn'} open={invoiceAction !== null} confirmLoading={busy}
        okText={invoiceAction === 'update' && updateAction === 'link' ? 'Gửi lại link' : 'Xác nhận'}
        onCancel={() => { setInvoiceAction(null); setSelectedInvoice(null); }} onOk={() => invoiceAction === 'update' ? (updateAction ? invoiceForm.submit() : toast.error('Vui lòng chọn thao tác cập nhật')) : invoiceForm.submit()} destroyOnClose>
        <Form form={invoiceForm} layout="vertical" onFinish={performInvoiceAction}>
          {invoiceAction === 'update' && <>
            {selectedInvoice && <Descriptions size="small" column={1} className="mb-4"><Descriptions.Item label="Hóa đơn">{selectedInvoice.invoiceCode}</Descriptions.Item><Descriptions.Item label="Học viên">{selectedInvoice.ownerName || selectedInvoice.ownerEmail || '—'}</Descriptions.Item><Descriptions.Item label="Khóa học">{selectedInvoice.courseTitle || `#${selectedInvoice.courseId}`}</Descriptions.Item><Descriptions.Item label="Trạng thái">{statusLabels[selectedInvoice.status]}</Descriptions.Item></Descriptions>}
            <Form.Item name="updateAction" label="Thao tác cập nhật" rules={[{ required: true }]}><Select placeholder="Chọn thao tác" options={updateOptions} /></Form.Item>
            {updateAction === 'extend' && <Form.Item name="dueAt" label="Hạn thanh toán mới" rules={[{ required: true }]}><DatePicker showTime className="w-full" /></Form.Item>}
            {updateAction === 'cancel' && <Form.Item name="reason" label="Lý do hủy" rules={[{ required: true }]}><Input.TextArea rows={3} /></Form.Item>}
            {updateAction === 'cash' && <>
              <Text>Xác nhận hóa đơn <b>{selectedInvoice?.invoiceCode}</b> đã thu đủ tiền mặt?</Text>
              <Form.Item name="proofUrl" label="Ảnh chứng từ (tuỳ chọn)" className="mt-4"><ThumbnailUpload width={260} height={150} /></Form.Item>
            </>}
            {updateAction === 'transfer' && <>
              <Alert type="info" showIcon className="mb-4" message="Chỉ xác nhận sau khi đã đối soát tiền vào tài khoản ngân hàng." />
              <Form.Item name="transactionReference" label="Mã giao dịch ngân hàng" rules={[{ required: true, whitespace: true, message: 'Vui lòng nhập mã giao dịch ngân hàng' }]}>
                <Input />
              </Form.Item>
              <Form.Item name="proofUrl" label="Ảnh chứng từ (tuỳ chọn)"><ThumbnailUpload width={260} height={150} /></Form.Item>
            </>}
            {updateAction === 'link' && <>
              <Alert type="info" showIcon className="mb-4" message="Gửi lại link thanh toán cho hóa đơn đang chờ thanh toán." />
              <Form.Item name="email" label="Email nhận link (bỏ trống để dùng email trên hóa đơn)" rules={[{ type: 'email', message: 'Email không hợp lệ' }]}>
                <Input placeholder={selectedInvoice?.ownerEmail || 'email@example.com'} />
              </Form.Item>
            </>}
          </>}
        </Form>
      </Modal>

      {/* Chi tiết hóa đơn */}
      <Modal title={`Chi tiết hóa đơn ${detailInvoice?.invoiceCode ?? ''}`} open={!!detailInvoice} footer={<Button onClick={() => setDetailInvoice(null)}>Đóng</Button>} onCancel={() => setDetailInvoice(null)} width={760} confirmLoading={detailLoading}>
        {detailInvoice && <Space direction="vertical" size="middle" className="w-full">
          <Descriptions title="Thông tin hóa đơn" bordered size="small" column={2}>
            <Descriptions.Item label="Mã hóa đơn">{detailInvoice.invoiceCode}</Descriptions.Item>
            <Descriptions.Item label="Loại hóa đơn">{detailInvoice.type === 'REFUND' ? 'Hoàn tiền' : 'Học phí'}</Descriptions.Item>
            <Descriptions.Item label="Trạng thái"><Tag color={invoiceColor[detailInvoice.status]}>{statusLabels[detailInvoice.status]}</Tag></Descriptions.Item>
            <Descriptions.Item label="Số tiền">{moneyText(detailInvoice.amount)}</Descriptions.Item>
          </Descriptions>
          <Descriptions title="Người thanh toán" bordered size="small" column={2}>
            <Descriptions.Item label="Họ tên">{detailInvoice.ownerName || '—'}</Descriptions.Item>
            <Descriptions.Item label="Email">{detailInvoice.ownerEmail || '—'}</Descriptions.Item>
            <Descriptions.Item label="Số điện thoại">{detailInvoice.ownerPhone || '—'}</Descriptions.Item>
            {detailInvoice.studentId != null && <Descriptions.Item label="Mã học viên">{detailInvoice.studentId}</Descriptions.Item>}
            {detailInvoice.leadId != null && <Descriptions.Item label="Mã Lead">{detailInvoice.leadId}</Descriptions.Item>}
            {detailInvoice.accountId != null && <Descriptions.Item label="Mã tài khoản">{detailInvoice.accountId}</Descriptions.Item>}
          </Descriptions>
          <Descriptions title="Khóa học" bordered size="small" column={2}>
            <Descriptions.Item label="Tên khóa học">{detailInvoice.courseTitle || `Khóa học #${detailInvoice.courseId}`}</Descriptions.Item>
            <Descriptions.Item label="Hình thức khóa">{detailInvoice.courseType || '—'}</Descriptions.Item>
          </Descriptions>
          <Descriptions title="Thanh toán" bordered size="small" column={2}>
            <Descriptions.Item label="Phương thức">{detailInvoice.paymentMethod ? methodLabels[detailInvoice.paymentMethod] ?? detailInvoice.paymentMethod : '—'}</Descriptions.Item>
            <Descriptions.Item label="Hạn thanh toán">{dateText(detailInvoice.dueAt)}</Descriptions.Item>
            <Descriptions.Item label="Ngày tạo hóa đơn">{dateText(detailInvoice.createdAt)}</Descriptions.Item>
            <Descriptions.Item label="Ngày thanh toán">{dateText(detailInvoice.paidAt)}</Descriptions.Item>
            <Descriptions.Item label="Mã giao dịch">{detailInvoice.transactionReference || '—'}</Descriptions.Item>
            <Descriptions.Item label="Người xác nhận">{detailInvoice.confirmedBy ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="Người tạo hóa đơn">{detailInvoice.createdBy}</Descriptions.Item>
          </Descriptions>
          {(detailInvoice.originalInvoiceId != null || detailInvoice.reason) && (
            <Descriptions title="Thông tin bổ sung" bordered size="small" column={2}>
              {detailInvoice.originalInvoiceId != null && <Descriptions.Item label="Hóa đơn gốc">{detailInvoice.originalInvoiceId}</Descriptions.Item>}
              <Descriptions.Item label="Lý do / ghi chú" span={2}>{detailInvoice.reason || '—'}</Descriptions.Item>
            </Descriptions>
          )}
          {detailInvoice.paymentProofUrl && (
            <Descriptions title="Ảnh chứng từ" bordered size="small" column={1}>
              <Descriptions.Item label="Ảnh">
                <Image src={detailInvoice.paymentProofUrl} width={200} />
              </Descriptions.Item>
            </Descriptions>
          )}
        </Space>}
      </Modal>
    </PageContainer>
  );
}
