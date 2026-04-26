import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

export interface CardProps {
  children: ReactNode
  elevated?: boolean
  className?: string
  noPadding?: boolean
}

export function Card({ children, elevated = false, className = '', noPadding = false }: CardProps) {
  const baseClass = elevated ? 'glass-panel-elevated' : 'glass-panel'
  const paddingClass = noPadding ? '' : 'p-6 md:p-8'
  
  return (
    <motion.div 
      whileHover={elevated ? { y: -5 } : {}}
      className={`${baseClass} ${paddingClass} ${className}`}
    >
      {children}
    </motion.div>
  )
}
