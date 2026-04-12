import { InvitePanel } from '@/components/Invite'
import { SidePanelPage } from '@/components/SidePanel'
import withAuth from '@/helpers/withAuth'

function Invite() {
  return (
    <SidePanelPage>
      <InvitePanel />
    </SidePanelPage>
  )
}

export default withAuth(Invite)
