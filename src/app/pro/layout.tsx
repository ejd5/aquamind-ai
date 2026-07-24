import { ProRouteShell } from '@/components/pro/pro-route-shell'

export default function ProLayout({ children }: { children: React.ReactNode }) {
  return <ProRouteShell>{children}</ProRouteShell>
}
