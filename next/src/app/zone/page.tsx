'use client'
import { ConversationPanel } from '@/components/conversation'
import { SidePanelPage } from '@/components/sidepanel'
import withAuth from '@/helpers/withAuth'

function Zone() {
  return (
    <SidePanelPage>
      <ConversationPanel />
    </SidePanelPage>
  )
}

export default withAuth(Zone)
