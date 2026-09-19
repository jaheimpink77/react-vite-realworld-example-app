import axios from 'axios'
import { isEmpty } from 'lodash-es'
import { useSnapshot } from 'valtio'
import { proxyWithComputed } from 'valtio/utils'

function getAuthUser() {
  const jwt = window.localStorage.getItem('jwtToken')

  if (!jwt) return {}

  return JSON.parse(atob(jwt))
}

function setAuthHeader(token) {
  if (token) {
    axios.defaults.headers.Authorization = `Token ${token}`
  } else {
    delete axios.defaults.headers.Authorization
  }
}

const initialAuthUser = getAuthUser()

// The session is rehydrated from localStorage on every page load, so the request
// header has to be restored here too - not only in login() - or a reloaded tab
// renders as authenticated while sending anonymous requests.
setAuthHeader(initialAuthUser.token)

const state = proxyWithComputed(
  {
    authUser: initialAuthUser,
  },
  {
    isAuth: (snap) => !isEmpty(snap.authUser),
  }
)

const actions = {
  login: (user) => {
    state.authUser = user

    window.localStorage.setItem('jwtToken', btoa(JSON.stringify(state.authUser)))

    setAuthHeader(state.authUser.token)
  },
  logout: () => {
    state.authUser = {}

    window.localStorage.removeItem('jwtToken')

    setAuthHeader(null)
  },
  checkAuth: () => {
    const authUser = getAuthUser()

    if (!authUser || isEmpty(authUser)) {
      actions.logout()
    }
  },
}

// A stored token the API rejects (expired, or left over from the Mirage mock server)
// otherwise keeps isAuth true forever: the UI renders as signed in while every
// authenticated request 401s. Drop the session so the user is sent back to sign-in.
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      actions.logout()
    }
    return Promise.reject(error)
  }
)

function useAuth() {
  const snap = useSnapshot(state)

  return {
    ...snap,
    ...actions,
  }
}

export default useAuth
