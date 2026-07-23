// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Super Admin Console Dashboard View (Tabs: Console & Staff Directory)
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import { useIpc } from '../../hooks/useIpc';
import { useAuthStore } from '../../state/auth-store';
import { useCompanyStore } from '../../state/company-store';
import { Button, useToast, Input } from '../../components/ui';
import { DataGrid } from '../../components/ui/DataGrid';
import { PAGE_CATEGORIES, getPagesByCategory } from '../../config/page-registry';
import { 
  ShieldAlert, User, KeyRound, Clock, 
  Database, Users, Activity, PowerOff,
  UserPlus, Search, Building, Lock, Unlock, Trash2
} from 'lucide-react';

export const AdminConsolePage: React.FC = () => {
  const { showToast } = useToast();
  const activeCompany = useCompanyStore((s) => s.activeCompany);
  const authUser = useAuthStore((s) => s.user);

  // Tab State
  const [activeTab, setActiveTab] = useState<'console' | 'staff' | 'permissions'>('console');

  // IPC Hooks
  const { invoke: getProfile } = useIpc<any>('admin:get-profile');
  const { invoke: updateProfile, loading: updatingProfile } = useIpc<any>('admin:update-profile');
  const { invoke: changePassword, loading: changingPassword } = useIpc<any>('admin:change-password');
  const { invoke: getMetrics } = useIpc<any>('admin:get-metrics');
  const { invoke: terminateSession } = useIpc<any>('admin:terminate-session');
  
  // Phase 14.2 IPC Hooks
  const { invoke: listUsers } = useIpc<any>('admin:list-users');
  const { invoke: createUser } = useIpc<any>('admin:create-user');
  const { invoke: updateUser } = useIpc<any>('admin:update-user');
  const { invoke: changeUserPassword } = useIpc<any>('admin:change-user-password');
  const { invoke: toggleUserLock } = useIpc<any>('admin:toggle-user-lock');
  const { invoke: toggleUserStatus } = useIpc<any>('admin:toggle-user-status');
  const { invoke: deleteUser } = useIpc<any>('admin:delete-user');
  const { invoke: getCompanies } = useIpc<any>('company:list');

  // Phase 14.4 IPC Hooks
  const { invoke: getUserPermissions } = useIpc<any>('admin:get-user-permissions');
  const { invoke: saveUserPermissions, loading: savingPerms } = useIpc<any>('admin:save-user-permissions');
  const { invoke: copyUserPermissions } = useIpc<any>('admin:copy-user-permissions');

  // Phase 14.5 IPC Hooks
  const { invoke: getUserModulePermissions } = useIpc<any>('admin:get-user-module-permissions');
  const { invoke: saveUserModulePermissions, loading: savingModulePerms } = useIpc<any>('admin:save-user-module-permissions');

  // Component States
  const [profile, setProfile] = useState<any | null>(null);
  const [metrics, setMetrics] = useState<any | null>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [companiesList, setCompaniesList] = useState<any[]>([]);

  // Form States (Super Admin)
  const [userIdHandle, setUserIdHandle] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');

  // Search & Filter States (Staff list)
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');

  // Modal / Form States (Staff user Add/Edit/Password Reset)
  const [showUserModal, setShowUserModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  
  // User Form fields
  const [staffEmpCode, setStaffEmpCode] = useState('');
  const [staffUsername, setStaffUsername] = useState('');
  const [staffFullName, setStaffFullName] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffMobile, setStaffMobile] = useState('');
  const [staffDept, setStaffDept] = useState('');
  const [staffDesg, setStaffDesg] = useState('');
  const [staffRemarks, setStaffRemarks] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [staffCompanies, setStaffCompanies] = useState<number[]>([]);

  // Reset User Password Modal state
  const [showPassResetModal, setShowPassResetModal] = useState(false);
  const [resetPassUserId, setResetPassUserId] = useState<number | null>(null);
  const [resetPassNewVal, setResetPassNewVal] = useState('');

  // Page Access Control (Permissions Tab) State
  const [permSelectedUserId, setPermSelectedUserId] = useState<number | null>(null);
  const [permAllowedPages, setPermAllowedPages] = useState<string[]>([]);
  const [permModuleActions, setPermModuleActions] = useState<Record<string, Record<string, boolean>>>({});
  const [copyFromUserId, setCopyFromUserId] = useState<number | null>(null);

  const loadProfile = React.useCallback(async () => {
    if (!authUser?.id) return;
    try {
      const pRes = await getProfile({ userId: authUser.id });
      if (pRes.success && pRes.data) {
        setProfile(pRes.data);
        setUserIdHandle(pRes.data.userIdHandle);
        setFullName(pRes.data.fullName);
        setEmail(pRes.data.email);
        setMobile(pRes.data.mobile || '');
      }
    } catch (err) {
      console.error('Failed to load admin profile:', err);
    }
  }, [authUser?.id, getProfile]);

  const loadMetrics = React.useCallback(async () => {
    if (!authUser?.id || !activeCompany?.id) return;
    try {
      const mRes = await getMetrics({ companyId: activeCompany.id, userId: authUser.id });
      if (mRes.success && mRes.data) {
        setMetrics(mRes.data);
      }
    } catch (err) {
      console.error('Failed to load admin metrics:', err);
    }
  }, [authUser?.id, activeCompany?.id, getMetrics]);

  const loadUsers = React.useCallback(async () => {
    if (!authUser?.id) return;
    try {
      const uRes = await listUsers({
        adminUserId: authUser.id,
        filters: {
          search: searchTerm || undefined,
          status: statusFilter || undefined,
          companyId: companyFilter ? Number(companyFilter) : undefined,
        }
      });
      if (uRes.success && uRes.data) {
        setUsersList(uRes.data);
      }
    } catch (err) {
      console.error('Failed to load staff list:', err);
    }
  }, [authUser?.id, searchTerm, statusFilter, companyFilter, listUsers]);

  const loadCompanies = React.useCallback(async () => {
    try {
      const res = await getCompanies();
      if (res.success && res.data) {
        setCompaniesList(res.data);
      }
    } catch (err) {
      console.error('Failed to load company list:', err);
    }
  }, [getCompanies]);

  useEffect(() => {
    loadProfile();
    loadMetrics();
    loadCompanies();
  }, [loadProfile, loadMetrics, loadCompanies]);

  const loadUserPermissions = React.useCallback(async (targetUserId: number) => {
    if (!authUser?.id) return;
    try {
      const res = await getUserPermissions({ adminUserId: authUser.id, targetUserId });
      if (res.success && res.data) {
        setPermAllowedPages(res.data);
      }

      const modRes = await getUserModulePermissions({ adminUserId: authUser.id, targetUserId });
      if (modRes.success && modRes.data) {
        const map: Record<string, Record<string, boolean>> = {};
        modRes.data.forEach((item: any) => {
          if (!map[item.moduleCode]) map[item.moduleCode] = {};
          map[item.moduleCode][item.actionCode] = item.isAllowed;
        });
        setPermModuleActions(map);
      }
    } catch (err) {
      console.error('Failed to load user permissions:', err);
    }
  }, [authUser?.id, getUserPermissions, getUserModulePermissions]);

  useEffect(() => {
    if (activeTab === 'staff' || activeTab === 'permissions') {
      loadUsers();
    }
  }, [activeTab, loadUsers]);

  // Polling for metrics
  useEffect(() => {
    const timer = setInterval(() => {
      loadMetrics();
      if (activeTab === 'staff') {
        loadUsers();
      }
    }, 10000);
    return () => clearInterval(timer);
  }, [loadMetrics, loadUsers, activeTab]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) {
      showToast('Name and Email are required fields.', 'warning');
      return;
    }
    const res = await updateProfile({
      userId: authUser!.id,
      userIdHandle,
      fullName,
      email,
      mobile,
    });
    if (res.success) {
      showToast('Super Admin profile updated successfully!', 'success');
      loadProfile();
    } else {
      showToast(res.error || 'Failed to update profile settings.', 'error');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPass || !newPass || !confirmPass) {
      showToast('Please fill all password fields.', 'warning');
      return;
    }
    if (newPass !== confirmPass) {
      showToast('New passwords do not match.', 'error');
      return;
    }
    const res = await changePassword({
      userId: authUser!.id,
      currentPass,
      newPass,
    });
    if (res.success) {
      showToast('Password updated successfully!', 'success');
      setCurrentPass('');
      setNewPass('');
      setConfirmPass('');
    } else {
      showToast(res.error || 'Incorrect current password.', 'error');
    }
  };

  const handleKillSession = async (sessionId: number) => {
    const res = await terminateSession({
      userId: authUser!.id,
      sessionId,
    });
    if (res.success) {
      showToast('User session terminated successfully.', 'success');
      loadMetrics();
    } else {
      showToast(res.error || 'Failed to terminate session.', 'error');
    }
  };

  const handleToggleLockStatus = async (userId: number) => {
    const res = await toggleUserLock({
      adminUserId: authUser!.id,
      userId,
    });
    if (res.success) {
      showToast('User status updated successfully.', 'success');
      loadUsers();
    } else {
      showToast(res.error || 'Failed to toggle account status.', 'error');
    }
  };

  const handleToggleActiveState = async (userId: number, currentStatus: string) => {
    const nextStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const res = await toggleUserStatus({
      adminUserId: authUser!.id,
      userId,
      status: nextStatus,
    });
    if (res.success) {
      showToast('User active state updated.', 'success');
      loadUsers();
    } else {
      showToast(res.error || 'Failed to update status.', 'error');
    }
  };

  const handleDeleteUserAccount = async (userId: number) => {
    if (!window.confirm('Are you sure you want to delete this staff user profile permanently?')) return;
    const res = await deleteUser({
      adminUserId: authUser!.id,
      userId,
    });
    if (res.success) {
      showToast('User account deleted successfully.', 'success');
      loadUsers();
    } else {
      showToast(res.error || 'Failed to delete user account.', 'error');
    }
  };

  // User Add/Edit modal operations
  const openCreateModal = () => {
    setModalMode('create');
    setSelectedUserId(null);
    setStaffEmpCode('');
    setStaffUsername('');
    setStaffFullName('');
    setStaffEmail('');
    setStaffMobile('');
    setStaffDept('');
    setStaffDesg('');
    setStaffRemarks('');
    setStaffPassword('');
    setStaffCompanies([]);
    setShowUserModal(true);
  };

  const openEditModal = (user: any) => {
    setModalMode('edit');
    setSelectedUserId(user.id);
    setStaffEmpCode(user.employeeCode);
    setStaffUsername(user.userIdHandle);
    setStaffFullName(user.fullName);
    setStaffEmail(user.email);
    setStaffMobile(user.mobile);
    setStaffDept(user.department);
    setStaffDesg(user.designation);
    setStaffRemarks(user.remarks);
    setStaffPassword('');
    setStaffCompanies(user.assignedCompanies.map((c: any) => c.id));
    setShowUserModal(true);
  };

  const handleSaveStaffForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffUsername.trim() || !staffFullName.trim()) {
      showToast('Username and Full Name are required.', 'warning');
      return;
    }

    if (modalMode === 'create' && !staffPassword) {
      showToast('Password is required when creating a new user account.', 'warning');
      return;
    }

    const emailToSubmit = staffEmail || (staffUsername.trim() + '@diamo.local');

    const payload: any = {
      employeeCode: staffEmpCode,
      fullName: staffFullName,
      userIdHandle: staffUsername,
      email: emailToSubmit,
      mobile: staffMobile,
      department: staffDept,
      designation: staffDesg,
      remarks: staffRemarks,
      assignedCompanyIds: staffCompanies,
    };

    if (modalMode === 'create') {
      payload.passwordPlain = staffPassword;
      const res = await createUser({
        adminUserId: authUser!.id,
        userPayload: payload,
      });
      if (res.success) {
        showToast('New user account registered successfully.', 'success');
        setShowUserModal(false);
        loadUsers();
      } else {
        showToast(res.error || 'Failed to create user.', 'error');
      }
    } else {
      const res = await updateUser({
        adminUserId: authUser!.id,
        userId: selectedUserId!,
        userPayload: payload,
      });
      if (res.success) {
        showToast('User profile updated successfully.', 'success');
        setShowUserModal(false);
        loadUsers();
      } else {
        showToast(res.error || 'Failed to update user.', 'error');
      }
    }
  };

  const toggleCompanySelection = (id: number) => {
    if (staffCompanies.includes(id)) {
      setStaffCompanies(staffCompanies.filter((cid) => cid !== id));
    } else {
      setStaffCompanies([...staffCompanies, id]);
    }
  };

  // Password reset operations
  const openPassResetModal = (userId: number) => {
    setResetPassUserId(userId);
    setResetPassNewVal('');
    setShowPassResetModal(true);
  };

  const handleSaveUserPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPassNewVal || resetPassNewVal.length < 6) {
      showToast('Password must be at least 6 characters.', 'warning');
      return;
    }
    const res = await changeUserPassword({
      adminUserId: authUser!.id,
      userId: resetPassUserId!,
      newPass: resetPassNewVal,
    });
    if (res.success) {
      showToast('Staff user password reset successfully.', 'success');
      setShowPassResetModal(false);
    } else {
      showToast(res.error || 'Failed to reset password.', 'error');
    }
  };

  // ─── Phase 14.4: Page Access Control Handlers ─────────────────

  const handleSelectUserForPerms = (userId: number) => {
    setPermSelectedUserId(userId);
    loadUserPermissions(userId);
  };

  const handleTogglePagePerm = (uri: string) => {
    if (permAllowedPages.includes(uri)) {
      setPermAllowedPages(permAllowedPages.filter((p) => p !== uri));
    } else {
      setPermAllowedPages([...permAllowedPages, uri]);
    }
  };

  const handleToggleCategoryPerms = (category: string) => {
    const categoryPages = getPagesByCategory(category).map((p) => p.uri);
    const allSelected = categoryPages.every((uri) => permAllowedPages.includes(uri));

    if (allSelected) {
      // Clear category
      setPermAllowedPages(permAllowedPages.filter((p) => !categoryPages.includes(p)));
    } else {
      // Select all in category
      const newPages = new Set([...permAllowedPages, ...categoryPages]);
      setPermAllowedPages(Array.from(newPages));
    }
  };

  const handleToggleModuleAction = (moduleCode: string, actionCode: string) => {
    setPermModuleActions((prev) => {
      const mod = prev[moduleCode] || {};
      const current = mod[actionCode] !== false; // default true if unconfigured
      return {
        ...prev,
        [moduleCode]: {
          ...mod,
          [actionCode]: !current,
        },
      };
    });
  };

  const handleSavePermissions = async () => {
    if (!permSelectedUserId) {
      showToast('Please select a user first.', 'warning');
      return;
    }

    // Save page permissions
    const res = await saveUserPermissions({
      adminUserId: authUser!.id,
      targetUserId: permSelectedUserId,
      allowedPages: permAllowedPages,
    });

    // Flatten permModuleActions map into array
    const actionList: { moduleCode: string; actionCode: string; isAllowed: boolean }[] = [];
    Object.entries(permModuleActions).forEach(([mCode, actions]) => {
      Object.entries(actions).forEach(([aCode, isAllowed]) => {
        actionList.push({ moduleCode: mCode, actionCode: aCode, isAllowed });
      });
    });

    // Save module action permissions
    const modRes = await saveUserModulePermissions({
      adminUserId: authUser!.id,
      targetUserId: permSelectedUserId,
      permissions: actionList,
    });

    if (res.success && modRes.success) {
      showToast(`Saved page & action permissions successfully!`, 'success');
    } else {
      showToast(res.error || modRes.error || 'Failed to save permissions.', 'error');
    }
  };

  const handleCopyPermissions = async () => {
    if (!permSelectedUserId || !copyFromUserId) {
      showToast('Please select both a source user and a target user.', 'warning');
      return;
    }
    const res = await copyUserPermissions({
      adminUserId: authUser!.id,
      fromUserId: copyFromUserId,
      toUserId: permSelectedUserId,
    });
    if (res.success) {
      showToast(`Copied ${res.data.copiedCount} permissions successfully!`, 'success');
      loadUserPermissions(permSelectedUserId);
    } else {
      showToast(res.error || 'Failed to copy permissions.', 'error');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '24px', width: '100%' }}>
      
      {/* Title Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: '#e0f2fe', padding: '10px', borderRadius: '8px', color: '#0369a1' }}>
            <KeyRound size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: 'var(--text-title)', fontWeight: 700, color: 'var(--color-primary)' }}>
              Super Admin Access Control Console
            </h1>
            <p style={{ fontSize: 'var(--text-body)', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
              Administrative dashboard console to configure root properties and manage employee access mappings.
            </p>
          </div>
        </div>

        {/* Tab Buttons */}
        <div style={{ display: 'flex', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '4px' }}>
          <button 
            onClick={() => setActiveTab('console')}
            style={{
              padding: '6px 16px',
              border: 0,
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '13px',
              background: activeTab === 'console' ? 'var(--color-primary)' : 'transparent',
              color: activeTab === 'console' ? '#ffffff' : 'var(--color-text-secondary)',
            }}
          >
            Console Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('staff')}
            style={{
              padding: '6px 16px',
              border: 0,
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '13px',
              background: activeTab === 'staff' ? 'var(--color-primary)' : 'transparent',
              color: activeTab === 'staff' ? '#ffffff' : 'var(--color-text-secondary)',
            }}
          >
            Staff & Employees Directory
          </button>
          <button 
            onClick={() => setActiveTab('permissions')}
            style={{
              padding: '6px 16px',
              border: 0,
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '13px',
              background: activeTab === 'permissions' ? 'var(--color-primary)' : 'transparent',
              color: activeTab === 'permissions' ? '#ffffff' : 'var(--color-text-secondary)',
            }}
          >
            Page Access Controls
          </button>
        </div>
      </div>

      {activeTab === 'console' ? (
        <>
          {/* Metrics Row */}
          {metrics && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              
              <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ background: '#eff6ff', padding: '12px', borderRadius: '8px', color: '#2563eb' }}>
                  <Users size={22} />
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', display: 'block' }}>TOTAL USER LOGINS</span>
                  <span style={{ fontSize: '20px', fontWeight: 700 }}>{metrics.totalUsers}</span>
                </div>
              </div>

              <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ background: '#fef2f2', padding: '12px', borderRadius: '8px', color: '#dc2626' }}>
                  <ShieldAlert size={22} />
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', display: 'block' }}>LOCKED OUT ACCOUNTS</span>
                  <span style={{ fontSize: '20px', fontWeight: 700, color: metrics.lockedUsers > 0 ? '#dc2626' : 'inherit' }}>{metrics.lockedUsers}</span>
                </div>
              </div>

              <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ background: '#f0fdf4', padding: '12px', borderRadius: '8px', color: '#16a34a' }}>
                  <Activity size={22} />
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', display: 'block' }}>CONCURRENT ACTIVE SESSIONS</span>
                  <span style={{ fontSize: '20px', fontWeight: 700 }}>{metrics.activeSessions}</span>
                </div>
              </div>

              <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ background: '#fffbeb', padding: '12px', borderRadius: '8px', color: '#d97706' }}>
                  <Database size={22} />
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', display: 'block' }}>LAST SUCCESSFUL BACKUP</span>
                  <span style={{ fontSize: '13px', fontWeight: 700 }}>
                    {metrics.lastBackupTime ? new Date(metrics.lastBackupTime).toLocaleDateString() : 'No backup logs'}
                  </span>
                </div>
              </div>

            </div>
          )}

          {/* Main grids: Profile forms & Sessions control */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            
            {/* Left Side: Profile & Credentials Edit Forms */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Form 1: Profile Settings */}
              <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-primary)' }}>
                  <User size={18} /> Owner Profile Details {profile && `(${profile.userIdHandle})`}
                </h3>
                <hr style={{ border: 0, borderTop: '1px solid var(--color-border)', margin: 0 }} />
                
                <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Login Username</label>
                    <Input value={userIdHandle} onChange={(e) => setUserIdHandle(e.target.value)} />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Full Name</label>
                    <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
                  </div>

                  <Button type="submit" variant="primary" loading={updatingProfile} style={{ marginTop: '6px' }}>
                    Save Profile Details
                  </Button>
                </form>
              </div>

              {/* Form 2: Credentials Password Update */}
              <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-primary)' }}>
                  <KeyRound size={18} /> Administrative Credentials Override
                </h3>
                <hr style={{ border: 0, borderTop: '1px solid var(--color-border)', margin: 0 }} />
                
                <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Current Password</label>
                    <Input type="password" value={currentPass} onChange={(e) => setCurrentPass(e.target.value)} />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>New Password</label>
                    <Input type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Confirm New Password</label>
                    <Input type="password" value={confirmPass} onChange={(e) => setConfirmPass(e.target.value)} />
                  </div>

                  <Button type="submit" variant="primary" loading={changingPassword} style={{ marginTop: '6px' }}>
                    Update Admin Password
                  </Button>
                </form>
              </div>

            </div>

            {/* Right Side: Active Concurrent Sessions List */}
            <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-primary)' }}>
                <Clock size={18} /> Active User Sessions Monitor
              </h3>
              <hr style={{ border: 0, borderTop: '1px solid var(--color-border)', margin: 0 }} />

              {metrics && (
                <DataGrid
                  columns={[
                    { key: 'username', header: 'USER ACCOUNT', width: '160px' },
                    { key: 'ipAddress', header: 'IP ADDRESS', width: '100px' },
                    { key: 'duration', header: 'DURATION', width: '100px' },
                    {
                      key: 'actions',
                      header: 'FORCE LOGOUT',
                      width: '100px',
                      render: (row: any) => (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleKillSession(row.id)} 
                          style={{ color: '#dc2626', display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid var(--color-border)', padding: '4px 8px' }}
                        >
                          <PowerOff size={12} /> Terminate
                        </Button>
                      )
                    }
                  ]}
                  data={metrics.sessions}
                  keyField="id"
                  emptyTitle="No active sessions detected"
                  emptyDescription="No concurrent user logins are currently active."
                />
              )}
            </div>

          </div>
        </>
      ) : activeTab === 'staff' ? (
        /* Staff & Employees Tab Directory view */
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Filters and Search toolbar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexGrow: 1 }}>
              <div style={{ position: 'relative', width: '300px' }}>
                <Input
                  placeholder="Search name, username..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Search size={16} style={{ position: 'absolute', right: '12px', top: '12px', color: 'var(--color-text-secondary)' }} />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ height: '38px', borderRadius: '8px', border: '1px solid var(--color-border)', padding: '0 12px', fontSize: '13px', background: 'transparent' }}
              >
                <option value="">All Statuses</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
                <option value="LOCKED">LOCKED</option>
                <option value="DISABLED">DISABLED</option>
              </select>

              <select
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
                style={{ height: '38px', borderRadius: '8px', border: '1px solid var(--color-border)', padding: '0 12px', fontSize: '13px', background: 'transparent' }}
              >
                <option value="">All Company Assignments</option>
                {companiesList.map((comp) => (
                  <option key={comp.id} value={comp.id}>{comp.companyName}</option>
                ))}
              </select>
            </div>

            <Button variant="primary" onClick={openCreateModal} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UserPlus size={16} /> Add Employee Login
            </Button>
          </div>

          <hr style={{ border: 0, borderTop: '1px solid var(--color-border)', margin: 0 }} />

          {/* User grid */}
          <DataGrid
            columns={[
              { 
                key: 'fullName', 
                header: 'EMPLOYEE NAME', 
                width: '200px',
                render: (row: any) => (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>{row.fullName}</span>
                    {row.isSuperAdmin && (
                      <span style={{ fontSize: '9px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: '#eff6ff', color: '#2563eb', border: '1px solid #dbeafe' }}>
                        Super Admin
                      </span>
                    )}
                  </div>
                )
              },
              { key: 'userIdHandle', header: 'USERNAME', width: '120px' },
              { key: 'designation', header: 'DESIGNATION', width: '120px' },
              { key: 'department', header: 'DEPARTMENT', width: '120px' },
              {
                key: 'assignedCompanies',
                header: 'COMPANY ASSIGNMENTS',
                width: '180px',
                render: (row: any) => (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {row.assignedCompanies.map((c: any) => (
                      <span key={c.id} style={{ fontSize: '10px', background: '#f1f5f9', border: '1px solid var(--color-border)', padding: '2px 6px', borderRadius: '4px' }}>
                        {c.companyName}
                      </span>
                    ))}
                    {row.assignedCompanies.length === 0 && (
                      <span style={{ fontSize: '11px', color: '#dc2626', fontWeight: 600 }}>No assignment</span>
                    )}
                  </div>
                )
              },
              {
                key: 'status',
                header: 'STATUS',
                width: '100px',
                render: (row: any) => (
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: row.status === 'ACTIVE' ? '#ecfdf5' : '#fef2f2',
                    color: row.status === 'ACTIVE' ? '#059669' : '#dc2626',
                  }}>
                    {row.status}
                  </span>
                )
              },
              {
                key: 'actions',
                header: 'ADMIN CONTROLS',
                width: '280px',
                render: (row: any) => {
                  if (row.isSuperAdmin) {
                    return <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Root Admin Account</span>;
                  }
                  return (
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <Button variant="ghost" size="sm" onClick={() => openEditModal(row)} style={{ border: '1px solid var(--color-border)', fontSize: '11px' }}>
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openPassResetModal(row.id)} style={{ border: '1px solid var(--color-border)', fontSize: '11px' }}>
                        Reset Pass
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleToggleLockStatus(row.id)} 
                        style={{ border: '1px solid var(--color-border)', fontSize: '11px', color: row.status === 'LOCKED' ? '#059669' : '#d97706' }}
                      >
                        {row.status === 'LOCKED' ? <Unlock size={11} /> : <Lock size={11} />} {row.status === 'LOCKED' ? 'Unlock' : 'Lock'}
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleToggleActiveState(row.id, row.status)} 
                        style={{ border: '1px solid var(--color-border)', fontSize: '11px' }}
                      >
                        {row.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteUserAccount(row.id)} style={{ color: '#dc2626', border: '1px solid var(--color-border)', fontSize: '11px' }}>
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  );
                }
              }
            ]}
            data={usersList}
            keyField="id"
            emptyTitle="No staff user accounts found"
            emptyDescription="Create a standard staff login credentials mapping to get started."
          />

        </div>
      ) : activeTab === 'permissions' ? (
        /* Page Access Controls Tab view */
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Header & User Selector bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', borderBottom: '1px solid var(--color-border)', paddingBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                Select Staff Operator:
              </label>
              <select
                value={permSelectedUserId || ''}
                onChange={(e) => handleSelectUserForPerms(Number(e.target.value))}
                style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', fontSize: '13px', fontWeight: 600, minWidth: '240px' }}
              >
                <option value="">-- Choose Staff User --</option>
                {usersList.filter(u => !u.isSuperAdmin).map((u) => {
                  const handle = u.username || u.userIdHandle;
                  const handleLabel = handle ? ` (${handle})` : '';
                  return (
                    <option key={u.id} value={u.id}>
                      {u.fullName}{handleLabel}
                    </option>
                  );
                })}
              </select>
            </div>

            {permSelectedUserId && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <select
                    value={copyFromUserId || ''}
                    onChange={(e) => setCopyFromUserId(Number(e.target.value))}
                    style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', fontSize: '12px' }}
                  >
                    <option value="">-- Copy from user --</option>
                    {usersList.filter(u => !u.isSuperAdmin && u.id !== permSelectedUserId).map((u) => (
                      <option key={u.id} value={u.id}>{u.fullName}</option>
                    ))}
                  </select>
                  <Button variant="ghost" size="sm" onClick={handleCopyPermissions} disabled={!copyFromUserId} style={{ fontSize: '12px', border: '1px solid var(--color-border)' }}>
                    Copy Set
                  </Button>
                </div>

                <Button variant="primary" onClick={handleSavePermissions} loading={savingPerms || savingModulePerms}>
                  Save Access Permissions
                </Button>
              </div>
            )}
          </div>

          {!permSelectedUserId ? (
            <div style={{ padding: '48px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
              <Users size={36} style={{ marginBottom: '12px', opacity: 0.5 }} />
              <p style={{ fontSize: '14px', fontWeight: 500 }}>Please select a staff operator from the dropdown above to manage page access permissions.</p>
              <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>Note: Super Admin accounts always retain unrestricted access to all pages.</p>
            </div>
          ) : (
            <>
              {/* Categorized Page Permission Checkboxes */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
                {PAGE_CATEGORIES.map((category) => {
                  const pages = getPagesByCategory(category);
                  const categoryUris = pages.map(p => p.uri);
                  const allChecked = categoryUris.every(uri => permAllowedPages.includes(uri));

                  return (
                    <div 
                      key={category} 
                      style={{ 
                        background: '#f8fafc', 
                        border: '1px solid var(--color-border)', 
                        borderRadius: '10px', 
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: '10px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-primary)' }}>
                          {category} ({pages.filter(p => permAllowedPages.includes(p.uri)).length} / {pages.length})
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleCategoryPerms(category)}
                          style={{ fontSize: '11px', padding: '2px 8px', border: '1px solid var(--color-border)' }}
                        >
                          {allChecked ? 'Clear Category' : 'Select All'}
                        </Button>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                        {pages.map((page) => {
                          const isChecked = permAllowedPages.includes(page.uri);
                          return (
                            <label
                              key={page.uri}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '6px 10px',
                                borderRadius: '6px',
                                background: isChecked ? '#eff6ff' : 'var(--color-surface)',
                                border: isChecked ? '1px solid #bfdbfe' : '1px solid var(--color-border)',
                                fontSize: '12px',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleTogglePagePerm(page.uri)}
                              />
                              <span style={{ fontWeight: isChecked ? 600 : 400, color: isChecked ? '#1d4ed8' : 'var(--color-text-primary)' }}>
                                {page.label}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action-Level Security Matrix Section */}
              <div style={{ marginTop: '12px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '10px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-primary)' }}>
                      Action-Level Security Matrix (CRUD & Export Restrictions)
                    </h3>
                    <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                      Configure specific operation privileges per module. Unchecked actions will automatically hide buttons (e.g. Delete, Export) and block unauthorized operations.
                    </p>
                  </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '2px solid var(--color-border)' }}>
                        <th style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 700 }}>MODULE</th>
                        <th style={{ textAlign: 'center', padding: '10px 12px', fontWeight: 700, width: '100px' }}>CREATE</th>
                        <th style={{ textAlign: 'center', padding: '10px 12px', fontWeight: 700, width: '100px' }}>EDIT</th>
                        <th style={{ textAlign: 'center', padding: '10px 12px', fontWeight: 700, width: '100px' }}>DELETE</th>
                        <th style={{ textAlign: 'center', padding: '10px 12px', fontWeight: 700, width: '100px' }}>EXPORT</th>
                        <th style={{ textAlign: 'center', padding: '10px 12px', fontWeight: 700, width: '100px' }}>PRINT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { code: 'sales', name: 'Sale Book (Invoices & Notes)', uris: ['/transactions/sales', '/transactions/sale-returns', '/transactions/sale-debit-notes'] },
                        { code: 'purchases', name: 'Purchase Book (Invoices & Notes)', uris: ['/transactions/purchases', '/transactions/purchase-returns', '/transactions/purchase-credit-notes'] },
                        { code: 'inventory', name: 'Stock & Packet Inventory', uris: ['/inventory/stock', '/transactions/challans/job-work', '/transactions/orders/sales', '/transactions/orders/purchases', '/transactions/challans/trading', '/transactions/jobs/income', '/transactions/jobs/expense'] },
                        { code: 'challans', name: 'Challan & Memo Book', uris: ['/transactions/challans/trading', '/transactions/challans/job-work'] },
                        { code: 'vouchers', name: 'Cash, Bank & Journal Vouchers', uris: ['/vouchers/journal', '/vouchers/cash-bank', '/vouchers/loan'] },
                        { code: 'accounts', name: 'Accounts & Party Masters', uris: ['/masters/accounting/accounts', '/masters/accounting/account-groups', '/masters/business/brokers', '/masters/business/companies', '/masters/business/financial-years', '/masters/diamond/qualities'] },
                        { code: 'reports', name: 'Financial & MIS Reports', uris: ['/reports/day-book', '/reports/ledger', '/reports/trial-balance', '/reports/profit-loss', '/reports/balance-sheet', '/reports/stock', '/reports/intelligence', '/reports/cash-flow', '/reports/fund-flow', '/reports/outstanding', '/reports/gst', '/reports/gstr1', '/reports/gstr2', '/reports/gstr3b', '/reports/gst-analytics', '/reports/tds-tcs', '/reports/mis'] },
                      ]
                      .filter((mod) => mod.uris.some((uri) => permAllowedPages.includes(uri)))
                      .map((mod) => {
                        const modActions = permModuleActions[mod.code] || {};
                        const actions: ('create' | 'edit' | 'delete' | 'export' | 'print')[] = ['create', 'edit', 'delete', 'export', 'print'];

                        return (
                          <tr key={mod.code} style={{ borderBottom: '1px solid var(--color-border)' }}>
                            <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                              {mod.name}
                            </td>
                            {actions.map((act) => {
                              const isAllowed = modActions[act] !== false; // Default allowed
                              return (
                                <td key={act} style={{ textAlign: 'center', padding: '8px 12px' }}>
                                  <input
                                    type="checkbox"
                                    checked={isAllowed}
                                    onChange={() => handleToggleModuleAction(mod.code, act)}
                                    style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                                  />
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

        </div>
      ) : null}

      {/* Modal 1: Add/Edit User Account */}
      {showUserModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 999,
        }}>
          <div style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            width: '600px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700 }}>
              {modalMode === 'create' ? 'Register New Staff Login' : 'Modify Staff Credentials & Details'}
            </h3>
            <hr style={{ border: 0, borderTop: '1px solid var(--color-border)', margin: 0 }} />

            <form onSubmit={handleSaveStaffForm} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', gridColumn: 'span 2' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Login Username *</label>
                <Input value={staffUsername} onChange={(e) => setStaffUsername(e.target.value.toLowerCase())} disabled={modalMode === 'edit'} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', gridColumn: 'span 2' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Full Name *</label>
                <Input value={staffFullName} onChange={(e) => setStaffFullName(e.target.value)} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', gridColumn: 'span 2' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Mobile Phone</label>
                <Input value={staffMobile} onChange={(e) => setStaffMobile(e.target.value)} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', gridColumn: 'span 2' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Department</label>
                <Input value={staffDept} onChange={(e) => setStaffDept(e.target.value)} />
              </div>

              {modalMode === 'create' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', gridColumn: 'span 2' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Login Password *</label>
                  <Input type="password" value={staffPassword} onChange={(e) => setStaffPassword(e.target.value)} />
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', gridColumn: 'span 2' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Remarks</label>
                <Input value={staffRemarks} onChange={(e) => setStaffRemarks(e.target.value)} />
              </div>

              {/* Company Assignments Checklist */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', gridColumn: 'span 2', background: '#f8fafc', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Building size={12} /> Assigned Company Access Scope
                  </label>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {
                      if (staffCompanies.length === companiesList.length) {
                        setStaffCompanies([]);
                      } else {
                        setStaffCompanies(companiesList.map(c => c.id));
                      }
                    }}
                    style={{ fontSize: '10px', padding: '2px 8px', border: '1px solid var(--color-border)', cursor: 'pointer' }}
                  >
                    {staffCompanies.length === companiesList.length ? 'Clear All' : 'Select All'}
                  </Button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {companiesList.map((comp) => (
                    <label key={comp.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={staffCompanies.includes(comp.id)}
                        onChange={() => toggleCompanySelection(comp.id)}
                      />
                      <span>{comp.companyName} ({comp.companyCode})</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Actions Footer */}
              <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                <Button variant="ghost" onClick={() => setShowUserModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit">
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Reset Password Modal */}
      {showPassResetModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 999,
        }}>
          <div style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            width: '380px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Reset Staff User Password</h3>
            <hr style={{ border: 0, borderTop: '1px solid var(--color-border)', margin: 0 }} />

            <form onSubmit={handleSaveUserPassword} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>New Password</label>
                <Input type="password" value={resetPassNewVal} onChange={(e) => setResetPassNewVal(e.target.value)} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <Button variant="ghost" onClick={() => setShowPassResetModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit">
                  Update Password
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
