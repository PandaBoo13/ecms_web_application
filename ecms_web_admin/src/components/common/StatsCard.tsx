import React from 'react';
import { Card, Typography, Tooltip, Tag } from 'antd';

const { Text } = Typography;

export interface StatsCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color?: string;
  bgColor?: string;
  active?: boolean;
  onClick?: () => void;
  tooltip?: string;
  tagText?: string;
  tagColor?: string;
  suffix?: string;
  trend?: {
    value: number | string;
    isUp?: boolean;
    label?: string;
  };
}

const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  icon,
  color = '#1677ff',
  bgColor = '#e6f4ff',
  active = false,
  onClick,
  tooltip,
  tagText,
  tagColor = 'default',
  suffix,
}) => {
  const content = (
    <Card
      className={`stat-card-modern ${active ? 'active' : ''}`}
      onClick={onClick}
      bordered={false}
      style={{
        background: '#ffffff',
        height: '100%',
        borderRadius: 14,
        position: 'relative',
        overflow: 'hidden',
        border: active ? `1.5px solid ${color}` : '1px solid #e2e8f0',
        boxShadow: active
          ? `0 10px 25px -5px ${color}20, 0 8px 10px -6px ${color}10`
          : '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.03)',
        transition: 'all 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: onClick ? 'pointer' : 'default',
      }}
      bodyStyle={{ padding: '18px 20px' }}
    >
      {/* Top subtle highlight line when active */}
      {active && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            background: color,
            borderRadius: '14px 14px 0 0',
          }}
        />
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Text
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: active ? color : '#64748b',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                letterSpacing: '0.01em',
              }}
            >
              {title}
            </Text>
            {tagText && (
              <Tag
                color={tagColor}
                style={{
                  margin: 0,
                  fontSize: 11,
                  padding: '1px 8px',
                  borderRadius: 20,
                  fontWeight: 600,
                  border: 'none',
                }}
              >
                {tagText}
              </Tag>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span
              style={{
                fontSize: 26,
                fontWeight: 700,
                color: active ? color : '#0f172a',
                lineHeight: 1.15,
                letterSpacing: '-0.02em',
                fontVariantNumeric: 'tabular-nums',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              }}
            >
              {typeof value === 'number' ? value.toLocaleString('vi-VN') : value}
            </span>
            {suffix && (
              <Text type="secondary" style={{ fontSize: 13, fontWeight: 500 }}>
                {suffix}
              </Text>
            )}
          </div>
        </div>

        <div
          style={{
            width: 46,
            height: 46,
            borderRadius: 12,
            backgroundColor: bgColor,
            color: color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
            flexShrink: 0,
            marginLeft: 14,
            boxShadow: `0 4px 12px ${color}18`,
            transition: 'transform 0.25s ease',
          }}
          className="stat-icon-wrapper"
        >
          {icon}
        </div>
      </div>
    </Card>
  );

  if (tooltip) {
    return (
      <Tooltip title={tooltip} mouseEnterDelay={0.4}>
        {content}
      </Tooltip>
    );
  }

  return content;
};

export default StatsCard;
