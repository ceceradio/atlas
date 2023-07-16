'use client'
import { ConversationPanel } from '@/components/Conversation'
import { SidePanelPage } from '@/components/SidePanel'
import withAuth from '@/helpers/withAuth'

function Zone() {
  return (
    <SidePanelPage>
      <ConversationPanel />
    </SidePanelPage>
  )
}

export default withAuth(Zone)
