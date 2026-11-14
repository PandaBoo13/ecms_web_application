import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button, Result, Spin } from 'antd';
import { LAST_ONLINE_PAYMENT_INVOICE_KEY, LAST_ONLINE_PAYMENT_TOKEN_KEY, publicTuitionApi, tuitionApi } from '@/services/api/tuition';
import type { VnpayReturnResponse } from '@/services/types/tuition';
import { formatMoney } from '@/utils/format';
import { LAST_PAYMENT_LINK_KEY } from './PaymentLinkPage';

const readLastPaymentLink = (): string | null => {
  try {
    return sessionStorage.getItem(LAST_PAYMENT_LINK_KEY);
  } catch {
    return null;
  }
};

/**
 * VNPAY chuyển trình duyệt về đây (VNPAY_RETURN_URL).
 * Không tin tham số trên URL: gửi nguyên bộ vnp_* lên backend để kiểm chữ ký và đọc trạng thái hoá đơn.
 */
export default function VnpayReturnPage() {
  const { search } = useLocation();
  const navigate = useNavigate();
  const hasTransaction = new URLSearchParams(search).has('vnp_TxnRef');
  const [result, setResult] = useState<VnpayReturnResponse | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const requested = useRef(false);
  const error = hasTransaction ? requestError : 'Không có thông tin giao dịch.';

  useEffect(() => {
    if (!hasTransaction || requested.current) return;
    requested.current = true;
    publicTuitionApi
      .verifyVnpayReturn(search)
      .then(setResult)
      .catch((e: Error) => setRequestError(e.message || 'Không xác minh được kết quả thanh toán.'));
  }, [search, hasTransaction]);

  if (!result && !error) {
    return (
      <div style={{ padding: 80, textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  const lastPaymentLink = readLastPaymentLink();
  const lastOnlineInvoiceId = (() => {
    try {
      const value = sessionStorage.getItem(LAST_ONLINE_PAYMENT_INVOICE_KEY);
      const parsed = value ? Number(value) : NaN;
      return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
    } catch {
      return null;
    }
  })();
  const lastCheckoutToken = (() => {
    try {
      return sessionStorage.getItem(LAST_ONLINE_PAYMENT_TOKEN_KEY);
    } catch {
      return null;
    }
  })();
  const retryOnlinePayment = async () => {
    if (!lastCheckoutToken && !lastOnlineInvoiceId) return;
    setRetrying(true);
    try {
      // Guest checkouts retry with the signed token; logged-in students may fall back to the invoice endpoint.
      const paymentUrl = lastCheckoutToken
        ? await publicTuitionApi.createVnpayUrl(lastCheckoutToken)
        : await tuitionApi.createVnpayPayment(lastOnlineInvoiceId!);
      window.location.assign(paymentUrl);
    } catch (e) {
      setRequestError((e as Error).message || 'Không thể tạo lại giao dịch. Bạn có thể thử từ mục Hóa đơn.');
      setRetrying(false);
    }
  };
  const home = (
    <Button key="home" onClick={() => navigate('/')}>
      Về trang chủ
    </Button>
  );
  const myCourses = (
    <Button key="courses" onClick={() => navigate('/student/courses')}>
      Khóa học của tôi
    </Button>
  );

  if (result?.success) {
    return (
      <Result
        status="success"
        title="Thanh toán học phí thành công"
        subTitle={`Hoá đơn ${result.invoiceCode ?? ''} · ${formatMoney(result.amount, false)}. Hoá đơn và thông tin tài khoản (nếu vừa được cấp) đã được gửi tới email của bạn.`}
        extra={[myCourses, home]}
      />
    );
  }

  return (
    <Result
      status="error"
      title="Thanh toán chưa thành công"
      subTitle={error ?? result?.message}
      extra={[
          (lastCheckoutToken || lastOnlineInvoiceId) && (
            <Button key="retry-online" type="primary" loading={retrying} onClick={() => void retryOnlinePayment()}>
              Thử thanh toán lại
            </Button>
          ),
        lastPaymentLink && (
          <Button key="retry" type={lastCheckoutToken || lastOnlineInvoiceId ? 'default' : 'primary'} onClick={() => navigate(lastPaymentLink)}>
            Thử thanh toán lại
          </Button>
        ),
        home,
      ]}
    />
  );
}
