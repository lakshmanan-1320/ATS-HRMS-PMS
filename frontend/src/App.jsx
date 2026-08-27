import AppRoutes from './routes/AppRoutes.jsx'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { ChatbotProvider } from './context/ChatbotContext.jsx'

export default function App() {
  return (
    <ChatbotProvider>
      <AppRoutes />
      <ToastContainer position="top-right" autoClose={4000} theme="colored" />
    </ChatbotProvider>
  )
}
