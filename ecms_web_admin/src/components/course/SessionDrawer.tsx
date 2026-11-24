// src/components/course/SessionDrawer.tsx
import { useEffect, useMemo, useState } from 'react';
import {
  Drawer,
  Tabs,
  Card,
  Descriptions,
  Tag,
  Space,
  Button,
  Form,
  Input,
  DatePicker,
  TimePicker,
  Select,
  Timeline,
  Modal,
  Tooltip,
} from 'antd';
import {
  CalendarOutlined,
  ClockCircleOutlined,
  UserOutlined,
  HomeOutlined,
  EditOutlined,
  CheckOutlined,
  CloseOutlined,
  SaveOutlined,
  UserSwitchOutlined,
  UserAddOutlined,
  FileTextOutlined,
  InfoCircleOutlined,
  PlusOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import toast from 'react-hot-toast';

import StatusTag from '@/components/common/StatusTag';
import DateDisplay from '@/components/common/DateDisplay';
import UserAvatar from '@/components/common/UserAvatar';
import { sessionApi, roomApi } from '@/services/api/course';
import { adminUserApi } from '@/services/api/admin';
import {
  SCHEDULE_TEMPLATES,
  type ScheduleTemplateCode,
} from '@/constants/schedule-templates';
import type {
  CourseDetailResponse,
  SessionCreateRequest,
  SessionResponse,
  RoomResponse,
} from '@/services/types/course';
import type { AccountResponse } from '@/services/types/user';

export type SessionDrawerMode = 'create' | 'view' | 'edit';
type ShiftSelection = ScheduleTemplateCode | 'CUSTOM';

interface Props {
  open: boolean;
  courseId: number;
  course?: CourseDetailResponse;
  session?: SessionResponse | null;
  initialMode?: SessionDrawerMode;
  readOnly?: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onRequestCancel?: (session: SessionResponse) => void;
}

const VN_DAY_LABELS: Record<number, string> = {
  2: 'T2',
  3: 'T3',
  4: 'T4',
  5: 'T5',
  6: 'T6',
  7: 'T7',
  8: 'CN',
};

const formatTemplateDays = (days: readonly number[]): string =>
  days.map((d) => VN_DAY_LABELS[d] ?? `T${d}`).join('-');

/** Quy đổi dayjs.day() (0=CN..6=T7) sang chuẩn VN (2=T2..7=T7, 8=CN) */
const toVnDayOfWeek = (date: Dayjs): number =>
  date.day() === 0 ? 8 : date.day() + 1;

/** Tìm mã ca khớp với khung giờ HH:mm */
const findShiftByTime = (
  startHHmm: string,
  endHHmm: string,
): ScheduleTemplateCode | undefined => {
  const entries = Object.entries(SCHEDULE_TEMPLATES) as [
    ScheduleTemplateCode,
    (typeof SCHEDULE_TEMPLATES)[ScheduleTemplateCode],
  ][];
  const match = entries.find(
    ([, tpl]) => tpl.start === startHHmm && tpl.end === endHHmm,
  );
  return match?.[0];
};

/** Tìm mã ca khớp với cấu hình mặc định của khóa học (nếu có) */
const detectDefaultShiftFromCourse = (
  course?: CourseDetailResponse,
): ScheduleTemplateCode | undefined => {
  if (!course?.sessionStartTime || !course?.sessionEndTime) return undefined;
  const startHHmm = course.sessionStartTime.slice(0, 5);
  const endHHmm = course.sessionEndTime.slice(0, 5);

  const entries = Object.entries(SCHEDULE_TEMPLATES) as [
    ScheduleTemplateCode,
    (typeof SCHEDULE_TEMPLATES)[ScheduleTemplateCode],
  ][];

  if (course.scheduleDays && course.scheduleDays.length > 0) {
    const sortedCourseDays = [...course.scheduleDays].sort().join(',');
    const exact = entries.find(
      ([, tpl]) =>
        tpl.start === startHHmm &&
        tpl.end === endHHmm &&
        [...tpl.days].sort().join(',') === sortedCourseDays,
    );
    if (exact) return exact[0];
  }

  return findShiftByTime(startHHmm, endHHmm);
};

const SessionDrawer = ({
  open,
  courseId,
  course,
  session,
  initialMode = 'view',
  readOnly = false,
  onClose,
  onSuccess,
  onRequestCancel,
}: Props) => {
  const [form] = Form.useForm();
  const [mode, setMode] = useState<SessionDrawerMode>(initialMode);
  const [submitting, setSubmitting] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [instructors, setInstructors] = useState<AccountResponse[]>([]);
  const [rooms, setRooms] = useState<RoomResponse[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  const selectedShift = Form.useWatch('shiftCode', form) as
    | ShiftSelection
    | undefined;
  const selectedDate = Form.useWatch('sessionDate', form) as Dayjs | undefined;
  const selectedTeacherId = Form.useWatch('teacherId', form) as
    | number
    | undefined;

  const isCreate = mode === 'create';
  const isEdit = mode === 'edit';
  const isFormMode = isCreate || isEdit;

  const canModify = Boolean(
    !readOnly &&
      session &&
      session.status !== 'CANCELLED' &&
      session.status !== 'COMPLETED',
  );
  const canMarkDone = Boolean(
    !readOnly &&
      session &&
      (session.status === 'SCHEDULED' || session.status === 'ONGOING'),
  );

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode, session?.id, open]);

  // Tải danh sách giảng viên & phòng học khi mở Drawer
  useEffect(() => {
    if (!open) return;
    setLoadingOptions(true);
    Promise.all([
      adminUserApi.search({
        roleCode: 'INSTRUCTOR',
        isActive: true,
        page: 0,
        size: 200,
      }),
      roomApi.listActive(),
    ])
      .then(([userRes, roomRes]) => {
        setInstructors(userRes.content || []);
        setRooms(roomRes || []);
      })
      .catch(() =>
        toast.error('Không tải được danh sách giảng viên hoặc phòng học'),
      )
      .finally(() => setLoadingOptions(false));
  }, [open]);

  // Đổ dữ liệu vào Form khi ở chế độ Tạo mới hoặc Chỉnh sửa
  useEffect(() => {
    if (!open || !isFormMode) return;
    form.resetFields();

    if (isEdit && session) {
      const sessionWithNested = session as SessionResponse & {
        teacher?: { id?: number };
        substituteTeacher?: { id?: number };
        assistant?: { id?: number };
        room?: { id?: number };
        note?: string;
      };

      const startDayjs = session.startTime
        ? dayjs(session.startTime)
        : undefined;
      const endDayjs = session.endTime ? dayjs(session.endTime) : undefined;
      const matchedShift =
        startDayjs?.isValid() && endDayjs?.isValid()
          ? findShiftByTime(
              startDayjs.format('HH:mm'),
              endDayjs.format('HH:mm'),
            )
          : undefined;

      form.setFieldsValue({
        title: session.title,
        description: session.description,
        sessionDate: startDayjs?.isValid() ? startDayjs : undefined,
        shiftCode: matchedShift ?? 'CUSTOM',
        startTime: startDayjs?.isValid() ? startDayjs : undefined,
        endTime: endDayjs?.isValid() ? endDayjs : undefined,
        teacherId: session.teacherId ?? sessionWithNested.teacher?.id,
        substituteTeacherId:
          session.substituteTeacherId ??
          sessionWithNested.substituteTeacher?.id,
        assistantId: session.assistantId ?? sessionWithNested.assistant?.id,
        roomId: session.roomId ?? sessionWithNested.room?.id,
        note: sessionWithNested.note,
      });
      return;
    }

    // Chế độ Tạo mới: lấy mặc định từ cấu hình khóa học
    const courseWithNested = course as CourseDetailResponse & {
      teacher?: { id?: number };
      room?: { id?: number };
    };
    const defaultTeacherId = course?.teacherId ?? courseWithNested?.teacher?.id;
    const defaultRoomId = course?.roomId ?? courseWithNested?.room?.id;
    const matchedShift = detectDefaultShiftFromCourse(course);

    if (matchedShift) {
      const tpl = SCHEDULE_TEMPLATES[matchedShift];
      form.setFieldsValue({
        shiftCode: matchedShift,
        startTime: dayjs(tpl.start, 'HH:mm'),
        endTime: dayjs(tpl.end, 'HH:mm'),
        teacherId: defaultTeacherId,
        roomId: defaultRoomId,
      });
    } else if (course?.sessionStartTime && course?.sessionEndTime) {
      form.setFieldsValue({
        shiftCode: 'CUSTOM',
        startTime: dayjs(course.sessionStartTime.slice(0, 5), 'HH:mm'),
        endTime: dayjs(course.sessionEndTime.slice(0, 5), 'HH:mm'),
        teacherId: defaultTeacherId,
        roomId: defaultRoomId,
      });
    } else {
      form.setFieldsValue({
        teacherId: defaultTeacherId,
        roomId: defaultRoomId,
      });
    }
  }, [open, isFormMode, isEdit, session, course, form]);

  const shiftOptions = useMemo(() => {
    const templateOpts = (
      Object.entries(SCHEDULE_TEMPLATES) as [
        ScheduleTemplateCode,
        (typeof SCHEDULE_TEMPLATES)[ScheduleTemplateCode],
      ][]
    ).map(([code, tpl]) => ({
      value: code,
      label: (
        <Space size={6}>
          <span>{tpl.label}</span>
          <Tag color="blue" className="!m-0">
            {tpl.start} - {tpl.end}
          </Tag>
          <span className="text-xs text-slate-400">
            ({formatTemplateDays(tpl.days)})
          </span>
        </Space>
      ),
      searchText: `${code} ${tpl.label} ${tpl.start} ${tpl.end} ${formatTemplateDays(tpl.days)}`,
    }));

    return [
      ...templateOpts,
      {
        value: 'CUSTOM' as const,
        label: (
          <span className="text-slate-600">Tùy chỉnh khung giờ khác...</span>
        ),
        searchText: 'tuy chinh khung gio khac custom',
      },
    ];
  }, []);

  const dayMismatchWarning = useMemo(() => {
    if (!selectedDate || !selectedShift || selectedShift === 'CUSTOM') {
      return null;
    }
    const tpl = SCHEDULE_TEMPLATES[selectedShift];
    const vnDay = toVnDayOfWeek(selectedDate);
    if ((tpl.days as readonly number[]).includes(vnDay)) return null;

    return `Ngày ${selectedDate.format('DD/MM/YYYY')} là ${VN_DAY_LABELS[vnDay]}, khác với lịch chuẩn của ca "${tpl.label}" (${formatTemplateDays(tpl.days)}). Bạn vẫn có thể lưu nếu đây là buổi học bù.`;
  }, [selectedDate, selectedShift]);

  const instructorOptions = useMemo(
    () =>
      instructors.map((a) => ({
        value: a.accountId,
        label: `${a.fullName || a.email} (${a.email})`,
      })),
    [instructors],
  );

  const secondaryInstructorOptions = useMemo(
    () => instructorOptions.filter((opt) => opt.value !== selectedTeacherId),
    [instructorOptions, selectedTeacherId],
  );

  const handleShiftChange = (value: ShiftSelection) => {
    if (value === 'CUSTOM') return;
    const tpl = SCHEDULE_TEMPLATES[value];
    form.setFieldsValue({
      startTime: dayjs(tpl.start, 'HH:mm'),
      endTime: dayjs(tpl.end, 'HH:mm'),
    });
  };

  const handleTeacherChange = (newTeacherId?: number) => {
    if (!newTeacherId) return;
    if (form.getFieldValue('substituteTeacherId') === newTeacherId) {
      form.setFieldValue('substituteTeacherId', undefined);
    }
    if (form.getFieldValue('assistantId') === newTeacherId) {
      form.setFieldValue('assistantId', undefined);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      const dateStr = (values.sessionDate as Dayjs).format('YYYY-MM-DD');
      const startStr = (values.startTime as Dayjs).format('HH:mm:00');
      const endStr = (values.endTime as Dayjs).format('HH:mm:00');

      const payload: SessionCreateRequest = {
        title: values.title.trim(),
        description: values.description?.trim() || undefined,
        startTime: `${dateStr}T${startStr}`,
        endTime: `${dateStr}T${endStr}`,
        teacherId: values.teacherId,
        substituteTeacherId: values.substituteTeacherId,
        assistantId: values.assistantId,
        roomId: values.roomId,
        note: values.note?.trim() || undefined,
      };

      if (isEdit && session) {
        await sessionApi.update(courseId, session.id, payload);
        toast.success('Cập nhật buổi học thành công');
        setMode('view');
        onSuccess();
      } else {
        await sessionApi.create(courseId, payload);
        toast.success('Tạo buổi học thành công');
        form.resetFields();
        onSuccess();
        onClose();
      }
    } catch (err) {
      if ((err as { errorFields?: unknown })?.errorFields) return;
      toast.error(
        (err as { message?: string })?.message ||
          (isEdit ? 'Cập nhật buổi học thất bại' : 'Tạo buổi học thất bại'),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkDone = () => {
    if (!session || !canMarkDone) return;
    Modal.confirm({
      title: `Đánh dấu Buổi #${session.sessionNumber} đã hoàn thành?`,
      content: 'Tiến độ học tập của học viên sẽ được cập nhật tự động.',
      okText: 'Xác nhận',
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          await sessionApi.markDone(courseId, session.id);
          toast.success('Đã đánh dấu buổi học hoàn thành');
          onSuccess();
        } catch (err) {
          toast.error((err as { message?: string })?.message || 'Thất bại');
        }
      },
    });
  };

  const handleQuickAssign = async (
    type: 'substitute' | 'assistant',
    teacherId?: number,
  ) => {
    if (!session || !canModify) return;
    setAssigning(true);
    try {
      if (type === 'substitute') {
        await sessionApi.assignSubstituteTeacher(
          courseId,
          session.id,
          teacherId ?? null,
        );
        toast.success(teacherId ? 'Đã gán GV dạy thay' : 'Đã gỡ GV dạy thay');
      } else {
        await sessionApi.assignAssistant(
          courseId,
          session.id,
          teacherId ?? null,
        );
        toast.success(teacherId ? 'Đã gán trợ giảng' : 'Đã gỡ trợ giảng');
      }
      onSuccess();
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Thất bại');
    } finally {
      setAssigning(false);
    }
  };

  const isCustomShift = selectedShift === 'CUSTOM';
  const sessionNote = (session as (SessionResponse & { note?: string }) | null)
    ?.note;
  const effectiveTeacher =
    session?.effectiveTeacherName || session?.teacherName;
  const effectiveRoom = session?.effectiveRoomName || session?.roomName;

  const matchedViewShift = useMemo(() => {
    if (!session?.startTime || !session?.endTime) return undefined;
    const code = findShiftByTime(
      dayjs(session.startTime).format('HH:mm'),
      dayjs(session.endTime).format('HH:mm'),
    );
    return code ? SCHEDULE_TEMPLATES[code] : undefined;
  }, [session?.startTime, session?.endTime]);

  const renderSessionForm = () => (
    <Card
      size="small"
      title={
        isEdit
          ? 'Thông tin lịch học & Phân công'
          : 'Nhập thông tin buổi học mới'
      }
      className="!bg-white !border-slate-200/80 !rounded-xl"
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="title"
          label="Tiêu đề buổi học"
          rules={[{ required: true, message: 'Vui lòng nhập tiêu đề' }]}
        >
          <Input
            placeholder="VD: Buổi 1 - Giới thiệu & Placement test"
            maxLength={255}
            className="!h-9 !rounded-lg"
          />
        </Form.Item>

        <Form.Item name="description" label="Mô tả nội dung">
          <Input.TextArea
            rows={2}
            placeholder="Nội dung trọng tâm của buổi học..."
            className="!rounded-lg"
          />
        </Form.Item>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <Form.Item
            name="sessionDate"
            label="Ngày học"
            rules={[{ required: true, message: 'Vui lòng chọn ngày học' }]}
            className="sm:col-span-5 !mb-3"
          >
            <DatePicker
              format="DD/MM/YYYY"
              placeholder="Chọn ngày"
              className="!w-full !h-9 !rounded-lg"
            />
          </Form.Item>

          <Form.Item
            name="shiftCode"
            label="Ca học"
            rules={[{ required: true, message: 'Vui lòng chọn ca học' }]}
            className="sm:col-span-7 !mb-3"
          >
            <Select
              placeholder="Chọn ca học theo lịch"
              showSearch
              optionFilterProp="searchText"
              options={shiftOptions}
              onChange={handleShiftChange}
              className="!w-full !h-9"
            />
          </Form.Item>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Form.Item
            name="startTime"
            label="Giờ bắt đầu"
            rules={[{ required: true, message: 'Vui lòng chọn giờ bắt đầu' }]}
            className="!mb-3"
          >
            <TimePicker
              format="HH:mm"
              minuteStep={5}
              disabled={!isCustomShift}
              placeholder="HH:mm"
              className="!w-full !h-9 !rounded-lg"
            />
          </Form.Item>

          <Form.Item
            name="endTime"
            label="Giờ kết thúc"
            dependencies={['startTime']}
            rules={[
              { required: true, message: 'Vui lòng chọn giờ kết thúc' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  const start = getFieldValue('startTime');
                  if (!value || !start || value.isAfter(start)) {
                    return Promise.resolve();
                  }
                  return Promise.reject(
                    new Error('Giờ kết thúc phải sau giờ bắt đầu'),
                  );
                },
              }),
            ]}
            className="!mb-3"
          >
            <TimePicker
              format="HH:mm"
              minuteStep={5}
              disabled={!isCustomShift}
              placeholder="HH:mm"
              className="!w-full !h-9 !rounded-lg"
            />
          </Form.Item>
        </div>

        {dayMismatchWarning && (
          <div className="mb-3.5 rounded-lg border border-amber-200/80 bg-amber-50/70 px-3 py-2 text-xs text-amber-800 flex items-start gap-2">
            <WarningOutlined className="text-amber-500 mt-0.5 shrink-0" />
            <span>{dayMismatchWarning}</span>
          </div>
        )}

        <Form.Item name="teacherId" label="Giảng viên chính" className="!mb-3">
          <Select
            placeholder="Chọn giảng viên"
            allowClear
            showSearch
            optionFilterProp="label"
            loading={loadingOptions}
            options={instructorOptions}
            onChange={handleTeacherChange}
            className="!w-full !h-9"
          />
        </Form.Item>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Form.Item
            name="substituteTeacherId"
            label="Giảng viên dạy thay"
            className="!mb-3"
          >
            <Select
              placeholder="Chọn (nếu có)"
              allowClear
              showSearch
              optionFilterProp="label"
              loading={loadingOptions}
              options={secondaryInstructorOptions}
              className="!w-full !h-9"
            />
          </Form.Item>

          <Form.Item name="assistantId" label="Trợ giảng" className="!mb-3">
            <Select
              placeholder="Chọn (nếu có)"
              allowClear
              showSearch
              optionFilterProp="label"
              loading={loadingOptions}
              options={secondaryInstructorOptions}
              className="!w-full !h-9"
            />
          </Form.Item>
        </div>

        <Form.Item name="roomId" label="Phòng học" className="!mb-3">
          <Select
            placeholder="Chọn phòng học"
            allowClear
            showSearch
            optionFilterProp="label"
            loading={loadingOptions}
            options={rooms.map((r) => ({ value: r.id, label: r.name }))}
            className="!w-full !h-9"
          />
        </Form.Item>

        <Form.Item name="note" label="Ghi chú nội bộ" className="!mb-0">
          <Input.TextArea
            rows={2}
            placeholder="Ghi chú nội bộ cho giảng viên / vận hành..."
            className="!rounded-lg"
          />
        </Form.Item>
      </Form>
    </Card>
  );

  return (
    <Drawer
      placement="right"
      width={720}
      open={open}
      onClose={() => !submitting && onClose()}
      destroyOnClose
      maskClosable={!submitting}
      title={
        isCreate ? (
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 text-lg">
              <PlusOutlined />
            </div>
            <div className="min-w-0">
              <div className="text-[16.5px] font-bold text-slate-900 leading-snug">
                Tạo buổi học mới
              </div>
              <div className="flex items-center gap-2 mt-1">
                {course?.code && (
                  <Tag
                    color="blue"
                    className="!m-0 !font-mono !font-semibold !text-xs !rounded"
                  >
                    {course.code}
                  </Tag>
                )}
                <span className="text-xs text-slate-500 truncate">
                  {course?.title || `Khóa học #${courseId}`}
                </span>
              </div>
            </div>
          </div>
        ) : (
          session && (
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 text-base font-bold">
                #{session.sessionNumber}
              </div>
              <div className="min-w-0">
                <div className="text-[16.5px] font-bold text-slate-900 leading-snug truncate">
                  {session.title}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Tag
                    color="blue"
                    className="!m-0 !font-mono !font-semibold !text-xs !rounded"
                  >
                    Buổi #{session.sessionNumber}
                  </Tag>
                  <StatusTag status={session.status} />
                </div>
              </div>
            </div>
          )
        )
      }
      extra={
        <Space size={8}>
          {isFormMode ? (
            <>
              <Button
                onClick={() => (isEdit ? setMode('view') : onClose())}
                disabled={submitting}
                className="!rounded-lg"
              >
                Hủy
              </Button>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                loading={submitting}
                onClick={handleSubmit}
                className="!rounded-lg"
              >
                {isEdit ? 'Lưu thay đổi' : 'Tạo buổi học'}
              </Button>
            </>
          ) : (
            session && (
              <>
                {canModify && (
                  <Button
                    icon={<EditOutlined />}
                    onClick={() => setMode('edit')}
                    className="!rounded-lg"
                  >
                    Chỉnh sửa
                  </Button>
                )}
                {canMarkDone && (
                  <Button
                    type="primary"
                    icon={<CheckOutlined />}
                    onClick={handleMarkDone}
                    className="!rounded-lg"
                  >
                    Hoàn thành
                  </Button>
                )}
                {canModify && onRequestCancel && (
                  <Tooltip title="Hủy buổi học này">
                    <Button
                      danger
                      icon={<CloseOutlined />}
                      onClick={() => onRequestCancel(session)}
                      className="!rounded-lg"
                    />
                  </Tooltip>
                )}
              </>
            )
          )}
        </Space>
      }
    >
      {isCreate ? (
        renderSessionForm()
      ) : (
        session && (
          <Tabs
            defaultActiveKey="info"
            items={[
              {
                key: 'info',
                label: (
                  <span>
                    <InfoCircleOutlined /> Thông tin buổi học
                  </span>
                ),
                children: isEdit ? (
                  renderSessionForm()
                ) : (
                  <div className="flex flex-col gap-4">
                    {/* Thẻ Thời gian & Địa điểm */}
                    <Card
                      size="small"
                      title="Thời gian & Địa điểm"
                      className="!bg-white !border-slate-200/80 !rounded-xl"
                    >
                      <Descriptions column={{ xs: 1, sm: 2 }} size="small">
                        <Descriptions.Item
                          label={
                            <Space size={6}>
                              <CalendarOutlined /> Ngày học
                            </Space>
                          }
                        >
                          <DateDisplay
                            value={session.startTime}
                            format="short"
                          />
                        </Descriptions.Item>

                        <Descriptions.Item
                          label={
                            <Space size={6}>
                              <ClockCircleOutlined /> Khung giờ
                            </Space>
                          }
                        >
                          <Space size={6} wrap>
                            <span className="font-medium text-slate-700">
                              {session.startTime
                                ? dayjs(session.startTime).format('HH:mm')
                                : '—'}{' '}
                              →{' '}
                              {session.endTime
                                ? dayjs(session.endTime).format('HH:mm')
                                : '—'}
                            </span>
                            {matchedViewShift && (
                              <Tag color="blue" className="!m-0 !text-[11px]">
                                {matchedViewShift.label}
                              </Tag>
                            )}
                          </Space>
                        </Descriptions.Item>

                        <Descriptions.Item
                          label={
                            <Space size={6}>
                              <HomeOutlined /> Phòng học
                            </Space>
                          }
                        >
                          {effectiveRoom ? (
                            <Tag color="blue" className="!m-0 !rounded-md">
                              {effectiveRoom}
                            </Tag>
                          ) : (
                            <Tag color="warning" className="!m-0 !rounded-md">
                              Chưa gán phòng
                            </Tag>
                          )}
                        </Descriptions.Item>

                        <Descriptions.Item
                          label={
                            <Space size={6}>
                              <InfoCircleOutlined /> Trạng thái
                            </Space>
                          }
                        >
                          <StatusTag status={session.status} />
                        </Descriptions.Item>
                      </Descriptions>
                    </Card>

                    {/* Thẻ Giảng viên & Trợ giảng */}
                    <Card
                      size="small"
                      title="Giảng viên & Trợ giảng"
                      className="!bg-white !border-slate-200/80 !rounded-xl"
                    >
                      <Descriptions column={{ xs: 1, sm: 2 }} size="small">
                        <Descriptions.Item
                          label={
                            <Space size={6}>
                              <UserOutlined /> GV hiệu lực
                            </Space>
                          }
                        >
                          {effectiveTeacher ? (
                            <Space size={6} wrap>
                              <UserAvatar
                                name={effectiveTeacher}
                                size={22}
                                showName
                              />
                              {session.substituteTeacherId && (
                                <Tag
                                  color="orange"
                                  className="!m-0 !text-[11px]"
                                >
                                  Dạy thay
                                </Tag>
                              )}
                            </Space>
                          ) : (
                            <span className="text-slate-400">
                              Chưa phân công
                            </span>
                          )}
                        </Descriptions.Item>

                        <Descriptions.Item
                          label={
                            <Space size={6}>
                              <UserAddOutlined /> Trợ giảng
                            </Space>
                          }
                        >
                          {session.assistantName ? (
                            <span className="font-medium text-slate-700">
                              {session.assistantName}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </Descriptions.Item>

                        {session.substituteTeacherId && session.teacherName && (
                          <Descriptions.Item
                            span={2}
                            label={
                              <Space size={6}>
                                <UserSwitchOutlined /> GV chính
                              </Space>
                            }
                          >
                            <span className="text-slate-500">
                              {session.teacherName}
                            </span>
                          </Descriptions.Item>
                        )}
                      </Descriptions>
                    </Card>

                    {/* Thẻ Nội dung mô tả */}
                    {session.description && (
                      <Card
                        size="small"
                        title="Nội dung buổi học"
                        className="!bg-white !border-slate-200/80 !rounded-xl"
                      >
                        <p className="text-[13.5px] text-slate-600 m-0 whitespace-pre-wrap">
                          {session.description}
                        </p>
                      </Card>
                    )}

                    {/* Thẻ Ghi chú nội bộ */}
                    {sessionNote && (
                      <Card
                        size="small"
                        title="Ghi chú nội bộ"
                        className="!bg-white !border-slate-200/80 !rounded-xl"
                      >
                        <p className="text-[13.5px] text-slate-500 italic m-0 whitespace-pre-wrap">
                          "{sessionNote}"
                        </p>
                      </Card>
                    )}

                    {/* Lý do hủy (nếu có) */}
                    {session.status === 'CANCELLED' && session.cancelReason && (
                      <Card
                        size="small"
                        title={
                          <span className="text-red-600">Lý do hủy buổi</span>
                        }
                        className="!bg-red-50/40 !border-red-200/80 !rounded-xl"
                      >
                        <p className="text-[13.5px] text-red-700 m-0">
                          {session.cancelReason}
                        </p>
                      </Card>
                    )}
                  </div>
                ),
              },
              {
                key: 'staff',
                label: (
                  <span>
                    <UserSwitchOutlined /> Điều phối nhân sự
                  </span>
                ),
                children: (
                  <Card
                    size="small"
                    title="Phân công dạy thay & Trợ giảng"
                    className="!bg-white !border-slate-200/80 !rounded-xl"
                  >
                    <div className="flex flex-col gap-4">
                      <div>
                        <div className="text-xs font-semibold text-slate-500 mb-1.5">
                          Giảng viên dạy thay (Ghi đè GV chính trong buổi này)
                        </div>
                        <Select
                          className="w-full"
                          allowClear
                          showSearch
                          disabled={!canModify || assigning}
                          optionFilterProp="label"
                          placeholder="Chọn giảng viên dạy thay..."
                          value={session.substituteTeacherId}
                          options={instructorOptions.filter(
                            (opt) => opt.value !== session.teacherId,
                          )}
                          onChange={(val) =>
                            handleQuickAssign('substitute', val)
                          }
                        />
                      </div>

                      <div>
                        <div className="text-xs font-semibold text-slate-500 mb-1.5">
                          Trợ giảng hỗ trợ lớp
                        </div>
                        <Select
                          className="w-full"
                          allowClear
                          showSearch
                          disabled={!canModify || assigning}
                          optionFilterProp="label"
                          placeholder="Chọn trợ giảng..."
                          value={session.assistantId}
                          options={instructorOptions.filter(
                            (opt) => opt.value !== session.teacherId,
                          )}
                          onChange={(val) =>
                            handleQuickAssign('assistant', val)
                          }
                        />
                      </div>
                    </div>
                  </Card>
                ),
              },
              {
                key: 'timeline',
                label: (
                  <span>
                    <FileTextOutlined /> Tiến trình & Nhật ký
                  </span>
                ),
                children: (
                  <Card
                    size="small"
                    title="Lịch sử trạng thái buổi học"
                    className="!bg-white !border-slate-200/80 !rounded-xl"
                  >
                    <Timeline
                      className="!mt-2"
                      items={[
                        {
                          color: 'blue',
                          children: (
                            <div>
                              <div className="font-medium text-slate-800 text-[13px]">
                                Khởi tạo Buổi #{session.sessionNumber}
                              </div>
                              <div className="text-xs text-slate-400">
                                Lịch dự kiến:{' '}
                                <DateDisplay
                                  value={session.startTime}
                                  format="long"
                                />
                              </div>
                            </div>
                          ),
                        },
                        ...(session.substituteTeacherId
                          ? [
                              {
                                color: 'orange',
                                children: (
                                  <div className="text-[13px] text-slate-700">
                                    Điều chuyển giảng viên dạy thay:{' '}
                                    <strong>
                                      {session.effectiveTeacherName}
                                    </strong>
                                  </div>
                                ),
                              },
                            ]
                          : []),
                        {
                          color:
                            session.status === 'COMPLETED'
                              ? 'green'
                              : session.status === 'CANCELLED'
                                ? 'red'
                                : 'gray',
                          children: (
                            <div className="flex items-center gap-2">
                              <span className="text-[13px] text-slate-600">
                                Trạng thái hiện tại:
                              </span>
                              <StatusTag status={session.status} />
                            </div>
                          ),
                        },
                      ]}
                    />
                  </Card>
                ),
              },
            ]}
          />
        )
      )}
    </Drawer>
  );
};

export default SessionDrawer;