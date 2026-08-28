'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginErr, setLoginErr] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginErr('');

    if (!username.trim()) {
      setLoginErr('กรุณากรอกชื่อผู้ใช้');
      return;
    }
    if (!password.trim()) {
      setLoginErr('กรุณากรอกรหัสผ่าน');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'รหัสผ่านไม่ถูกต้อง');
      }

      const resData = await res.json();
      const payload = resData.data || resData;
      if (payload.accessToken) {
        localStorage.setItem('token', payload.accessToken);
      }
      if (payload.user) {
        localStorage.setItem('user', JSON.stringify(payload.user));
      }

      router.push('/');
    } catch (err: any) {
      setLoginErr(err.message || 'ไม่พบชื่อผู้ใช้นี้ในระบบ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css"
      />

      <div className="login-root-wrapper">
        <div className="container">
          <div className="screen">
            <div className="screen__content">
              <form className="login" onSubmit={handleLogin}>
                <div style={{ marginBottom: 0, paddingTop: '20px', marginLeft: 0 }}>
                  <img
                    src="/report_assets/Images/images_logo.png"
                    alt="Logo"
                    style={{ width: '200px' }}
                  />
                </div>

                {loginErr && <div className="login__error">{loginErr}</div>}

                <div className="login__field">
                  <i className="login__icon fas fa-user"></i>
                  <input
                    type="text"
                    name="username"
                    className="login__input"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>

                <div className="login__field">
                  <i className="login__icon fas fa-lock"></i>
                  <input
                    type="password"
                    name="password"
                    autoComplete="current-password"
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
                  <i className="button__icon fas fa-chevron-right"></i>
                </button>
              </form>

              <div className="social-login">
                <h3>log in via</h3>
                <div className="social-icons">
                  <a href="#" className="social-login__icon fab fa-instagram"></a>
                  <a href="#" className="social-login__icon fab fa-facebook"></a>
                  <a href="#" className="social-login__icon fab fa-twitter"></a>
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
