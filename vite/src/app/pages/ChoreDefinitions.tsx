import { ChoreDefinitionsPanel } from '@/components/ChoreDefinitions'
import { SidePanelPage } from '@/components/SidePanel'
import withAuth from '@/helpers/withAuth'

function ChoreDefinitions() {
  return (
    <SidePanelPage>
      <ChoreDefinitionsPanel />
    </SidePanelPage>
  )
}

export default withAuth(ChoreDefinitions)
