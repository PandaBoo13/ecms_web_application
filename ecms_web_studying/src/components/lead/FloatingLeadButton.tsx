import { Button, Badge } from 'antd';
import { CustomerServiceOutlined } from '@ant-design/icons';

interface FloatingLeadButtonProps {
  onClick: () => void;
}

export default function FloatingLeadButton({ onClick }: FloatingLeadButtonProps) {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 28,
        right: 28,
        zIndex: 999,
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <Badge count="Hot" offset={[-10, 0]} color="#ef4444">
        <Button
          type="primary"
          shape="round"
          size="large"
          icon={<CustomerServiceOutlined style={{ fontSize: 20 }} />}
          onClick={onClick}
          style={{
            height: 52,
            padding: '0 24px',
            fontSize: 15,
            fontWeight: 700,
            background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
            borderColor: '#2563eb',
            boxShadow: '0 10px 25px -3px rgba(37, 99, 235, 0.4), 0 4px 6px -2px rgba(37, 99, 235, 0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            cursor: 'pointer',
            transition: 'all 0.3s ease',
          }}
          className="hover:scale-105 active:scale-95"
        >
          <span className="hidden sm:inline">Nhận tư vấn & Test miễn phí</span>
          <span className="sm:hidden">Tư vấn</span>
        </Button>
      </Badge>
    </div>
  );
}

