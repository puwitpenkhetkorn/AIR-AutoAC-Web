# AIR — เว็บแอปควบคุมแอร์ห้องเรียน

เขียนใหม่ด้วย **React + Vite + TypeScript** คุยกับ **ThingsBoard Cloud (EU)** ผ่าน REST API โดยตรง
(เขียนใหม่ทั้งหมดตามสเปกเดิมใน `docs/OVERVIEW.md` และ `../md\ md/md-web/`)

## เริ่มใช้งาน

```bash
npm install
cp .env.example .env   # ตั้ง VITE_TB_HOST ถ้าใช้ ThingsBoard host อื่น
npm run dev
```

ค่าเริ่มต้นต่อ `https://eu.thingsboard.cloud` — login ด้วยบัญชี ThingsBoard จริง (ไม่มีโหมดเดโม)

## สคริปต์

| คำสั่ง | ทำอะไร |
|---|---|
| `npm run dev` | รัน dev server |
| `npm run build` | type-check (`tsc -b`) + build production ไปที่ `dist/` |
| `npm run preview` | เปิดดูผล build |
| `npm run lint` | รัน oxlint |

## โครงสร้าง

```
src/
├─ config.ts         ค่าคงที่ (TB host, timeout, ช่วงอุณหภูมิ, โหมด/พัดลม)
├─ types.ts          TypeScript types ของ telemetry/attributes/RPC
├─ lib/
│  ├─ apiFetch.ts     fetch + timeout
│  ├─ apiError.ts     แปลง error เป็นข้อความไทย (ที่เดียว)
│  ├─ tb.ts           ThingsBoard REST client (login/telemetry/attributes/RPC)
│  ├─ session.ts      เก็บ token (sessionStorage/localStorage)
│  └─ time.ts         แปลงนาที ↔ เวลา สำหรับตารางเรียน
├─ context/
│  ├─ AuthContext.tsx  login/logout/role
│  ├─ RoomContext.tsx  รายการห้อง + ห้องที่เลือก
│  └─ ToastContext.tsx toast แจ้งผล RPC
├─ hooks/
│  ├─ useTelemetry.ts  poll สถานะห้องทุก ~4 วิ
│  └─ useRpc.ts        ส่งคำสั่งแอร์ + toast
├─ components/         Layout, RoomPicker, RequireAuth, StateViews, LineChart
└─ pages/               SC-M01–M10 (ยกเว้น SC-M11 จัดการผู้ใช้ — ข้ามตามสเปก)
```

## หน้าจอ

| Route | รหัส | หน้า |
|---|---|---|
| `#/login` | SC-M01 | เข้าสู่ระบบ |
| `#/forgot` | SC-M02 | ลืมรหัสผ่าน |
| `#/rooms` | SC-M03 | รายการห้อง |
| `#/room` | SC-M04 | รายละเอียดห้อง + ควบคุมแอร์ |
| `#/schedule` | SC-M06 | ตารางเรียน |
| `#/holidays` | SC-M07 | วันหยุด |
| `#/history` | SC-M08 | ประวัติ + กราฟ + CSV |
| `#/settings` | SC-M09 | ตั้งค่า |
| `#/alerts` | SC-M10 | การแจ้งเตือน |

## กฎหลักที่ยึดจากสเปกเดิม

- ไม่แสดงสถานะแอร์แบบยืนยัน — RPC `ok:true` = เข้าคิวแล้วเท่านั้น
- ช่วงอุณหภูมิ 16–30 °C ทุก role
- ข้อมูลเกิน 2 นาที → "ข้อมูลล้าสมัย" · อุปกรณ์ออฟไลน์ → ปิดปุ่มสั่งงาน
- Admin (`TENANT_ADMIN`) เห็นทุกห้อง · User (`CUSTOMER_USER`) เห็นห้องที่ assign — สิทธิ์แยกที่ UI เท่านั้น
- error message เป็นภาษาไทยจากฟังก์ชันกลางเท่านั้น ห้ามโผล่ข้อความดิบ/JSON/stack
- ไม่มีโหมดเดโมหรือไฟล์ prototype แยก — ต่อ ThingsBoard จริงอย่างเดียว

## ยังไม่ทำ / ของค้าง

- `graceSec`/`preOpenMin`/`warn_until`/`auto_mode`/`clock_valid` — รอเฟิร์มแวร์ส่งค่าตามสเปกใหม่
- บังคับสิทธิ์ Admin/User จริงที่ ThingsBoard rule chain (ตอนนี้ UI-only)
- ฟอนต์ Noto Sans Thai ฝังเอง (ตอนนี้ใช้ฟอนต์ระบบ)
- ทดสอบ RPC/ login กับบอร์ดจริงแบบครบวงจร
- SC-M11 จัดการผู้ใช้ (ข้ามตามสเปกเดิม)
