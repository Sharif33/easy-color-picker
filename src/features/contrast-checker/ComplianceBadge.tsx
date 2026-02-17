import { Check } from "lucide-react"

interface ComplianceBadgeProps {
  label: string
  passed: boolean
}

export function ComplianceBadge({ label, passed }: ComplianceBadgeProps) {
  return (
    <div className="flex items-center gap-2 text-lg leading-none text-slate-900">
      <span
        className={`inline-flex h-8 w-8 items-center justify-center rounded-full border-2 ${
          passed
            ? "border-emerald-500 text-emerald-500"
            : "border-slate-300 text-slate-400"
        }`}>
        <Check className="size-5" />
      </span>
      <span className="text-base">{label}</span>
    </div>
  )
}
