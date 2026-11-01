import { useCallback, useEffect, useState } from 'react';
import {
  Card, Typography, Space, Button, Tag,
  Popover, DatePicker, TimePicker, Checkbox, Spin, Divider,
  Image, Upload, Input,
} from 'antd';
import {
  EditOutlined, TeamOutlined, InfoCircleOutlined, CheckCircleOutlined,
  UploadOutlined, DeleteOutlined, EyeOutlined, PictureOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import toast from 'react-hot-toast';

import StatusTag from '@/components/common/StatusTag';
import MoneyDisplay from '@/components/common/MoneyDisplay';
import InlineDraftField from '@/components/common/InlineDraftField';
import { courseApi, categoryApi, roomApi } from '@/services/api/course';
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
  { value: 1, label: 'T2' }, { value: 2, label: 'T3' }, { value: 3, label: 'T4' },
  { value: 4, label: 'T5' }, { value: 5, label: 'T6' }, { value: 6, label: 'T7' }, { value: 7, label: 'CN' },
];

interface Props {
  course: CourseDetailResponse;
  onRefresh: () => void;
}

// ══════════════════════════════════════════════════════════
// FieldWrapper
// ══════════════════════════════════════════════════════════
const FieldWrapper = ({ 
  label, children, disabled, className = '', contentClassName = '',
}: { 
  label: string; children: React.ReactNode; disabled: boolean; className?: string; contentClassName?: string;
}) => (
  <div className={`flex flex-col w-full min-w-0 ${className}`}>
    <span className="text-[13px] font-semibold text-slate-600 mb-1.5 truncate" title={label}>
      {label}
    </span>
    <div className={`min-h-[42px] flex items-center rounded-lg border px-3 py-1.5 transition-all w-full min-w-0 ${
      disabled ? 'border-slate-100 bg-slate-50' : 'border-slate-200 bg-white hover:border-blue-400 hover:shadow-sm'
    } ${contentClassName}`}>
      <div className="w-full min-w-0 overflow-hidden">{children}</div>
    </div>
  </div>
);

// ══════════════════════════════════════════════════════════
// OutcomesListEditor
// ══════════════════════════════════════════════════════════
const OutcomesListEditor = ({ value = [], onChange, disabled = false }: { value?: string[]; onChange: (outcomes: string[]) => void; disabled?: boolean }) => {
  const [items, setItems] = useState<string[]>(value || []);

  useEffect(() => { setItems(value || []); }, [value]);

  const handleItemChange = (index: number, newVal: string) => {
    const updated = [...items];
    updated[index] = newVal;
    setItems(updated);
  };

  const handleCommit = () => {
    const cleaned = items.map((s) => s.trim()).filter(Boolean);
    if (JSON.stringify(cleaned) !== JSON.stringify(value || [])) onChange(cleaned);
  };

  return (
    <div className="flex flex-col gap-2 w-full min-w-0 py-1">
      {items.length === 0 && disabled && (
        <span className="text-slate-400 italic font-normal text-[14px]">Chưa cấu hình kết quả đầu ra</span>
      )}
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2 w-full min-w-0">
          <CheckCircleOutlined className="text-emerald-500 shrink-0 text-[15px]" />
          <Input
            value={item} disabled={disabled} placeholder={`Kết quả #${index + 1}...`}
            onChange={(e) => handleItemChange(index, e.target.value)}
            onBlur={handleCommit} onPressEnter={(e) => (e.target as HTMLInputElement).blur()}
            className="flex-1 text-[14px] font-medium rounded-md border-slate-200 hover:border-blue-400 focus:border-blue-500"
          />
          {!disabled && (
            <Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={() => {
              const updated = items.filter((_, i) => i !== index);
              setItems(updated); onChange(updated.map((s) => s.trim()).filter(Boolean));
            }} className="shrink-0 hover:bg-red-50" />
          )}
        </div>
      ))}
      {!disabled && (
        <Button type="dashed" block icon={<PlusOutlined />} onClick={() => setItems([...items, ''])} className="mt-1 !text-[13.5px] font-semibold !text-slate-600 hover:!text-blue-600 hover:!border-blue-400 !rounded-lg">
          Thêm kết quả đầu ra
        </Button>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════
const CourseGeneralInfoTab = ({ course, onRefresh }: Props) => {
  const [savingField, setSavingField] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [instructors, setInstructors] = useState<AccountResponse[]>([]);
  const [rooms, setRooms] = useState<RoomResponse[]>([]);
  const [previewVisible, setPreviewVisible] = useState(false);

  const isOffline = course.courseType === 'OFFLINE';
  const isLocked = ['ONGOING', 'FINISHED', 'CANCELLED'].includes(course.status);

  useEffect(() => {
    categoryApi.list({ page: 0, size: 9999, sortBy: 'name', sortDir: 'asc' }).then((res) => setCategories(res.content || [])).catch(() => {});
    if (isOffline) {
      adminUserApi.search({ roleCode: 'INSTRUCTOR', isActive: true, page: 0, size: 200 }).then((res) => setInstructors(res.content || [])).catch(() => {});
      roomApi.listActive().then((res) => setRooms(res)).catch(() => {});
    }
  }, [isOffline]);

  const saveField = useCallback(async (field: string, value: unknown, isOfflineField = false) => {
    if (savingField) return;
    setSavingField(field);
    try {
      if (isOfflineField) await courseApi.updateOfflineInfo(course.id, { [field]: value } as Partial<CourseOfflineInfoRequest>);
      else await courseApi.update(course.id, { [field]: value } as Partial<CourseUpdateRequest>);
      toast.success('Đã cập nhật');
      onRefresh();
    } catch (err) {
      showError(err, 'Cập nhật thất bại'); throw err;
    } finally { setSavingField(null); }
  }, [course.id, savingField, onRefresh]);

  const DateInline = ({ value, onSave }: { value?: string | null; onSave: (v: string) => Promise<void> }) => {
    const [open, setOpen] = useState(false);
    const [draft, setDraft] = useState<Dayjs | null>(value ? dayjs(value) : null);
    return (
      <Popover open={open} onOpenChange={setOpen} trigger="click" content={
        <Space direction="vertical" size={8}>
          <DatePicker value={draft} onChange={setDraft} format="DD/MM/YYYY" style={{ width: 200 }} />
          <Space><Button size="small" type="primary" onClick={async () => { if (draft) { await onSave(draft.format('YYYY-MM-DD')); setOpen(false); } }}>Lưu</Button><Button size="small" onClick={() => setOpen(false)}>Hủy</Button></Space>
        </Space>
      }>
        <div className={`w-full flex items-center justify-between text-[14px] gap-1 min-w-0 ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
          {value ? (
            <span className="truncate font-medium text-slate-700">{dayjs(value).format('DD/MM/YYYY')}</span>
          ) : (
            <span className="truncate text-slate-400 italic font-normal">Chưa cấu hình</span>
          )}
          {!isLocked && <EditOutlined className="text-slate-400 text-[13px] shrink-0" />}
        </div>
      </Popover>
    );
  };

  const TimeInline = ({ value, onSave }: { value?: string | null; onSave: (v: string) => Promise<void> }) => {
    const [open, setOpen] = useState(false);
    const [draft, setDraft] = useState<Dayjs | null>(value ? dayjs(value, 'HH:mm:ss') : null);
    return (
      <Popover open={open} onOpenChange={setOpen} trigger="click" content={
        <Space direction="vertical" size={8}>
          <TimePicker value={draft} onChange={setDraft} format="HH:mm" style={{ width: 160 }} />
          <Space><Button size="small" type="primary" onClick={async () => { if (draft) { await onSave(draft.format('HH:mm:ss')); setOpen(false); } }}>Lưu</Button><Button size="small" onClick={() => setOpen(false)}>Hủy</Button></Space>
        </Space>
      }>
        <div className={`w-full flex items-center justify-between text-[14px] gap-1 min-w-0 ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
          {value ? (
            <span className="truncate font-medium text-slate-700">{value}</span>
          ) : (
            <span className="truncate text-slate-400 italic font-normal">Chưa cấu hình</span>
          )}
          {!isLocked && <EditOutlined className="text-slate-400 text-[13px] shrink-0" />}
        </div>
      </Popover>
    );
  };

  const ScheduleDaysInline = ({ value, onSave }: { value?: number[]; onSave: (v: number[]) => Promise<void> }) => {
    const [open, setOpen] = useState(false);
    const [draft, setDraft] = useState<number[]>(value || []);
    return (
      <Popover open={open} onOpenChange={setOpen} trigger="click" content={
        <div style={{ width: 220 }}>
          <Checkbox.Group value={draft} onChange={(v) => setDraft(v as number[])} style={{ width: '100%' }}>
            <div className="grid grid-cols-4 gap-2">{DAY_LABELS.map((d) => (<Checkbox key={d.value} value={d.value}>{d.label}</Checkbox>))}</div>
          </Checkbox.Group>
          <Space style={{ marginTop: 8 }}><Button size="small" type="primary" onClick={async () => { if (draft.length > 0) { await onSave(draft); setOpen(false); } else toast.error('Chọn ít nhất 1 ngày'); }}>Lưu</Button><Button size="small" onClick={() => setOpen(false)}>Hủy</Button></Space>
        </div>
      }>
        <div className={`w-full flex items-center justify-between gap-1 min-w-0 ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
          <div className="flex flex-wrap gap-1.5 min-w-0">
            {value && value.length > 0 ? (
              value.map((d) => (<Tag key={d} color="blue" className="!m-0 !rounded-md !text-[12px] font-semibold">{DAY_LABELS.find((x) => x.value === d)?.label || d}</Tag>))
            ) : (
              <span className="text-slate-400 italic font-normal text-[14px]">Chưa cấu hình</span>
            )}
          </div>
          {!isLocked && <EditOutlined className="text-slate-400 text-[13px] shrink-0" />}
        </div>
      </Popover>
    );
  };

  return (
    <div className="w-full relative">
      <Card
        className="!rounded-xl shadow-sm border-slate-200"
        title={<span className="font-extrabold text-slate-800 flex items-center gap-2 text-base sm:text-lg"><InfoCircleOutlined className="text-brand"/> Thông tin chi tiết khóa học</span>}
        extra={savingField && <Spin size="small" className="mr-2" />}
      >
        {isLocked && (
          <div className="mb-4 rounded-lg bg-amber-50 p-3 text-[14px] font-medium text-amber-700 border border-amber-200">
            ⚠️ Khóa học đang ở trạng thái <b className="font-bold">{course.status}</b> — không thể chỉnh sửa thông tin.
          </div>
        )}

        {/* ═══════════ PHẦN 1: THÔNG TIN CỐT LÕI ═══════════ */}
        <div className="flex flex-col md:flex-row gap-4 md:gap-6">
          
          {/* Cột Ảnh Thumbnail */}
          <div className="w-full md:w-[280px] lg:w-[320px] shrink-0 flex flex-col">
            <span className="text-[13px] font-semibold text-slate-600 mb-1.5">Ảnh Thumbnail</span>
            <div className="w-full aspect-video rounded-lg overflow-hidden border border-slate-200 bg-slate-100 relative group flex items-center justify-center shadow-sm mb-2">
              {course.thumbnailUrl ? (
                <>
                  <img src={course.thumbnailUrl} alt="bg" className="absolute inset-0 w-full h-full object-cover blur-sm opacity-30 pointer-events-none" />
                  <img src={course.thumbnailUrl} alt="Thumbnail" className="absolute inset-0 w-full h-full object-contain p-1 z-10 drop-shadow-sm" />
                  <div className="absolute inset-0 z-20 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                    <Button type="primary" shape="circle" size="small" icon={<EyeOutlined />} onClick={() => setPreviewVisible(true)} />
                  </div>
                  <div className="hidden">
                    <Image preview={{ visible: previewVisible, onVisibleChange: (vis) => setPreviewVisible(vis) }} src={course.thumbnailUrl} />
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center p-3 text-center">
                  <PictureOutlined className="text-2xl mb-1 text-slate-300" />
                  <span className="text-[13px] italic font-normal text-slate-400">Chưa có ảnh</span>
                </div>
              )}
            </div>

            {!isLocked && (
              <div className="flex items-center justify-between gap-2">
                <Upload showUploadList={false} beforeUpload={(file) => {
                  const fakeUrl = URL.createObjectURL(file);
                  saveField('thumbnailUrl', fakeUrl);
                  toast.success('Đã tải ảnh lên');
                  return false;
                }}>
                  <Button size="small" icon={<UploadOutlined />} className="!text-[13px] !font-medium !rounded-md">
                    {course.thumbnailUrl ? 'Đổi ảnh' : 'Tải ảnh lên'}
                  </Button>
                </Upload>
                {course.thumbnailUrl && (
                  <Button size="small" danger type="text" icon={<DeleteOutlined />} onClick={() => saveField('thumbnailUrl', null)} className="!text-[13px] !font-medium !rounded-md">
                    Xóa
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Cột Thông tin cơ bản */}
          <div className="flex-1 flex flex-col gap-4 min-w-0">
            <FieldWrapper label="Tiêu đề khóa học" disabled={isLocked}>
              <InlineDraftField 
                value={course.title} 
                onCommit={(v) => saveField('title', v)} 
                disabled={isLocked || !!savingField} 
                required 
                formatDisplay={(v) => v ? (
                  <span className="text-lg font-extrabold text-slate-900 break-words whitespace-pre-wrap">{v as string}</span>
                ) : (
                  <span className="text-lg font-normal italic text-slate-400">Chưa có tiêu đề</span>
                )} 
              />
            </FieldWrapper>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <FieldWrapper label="Trạng thái & Hình thức" disabled={true}>
                <Space wrap size={4}><StatusTag status={course.status} /><StatusTag status={course.courseType} /></Space>
              </FieldWrapper>

              <FieldWrapper label="Danh mục" disabled={isLocked}>
                <InlineDraftField 
                  type="select" 
                  value={course.categoryId} 
                  options={categories.map((c) => ({ label: c.name, value: c.id }))} 
                  onCommit={(v) => saveField('categoryId', v)} 
                  disabled={isLocked || !!savingField} 
                  allowClear 
                  formatDisplay={(v) => {
                    const name = categories.find((c) => c.id === v)?.name || course.categoryName;
                    return name ? (
                      <span className="truncate block text-[14px] font-medium text-slate-700">{name}</span>
                    ) : (
                      <span className="truncate block text-[14px] italic font-normal text-slate-400">Chưa gán</span>
                    );
                  }} 
                />
              </FieldWrapper>

              {/* Học phí */}
              <FieldWrapper label={course.isFree ? 'Học phí' : 'Học phí & Giá cũ'} disabled={isLocked} contentClassName="!px-2">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 w-full min-w-0">
                  <div className="shrink-0">
                    <InlineDraftField 
                      type="switch" 
                      value={course.isFree} 
                      onCommit={(v) => saveField('isFree', v)} 
                      disabled={isLocked || !!savingField} 
                      formatDisplay={(v) => (v ? <Tag color="green" className="!m-0 !text-[12px] font-semibold">Miễn phí</Tag> : <Tag className="!m-0 !text-[12px] font-semibold">Thu phí</Tag>)} 
                    />
                  </div>
                  
                  {!course.isFree && (
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 min-w-0">
                      <div className="flex items-center shrink-0">
                        <span className="text-[12px] font-medium text-slate-500 mr-1">Giá:</span>
                        <InlineDraftField 
                          type="number" 
                          value={course.price} 
                          onCommit={(v) => saveField('price', v)} 
                          disabled={isLocked || !!savingField} 
                          formatDisplay={(v) => v !== null && v !== undefined ? (
                            <span className="text-brand font-extrabold text-[15px] whitespace-nowrap">
                              <MoneyDisplay value={v as number} strong />
                            </span>
                          ) : (
                            <span className="text-slate-400 italic font-normal text-[14px]">—</span>
                          )} 
                          min={0} 
                        />
                      </div>
                      
                      <div className="flex items-center shrink-0">
                        <span className="text-[12px] font-medium text-slate-500 mr-1">Cũ:</span>
                        <InlineDraftField 
                          type="number" 
                          value={course.oldPrice} 
                          onCommit={(v) => saveField('oldPrice', v)} 
                          disabled={isLocked || !!savingField} 
                          formatDisplay={(v) => v !== null && v !== undefined ? (
                            <span className="line-through text-slate-500 text-[13.5px] font-medium whitespace-nowrap">
                              <MoneyDisplay value={v as number} showFree={false} />
                            </span>
                          ) : (
                            <span className="text-slate-400 italic font-normal text-[14px]">—</span>
                          )} 
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
            <Divider className="!my-6" />
            <div className="flex items-center gap-2 mb-5 text-brand font-extrabold text-base sm:text-lg"><TeamOutlined /> Cấu hình vận hành lớp học (Offline)</div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <FieldWrapper label="Sĩ số tối thiểu" disabled={isLocked}>
                <InlineDraftField type="number" value={course.minStudents} min={1} onCommit={(v) => saveField('minStudents', v, true)} disabled={isLocked || !!savingField} formatDisplay={(v) => v ? <span className="text-[14px] font-medium text-slate-700">{v as number} HV</span> : <span className="text-[14px] italic font-normal text-slate-400">Chưa cấu hình</span>} />
              </FieldWrapper>
              <FieldWrapper label="Sĩ số tối đa" disabled={isLocked}>
                <InlineDraftField type="number" value={course.maxStudents} min={1} onCommit={(v) => saveField('maxStudents', v, true)} disabled={isLocked || !!savingField} formatDisplay={(v) => v ? <span className="text-[14px] font-medium text-slate-700">{v as number} HV</span> : <span className="text-[14px] italic font-normal text-slate-400">Chưa cấu hình</span>} />
              </FieldWrapper>
              <FieldWrapper label="Giảng viên chính" disabled={isLocked} className="sm:col-span-2 md:col-span-1">
                <InlineDraftField type="select" value={course.teacherId} options={instructors.map((a) => ({ value: a.accountId, label: a.fullName || a.email }))} onCommit={(v) => saveField('teacherId', v, true)} disabled={isLocked || !!savingField} allowClear formatDisplay={() => course.teacherName ? <span className="truncate block text-[14px] font-medium text-slate-700">{course.teacherName}</span> : <span className="truncate block text-[14px] italic font-normal text-slate-400">Chưa phân công</span>} />
              </FieldWrapper>
              <FieldWrapper label="Phòng học" disabled={isLocked} className="sm:col-span-2 md:col-span-1">
                <InlineDraftField type="select" value={course.roomId} options={rooms.map((r) => ({ value: r.id, label: r.name }))} onCommit={(v) => saveField('roomId', v, true)} disabled={isLocked || !!savingField} allowClear formatDisplay={() => course.roomName ? <span className="truncate block text-[14px] font-medium text-slate-700">{course.roomName}</span> : <span className="truncate block text-[14px] italic font-normal text-slate-400">Chưa xếp phòng</span>} />
              </FieldWrapper>

              <FieldWrapper label="Ngày bắt đầu" disabled={isLocked}><DateInline value={course.startDate} onSave={(v) => saveField('startDate', v, true)} /></FieldWrapper>
              <FieldWrapper label="Ngày kết thúc" disabled={isLocked}><DateInline value={course.endDate} onSave={(v) => saveField('endDate', v, true)} /></FieldWrapper>
              <FieldWrapper label="Giờ bắt đầu" disabled={isLocked}><TimeInline value={course.sessionStartTime} onSave={(v) => saveField('sessionStartTime', v, true)} /></FieldWrapper>
              <FieldWrapper label="Giờ kết thúc" disabled={isLocked}><TimeInline value={course.sessionEndTime} onSave={(v) => saveField('sessionEndTime', v, true)} /></FieldWrapper>
              
              <FieldWrapper label="Lịch học trong tuần" disabled={isLocked} className="sm:col-span-2 md:col-span-4">
                <ScheduleDaysInline value={course.scheduleDays} onSave={(v) => saveField('scheduleDays', v, true)} />
              </FieldWrapper>
            </div>
          </>
        )}

        <Divider className="!my-6" />

        {/* ═══════════ PHẦN 3: MÔ TẢ & KẾT QUẢ ═══════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-6">
          <div className="flex flex-col gap-4">
            <FieldWrapper label="Mô tả ngắn" disabled={isLocked}>
              <InlineDraftField 
                type="textarea" 
                rows={2} 
                value={course.shortDescription} 
                onCommit={(v) => saveField('shortDescription', v)} 
                disabled={isLocked || !!savingField} 
                formatDisplay={(v) => v ? (
                  <span className="text-[14.5px] text-slate-700 font-medium break-words whitespace-pre-wrap">{v as string}</span>
                ) : (
                  <span className="text-[14.5px] italic font-normal text-slate-400 break-words whitespace-pre-wrap">Chưa có mô tả ngắn</span>
                )} 
              />
            </FieldWrapper>

            <FieldWrapper label="Mô tả đầy đủ" disabled={isLocked} className="flex-1" contentClassName="!items-start h-full py-2">
              <InlineDraftField 
                type="textarea" 
                rows={6} 
                value={course.description} 
                onCommit={(v) => saveField('description', v)} 
                disabled={isLocked || !!savingField} 
                formatDisplay={(v) => v ? (
                  <Paragraph className="text-[14.5px] text-slate-700 font-medium whitespace-pre-wrap mb-0 leading-relaxed break-words w-full">{v as string}</Paragraph>
                ) : (
                  <Paragraph className="text-[14.5px] italic font-normal text-slate-400 whitespace-pre-wrap mb-0 leading-relaxed break-words w-full">Chưa có mô tả đầy đủ</Paragraph>
                )} 
              />
            </FieldWrapper>
          </div>

          <div>
            <FieldWrapper label="Kết quả đầu ra" disabled={isLocked} className="h-full" contentClassName="!items-start h-full py-2 bg-slate-50/50">
              <OutcomesListEditor value={course.outcomes} onChange={(newOutcomes) => saveField('outcomes', newOutcomes)} disabled={isLocked || !!savingField} />
            </FieldWrapper>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default CourseGeneralInfoTab;