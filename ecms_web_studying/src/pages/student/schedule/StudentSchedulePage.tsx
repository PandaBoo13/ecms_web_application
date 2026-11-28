// src/pages/student/StudentSchedulePage.tsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Calendar,
  Card,
  Space,
  Tooltip,
  Popover,
  Button,
  Select,
  Spin,
  DatePicker,
  Tag,
  Segmented,
  Drawer,
  Descriptions,
} from 'antd';
import type { CalendarProps } from 'antd';
import {
  LeftOutlined,
  RightOutlined,
  CalendarOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
  ReloadOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  BookOutlined,
  UserOutlined,
  PlayCircleOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import 'dayjs/locale/vi';
import toast from 'react-hot-toast';

import PageContainer from '@/components/common/PageContainer';
import PageHeader from '@/components/common/PageHeader';
import StatusTag from '@/components/common/StatusTag';
import { sessionApi } from '@/services/api/course';
import type { SessionResponse } from '@/services/types/course';
import { SCHEDULE_TEMPLATES } from '@/constants/schedule-templates';

dayjs.locale('vi');

type ScheduleSessionItem = SessionResponse & {
  courseTitle?: string;
  courseName?: string;
  courseCode?: string;
  meetingUrl?: string;
  note?: string;
};

type ViewMode = 'shift' | 'list';
type ShiftKey = 'MORNING' | 'AFTERNOON' | 'EVENING';

interface ShiftZone {
  key: ShiftKey;
  label: string;
  dotClass: string;
  textClass: string;
}

const SHIFT_ZONES: ShiftZone[] = [
  {
    key: 'MORNING',
    label: 'Sáng',
    dotClass: 'bg-amber-500',
    textClass: 'text-amber-700',
  },
  {
    key: 'AFTERNOON',
    label: 'Chiều',
    dotClass: 'bg-cyan-600',
    textClass: 'text-cyan-700',
  },
  {
    key: 'EVENING',
    label: 'Tối',
    dotClass: 'bg-violet-600',
    textClass: 'text-violet-700',
  },
];

const MAX_PER_ZONE = 2;
const MAX_LIST_ITEMS = 4;

// ════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════
const getShiftName = (startTime: string, endTime: string): string => {
  const start = dayjs(startTime).format('HH:mm');
  const end = dayjs(endTime).format('HH:mm');

  const found = Object.values(SCHEDULE_TEMPLATES).find(
    (tpl) => tpl.start === start && tpl.end === end,
  );
  return found ? found.label : `Ca ${start} – ${end}`;
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
    const lower = tpl.label.toLowerCase();
    if (lower.includes('sáng') || lower.includes('sang')) return 'MORNING';
    if (lower.includes('chiều') || lower.includes('chieu')) return 'AFTERNOON';
    if (lower.includes('tối') || lower.includes('toi')) return 'EVENING';
  }

  const hour = dayjs(startTime).hour();
  if (hour < 12) return 'MORNING';
  if (hour < 18) return 'AFTERNOON';
  return 'EVENING';
};

const getStatusStyle = (status?: string) => {
  if (status === 'CANCELLED') {
    return {
      label: 'Đã hủy',
      containerClass:
        'bg-slate-50/90 border-slate-200/90 border-l-slate-400 opacity-75',
      timeClass: 'text-slate-400 line-through',
    };
  }

  switch (status) {
    case 'ONGOING':
      return {
        label: 'Đang diễn ra',
        containerClass:
          'bg-cyan-50/60 hover:bg-cyan-50 border-cyan-200/80 border-l-cyan-600',
        timeClass: 'text-cyan-700',
      };
    case 'COMPLETED':
      return {
        label: 'Đã học xong',
        containerClass:
          'bg-emerald-50/60 hover:bg-emerald-50 border-emerald-200/80 border-l-emerald-600',
        timeClass: 'text-emerald-700',
      };
    case 'SCHEDULED':
    default:
      return {
        label: status === 'SCHEDULED' ? 'Sắp diễn ra' : status || 'Không rõ',
        containerClass:
          'bg-blue-50/60 hover:bg-blue-50 border-blue-200/80 border-l-blue-600',
        timeClass: 'text-blue-700',
      };
  }
};

// ════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════════════════
const StudentSchedulePage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [sessions, setSessions] = useState<ScheduleSessionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [viewMode, setViewMode] = useState<ViewMode>('shift');
  const [detailSession, setDetailSession] = useState<ScheduleSessionItem | null>(null);

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

  // ─── Load lịch học theo tháng hiển thị ───
  const fetchSchedule = useCallback(async (date: Dayjs) => {
    setLoading(true);
    try {
      const from = date.startOf('month').subtract(7, 'day').format('YYYY-MM-DD');
      const to = date.endOf('month').add(7, 'day').format('YYYY-MM-DD');

      const res = await sessionApi.getMySchedule({ from, to });
      setSessions((res as ScheduleSessionItem[]) || []);
    } catch (error) {
      console.error('fetchSchedule error:', error);
      toast.error('Không thể tải lịch học');
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
    return sessions.filter((s) => String(s.status) === statusFilter);
  }, [sessions, statusFilter]);

  const handleJoinClass = useCallback(
    (session: ScheduleSessionItem) => {
      if (session.status === 'CANCELLED') {
        toast.error('Buổi học này đã bị hủy');
        return;
      }
      if (!session.courseId) {
        toast.error('Không tìm thấy thông tin khóa học');
        return;
      }
      navigate(`/student/courses/${session.courseId}/learn`);
    },
    [navigate],
  );

  // ══════════════════════════════════════════════════════════════
  // RENDER — Compact Session Chip
  // ══════════════════════════════════════════════════════════════
  const renderSessionChip = (session: ScheduleSessionItem) => {
    const isCancelled = session.status === 'CANCELLED';
    const styleMeta = getStatusStyle(session.status);
    const roomText = session.effectiveRoomName || session.roomName || 'Chưa xếp phòng';
    const courseLabel = session.courseTitle || session.courseName || session.courseCode || '';

    return (
      <Tooltip
        key={session.id}
        mouseEnterDelay={0.25}
        title={
          <div className="space-y-1 text-xs leading-relaxed">
            <div className="text-[13px] font-bold">{session.title}</div>
            {courseLabel && (
              <div>
                Khóa học: <span className="font-semibold">{courseLabel}</span>
                {session.courseCode ? ` (${session.courseCode})` : ''}
              </div>
            )}
            <div>
              Thời gian: {getShiftName(session.startTime, session.endTime)} (
              {dayjs(session.startTime).format('HH:mm')} –{' '}
              {dayjs(session.endTime).format('HH:mm')})
            </div>
            <div>Phòng: {roomText}</div>
            <div>Trạng thái: {styleMeta.label}</div>
            <div className="pt-0.5 text-[11px] text-sky-300">Bấm để xem chi tiết</div>
          </div>
        }
      >
        <div
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            setDetailSession(session);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
              setDetailSession(session);
            }
          }}
          className={`px-1.5 py-1 rounded-md border border-l-[3px] cursor-pointer transition-colors ${styleMeta.containerClass}`}
        >
          {/* Dòng 1: Giờ + Phòng */}
          <div className="flex items-center justify-between gap-1 leading-tight mb-0.5">
            <div className="flex items-center gap-1 min-w-0">
              <span className={`text-[10.5px] font-bold whitespace-nowrap ${styleMeta.timeClass}`}>
                {dayjs(session.startTime).format('HH:mm')}–
                {dayjs(session.endTime).format('HH:mm')}
              </span>
            </div>
            <span className="text-[10px] text-slate-500 whitespace-nowrap truncate max-w-[74px]">
              {roomText}
            </span>
          </div>

          {/* Dòng 2: Tên khóa + Tên buổi */}
          <div className={`text-[11px] leading-tight truncate ${isCancelled ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
            {courseLabel ? (
              <>
                <span className={`font-semibold ${isCancelled ? 'text-slate-400' : 'text-blue-600'}`}>
                  {courseLabel}
                </span>
                <span className="text-slate-500"> · {session.title}</span>
              </>
            ) : (
              <span className="font-semibold">{session.title}</span>
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
      title={<span className="text-xs font-semibold text-slate-800">{title}</span>}
      content={
        <div
          className="w-64 max-h-72 overflow-y-auto flex flex-col gap-1.5 pr-0.5"
          onClick={(e) => e.stopPropagation()}
        >
          {allItems.map((s) => renderSessionChip(s))}
        </div>
      }
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="mt-0.5 px-1.5 py-0.5 rounded bg-blue-50 hover:bg-blue-100/80 text-[10.5px] font-semibold text-blue-600 text-center cursor-pointer transition-colors"
      >
        +{hiddenCount} buổi khác
      </div>
    </Popover>
  );

  // ══════════════════════════════════════════════════════════════
  // RENDER — Mode "Theo ca"
  // ══════════════════════════════════════════════════════════════
  const renderShiftMode = (date: Dayjs, daySessions: ScheduleSessionItem[]) => {
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
      <div className="flex flex-col gap-1.5 mt-1">
        {SHIFT_ZONES.map((zone) => {
          const items = grouped[zone.key];
          if (items.length === 0) return null;

          const visible = items.slice(0, MAX_PER_ZONE);
          const overflow = items.length - visible.length;

          return (
            <div key={zone.key}>
              <div
                className={`flex items-center gap-1 mb-0.5 text-[10px] font-bold tracking-wide leading-none ${zone.textClass}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${zone.dotClass}`} />
                <span>{zone.label}</span>
                <span className="text-slate-400 font-medium">({items.length})</span>
              </div>

              <div className="flex flex-col gap-1">
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
  const renderListMode = (date: Dayjs, daySessions: ScheduleSessionItem[]) => {
    const visible = daySessions.slice(0, MAX_LIST_ITEMS);
    const overflow = daySessions.length - visible.length;

    return (
      <div className="flex flex-col gap-1 mt-1">
        {visible.map((s) => renderSessionChip(s))}
        {overflow > 0 &&
          renderOverflowTrigger(
            `Lịch học ngày ${date.format('DD/MM/YYYY')}`,
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
      .filter((s) => s.startTime && dayjs(s.startTime).isSame(date, 'day'))
      .sort((a, b) => dayjs(a.startTime).valueOf() - dayjs(b.startTime).valueOf());

    if (daySessions.length === 0) return null;

    return viewMode === 'shift'
      ? renderShiftMode(date, daySessions)
      : renderListMode(date, daySessions);
  };

  const detailCourseLabel = detailSession
    ? detailSession.courseTitle || detailSession.courseName || '—'
    : '';
  const detailRoomText = detailSession
    ? detailSession.effectiveRoomName || detailSession.roomName
    : undefined;

  // ══════════════════════════════════════════════════════════════
  // RENDER — Page
  // ══════════════════════════════════════════════════════════════
  return (
    <PageContainer>
      <style>{`
        .student-schedule-calendar .ant-picker-cell-inner.ant-picker-calendar-date {
          height: auto !important;
          min-height: 98px;
          padding: 4px 6px 6px !important;
          margin: 0 !important;
        }
        .student-schedule-calendar .ant-picker-calendar-date-content {
          height: auto !important;
          overflow: visible !important;
        }
        .student-schedule-calendar .ant-picker-calendar-date-value {
          font-size: 12.5px;
          font-weight: 600;
          line-height: 20px;
        }
        .student-schedule-calendar .ant-picker-content th {
          padding-bottom: 8px !important;
          font-size: 12px;
          font-weight: 600;
          color: #64748b;
        }
      `}</style>

      <PageHeader
        title="Lịch học của tôi"
        subtitle={
          <div className="flex flex-wrap items-center gap-2 mt-0.5">
            <span>Theo dõi lịch học, ca học và phòng học theo tháng</span>
            <Tag color="blue" className="!m-0 !rounded-full !text-xs !font-medium px-2.5">
              Tháng {currentDate.format('MM/YYYY')}
            </Tag>
          </div>
        }
        extra={
          <Space wrap size={8}>
            <Segmented
              value={viewMode}
              onChange={(v) => setViewMode(v as ViewMode)}
              options={[
                { label: 'Theo ca', value: 'shift', icon: <AppstoreOutlined /> },
                { label: 'Danh sách', value: 'list', icon: <UnorderedListOutlined /> },
              ]}
            />

            <Select
              placeholder="Lọc trạng thái"
              allowClear
              className="w-40"
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: 'SCHEDULED', label: 'Sắp diễn ra' },
                { value: 'ONGOING', label: 'Đang diễn ra' },
                { value: 'COMPLETED', label: 'Đã học xong' },
                { value: 'CANCELLED', label: 'Đã hủy' },
              ]}
            />

            {statusFilter && (
              <Button onClick={() => setStatusFilter(undefined)} className="!rounded-lg">
                Xóa lọc
              </Button>
            )}

            <Space.Compact>
              <Button
                icon={<LeftOutlined />}
                onClick={() => setCurrentDate((prev) => prev.subtract(1, 'month'))}
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
              className="w-36 !rounded-lg"
            />

            <Tooltip title="Làm mới lịch học">
              <Button
                icon={<ReloadOutlined spin={loading} />}
                onClick={() => {
                  fetchSchedule(currentDate);
                  toast.success('Đã làm mới lịch học');
                }}
                className="!rounded-lg"
              />
            </Tooltip>
          </Space>
        }
      />

      <Card
        styles={{ body: { padding: '16px 20px' } }}
        className="relative !rounded-xl border-slate-200/90 shadow-none overflow-hidden"
      >
        {loading && (
          <div className="absolute inset-0 z-10 bg-white/70 backdrop-blur-[1px] flex flex-col items-center justify-center gap-2.5">
            <Spin size="large" />
            <span className="text-xs font-medium text-slate-500">Đang tải lịch học...</span>
          </div>
        )}

        {/* Thanh chú thích trạng thái & ca học */}
        <div className="mb-3.5 px-3.5 py-2.5 rounded-xl bg-slate-50/80 border border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-4">
            {[
              { label: 'Sắp diễn ra', dotClass: 'bg-blue-600' },
              { label: 'Đang diễn ra', dotClass: 'bg-cyan-600' },
              { label: 'Đã học xong', dotClass: 'bg-emerald-600' },
              { label: 'Đã hủy', dotClass: 'bg-slate-400' },
            ].map((item) => (
              <span key={item.label} className="inline-flex items-center gap-1.5 text-xs text-slate-600">
                <span className={`w-2 h-2 rounded-sm inline-block ${item.dotClass}`} />
                {item.label}
              </span>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[11.5px] font-medium text-slate-400">Ca học:</span>
            {SHIFT_ZONES.map((z) => (
              <span key={z.key} className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700">
                <span className={`w-2 h-2 rounded-full inline-block ${z.dotClass}`} />
                {z.label}
              </span>
            ))}
          </div>
        </div>

        <div className="student-schedule-calendar">
          <Calendar
            value={currentDate}
            cellRender={cellRender}
            onPanelChange={(value) => setCurrentDate(value)}
            onSelect={(date) => setCurrentDate(date)}
            headerRender={() => null}
          />
        </div>
      </Card>

      {/* Drawer Chi tiết buổi học */}
      <Drawer
        placement="right"
        width={720}
        open={Boolean(detailSession)}
        onClose={() => setDetailSession(null)}
        destroyOnClose
        className="[&_.ant-drawer-header-title]:min-w-0 [&_.ant-drawer-title]:min-w-0 [&_.ant-drawer-extra]:shrink-0"
        title={
          detailSession && (
            <div className="flex items-center gap-3.5 min-w-0 pr-2">
              <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 text-lg">
                <CalendarOutlined />
              </div>
              <div className="min-w-0 flex-1">
                <div
                  title={detailSession.title}
                  className="text-[16.5px] font-bold text-slate-900 leading-snug truncate"
                >
                  {detailSession.title}
                </div>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <StatusTag status={detailSession.status} />
                  {detailSession.courseCode && (
                    <Tag className="!m-0 !font-mono !text-xs !rounded !bg-slate-50 !border-slate-200 !text-slate-600">
                      {detailSession.courseCode}
                    </Tag>
                  )}
                </div>
              </div>
            </div>
          )
        }
        extra={
          <Button onClick={() => setDetailSession(null)} className="!rounded-lg">
            Đóng
          </Button>
        }
        footer={
          detailSession && (
            <div className="flex items-center justify-between gap-3">
              <Button onClick={() => setDetailSession(null)} className="!rounded-lg">
                Đóng
              </Button>
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                disabled={detailSession.status === 'CANCELLED'}
                onClick={() => {
                  const targetSession = detailSession;
                  setDetailSession(null);
                  handleJoinClass(targetSession);
                }}
                className="!rounded-lg !font-medium"
              >
                Vào lớp học
              </Button>
            </div>
          )
        }
      >
        {detailSession && (
          <div className="flex flex-col gap-4 pt-1">
            <Card
              size="small"
              title="Thông tin buổi học"
              styles={{ body: { padding: '16px 20px 4px' } }}
              className="!bg-white !border-slate-200/80 !rounded-xl"
            >
              <Descriptions
                column={{ xs: 1, sm: 2 }}
                size="small"
                styles={{
                  label: { paddingBottom: 14, color: '#64748b' },
                  content: { paddingBottom: 14 },
                }}
              >
                <Descriptions.Item
                  span={2}
                  label={
                    <Space size={6}>
                      <BookOutlined /> Khóa học
                    </Space>
                  }
                >
                  <span className="font-semibold text-slate-800">{detailCourseLabel}</span>
                </Descriptions.Item>

                <Descriptions.Item
                  label={
                    <Space size={6}>
                      <CalendarOutlined /> Ngày học
                    </Space>
                  }
                >
                  <span className="font-semibold text-blue-600">
                    {dayjs(detailSession.startTime).format('DD/MM/YYYY')}
                  </span>
                </Descriptions.Item>

                <Descriptions.Item
                  label={
                    <Space size={6}>
                      <ClockCircleOutlined /> Ca & Khung giờ
                    </Space>
                  }
                >
                  <span className="font-medium text-slate-800">
                    {getShiftName(detailSession.startTime, detailSession.endTime)} (
                    {dayjs(detailSession.startTime).format('HH:mm')} –{' '}
                    {dayjs(detailSession.endTime).format('HH:mm')})
                  </span>
                </Descriptions.Item>

                <Descriptions.Item
                  label={
                    <Space size={6}>
                      <UserOutlined /> Giảng viên
                    </Space>
                  }
                >
                  <span className="font-medium text-slate-800">
                    {detailSession.effectiveTeacherName || detailSession.teacherName || 'Đang cập nhật'}
                  </span>
                </Descriptions.Item>

                <Descriptions.Item
                  label={
                    <Space size={6}>
                      <EnvironmentOutlined /> Phòng học
                    </Space>
                  }
                >
                  {detailRoomText ? (
                    <Tag className="!m-0 !rounded !bg-slate-50 !border-slate-200 !text-slate-700 !font-medium">
                      {detailRoomText}
                    </Tag>
                  ) : (
                    <span className="text-slate-400 italic">Chưa xếp phòng</span>
                  )}
                </Descriptions.Item>
              </Descriptions>
            </Card>

            {detailSession.note && (
              <Card
                size="small"
                title="Ghi chú"
                styles={{ body: { padding: '14px 20px' } }}
                className="!bg-white !border-slate-200/80 !rounded-xl"
              >
                <div className="text-[13.5px] text-slate-600 leading-relaxed whitespace-pre-line">
                  {detailSession.note}
                </div>
              </Card>
            )}
          </div>
        )}
      </Drawer>
    </PageContainer>
  );
};

export default StudentSchedulePage;