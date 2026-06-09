// Shared primitives — every visual matches docs/design-system.md.

import React from 'react'
import type { WordStatus } from '../types'

type BadgeVariant = 'sec' | 'known' | 'unknown' | 'unseen' | 'pos'

const BADGE: Record<BadgeVariant, string> = {
  sec: 'bg-gr1 text-gr6',
  known: 'bg-g100 text-g700',
  unknown: 'bg-r100 text-r700',
  unseen: 'border-[.5px] border-gr2 text-gr6',
  pos: 'border-[.5px] border-gr2 text-gr4 !text-[10px] tracking-[.02em]',
}

interface BadgeProps {
  variant?: BadgeVariant
  className?: string
  children: React.ReactNode
}

export function Badge({ variant = 'sec', className = '', children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-sm px-2.5 py-[3px] text-[11px] font-medium tracking-[.04em] ${BADGE[variant]} ${className}`}
    >
      {children}
    </span>
  )
}

type ButtonVariant = 'primary' | 'ghost' | 'outline' | 'know' | 'dont'

const BTN: Record<ButtonVariant, string> = {
  primary: 'bg-blk text-wht hover:bg-gr8',
  ghost: 'bg-transparent border-[.5px] border-gr2 text-gr6 hover:border-gr4',
  outline: 'bg-transparent border-[1.5px] border-blk text-blk hover:bg-blk hover:text-wht',
  know: 'bg-g800 text-wht',
  dont: 'bg-r800 text-wht',
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  className?: string
}

export function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex h-11 select-none items-center justify-center gap-2 rounded-md px-[18px] text-sm font-medium transition-colors disabled:opacity-40 ${BTN[variant]} ${className}`}
      {...props}
    />
  )
}

interface ProgressBarProps {
  value?: number
  className?: string
}

export function ProgressBar({ value = 0, className = '' }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(1, value)) * 100
  return (
    <div className={`h-[5px] overflow-hidden rounded-full bg-gr1 ${className}`}>
      <div className="h-full rounded-full bg-blk transition-[width] duration-300" style={{ width: `${pct}%` }} />
    </div>
  )
}

interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean
  className?: string
}

export function Chip({ active = false, className = '', ...props }: ChipProps) {
  return (
    <button
      className={`min-h-[34px] whitespace-nowrap rounded-full border-[.5px] px-3.5 py-[7px] text-[13px] font-medium transition-colors ${
        active ? 'border-blk bg-blk text-wht' : 'border-gr2 bg-transparent text-gr6 hover:border-gr4'
      } ${className}`}
      {...props}
    />
  )
}

interface SegToggleProps<T extends string | number> {
  options: readonly { id: T; label: string }[]
  value: T
  onChange: (id: T) => void
  className?: string
}

/** Single-select segmented control — a connected bar, distinct from multi-select pills. */
export function SegToggle<T extends string | number>({ options, value, onChange, className = '' }: SegToggleProps<T>) {
  return (
    <div className={`flex rounded-md bg-gr0 p-[3px] ${className}`}>
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={`flex-1 whitespace-nowrap rounded-[6px] px-3 py-1.5 text-xs transition-colors ${
            value === o.id ? 'bg-wht font-medium text-blk shadow-[0_1px_2px_rgba(0,0,0,.05)]' : 'text-gr4'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

interface CountdownProps {
  secLeft: number
}

/** Read-only countdown pill (ring turns red in the last 5s). */
export function Countdown({ secLeft }: CountdownProps) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-gr6 tnum">
      <span
        className="inline-block h-3 w-3 rounded-full border-2 border-gr2"
        style={{ borderTopColor: secLeft <= 5 ? 'var(--color-r700)' : 'var(--color-blk)' }}
      />
      {secLeft}s
    </span>
  )
}

const DOT: Record<WordStatus, string> = { known: 'bg-g700', unknown: 'bg-r700', unseen: 'bg-gr2' }

interface StatusDotProps {
  status?: WordStatus
  className?: string
}

export function StatusDot({ status = 'unseen', className = '' }: StatusDotProps) {
  return <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${DOT[status]} ${className}`} />
}

interface AppBarProps {
  title: string
  onBack?: () => void
  right?: React.ReactNode
}

export function AppBar({ title, onBack, right }: AppBarProps) {
  return (
    <header className="flex items-center gap-3 px-[18px] pb-3.5 pt-2">
      {onBack && (
        <button
          onClick={onBack}
          aria-label="返回"
          className="-ml-2 flex h-9 w-9 items-center justify-center text-2xl leading-none text-gr6 hover:text-blk"
        >
          ‹
        </button>
      )}
      <h2 className="text-base font-semibold text-blk">{title}</h2>
      {right && <div className="ml-auto flex items-center">{right}</div>}
    </header>
  )
}
