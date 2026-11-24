// src/components/course/SessionFormModal.tsx
import { useEffect, useMemo, useState } from 'react';
import { Modal, Form, Input, DatePicker, TimePicker, Select, Space, Alert, Tag } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import toast from 'react-hot-toast';

import { sessionApi, roomApi } from '@/services/api/course';
import { adminUserApi } from '@/services/api/admin';
import { SCHEDULE_TEMPLATES, type ScheduleTemplateCode } from '@/constants/schedule-templates';
import type {
  CourseDetailResponse,
  SessionCreateRequest,
  SessionResponse,
  RoomResponse,
} from '@/services/types/course';
import type { AccountResponse } from '@/services/types/user';

interface Props {
  courseId: number;
  course?: CourseDetailResponse;
  initialData?: SessionResponse | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type ShiftSelection = ScheduleTemplateCode | 'CUSTOM';

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
const toVnDayOfWeek = (date: Dayjs): number => (date.day() === 0 ? 8 : date.day() + 1);

/** Tìm mã ca khớp với khung giờ HH:mm */
const findShiftByTime = (startHHmm: string, endHHmm: string): ScheduleTemplateCode | undefined => {
  const entries = Object.entries(SCHEDULE_TEMPLATES) as [
    ScheduleTemplateCode,
    (typeof SCHEDULE_TEMPLATES)[ScheduleTemplateCode],
  ][];
  const match = entries.find(([, tpl]) => tpl.start === startHHmm && tpl.end === endHHmm);
  return match?.[0];
};

/** Tìm mã ca khớp với cấu hình mặc định của khóa học (nếu có) */
const detectDefaultShiftFromCourse = (course?: CourseDetailResponse): ScheduleTemplateCode | undefined => {
  if (!course?.sessionStartTime || !course?.sessionEndTime) return undefined;
  const startHHmm = course.sessionStartTime.slice(0, 5);
  const endHHmm = course.sessionEndTime.slice(0, 5);

  const entries = Object.entries(SCHEDULE_TEMPLATES) as [
    ScheduleTemplateCode,
    (typeof SCHEDULE_TEMPLATES)[ScheduleTemplateCode],
  ][];

  // Ưu tiên khớp cả giờ và thứ trong tuần
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

  // Fallback: khớp khung giờ bắt đầu - kết thúc
  return findShiftByTime(startHHmm, endHHmm);
};

const SessionFormModal = ({
  courseId,
  course,
  initialData,
  open,
  onClose,
  onSuccess,
}: Props) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [instructors, setInstructors] = useState<AccountResponse[]>([]);
  const [rooms, setRooms] = useState<RoomResponse[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  const isEdit = Boolean(initialData);

  const selectedShift = Form.useWatch('shiftCode', form) as ShiftSelection | undefined;
  const selectedDate = Form.useWatch('sessionDate', form) as Dayjs | undefined;
  const selectedTeacherId = Form.useWatch('teacherId', form) as number | undefined;

  useEffect(() => {
    if (!open) return;
    setLoadingOptions(true);
    Promise.all([
      adminUserApi.search({ roleCode: 'INSTRUCTOR', isActive: true, page: 0, size: 200 }),
      roomApi.listActive(),
    ])
      .then(([userRes, roomRes]) => {
        setInstructors(userRes.content || []);
        setRooms(roomRes || []);
      })
      .catch(() => toast.error('Không tải được danh sách giảng viên hoặc phòng học'))
      .finally(() => setLoadingOptions(false));
  }, [open]);

  // Reset và điền dữ liệu từ initialData (khi sửa) hoặc cấu hình mặc định của khóa học (khi tạo mới)
  useEffect(() => {
    if (!open) return;
    form.resetFields();

    if (initialData) {
      const sessionWithNested = initialData as SessionResponse & {
        teacher?: { id?: number };
        substituteTeacher?: { id?: number };
        assistant?: { id?: number };
        room?: { id?: number };
        note?: string;
      };

      const startDayjs = initialData.startTime ? dayjs(initialData.startTime) : undefined;
      const endDayjs = initialData.endTime ? dayjs(initialData.endTime) : undefined;
      const matchedShift =
        startDayjs?.isValid() && endDayjs?.isValid()
          ? findShiftByTime(startDayjs.format('HH:mm'), endDayjs.format('HH:mm'))
          : undefined;

      form.setFieldsValue({
        title: initialData.title,
        description: initialData.description,
        sessionDate: startDayjs?.isValid() ? startDayjs : undefined,
        shiftCode: matchedShift ?? 'CUSTOM',
        startTime: startDayjs?.isValid() ? startDayjs : undefined,
        endTime: endDayjs?.isValid() ? endDayjs : undefined,
        teacherId: initialData.teacherId ?? sessionWithNested.teacher?.id,
        substituteTeacherId:
          initialData.substituteTeacherId ?? sessionWithNested.substituteTeacher?.id,
        assistantId: initialData.assistantId ?? sessionWithNested.assistant?.id,
        roomId: initialData.roomId ?? sessionWithNested.room?.id,
        note: sessionWithNested.note,
      });
      return;
    }

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
  }, [open, initialData, course, form]);

  // Danh sách option ca học từ SCHEDULE_TEMPLATES
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
          <Tag color="blue" style={{ marginInlineEnd: 0 }}>
            {tpl.start} - {tpl.end}
          </Tag>
          <span style={{ fontSize: 12, color: '#8c8c8c' }}>({formatTemplateDays(tpl.days)})</span>
        </Space>
      ),
      searchText: `${code} ${tpl.label} ${tpl.start} ${tpl.end} ${formatTemplateDays(tpl.days)}`,
    }));

    return [
      ...templateOpts,
      {
        value: 'CUSTOM' as const,
        label: <span style={{ color: '#595959' }}>Tùy chỉnh khung giờ khác...</span>,
        searchText: 'tuy chinh khung gio khac custom',
      },
    ];
  }, []);

  // Kiểm tra ngày được chọn có khớp thứ trong tuần của ca mẫu hay không
  const dayMismatchWarning = useMemo(() => {
    if (!selectedDate || !selectedShift || selectedShift === 'CUSTOM') return null;
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

      if (initialData) {
        await sessionApi.update(courseId, initialData.id, payload);
        toast.success('Cập nhật buổi học thành công');
      } else {
        await sessionApi.create(courseId, payload);
        toast.success('Tạo buổi học thành công');
      }

      form.resetFields();
      onSuccess();
      onClose();
    } catch (err) {
      if ((err as { errorFields?: unknown }).errorFields) return;
      toast.error(
        (err as { message?: string })?.message ||
          (initialData ? 'Cập nhật buổi học thất bại' : 'Tạo buổi học thất bại'),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const isCustomShift = selectedShift === 'CUSTOM';

  return (
    <Modal
      title={
        isEdit
          ? `Chỉnh sửa buổi học${initialData?.sessionNumber ? ` #${initialData.sessionNumber}` : ''}`
          : 'Tạo buổi học mới'
      }
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={submitting}
      okText={isEdit ? 'Lưu thay đổi' : 'Tạo buổi học'}
      cancelText="Hủy"
      width={620}
      destroyOnClose
    >
      <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
        <Form.Item
          name="title"
          label="Tiêu đề buổi học"
          rules={[{ required: true, message: 'Vui lòng nhập tiêu đề' }]}
        >
          <Input placeholder="VD: Buổi 1 - Giới thiệu & Placement test" maxLength={255} />
        </Form.Item>

        <Form.Item name="description" label="Mô tả">
          <Input.TextArea rows={2} placeholder="Nội dung buổi học..." />
        </Form.Item>

        <Space size={12} style={{ display: 'flex' }}>
          <Form.Item
            name="sessionDate"
            label="Ngày học"
            rules={[{ required: true, message: 'Vui lòng chọn ngày học' }]}
            style={{ width: 190 }}
          >
            <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} placeholder="Chọn ngày" />
          </Form.Item>

          <Form.Item
            name="shiftCode"
            label="Ca học"
            rules={[{ required: true, message: 'Vui lòng chọn ca học' }]}
            style={{ flex: 1 }}
          >
            <Select
              placeholder="Chọn ca học theo lịch"
              showSearch
              optionFilterProp="searchText"
              options={shiftOptions}
              onChange={handleShiftChange}
            />
          </Form.Item>
        </Space>

        <Space size={12} style={{ display: 'flex' }}>
          <Form.Item
            name="startTime"
            label="Giờ bắt đầu"
            rules={[{ required: true, message: 'Vui lòng chọn giờ bắt đầu' }]}
            style={{ flex: 1 }}
          >
            <TimePicker
              format="HH:mm"
              minuteStep={5}
              disabled={!isCustomShift}
              style={{ width: '100%' }}
              placeholder="HH:mm"
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
                  if (!value || !start || value.isAfter(start)) return Promise.resolve();
                  return Promise.reject(new Error('Giờ kết thúc phải sau giờ bắt đầu'));
                },
              }),
            ]}
            style={{ flex: 1 }}
          >
            <TimePicker
              format="HH:mm"
              minuteStep={5}
              disabled={!isCustomShift}
              style={{ width: '100%' }}
              placeholder="HH:mm"
            />
          </Form.Item>
        </Space>

        {dayMismatchWarning && (
          <Alert
            type="warning"
            showIcon
            message={dayMismatchWarning}
            style={{ marginBottom: 16 }}
          />
        )}

        <Form.Item name="teacherId" label="Giảng viên chính">
          <Select
            placeholder="Chọn giảng viên"
            allowClear
            showSearch
            optionFilterProp="label"
            loading={loadingOptions}
            options={instructorOptions}
            onChange={handleTeacherChange}
          />
        </Form.Item>

        <Space size={12} style={{ display: 'flex' }}>
          <Form.Item name="substituteTeacherId" label="Giảng viên dạy thay" style={{ flex: 1 }}>
            <Select
              placeholder="Chọn"
              allowClear
              showSearch
              optionFilterProp="label"
              loading={loadingOptions}
              options={secondaryInstructorOptions}
            />
          </Form.Item>

          <Form.Item name="assistantId" label="Trợ giảng" style={{ flex: 1 }}>
            <Select
              placeholder="Chọn"
              allowClear
              showSearch
              optionFilterProp="label"
              loading={loadingOptions}
              options={secondaryInstructorOptions}
            />
          </Form.Item>
        </Space>

        <Form.Item name="roomId" label="Phòng học">
          <Select
            placeholder="Chọn phòng"
            allowClear
            showSearch
            optionFilterProp="label"
            loading={loadingOptions}
            options={rooms.map((r) => ({ value: r.id, label: r.name }))}
          />
        </Form.Item>

        <Form.Item name="note" label="Ghi chú">
          <Input.TextArea rows={2} placeholder="Ghi chú nội bộ..." />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default SessionFormModal;