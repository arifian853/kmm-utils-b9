import { Route, Routes } from 'react-router-dom'
import './App.css'
import { Home } from './pages/Home/Home'
import { Absensi } from './pages/Absensi/Absensi'

function App() {

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/absensi" element={<Absensi />} />
    </Routes>
  )
}

export default App
