import type { InvoiceResponse } from '@/services/types/tuition';

const escapeHtml = (value: unknown): string => String(value ?? '—')
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#039;');

const money = (amount: number) => `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(amount)} ₫`;
const date = (value: string | null) => value
  ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(value))
  : '—';

const statuses: Record<InvoiceResponse['status'], { label: string; tone: string }> = {
  PENDING: { label: 'CHỜ THANH TOÁN', tone: '#a16207' },
  PAID: { label: 'ĐÃ THANH TOÁN', tone: '#15803d' },
  OVERDUE: { label: 'ĐÃ QUÁ HẠN', tone: '#b91c1c' },
  CANCELLED: { label: 'ĐÃ HỦY', tone: '#475569' },
};

/** Opens a print-ready A4 invoice; the browser's print dialog can save it as PDF. */
export function printTuitionInvoice(invoice: InvoiceResponse): boolean {
  const printWindow = window.open('', '_blank', 'width=900,height=1100');
  if (!printWindow) return false;
  const status = statuses[invoice.status];
  const course = invoice.courseTitle || `Khóa học #${invoice.courseId}`;
  const method = invoice.paymentMethod === 'CASH' ? 'Tiền mặt'
    : invoice.paymentMethod === 'BANK_TRANSFER' ? 'Chuyển khoản qua VNPAY' : 'Chưa xác định';
  printWindow.document.open();
  printWindow.document.write(`<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>Hóa đơn ${escapeHtml(invoice.invoiceCode)}</title>
<style>
@page{size:A4;margin:16mm}*{box-sizing:border-box}body{margin:0;color:#172033;font:14px Arial,"Segoe UI",sans-serif}.sheet{max-width:780px;margin:auto}.bar{height:7px;background:linear-gradient(90deg,#123b66,#1684c7,#45b7c4);margin-bottom:30px}.header{display:flex;justify-content:space-between;gap:20px;border-bottom:1px solid #dbe3ed;padding-bottom:20px}.brand{color:#123b66;font-size:23px;font-weight:800;letter-spacing:2px}.sub{margin-top:5px;color:#64748b;font-size:11px}.heading{text-align:right}.heading h1{margin:0 0 8px;color:#123b66;font-size:21px}.code{font: bold 13px Consolas,monospace}.status{display:inline-block;margin-top:10px;padding:6px 11px;border-radius:15px;background:#f1f5f9;color:${status.tone};font-size:10px;font-weight:bold}.meta,.details{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:22px}.box{padding:14px;border:1px solid #dbe3ed;border-radius:8px}.label{display:block;margin-bottom:6px;color:#64748b;font-size:10px;font-weight:bold;text-transform:uppercase;letter-spacing:.5px}.value{font-weight:600;overflow-wrap:anywhere}.section{margin:26px 0 10px;color:#123b66;font-size:12px;font-weight:bold;letter-spacing:1px;text-transform:uppercase}table{width:100%;border-collapse:collapse;margin-top:8px}th{padding:11px;background:#f1f5f9;color:#475569;font-size:10px;text-align:left}td{padding:15px 11px;border-bottom:1px solid #e2e8f0}td:last-child,th:last-child{text-align:right}.total{margin:16px 0 0 auto;padding:16px;width:280px;background:#123b66;border-radius:8px;color:white;text-align:right}.total small{display:block;opacity:.8;text-transform:uppercase}.total strong{display:block;margin-top:6px;font-size:23px}.note{margin-top:25px;padding:13px;border-left:3px solid #1684c7;background:#f1f7fc;color:#475569;font-size:11px;line-height:1.6}.footer{margin-top:35px;padding-top:12px;border-top:1px solid #dbe3ed;color:#64748b;font-size:10px;text-align:center}
</style></head><body><main class="sheet"><div class="bar"></div><header class="header"><div><div class="brand">ECMS</div><div class="sub">EDUCATION CENTER</div></div><div class="heading"><h1>HÓA ĐƠN HỌC PHÍ</h1><div class="code">${escapeHtml(invoice.invoiceCode)}</div><span class="status">${status.label}</span></div></header>
<section class="meta"><div class="box"><span class="label">Ngày tạo</span><span class="value">${date(invoice.createdAt)}</span></div><div class="box"><span class="label">Hạn thanh toán</span><span class="value">${date(invoice.dueAt)}</span></div></section>
<h2 class="section">Thông tin người học</h2><section class="details"><div class="box"><span class="label">Họ và tên</span><span class="value">${escapeHtml(invoice.ownerName || 'Học viên')}</span></div><div class="box"><span class="label">Email</span><span class="value">${escapeHtml(invoice.ownerEmail)}</span></div><div class="box"><span class="label">Số điện thoại</span><span class="value">${escapeHtml(invoice.ownerPhone)}</span></div><div class="box"><span class="label">Loại khóa học</span><span class="value">${invoice.courseType === 'ONLINE' ? 'Online' : 'Offline'}</span></div></section>
<h2 class="section">Chi tiết học phí</h2><table><thead><tr><th>Nội dung</th><th>Số lượng</th><th>Thành tiền</th></tr></thead><tbody><tr><td><strong>${escapeHtml(course)}</strong></td><td>1 khóa</td><td>${money(invoice.amount)}</td></tr></tbody></table><div class="total"><small>Tổng học phí</small><strong>${money(invoice.amount)}</strong></div>
<h2 class="section">Thông tin thanh toán</h2><section class="details"><div class="box"><span class="label">Trạng thái</span><span class="value">${status.label}</span></div><div class="box"><span class="label">Phương thức</span><span class="value">${method}</span></div><div class="box"><span class="label">Ngày thanh toán</span><span class="value">${date(invoice.paidAt)}</span></div><div class="box"><span class="label">Mã giao dịch</span><span class="value">${escapeHtml(invoice.transactionReference)}</span></div></section>
<div class="note">Hóa đơn được xuất từ hệ thống ECMS. Vui lòng lưu lại để tra cứu hoặc đối chiếu khi cần hỗ trợ.</div><footer class="footer">ECMS · Hệ thống quản lý trung tâm đào tạo</footer></main><script>window.addEventListener('load',function(){setTimeout(function(){window.focus();window.print()},250)})</script></body></html>`);
  printWindow.document.close();
  return true;
}
