import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, Button, Card, Descriptions, Result, Spin, Tag, Typography } from 'antd';
import { publicTuitionApi } from '@/services/api/tuition';
import type { InvoiceStatus, PublicInvoiceResponse } from '@/services/types/tuition';
import { formatDate, formatDateTime, formatMoney } from '@/utils/format';

/** Khoá sessionStorage: nhớ link vừa mở để trang kết quả cho phép "Thử thanh toán lại". */
export const LAST_PAYMENT_LINK_KEY = 'ecms_last_payment_link';

const statusTag: Record<InvoiceStatus, { color: string; label: string }> = {
  PENDING: { color: 'gold', label: 'Chờ thanh toán' },
  PAID: { color: 'green', label: 'Đã thanh toán' },
  OVERDUE: { color: 'red', label: 'Quá hạn' },
  CANCELLED: { color: 'default', label: 'Đã huỷ' },
};

/** Trang công khai mở từ link trong email: /pay?token=... */
export default function PaymentLinkPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token');
  const [invoice, setInvoice] = useState<PublicInvoiceResponse | null>(null);
  const [error, setError] = useState<string | null>(token ? null : 'Liên kết thanh toán không đầy đủ.');
  const [loading, setLoading] = useState(Boolean(token));
  const [redirecting, setRedirecting] = useState(false);
  const autoRedirectedToken = useRef<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let active = true;
    const loadInvoice = async () => {
      try {
        const result = await publicTuitionApi.getPaymentLink(token);
        if (!active) return;
        setInvoice(result);
        setLoading(false);

        // Email links remain valid for the invoice due date. Create the short-lived
        // VNPAY URL only when the payer opens the link, then send them straight there.
        if (result.status === 'PENDING' && autoRedirectedToken.current !== token) {
          autoRedirectedToken.current = token;
          setRedirecting(true);
          try {
            const paymentUrl = await publicTuitionApi.createVnpayUrl(token);
            if (!active) return;
            try {
              sessionStorage.setItem(LAST_PAYMENT_LINK_KEY, `/pay?token=${encodeURIComponent(token)}`);
            } catch {
              /* trình duyệt chặn storage: bỏ qua, chỉ mất nút "Thử thanh toán lại" */
            }
            window.location.assign(paymentUrl);
          } catch (e) {
            if (active) setError((e as Error).message || 'Không tạo được liên kết VNPAY, vui lòng thử lại.');
          } finally {
            if (active) setRedirecting(false);
          }
        }
      } catch (e) {
        if (active) setError((e as Error).message || 'Liên kết thanh toán không hợp lệ hoặc đã hết hạn.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadInvoice();
    return () => { active = false; };
  }, [token]);

  const pay = async () => {
    if (!token) return;
    setRedirecting(true);
    try {
      setError(null);
      const paymentUrl = await publicTuitionApi.createVnpayUrl(token);
      try {
        sessionStorage.setItem(LAST_PAYMENT_LINK_KEY, `/pay?token=${encodeURIComponent(token)}`);
      } catch {
        /* trình duyệt chặn storage: bỏ qua, chỉ mất nút "Thử lại" */
      }
      window.location.assign(paymentUrl);
    } catch (e) {
      setError((e as Error).message || 'Không tạo được liên kết VNPAY, vui lòng thử lại.');
      setRedirecting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 80, textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <Result
        status="error"
        title="Link thanh toán không còn khả dụng"
        subTitle={error}
        extra={<Button onClick={() => navigate('/')}>Về trang chủ</Button>}
      />
    );
  }

  const invoiceSummary = `Hóa đơn ${invoice.invoiceCode} · ${formatMoney(invoice.amount, false)}`;
  if (invoice.status === 'PAID') {
    return (
      <Result
        status="success"
        title="Hóa đơn đã được thanh toán"
        subTitle={`${invoiceSummary}. Bạn không cần thanh toán lại.`}
        extra={<Button type="primary" onClick={() => navigate('/')}>Về trang chủ</Button>}
      />
    );
  }
  if (invoice.status === 'OVERDUE') {
    return (
      <Result
        status="warning"
        title="Hóa đơn đã hết hạn thanh toán"
        subTitle={`${invoiceSummary}. Vui lòng liên hệ trung tâm để được gia hạn và nhận link mới.`}
        extra={<Button onClick={() => navigate('/')}>Về trang chủ</Button>}
      />
    );
  }
  if (invoice.status === 'CANCELLED') {
    return (
      <Result
        status="info"
        title="Hóa đơn đã bị hủy"
        subTitle={`${invoiceSummary}. Link này không thể dùng để thanh toán; vui lòng liên hệ trung tâm nếu cần hỗ trợ.`}
        extra={<Button onClick={() => navigate('/')}>Về trang chủ</Button>}
      />
    );
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '40px 16px' }}>
      <Card>
        <Typography.Title level={3} style={{ marginTop: 0 }}>
          Thanh toán học phí
        </Typography.Title>
        <Descriptions column={1} size="middle" labelStyle={{ width: 150 }}>
          <Descriptions.Item label="Mã hoá đơn">{invoice.invoiceCode}</Descriptions.Item>
          <Descriptions.Item label="Khoá học">{invoice.courseTitle ?? '—'}</Descriptions.Item>
          {invoice.courseStartDate && (
            <Descriptions.Item label="Khai giảng">{formatDate(invoice.courseStartDate)}</Descriptions.Item>
          )}
          <Descriptions.Item label="Người học">{invoice.payerName ?? '—'}</Descriptions.Item>
          {invoice.payerEmailMasked && (
            <Descriptions.Item label="Email">{invoice.payerEmailMasked}</Descriptions.Item>
          )}
          {invoice.dueAt && <Descriptions.Item label="Hạn thanh toán">{formatDateTime(invoice.dueAt)}</Descriptions.Item>}
          <Descriptions.Item label="Trạng thái">
            <Tag color={statusTag[invoice.status].color}>{statusTag[invoice.status].label}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Số tiền">
            <Typography.Text strong style={{ fontSize: 20 }}>
              {formatMoney(invoice.amount, false)}
            </Typography.Text>
          </Descriptions.Item>
        </Descriptions>

        {error && <Alert type="error" showIcon message={error} style={{ marginTop: 16 }} />}

        {invoice.status === 'PENDING' && (
          <Button type="primary" size="large" block loading={redirecting} onClick={() => void pay()} style={{ marginTop: 24 }}>
            Thanh toán qua VNPAY
          </Button>
        )}
      </Card>
    </div>
  );
}
