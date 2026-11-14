import type { InvoiceResponse } from '@/services/types/tuition';

const escapeHtml = (value: unknown): string => String(value ?? '—')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const formatMoney = (amount: number): string =>
  `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(amount)} ₫`;

const formatDate = (value: string | null): string => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(date);
};

const statusPresentation: Record<InvoiceResponse['status'], { label: string; tone: string; note: string }> = {
  PENDING: { label: 'CHỜ THANH TOÁN', tone: 'amber', note: 'Hóa đơn này chưa được ghi nhận thanh toán.' },
  PAID: { label: 'ĐÃ THANH TOÁN', tone: 'green', note: 'Hệ thống đã ghi nhận khoản thanh toán này.' },
  OVERDUE: { label: 'ĐÃ QUÁ HẠN', tone: 'red', note: 'Hóa đơn đã quá hạn thanh toán.' },
  CANCELLED: { label: 'ĐÃ HỦY', tone: 'slate', note: 'Hóa đơn này đã được hủy.' },
};

const paymentMethodLabel: Record<string, string> = {
  CASH: 'Tiền mặt',
  BANK_TRANSFER: 'Chuyển khoản qua VNPAY',
};

export function printTuitionInvoice(invoice: InvoiceResponse): boolean {
  const printWindow = window.open('', '_blank', 'width=900,height=1100');
  if (!printWindow) return false;

  const status = statusPresentation[invoice.status];
  const paymentMethod = invoice.paymentMethod
    ? paymentMethodLabel[invoice.paymentMethod] ?? invoice.paymentMethod
    : 'Chưa xác định';
  const ownerName = invoice.ownerName || 'Người học';
  const courseName = invoice.courseTitle || `Khóa học #${invoice.courseId}`;
  const courseTypeLabel = invoice.courseType === 'ONLINE' ? 'Khóa học online' : 'Khóa học offline';
  const statusNote = invoice.status === 'PAID' && invoice.paymentMethod === 'CASH'
    ? 'Khoản học phí đã được nhân viên xác nhận thu bằng tiền mặt.'
    : status.note;

  printWindow.document.open();
  printWindow.document.write(`<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Hóa đơn ${escapeHtml(invoice.invoiceCode)}</title>
  <style>
    @page { size: A4; margin: 14mm; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #172033; background: #eef2f7; font-family: Arial, "Segoe UI", sans-serif; }
    .sheet { width: 210mm; min-height: 297mm; margin: 24px auto; padding: 15mm; background: #fff; }
    .topline { height: 5px; margin: -15mm -15mm 28px; background: linear-gradient(90deg, #123b66 0%, #1769aa 65%, #4bb5c4 100%); }
    .header { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; padding-bottom: 22px; border-bottom: 1px solid #dce4ee; }
    .brand { display: flex; align-items: center; gap: 12px; }
    .brand-mark { display: grid; width: 48px; height: 48px; place-items: center; border-radius: 13px; color: #fff; background: #123b66; font-size: 17px; font-weight: 800; letter-spacing: .04em; }
    .brand-name { margin: 0; color: #123b66; font-size: 19px; font-weight: 800; letter-spacing: .08em; }
    .brand-sub { margin-top: 4px; color: #718096; font-size: 10px; letter-spacing: .12em; text-transform: uppercase; }
    .document-heading { text-align: right; }
    .document-heading h1 { margin: 0; color: #123b66; font-size: 21px; letter-spacing: .035em; }
    .document-heading p { margin: 7px 0 0; color: #718096; font-size: 11px; }
    .code { margin-top: 5px !important; color: #172033 !important; font-family: Consolas, monospace; font-size: 13px !important; font-weight: 700; }
    .status { display: inline-block; margin-top: 12px; padding: 6px 10px; border-radius: 999px; font-size: 9px; font-weight: 800; letter-spacing: .08em; }
    .status.green { color: #11643c; background: #e8f7ef; }
    .status.amber { color: #8a4b0c; background: #fff4d6; }
    .status.red { color: #9f2d2d; background: #fdeaea; }
    .status.slate { color: #536174; background: #edf1f5; }
    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 22px 0; }
    .meta-item { padding: 12px 14px; border: 1px solid #e2e8f0; border-radius: 9px; }
    .label { display: block; margin-bottom: 5px; color: #718096; font-size: 9px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
    .value { color: #172033; font-size: 12px; font-weight: 600; overflow-wrap: anywhere; }
    .section-title { margin: 23px 0 10px; color: #123b66; font-size: 11px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; }
    .customer { display: grid; grid-template-columns: 1fr 1fr; gap: 14px 24px; padding: 16px; border: 1px solid #e2e8f0; border-radius: 10px; background: #fbfcfe; }
    .customer .wide { grid-column: 1 / -1; }
    table { width: 100%; margin-top: 10px; border-collapse: collapse; }
    th { padding: 11px 12px; color: #607086; background: #f4f7fb; font-size: 9px; letter-spacing: .07em; text-align: left; text-transform: uppercase; }
    td { padding: 14px 12px; border-bottom: 1px solid #e6ebf2; font-size: 12px; vertical-align: top; }
    .amount { text-align: right; white-space: nowrap; font-weight: 700; }
    .course-title { color: #172033; font-size: 13px; font-weight: 700; }
    .course-sub { margin-top: 5px; color: #718096; font-size: 10px; }
    .total { display: flex; justify-content: flex-end; margin-top: 15px; }
    .total-card { width: 270px; padding: 15px 17px; border-radius: 10px; color: #fff; background: #123b66; }
    .total-label { font-size: 9px; letter-spacing: .1em; text-transform: uppercase; opacity: .78; }
    .total-amount { margin-top: 7px; font-size: 23px; font-weight: 800; }
    .payment { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 22px; padding: 16px; border: 1px solid #dce7f1; border-radius: 10px; background: #f7fafc; }
    .notice { margin-top: 17px; padding: 12px 14px; border-left: 3px solid #1769aa; color: #506176; background: #f1f7fc; font-size: 10px; line-height: 1.55; }
    .signature { display: grid; grid-template-columns: 1fr 1fr; gap: 36px; margin-top: 47px; text-align: center; }
    .sign-label { color: #536174; font-size: 10px; font-weight: 700; }
    .sign-hint { margin-top: 56px; color: #8a96a7; font-size: 9px; }
    .footer { margin-top: 30px; padding-top: 12px; border-top: 1px solid #e2e8f0; color: #8995a5; font-size: 9px; line-height: 1.5; text-align: center; }
    @media print {
      body { background: #fff; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      .sheet { width: auto; min-height: 0; margin: 0; padding: 0; }
      .topline { margin: 0 0 24px; }
    }
    @media screen and (max-width: 760px) {
      .sheet { width: 100%; min-height: 0; margin: 0; padding: 24px; }
      .topline { margin: -24px -24px 24px; }
      .header { flex-direction: column; }
      .document-heading { text-align: left; }
    }
  </style>
</head>
<body>
  <main class="sheet">
    <div class="topline"></div>
    <header class="header">
      <div class="brand">
        <div class="brand-mark">ECMS</div>
        <div><p class="brand-name">ECMS</p><div class="brand-sub">Education Center</div></div>
      </div>
      <div class="document-heading">
        <h1>HÓA ĐƠN HỌC PHÍ</h1>
        <p>Thông tin khoản thu khóa học</p>
        <p class="code">${escapeHtml(invoice.invoiceCode)}</p>
        <span class="status ${status.tone}">${status.label}</span>
      </div>
    </header>

    <section class="meta">
      <div class="meta-item"><span class="label">Ngày tạo</span><span class="value">${formatDate(invoice.createdAt)}</span></div>
      <div class="meta-item"><span class="label">Hạn thanh toán</span><span class="value">${formatDate(invoice.dueAt)}</span></div>
    </section>

    <h2 class="section-title">Thông tin người học</h2>
    <section class="customer">
      <div class="wide"><span class="label">Họ và tên</span><span class="value">${escapeHtml(ownerName)}</span></div>
      <div><span class="label">Email</span><span class="value">${escapeHtml(invoice.ownerEmail)}</span></div>
      <div><span class="label">Số điện thoại</span><span class="value">${escapeHtml(invoice.ownerPhone)}</span></div>
    </section>

    <h2 class="section-title">Chi tiết học phí</h2>
    <table>
      <thead><tr><th style="width:54px">STT</th><th>Nội dung</th><th style="width:90px;text-align:center">Số lượng</th><th style="width:150px;text-align:right">Thành tiền</th></tr></thead>
      <tbody><tr>
        <td>01</td>
        <td><div class="course-title">${escapeHtml(courseName)}</div><div class="course-sub">${courseTypeLabel} · Mã khóa học #${escapeHtml(invoice.courseId)}</div></td>
        <td style="text-align:center">1 khóa</td>
        <td class="amount">${formatMoney(invoice.amount)}</td>
      </tr></tbody>
    </table>

    <div class="total"><div class="total-card"><div class="total-label">Tổng học phí</div><div class="total-amount">${formatMoney(invoice.amount)}</div></div></div>

    <h2 class="section-title">Thông tin thanh toán</h2>
    <section class="payment">
      <div><span class="label">Phương thức</span><span class="value">${escapeHtml(paymentMethod)}</span></div>
      <div><span class="label">Trạng thái</span><span class="value">${status.label}</span></div>
      <div><span class="label">Ngày thanh toán</span><span class="value">${formatDate(invoice.paidAt)}</span></div>
      <div><span class="label">Mã giao dịch</span><span class="value">${escapeHtml(invoice.transactionReference)}</span></div>
    </section>
    <div class="notice">${statusNote} Hóa đơn được xuất từ hệ thống ECMS. Vui lòng liên hệ trung tâm nếu cần điều chỉnh thông tin.</div>

    <section class="signature">
      <div><div class="sign-label">NGƯỜI LẬP HÓA ĐƠN</div><div class="sign-hint">Ký và ghi rõ họ tên</div></div>
      <div><div class="sign-label">NGƯỜI THANH TOÁN</div><div class="sign-hint">Ký và ghi rõ họ tên</div></div>
    </section>
    <footer class="footer">ECMS · Hệ thống quản lý trung tâm đào tạo<br />Bản in được tạo lúc ${formatDate(new Date().toISOString())}</footer>
  </main>
  <script>window.addEventListener('load', function () { setTimeout(function () { window.focus(); window.print(); }, 250); });</script>
</body>
</html>`);
  printWindow.document.close();
  return true;
}
