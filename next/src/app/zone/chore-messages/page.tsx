'use client'
import { ChoreMessagesPanel } from '@/components/ChoreMessages'
import { SidePanelPage } from '@/components/SidePanel'
import withAuth from '@/helpers/withAuth'

function ChoreMessages() {
  return (
    <SidePanelPage>
      <ChoreMessagesPanel />
    </SidePanelPage>
  )
}

export default withAuth(ChoreMessages)
