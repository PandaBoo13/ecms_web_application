import { Input } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useState, useEffect } from 'react';
import { useDebounce } from '@/hooks/useDebounce';

interface Props {
  onSearch: (value: string) => void;
  placeholder?: string;
  delay?: number;
  width?: number | string;
}

const SearchInput = ({
  onSearch,
  placeholder = 'Tìm kiếm...',
  delay = 500,
  width = 320,
}: Props) => {
  const [value, setValue] = useState('');
  const debounced = useDebounce(value, delay);

  useEffect(() => {
    onSearch(debounced);
  }, [debounced, onSearch]);

  return (
    <Input
      allowClear
      prefix={<SearchOutlined style={{ color: '#94a3b8', marginRight: 4 }} />}
      placeholder={placeholder}
      value={value}
      onChange={(e) => setValue(e.target.value)}
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