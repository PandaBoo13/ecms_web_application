import { formatMoney } from '@/utils/format';

interface Props {
  value?: number | string | null;
  showFree?: boolean;
  strong?: boolean;
}

const MoneyDisplay = ({ value, showFree = true, strong = false }: Props) => (
  <span style={{ fontWeight: strong ? 600 : 400 }}>{formatMoney(value, showFree)}</span>
);

export default MoneyDisplay;