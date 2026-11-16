import { useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

// CSS เดิมใช้ body.authed / body.is-admin ในการซ่อน/แสดงส่วนที่สิทธิ์ไม่ถึง
export default function BodyClassSync() {
  const { token, role } = useAuth()

  useEffect(() => {
    document.body.classList.toggle('authed', Boolean(token))
    document.body.classList.toggle('is-admin', role === 'ADMIN')
  }, [token, role])

  return null
}
