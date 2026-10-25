import { useEffect, useRef, useState } from 'react';
import { Input, InputNumber, Select, Switch } from 'antd';
import { EditOutlined } from '@ant-design/icons';

type FieldType = 'text' | 'textarea' | 'number' | 'select' | 'switch';

interface Option {
  label: string;
  value: string | number | boolean;
}

interface Props<T = unknown> {
  value: T;
  onCommit: (value: T) => void;
  type?: FieldType;
  options?: Option[];
  formatDisplay?: (value: T) => React.ReactNode;
  placeholder?: string;
  disabled?: boolean;
  isDirty?: boolean;
  rows?: number;
  min?: number;
  max?: number;
  allowClear?: boolean;
  required?: boolean;
}

/**
 * Inline editor với draft pattern + visual affordance:
 *
 *  ┌─ Read mode ─────────────────────────────────────────────┐
 *  │ Hover  → nền xanh nhạt + gạch chân đứt + icon ✏️ bên phải│
 *  │ Dirty  → nền vàng + viền trái cam                        │
 *  │ Dbl-clk → vào edit mode                                  │
 *  ├─ Edit mode ─────────────────────────────────────────────┤
 *  │ Enter            → commit vào draft, thoát edit          │
 *  │ Shift+Enter (ta) → xuống dòng                            │
 *  │ Esc / click ngoài → huỷ, revert về draft trước đó        │
 *  │ Select / Switch  → chọn/toggle = commit luôn             │
 *  └─────────────────────────────────────────────────────────┘
 */
const InlineDraftField = <T,>({
  value,
  onCommit,
  type = 'text',
  options = [],
  formatDisplay,
  placeholder = 'Nhập...',
  disabled = false,
  isDirty = false,
  rows = 3,
  min,
  max,
  allowClear = false,
  required = false,
}: Props<T>) => {
  const [editing, setEditing] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [localValue, setLocalValue] = useState<T>(value);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<unknown>(null);

  // Sync khi giá trị ngoài đổi (sau save/refresh)
  useEffect(() => {
    if (!editing) setLocalValue(value);
  }, [value, editing]);

  // Auto focus khi vào edit
  useEffect(() => {
    if (!editing) return;
    const timer = setTimeout(() => {
      const el = inputRef.current as
        | { focus?: () => void; select?: () => void }
        | null;
      el?.focus?.();
      el?.select?.();
    }, 50);
    return () => clearTimeout(timer);
  }, [editing]);

  // Click ngoài → huỷ
  useEffect(() => {
    if (!editing) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.closest(
          '.ant-select-dropdown, .ant-popover, .ant-modal, .ant-picker-dropdown, .ant-notification, .ant-message',
        )
      ) {
        return;
      }
      if (wrapperRef.current?.contains(target)) return;
      setLocalValue(value);
      setEditing(false);
    };
    const timer = setTimeout(
      () => document.addEventListener('mousedown', handler),
      100,
    );
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handler);
    };
  }, [editing, value]);

  const startEdit = () => {
    if (disabled) return;
    setLocalValue(value);
    setEditing(true);
  };

  const commit = () => {
    if (
      required &&
      (localValue === null ||
        localValue === undefined ||
        String(localValue).trim() === '')
    ) {
      cancel();
      return;
    }
    onCommit(localValue);
    setEditing(false);
  };

  const cancel = () => {
    setLocalValue(value);
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      cancel();
      return;
    }
    if (e.key !== 'Enter') return;
    if (type === 'textarea' && e.shiftKey) return;
    e.preventDefault();
    commit();
  };

  // ═════════════════════════════════════════════════════════
  // DISPLAY MODE
  // ═════════════════════════════════════════════════════════
  if (!editing) {
    const showHoverCue = hovering && !disabled;
    const bg = isDirty
      ? hovering
        ? 'rgba(245, 158, 11, 0.16)'
        : 'rgba(245, 158, 11, 0.08)'
      : showHoverCue
        ? '#eff6ff'
        : 'transparent';
    const borderBottom = showHoverCue
      ? '1px dashed #94a3b8'
      : '1px dashed transparent';

    return (
      <div
        onDoubleClick={startEdit}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        style={{
          cursor: disabled ? 'default' : 'pointer',
          minHeight: 22,
          padding: '4px 26px 4px 6px',
          borderRadius: 4,
          position: 'relative',
          width: '100%',
          background: bg,
          boxShadow: isDirty ? 'inset 3px 0 0 #f59e0b' : 'none',
          borderBottom,
          transition: 'background 0.15s, border-color 0.15s',
        }}
        title={disabled ? undefined : 'Nhấp đúp để sửa'}
      >
        {formatDisplay ? (
          formatDisplay(value)
        ) : value !== null &&
          value !== undefined &&
          String(value).length > 0 ? (
          <span>{String(value)}</span>
        ) : (
          <span style={{ color: '#bfbfbf' }}>(Chưa có thông tin)</span>
        )}

        {showHoverCue && (
          <EditOutlined
            style={{
              position: 'absolute',
              right: 6,
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#1677ff',
              fontSize: 12,
              pointerEvents: 'none',
            }}
          />
        )}

        {isDirty && (
          <span
            title="Có thay đổi chưa lưu"
            style={{
              position: 'absolute',
              right: 6,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: '#f59e0b',
              boxShadow: '0 0 0 2px rgba(245,158,11,0.25)',
              pointerEvents: 'none',
            }}
          />
        )}
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════
  // EDIT MODE
  // ═════════════════════════════════════════════════════════
  let input: React.ReactNode;

  if (type === 'textarea') {
    input = (
      <Input.TextArea
        ref={inputRef as React.RefObject<HTMLTextAreaElement>}
        value={localValue as unknown as string}
        onChange={(e) => setLocalValue(e.target.value as unknown as T)}
        onKeyDown={handleKeyDown}
        autoSize={{ minRows: rows, maxRows: 12 }}
        placeholder={placeholder}
      />
    );
  } else if (type === 'number') {
    input = (
      <InputNumber
        ref={inputRef as React.RefObject<HTMLInputElement>}
        value={localValue as unknown as number}
        onChange={(v) => setLocalValue(v as unknown as T)}
        onKeyDown={handleKeyDown}
        style={{ width: '100%' }}
        min={min}
        max={max}
        placeholder={placeholder}
        formatter={(v) =>
          v ? `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''
        }
        parser={(v) => (v || '').replace(/\$\s?|(,*)/g, '') as unknown as number}
      />
    );
  } else if (type === 'select') {
    input = (
      <Select
        ref={inputRef as React.RefObject<unknown>}
        value={localValue as string | number | undefined}
        onChange={(v) => {
          onCommit(v as T);
          setEditing(false);
        }}
        options={options}
        style={{ width: '100%', minWidth: 200 }}
        placeholder={placeholder}
        allowClear={allowClear}
        autoFocus
        showSearch
        optionFilterProp="label"
      />
    );
  } else if (type === 'switch') {
    input = (
      <Switch
        checked={localValue as unknown as boolean}
        onChange={(v) => {
          onCommit(v as T);
          setEditing(false);
        }}
      />
    );
  } else {
    input = (
      <Input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        value={localValue as unknown as string}
        onChange={(e) => setLocalValue(e.target.value as unknown as T)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
      />
    );
  }

  return (
    <div ref={wrapperRef} onClick={(e) => e.stopPropagation()}>
      {input}
      <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>
        {type === 'textarea'
          ? 'Enter để lưu tạm · Shift+Enter xuống dòng · Esc / click ra ngoài để huỷ'
          : type === 'select' || type === 'switch'
            ? 'Chọn để lưu tạm · Esc / click ra ngoài để huỷ'
            : 'Enter để lưu tạm · Esc / click ra ngoài để huỷ'}
      </div>
    </div>
  );
};

export default InlineDraftField;