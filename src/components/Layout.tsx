import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Icon } from './IconSprite'

const TABS = [
  { to: '/rooms', label: 'ห้อง', icon: 'home' },
  { to: '/schedule', label: 'ตาราง', icon: 'calendar' },
  { to: '/history', label: 'ประวัติ', icon: 'history' },
  { to: '/settings', label: 'ตั้งค่า', icon: 'settings' },
]

export default function Layout() {
  const { pathname } = useLocation()

  return (
    <>
      <main>
        <Outlet />
      </main>

      <nav className="tabbar" aria-label="เมนูหลัก">
        {TABS.map((t) => {
          const active =
            pathname === t.to ||
            (t.to === '/rooms' && pathname === '/room') ||
            (t.to === '/schedule' && pathname === '/holidays')
          return (
            <NavLink key={t.to} to={t.to} aria-current={active ? 'page' : undefined}>
              <Icon name={t.icon} />
              <span>{t.label}</span>
            </NavLink>
          )
        })}
      </nav>
    </>
  )
}
