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
      className={`stat-card-interactive ${active ? 'active' : ''}`}
      onClick={onClick}
      bodyStyle={{ padding: '16px 20px' }}
      style={{
        background: '#ffffff',
        height: '100%',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <Text
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: active ? '#1677ff' : '#64748b',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {title}
            </Text>
            {tagText && (
              <Tag color={tagColor} style={{ margin: 0, fontSize: 11, padding: '0 6px', borderRadius: 4 }}>
                {tagText}
              </Tag>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span
              style={{
                fontSize: 24,
                fontWeight: 700,
                color: active ? '#1677ff' : '#0f172a',
                lineHeight: 1.2,
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              }}
            >
              {typeof value === 'number' ? value.toLocaleString('vi-VN') : value}
            </span>
            {suffix && (
              <Text type="secondary" style={{ fontSize: 13 }}>
                {suffix}
              </Text>
            )}
          </div>
        </div>

        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            backgroundColor: bgColor,
            color: color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            flexShrink: 0,
            marginLeft: 12,
            transition: 'transform 0.2s ease',
          }}
        >
          {icon}
        </div>
      </div>
    </Card>
  );

  if (tooltip) {
    return <Tooltip title={tooltip}>{content}</Tooltip>;
  }

  return content;
};

export default StatsCard;

