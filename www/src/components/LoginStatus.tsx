import { useApi } from '../hooks/useApi'
import { useEffect } from 'react'
const {REACT_APP_LOCAL_DOMAIN, REACT_APP_API_BASE} = process.env

export default function LoginStatus () {
  const opts = {
    audience: REACT_APP_LOCAL_DOMAIN,
  }
  const {
    loading,
    refresh,
    error,
    data
  } = useApi(REACT_APP_API_BASE + '/hello', opts)
  useEffect(() => 
    refresh
  ,[])
  useEffect(() => {
                 if (error!=null) {
      console.error(error) 
    }
  },[error])
  return (

    <div>
      <h3>User Metadata</h3>
      <button onClick={refresh}>Load Data</button>
      <h3>loading</h3>
      <code>{JSON.stringify(loading, undefined, 2)}</code>
      <h3>data</h3>
      <code>{JSON.stringify(data, undefined, 2)}</code>
      <h3>error</h3>
      <code>{JSON.stringify(error, undefined, 2)}</code>
    </div>

  )
}
