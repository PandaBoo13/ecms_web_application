import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Calendar,
  Card,
  Space,
  Typography,
  Tooltip,
  Popover,
  Button,
  Select,
  Spin,
  DatePicker,
  Tag,
  Segmented,
} from 'antd';
import type { CalendarProps } from 'antd';
import {
  LeftOutlined,
  RightOutlined,
  CalendarOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
  EnvironmentOutlined,
} from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import 'dayjs/locale/vi';
import toast from 'react-hot-toast';

import PageContainer from '@/components/common/PageContainer';
import PageHeader from '@/components/common/PageHeader';
import { sessionApi } from '@/services/api/course';
import type { SessionResponse } from '@/services/types/course';
import { SCHEDULE_TEMPLATES } from '@/constants/schedule-templates';

dayjs.locale('vi');

const { Text } = Typography;

type ScheduleSessionItem = SessionResponse & {
  courseTitle?: string;
  courseName?: string;
  courseCode?: string;
};

// ════════════════════════════════════════════════════════════════════
// SHIFT ZONES — 3 khu vực cố định theo ca
// ════════════════════════════════════════════════════════════════════
type ShiftKey = 'MORNING' | 'AFTERNOON' | 'EVENING';

interface ShiftZone {
  key: ShiftKey;
  label: string;
  color: string;
}

const SHIFT_ZONES: ShiftZone[] = [
  { key: 'MORNING', label: 'Sáng', color: '#d48806' },
  { key: 'AFTERNOON', label: 'Chiều', color: '#08979c' },
  { key: 'EVENING', label: 'Tối', color: '#531dab' },
];

const MAX_PER_ZONE = 2;
const MAX_LIST_ITEMS = 4;

// ════════════════════════════════════════════════════════════════════
// Helpers
// ════════════════════════════════════════════════════════════════════
const getShiftName = (startTime: string, endTime: string) => {
  const start = dayjs(startTime).format('HH:mm');
  const end = dayjs(endTime).format('HH:mm');

  const found = Object.values(SCHEDULE_TEMPLATES).find(
    (tpl) => tpl.start === start && tpl.end === end,
  );
  return found ? found.label : `Ca ${start} - ${end}`;
};

const getShiftKey = (startTime: string, endTime: string): ShiftKey => {
  const startStr = dayjs(startTime).format('HH:mm');
  const endStr = dayjs(endTime).format('HH:mm');

  const tpl = (
    Object.values(SCHEDULE_TEMPLATES) as Array<{
      start: string;
      end: string;
      label: string;
    }>
  ).find((t) => t.start === startStr && t.end === endStr);

  if (tpl?.label) {
    const l = tpl.label.toLowerCase();
    if (l.includes('sáng') || l.includes('sang')) return 'MORNING';
    if (l.includes('chiều') || l.includes('chieu')) return 'AFTERNOON';
    if (l.includes('tối') || l.includes('toi')) return 'EVENING';
  }

  const hour = dayjs(startTime).hour();
  if (hour < 12) return 'MORNING';
  if (hour < 18) return 'AFTERNOON';
  return 'EVENING';
};

const getStatusBadge = (status?: string) => {
  switch (status) {
    case 'SCHEDULED':
      return { label: 'Sắp diễn ra', color: '#1677ff', bg: '#e6f4ff' };
    case 'ONGOING':
      return { label: 'Đang diễn ra', color: '#08979c', bg: '#e6fffb' };
    case 'COMPLETED':
      return { label: 'Đã dạy xong', color: '#389e0d', bg: '#f6ffed' };
    case 'CANCELLED':
      return { label: 'Đã hủy', color: '#8c8c8c', bg: '#f5f5f5' };
    default:
      return { label: status || 'Không rõ', color: '#595959', bg: '#fafafa' };
  }
};

// ════════════════════════════════════════════════════════════════════
// PAGE
// ════════════════════════════════════════════════════════════════════
type ViewMode = 'shift' | 'list';

const InstructorSchedulePage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [sessions, setSessions] = useState<ScheduleSessionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [viewMode, setViewMode] = useState<ViewMode>('shift');

  const dateStr = useMemo(() => {
    const raw = searchParams.get('date');
    if (raw) {
      const d = dayjs(raw);
      if (d.isValid()) return d.format('YYYY-MM-DD');
    }
    return dayjs().format('YYYY-MM-DD');
  }, [searchParams]);

  const currentDate = useMemo(() => dayjs(dateStr), [dateStr]);

  const setCurrentDate = useCallback(
    (next: Dayjs | ((prev: Dayjs) => Dayjs)) => {
      const value = typeof next === 'function' ? next(dayjs(dateStr)) : next;
      if (!value || !value.isValid()) return;

      const target = value.format('YYYY-MM-DD');
      if (target === dateStr) return;

      const params = new URLSearchParams(searchParams);
      params.set('date', target);
      setSearchParams(params, { replace: true });
    },
    [dateStr, searchParams, setSearchParams],
  );

  // ─── Load lịch dạy theo tháng hiển thị ───
  const fetchSchedule = useCallback(async (date: Dayjs) => {
    setLoading(true);
    try {
      const from = date
        .startOf('month')
        .subtract(7, 'day')
        .format('YYYY-MM-DD');
      const to = date.endOf('month').add(7, 'day').format('YYYY-MM-DD');

      const res = await sessionApi.getMySchedule({ from, to });
      setSessions((res as ScheduleSessionItem[]) || []);
    } catch (error) {
      console.error('fetchSchedule error:', error);
      toast.error('Không thể tải lịch giảng dạy');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchedule(currentDate);
  }, [currentDate, fetchSchedule]);

  // ─── Filter theo trạng thái ───
  const filteredSessions = useMemo(() => {
    if (!statusFilter) return sessions;
    return sessions.filter((s) => s.status === statusFilter);
  }, [sessions, statusFilter]);

  const handleGoToCourseDetail = (session: ScheduleSessionItem) => {
    if (!session.courseId) {
      toast.error('Không tìm thấy thông tin khóa học');
      return;
    }
    navigate(`/instructor/courses/${session.courseId}/edit`);
  };

  // ══════════════════════════════════════════════════════════════
  // RENDER — Compact Session Chip (2 dòng gọn gàng, không gây tràn ô)
  // ══════════════════════════════════════════════════════════════
  const renderSessionChip = (session: ScheduleSessionItem) => {
    const isCancelled = session.status === 'CANCELLED';
    const isSubstitute = Boolean(session.substituteTeacherId);
    const statusMeta = getStatusBadge(session.status);
    const roomText =
      session.effectiveRoomName || session.roomName || 'Chưa xếp phòng';
    const courseLabel =
      session.courseTitle || session.courseName || session.courseCode || '';

    let accentColor = statusMeta.color;
    if (!isCancelled && isSubstitute) {
      accentColor = '#fa8c16';
    }

    return (
      <Tooltip
        key={session.id}
        mouseEnterDelay={0.25}
        title={
          <div style={{ lineHeight: 1.6, fontSize: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>
              {session.title}
            </div>
            {courseLabel && (
              <div>
                Khóa học: <b>{courseLabel}</b>
                {session.courseCode ? ` (${session.courseCode})` : ''}
              </div>
            )}
            <div>
              Thời gian: {getShiftName(session.startTime, session.endTime)} (
              {dayjs(session.startTime).format('HH:mm')} –{' '}
              {dayjs(session.endTime).format('HH:mm')})
            </div>
            <div>Phòng: {roomText}</div>
            <div>Trạng thái: {statusMeta.label}</div>
            {isSubstitute && (
              <div style={{ color: '#ffc069', fontWeight: 600 }}>
                • Bạn đang dạy thay buổi này
              </div>
            )}
            {session.courseId && (
              <div style={{ fontSize: 11, color: '#91caff', marginTop: 4 }}>
                Bấm vào tên khóa học để mở chi tiết
              </div>
            )}
          </div>
        }
      >
        <div
          style={{
            padding: '4px 6px',
            borderRadius: 5,
            backgroundColor: isCancelled ? '#f8fafc' : `${accentColor}0f`,
            border: `1px solid ${isCancelled ? '#e2e8f0' : `${accentColor}30`}`,
            borderLeft: `3px solid ${accentColor}`,
            opacity: isCancelled ? 0.72 : 1,
            transition: 'background-color 0.15s ease',
          }}
        >
          {/* Dòng 1: Giờ + Dạy thay + Phòng */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 4,
              lineHeight: 1.2,
              marginBottom: 2,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  color: isCancelled ? '#8c8c8c' : accentColor,
                  textDecoration: isCancelled ? 'line-through' : 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                {dayjs(session.startTime).format('HH:mm')}–
                {dayjs(session.endTime).format('HH:mm')}
              </span>

              {isSubstitute && !isCancelled && (
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    color: '#d46b08',
                    backgroundColor: '#fff7e6',
                    border: '1px solid #ffd591',
                    borderRadius: 3,
                    padding: '0 3px',
                    lineHeight: '13px',
                  }}
                >
                  Thay
                </span>
              )}
            </div>

            <span
              style={{
                fontSize: 10,
                color: '#64748b',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: 72,
              }}
            >
              {roomText}
            </span>
          </div>

          {/* Dòng 2: Tên khóa (clickable) + Tên buổi */}
          <div
            style={{
              fontSize: 11,
              lineHeight: 1.25,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              color: isCancelled ? '#8c8c8c' : '#1e293b',
              textDecoration: isCancelled ? 'line-through' : 'none',
            }}
          >
            {courseLabel ? (
              <>
                <span
                  role={session.courseId ? 'button' : undefined}
                  tabIndex={session.courseId ? 0 : undefined}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleGoToCourseDetail(session);
                  }}
                  onKeyDown={(e) => {
                    if (
                      session.courseId &&
                      (e.key === 'Enter' || e.key === ' ')
                    ) {
                      e.preventDefault();
                      e.stopPropagation();
                      handleGoToCourseDetail(session);
                    }
                  }}
                  style={{
                    fontWeight: 600,
                    color: isCancelled
                      ? '#8c8c8c'
                      : session.courseId
                        ? '#1677ff'
                        : '#0f172a',
                    cursor: session.courseId ? 'pointer' : 'default',
                  }}
                >
                  {courseLabel}
                </span>
                <span style={{ color: '#64748b' }}> · {session.title}</span>
              </>
            ) : (
              <span style={{ fontWeight: 600 }}>{session.title}</span>
            )}
          </div>
        </div>
      </Tooltip>
    );
  };

  // ══════════════════════════════════════════════════════════════
  // RENDER — Popover hiển thị toàn bộ buổi khi tràn
  // ══════════════════════════════════════════════════════════════
  const renderOverflowTrigger = (
    title: string,
    allItems: ScheduleSessionItem[],
    hiddenCount: number,
  ) => (
    <Popover
      trigger="click"
      placement="bottomLeft"
      title={<span style={{ fontSize: 12.5 }}>{title}</span>}
      content={
        <div
          style={{
            width: 260,
            maxHeight: 280,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 5,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {allItems.map((s) => renderSessionChip(s))}
        </div>
      }
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          fontSize: 10.5,
          color: '#1677ff',
          fontWeight: 600,
          padding: '2px 6px',
          borderRadius: 4,
          backgroundColor: '#f0f7ff',
          cursor: 'pointer',
          textAlign: 'center',
          marginTop: 2,
        }}
      >
        +{hiddenCount} buổi khác
      </div>
    </Popover>
  );

  // ══════════════════════════════════════════════════════════════
  // RENDER — Mode "Theo ca"
  // ══════════════════════════════════════════════════════════════
  const renderShiftMode = (
    date: Dayjs,
    daySessions: ScheduleSessionItem[],
  ) => {
    const grouped: Record<ShiftKey, ScheduleSessionItem[]> = {
      MORNING: [],
      AFTERNOON: [],
      EVENING: [],
    };
    daySessions.forEach((s) => {
      const key = getShiftKey(s.startTime, s.endTime);
      grouped[key].push(s);
    });

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          marginTop: 4,
        }}
      >
        {SHIFT_ZONES.map((zone) => {
          const items = grouped[zone.key];
          if (items.length === 0) return null;

          const visible = items.slice(0, MAX_PER_ZONE);
          const overflow = items.length - visible.length;

          return (
            <div key={zone.key}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  marginBottom: 3,
                  fontSize: 10,
                  fontWeight: 700,
                  color: zone.color,
                  letterSpacing: 0.3,
                  lineHeight: 1.1,
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    backgroundColor: zone.color,
                    flexShrink: 0,
                  }}
                />
                <span>{zone.label}</span>
                <span style={{ color: '#94a3b8', fontWeight: 500 }}>
                  ({items.length})
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {visible.map((s) => renderSessionChip(s))}
              </div>

              {overflow > 0 &&
                renderOverflowTrigger(
                  `Ca ${zone.label} · ${date.format('DD/MM/YYYY')}`,
                  items,
                  overflow,
                )}
            </div>
          );
        })}
      </div>
    );
  };

  // ══════════════════════════════════════════════════════════════
  // RENDER — Mode "Danh sách"
  // ══════════════════════════════════════════════════════════════
  const renderListMode = (
    date: Dayjs,
    daySessions: ScheduleSessionItem[],
  ) => {
    const visible = daySessions.slice(0, MAX_LIST_ITEMS);
    const overflow = daySessions.length - visible.length;

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          marginTop: 4,
        }}
      >
        {visible.map((s) => renderSessionChip(s))}
        {overflow > 0 &&
          renderOverflowTrigger(
            `Lịch dạy ngày ${date.format('DD/MM/YYYY')}`,
            daySessions,
            overflow,
          )}
      </div>
    );
  };

  // ══════════════════════════════════════════════════════════════
  // CELL RENDERER
  // ══════════════════════════════════════════════════════════════
  const cellRender: CalendarProps<Dayjs>['cellRender'] = (date, info) => {
    if (info.type !== 'date') return info.originNode;

    const daySessions = filteredSessions
      .filter((s) => dayjs(s.startTime).isSame(date, 'day'))
      .sort(
        (a, b) => dayjs(a.startTime).valueOf() - dayjs(b.startTime).valueOf(),
      );

    if (daySessions.length === 0) return null;

    return viewMode === 'shift'
      ? renderShiftMode(date, daySessions)
      : renderListMode(date, daySessions);
  };

  // ══════════════════════════════════════════════════════════════
  // RENDER — Page
  // ══════════════════════════════════════════════════════════════
  return (
    <PageContainer>
      {/* CSS gỡ scrollbar nội bộ trong ô Calendar & tinh chỉnh khoảng cách */}
      <style>{`
        .instructor-schedule-calendar .ant-picker-cell-inner.ant-picker-calendar-date {
          height: auto !important;
          min-height: 96px;
          padding: 4px 6px 6px !important;
          margin: 0 !important;
        }
        .instructor-schedule-calendar .ant-picker-calendar-date-content {
          height: auto !important;
          overflow: visible !important;
        }
        .instructor-schedule-calendar .ant-picker-calendar-date-value {
          font-size: 12.5px;
          font-weight: 600;
          line-height: 20px;
        }
        .instructor-schedule-calendar .ant-picker-content th {
          padding-bottom: 8px !important;
          font-size: 12px;
          font-weight: 600;
          color: #64748b;
        }
      `}</style>

      <PageHeader
        title="Lịch giảng dạy"
        subtitle={
          <Space size={8}>
            <span>Theo dõi lịch dạy theo tháng</span>
            <Tag color="blue" style={{ marginInlineEnd: 0 }}>
              Tháng {currentDate.format('MM/YYYY')}
            </Tag>
          </Space>
        }
        extra={
          <Space wrap size={8}>
            <Segmented
              value={viewMode}
              onChange={(v) => setViewMode(v as ViewMode)}
              options={[
                {
                  label: 'Theo ca',
                  value: 'shift',
                  icon: <AppstoreOutlined />,
                },
                {
                  label: 'Danh sách',
                  value: 'list',
                  icon: <UnorderedListOutlined />,
                },
              ]}
            />

            <Select
              placeholder="Trạng thái"
              allowClear
              style={{ width: 145 }}
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: 'SCHEDULED', label: 'Sắp diễn ra' },
                { value: 'ONGOING', label: 'Đang diễn ra' },
                { value: 'COMPLETED', label: 'Đã dạy xong' },
                { value: 'CANCELLED', label: 'Đã hủy' },
              ]}
            />

            <Space.Compact>
              <Button
                icon={<LeftOutlined />}
                onClick={() =>
                  setCurrentDate((prev) => prev.subtract(1, 'month'))
                }
              />
              <Button onClick={() => setCurrentDate(dayjs())}>Hôm nay</Button>
              <Button
                icon={<RightOutlined />}
                onClick={() => setCurrentDate((prev) => prev.add(1, 'month'))}
              />
            </Space.Compact>

            <DatePicker
              value={currentDate}
              onChange={(date) => {
                if (date) setCurrentDate(date);
              }}
              format="DD/MM/YYYY"
              allowClear={false}
              suffixIcon={<CalendarOutlined />}
              style={{ width: 136 }}
            />
          </Space>
        }
      />

      <Card
        variant="borderless"
        styles={{ body: { padding: '16px 20px' } }}
        style={{
          position: 'relative',
          borderRadius: 10,
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.08)',
        }}
      >
        {loading && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(255,255,255,0.65)',
              zIndex: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 10,
            }}
          >
            <Spin size="large" tip="Đang tải lịch..." />
          </div>
        )}

        {/* Thanh chú thích gọn */}
        <div
          style={{
            marginBottom: 14,
            padding: '8px 12px',
            backgroundColor: '#f8fafc',
            borderRadius: 8,
            border: '1px solid #f1f5f9',
            display: 'flex',
            gap: 16,
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
            {[
              { label: 'Sắp diễn ra', color: '#1677ff' },
              { label: 'Đang diễn ra', color: '#08979c' },
              { label: 'Đã dạy xong', color: '#389e0d' },
              { label: 'Dạy thay', color: '#fa8c16' },
              { label: 'Đã hủy', color: '#8c8c8c' },
            ].map((item) => (
              <span
                key={item.label}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12,
                  color: '#475569',
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    backgroundColor: item.color,
                    display: 'inline-block',
                  }}
                />
                {item.label}
              </span>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <Text type="secondary" style={{ fontSize: 11.5 }}>
              Ca học:
            </Text>
            {SHIFT_ZONES.map((z) => (
              <span
                key={z.key}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  fontSize: 12,
                  fontWeight: 500,
                  color: '#334155',
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    backgroundColor: z.color,
                  }}
                />
                {z.label}
              </span>
            ))}
          </div>
        </div>

        <div className="instructor-schedule-calendar">
          <Calendar
            value={currentDate}
            cellRender={cellRender}
            onPanelChange={(value) => setCurrentDate(value)}
            onSelect={(date) => setCurrentDate(date)}
            headerRender={() => null}
          />
        </div>
      </Card>
    </PageContainer>
  );
};

export default InstructorSchedulePage;