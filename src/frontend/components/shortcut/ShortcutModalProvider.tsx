import React from 'react';
import { useShortcutModalStore } from '../../state/useShortcutModalStore';
import { AccountFormPage } from '../../features/account/AccountFormPage';
import { QualityFormPage } from '../../features/quality/QualityFormPage';
import { AccountGroupPage } from '../../features/account-group/AccountGroupPage';
import { X } from 'lucide-react';

export const ShortcutModalProvider: React.FC = () => {
  const { isOpen, type, groupFilter, editId, searchVal, onSuccessCallback, close } = useShortcutModalStore();

  if (!isOpen || !type) return null;

  const getTitle = () => {
    const action = editId ? 'Edit' : 'New';
    switch (type) {
      case 'account':
        return `${action} Account Master`;
      case 'quality':
        return `${action} Quality Master`;
      case 'account-group':
        return `${action} Account Group Master`;
      default:
        return '';
    }
  };

  const handleSuccess = (id: number, name: string) => {
    if (onSuccessCallback) {
      onSuccessCallback(id, name);
    }
    close();
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(4px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
      onClick={close}
    >
      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-xl)',
          width: '100%',
          maxWidth: type === 'account' ? '800px' : '650px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'modalFadeIn 0.2s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--color-row-alt)',
          }}
        >
          <span style={{ fontWeight: 600, fontSize: '16px', color: 'var(--color-primary)' }}>
            {getTitle()}
          </span>
          <button
            onClick={close}
            style={{
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: 'var(--color-text-secondary)',
              display: 'flex',
              padding: '4px',
              borderRadius: 'var(--radius-sm)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-border)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px', overflowY: 'auto', maxHeight: '75vh' }}>
          {type === 'account' && (
            <AccountFormPage
              modalId={editId ?? undefined}
              isModalMode
              initialSearchName={searchVal}
              modalGroupFilter={groupFilter}
              onSuccessCallback={handleSuccess}
              onCancelCallback={close}
            />
          )}
          {type === 'quality' && (
            <QualityFormPage
              modalId={editId ?? undefined}
              isModalMode
              initialSearchName={searchVal}
              onSuccessCallback={handleSuccess}
              onCancelCallback={close}
            />
          )}
          {type === 'account-group' && (
            <AccountGroupPage
              modalId={editId ?? undefined}
              isModalMode
              initialSearchName={searchVal}
              onSuccessCallback={handleSuccess}
              onCancelCallback={close}
            />
          )}
        </div>
      </div>
    </div>
  );
};
