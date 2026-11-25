import { Button, Modal, Space, Table, Tabs, Tag, Tooltip, Typography } from 'antd';
import { CheckCircleOutlined } from '@ant-design/icons';
import type { ClassifiedStudent } from '@/components/course/completion/autoCompletionClassification';

const { Text } = Typography;

interface Props {
  open: boolean;
  analyzing: boolean;
  completing: boolean;
  minPassScore: number;
  maxAbsencePercent: number;
  students: ClassifiedStudent[];
  selectedPassIds: number[];
  selectedFailIds: number[];
  onCancel: () => void;
  onConfirm: () => void;
  onSelectedPassIdsChange: (ids: number[]) => void;
  onSelectedFailIdsChange: (ids: number[]) => void;
}

export default function AutoCompletionModal({
  open,
  analyzing,
  completing,
  minPassScore,
  maxAbsencePercent,
  students,
  selectedPassIds,
  selectedFailIds,
  onCancel,
  onConfirm,
  onSelectedPassIdsChange,
  onSelectedFailIdsChange,
}: Props) {
  const passedStudents = students.filter((student) => student.eligible && student.suggestedResult === 'PASSED');
  const failedStudents = students.filter((student) => student.eligible && student.suggestedResult === 'FAILED');
  const ineligibleStudents = students.filter((student) => !student.eligible);
  const selectedCount = selectedPassIds.length + selectedFailIds.length;

  return (
    <Modal
      title={
        <div className="flex items-center justify-between pr-6">
          <span className="font-semibold text-base flex items-center gap-2">
            <CheckCircleOutlined className="text-emerald-500" /> Xét hoàn thành khóa học (Tự động phân loại)
          </span>
          <Space size={10} className="text-sm font-normal">
            <Tooltip title="Điểm chuẩn = 50% thang điểm khóa, đã chốt trong bảng điểm được duyệt.">
              <span className="text-slate-500">Điểm chuẩn đạt: <Text strong>{minPassScore}</Text></span>
            </Tooltip>
            <Tooltip title="Ngưỡng vắng tối đa của khóa; vượt ngưỡng chỉ có thể xét Không đạt.">
              <span className="text-slate-500">Vắng tối đa: <Text strong>{maxAbsencePercent}%</Text></span>
            </Tooltip>
          </Space>
        </div>
      }
      open={open}
      onCancel={onCancel}
      width={850}
      destroyOnHidden
      footer={[
        <Button key="cancel" onClick={onCancel}>Hủy</Button>,
        <Button
          key="submit"
          type="primary"
          icon={<CheckCircleOutlined />}
          loading={completing}
          disabled={selectedCount === 0}
          onClick={onConfirm}
        >
          Xác nhận hoàn thành ({selectedCount} học viên)
        </Button>,
      ]}
    >
      <div className="grid grid-cols-3 gap-3 mb-4 mt-2">
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center">
          <div className="text-xs text-emerald-700 font-medium">Đủ điều kiện ĐẠT</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{passedStudents.length}</div>
          <div className="text-[11px] text-emerald-600 mt-0.5">Đã chọn: {selectedPassIds.length}</div>
        </div>
        <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-center">
          <div className="text-xs text-rose-700 font-medium">KHÔNG ĐẠT</div>
          <div className="text-2xl font-bold text-rose-600 mt-1">{failedStudents.length}</div>
          <div className="text-[11px] text-rose-600 mt-0.5">Đã chọn: {selectedFailIds.length}</div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
          <div className="text-xs text-amber-700 font-medium">Chưa đủ điều kiện</div>
          <div className="text-2xl font-bold text-amber-600 mt-1">{ineligibleStudents.length}</div>
          <div className="text-[11px] text-amber-600 mt-0.5">Thiếu điểm / Chưa ĐD</div>
        </div>
      </div>

      <Tabs
        defaultActiveKey="passed"
        items={[
          {
            key: 'passed',
            label: <span>Đạt ({passedStudents.length})</span>,
            children: (
              <Table
                size="small"
                rowKey="enrollmentId"
                loading={analyzing}
                pagination={{ pageSize: 6 }}
                dataSource={passedStudents}
                rowSelection={{
                  selectedRowKeys: selectedPassIds,
                  onChange: (keys) => onSelectedPassIdsChange(keys as number[]),
                }}
                columns={[
                  { title: 'Mã HV', dataIndex: 'studentCode', width: 110 },
                  { title: 'Họ tên', dataIndex: 'studentName' },
                  { title: 'Điểm', dataIndex: 'finalScore', width: 90, render: (value: number | null) => <strong>{value ?? '—'}</strong> },
                  { title: 'Vắng', dataIndex: 'absences', width: 110, render: (_, row: ClassifiedStudent) => `${row.absences}/${row.conductedSessions} (${row.absencePercent.toFixed(0)}%)` },
                  { title: 'Kết quả', width: 140, render: () => <Tag color="success">Hoàn thành (Đạt)</Tag> },
                ]}
              />
            ),
          },
          {
            key: 'failed',
            label: <span>Không đạt ({failedStudents.length})</span>,
            children: (
              <Table
                size="small"
                rowKey="enrollmentId"
                loading={analyzing}
                pagination={{ pageSize: 6 }}
                dataSource={failedStudents}
                rowSelection={{
                  selectedRowKeys: selectedFailIds,
                  onChange: (keys) => onSelectedFailIdsChange(keys as number[]),
                }}
                columns={[
                  { title: 'Mã HV', dataIndex: 'studentCode', width: 110 },
                  { title: 'Họ tên', dataIndex: 'studentName' },
                  { title: 'Điểm', dataIndex: 'finalScore', width: 90, render: (value: number | null) => <span className="text-rose-600 font-semibold">{value ?? '—'}</span> },
                  { title: 'Vắng', dataIndex: 'absences', width: 110, render: (_, row: ClassifiedStudent) => `${row.absences}/${row.conductedSessions} (${row.absencePercent.toFixed(0)}%)` },
                  { title: 'Lý do', dataIndex: 'reason', render: (reason: string) => <span className="text-xs text-rose-600">{reason}</span> },
                  { title: 'Kết quả', width: 160, render: () => <Tag color="error">Hoàn thành (Không đạt)</Tag> },
                ]}
              />
            ),
          },
          ...(ineligibleStudents.length > 0
            ? [{
                key: 'ineligible',
                label: <span>Chưa đủ ĐK ({ineligibleStudents.length})</span>,
                children: (
                  <Table
                    size="small"
                    rowKey="enrollmentId"
                    loading={analyzing}
                    pagination={{ pageSize: 6 }}
                    dataSource={ineligibleStudents}
                    columns={[
                      { title: 'Mã HV', dataIndex: 'studentCode', width: 110 },
                      { title: 'Họ tên', dataIndex: 'studentName' },
                      { title: 'Điểm', dataIndex: 'finalScore', width: 90, render: (value: number | null) => value ?? <Tag color="orange">Chưa nhập</Tag> },
                      { title: 'Điểm danh', dataIndex: 'unmarkedSessions', width: 120, render: (value: number) => value > 0 ? <Tag color="warning">{`Còn ${value} buổi`}</Tag> : <Tag color="success">Đủ</Tag> },
                      { title: 'Nguyên nhân chặn', dataIndex: 'reason', render: (reason: string) => <span className="text-xs text-amber-700 font-medium">{reason}</span> },
                    ]}
                  />
                ),
              }]
            : []),
        ]}
      />
    </Modal>
  );
}
