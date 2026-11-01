import React from 'react';
import { Card, Tooltip, Tag } from 'antd';

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

      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className="text-[13px] font-semibold tracking-wide whitespace-nowrap overflow-hidden text-ellipsis"
              style={{ color: active ? color : '#64748b' }}
            >
              {title}
            </span>
            {tagText && (
              <Tag
                color={tagColor}
                className="!m-0 !text-[11px] !px-2 !py-0.5 !rounded-full !font-semibold !border-0"
              >
                {tagText}
              </Tag>
            )}
          </div>

          <div className="flex items-baseline gap-1.5">
            <span
              className="text-[26px] font-bold leading-tight tracking-tight tabular-nums font-sans"
              style={{ color: active ? color : '#0f172a' }}
            >
              {typeof value === 'number' ? value.toLocaleString('vi-VN') : value}
            </span>
            {suffix && (
              <span className="text-[13px] font-medium text-slate-400">
                {suffix}
              </span>
            )}
          </div>
        </div>

        <div
          className="w-[46px] h-[46px] rounded-xl flex items-center justify-center text-[22px] shrink-0 ml-3.5 transition-transform duration-200 stat-icon-wrapper"
          style={{
            backgroundColor: bgColor,
            color: color,
            boxShadow: `0 4px 12px ${color}18`,
          }}
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
