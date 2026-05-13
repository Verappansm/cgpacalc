"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Trash2, Plus, Upload } from "lucide-react"
import { cn } from "@/lib/utils"

const GRADE_POINTS: Record<string, number> = {
  S: 10, A: 9, B: 8, C: 7, D: 6, E: 5, F: 0,
}

const GRADE_COLORS: Record<string, string> = {
  S: "text-emerald-600 dark:text-emerald-400",
  A: "text-blue-600 dark:text-blue-400",
  B: "text-violet-600 dark:text-violet-400",
  C: "text-yellow-600 dark:text-yellow-400",
  D: "text-orange-600 dark:text-orange-400",
  E: "text-red-600 dark:text-red-400",
  F: "text-red-900 dark:text-red-300",
}

const GPA_BANDS = [
  { min: 9,   label: "Excellent",    color: "bg-emerald-500" },
  { min: 8,   label: "Very Good",    color: "bg-blue-500"    },
  { min: 7,   label: "Good",         color: "bg-violet-500"  },
  { min: 6,   label: "Average",      color: "bg-amber-500"   },
  { min: 0,   label: "Needs Work",   color: "bg-red-500"     },
]

function gpaColor(gpa: number) {
  if (gpa >= 9) return "text-emerald-600 dark:text-emerald-400"
  if (gpa >= 8) return "text-blue-600 dark:text-blue-400"
  if (gpa >= 7) return "text-violet-600 dark:text-violet-400"
  if (gpa >= 6) return "text-amber-600 dark:text-amber-400"
  return "text-red-600 dark:text-red-400"
}

function gpaBarColor(gpa: number) {
  if (gpa >= 9) return "bg-emerald-500"
  if (gpa >= 8) return "bg-blue-500"
  if (gpa >= 7) return "bg-violet-500"
  if (gpa >= 6) return "bg-amber-500"
  return "bg-red-500"
}

type CourseRow = { id: string; name: string; credits: string; grade: string }

export function GPACalculator() {
  const [rows, setRows] = useState<CourseRow[]>([
    { id: "1", name: "", credits: "", grade: "S" },
  ])

  const addRow = () =>
    setRows(p => [...p, { id: Date.now().toString(), name: "", credits: "", grade: "S" }])

  const removeRow = (id: string) => {
    if (rows.length === 1) return
    setRows(p => p.filter(r => r.id !== id))
  }

  const update = (id: string, field: keyof CourseRow, val: string) =>
    setRows(p => p.map(r => r.id === id ? { ...r, [field]: val } : r))

  const valid = rows.filter(r => r.credits !== "" && Number(r.credits) > 0 && r.grade)
  const totalCredits = valid.reduce((s, r) => s + Number(r.credits), 0)
  const weighted     = valid.reduce((s, r) => s + Number(r.credits) * GRADE_POINTS[r.grade], 0)
  const gpa          = totalCredits > 0 ? weighted / totalCredits : null

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-5">
          {/* Column headers */}
          <div className="grid grid-cols-[1fr_88px_104px_36px] gap-2 px-1 mb-2 text-xs font-medium text-muted-foreground">
            <span>Course name</span>
            <span>Credits</span>
            <span>Grade</span>
            <span />
          </div>

          <div className="space-y-2">
            {rows.map(row => (
              <div key={row.id} className="grid grid-cols-[1fr_88px_104px_36px] gap-2 items-center group">
                <Input
                  placeholder="Course name (optional)"
                  value={row.name}
                  onChange={e => update(row.id, "name", e.target.value)}
                  className="h-8 text-sm"
                />
                <Input
                  type="number" min={0} placeholder="e.g. 4"
                  value={row.credits}
                  onChange={e => update(row.id, "credits", e.target.value)}
                  className="h-8 text-sm"
                />
                <Select
                  value={row.grade}
                  onValueChange={v => update(row.id, "grade", v ?? row.grade)}
                >
                  <SelectTrigger className={cn("h-8 w-full text-sm font-semibold", GRADE_COLORS[row.grade])}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(GRADE_POINTS).map(([g, pts]) => (
                      <SelectItem key={g} value={g}>
                        <span className={cn("font-semibold", GRADE_COLORS[g])}>{g}</span>
                        <span className="ml-2 text-muted-foreground text-xs">{pts} pts</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost" size="icon"
                  onClick={() => removeRow(row.id)}
                  disabled={rows.length === 1}
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={addRow} className="gap-1.5 h-8">
              <Plus className="size-3.5" />
              Add course
            </Button>
            <Button
              variant="outline" size="sm" disabled
              className="gap-1.5 h-8 text-muted-foreground"
              title="Coming in v2"
            >
              <Upload className="size-3.5" />
              Upload PDF (v2)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* GPA result */}
      {gpa !== null ? (
        <Card className="overflow-hidden">
          <div className={cn("h-1 w-full", gpaBarColor(gpa))} />
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Your GPA</p>
                <p className={cn("text-6xl font-black tabular-nums", gpaColor(gpa))}>
                  {gpa.toFixed(2)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {totalCredits} credits &middot; {valid.length} course{valid.length !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="text-right space-y-1 text-sm">
                <p className="text-muted-foreground text-xs">Weighted sum</p>
                <p className="font-mono text-lg font-semibold">{weighted.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">÷ {totalCredits} credits</p>
              </div>
            </div>

            {/* GPA bar */}
            <div className="mt-4 space-y-1.5">
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden flex">
                {GPA_BANDS.slice().reverse().map((b, i) => (
                  <div key={i} className={cn("flex-1 h-full border-r last:border-r-0 border-background/40", b.color, "opacity-30")} />
                ))}
              </div>
              <div className="relative h-0">
                <div
                  className={cn("absolute -top-3 flex flex-col items-center transition-all duration-500")}
                  style={{ left: `${(gpa / 10) * 100}%`, transform: "translateX(-50%)" }}
                >
                  <div className={cn("w-3 h-3 rounded-full border-2 border-background shadow", gpaBarColor(gpa))} />
                </div>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground pt-1">
                <span>0</span><span>5</span><span>10</span>
              </div>
            </div>

            {/* Per-course breakdown */}
            {valid.length > 1 && (
              <div className="mt-4 space-y-1">
                <p className="text-xs text-muted-foreground mb-2">Course breakdown</p>
                {valid.map(r => (
                  <div key={r.id} className="flex items-center gap-2 text-xs">
                    <span className={cn("font-bold w-4 text-center", GRADE_COLORS[r.grade])}>{r.grade}</span>
                    <span className="text-muted-foreground flex-1 truncate">{r.name || "Unnamed course"}</span>
                    <span className="tabular-nums text-muted-foreground">{r.credits}cr × {GRADE_POINTS[r.grade]}pts</span>
                    <span className="tabular-nums font-medium w-10 text-right">{(Number(r.credits) * GRADE_POINTS[r.grade]).toFixed(0)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Enter at least one course with credits to see your GPA
          </CardContent>
        </Card>
      )}
    </div>
  )
}
