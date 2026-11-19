// src/components/course/LessonMaterialUploadModal.tsx
import { useState } from 'react';
import {
  Modal,
  Upload,
  Input,
  Button,
  Tag,
  Switch,
  Space,
  Alert,
} from 'antd';
import type { UploadProps } from 'antd';
import {
  InboxOutlined,
  FilePdfOutlined,
  PlayCircleOutlined,
  DeleteOutlined,
  CloudUploadOutlined,
} from '@ant-design/icons';
import toast from 'react-hot-toast';

import { fileApi, extractFileUrl } from '@/services/api/files';
import { resourceApi } from '@/services/api/course/resourceApi';
import { showError } from '@/utils/errorHelper';
import type {
  CourseResourceResponse,
  ResourceCreateRequest,
} from '@/services/types/course';

const { Dragger } = Upload;
// const { Text } = Typography;

type MaterialKind = 'PDF' | 'VIDEO';

interface PendingMaterialItem {
  uid: string;
  file: File;
  title: string;
  resourceType: MaterialKind;
  isRequired: boolean;
  isFreePreview: boolean;
}

interface Props {
  open: boolean;
  courseId: number;
  lesson: CourseResourceResponse | null;
  existingChildCount?: number;
  onClose: () => void;
  onSuccess: () => void;
}

const detectMaterialKind = (file: File): MaterialKind | null => {
  const mime = file.type.toLowerCase();
  const name = file.name.toLowerCase();

  if (mime === 'application/pdf' || name.endsWith('.pdf')) {
    return 'PDF';
  }
  if (
    mime.startsWith('video/') ||
    /\.(mp4|mov|webm|mkv|avi|m4v)$/i.test(name)
  ) {
    return 'VIDEO';
  }
  return null;
};

const stripExtension = (fileName: string): string =>
  fileName.replace(/\.[^/.]+$/, '').trim();

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const LessonMaterialUploadModal = ({
  open,
  courseId,
  lesson,
  existingChildCount = 0,
  onClose,
  onSuccess,
}: Props) => {
  const [items, setItems] = useState<PendingMaterialItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState('');

  const handleClose = () => {
    if (uploading) return;
    setItems([]);
    setUploadProgressText('');
    onClose();
  };

  const handleBeforeUpload: NonNullable<UploadProps['beforeUpload']> = (
    file,
  ) => {
    const kind = detectMaterialKind(file);
    if (!kind) {
      toast.error(
        `File "${file.name}" không hợp lệ. Chỉ hỗ trợ định dạng PDF hoặc Video.`,
      );
      return Upload.LIST_IGNORE;
    }

    setItems((prev) => {
      const isDuplicate = prev.some(
        (x) => x.file.name === file.name && x.file.size === file.size,
      );
      if (isDuplicate) return prev;

      return [
        ...prev,
        {
          uid: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
          file,
          title: stripExtension(file.name) || file.name,
          resourceType: kind,
          isRequired: true,
          isFreePreview: false,
        },
      ];
    });

    return false;
  };

  const updateItem = (
    uid: string,
    patch: Partial<Omit<PendingMaterialItem, 'uid' | 'file'>>,
  ) => {
    setItems((prev) =>
      prev.map((item) => (item.uid === uid ? { ...item, ...patch } : item)),
    );
  };

  const removeItem = (uid: string) => {
    setItems((prev) => prev.filter((item) => item.uid !== uid));
  };

  const handleSubmit = async () => {
    if (!lesson || items.length === 0) return;

    const hasEmptyTitle = items.some((x) => !x.title.trim());
    if (hasEmptyTitle) {
      toast.error('Vui lòng nhập tiêu đề cho tất cả tài liệu.');
      return;
    }

    setUploading(true);
    try {
      for (let i = 0; i < items.length; i++) {
        const current = items[i];
        setUploadProgressText(
          `Đang tải lên (${i + 1}/${items.length}): ${current.file.name}...`,
        );

        // 1. Upload file vật lý lên server
        const uploadRes = await fileApi.upload(current.file);
        const uploadedUrl = extractFileUrl(uploadRes);

        if (!uploadedUrl) {
          throw new Error(
            `Không nhận được đường dẫn file sau khi tải "${current.file.name}"`,
          );
        }

        // 2. Tạo bản ghi resource gắn vào lesson.id
        const payload = {
          title: current.title.trim(),
          resourceType: current.resourceType,
          parentId: lesson.id,
          orderIndex: existingChildCount + i,
          fileUrl: uploadedUrl,
          isRequired: current.isRequired,
          isFreePreview: current.isFreePreview,
        } as unknown as ResourceCreateRequest;

        await resourceApi.create(courseId, payload);
      }

      toast.success(`Đã thêm ${items.length} tài liệu vào bài học`);
      setItems([]);
      setUploadProgressText('');
      onSuccess();
      onClose();
    } catch (err) {
      showError(err, 'Tải tài liệu lên thất bại');
    } finally {
      setUploading(false);
      setUploadProgressText('');
    }
  };

  return (
    <Modal
      title={
        <div className="flex flex-col gap-0.5">
          <span className="text-[16px] font-bold text-slate-800">
            Tải tài liệu cho bài học
          </span>
          {lesson && (
            <span className="text-[12.5px] font-normal text-slate-500">
              Bài học: <b className="text-slate-700">{lesson.title}</b>
            </span>
          )}
        </div>
      }
      open={open}
      onCancel={handleClose}
      width={680}
      maskClosable={!uploading}
      closable={!uploading}
      footer={
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-blue-600 font-medium">
            {uploadProgressText}
          </span>
          <Space>
            <Button onClick={handleClose} disabled={uploading}>
              Hủy
            </Button>
            <Button
              type="primary"
              icon={<CloudUploadOutlined />}
              loading={uploading}
              disabled={items.length === 0}
              onClick={handleSubmit}
            >
              Tải lên ({items.length})
            </Button>
          </Space>
        </div>
      }
    >
      <Dragger
        multiple
        showUploadList={false}
        accept=".pdf,video/mp4,video/webm,video/quicktime,video/x-matroska,.mp4,.mov,.webm,.mkv"
        beforeUpload={handleBeforeUpload}
        disabled={uploading}
        className="!rounded-xl !bg-slate-50/70 hover:!border-blue-400"
      >
        <p className="ant-upload-drag-icon !mb-2">
          <InboxOutlined style={{ color: '#2563eb', fontSize: 36 }} />
        </p>
        <p className="ant-upload-text !text-[14px] !font-semibold !text-slate-700">
          Kéo thả file PDF hoặc Video vào đây, hoặc bấm để chọn file
        </p>
        <p className="ant-upload-hint !text-[12.5px] !text-slate-400">
          Hỗ trợ chọn nhiều file cùng lúc (.pdf, .mp4, .mov, .webm, .mkv)
        </p>
      </Dragger>

      {items.length > 0 && (
        <div className="mt-4 flex flex-col gap-2.5 max-h-[340px] overflow-y-auto pr-1">
          {items.map((item) => {
            const isPdf = item.resourceType === 'PDF';
            return (
              <div
                key={item.uid}
                className="rounded-lg border border-slate-200 bg-white p-3 flex flex-col gap-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      style={{
                        backgroundColor: isPdf ? '#fee2e2' : '#fef3c7',
                        color: isPdf ? '#dc2626' : '#d97706',
                      }}
                      className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 text-[15px]"
                    >
                      {isPdf ? <FilePdfOutlined /> : <PlayCircleOutlined />}
                    </span>
                    <div className="min-w-0">
                      <div className="text-[12.5px] text-slate-500 truncate">
                        {item.file.name} ({formatBytes(item.file.size)})
                      </div>
                    </div>
                  </div>

                  <Space size={6}>
                    <Tag
                      color={isPdf ? 'red' : 'orange'}
                      className="!m-0 font-semibold"
                    >
                      {isPdf ? 'PDF' : 'VIDEO'}
                    </Tag>
                    <Button
                      type="text"
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      disabled={uploading}
                      onClick={() => removeItem(item.uid)}
                    />
                  </Space>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
                  <Input
                    value={item.title}
                    disabled={uploading}
                    placeholder="Nhập tiêu đề hiển thị cho học viên..."
                    onChange={(e) =>
                      updateItem(item.uid, { title: e.target.value })
                    }
                    className="flex-1"
                  />

                  <Space size={12} className="shrink-0">
                    <label className="inline-flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                      <Switch
                        size="small"
                        checked={item.isRequired}
                        disabled={uploading}
                        onChange={(checked) =>
                          updateItem(item.uid, { isRequired: checked })
                        }
                      />
                      <span>Bắt buộc</span>
                    </label>

                    <label className="inline-flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                      <Switch
                        size="small"
                        checked={item.isFreePreview}
                        disabled={uploading}
                        onChange={(checked) =>
                          updateItem(item.uid, { isFreePreview: checked })
                        }
                      />
                      <span>Học thử</span>
                    </label>
                  </Space>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {items.length === 0 && (
        <Alert
          type="info"
          showIcon
          className="!mt-3 !rounded-lg"
          message="Mỗi bài học (Lesson) có thể chứa nhiều tài liệu PDF và Video riêng biệt."
        />
      )}
    </Modal>
  );
};

export default LessonMaterialUploadModal;