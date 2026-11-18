import { useEffect, useRef } from 'react'
import { Icon } from './IconSprite'
import type { Telemetry } from '../types'

// หน้าแสดง AMG8833 heatmap + Rd-01 radar บนเว็บ — ข้อมูลเดียวกับที่หน้าจอเครื่องมือช่างบนบอร์ดแสดง (ui_task.cpp)
// thermalPixels เป็น CSV 64 ค่า แถวละ 8 (ดู net_task.cpp publishSensorTelemetry)

const RADAR_STATE_LABEL: Record<number, string> = {
  0: 'ไม่พบเป้าหมาย',
  1: 'เคลื่อนไหว',
  2: 'นิ่ง (คนนั่ง/นอน)',
  3: 'เคลื่อนไหว + นิ่ง',
}
const RADAR_STATE_COLOR: Record<number, string> = {
  0: '#8b8f99',
  1: '#e0b400',
  2: '#2fae60',
  3: '#e07b00',
}

// ไล่สีแบบเดียวกับที่บอร์ดวาด (jet-like): น้ำเงิน -> ฟ้า -> เขียว -> เหลือง -> แดง -> ขาว
function thermalColor(t: number): string {
  const c = Math.max(0, Math.min(1, t))
  let r = 0, g = 0, b = 0
  if (c < 0.25) { const u = c / 0.25; r = 0; g = u * 180; b = 255 }
  else if (c < 0.5) { const u = (c - 0.25) / 0.25; r = 0; g = 180 + u * 75; b = 255 * (1 - u) }
  else if (c < 0.75) { const u = (c - 0.5) / 0.25; r = u * 255; g = 255; b = 0 }
  else { const u = (c - 0.75) / 0.25; r = 255; g = 255 - u * 55; b = u * 200 }
  return `rgb(${r | 0},${g | 0},${b | 0})`
}

function ThermalHeatmap({ pixels, maxC, minC }: { pixels: number[]; maxC: number; minC: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const size = 160
  const cell = size / 8

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const range = Math.max(0.5, maxC - minC)
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const v = pixels[row * 8 + col] ?? minC
        ctx.fillStyle = thermalColor((v - minC) / range)
        ctx.fillRect(col * cell, row * cell, cell, cell)
      }
    }
  }, [pixels, maxC, minC, cell])

  return (
    <div className="sensor-thermal">
      <canvas ref={canvasRef} width={size} height={size} />
      <div className="sensor-thermal-readout">
        <div>
          <span className="sensor-label">MAX</span>
          <strong>{maxC.toFixed(1)}°C</strong>
        </div>
        <div>
          <span className="sensor-label">MIN</span>
          <strong>{minC.toFixed(1)}°C</strong>
        </div>
      </div>
    </div>
  )
}

function EnergyBar({ label, energy, distCm }: { label: string; energy: number; distCm: number }) {
  const pct = Math.max(0, Math.min(100, (energy / 255) * 100))
  const color = energy > 150 ? '#e2443b' : energy > 60 ? '#e0b400' : '#2fae60'
  return (
    <div className="sensor-energy-row">
      <div className="sensor-energy-head">
        <span>{label}</span>
        <span>{distCm} cm</span>
      </div>
      <div className="sensor-energy-track">
        <div className="sensor-energy-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

export default function SensorPanel({ telemetry }: { telemetry: Telemetry | null }) {
  const hasThermal = telemetry?.thermalPresent && telemetry.thermalPixels?.length === 64
  const hasRadar = telemetry?.radarState !== undefined

  if (!hasThermal && !hasRadar) return null

  return (
    <div className="card sensor-panel">
      <div className="card-title">
        <span>
          <Icon name="zap" />
          เซนเซอร์เสริม
        </span>
      </div>

      {hasThermal && (
        <div className="sensor-block">
          <p className="sensor-block-title">กล้องความร้อน (AMG8833)</p>
          <ThermalHeatmap pixels={telemetry!.thermalPixels!} maxC={telemetry!.thermalMax ?? 0} minC={telemetry!.thermalMin ?? 0} />
        </div>
      )}

      {hasRadar && (
        <div className="sensor-block">
          <p className="sensor-block-title">เรดาร์ (Rd-01)</p>
          <p className="sensor-radar-state" style={{ color: RADAR_STATE_COLOR[telemetry!.radarState!] ?? '#8b8f99' }}>
            {RADAR_STATE_LABEL[telemetry!.radarState!] ?? '—'}
          </p>
          <EnergyBar label="เคลื่อนไหว" energy={telemetry!.radarMoveEnergy ?? 0} distCm={telemetry!.radarMoveDistCm ?? 0} />
          <EnergyBar label="นิ่ง" energy={telemetry!.radarStaticEnergy ?? 0} distCm={telemetry!.radarStaticDistCm ?? 0} />
          <p className="sensor-radar-range">ระยะตรวจจับ: {telemetry!.radarDetectRangeCm ?? 0} cm</p>
        </div>
      )}
    </div>
  )
}
