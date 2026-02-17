import { ArrowLeftRight } from "lucide-react"

interface SwapButtonProps {
  onSwap: () => void
}

export function SwapButton({ onSwap }: SwapButtonProps) {
  return (
    <button
      type="button"
      onClick={onSwap}
      aria-label="Swap foreground and background"
      className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-400 bg-[#f3f6fb] text-slate-500 transition hover:border-slate-500 hover:text-slate-700 hover:scale-110 active:scale-95">
      <ArrowLeftRight className="size-6" />
    </button>
  )
}
