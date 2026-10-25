import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, Button, Space, Input, Checkbox, Tag, Empty, Spin,
  Modal, Form, Tooltip, Popconfirm,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined,
  SaveOutlined, SearchOutlined, SafetyOutlined, UndoOutlined, KeyOutlined,
} from '@ant-design/icons';
import toast from 'react-hot-toast';

import PageContainer from '@/components/common/PageContainer';
import PageHeader from '@/components/common/PageHeader';

import {
  adminRoleApi,
  adminPermissionApi,
  adminRolePermissionApi,
} from '@/services/api/admin';
import type { Permission, Role } from '@/services/types/user';

interface RoleFormValues {
  code: string;
  description?: string;
}

const METHOD_COLOR: Record<string, string> = {
  GET: 'green', POST: 'blue', PUT: 'orange', PATCH: 'purple', DELETE: 'red',
};

const setsEqual = (a: Set<number>, b: Set<number>) => {
  if (a.size !== b.size) return false;
  for (const x of a) if (!b.has(x)) return false;
  return true;
};

const RoleManagePage = () => {
  const navigate = useNavigate();

  // ── Roles ──
  const [roles, setRoles] = useState<Role[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);

  // ── All permissions ──
  const [allPerms, setAllPerms] = useState<Permission[]>([]);
  const [permsLoading, setPermsLoading] = useState(false);

  // ── Role selection ──
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedPermIds, setSelectedPermIds] = useState<Set<number>>(new Set());
  const [originalPermIds, setOriginalPermIds] = useState<Set<number>>(new Set());
  const [loadingRolePerms, setLoadingRolePerms] = useState(false);
  /** Những permission role từng có nhưng is_enabled=false (BE trả về) */
  const [disabledPermIds, setDisabledPermIds] = useState<Set<number>>(new Set());

  // ── UI ──
  const [activeModule, setActiveModule] = useState<string | null>(null);
  const [moduleSearch, setModuleSearch] = useState('');
  const [permSearch, setPermSearch] = useState('');
  const [saving, setSaving] = useState(false);

  // ── Role create/edit modal ──
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [roleFormSaving, setRoleFormSaving] = useState(false);
  const [roleForm] = Form.useForm<RoleFormValues>();

  // ══════════════════════════════════════════════════════════════
  // FETCH
  // ══════════════════════════════════════════════════════════════
  const fetchRoles = useCallback(async () => {
    setRolesLoading(true);
    try {
      const list = await adminRoleApi.list();
      setRoles(list);
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Không tải được danh sách vai trò');
    } finally {
      setRolesLoading(false);
    }
  }, []);

  const fetchPermissions = useCallback(async () => {
    setPermsLoading(true);
    try {
      const list = await adminPermissionApi.listAll();
      setAllPerms(list);
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Không tải được danh sách quyền');
    } finally {
      setPermsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoles();
    fetchPermissions();
  }, [fetchRoles, fetchPermissions]);

  const loadRolePerms = useCallback(async (role: Role) => {
    setLoadingRolePerms(true);
    try {
      const list = await adminRolePermissionApi.list(role.id);
      const enabledIds = new Set<number>();
      const disabledIds = new Set<number>();

      for (const item of list) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const raw = item as any;
        // BE có thể trả về `id` hoặc `permissionId`
        const pid = raw.id ?? raw.permissionId;
        if (typeof pid !== 'number') continue;

        // BE có thể trả về `isEnabled` hoặc `is_enabled`
        const isEnabled = raw.isEnabled !== false && raw.is_enabled !== false;

        if (isEnabled) {
          enabledIds.add(pid);
        } else {
          disabledIds.add(pid);
        }
      }

      setSelectedPermIds(new Set(enabledIds));
      setOriginalPermIds(new Set(enabledIds));
      setDisabledPermIds(disabledIds);
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Không tải được quyền của role');
      setSelectedPermIds(new Set());
      setOriginalPermIds(new Set());
      setDisabledPermIds(new Set());
    } finally {
      setLoadingRolePerms(false);
    }
  }, []);

  // ══════════════════════════════════════════════════════════════
  // GROUPING
  // ══════════════════════════════════════════════════════════════
  const groupedByModule = useMemo(() => {
    const map = new Map<string, Permission[]>();
    for (const p of allPerms) {
      const mod = p.module || 'UNCATEGORIZED';
      if (!map.has(mod)) map.set(mod, []);
      map.get(mod)!.push(p);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [allPerms]);

  // Auto-pick module đầu tiên nếu chưa có hoặc module cũ không tồn tại
  useEffect(() => {
    if (groupedByModule.length === 0) return;
    if (!activeModule || !groupedByModule.some(([m]) => m === activeModule)) {
      setActiveModule(groupedByModule[0][0]);
    }
  }, [groupedByModule, activeModule]);

  const countByModule = useMemo(() => {
    const map = new Map<string, { selected: number; total: number }>();
    for (const [mod, perms] of groupedByModule) {
      const selected = perms.filter((p) => selectedPermIds.has(p.id)).length;
      map.set(mod, { selected, total: perms.length });
    }
    return map;
  }, [groupedByModule, selectedPermIds]);

  const filteredModules = useMemo(() => {
    const kw = moduleSearch.trim().toLowerCase();
    if (!kw) return groupedByModule;
    return groupedByModule.filter(([mod]) => mod.toLowerCase().includes(kw));
  }, [groupedByModule, moduleSearch]);

  const currentModulePerms = useMemo(() => {
    if (!activeModule) return [];
    return groupedByModule.find(([m]) => m === activeModule)?.[1] ?? [];
  }, [groupedByModule, activeModule]);

  const filteredCurrentPerms = useMemo(() => {
    const kw = permSearch.trim().toLowerCase();
    if (!kw) return currentModulePerms;
    return currentModulePerms.filter((p) => {
      const hay = `${p.method} ${p.endpointPattern} ${p.description || ''}`.toLowerCase();
      return hay.includes(kw);
    });
  }, [currentModulePerms, permSearch]);

  const currentModuleSelectedCount = useMemo(
    () => currentModulePerms.filter((p) => selectedPermIds.has(p.id)).length,
    [currentModulePerms, selectedPermIds],
  );
  const currentModuleAllChecked =
    currentModulePerms.length > 0 && currentModuleSelectedCount === currentModulePerms.length;
  const currentModuleIndeterminate =
    currentModuleSelectedCount > 0 && !currentModuleAllChecked;

  const dirty = useMemo(
    () => !setsEqual(selectedPermIds, originalPermIds),
    [selectedPermIds, originalPermIds],
  );

  // ══════════════════════════════════════════════════════════════
  // HANDLERS
  // ══════════════════════════════════════════════════════════════
  const handleSelectRole = (role: Role) => {
    if (selectedRole?.id === role.id) return;
    const doSelect = () => {
      setSelectedRole(role);
      setPermSearch('');
      loadRolePerms(role);
    };
    if (dirty) {
      Modal.confirm({
        title: 'Bạn có thay đổi chưa lưu',
        content: 'Chuyển sang vai trò khác sẽ huỷ các thay đổi hiện tại. Tiếp tục?',
        okText: 'Tiếp tục',
        cancelText: 'Ở lại',
        okButtonProps: { danger: true },
        onOk: doSelect,
      });
      return;
    }
    doSelect();
  };

  const togglePerm = (permId: number, checked: boolean) => {
    setSelectedPermIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(permId);
      else next.delete(permId);
      return next;
    });
  };

  const toggleModuleAll = (checked: boolean) => {
    if (!activeModule) return;
    setSelectedPermIds((prev) => {
      const next = new Set(prev);
      for (const p of currentModulePerms) {
        if (checked) next.add(p.id);
        else next.delete(p.id);
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (!selectedRole) return;
    setSaving(true);

    // Diff: cái cần BẬT = tick mới; cái cần TẮT = bỏ tick
    const added = Array.from(selectedPermIds).filter((id) => !originalPermIds.has(id));
    const removed = Array.from(originalPermIds).filter((id) => !selectedPermIds.has(id));

    let failAdded = 0;
    let failRemoved = 0;

    try {
      // ─── BẬT: thử assignBatch trước (1 request, nếu BE upsert thì OK) ───
      if (added.length > 0) {
        try {
          await adminRolePermissionApi.assignBatch(selectedRole.id, added);
        } catch {
          // Fallback 1: thử activate (trường hợp dòng đã tồn tại nhưng is_enabled=false)
          for (const pid of added) {
            try {
              await adminRolePermissionApi.activate(selectedRole.id, pid);
            } catch {
              // Fallback 2: assign tạo mới
              try {
                await adminRolePermissionApi.assign(selectedRole.id, pid);
              } catch {
                failAdded++;
              }
            }
          }
        }
      }

      // ─── TẮT: deactivate từng cái — KHÔNG xoá dòng (giữ is_enabled=false) ───
      for (const pid of removed) {
        try {
          await adminRolePermissionApi.deactivate(selectedRole.id, pid);
        } catch {
          failRemoved++;
        }
      }

      setOriginalPermIds(new Set(selectedPermIds));

      // Tổng kết
      const okAdded = added.length - failAdded;
      const okRemoved = removed.length - failRemoved;

      if (added.length === 0 && removed.length === 0) {
        toast.success('Không có thay đổi');
      } else if (failAdded + failRemoved === 0) {
        toast.success(
          `Đã lưu · +${okAdded} bật, -${okRemoved} tắt (không xoá khỏi DB)`,
        );
      } else {
        toast.warning(
          `Lưu một phần · +${okAdded}/${added.length} bật, -${okRemoved}/${removed.length} tắt`,
          { duration: 5000 },
        );
      }
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Lưu thất bại');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (!dirty) return;
    Modal.confirm({
      title: 'Huỷ các thay đổi?',
      content: 'Các thay đổi chưa lưu sẽ bị mất.',
      okText: 'Huỷ thay đổi',
      cancelText: 'Ở lại',
      okButtonProps: { danger: true },
      onOk: () => {
        // Khi Huỷ, chỉ reset selection về baseline (disabled set giữ nguyên
        // vì DB chưa đổi — disabled là trạng thái thực tế của server)
        setSelectedPermIds(new Set(originalPermIds));
      },
    });
  };

  // ══════════════════════════════════════════════════════════════
  // ROLE CRUD
  // ══════════════════════════════════════════════════════════════
  const openCreateRole = () => {
    setEditingRole(null);
    roleForm.resetFields();
    setRoleModalOpen(true);
  };

  const openEditRole = (role: Role) => {
    setEditingRole(role);
    roleForm.setFieldsValue({ code: role.code, description: role.description });
    setRoleModalOpen(true);
  };

  const handleSubmitRole = async () => {
    try {
      const values = await roleForm.validateFields();
      setRoleFormSaving(true);
      if (editingRole) {
        await adminRoleApi.update(editingRole.id, values);
        toast.success('Cập nhật vai trò thành công');
      } else {
        await adminRoleApi.create(values);
        toast.success('Tạo vai trò thành công');
      }
      setRoleModalOpen(false);
      fetchRoles();
    } catch (err) {
      const e = err as { message?: string; errorFields?: unknown };
      if (!e.errorFields) toast.error(e.message || 'Lưu thất bại');
    } finally {
      setRoleFormSaving(false);
    }
  };

  const handleDeleteRole = async (role: Role) => {
    try {
      await adminRoleApi.delete(role.id);
      toast.success('Xoá vai trò thành công');
      if (selectedRole?.id === role.id) {
        setSelectedRole(null);
        setSelectedPermIds(new Set());
        setOriginalPermIds(new Set());
      }
      fetchRoles();
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Xoá thất bại');
    }
  };

  // ══════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════
  return (
    <PageContainer>
      <PageHeader
        title="Quản lý vai trò & phân quyền"
        subtitle="Chọn vai trò ở cột bên trái, sau đó tick các quyền mong muốn"
        extra={
          <>
            <Button icon={<KeyOutlined />} onClick={() => navigate('/admin/permissions')}>
              Quản lý Permissions
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                fetchRoles();
                fetchPermissions();
                if (selectedRole) loadRolePerms(selectedRole);
                toast.success('Đã làm mới');
              }}
            >
              Làm mới
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreateRole}>
              Tạo vai trò
            </Button>
          </>
        }
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '280px 1fr',
          gap: 16,
          minHeight: 'calc(100vh - 220px)',
        }}
      >
        {/* ═══════ LEFT: ROLES ═══════ */}
        <Card
          title={<span>Vai trò ({roles.length})</span>}
          bodyStyle={{ padding: 8, height: '100%', overflowY: 'auto' }}
          style={{ height: '100%', overflow: 'hidden' }}
        >
          {rolesLoading && roles.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 32 }}><Spin /></div>
          ) : roles.length === 0 ? (
            <Empty description="Chưa có vai trò nào" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {roles.map((r) => {
                const active = selectedRole?.id === r.id;
                return (
                  <div
                    key={r.id}
                    onClick={() => handleSelectRole(r)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '10px 12px',
                      borderRadius: 8,
                      cursor: 'pointer',
                      background: active ? '#e6f4ff' : 'transparent',
                      border: active ? '1px solid #91caff' : '1px solid transparent',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (!active) e.currentTarget.style.background = '#f8fafc';
                    }}
                    onMouseLeave={(e) => {
                      if (!active) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <SafetyOutlined
                      style={{ color: active ? '#1677ff' : '#94a3b8', flexShrink: 0 }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: active ? 700 : 600,
                          color: active ? '#1677ff' : '#0f172a',
                          lineHeight: 1.3,
                        }}
                      >
                        {r.code}
                      </div>
                      {r.description && (
                        <div
                          style={{
                            fontSize: 11,
                            color: '#64748b',
                            marginTop: 2,
                            lineHeight: 1.3,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {r.description}
                        </div>
                      )}
                    </div>
                    <Space size={0} onClick={(e) => e.stopPropagation()}>
                      <Tooltip title="Sửa">
                        <Button
                          type="text"
                          size="small"
                          icon={<EditOutlined />}
                          onClick={() => openEditRole(r)}
                        />
                      </Tooltip>
                      <Popconfirm
                        title="Xoá vai trò?"
                        description={r.code}
                        okText="Xoá"
                        cancelText="Huỷ"
                        okButtonProps={{ danger: true }}
                        onConfirm={() => handleDeleteRole(r)}
                      >
                        <Tooltip title="Xoá">
                          <Button
                            type="text"
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                          />
                        </Tooltip>
                      </Popconfirm>
                    </Space>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* ═══════ RIGHT: PERMISSIONS ═══════ */}
        <Card
          bodyStyle={{
            padding: 0,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
          }}
          style={{ height: '100%', overflow: 'hidden' }}
        >
          {!selectedRole ? (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#94a3b8',
                padding: 40,
              }}
            >
              <SafetyOutlined style={{ fontSize: 42, marginBottom: 12, opacity: 0.4 }} />
              <div style={{ fontSize: 14, fontWeight: 600 }}>Chọn một vai trò bên trái</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>để xem & gán quyền</div>
            </div>
          ) : (
            <>
              {/* ── Header ── */}
              <div
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  background: '#fafbff',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: '#0f172a',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <SafetyOutlined style={{ color: '#1677ff' }} />
                    <span>{selectedRole.code}</span>
                    {dirty && (
                      <Tag
                        color="orange"
                        style={{ margin: 0, fontSize: 11, borderRadius: 10 }}
                      >
                        Chưa lưu
                      </Tag>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                    Đang bật <b>{selectedPermIds.size}</b> / {allPerms.length} quyền
                    {disabledPermIds.size > 0 && (
                      <>
                        {' · '}
                        <Tag
                          color="default"
                          style={{ margin: 0, fontSize: 10.5, lineHeight: '16px' }}
                        >
                          {disabledPermIds.size} đã tắt
                        </Tag>
                      </>
                    )}
                    {selectedRole.description && ` · ${selectedRole.description}`}
                  </div>
                </div>
                <Space>
                  <Button
                    icon={<UndoOutlined />}
                    onClick={handleCancel}
                    disabled={!dirty || saving}
                  >
                    Huỷ
                  </Button>
                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    onClick={handleSave}
                    loading={saving}
                    disabled={!dirty}
                  >
                    Lưu
                  </Button>
                </Space>
              </div>

              {/* ── Body: 2 sub-columns ── */}
              <div
                style={{
                  flex: 1,
                  minHeight: 0,
                  display: 'grid',
                  gridTemplateColumns: '240px 1fr',
                }}
              >
                {/* Module list */}
                <div
                  style={{
                    borderRight: '1px solid #e2e8f0',
                    display: 'flex',
                    flexDirection: 'column',
                    minHeight: 0,
                  }}
                >
                  <div style={{ padding: 8, borderBottom: '1px solid #f1f5f9' }}>
                    <Input
                      size="small"
                      prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                      placeholder="Tìm module..."
                      value={moduleSearch}
                      onChange={(e) => setModuleSearch(e.target.value)}
                      allowClear
                    />
                  </div>
                  <div style={{ flex: 1, overflowY: 'auto', padding: 4 }}>
                    {permsLoading ? (
                      <div style={{ textAlign: 'center', padding: 24 }}><Spin /></div>
                    ) : filteredModules.length === 0 ? (
                      <Empty
                        description="Không có module"
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        style={{ marginTop: 24 }}
                      />
                    ) : (
                      filteredModules.map(([mod]) => {
                        const counts = countByModule.get(mod) ?? {
                          selected: 0,
                          total: 0,
                        };
                        const isActive = activeModule === mod;
                        const full = counts.selected === counts.total && counts.total > 0;
                        const partial = counts.selected > 0 && !full;
                        return (
                          <div
                            key={mod}
                            onClick={() => {
                              setActiveModule(mod);
                              setPermSearch('');
                            }}
                            style={{
                              padding: '8px 10px',
                              borderRadius: 6,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              marginBottom: 2,
                              background: isActive ? '#e6f4ff' : 'transparent',
                            }}
                          >
                            <span
                              style={{
                                flex: 1,
                                minWidth: 0,
                                fontSize: 12.5,
                                fontWeight: isActive ? 700 : 500,
                                color: isActive ? '#1677ff' : '#334155',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {mod}
                            </span>
                            <Tag
                              color={full ? 'green' : partial ? 'orange' : 'default'}
                              style={{
                                margin: 0,
                                fontSize: 10.5,
                                lineHeight: '16px',
                                padding: '0 6px',
                              }}
                            >
                              {counts.selected}/{counts.total}
                            </Tag>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Permissions of active module */}
                <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                  <div
                    style={{
                      padding: '10px 14px',
                      borderBottom: '1px solid #f1f5f9',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      flexWrap: 'wrap',
                    }}
                  >
                    <Checkbox
                      checked={currentModuleAllChecked}
                      indeterminate={currentModuleIndeterminate}
                      onChange={(e) => toggleModuleAll(e.target.checked)}
                      disabled={loadingRolePerms || currentModulePerms.length === 0}
                    >
                      <span style={{ fontWeight: 600, fontSize: 12.5 }}>
                        {activeModule || '—'}
                      </span>
                      <span style={{ color: '#94a3b8', fontSize: 11, marginLeft: 6 }}>
                        ({currentModuleSelectedCount}/{currentModulePerms.length})
                      </span>
                    </Checkbox>
                    <div style={{ flex: 1 }} />
                    <Input
                      size="small"
                      prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                      placeholder="Tìm theo mô tả hoặc endpoint..."
                      value={permSearch}
                      onChange={(e) => setPermSearch(e.target.value)}
                      allowClear
                      style={{ width: 260 }}
                    />
                  </div>

                  <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
                    {loadingRolePerms ? (
                      <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
                    ) : filteredCurrentPerms.length === 0 ? (
                      <Empty
                        description={
                          permSearch
                            ? 'Không có quyền nào khớp'
                            : 'Module này chưa có quyền'
                        }
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        style={{ marginTop: 40 }}
                      />
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {filteredCurrentPerms.map((p) => {
                          const checked = selectedPermIds.has(p.id);
                          return (
                            <Tooltip
                              key={p.id}
                              title={
                                <span style={{ fontFamily: 'monospace', fontSize: 12 }}>
                                  {p.method} {p.endpointPattern}
                                </span>
                              }
                              placement="topLeft"
                              mouseEnterDelay={0.4}
                            >
                              <label
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 10,
                                  padding: '8px 10px',
                                  borderRadius: 6,
                                  cursor: 'pointer',
                                  background: checked ? '#f0f7ff' : 'transparent',
                                  border: '1px solid',
                                  borderColor: checked ? '#bae0ff' : 'transparent',
                                  transition: 'all 0.15s',
                                }}
                              >
                                <Checkbox
                                  checked={checked}
                                  onChange={(e) => togglePerm(p.id, e.target.checked)}
                                />
                                <Tag
                                  color={METHOD_COLOR[p.method] || 'default'}
                                  style={{
                                    margin: 0,
                                    fontWeight: 700,
                                    minWidth: 58,
                                    textAlign: 'center',
                                    fontSize: 11,
                                  }}
                                >
                                  {p.method}
                                </Tag>
                                <span
                                  style={{
                                    fontSize: 13,
                                    color: '#0f172a',
                                    fontWeight: 500,
                                    flex: 1,
                                    minWidth: 0,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {p.description || p.endpointPattern}
                                </span>
                                {disabledPermIds.has(p.id) && !checked && (
                                  <Tag
                                    style={{
                                      margin: 0,
                                      fontSize: 10,
                                      lineHeight: '16px',
                                      background: '#f1f5f9',
                                      color: '#64748b',
                                      border: '1px dashed #cbd5e1',
                                    }}
                                  >
                                    đã tắt
                                  </Tag>
                                )}
                              </label>
                            </Tooltip>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </Card>
      </div>

      {/* ── Modal tạo/sửa role ── */}
      <Modal
        title={editingRole ? `Sửa vai trò #${editingRole.id}` : 'Tạo vai trò mới'}
        open={roleModalOpen}
        onCancel={() => setRoleModalOpen(false)}
        onOk={handleSubmitRole}
        confirmLoading={roleFormSaving}
        okText={editingRole ? 'Cập nhật' : 'Tạo mới'}
        cancelText="Huỷ"
        destroyOnClose
      >
        <Form form={roleForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="code"
            label="Mã vai trò"
            rules={[
              { required: true, message: 'Vui lòng nhập mã vai trò' },
              { max: 50, message: 'Tối đa 50 ký tự' },
              { pattern: /^[A-Z_]+$/, message: 'Chỉ chữ in hoa và dấu _' },
            ]}
          >
            <Input placeholder="VD: ADMIN, INSTRUCTOR, STUDENT" />
          </Form.Item>
          <Form.Item name="description" label="Mô tả" rules={[{ max: 255 }]}>
            <Input.TextArea rows={3} placeholder="Mô tả vai trò này..." />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default RoleManagePage;