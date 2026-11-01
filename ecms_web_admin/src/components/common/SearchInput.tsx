import { Input } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useState, useEffect, useRef } from 'react';
import { useDebounce } from '@/hooks/useDebounce';

interface Props {
  value?: string;
  onSearch: (value: string) => void;
  placeholder?: string;
  delay?: number;
  width?: number | string;
}

const SearchInput = ({
  value: propValue,
  onSearch,
  placeholder = 'Tìm kiếm...',
  delay = 500,
  width = 320,
}: Props) => {
  const [value, setValue] = useState(propValue ?? '');
  const debounced = useDebounce(value, delay);
  const isFirstMount = useRef(true);

  // Synchronize with external value prop (e.g., reset button)
  useEffect(() => {
    if (propValue !== undefined && propValue !== value) {
      setValue(propValue);
    }
  }, [propValue]);

  useEffect(() => {
    // Avoid double firing on first render if initial value is empty
    if (isFirstMount.current) {
      isFirstMount.current = false;
      if (!debounced) return;
    }
    onSearch(debounced);
  }, [debounced, onSearch]);

  return (
    <Input
      allowClear
      prefix={<SearchOutlined style={{ color: '#94a3b8', marginRight: 4 }} />}
      placeholder={placeholder}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onPressEnter={() => onSearch(value)}
      style={{
        width,
        borderRadius: 8,
        height: 38,
        fontSize: 13,
        borderColor: '#e2e8f0',
        boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
        transition: 'all 0.2s ease',
      }}
    />
  );
};

export default SearchInput;
