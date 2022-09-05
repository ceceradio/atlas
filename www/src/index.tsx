import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
//import reportWebVitals from './reportWebVitals'
import { Auth0Provider, useAuth0 } from '@auth0/auth0-react'
import { BrowserRouter, Route, Routes, useNavigate } from 'react-router-dom'

const { REACT_APP_LOCAL_DOMAIN } = process.env

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement)
const Auth0Config = {
  domain: 'https://dev-kxsxjl8r.us.auth0.com',
  clientId: '9zHeSGx7JMoz9qrVh1SmaGrDthgEFn0L',
  redirectUri: 'https://localhost:3000/',
}

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <Auth0Provider
        domain={Auth0Config.domain}
        clientId={Auth0Config.clientId}
        redirectUri={Auth0Config.redirectUri}
        audience={REACT_APP_LOCAL_DOMAIN}
      >
        <Routes>
          <Route path="/" element={<App />}></Route>
          <Route path="/callback" element={<AuthCallback />}></Route>
        </Routes>
      </Auth0Provider>
    </BrowserRouter>
  </React.StrictMode>,
)

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
//reportWebVitals()

function AuthCallback() {
  const { getAccessTokenSilently, loginWithRedirect } = useAuth0()
  const navigate = useNavigate()
  useEffect(() => {
    if (!navigate || !getAccessTokenSilently) return
    ;(async () => {
      try {
        const token = await getAccessTokenSilently()
        console.log(token)
        navigate('/')
      } catch (e) {
        console.error(e)
        if ((e as Record<string, string>).error === 'login_required')
          loginWithRedirect()
        else navigate('/')
      }
    })()
  }, [navigate, getAccessTokenSilently])
  return <h3>loading...</h3>
}
