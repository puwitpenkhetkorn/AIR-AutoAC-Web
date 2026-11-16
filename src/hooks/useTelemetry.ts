import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { tbGetDeviceActive, tbGetLatestTelemetry, tbGetSharedAttributes, parseSchedule, parseHolidays } from '../lib/tb'
import { apiErrorText } from '../lib/apiError'
import { POLL_MS, STALE_MS } from '../config'
import type { DeviceSettings, Holidays, Schedule, Telemetry } from '../types'

interface TelemetryState {
  telemetry: Telemetry | null
  settings: DeviceSettings | null
  schedule: Schedule | null
  holidays: Holidays | null
  active: boolean | undefined
  stale: boolean
  loading: boolean
  error: string | null
}

/** poll telemetry + attributes ของห้องที่เลือกทุก ~4 วิ (ARCHITECTURE.md การไหลของข้อมูล ข้อ 4) */
export function useTelemetry(deviceId: string | null) {
  const { token } = useAuth()
  const [state, setState] = useState<TelemetryState>({
    telemetry: null,
    settings: null,
    schedule: null,
    holidays: null,
    active: undefined,
    stale: false,
    loading: true,
    error: null,
  })
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const refresh = useCallback(async () => {
    if (!token || !deviceId) return
    try {
      const [telemetry, active, attrs] = await Promise.all([
        tbGetLatestTelemetry(token, deviceId),
        tbGetDeviceActive(token, deviceId),
        tbGetSharedAttributes(token, deviceId),
      ])
      const stale = telemetry.ts ? Date.now() - telemetry.ts > STALE_MS : true
      setState({
        telemetry,
        settings: {
          emptyMin: Number(attrs.emptyMin),
          graceSec: attrs.graceSec !== undefined ? Number(attrs.graceSec) : attrs.graceMin !== undefined ? Number(attrs.graceMin) * 60 : undefined,
          hot: Number(attrs.hot),
          autoOn: Boolean(attrs.autoOn),
          preOpenMin: attrs.preOpenMin !== undefined ? Number(attrs.preOpenMin) : undefined,
        },
        schedule: parseSchedule(attrs.schedule),
        holidays: parseHolidays(attrs.holidays),
        active,
        stale,
        loading: false,
        error: null,
      })
    } catch (err) {
      setState((s) => ({ ...s, loading: false, error: apiErrorText(err) }))
    }
  }, [token, deviceId])

  useEffect(() => {
    setState((s) => ({ ...s, loading: true, error: null }))
    refresh()
    timerRef.current = setInterval(refresh, POLL_MS)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [refresh])

  return { ...state, refresh }
}
