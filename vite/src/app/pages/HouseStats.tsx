import { HouseStatsPanel } from '@/components/HouseStats'
import { SidePanelPage } from '@/components/SidePanel'
import withAuth from '@/helpers/withAuth'

function HouseStats() {
  return (
    <SidePanelPage>
      <HouseStatsPanel />
    </SidePanelPage>
  )
}

export default withAuth(HouseStats)
