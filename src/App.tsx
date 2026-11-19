import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { RoomProvider } from './context/RoomContext'
import { ToastProvider } from './context/ToastContext'
import { PushNotificationProvider } from './context/PushNotificationContext'
import RequireAuth from './components/RequireAuth'
import Layout from './components/Layout'
import PushBanner from './components/PushBanner'
import Login from './pages/Login'
import Forgot from './pages/Forgot'
import Rooms from './pages/Rooms'
import Room from './pages/Room'
import Schedule from './pages/Schedule'
import Holidays from './pages/Holidays'
import History from './pages/History'
import Settings from './pages/Settings'
import Alerts from './pages/Alerts'
import SdLog from './pages/SdLog'
import IconSprite from './components/IconSprite'
import BodyClassSync from './components/BodyClassSync'

export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <IconSprite />
        <BodyClassSync />
        <ToastProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/forgot" element={<Forgot />} />

            <Route element={<RequireAuth />}>
              <Route
                element={
                  <RoomProvider>
                    <PushNotificationProvider>
                      <PushBanner />
                      <Layout />
                    </PushNotificationProvider>
                  </RoomProvider>
                }
              >
                <Route path="/rooms" element={<Rooms />} />
                <Route path="/room" element={<Room />} />
                <Route path="/control" element={<Navigate to="/room" replace />} />
                <Route path="/schedule" element={<Schedule />} />
                <Route path="/holidays" element={<Holidays />} />
                <Route path="/history" element={<History />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/alerts" element={<Alerts />} />
                <Route path="/sdlog" element={<SdLog />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/rooms" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </HashRouter>
  )
}
