interface Point {
  ts: number
  value: number
}

// กราฟเส้นแบบ SVG ง่ายๆ ไม่พึ่ง library ภายนอก (ตาม CLAUDE.md: ไม่ใช้ CDN/library ภายนอก)
export default function LineChart({ points, height = 160 }: { points: Point[]; height?: number }) {
  if (points.length === 0) return null

  const width = 600
  const values = points.map((p) => p.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const minTs = points[0].ts
  const maxTs = points[points.length - 1].ts
  const tsRange = maxTs - minTs || 1

  const toX = (ts: number) => ((ts - minTs) / tsRange) * width
  const toY = (v: number) => height - ((v - min) / range) * height

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${toX(p.ts).toFixed(1)},${toY(p.value).toFixed(1)}`).join(' ')

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="chart" preserveAspectRatio="none" role="img">
      <path className="temp-line" d={path} />
    </svg>
  )
}
