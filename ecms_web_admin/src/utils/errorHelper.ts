import toast from 'react-hot-toast';
import type { AppAxiosError } from '@/services/api/axiosConfig';

/** Message lỗi kỹ thuật từ BE — không nên hiện ra cho user */
const SILENT_PATTERNS = [
  /access token not found/i,
  /jwt expired/i,
  /invalid token/i,
  /unauthorized/i,
  /authentication required/i,
];

/** Lỗi auth/session — ẩn toast, để interceptor tự lo (redirect/login) */
export function isAuthError(err: unknown): boolean {
  const e = err as AppAxiosError | undefined;
  if (e?.isAuthError || e?.isSessionExpired || e?.isSilent) return true;
  if (e?.response?.status === 401 || e?.response?.status === 403) return true;
  return false;
}

/** Trả message thân thiện, hoặc null nếu nên nuốt (không hiện) */
export function getErrorMessage(err: unknown, fallback: string): string | null {
  if (isAuthError(err)) return null;

  const e = err as (AppAxiosError & { message?: string }) | undefined;
  const raw =
    (e?.response?.data as { message?: string } | undefined)?.message ||
    e?.message ||
    '';

  if (raw && SILENT_PATTERNS.some((re) => re.test(raw))) return null;
  return raw || fallback;
}

/** Dùng thay cho `toast.error(...)` ở mọi nơi */
export function showError(err: unknown, fallback: string): void {
  const msg = getErrorMessage(err, fallback);
  if (msg === null) return; // nuốt
  toast.error(msg);
}