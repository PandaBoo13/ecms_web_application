import { useState, useRef, useEffect } from 'react';
import { Input, Popconfirm, InputNumber, Select, Switch } from 'antd';


type EditType = 'text' | 'textarea' | 'number' | 'select' | 'switch';

interface Props {
  value: any;
  onSave: (newValue: any) => Promise<void> | void;
  type?: EditType;
  options?: { label: string; value: any }[];
  formatDisplay?: (val: any) => React.ReactNode;
  placeholder?: string;
}

const InlineEdit = ({
  value,
  onSave,
  type = 'text',
  options = [],
  formatDisplay,
  placeholder = 'Nhập...',
}: Props) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [tempValue, setTempValue] = useState<any>(value);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<any>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Sync tempValue khi value thay đổi từ bên ngoài (sau khi save/refresh)
  useEffect(() => {
    if (!isEditing) {
      setTempValue(value);
    }
  }, [value, isEditing]);

  // Hủy edit khi click ra ngoài wrapper
  useEffect(() => {
    if (!isEditing) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      // Bỏ qua nếu click vào popup Ant Design (Popconfirm, Select dropdown, Modal...)
      if (
        target.closest(
          '.ant-popover, .ant-select-dropdown, .ant-modal, .ant-picker-dropdown, .ant-notification, .ant-message'
        )
      ) {
        return;
      }

      // Bỏ qua nếu click trong wrapper của component này
      if (wrapperRef.current && wrapperRef.current.contains(target)) {
        return;
      }

      // Click ra ngoài → hủy
      setIsEditing(false);
      setShowConfirm(false);
      setTempValue(value);
    };

    // Delay gắn listener để không bắt nhầm sự kiện double-click đang trigger
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isEditing, value]);

  const handleDoubleClick = () => {
    setTempValue(value);
    setIsEditing(true);
    setTimeout(() => {
      if (type === 'text' || type === 'textarea') inputRef.current?.focus();
    }, 50);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setShowConfirm(false);
    setTempValue(value);
  };

  const handleConfirm = async () => {
    // Không thay đổi hoặc rỗng với trường text → coi như cancel
    if (
      tempValue === value ||
      (type !== 'switch' && type !== 'number' && !tempValue?.toString().trim())
    ) {
      cancelEdit();
      return;
    }
    setSaving(true);
    try {
      await onSave(tempValue);
      setIsEditing(false);
      setShowConfirm(false);
    } catch (error) {
      // Giữ nguyên trạng thái editing để user sửa lại
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && type !== 'textarea') {
      e.preventDefault();
      setShowConfirm(true);
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  };

  const renderInput = () => {
    switch (type) {
      case 'textarea':
        return (
          <Input.TextArea
            ref={inputRef}
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            onKeyDown={handleKeyDown}
            autoSize={{ minRows: 2, maxRows: 5 }}
            placeholder={placeholder}
            disabled={saving}
          />
        );
      case 'number':
        return (
          <InputNumber
            ref={inputRef}
            value={tempValue}
            onChange={(val) => setTempValue(val)}
            onKeyDown={handleKeyDown}
            style={{ width: '100%' }}
            placeholder={placeholder}
            disabled={saving}
            formatter={(v) => (v ? `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '')}
            parser={(v) => v!.replace(/\$\s?|(,*)/g, '')}
          />
        );
      case 'select':
        return (
          <Select
            ref={inputRef}
            value={tempValue}
            onChange={(val) => {
              setTempValue(val);
              setShowConfirm(true);
            }}
            options={options}
            style={{ width: '100%', minWidth: 200 }}
            placeholder={placeholder}
            disabled={saving}
            autoFocus
          />
        );
      case 'switch':
        return (
          <Switch
            checked={tempValue === true}
            onChange={(val) => {
              setTempValue(val);
              setShowConfirm(true);
            }}
            disabled={saving}
          />
        );
      default:
        return (
          <Input
            ref={inputRef}
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={saving}
          />
        );
    }
  };

  if (isEditing) {
    return (
      <div ref={wrapperRef}>
        <Popconfirm
          title="Xác nhận sửa?"
          description="Bạn có chắc chắn muốn lưu thay đổi này?"
          open={showConfirm}
          onConfirm={handleConfirm}
          onCancel={cancelEdit}
          okText="Xác nhận"
          cancelText="Hủy"
          okButtonProps={{ loading: saving }}
        >
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: 4 }}
            onClick={(e) => e.stopPropagation()}
          >
            {renderInput()}
            {type !== 'select' && type !== 'switch' && (
              <div style={{ fontSize: 11, color: '#888' }}>
                {type === 'textarea'
                  ? 'Esc hoặc click ra ngoài để hủy'
                  : 'Enter để xác nhận · Esc / click ra ngoài để hủy'}
              </div>
            )}
          </div>
        </Popconfirm>
      </div>
    );
  }

  // Chế độ Read-only
  return (
    <div
      onDoubleClick={handleDoubleClick}
      style={{
        cursor: 'pointer',
        minHeight: 22,
        padding: '4px 8px',
        margin: '-4px -8px',
        borderRadius: 4,
        transition: 'background 0.2s',
        display: 'inline-block',
        minWidth: 100,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = '#f0f0f0')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      title="Nhấp đúp để sửa"
    >
      {formatDisplay
        ? formatDisplay(value)
        : value || <span style={{ color: '#bfbfbf' }}>(Chưa có thông tin)</span>}
    </div>
  );
};

export default InlineEdit;