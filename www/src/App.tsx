import React, { ReactElement } from 'react'
import Login from './components/Login'
import logo from './logo.svg'
import './App.css'
import { useAuth0 } from '@auth0/auth0-react'
import LoginStatus from './components/LoginStatus'
import Logout from './components/Logout'

function App ():ReactElement {
  const { isAuthenticated, error, user } = useAuth0()
  return (
    <div className='App'>
      <header className='App-header'>
        <img src={logo} className='App-logo' alt='logo' />
        {(isAuthenticated)
              ? <Logout />
          : <Login />}
        {isAuthenticated && <LoginStatus></LoginStatus>}
        <h3>main user</h3>
        <code>{JSON.stringify(user, undefined, 2)}</code>
        <h3>main error</h3>
        <code>{JSON.stringify(error, undefined, 2)}</code>
      </header>
    </div>
  )
}

export default App
