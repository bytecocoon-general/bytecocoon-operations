'use client'

import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'
import { useEffect, useState } from 'react'

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Avoid hydration mismatch — only render after mount
  useEffect(() => setMounted(true), [])
  if (!mounted) return <div className="w-8 h-8" />

  const isDark = theme === 'dark'

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
      className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 dark:hover:text-zinc-300 light:hover:text-zinc-600 hover:bg-zinc-800 dark:hover:bg-zinc-800 light:hover:bg-zinc-100 transition-colors"
    >
      {isDark
        ? <Sun  size={17} className="text-amber-400" />
        : <Moon size={17} className="text-violet-500" />
      }
    </button>
  )
}
