// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Account Group Master Page
// ═══════════════════════════════════════════════════════════════

import React, { useCallback, useEffect, useState } from 'react';
import { FolderTree, Plus, Save, Trash2, Lock } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useIpc } from '../../hooks/useIpc';
import { useActiveCompany } from '../../hooks/useActiveCompany';
import { Button, Input, Badge, FormSelect, useToast } from '../../components/ui';
import { accountGroupSchema, AccountGroupFormData } from './account-group.schema';
import type { IAccountGroup, IAccountGroupTreeNode } from './account-group.types';

const TreeNode: React.FC<{
  node: IAccountGroupTreeNode;
  selectedId: number | null;
  onSelect: (id: number) => void;
  depth?: number;
}> = ({ node, selectedId, onSelect, depth = 0 }) => (
  <>
    <button
      type="button"
      onClick={() => onSelect(node.id)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        width: '100%',
        padding: '6px 8px',
        paddingLeft: `${8 + depth * 16}px`,
        border: 'none',
        background: selectedId === node.id ? 'var(--color-accent-light)' : 'transparent',
        borderRadius: 'var(--radius-sm)',
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: selectedId === node.id ? 600 : 400,
        color: 'var(--color-text-primary)',
        textAlign: 'left',
      }}
    >
      {node.isGlobal && <Lock size={12} color="var(--color-text-muted)" />}
      <span>{node.groupName}</span>
      <Badge variant="default" style={{ marginLeft: 'auto', fontSize: '9px' }}>{node.nature}</Badge>
    </button>
    {node.children.map((child) => (
      <TreeNode key={child.id} node={child} selectedId={selectedId} onSelect={onSelect} depth={depth + 1} />
    ))}
  </>
);

export const AccountGroupPage: React.FC = () => {
  const { showToast } = useToast();
  const { activeCompany, companyId, isReady } = useActiveCompany();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isNew, setIsNew] = useState(false);

  const { data: tree, invoke: fetchTree } = useIpc<IAccountGroupTreeNode[]>('account-group:tree');
  const { data: groups, invoke: fetchList } = useIpc<IAccountGroup[]>('account-group:list');
  const { invoke: fetchGroup } = useIpc<IAccountGroup>('account-group:get');
  const { invoke: createGroup, loading: creating } = useIpc<IAccountGroup>('account-group:create');
  const { invoke: updateGroup, loading: updating } = useIpc<IAccountGroup>('account-group:update');
  const { invoke: deleteGroup } = useIpc('account-group:delete');
  const { invoke: seedGroups } = useIpc('account-group:seed');

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<AccountGroupFormData>({
    resolver: zodResolver(accountGroupSchema),
    defaultValues: { groupName: '', nature: 'Assets', parentGroupId: null, sortOrder: 0 },
  });

  const refresh = useCallback(async () => {
    if (!companyId) return;
    await Promise.all([fetchTree(companyId), fetchList(companyId)]);
  }, [companyId, fetchTree, fetchList]);

  useEffect(() => {
    if (!companyId) return;
    const init = async () => {
      const listRes = await fetchList(companyId);
      if (listRes.success && (!listRes.data || listRes.data.length === 0)) {
        const seedRes = await seedGroups(companyId);
        if (seedRes.success) {
          await refresh();
        }
        return;
      }
      await refresh();
    };
    init();
  }, [companyId, fetchList, seedGroups, refresh]);

  const loadGroup = async (id: number) => {
    if (!companyId) return;
    const res = await fetchGroup({ id, companyId });
    if (res.success && res.data) {
      const g = res.data;
      reset({
        groupName: g.groupName,
        nature: g.nature as AccountGroupFormData['nature'],
        parentGroupId: g.parentGroupId,
        sortOrder: g.sortOrder,
      });
      setSelectedId(id);
      setIsNew(false);
    }
  };

  const handleNew = () => {
    setSelectedId(null);
    setIsNew(true);
    reset({ groupName: '', nature: 'Assets', parentGroupId: null, sortOrder: 0 });
  };

  const onSubmit = async (data: AccountGroupFormData) => {
    if (!companyId) return;
    const payload = { ...data, groupName: data.groupName.trim() };
    const res = isNew || !selectedId
      ? await createGroup({ companyId, data: payload })
      : await updateGroup({ id: selectedId, companyId, data: payload });
    if (res.success) {
      showToast(isNew ? 'Group created' : 'Group updated', 'success');
      setIsNew(false);
      if (res.data) setSelectedId(res.data.id);
      await refresh();
    } else {
      showToast(res.error || 'Save failed', 'error');
    }
  };

  const handleDelete = async () => {
    if (!companyId || !selectedId) return;
    if (!confirm('Permanently delete this account group? This cannot be undone.')) return;
    const res = await deleteGroup({ id: selectedId, companyId });
    if (res.success) {
      showToast('Group deleted', 'success');
      handleNew();
      await refresh();
    } else {
      showToast(res.error || 'Delete failed', 'error');
    }
  };

  const handleSeed = async () => {
    if (!companyId) return;
    const res = await seedGroups(companyId);
    if (res.success) {
      showToast(res.message || 'Default chart of accounts loaded', 'success');
      await refresh();
    } else {
      showToast(res.error || 'Failed to load default chart of accounts', 'error');
    }
  };

  if (!isReady) {
    return <p style={{ color: 'var(--color-text-secondary)' }}>Select a company to manage account groups.</p>;
  }

  const selectedGroup = groups?.find((g) => g.id === selectedId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-title)', fontWeight: 700, color: 'var(--color-primary)' }}>Account Group Master</h1>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: '4px' }}>Chart of accounts for {activeCompany?.companyName}</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {(!groups || groups.length === 0) && (
            <Button variant="secondary" onClick={handleSeed}>Load Default Chart</Button>
          )}
          <Button variant="primary" onClick={handleNew} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={16} /> New Group
          </Button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 'var(--spacing-md)', minHeight: '480px' }}>
        {/* Tree */}
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '12px', overflow: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px', fontWeight: 600, fontSize: '13px' }}>
            <FolderTree size={16} /> Group Hierarchy
          </div>
          {(tree || []).map((node) => (
            <TreeNode key={node.id} node={node} selectedId={selectedId} onSelect={loadGroup} />
          ))}
          {(!tree || tree.length === 0) && (
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>No groups yet. Load the default chart or create one.</p>
          )}
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '24px' }}
        >
          <h2 style={{ fontSize: 'var(--text-heading)', fontWeight: 600, marginBottom: '16px' }}>
            {isNew ? 'New Account Group' : selectedGroup ? `Edit: ${selectedGroup.groupName}` : 'Select a group'}
          </h2>

          {selectedGroup?.isGlobal && (
            <div style={{ padding: '8px 12px', background: 'var(--color-warning-light)', borderRadius: 'var(--radius-sm)', marginBottom: '16px', fontSize: '13px' }}>
              System reserved group — name cannot be changed.
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Input label="Group Name" error={errors.groupName?.message} disabled={selectedGroup?.isGlobal && !isNew} {...register('groupName')} />
            <FormSelect
              control={control}
              name="nature"
              label="Nature *"
              options={[
                { value: 'Assets', label: 'Assets' },
                { value: 'Liabilities', label: 'Liabilities' },
                { value: 'Income', label: 'Income' },
                { value: 'Expense', label: 'Expense' },
              ]}
              searchable={false}
              clearable={false}
            />
            <FormSelect
              control={control}
              name="parentGroupId"
              label="Parent Group"
              placeholder="— Root (no parent) —"
              options={(groups || [])
                .filter((g) => g.id !== selectedId)
                .map((g) => ({
                  value: String(g.id),
                  label: g.groupName,
                }))}
              toValue={(v) => (v === '' ? null : Number(v))}
              toString={(v) => (v == null ? '' : String(v))}
            />
            <Input label="Sort Order" type="number" error={errors.sortOrder?.message} {...register('sortOrder', { valueAsNumber: true })} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '24px' }}>
            {selectedId && !selectedGroup?.isGlobal && (
              <Button variant="danger" type="button" onClick={handleDelete} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Trash2 size={14} /> Delete
              </Button>
            )}
            <Button variant="primary" type="submit" loading={creating || updating} disabled={!isNew && !selectedId} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Save size={14} /> Save
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
