import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Calendar,
  Badge,
  Card,
  Space,
  Typography,
  Tooltip,
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
  { key: 'MORNING',   label: 'Sáng',  color: '#faad14' },
  { key: 'AFTERNOON', label: 'Chiều', color: '#13c2c2' },
  { key: 'EVENING',   label: 'Tối',   color: '#722ed1' },
];

const MAX_PER_ZONE = 2;

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

  const tpl = (Object.values(SCHEDULE_TEMPLATES) as Array<{
    start: string;
    end: string;
    label: string;
  }>).find((t) => t.start === startStr && t.end === endStr);

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

// Parse URL param `date` -> dayjs (fallback: hôm nay)
const parseDateParam = (raw: string | null): Dayjs => {
  if (!raw) return dayjs();
  const d = dayjs(raw);
  return d.isValid() ? d : dayjs();
};

// ════════════════════════════════════════════════════════════════════
// PAGE
// ════════════════════════════════════════════════════════════════════
type ViewMode = 'shift' | 'list';

const InstructorSchedulePage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [sessions, setSessions] = useState<SessionResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [viewMode, setViewMode] = useState<ViewMode>('shift');

  // ══════════════════════════════════════════════════════════════
  // ⭐ URL là single source of truth cho currentDate
  //    → reload / share / back-forward đều giữ đúng ngày
  // ══════════════════════════════════════════════════════════════
  const dateStr = useMemo(() => {
    const raw = searchParams.get('date');
    if (raw) {
      const d = dayjs(raw);
      if (d.isValid()) return d.format('YYYY-MM-DD');
    }
    return dayjs().format('YYYY-MM-DD');
  }, [searchParams]);

  const currentDate = useMemo(() => dayjs(dateStr), [dateStr]);

  /**
   * Ghi đè currentDate → URL (?date=YYYY-MM-DD)
   * - Dùng `replace: true` để không làm rác history
   * - No-op nếu ngày không đổi (tránh loop & refetch)
   */
  const setCurrentDate = useCallback(
    (next: Dayjs | ((prev: Dayjs) => Dayjs)) => {
      const value =
        typeof next === 'function' ? next(dayjs(dateStr)) : next;
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
      setSessions(res || []);
    } catch (error) {
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

  // ══════════════════════════════════════════════════════════════
  // RENDER — Session chip
  // ══════════════════════════════════════════════════════════════
  const renderSessionChip = (session: SessionResponse) => {
    const isCancelled = session.status === 'CANCELLED';
    const isSubstitute = Boolean(session.substituteTeacherId);

    let color = 'blue';
    let borderColor = '#1677ff';
    if (isCancelled) {
      color = 'gray';
      borderColor = '#d9d9d9';
    } else if (isSubstitute) {
      color = 'orange';
      borderColor = '#fa8c16';
    } else if (session.status === 'COMPLETED') {
      color = 'green';
      borderColor = '#52c41a';
    }

    return (
      <Tooltip
        key={session.id}
        title={
          <div style={{ lineHeight: 1.6 }}>
            <div>
              <b>{session.title}</b>
            </div>
            <div>{getShiftName(session.startTime, session.endTime)}</div>
            <div>
              Phòng:{' '}
              {session.effectiveRoomName ||
                session.roomName ||
                'Chưa xếp'}
            </div>
            <div>Trạng thái: {session.status}</div>
            {isSubstitute && (
              <div style={{ color: '#fa8c16' }}>* Bạn đang dạy thay</div>
            )}
          </div>
        }
      >
        <div
          style={{
            padding: '2px 6px',
            borderRadius: 3,
            fontSize: 11,
            lineHeight: 1.3,
            backgroundColor: isCancelled ? '#f5f5f5' : `${borderColor}15`,
            borderLeft: `3px solid ${borderColor}`,
            color: isCancelled ? '#999' : '#333',
            textDecoration: isCancelled ? 'line-through' : 'none',
            cursor: 'pointer',
            marginBottom: 2,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
          onClick={() =>
            navigate(`/instructor/courses/${session.courseId}/edit`)
          }
        >
          <div
            style={{
              fontWeight: 600,
              color: isCancelled ? '#999' : borderColor,
            }}
          >
            {dayjs(session.startTime).format('HH:mm')}–
            {dayjs(session.endTime).format('HH:mm')}
          </div>
          <div style={{ textOverflow: 'ellipsis', overflow: 'hidden' }}>
            {session.title}
          </div>
        </div>
      </Tooltip>
    );
  };

  // ══════════════════════════════════════════════════════════════
  // RENDER — Mode "Theo ca"
  // ══════════════════════════════════════════════════════════════
  const renderShiftMode = (daySessions: SessionResponse[]) => {
    const grouped: Record<ShiftKey, SessionResponse[]> = {
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
          gap: 4,
          marginTop: 3,
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
                  marginBottom: 2,
                  fontSize: 9,
                  fontWeight: 700,
                  color: zone.color,
                  textTransform: 'uppercase',
                  letterSpacing: 0.4,
                  lineHeight: 1,
                }}
              >
                <span
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    backgroundColor: zone.color,
                    flexShrink: 0,
                  }}
                />
                <span>{zone.label}</span>
                <span style={{ color: '#999', fontWeight: 400 }}>
                  · {items.length}
                </span>
              </div>

              {visible.map((s) => renderSessionChip(s))}

              {overflow > 0 && (
                <div
                  style={{
                    fontSize: 10,
                    color: '#999',
                    paddingLeft: 6,
                    fontStyle: 'italic',
                  }}
                >
                  +{overflow} buổi
                </div>
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
  const renderListMode = (daySessions: SessionResponse[]) => {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          marginTop: 3,
        }}
      >
        {daySessions.map((s) => renderSessionChip(s))}
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
      ? renderShiftMode(daySessions)
      : renderListMode(daySessions);
  };

  // ══════════════════════════════════════════════════════════════
  // RENDER — Page
  // ══════════════════════════════════════════════════════════════
  return (
    <PageContainer>
      <PageHeader
        title="Lịch giảng dạy"
        subtitle={
          <Space size={6}>
            <span>Xem lịch dạy của bạn theo tháng</span>
            <Tag color="blue" style={{ marginInlineEnd: 0 }}>
              Đang chọn: {currentDate.format('DD/MM/YYYY')}
            </Tag>
          </Space>
        }
        extra={
          <Space wrap>
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
              placeholder="Lọc trạng thái"
              allowClear
              style={{ width: 160 }}
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
              placeholder="Chọn ngày"
              style={{ width: 150 }}
            />
          </Space>
        }
      />

      <Card
        variant="borderless"
        style={{ borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
      >
        {loading && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(255,255,255,0.6)',
              zIndex: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Spin size="large" tip="Đang tải lịch..." />
          </div>
        )}

        {/* Legend: trạng thái + ca */}
        <div
          style={{
            marginBottom: 16,
            display: 'flex',
            gap: 16,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <Space>
            <Badge color="blue" text="GV chính" />
          </Space>
          <Space>
            <Badge color="orange" text="Dạy thay" />
          </Space>
          <Space>
            <Badge color="green" text="Đã dạy" />
          </Space>
          <Space>
            <Badge color="gray" text="Đã hủy" />
          </Space>

          <div style={{ width: 1, height: 20, background: '#e5e5e5' }} />

          {SHIFT_ZONES.map((z) => (
            <Space key={z.key} size={6}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: z.color,
                  display: 'inline-block',
                }}
              />
              <Text style={{ fontSize: 12 }}>{z.label}</Text>
            </Space>
          ))}
        </div>

        <Calendar
          value={currentDate}
          cellRender={cellRender}
          onPanelChange={(value) => setCurrentDate(value)}
          onSelect={(date) => setCurrentDate(date)}
          headerRender={() => null}
        />
      </Card>
    </PageContainer>
  );
};

export default InstructorSchedulePage;