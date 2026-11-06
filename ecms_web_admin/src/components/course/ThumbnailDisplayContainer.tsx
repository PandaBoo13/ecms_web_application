import React, { useState } from 'react';
import { Image, Button, Upload } from 'antd';
import {
  UploadOutlined,
  DeleteOutlined,
  EyeOutlined,
  PictureOutlined,
} from '@ant-design/icons';
import toast from 'react-hot-toast';

interface ThumbnailContainerProps {
  value?: string | null;
  onChange?: (url: string | null) => void;
  onRemove?: () => void;
  disabled?: boolean;
}

export const ThumbnailDisplayContainer: React.FC<ThumbnailContainerProps> = ({
  value,
  onChange,
  onRemove,
  disabled = false,
}) => {
  const [previewVisible, setPreviewVisible] = useState(false);

  return (
    <div className="flex flex-col gap-2 w-full min-w-0">
      {/* Khung ảnh: Dùng aspect-video để tự động giữ tỷ lệ 16:9 theo chiều rộng, bỏ maxHeight */}
      <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-slate-200 bg-slate-100 group shadow-sm flex items-center justify-center">
        {value ? (
          <>
            <img
              src={value}
              alt="background-blur"
              className="absolute inset-0 w-full h-full object-cover blur-md scale-110 opacity-30 pointer-events-none"
            />
            <img
              src={value}
              alt="Thumbnail"
              className="absolute inset-0 w-full h-full object-contain p-1 drop-shadow-md transition-transform duration-300 group-hover:scale-[1.02] pointer-events-none"
            />
            <div className="absolute inset-0 z-10 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2 backdrop-blur-[2px]">
              <Button
                type="primary"
                shape="circle"
                size="small"
                icon={<EyeOutlined />}
                onClick={() => setPreviewVisible(true)}
                title="Xem ảnh phóng to"
              />
            </div>
            <div className="hidden">
              <Image
                preview={{
                  visible: previewVisible,
                  onVisibleChange: (vis) => setPreviewVisible(vis),
                }}
                src={value}
              />
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 p-3 text-center">
            <PictureOutlined className="text-2xl mb-1 text-slate-300" />
            <span className="text-[11px] font-medium">Chưa có ảnh</span>
          </div>
        )}
      </div>

      {!disabled && (
        <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
          <Upload
            showUploadList={false}
            beforeUpload={(file) => {
              const fakeUrl = URL.createObjectURL(file);
              onChange?.(fakeUrl);
              toast.success('Đã tải ảnh lên');
              return false;
            }}
          >
            <Button size="small" icon={<UploadOutlined />} className="!text-[11.5px] !rounded-md">
              {value ? 'Đổi ảnh' : 'Tải ảnh lên'}
            </Button>
          </Upload>

          {value && (onRemove || onChange) && (
            <Button
              size="small"
              danger
              type="text"
              icon={<DeleteOutlined />}
              onClick={() => {
                if (onRemove) onRemove();
                else if (onChange) onChange(null);
              }}
              className="!text-[11.5px] !rounded-md"
            >
              Xoá ảnh
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default ThumbnailDisplayContainer;