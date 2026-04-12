import { ChoreProfilesPanel } from '@/components/ChoreProfiles'
import { SidePanelPage } from '@/components/SidePanel'
import withAuth from '@/helpers/withAuth'

function ChoreProfiles() {
  return (
    <SidePanelPage>
      <ChoreProfilesPanel />
    </SidePanelPage>
  )
}

export default withAuth(ChoreProfiles)
