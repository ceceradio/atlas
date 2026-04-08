import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Providers } from './helpers/Providers'
import './app/globals.css'

import Home from './app/pages/Home'
import About from './app/pages/About'
import Login from './app/pages/Login'
import Rsvp from './app/pages/Rsvp'
import Zone from './app/pages/Zone'
import ConversationDetails from './app/pages/ConversationDetails'
import Chores from './app/pages/Chores'
import ChoreMessages from './app/pages/ChoreMessages'
import ChoreImport from './app/pages/ChoreImport'

export default function App() {
  return (
    <BrowserRouter>
      <Providers>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/login" element={<Login />} />
          <Route path="/rsvp" element={<Rsvp />} />
          <Route path="/zone" element={<Zone />} />
          <Route path="/zone/conversation/:uuid" element={<ConversationDetails />} />
          <Route path="/zone/chores" element={<Chores />} />
          <Route path="/zone/chore-messages" element={<ChoreMessages />} />
          <Route path="/zone/chore-import" element={<ChoreImport />} />
        </Routes>
      </Providers>
    </BrowserRouter>
  )
}
