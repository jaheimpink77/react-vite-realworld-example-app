import React from 'react'
import ReactDOM from 'react-dom'
import { QueryClient, QueryClientProvider } from 'react-query'
import { ReactQueryDevtools } from 'react-query/devtools'
import { createServer } from 'miragejs'
import axios from 'axios'
import App from './App'
import makeServer from './server'

// Set VITE_API_URL to point at the Django backend (e.g. http://localhost:8000/api locally,
// or the ALB/ECS service URL in production). Left unset in dev, requests stay relative so the
// Mirage mock server below can intercept them; in production we fall back to the demo API.
if (import.meta.env.VITE_API_URL) {
  axios.defaults.baseURL = import.meta.env.VITE_API_URL
} else if (process.env.NODE_ENV === 'production') {
  axios.defaults.baseURL = 'https://api.realworld.io/api'
}

const defaultQueryFn = async ({ queryKey }) => {
  const { data } = await axios.get(queryKey[0], { params: queryKey[1] })
  return data
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: defaultQueryFn,
      staleTime: 300000,
    },
  },
})

if (window.Cypress && process.env.NODE_ENV === 'test') {
  const cyServer = createServer({
    routes() {
      ;['get', 'put', 'patch', 'post', 'delete'].forEach((method) => {
        this[method]('/*', (schema, request) => window.handleFromCypress(request))
      })
    },
  })
  cyServer.logging = false
} else if (process.env.NODE_ENV === 'development' && !import.meta.env.VITE_API_URL) {
  // Only run the in-browser mock API when no real backend URL is configured.
  makeServer({ environment: 'development' })
}

ReactDOM.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <ReactQueryDevtools initialIsOpen={false} containerElement="div" />
    </QueryClientProvider>
  </React.StrictMode>,
  document.getElementById('root')
)
