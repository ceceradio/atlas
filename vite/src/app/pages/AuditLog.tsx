import { AuditLogPanel } from '@/components/AuditLog'
import { SidePanelPage } from '@/components/SidePanel'
import withAuth from '@/helpers/withAuth'

function AuditLog() {
  return (
    <SidePanelPage>
      <AuditLogPanel />
    </SidePanelPage>
  )
}

export default withAuth(AuditLog)
