import { formatDate, formatDateTime, formatRelative } from '@/utils/format';

interface Props {
  value?: string | Date | null;
  format?: 'short' | 'long' | 'relative';
}

const DateDisplay = ({ value, format = 'short' }: Props) => {
  if (!value) return <span>—</span>;

  const text =
    format === 'long' ? formatDateTime(value) : format === 'relative' ? formatRelative(value) : formatDate(value);

  return <span>{text}</span>;
};

export default DateDisplay;