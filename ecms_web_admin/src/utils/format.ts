import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi';

dayjs.extend(relativeTime);
dayjs.locale('vi');

export const formatMoney = (value?: number | string | null, showFree = true): string => {
  if (value === null || value === undefined || value === '') return showFree ? 'Miễn phí' : '0 đ';
  const num = typeof value === 'string' ? Number(value) : value;
  if (isNaN(num)) return '0 đ';
  if (num === 0 && showFree) return 'Miễn phí';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
};

export const formatDate = (value?: string | Date | null, format = 'DD/MM/YYYY'): string => {
  if (!value) return '—';
  return dayjs(value).format(format);
};

export const formatDateTime = (value?: string | Date | null): string => {
  if (!value) return '—';
  return dayjs(value).format('DD/MM/YYYY HH:mm');
};

export const formatRelative = (value?: string | Date | null): string => {
  if (!value) return '—';
  return dayjs(value).fromNow();
};

export const formatNumber = (value?: number | null): string => {
  if (value === null || value === undefined) return '0';
  return new Intl.NumberFormat('vi-VN').format(value);
};

export const truncate = (text: string, max = 100): string =>
  text.length > max ? `${text.slice(0, max)}...` : text;

export const getInitials = (name?: string): string => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};