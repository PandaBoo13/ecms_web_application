import React from 'react';
import { Dropdown } from 'antd';
import { DownOutlined } from '@ant-design/icons';
import { useTranslation } from '@/hooks/useTranslation';
import type { LocaleType } from '@/stores/localeStore';

// SVG Flag UK
export const UkFlag: React.FC<{ size?: number }> = ({ size = 20 }) => {
  const height = Math.round((size * 14) / 22);
  return (
    <svg
      width={size}
      height={height}
      viewBox="0 0 60 30"
      style={{
        borderRadius: 2,
        display: 'inline-block',
        verticalAlign: 'middle',
        boxShadow: '0 0 1px rgba(0,0,0,0.3)',
        flexShrink: 0,
      }}
    >
      <clipPath id="uk-clip">
        <path d="M0,0 v30 h60 v-30 z" />
      </clipPath>
      <clipPath id="uk-diag">
        <path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" />
      </clipPath>
      <g clipPath="url(#uk-clip)">
        <path d="M0,0 v30 h60 v-30 z" fill="#012169" />
        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
        <path d="M0,0 L60,30 M60,0 L0,30" clipPath="url(#uk-diag)" stroke="#C8102E" strokeWidth="4" />
        <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10" />
        <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6" />
      </g>
    </svg>
  );
};

// SVG Flag Vietnam
export const VnFlag: React.FC<{ size?: number }> = ({ size = 20 }) => {
  const height = Math.round((size * 14) / 22);
  return (
    <svg
      width={size}
      height={height}
      viewBox="0 0 30 20"
      style={{
        borderRadius: 2,
        display: 'inline-block',
        verticalAlign: 'middle',
        boxShadow: '0 0 1px rgba(0,0,0,0.3)',
        flexShrink: 0,
      }}
    >
      <rect width="30" height="20" fill="#DA251D" />
      <polygon
        points="15,4 16.5,8.8 21.5,8.8 17.5,11.8 19,16.5 15,13.5 11,16.5 12.5,11.8 8.5,8.8 13.5,8.8"
        fill="#FFFF00"
      />
    </svg>
  );
};

interface LanguageOption {
  key: LocaleType;
  label: string;
  flag: React.ReactNode;
}

const LANGUAGES: LanguageOption[] = [
  {
    key: 'en',
    label: 'English (US)',
    flag: <UkFlag size={20} />,
  },
  {
    key: 'vi',
    label: 'Vietnamese',
    flag: <VnFlag size={20} />,
  },
];

const LanguageDropdown: React.FC = () => {
  const { locale, setLocale } = useTranslation();

  const current = LANGUAGES.find((l) => l.key === locale) || LANGUAGES[1];

  const menuItems = LANGUAGES.map((item) => {
    const isActive = item.key === locale;
    return {
      key: item.key,
      label: (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '8px 12px',
            fontSize: 14,
            fontWeight: isActive ? 600 : 400,
            color: '#1e293b',
            background: isActive ? '#e6f4ff' : 'transparent',
            borderRadius: 6,
            transition: 'all 0.15s ease',
          }}
        >
          {item.flag}
          <span>{item.label}</span>
        </div>
      ),
      style: {
        padding: 2,
        backgroundColor: 'transparent',
      },
      onClick: () => {
        setLocale(item.key);
      },
    };
  });

  return (
    <Dropdown
      menu={{
        items: menuItems,
        style: {
          padding: 6,
          borderRadius: 10,
          boxShadow: '0 8px 24px -4px rgba(15, 23, 42, 0.12), 0 2px 6px -1px rgba(15, 23, 42, 0.04)',
          border: '1px solid #e2e8f0',
          minWidth: 160,
        },
      }}
      placement="bottomRight"
      trigger={['click']}
    >
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          cursor: 'pointer',
          padding: '6px 10px',
          borderRadius: 8,
          transition: 'all 0.2s ease',
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
        }}
        className="hover:bg-slate-100"
      >
        {current.flag}
        <span
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: '#334155',
            lineHeight: 1,
          }}
        >
          {current.label}
        </span>
        <DownOutlined style={{ fontSize: 10, color: '#94a3b8' }} />
      </div>
    </Dropdown>
  );
};

export default LanguageDropdown;

