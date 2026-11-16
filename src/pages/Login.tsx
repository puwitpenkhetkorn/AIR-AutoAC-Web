import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { apiErrorText } from '../lib/apiError'
import { Icon } from '../components/IconSprite'

// SC-M01 — เข้าสู่ระบบ
export default function Login() {
  const { token, ready, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [remember, setRemember] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (ready && token) {
    const from = (location.state as { from?: Location })?.from
    return <Navigate to={from?.pathname ?? '/rooms'} replace />
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login(email, password, remember)
      navigate('/rooms', { replace: true })
    } catch (err) {
      setError(apiErrorText(err, 'login'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="page login-page" data-screen="SC-M01">
      <div className="brand">
        <span className="brand-logo" aria-hidden="true">
          <Icon name="airvent" />
        </span>
        <span className="brand-name">AIR</span>
      </div>
      <div className="login-head">
        <p className="eyebrow">ยินดีต้อนรับกลับ</p>
        <h2 className="page-title">เข้าสู่ระบบ</h2>
        <p className="lead">ดูแลห้องเรียนให้เย็นสบายและประหยัดพลังงาน</p>
      </div>
      <div className="login-form">
        <form onSubmit={handleSubmit}>
          <label htmlFor="email">อีเมล</label>
          <div className="field">
            <input
              id="email"
              type="email"
              required
              autoComplete="username"
              placeholder="name@school.ac.th"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <span className="field-icon" aria-hidden="true">
              <Icon name="mail" />
            </span>
          </div>
          <label htmlFor="password">รหัสผ่าน</label>
          <div className="field">
            <input
              id="password"
              type={showPw ? 'text' : 'password'}
              required
              autoComplete="current-password"
              placeholder="กรอกรหัสผ่าน"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="field-icon field-btn"
              aria-label={showPw ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
              aria-pressed={showPw}
              onClick={() => setShowPw((v) => !v)}
            >
              <Icon name={showPw ? 'eye-off' : 'eye'} />
            </button>
          </div>
          <div className="login-opts">
            <label className="check">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> จดจำฉันไว้
            </label>
            <Link to="/forgot" className="link-btn">
              ลืมรหัสผ่าน?
            </Link>
          </div>
          <button className="primary" type="submit" disabled={loading}>
            {loading ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}
          </button>
          {error && (
            <p className="error" role="alert" style={{ display: 'block' }}>
              {error}
            </p>
          )}
        </form>
      </div>
    </section>
  )
}
