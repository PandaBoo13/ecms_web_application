import { useEffect, useMemo, useState } from 'react';
import { Modal, Checkbox, Empty, Spin, Tag, Space, Input, Alert } from 'antd';
import toast from 'react-hot-toast';

import { adminPermissionApi, adminRolePermissionApi } from '@/services/api/admin';
import type { Permission } from '@/services/types/user';

interface Props {
  roleId: number | null;
  roleCode?: string;
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

const RolePermissionModal = ({ roleId, roleCode, open, onClose, onSaved }: Props) => {
  const [allPerms, setAllPerms] = useState<Permission[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [keyword, setKeyword] = useState('');

  useEffect(() => {
    if (!open || !roleId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [all, current] = await Promise.all([
          adminPermissionApi.listAll(),
          adminRolePermissionApi.list(roleId),
        ]);
        if (cancelled) return;
        setAllPerms(all);
        setSelectedIds(current.map((p) => p.id));
      } catch (err) {
        toast.error((err as { message?: string })?.message || 'Không tải được dữ liệu');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, roleId]);

  const grouped = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    const map = new Map<string, Permission[]>();
    for (const p of allPerms) {
      if (kw) {
        const hay = `${p.method} ${p.endpointPattern} ${p.description || ''}`.toLowerCase();
        if (!hay.includes(kw)) continue;
      }
      const mod = p.module || 'UNCATEGORIZED';
      if (!map.has(mod)) map.set(mod, []);
      map.get(mod)!.push(p);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [allPerms, keyword]);

  const toggleModule = (perms: Permission[], checked: boolean) => {
    const ids = perms.map((p) => p.id);
    setSelectedIds((prev) => checked
      ? Array.from(new Set([...prev, ...ids]))
      : prev.filter((id) => !ids.includes(id))
    );
  };

  const handleSave = async () => {
    if (!roleId) return;
    setSaving(true);
    try {
      await adminRolePermissionApi.removeAll(roleId);
      if (selectedIds.length > 0) {
        await adminRolePermissionApi.assignBatch(roleId, selectedIds);
      }
      toast.success(`Đã lưu ${selectedIds.length} quyền cho role ${roleCode || '#' + roleId}`);
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Lưu thất bại');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={
        <div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>Gán quyền cho Role {roleCode || `#${roleId}`}</div>
          <div style={{ fontSize: 12, color: '#64748b', fontWeight: 400, marginTop: 2 }}>
            Đã chọn: {selectedIds.length} / {allPerms.length} quyền
          </div>
        </div>
      }
      open={open}
      onCancel={onClose}
      onOk={handleSave}
      confirmLoading={saving}
      okText="Lưu"
      cancelText="Huỷ"
      width={760}
      destroyOnClose
    >
      <Alert
        type="warning" showIcon style={{ margin: '12px 0', borderRadius: 8 }}
        message="Lưu ý: lưu sẽ ghi đè toàn bộ quyền hiện tại của role. Hành động có hiệu lực ngay."
      />
      <Input.Search
        placeholder="Tìm theo method / endpoint / mô tả..."
        allowClear style={{ marginBottom: 12 }}
        onChange={(e) => setKeyword(e.target.value)}
      />
      <div style={{ maxHeight: 460, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><Spin size="large" /></div>
        ) : grouped.length === 0 ? (
          <Empty description="Không có quyền nào" />
        ) : (
          grouped.map(([mod, perms]) => {
            const checked = perms.every((p) => selectedIds.includes(p.id));
            const indeterminate = !checked && perms.some((p) => selectedIds.includes(p.id));
            return (
              <div key={mod} style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 6, borderBottom: '1px solid #f1f5f9', marginBottom: 8 }}>
                  <Checkbox
                    checked={checked}
                    indeterminate={indeterminate}
                    onChange={(e) => toggleModule(perms, e.target.checked)}
                  >
                    <Tag color="geekblue" style={{ marginLeft: 4 }}>{mod}</Tag>
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>({perms.length})</span>
                  </Checkbox>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingLeft: 24 }}>
                  {perms.map((p) => (
                    <Checkbox
                      key={p.id}
                      checked={selectedIds.includes(p.id)}
                      onChange={(e) => setSelectedIds((prev) =>
                        e.target.checked ? [...prev, p.id] : prev.filter((id) => id !== p.id)
                      )}
                    >
                      <Space size={6}>
                        <Tag style={{ margin: 0 }}>{p.method}</Tag>
                        <code style={{ fontSize: 12 }}>{p.endpointPattern}</code>
                        {p.description && (
                          <span style={{ fontSize: 11, color: '#94a3b8' }}>— {p.description}</span>
                        )}
                      </Space>
                    </Checkbox>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </Modal>
  );
};

export default RolePermissionModal;