import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import StudentRoutes from './students/StudentRoutes';
import HRRoutes from './hr/HRRoutes';
import CoordinatorRoutes from './coordinator/CoordinatorRoutes';
import './students/styles/variables.css';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/students/*" element={<StudentRoutes />} />
        <Route path="/hr/*" element={<HRRoutes />} />
        <Route path="/coordinator/*" element={<CoordinatorRoutes />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
