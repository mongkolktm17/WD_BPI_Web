'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, Lock, ChevronRight, Instagram, Facebook, Twitter } from 'lucide-react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginErr, setLoginErr] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginErr('');

    const cleanUser = username.trim();
    const cleanPass = password.trim();

    if (!cleanUser) {
      setLoginErr('กรุณากรอกชื่อผู้ใช้');
      return;
    }
    if (!cleanPass) {
      setLoginErr('กรุณากรอกรหัสผ่าน');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUser, password: cleanPass }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
      }

      const resData = await res.json();
      const payload = resData.data || resData;
      if (payload.accessToken) {
        localStorage.setItem('token', payload.accessToken);
      }
      if (payload.user) {
        localStorage.setItem('user', JSON.stringify(payload.user));
        if (payload.user.defaultSiteId) {
          localStorage.setItem('selected_site_id', String(payload.user.defaultSiteId));
        }
      }

      const user = payload.user || {};
      const roleId = user.role?.id ?? user.roleId;
      const roleName = String(user.role?.name || user.roleName || user.role || '');
      const isSecurityStaff =
        roleId === 2 ||
        roleId === 3 ||
        roleId === 4 ||
        roleName.includes('รักษาความปลอดภัย') ||
        roleName.includes('รปภ') ||
        roleName.includes('ตรวจตรา') ||
        roleName.toLowerCase().includes('guard') ||
        roleName.toLowerCase().includes('patrol') ||
        cleanUser.toLowerCase() === 'guard' ||
        cleanUser.toLowerCase() === 'supervisor';

      if (isSecurityStaff) {
        router.push('/report-page');
      } else {
        router.push('/');
      }
    } catch (err: any) {
      setLoginErr(err.message || 'ไม่พบชื่อผู้ใช้นี้ในระบบ หรือรหัสผ่านไม่ถูกต้อง');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="login-root-wrapper">
        <div className="container">
          <div className="screen">
            <div className="screen__content">
              <form className="login" onSubmit={handleLogin}>
                <div style={{ marginBottom: 0, paddingTop: '20px', marginLeft: 0 }}>
                  <img
                    src="/report_assets/Images/images_logo.png"
                    alt="Western Digital Logo"
                    style={{ width: '200px' }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px' }}>
                    <img
                      src="/report_assets/Images/PCS_logo.png"
                      alt="PCS Logo"
                      style={{ height: '18px', width: 'auto' }}
                    />
                    <span style={{ fontSize: '11px', color: '#fff', fontWeight: 600, letterSpacing: '0.02em' }}>
                      PCS Security & Facility Management
                    </span>
                  </div>
                </div>

                {loginErr && <div className="login__error">{loginErr}</div>}

                <div className="login__field">
                  <User className="login__icon" size={14} />
                  <input
                    type="text"
                    name="username"
                    autoComplete="username"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    className="login__input"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>

                <div className="login__field">
                  <Lock className="login__icon" size={14} />
                  <input
                    type="password"
                    name="password"
                    autoComplete="current-password"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    className="login__input"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <button className="button login__submit" type="submit" disabled={loading}>
                  <span className="button__text">
                    {loading ? 'Logging In...' : 'Log In Now'}
                  </span>
                  <ChevronRight className="button__icon" size={24} />
                </button>
              </form>

              <div className="social-login">
                <h3>log in via</h3>
                <div className="social-icons">
                  <a href="#" className="social-login__icon" aria-label="Instagram"><Instagram size={16} /></a>
                  <a href="#" className="social-login__icon" aria-label="Facebook"><Facebook size={16} /></a>
                  <a href="#" className="social-login__icon" aria-label="Twitter"><Twitter size={16} /></a>
                </div>
              </div>
            </div>

            <div className="screen__background">
              <span className="screen__background__shape screen__background__shape4"></span>
              <span className="screen__background__shape screen__background__shape3"></span>
              <span className="screen__background__shape screen__background__shape2"></span>
              <span className="screen__background__shape screen__background__shape1"></span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            position: 'fixed',
            bottom: '10px',
            width: '100%',
            textAlign: 'center',
            color: 'rgba(255,255,255,0.8)',
            fontSize: '12px',
            zIndex: 10,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginBottom: '4px',
            }}
          >
            <img
              src="/report_assets/Images/PCS_logo.png"
              alt="PCS Logo"
              style={{ height: '24px', opacity: 0.9 }}
            />
            <span style={{ fontWeight: 600, letterSpacing: '0.5px' }}>
              PCS Engineering Solution
            </span>
          </div>
          &copy; 2025 PCS Engineering Solution. All rights reserved.
        </div>
      </div>
    </>
  );
}
