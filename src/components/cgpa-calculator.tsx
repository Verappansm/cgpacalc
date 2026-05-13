"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

function Field({
  label, hint, placeholder, value, onChange, max, step = 0.01,
}: {
  label: string; hint?: string; placeholder: string
  value: string; onChange: (v: string) => void; max: number; step?: number
}) {
  return (
    <div className="space-y-1.5">
      <div>
        <Label className="text-sm">{label}</Label>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <Input
        type="number" min={0} max={max} step={step}
        placeholder={placeholder} value={value}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  )
}

function ResultCard({
  label, value, sub, color = "text-foreground",
}: {
  label: string; value: string; sub?: string; color?: string
}) {
  return (
    <div className="rounded-xl border bg-card px-5 py-4 text-center">
      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
      <p className={cn("text-5xl font-black tabular-nums", color)}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1.5">{sub}</p>}
    </div>
  )
}

function cgpaColor(v: number) {
  if (v >= 9) return "text-emerald-600 dark:text-emerald-400"
  if (v >= 8) return "text-blue-600 dark:text-blue-400"
  if (v >= 7) return "text-violet-600 dark:text-violet-400"
  if (v >= 6) return "text-amber-600 dark:text-amber-400"
  return "text-red-600 dark:text-red-400"
}

export function CGPACalculator() {
  const [creditsDone, setCreditsDone]     = useState("")
  const [cgpaSoFar, setCgpaSoFar]         = useState("")
  const [creditsSem, setCreditsSem]       = useState("")
  const [gpaSem, setGpaSem]               = useState("")
  const [targetCgpa, setTargetCgpa]       = useState("")

  const cd  = creditsDone !== "" ? Number(creditsDone) : null
  const cg  = cgpaSoFar   !== "" ? Number(cgpaSoFar)   : null
  const cs  = creditsSem  !== "" ? Number(creditsSem)  : null
  const gs  = gpaSem      !== "" ? Number(gpaSem)      : null
  const tc  = targetCgpa  !== "" ? Number(targetCgpa)  : null

  const hasCurrent = cd !== null && cg !== null && cs !== null && gs !== null && cd > 0 && cs > 0
  const finalCgpa  = hasCurrent ? (cd * cg! + cs * gs!) / (cd + cs) : null

  const hasAnticipated = cd !== null && cg !== null && cs !== null && tc !== null && cd > 0 && cs > 0
  const requiredGpa    = hasAnticipated ? (tc! * (cd + cs) - cd * cg!) / cs : null

  return (
    <div className="space-y-6">

      {/* ── Current CGPA ── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2">
            Current CGPA
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Credits done so far"
            hint="Exclude VITOL credits"
            placeholder="e.g. 120"
            value={creditsDone}
            onChange={setCreditsDone}
            max={300}
            step={1}
          />
          <Field
            label="CGPA so far"
            placeholder="e.g. 8.50"
            value={cgpaSoFar}
            onChange={setCgpaSoFar}
            max={10}
          />
          <Field
            label="Credits this semester"
            hint="Exclude VITOL credits"
            placeholder="e.g. 24"
            value={creditsSem}
            onChange={setCreditsSem}
            max={50}
            step={1}
          />
          <Field
            label="GPA this semester"
            hint="Use Tab 1 to calculate"
            placeholder="e.g. 9.00"
            value={gpaSem}
            onChange={setGpaSem}
            max={10}
          />
        </div>

        {finalCgpa !== null && cd !== null && cs !== null && cg !== null && gs !== null ? (
          <div className="space-y-3">
            <ResultCard
              label="Updated CGPA"
              value={finalCgpa.toFixed(2)}
              color={cgpaColor(finalCgpa)}
              sub={`(${cd}cr × ${cg} + ${cs}cr × ${gs.toFixed(2)}) ÷ ${cd + cs}cr`}
            />

            {/* Visual formula */}
            <div className="rounded-xl border bg-muted/30 px-4 py-3 text-sm">
              <div className="flex items-center justify-center gap-2 flex-wrap text-center">
                <span className="font-mono text-xs bg-card border rounded px-2 py-1">
                  {cd} × {cg}
                </span>
                <span className="text-muted-foreground">+</span>
                <span className="font-mono text-xs bg-card border rounded px-2 py-1">
                  {cs} × {gs.toFixed(2)}
                </span>
                <span className="text-muted-foreground">=</span>
                <span className="font-mono text-xs bg-card border rounded px-2 py-1">
                  {(cd * cg + cs * gs).toFixed(2)}
                </span>
                <span className="text-muted-foreground">÷</span>
                <span className="font-mono text-xs bg-card border rounded px-2 py-1">
                  {cd + cs}
                </span>
                <span className="text-muted-foreground">=</span>
                <span className={cn("font-mono text-sm font-bold", cgpaColor(finalCgpa))}>
                  {finalCgpa.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed py-6 text-center text-sm text-muted-foreground">
            Fill in all four fields to see your updated CGPA
          </div>
        )}
      </div>

      {/* ── Anticipated GPA ── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2">
            Anticipated GPA
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>

        {(!creditsDone || !cgpaSoFar || !creditsSem) && (
          <p className="text-xs text-muted-foreground text-center py-1">
            Complete the Current CGPA section first
          </p>
        )}

        <Field
          label="Target final CGPA"
          placeholder="e.g. 9.00"
          value={targetCgpa}
          onChange={setTargetCgpa}
          max={10}
        />

        {requiredGpa !== null && cd !== null && cs !== null && tc !== null ? (
          requiredGpa > 10 ? (
            <div className="rounded-xl border border-destructive/40 bg-destructive/5 px-5 py-4 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Required GPA</p>
              <p className="text-3xl font-bold text-destructive">Not achievable</p>
              <p className="text-xs text-muted-foreground mt-1.5">
                A CGPA of {tc} requires a GPA of {requiredGpa.toFixed(2)} this sem — above the maximum of 10
              </p>
            </div>
          ) : requiredGpa <= 0 ? (
            <div className="rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 px-5 py-4 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Required GPA</p>
              <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">Already achieved!</p>
              <p className="text-xs text-muted-foreground mt-1.5">
                Even scoring 0 this semester won&apos;t drop you below CGPA {tc}
              </p>
            </div>
          ) : (
            <ResultCard
              label="Required GPA this semester"
              value={requiredGpa.toFixed(2)}
              color={cgpaColor(requiredGpa)}
              sub={`to reach CGPA ${tc} over ${cd + cs} total credits`}
            />
          )
        ) : targetCgpa !== "" && (
          <div className="rounded-xl border border-dashed py-6 text-center text-sm text-muted-foreground">
            Complete the Current CGPA section to see the required GPA
          </div>
        )}
      </div>
    </div>
  )
}
