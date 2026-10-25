import { useState } from 'react';
import { Upload, Button, Space, Image } from 'antd';
import type { UploadProps } from 'antd';
import {
  UploadOutlined,
  DeleteOutlined,
  LoadingOutlined,
  PictureOutlined,
} from '@ant-design/icons';
import toast from 'react-hot-toast';
import { fileApi, extractFileUrl } from '@/services/api/files';

interface Props {
  value?: string;
  /** Trả '' khi user xoá ảnh */
  onChange?: (url: string) => void;
  width?: number;
  height?: number;
  disabled?: boolean;
  maxSizeMB?: number;
}

const ThumbnailUpload = ({
  value,
  onChange,
  width = 320,
  height = 180,
  disabled = false,
  maxSizeMB = 5,
}: Props) => {
  const [uploading, setUploading] = useState(false);

  const customRequest: UploadProps['customRequest'] = async (options) => {
    const file = options.file as File;
    setUploading(true);
    try {
      const res = await fileApi.upload(file);
      const url = extractFileUrl(res);
      if (!url) throw new Error('Server không trả URL ảnh');
      onChange?.(url);
      options.onSuccess?.(res);
      toast.success('Tải ảnh lên thành công');
    } catch (err) {
      options.onError?.(err as Error);
      toast.error((err as { message?: string })?.message || 'Tải ảnh lên thất bại');
    } finally {
      setUploading(false);
    }
  };

  const beforeUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Chỉ chấp nhận file ảnh (jpg, png, webp...)');
      return Upload.LIST_IGNORE;
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`Ảnh tối đa ${maxSizeMB}MB`);
      return Upload.LIST_IGNORE;
    }
    return true;
  };

  return (
    <Space direction="vertical" size={10}>
      <div
        style={{
          width,
          height,
          borderRadius: 10,
          overflow: 'hidden',
          border: value ? '1px solid #e2e8f0' : '2px dashed #cbd5e1',
          background: value ? '#fff' : '#f8fafc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {value ? (
          <Image
            src={value}
            alt="thumbnail"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            preview={{ mask: 'Xem ảnh' }}
          />
        ) : (
          <div style={{ textAlign: 'center', color: '#94a3b8' }}>
            <PictureOutlined style={{ fontSize: 30, marginBottom: 4 }} />
            <div style={{ fontSize: 12 }}>Chưa có ảnh thumbnail</div>
          </div>
        )}
      </div>

      {!disabled && (
        <Space>
          <Upload
            accept="image/*"
            showUploadList={false}
            customRequest={customRequest}
            beforeUpload={beforeUpload}
          >
            <Button
              icon={uploading ? <LoadingOutlined /> : <UploadOutlined />}
              loading={uploading}
            >
              {value ? 'Đổi ảnh' : 'Tải ảnh lên'}
            </Button>
          </Upload>
          {value && (
            <Button danger icon={<DeleteOutlined />} onClick={() => onChange?.('')}>
              Xoá ảnh
            </Button>
          )}
        </Space>
      )}
    </Space>
  );
};

export default ThumbnailUpload;