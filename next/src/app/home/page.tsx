'use client'

import { Box, Button } from '@chakra-ui/react'
import Link from 'next/link'

export default function Home() {
  return (
    <Box>
      <Box>You require an organization to login</Box>
      <Button>
        <Link href="/login">Login</Link>
      </Button>
      <Box>
        its da smart home ai you&apos;ve always wanted but now its freakin real
        <hr />
        <ul>
          <li>groceries running out? not a problem</li>
          <li>dishes not getting done? we got ya back</li>
          <li>wanna know when ya laundry is done? u can do that</li>
          <li>
            how good is your budget? could you do anything different? we can
            answer that
          </li>
          <li>
            do you want a huge beautiful woman with a prominent nose to live in
            your computer in your home and help you with it?
          </li>
          <li>
            do you struggle with reminders for what to do around the house?
            especially maintenance tasks that have to occur once a year?
          </li>
          <li>
            do you want to know how equitable your financial arrangement is?
          </li>
          <p>how about a computer that lives rent free in your home?</p>
        </ul>
      </Box>
    </Box>
  )
}
