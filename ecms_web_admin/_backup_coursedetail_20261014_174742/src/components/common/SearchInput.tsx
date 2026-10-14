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
  width = 300,
}: Props) => {
  const [value, setValue] = useState('');
  const debounced = useDebounce(value, delay);

  useEffect(() => {
    onSearch(debounced);
  }, [debounced, onSearch]);

  return (
    <Input
      allowClear
      prefix={<SearchOutlined />}
      placeholder={placeholder}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      style={{ width }}
    />
  );
};

export default SearchInput;