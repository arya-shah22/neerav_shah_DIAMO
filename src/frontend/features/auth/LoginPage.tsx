// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — LoginPage UI Component (Styled Specification)
// ═══════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { User, Lock, Eye, EyeOff } from 'lucide-react';
import { loginSchema, LoginFormData } from './login.schema';
import { useToast } from '../../components/ui';
import { useAuthStore } from '../../state/auth-store';
import { useIpc } from '../../hooks/useIpc';
import { loadCompanyContext } from '../../services/company-context';
// @ts-ignore
import logoUrl from '../../../../Logo_Full.png';

// ─── Design System Styling Constants ───────────────────────────
const G = {
  navy: '#0f172a', // Main Background Container color
  surface: '#ffffff', // Login Card container color
  border: '#e2e8f0', // Input border color
  text: '#1e293b', // Main text color
  textSub: '#64748b', // Subtitle text color
  textMid: '#475569', // Input label text color
  gold: '#b89030', // Submit button background color
  navyText: '#94a3b8', // Footer text color
};

const font = "'Inter', sans-serif";

const inp = {
  width: "100%",
  padding: "11px 14px",
  border: `1px solid ${G.border}`,
  borderRadius: 10,
  fontSize: 14,
  fontFamily: font,
  color: G.text,
  background: G.surface,
  outline: "none",
  boxSizing: "border-box" as const,
  transition: 'border-color 0.2s, box-shadow 0.2s',
};

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const setSession = useAuthStore((s) => s.setSession);
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
      const { sessionToken, ...userData } = response.data;
      setSession(
        {
          id: userData.id,
          username: userData.userIdHandle,
          fullName: userData.fullName,
          role: userData.isSuperAdmin ? 'SUPER_ADMIN' : 'OPERATOR',
          isSuperAdmin: userData.isSuperAdmin,
        },
        sessionToken,
      );
      await loadCompanyContext();
      showToast('Logged in successfully', 'success');
      const landingPage = localStorage.getItem('diamo_landing_page') || '/dashboard';
      navigate(landingPage);
    } else {
      showToast(response?.error || 'Invalid credentials or login failed', 'error');
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: G.navy,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      boxSizing: 'border-box',
    }}>
      <div style={{ 
        width: "100%", 
        maxWidth: 400 
      }}>
        {/* Brand Header */}
        <div style={{ 
          textAlign: "center", 
          marginBottom: 20 
        }}>
          <img
            src={logoUrl}
            alt="DIAMO Logo"
            style={{
              width: 320,
              height: 320,
              objectFit: "contain",
              filter: "drop-shadow(0px 10px 25px rgba(0, 0, 0, 0.4))",
            }}
          />
        </div>

        {/* Login Card */}
        <div 
          className="animate-scale-in"
          style={{
            background: G.surface,
            borderRadius: 20,
            padding: 36,
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          }}
        >
          {/* Welcome Text */}
          <h2 style={{
            margin: "0 0 6px",
            fontSize: 18,
            fontWeight: 600,
            color: G.text,
            fontFamily: font,
          }}>
            Welcome back
          </h2>
          <p style={{
            margin: "0 0 26px",
            fontSize: 13,
            color: G.textSub,
            fontFamily: font,
          }}>
            Sign in to your account
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Username Field */}
            <div>
              <label style={{
                display: "block",
                fontSize: 11,
                fontWeight: 600,
                color: G.textMid,
                marginBottom: 6,
                fontFamily: font,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}>
                USERNAME
              </label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: G.textSub,
                }} />
                <input
                  type="text"
                  placeholder="admin"
                  disabled={loading}
                  style={{
                    ...inp,
                    paddingLeft: 38,
                    borderColor: errors.userIdHandle ? '#ef4444' : G.border,
                  }}
                  {...register('userIdHandle')}
                />
              </div>
              {errors.userIdHandle && (
                <span style={{ fontSize: 12, color: '#ef4444', marginTop: 4, display: 'block', fontFamily: font }}>
                  {errors.userIdHandle.message}
                </span>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label style={{
                display: "block",
                fontSize: 11,
                fontWeight: 600,
                color: G.textMid,
                marginBottom: 6,
                fontFamily: font,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}>
                PASSWORD
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: G.textSub,
                }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  disabled={loading}
                  style={{
                    ...inp,
                    paddingLeft: 38,
                    paddingRight: 38,
                    borderColor: errors.password ? '#ef4444' : G.border,
                  }}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: G.textSub,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 4,
                    borderRadius: 6,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <span style={{ fontSize: 12, color: '#ef4444', marginTop: 4, display: 'block', fontFamily: font }}>
                  {errors.password.message}
                </span>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "12px",
                background: G.gold,
                border: "none",
                borderRadius: 10,
                color: "#fff",
                fontSize: 14,
                fontWeight: 700,
                cursor: loading ? "wait" : "pointer",
                fontFamily: font,
                opacity: loading ? 0.8 : 1,
                marginTop: 10,
                boxShadow: '0 4px 6px -1px rgba(184, 144, 48, 0.2), 0 2px 4px -1px rgba(184, 144, 48, 0.1)',
              }}
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>
        </div>

        {/* Footer Text */}
        <div style={{
          textAlign: "center",
          marginTop: 22,
          fontSize: 12,
          color: G.navyText,
          fontFamily: font,
        }}>
          DIAMO v1.0 · Offline · All data stored locally
        </div>
      </div>
    </div>
  );
};
