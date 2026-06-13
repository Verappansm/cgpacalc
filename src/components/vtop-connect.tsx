'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2, CheckCircle2, AlertCircle, Wifi, WifiOff, RefreshCw } from 'lucide-react'
import { useStore } from '@/store/calculator-store'
import { cn } from '@/lib/utils'

type Step = 'form' | 'captcha' | 'loading' | 'success' | 'error'

type Props = { onClose: () => void }

export function VtopConnect({ onClose }: Props) {
  const { connectVtop, vtopData } = useStore()

  const [step, setStep] = useState<Step>('form')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [captchaAnswer, setCaptchaAnswer] = useState('')
  const [sessionState, setSessionState] = useState('')
  const [captchaImg, setCaptchaImg] = useState<string | null>(null)
  const [isRecaptcha, setIsRecaptcha] = useState(false)
  const [error, setError] = useState('')

  const getCaptcha = useCallback(async () => {
    if (!username || !password) { setError('Enter your username and password first.'); return }
    setError('')
    setStep('loading')
    try {
      const res = await fetch('/api/vtop/captcha')
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      setSessionState(json.sessionState)
      setCaptchaImg(json.captchaBase64)
      setIsRecaptcha(json.isRecaptcha)
      setStep('captcha')
    } catch (e) {
      setError((e as Error).message ?? 'Could not reach VTOP. Check your connection.')
      setStep('form')
    }
  }, [username, password])

  const login = useCallback(async () => {
    setError('')
    setStep('loading')
    try {
      const res = await fetch('/api/vtop/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionState, username, password, captchaAnswer }),
      })
      const json = await res.json()
      if (!res.ok || json.error) throw new Error(json.error ?? 'Login failed.')
      connectVtop(json.data)
      setStep('success')
    } catch (e) {
      setError((e as Error).message ?? 'Connection failed.')
      setStep('error')
    }
  }, [sessionState, username, password, captchaAnswer, connectVtop])

  const retry = () => {
    setCaptchaAnswer('')
    setCaptchaImg(null)
    setError('')
    setStep('form')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="relative w-full max-w-sm rounded-2xl border border-border bg-card shadow-2xl shadow-black/60 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
              <Wifi className="size-3.5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">Connect VTOP</p>
              <p className="text-[11px] text-muted-foreground">Sync your academic data</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="size-4" />
          </button>
        </div>

        <AnimatePresence mode="wait">

          {/* ── Form / Captcha ─────────────────────────────────────────────── */}
          {(step === 'form' || step === 'captcha') && (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-5 space-y-4"
            >
              {error && (
                <div className="flex items-start gap-2 rounded-xl bg-red-950/40 border border-red-900/60 px-3 py-2.5 text-xs text-red-400">
                  <AlertCircle className="size-3.5 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Registration Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 2022BCE1313"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    disabled={step === 'captcha'}
                    className="w-full h-10 rounded-xl border border-border/60 bg-secondary/30 px-3 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 transition-colors disabled:opacity-60"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Password</label>
                  <input
                    type="password"
                    placeholder="Your VTOP password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    disabled={step === 'captcha'}
                    className="w-full h-10 rounded-xl border border-border/60 bg-secondary/30 px-3 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 transition-colors disabled:opacity-60"
                  />
                </div>
              </div>

              {/* Captcha section */}
              {step === 'captcha' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-3"
                >
                  {isRecaptcha ? (
                    <div className="rounded-xl bg-yellow-950/40 border border-yellow-900/60 px-4 py-3 text-xs text-yellow-400">
                      <p className="font-semibold mb-1">reCaptcha detected</p>
                      <p className="text-yellow-400/80 leading-relaxed">
                        VTOP is showing a Google reCaptcha. Try accessing from VIT&apos;s
                        network or VPN, then click Retry.
                      </p>
                      <button onClick={retry} className="mt-2 flex items-center gap-1 hover:text-yellow-300 transition-colors">
                        <RefreshCw className="size-3" /> Retry
                      </button>
                    </div>
                  ) : (
                    <>
                      {captchaImg && (
                        <div className="space-y-2">
                          <p className="text-[11px] text-muted-foreground">Enter the captcha shown below</p>
                          <div className="rounded-xl overflow-hidden border border-border/60 bg-white flex items-center justify-center p-2">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={captchaImg} alt="VTOP Captcha" className="max-h-14 object-contain" />
                          </div>
                        </div>
                      )}
                      <input
                        type="text"
                        placeholder="Type captcha here"
                        value={captchaAnswer}
                        onChange={e => setCaptchaAnswer(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && login()}
                        className="w-full h-10 rounded-xl border border-border/60 bg-secondary/30 px-3 text-sm tracking-widest placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 transition-colors"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={retry}
                          className="flex-1 h-9 rounded-xl border border-border/60 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                        >
                          ← Change credentials
                        </button>
                        <button
                          onClick={login}
                          disabled={!captchaAnswer.trim()}
                          className="flex-1 h-9 rounded-xl bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-40 hover:bg-primary/90 transition-colors"
                        >
                          Login &amp; Sync
                        </button>
                      </div>
                    </>
                  )}
                </motion.div>
              )}

              {step === 'form' && (
                <button
                  onClick={getCaptcha}
                  disabled={!username.trim() || !password.trim()}
                  className="w-full h-10 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40 hover:bg-primary/90 transition-colors"
                >
                  Continue →
                </button>
              )}

              <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
                Your credentials are sent directly to VTOP and never stored.
                Data is kept only in this browser session.
              </p>
            </motion.div>
          )}

          {/* ── Loading ────────────────────────────────────────────────────── */}
          {step === 'loading' && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-10 flex flex-col items-center gap-4"
            >
              <div className="relative">
                <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Wifi className="size-6 text-primary" />
                </div>
                <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-ping" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold">Connecting to VTOP…</p>
                <p className="text-xs text-muted-foreground mt-1">Fetching your academic data</p>
              </div>
              <Loader2 className="size-4 text-muted-foreground animate-spin" />
            </motion.div>
          )}

          {/* ── Success ────────────────────────────────────────────────────── */}
          {step === 'success' && vtopData && (
            <motion.div
              key="success"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-8 flex flex-col items-center gap-4"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                className="w-16 h-16 rounded-full bg-emerald-950/60 border border-emerald-800/60 flex items-center justify-center"
              >
                <CheckCircle2 className="size-8 text-emerald-400" />
              </motion.div>
              <div className="text-center">
                <p className="text-base font-bold text-emerald-400">Connected!</p>
                {vtopData.name && (
                  <p className="text-sm text-foreground mt-1">{vtopData.name}</p>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  {vtopData.gradeHistory.length} semesters · {vtopData.totalCredits} credits ·{' '}
                  CGPA {vtopData.cgpa.toFixed(2)}
                </p>
              </div>
              <div className="w-full grid grid-cols-2 gap-2 text-center">
                {[
                  { label: 'Semesters', value: vtopData.semesters.length },
                  { label: 'CGPA', value: vtopData.cgpa.toFixed(2) },
                ].map(s => (
                  <div key={s.label} className="rounded-xl bg-secondary/40 border border-border/60 px-3 py-2.5">
                    <p className="text-[11px] text-muted-foreground">{s.label}</p>
                    <p className="text-lg font-black text-foreground">{s.value}</p>
                  </div>
                ))}
              </div>
              <button
                onClick={onClose}
                className="w-full h-10 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
              >
                Done
              </button>
            </motion.div>
          )}

          {/* ── Error ──────────────────────────────────────────────────────── */}
          {step === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-8 flex flex-col items-center gap-4"
            >
              <div className="w-16 h-16 rounded-full bg-red-950/60 border border-red-800/60 flex items-center justify-center">
                <AlertCircle className="size-8 text-red-400" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-red-400">Connection failed</p>
                <p className="text-xs text-muted-foreground mt-2 max-w-xs leading-relaxed">{error}</p>
              </div>
              <button
                onClick={retry}
                className="w-full h-10 rounded-xl border border-border bg-secondary/30 text-sm font-medium hover:bg-secondary transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="size-3.5" /> Try again
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </motion.div>
    </div>
  )
}

// ── Compact status badge shown in the sidebar ─────────────────────────────────

export function VtopStatusBadge({ onClick }: { onClick: () => void }) {
  const { vtopConnected, vtopData, disconnectVtop } = useStore()

  if (vtopConnected && vtopData) {
    return (
      <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-emerald-950/40 border border-emerald-800/40">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-emerald-400 truncate">{vtopData.name || vtopData.regNumber}</p>
            <p className="text-[10px] text-muted-foreground">CGPA {vtopData.cgpa.toFixed(2)}</p>
          </div>
        </div>
        <button
          onClick={disconnectVtop}
          className={cn('text-muted-foreground hover:text-red-400 transition-colors shrink-0 ml-2')}
          title="Disconnect"
        >
          <WifiOff className="size-3.5" />
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-border/60 text-xs text-muted-foreground hover:text-foreground hover:border-border transition-colors"
    >
      <Wifi className="size-3.5 shrink-0" />
      <span>Connect VTOP</span>
    </button>
  )
}
