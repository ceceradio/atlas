import { IAPIOrganization, OrganizationSettings } from '@atlas/api'

const BASE = `https://${process.env.NEXT_PUBLIC_DOMAIN}/api`

export type DiscordChannel = {
  id: string
  name: string
  guildId: string
  guildName: string
}

export async function getOrganization(token: string): Promise<IAPIOrganization> {
  const response = await fetch(`${BASE}/organization`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return response.json()
}

export async function updateOrganizationSettings(
  token: string,
  settings: OrganizationSettings,
): Promise<IAPIOrganization> {
  const response = await fetch(`${BASE}/organization`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ settings }),
  })
  return response.json()
}

export async function getDiscordChannels(token: string): Promise<DiscordChannel[]> {
  const response = await fetch(`${BASE}/discord/channels`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return response.json()
}
