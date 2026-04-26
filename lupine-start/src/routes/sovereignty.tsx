import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/sovereignty')({
  beforeLoad: () => {
    throw redirect({ to: '/proof', replace: true })
  },
})
