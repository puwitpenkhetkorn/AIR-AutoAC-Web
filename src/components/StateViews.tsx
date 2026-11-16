// ทุกหน้าต้องมีสถานะ loading / ว่าง / ผิดพลาด (SPEC.md ข้อ 1.5) — ใช้คลาส .state ของดีไซน์เดิม

export function LoadingView({ text = 'กำลังโหลด…' }: { text?: string }) {
  return <p className="state state-loading">{text}</p>
}

export function EmptyView({ text }: { text: string }) {
  return <p className="state">{text}</p>
}

export function ErrorView({ text, onRetry }: { text: string; onRetry?: () => void }) {
  return (
    <div className="state state-error">
      <p>{text}</p>
      {onRetry && (
        <button type="button" onClick={onRetry}>
          ลองใหม่
        </button>
      )}
    </div>
  )
}
