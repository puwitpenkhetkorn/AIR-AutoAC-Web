import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { tbResetPassword } from '../lib/tb'
import { apiErrorText } from '../lib/apiError'
import { Icon } from '../components/IconSprite'

// SC-M02 — ลืมรหัสผ่าน
export default function Forgot() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await tbResetPassword(email)
      setSent(true)
    } catch (err) {
      setError(apiErrorText(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="page login-page" data-screen="SC-M02">
      <header className="page-header">
        <Link className="btn-icon" to="/login" aria-label="กลับไปเข้าสู่ระบบ">
          <Icon name="arrow-left" />
        </Link>
        <h2 className="page-title">ลืมรหัสผ่าน</h2>
        <span className="header-spacer" />
      </header>
      <p className="lead">กรอกอีเมลที่ใช้เข้าสู่ระบบ เราจะส่งลิงก์ตั้งรหัสผ่านใหม่ไปให้</p>
      <div className="login-form">
        {!sent ? (
          <form onSubmit={handleSubmit}>
            <label htmlFor="resetEmail">อีเมล</label>
            <div className="field">
              <input
                id="resetEmail"
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
            <button className="primary" type="submit" disabled={loading}>
              {loading ? 'กำลังส่ง…' : 'ส่งลิงก์ตั้งรหัสผ่านใหม่'}
            </button>
            {error && (
              <p className="error" role="alert" style={{ display: 'block' }}>
                {error}
              </p>
            )}
          </form>
        ) : (
          <div className="reset-done" role="status">
            <Icon name="mail" />
            <p>ส่งคำขอแล้ว — ถ้าอีเมลนี้มีบัญชีในระบบ จะได้รับลิงก์ตั้งรหัสผ่านใหม่ในอีเมล (ตรวจในจดหมายขยะด้วย)</p>
            <Link className="link-btn" to="/login">
              กลับไปเข้าสู่ระบบ
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}
