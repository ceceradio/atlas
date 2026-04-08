import { ChoreImportPanel } from '@/components/ChoreImport'
import { SidePanelPage } from '@/components/SidePanel'
import withAuth from '@/helpers/withAuth'

function ChoreImport() {
  return (
    <SidePanelPage>
      <ChoreImportPanel />
    </SidePanelPage>
  )
}

export default withAuth(ChoreImport)
