// src/components/course/CourseGeneralInfoTab.tsx
import { useCallback, useEffect, useState } from 'react';
import {
  Card,
  Typography,
  Space,
  Button,
  Tag,
  Popover,
  DatePicker,
  TimePicker,
  Checkbox,
  Spin,
  Divider,
  Image,
  Upload,
  Input,
} from 'antd';
import {
  EditOutlined,
  TeamOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
  UploadOutlined,
  DeleteOutlined,
  EyeOutlined,
  PictureOutlined,
  PlusOutlined,
  FileTextOutlined,
  LockOutlined,
} from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import toast from 'react-hot-toast';

import StatusTag from '@/components/common/StatusTag';
import MoneyDisplay from '@/components/common/MoneyDisplay';
import InlineDraftField from '@/components/common/InlineDraftField';
import { courseApi, categoryApi, roomApi } from '@/services/api/course';
import { fileApi, extractFileUrl } from '@/services/api/files';
import { adminUserApi } from '@/services/api/admin';
import { showError } from '@/utils/errorHelper';
import type {
  CourseDetailResponse,
  CourseUpdateRequest,
  CourseOfflineInfoRequest,
  CategoryResponse,
  RoomResponse,
} from '@/services/types/course';
import type { AccountResponse } from '@/services/types/user';

const { Paragraph } = Typography;

const DAY_LABELS = [
  { value: 1, label: 'T2' },
  { value: 2, label: 'T3' },
  { value: 3, label: 'T4' },
  { value: 4, label: 'T5' },
  { value: 5, label: 'T6' },
  { value: 6, label: 'T7' },
  { value: 7, label: 'CN' },
];

interface Props {
  course: CourseDetailResponse;
  onRefresh: () => void;
  readOnly?: boolean;
}

// ══════════════════════════════════════════════════════════
// SUB-COMPONENTS (TOP-LEVEL ĐỂ TRÁNH RE-MOUNT KHI RENDER)
// ══════════════════════════════════════════════════════════

const SectionHeading = ({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) => (
  <div className="flex items-center gap-2 mb-3.5 text-slate-800 font-semibold text-[14.5px]">
    <span className="text-blue-600 flex items-center">{icon}</span>
    <span>{title}</span>
  </div>
);

const FieldWrapper = ({
  label,
  children,
  disabled,
  className = '',
  contentClassName = '',
}: {
  label: string;
  children: React.ReactNode;
  disabled: boolean;
  className?: string;
  contentClassName?: string;
}) => (
  <div className={`flex flex-col w-full min-w-0 ${className}`}>
    <span
      className="text-[12px] font-semibold text-slate-500 mb-1.5 truncate"
      title={label}
    >
      {label}
    </span>
    <div
      className={`min-h-[40px] flex items-center rounded-lg border px-3 py-1.5 transition-all w-full min-w-0 ${
        disabled
          ? 'border-slate-200/75 bg-slate-50/70'
          : 'border-slate-200 bg-white hover:border-blue-400 hover:shadow-2xs'
      } ${contentClassName}`}
    >
      <div className="w-full min-w-0">{children}</div>
    </div>
  </div>
);

const DateInline = ({
  value,
  disabled,
  onSave,
}: {
  value?: string | null;
  disabled: boolean;
  onSave: (v: string) => Promise<void>;
}) => {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Dayjs | null>(
    value ? dayjs(value) : null,
  );

  useEffect(() => {
    if (open) setDraft(value ? dayjs(value) : null);
  }, [open, value]);

  if (disabled) {
    return value ? (
      <span className="truncate font-medium text-[13.5px] text-slate-700">
        {dayjs(value).format('DD/MM/YYYY')}
      </span>
    ) : (
      <span className="truncate text-slate-400 italic font-normal text-[13.5px]">
        Chưa cấu hình
      </span>
    );
  }

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      trigger="click"
      content={
        <Space direction="vertical" size={8}>
          <DatePicker
            value={draft}
            onChange={setDraft}
            format="DD/MM/YYYY"
            style={{ width: 200 }}
          />
          <Space>
            <Button
              size="small"
              type="primary"
              onClick={async () => {
                if (draft) {
                  await onSave(draft.format('YYYY-MM-DD'));
                  setOpen(false);
                }
              }}
            >
              Lưu
            </Button>
            <Button size="small" onClick={() => setOpen(false)}>
              Hủy
            </Button>
          </Space>
        </Space>
      }
    >
      <div className="w-full flex items-center justify-between text-[13.5px] gap-1 min-w-0 cursor-pointer group">
        {value ? (
          <span className="truncate font-medium text-slate-700">
            {dayjs(value).format('DD/MM/YYYY')}
          </span>
        ) : (
          <span className="truncate text-slate-400 italic font-normal">
            Chưa cấu hình
          </span>
        )}
        <EditOutlined className="text-slate-400 group-hover:text-blue-500 text-[12px] shrink-0 transition-colors" />
      </div>
    </Popover>
  );
};

const TimeInline = ({
  value,
  disabled,
  onSave,
}: {
  value?: string | null;
  disabled: boolean;
  onSave: (v: string) => Promise<void>;
}) => {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Dayjs | null>(
    value ? dayjs(value, ['HH:mm:ss', 'HH:mm']) : null,
  );

  useEffect(() => {
    if (open) setDraft(value ? dayjs(value, ['HH:mm:ss', 'HH:mm']) : null);
  }, [open, value]);

  if (disabled) {
    return value ? (
      <span className="truncate font-medium text-[13.5px] text-slate-700">
        {value.slice(0, 5)}
      </span>
    ) : (
      <span className="truncate text-slate-400 italic font-normal text-[13.5px]">
        Chưa cấu hình
      </span>
    );
  }

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      trigger="click"
      content={
        <Space direction="vertical" size={8}>
          <TimePicker
            value={draft}
            onChange={setDraft}
            format="HH:mm"
            minuteStep={5}
            style={{ width: 160 }}
          />
          <Space>
            <Button
              size="small"
              type="primary"
              onClick={async () => {
                if (draft) {
                  await onSave(draft.format('HH:mm:ss'));
                  setOpen(false);
                }
              }}
            >
              Lưu
            </Button>
            <Button size="small" onClick={() => setOpen(false)}>
              Hủy
            </Button>
          </Space>
        </Space>
      }
    >
      <div className="w-full flex items-center justify-between text-[13.5px] gap-1 min-w-0 cursor-pointer group">
        {value ? (
          <span className="truncate font-medium text-slate-700">
            {value.slice(0, 5)}
          </span>
        ) : (
          <span className="truncate text-slate-400 italic font-normal">
            Chưa cấu hình
          </span>
        )}
        <EditOutlined className="text-slate-400 group-hover:text-blue-500 text-[12px] shrink-0 transition-colors" />
      </div>
    </Popover>
  );
};

const ScheduleDaysInline = ({
  value,
  disabled,
  onSave,
}: {
  value?: number[];
  disabled: boolean;
  onSave: (v: number[]) => Promise<void>;
}) => {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<number[]>(value || []);

  useEffect(() => {
    if (open) setDraft(value || []);
  }, [open, value]);

  const renderTags = () => (
    <div className="flex flex-wrap gap-1.5 min-w-0">
      {value && value.length > 0 ? (
        [...value]
          .sort((a, b) => a - b)
          .map((d) => (
            <Tag
              key={d}
              color="blue"
              className="!m-0 !rounded-md !text-[12px] font-semibold"
            >
              {DAY_LABELS.find((x) => x.value === d)?.label || d}
            </Tag>
          ))
      ) : (
        <span className="text-slate-400 italic font-normal text-[13.5px]">
          Chưa cấu hình
        </span>
      )}
    </div>
  );

  if (disabled) return renderTags();

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      trigger="click"
      content={
        <div style={{ width: 220 }}>
          <Checkbox.Group
            value={draft}
            onChange={(v) => setDraft(v as number[])}
            style={{ width: '100%' }}
          >
            <div className="grid grid-cols-4 gap-2">
              {DAY_LABELS.map((d) => (
                <Checkbox key={d.value} value={d.value}>
                  {d.label}
                </Checkbox>
              ))}
            </div>
          </Checkbox.Group>
          <Space style={{ marginTop: 10 }}>
            <Button
              size="small"
              type="primary"
              onClick={async () => {
                if (draft.length > 0) {
                  await onSave([...draft].sort((a, b) => a - b));
                  setOpen(false);
                } else {
                  toast.error('Chọn ít nhất 1 ngày');
                }
              }}
            >
              Lưu
            </Button>
            <Button size="small" onClick={() => setOpen(false)}>
              Hủy
            </Button>
          </Space>
        </div>
      }
    >
      <div className="w-full flex items-center justify-between gap-1 min-w-0 cursor-pointer group">
        {renderTags()}
        <EditOutlined className="text-slate-400 group-hover:text-blue-500 text-[12px] shrink-0 transition-colors" />
      </div>
    </Popover>
  );
};

const OutcomesListEditor = ({
  value = [],
  onChange,
  disabled = false,
}: {
  value?: string[];
  onChange: (outcomes: string[]) => void;
  disabled?: boolean;
}) => {
  const [items, setItems] = useState<string[]>(value || []);

  useEffect(() => {
    setItems(value || []);
  }, [value]);

  const handleItemChange = (index: number, newVal: string) => {
    const updated = [...items];
    updated[index] = newVal;
    setItems(updated);
  };

  const handleCommit = () => {
    const cleaned = items.map((s) => s.trim()).filter(Boolean);
    if (JSON.stringify(cleaned) !== JSON.stringify(value || [])) {
      onChange(cleaned);
    }
  };

  return (
    <div className="flex flex-col gap-2 w-full min-w-0">
      {items.length === 0 && disabled && (
        <span className="text-slate-400 italic font-normal text-[13.5px] py-1">
          Chưa cấu hình kết quả đầu ra
        </span>
      )}
      {items.map((item, index) => (
        <div
          key={index}
          className="flex items-center gap-2 w-full min-w-0 rounded-lg bg-white border border-slate-200/80 px-2.5 py-1 hover:border-blue-300 transition-colors"
        >
          <CheckCircleOutlined className="text-emerald-500 shrink-0 text-[14px]" />
          <Input
            variant="borderless"
            value={item}
            disabled={disabled}
            placeholder={`Kết quả đầu ra #${index + 1}...`}
            onChange={(e) => handleItemChange(index, e.target.value)}
            onBlur={handleCommit}
            onPressEnter={(e) => (e.target as HTMLInputElement).blur()}
            className="flex-1 !px-1 text-[13.5px] font-medium text-slate-700"
          />
          {!disabled && (
            <Button
              type="text"
              danger
              size="small"
              icon={<DeleteOutlined />}
              onClick={() => {
                const updated = items.filter((_, i) => i !== index);
                setItems(updated);
                onChange(updated.map((s) => s.trim()).filter(Boolean));
              }}
              className="shrink-0 opacity-65 hover:opacity-100"
            />
          )}
        </div>
      ))}
      {!disabled && (
        <Button
          type="dashed"
          block
          icon={<PlusOutlined />}
          onClick={() => setItems([...items, ''])}
          className="mt-1 !h-9 !text-[13px] font-medium !text-slate-600 hover:!text-blue-600 hover:!border-blue-400 !rounded-lg !bg-white/70"
        >
          Thêm kết quả đầu ra
        </Button>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════
const CourseGeneralInfoTab = ({
  course,
  onRefresh,
  readOnly = false,
}: Props) => {
  const [savingField, setSavingField] = useState<string | null>(null);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [instructors, setInstructors] = useState<AccountResponse[]>([]);
  const [rooms, setRooms] = useState<RoomResponse[]>([]);
  const [previewVisible, setPreviewVisible] = useState(false);

  const isOffline = course.courseType === 'OFFLINE';
  const isLocked = Boolean(
    readOnly ||
      ['ONGOING', 'FINISHED', 'CANCELLED', 'ARCHIVED'].includes(course.status),
  );

  useEffect(() => {
    categoryApi
      .list({ page: 0, size: 9999, sortBy: 'name', sortDir: 'asc' })
      .then((res) => setCategories(res.content || []))
      .catch(() => {});

    if (isOffline) {
      adminUserApi
        .search({
          roleCode: 'INSTRUCTOR',
          isActive: true,
          page: 0,
          size: 200,
        })
        .then((res) => setInstructors(res.content || []))
        .catch(() => {});

      roomApi
        .listActive()
        .then((res) => setRooms(res))
        .catch(() => {});
    }
  }, [isOffline]);

  const saveField = useCallback(
    async (field: string, value: unknown, isOfflineField = false) => {
      if (savingField) return;
      setSavingField(field);
      try {
        if (isOfflineField) {
          await courseApi.updateOfflineInfo(course.id, {
            [field]: value,
          } as Partial<CourseOfflineInfoRequest>);
        } else {
          await courseApi.update(course.id, {
            [field]: value,
          } as Partial<CourseUpdateRequest>);
        }
        toast.success('Đã cập nhật');
        onRefresh();
      } catch (err) {
        showError(err, 'Cập nhật thất bại');
        throw err;
      } finally {
        setSavingField(null);
      }
    },
    [course.id, savingField, onRefresh],
  );

  const handleThumbnailUpload = async (file: File) => {
    if (isLocked) return false;
    setUploadingThumbnail(true);
    try {
      const uploadRes = await fileApi.upload(file);
      const fileUrl = extractFileUrl(uploadRes);
      if (!fileUrl) {
        throw new Error('Không lấy được đường dẫn ảnh sau khi tải lên');
      }
      await saveField('thumbnailUrl', fileUrl);
    } catch (err) {
      showError(err, 'Tải ảnh thumbnail thất bại');
    } finally {
      setUploadingThumbnail(false);
    }
    return false;
  };

  return (
    <Card
      className="!rounded-xl border-slate-200/90 shadow-none"
      styles={{ body: { padding: '20px 24px' } }}
      title={
        <span className="font-bold text-slate-800 flex items-center gap-2 text-[15px]">
          <InfoCircleOutlined className="text-blue-600" />
          Thông tin chi tiết khóa học
        </span>
      }
      extra={
        <Space size={10}>
          {savingField && (
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
              <Spin size="small" /> Đang lưu...
            </span>
          )}
          {isLocked && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[12px] font-medium text-slate-500">
              <LockOutlined className="text-[11px]" />
              Khóa chỉnh sửa
            </span>
          )}
        </Space>
      }
    >
      {/* ═══════════ PHẦN 1: THÔNG TIN CỐT LÕI ═══════════ */}
      <div className="flex flex-col md:flex-row gap-5 md:gap-6">
        {/* Cột Ảnh Thumbnail */}
        <div className="w-full md:w-[260px] lg:w-[280px] shrink-0 flex flex-col">
          <span className="text-[12px] font-semibold text-slate-500 mb-1.5">
            Ảnh Thumbnail
          </span>
          <div className="w-full aspect-video rounded-lg overflow-hidden border border-slate-200 bg-slate-50 relative group flex items-center justify-center">
            {course.thumbnailUrl ? (
              <>
                <img
                  src={course.thumbnailUrl}
                  alt="bg"
                  className="absolute inset-0 w-full h-full object-cover blur-sm opacity-25 pointer-events-none"
                />
                <img
                  src={course.thumbnailUrl}
                  alt="Thumbnail"
                  className="absolute inset-0 w-full h-full object-contain p-1 z-10"
                />
                <div className="absolute inset-0 z-20 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[1px]">
                  <Button
                    type="primary"
                    shape="circle"
                    size="small"
                    icon={<EyeOutlined />}
                    onClick={() => setPreviewVisible(true)}
                  />
                </div>
                <div className="hidden">
                  <Image
                    preview={{
                      visible: previewVisible,
                      onVisibleChange: (vis) => setPreviewVisible(vis),
                    }}
                    src={course.thumbnailUrl}
                  />
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center p-3 text-center">
                <PictureOutlined className="text-2xl mb-1 text-slate-300" />
                <span className="text-[12.5px] italic text-slate-400">
                  Chưa có ảnh
                </span>
              </div>
            )}
          </div>

          {!isLocked && (
            <div className="flex items-center justify-between gap-2 mt-2">
              <Upload
                showUploadList={false}
                accept="image/*"
                beforeUpload={handleThumbnailUpload}
              >
                <Button
                  size="small"
                  icon={<UploadOutlined />}
                  loading={uploadingThumbnail}
                  className="!text-[12.5px] !font-medium !rounded-md"
                >
                  {course.thumbnailUrl ? 'Đổi ảnh' : 'Tải ảnh lên'}
                </Button>
              </Upload>
              {course.thumbnailUrl && (
                <Button
                  size="small"
                  danger
                  type="text"
                  icon={<DeleteOutlined />}
                  disabled={uploadingThumbnail}
                  onClick={() => void saveField('thumbnailUrl', null)}
                  className="!text-[12.5px] !font-medium !rounded-md"
                >
                  Xóa
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Cột Thông tin cơ bản */}
        <div className="flex-1 flex flex-col gap-3.5 min-w-0">
          <FieldWrapper label="Tiêu đề khóa học" disabled={isLocked}>
            <InlineDraftField
              value={course.title}
              onCommit={(v) => saveField('title', v)}
              disabled={isLocked || !!savingField}
              required
              formatDisplay={(v) =>
                v ? (
                  <span className="text-[15.5px] sm:text-[16.5px] font-bold text-slate-900 break-words whitespace-pre-wrap">
                    {v as string}
                  </span>
                ) : (
                  <span className="text-[15px] font-normal italic text-slate-400">
                    Chưa có tiêu đề
                  </span>
                )
              }
            />
          </FieldWrapper>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            <FieldWrapper label="Trạng thái & Hình thức" disabled>
              <Space size={6} wrap>
                <StatusTag status={course.status} />
                <StatusTag status={course.courseType} />
              </Space>
            </FieldWrapper>

            <FieldWrapper label="Danh mục" disabled={isLocked}>
              <InlineDraftField
                type="select"
                value={course.categoryId}
                options={categories.map((c) => ({
                  label: c.name,
                  value: c.id,
                }))}
                onCommit={(v) => saveField('categoryId', v)}
                disabled={isLocked || !!savingField}
                allowClear
                formatDisplay={(v) => {
                  const name =
                    categories.find((c) => c.id === v)?.name ||
                    course.categoryName;
                  return name ? (
                    <span className="truncate block text-[13.5px] font-medium text-slate-700">
                      {name}
                    </span>
                  ) : (
                    <span className="truncate block text-[13.5px] italic font-normal text-slate-400">
                      Chưa gán
                    </span>
                  );
                }}
              />
            </FieldWrapper>

            <FieldWrapper
              label={course.isFree ? 'Học phí' : 'Học phí & Giá gốc'}
              disabled={isLocked}
              contentClassName="!px-2.5"
            >
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 w-full min-w-0">
                <div className="shrink-0">
                  <InlineDraftField
                    type="switch"
                    value={course.isFree}
                    onCommit={(v) => saveField('isFree', v)}
                    disabled={isLocked || !!savingField}
                    formatDisplay={(v) =>
                      v ? (
                        <Tag
                          color="green"
                          className="!m-0 !text-[11.5px] font-semibold"
                        >
                          Miễn phí
                        </Tag>
                      ) : (
                        <Tag className="!m-0 !text-[11.5px] font-semibold">
                          Thu phí
                        </Tag>
                      )
                    }
                  />
                </div>

                {!course.isFree && (
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 min-w-0">
                    <div className="flex items-center shrink-0">
                      <span className="text-[11.5px] font-medium text-slate-400 mr-1">
                        Bán:
                      </span>
                      <InlineDraftField
                        type="number"
                        value={course.price}
                        onCommit={(v) => saveField('price', v)}
                        disabled={isLocked || !!savingField}
                        formatDisplay={(v) =>
                          v !== null && v !== undefined ? (
                            <span className="text-blue-600 font-bold text-[14px] whitespace-nowrap">
                              <MoneyDisplay value={v as number} strong />
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-[13.5px]">
                              —
                            </span>
                          )
                        }
                        min={0}
                      />
                    </div>

                    <div className="flex items-center shrink-0">
                      <span className="text-[11.5px] font-medium text-slate-400 mr-1">
                        Gốc:
                      </span>
                      <InlineDraftField
                        type="number"
                        value={course.oldPrice}
                        onCommit={(v) => saveField('oldPrice', v)}
                        disabled={isLocked || !!savingField}
                        formatDisplay={(v) =>
                          v !== null && v !== undefined ? (
                            <span className="line-through text-slate-400 text-[12.5px] whitespace-nowrap">
                              <MoneyDisplay
                                value={v as number}
                                showFree={false}
                              />
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-[13.5px]">
                              —
                            </span>
                          )
                        }
                        min={0}
                      />
                    </div>
                  </div>
                )}
              </div>
            </FieldWrapper>
          </div>
        </div>
      </div>

      {/* ═══════════ PHẦN 2: CẤU HÌNH OFFLINE ═══════════ */}
      {isOffline && (
        <>
          <Divider className="!my-5 border-slate-200/80" />
          <SectionHeading
            icon={<TeamOutlined />}
            title="Cấu hình vận hành lớp học (Offline)"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <FieldWrapper label="Sĩ số tối thiểu" disabled={isLocked}>
              <InlineDraftField
                type="number"
                value={course.minStudents}
                min={1}
                onCommit={(v) => saveField('minStudents', v, true)}
                disabled={isLocked || !!savingField}
                formatDisplay={(v) =>
                  v ? (
                    <span className="text-[13.5px] font-medium text-slate-700">
                      {v as number} học viên
                    </span>
                  ) : (
                    <span className="text-[13.5px] italic text-slate-400">
                      Chưa cấu hình
                    </span>
                  )
                }
              />
            </FieldWrapper>

            <FieldWrapper label="Sĩ số tối đa" disabled={isLocked}>
              <InlineDraftField
                type="number"
                value={course.maxStudents}
                min={1}
                onCommit={(v) => saveField('maxStudents', v, true)}
                disabled={isLocked || !!savingField}
                formatDisplay={(v) =>
                  v ? (
                    <span className="text-[13.5px] font-medium text-slate-700">
                      {v as number} học viên
                    </span>
                  ) : (
                    <span className="text-[13.5px] italic text-slate-400">
                      Chưa cấu hình
                    </span>
                  )
                }
              />
            </FieldWrapper>

            <FieldWrapper label="Giảng viên chính" disabled={isLocked}>
              <InlineDraftField
                type="select"
                value={course.teacherId}
                options={instructors.map((a) => ({
                  value: a.accountId,
                  label: a.fullName || a.email,
                }))}
                onCommit={(v) => saveField('teacherId', v, true)}
                disabled={isLocked || !!savingField}
                allowClear
                formatDisplay={() =>
                  course.teacherName ? (
                    <span className="truncate block text-[13.5px] font-medium text-slate-700">
                      {course.teacherName}
                    </span>
                  ) : (
                    <span className="truncate block text-[13.5px] italic text-slate-400">
                      Chưa phân công
                    </span>
                  )
                }
              />
            </FieldWrapper>

            <FieldWrapper label="Phòng học" disabled={isLocked}>
              <InlineDraftField
                type="select"
                value={course.roomId}
                options={rooms.map((r) => ({ value: r.id, label: r.name }))}
                onCommit={(v) => saveField('roomId', v, true)}
                disabled={isLocked || !!savingField}
                allowClear
                formatDisplay={() =>
                  course.roomName ? (
                    <span className="truncate block text-[13.5px] font-medium text-slate-700">
                      {course.roomName}
                    </span>
                  ) : (
                    <span className="truncate block text-[13.5px] italic text-slate-400">
                      Chưa xếp phòng
                    </span>
                  )
                }
              />
            </FieldWrapper>

            <FieldWrapper label="Ngày bắt đầu" disabled={isLocked}>
              <DateInline
                value={course.startDate}
                disabled={isLocked}
                onSave={(v) => saveField('startDate', v, true)}
              />
            </FieldWrapper>

            <FieldWrapper label="Ngày kết thúc" disabled={isLocked}>
              <DateInline
                value={course.endDate}
                disabled={isLocked}
                onSave={(v) => saveField('endDate', v, true)}
              />
            </FieldWrapper>

            <FieldWrapper label="Giờ bắt đầu" disabled={isLocked}>
              <TimeInline
                value={course.sessionStartTime}
                disabled={isLocked}
                onSave={(v) => saveField('sessionStartTime', v, true)}
              />
            </FieldWrapper>

            <FieldWrapper label="Giờ kết thúc" disabled={isLocked}>
              <TimeInline
                value={course.sessionEndTime}
                disabled={isLocked}
                onSave={(v) => saveField('sessionEndTime', v, true)}
              />
            </FieldWrapper>

            <FieldWrapper
              label="Lịch học trong tuần"
              disabled={isLocked}
              className="sm:col-span-2 lg:col-span-3"
            >
              <ScheduleDaysInline
                value={course.scheduleDays}
                disabled={isLocked}
                onSave={(v) => saveField('scheduleDays', v, true)}
              />
            </FieldWrapper>

            <FieldWrapper
              label="Tổng số buổi dự kiến"
              disabled={isLocked}
              className="sm:col-span-2 lg:col-span-1"
            >
              <InlineDraftField
                type="number"
                value={course.totalSessionsExpected}
                min={0}
                onCommit={(v) => saveField('totalSessionsExpected', v)}
                disabled={isLocked || !!savingField}
                formatDisplay={(v) =>
                  v !== undefined && v !== null ? (
                    <span className="text-[13.5px] font-medium text-slate-700">
                      {v as number} buổi
                    </span>
                  ) : (
                    <span className="text-[13.5px] italic text-slate-400">
                      Chưa cấu hình
                    </span>
                  )
                }
              />
            </FieldWrapper>
          </div>
        </>
      )}

      {/* ═══════════ PHẦN 3: MÔ TẢ & KẾT QUẢ ═══════════ */}
      <Divider className="!my-5 border-slate-200/80" />
      <SectionHeading
        icon={<FileTextOutlined />}
        title="Nội dung mô tả & Kết quả đầu ra"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="flex flex-col gap-3.5">
          <FieldWrapper label="Mô tả ngắn" disabled={isLocked}>
            <InlineDraftField
              type="textarea"
              rows={2}
              value={course.shortDescription}
              onCommit={(v) => saveField('shortDescription', v)}
              disabled={isLocked || !!savingField}
              formatDisplay={(v) =>
                v ? (
                  <span className="text-[13.5px] text-slate-700 font-medium break-words whitespace-pre-wrap">
                    {v as string}
                  </span>
                ) : (
                  <span className="text-[13.5px] italic text-slate-400">
                    Chưa có mô tả ngắn
                  </span>
                )
              }
            />
          </FieldWrapper>

          <FieldWrapper
            label="Mô tả đầy đủ"
            disabled={isLocked}
            className="flex-1"
            contentClassName="!items-start h-full py-2.5"
          >
            <InlineDraftField
              type="textarea"
              rows={6}
              value={course.description}
              onCommit={(v) => saveField('description', v)}
              disabled={isLocked || !!savingField}
              formatDisplay={(v) =>
                v ? (
                  <Paragraph className="!text-[13.5px] text-slate-700 font-medium whitespace-pre-wrap !mb-0 leading-relaxed break-words w-full">
                    {v as string}
                  </Paragraph>
                ) : (
                  <Paragraph className="!text-[13.5px] italic text-slate-400 whitespace-pre-wrap !mb-0 leading-relaxed break-words w-full">
                    Chưa có mô tả đầy đủ
                  </Paragraph>
                )
              }
            />
          </FieldWrapper>
        </div>

        <FieldWrapper
          label="Kết quả đầu ra"
          disabled={isLocked}
          className="h-full"
          contentClassName="!items-start h-full p-2.5 bg-slate-50/40"
        >
          <OutcomesListEditor
            value={course.outcomes}
            onChange={(newOutcomes) => saveField('outcomes', newOutcomes)}
            disabled={isLocked || !!savingField}
          />
        </FieldWrapper>
      </div>
    </Card>
  );
};

export default CourseGeneralInfoTab;