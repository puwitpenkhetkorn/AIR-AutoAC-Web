import { useEffect, useRef, type ReactNode } from 'react'
import { Icon } from './IconSprite'

interface Props {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}

// แผ่นเลื่อนขึ้นจากล่าง (Figma .bottom-sheet) — ใช้เลือกห้อง/ยืนยันออกจากระบบ
export default function BottomSheet({ open, title, onClose, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog className="bottom-sheet" ref={ref} onClose={onClose} aria-labelledby="sheetTitle">
      <div className="sheet-handle" aria-hidden="true" />
      <div className="sheet-head">
        <strong id="sheetTitle">{title}</strong>
        <button type="button" aria-label="ปิด" onClick={onClose}>
          <Icon name="x" />
        </button>
      </div>
      <div>{children}</div>
    </dialog>
  )
}
