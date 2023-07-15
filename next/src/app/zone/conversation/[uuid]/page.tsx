'use client'
import { ConversationPanel } from '@/components/conversation'
import { SidePanelPage } from '@/components/sidepanel'
import withAuth from '@/helpers/withAuth'
import { useParams } from 'next/navigation'

function ConversationDetails() {
  const { uuid } = useParams()
  return (
    <SidePanelPage>
      <ConversationPanel uuid={uuid} />
    </SidePanelPage>
  )
}

export default withAuth(ConversationDetails)
