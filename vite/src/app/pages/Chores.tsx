import { ChoresPanel } from '@/components/Chores'
import { SidePanelPage } from '@/components/SidePanel'
import withAuth from '@/helpers/withAuth'

function Chores() {
  return (
    <SidePanelPage>
      <ChoresPanel />
    </SidePanelPage>
  )
}

export default withAuth(Chores)
