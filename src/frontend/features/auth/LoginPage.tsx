// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — LoginPage UI Component
// Phase 17.1 UI standards: custom cards, input boxes, typography
// ═══════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Gem, Eye, EyeOff } from 'lucide-react';
import { loginSchema, LoginFormData } from './login.schema';
import { Button, Input, useToast } from '../../components/ui';
import { useAuthStore } from '../../state/auth-store';
import { useIpc } from '../../hooks/useIpc';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const setUser = useAuthStore((s) => s.setUser);
  const [showPassword, setShowPassword] = useState(false);

  const { invoke: loginIpc, loading } = useIpc<any>('auth:login');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      userIdHandle: '',
      password: '',
      rememberMe: false,
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    const response = await loginIpc({
      userIdHandle: data.userIdHandle,
      password: data.password,
    });

    if (response && response.success && response.data) {
      setUser({
        id: response.data.id,
        username: response.data.userIdHandle,
        fullName: response.data.fullName,
        role: response.data.isSuperAdmin ? 'SUPER_ADMIN' : 'OPERATOR',
        isSuperAdmin: response.data.isSuperAdmin,
      });
      showToast('Logged in successfully', 'success');
      navigate('/dashboard');
    } else {
      showToast(response?.error || 'Invalid credentials or login failed', 'error');
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      width: '100vw',
      background: 'var(--color-bg)',
    }}>
      <div style={{
        width: '400px',
        background: 'var(--color-surface)',
        padding: 'var(--spacing-xl)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-lg)',
        border: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}>
        {/* Brand/Logo Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-lg)' }}>
          <Gem size={32} color="var(--color-accent)" />
          <span style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-primary)', letterSpacing: '2px' }}>
            DIAMO
          </span>
        </div>

        <h2 style={{ fontSize: 'var(--text-heading)', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-md)' }}>
          Log in to your account
        </h2>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          <Input
            label="Username"
            placeholder="Enter username"
            error={errors.userIdHandle?.message}
            required
            disabled={loading}
            {...register('userIdHandle')}
          />

          <div style={{ position: 'relative', width: '100%' }}>
            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter password"
              error={errors.password?.message}
              required
              disabled={loading}
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '10px',
                top: '28px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--color-text-muted)',
              }}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {/* Remember Me */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: 'var(--text-label)', cursor: 'pointer', userSelect: 'none' }}>
            <input type="checkbox" {...register('rememberMe')} style={{ width: '14px', height: '14px', accentColor: 'var(--color-accent)' }} />
            <span>Remember me</span>
          </label>

          {/* Login Button */}
          <Button
            type="submit"
            variant="primary"
            fullWidth
            loading={loading}
            style={{ marginTop: '8px' }}
          >
            Sign In
          </Button>
        </form>

        <span style={{ fontSize: 'var(--text-small)', color: 'var(--color-text-muted)', marginTop: 'var(--spacing-lg)' }}>
          v1.0.0 · Secure Offline Mode
        </span>
      </div>
    </div>
  );
};
