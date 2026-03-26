'use client'

import { useTheme } from '../context/theme'
import { SunIcon, MoonIcon } from './icons'

export function ThemeToggle() {
  const { theme, toggle } = useTheme()

  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className="fixed top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
    >
      {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
    </button>
  )
}
