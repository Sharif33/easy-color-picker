import type { WCAGCompliance } from "../../../utils/wcag-utils"
import { ComplianceBadge } from "./ComplianceBadge"

interface WCAGCompliancePanelProps {
  ratio: number
  wcag: WCAGCompliance
}

export function WCAGCompliancePanel({ ratio, wcag }: WCAGCompliancePanelProps) {
  const ratioLabelLarge = ratio.toFixed(1)

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-45px_rgba(15,23,42,0.35)]">
      <h2 className="text-lg font-semibold text-slate-900">WCAG Compliance</h2>
      <div className="mt-5 grid gap-8">
        <div className="grid gap-1">
          <p className="text-sm font-medium text-slate-500">Color Contrast</p>
          <p className="text-2xl font-semibold tracking-tight text-slate-900">
            {ratioLabelLarge}:1
          </p>
        </div>
        <div className="grid gap-3">
          <p className="text-sm font-medium text-slate-500">WCAG Compliance</p>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-3">
              <p className="text-base font-medium text-slate-900">
                Normal Text
              </p>
              <ComplianceBadge label="AA" passed={wcag.normalAA} />
              <ComplianceBadge label="AAA" passed={wcag.normalAAA} />
            </div>

            <div className="space-y-3">
              <p className="text-base font-medium text-slate-900">Large Text</p>
              <ComplianceBadge label="AA" passed={wcag.largeAA} />
              <ComplianceBadge label="AAA" passed={wcag.largeAAA} />
            </div>

            <div className="space-y-3">
              <p className="text-base font-medium text-slate-900">
                Graphics & UI
              </p>
              <div className="flex items-center gap-2 text-[34px] leading-none text-slate-900">
                <ComplianceBadge label="AA" passed={wcag.graphicsAA} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
