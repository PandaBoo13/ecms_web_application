import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import toast from 'react-hot-toast'
import 'antd/dist/reset.css'
import './index.css'
import App from './App.tsx'

// ── Chặn message lỗi kỹ thuật từ BE (401 / token) ──
const _toastError = toast.error.bind(toast)
;(toast as any).error = (msg: any, opts?: any) => {
  const text = typeof msg === 'string' ? msg : ''
  if (/access token not found|unauthorized|authentication required/i.test(text)) {
    return ''
  }
  return _toastError(msg, opts)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: { fontSize: 14 },
        }}
      />
    </BrowserRouter>
  </StrictMode>,
)