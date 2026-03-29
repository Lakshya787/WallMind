import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

import Landing from './pages/Landing';
import Signup from './pages/Signup';
import Login from './pages/Login';
import VerifyEmail from './pages/VerifyEmail';
import Dashboard from './pages/Dashboard';
import Upload from './pages/Upload';
import AnalysisViewer from './pages/AnalysisViewer';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Routes WITH Global Layout */}
          <Route element={<Layout><Landing /></Layout>} path="/" />
          <Route element={<Layout><Signup /></Layout>} path="/signup" />
          <Route element={<Layout><Login /></Layout>} path="/login" />
          <Route element={<Layout><VerifyEmail /></Layout>} path="/verify-email" />
          
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/upload" 
            element={
              <ProtectedRoute>
                <Layout>
                  <Upload />
                </Layout>
              </ProtectedRoute>
            } 
          />

          {/* Routes WITHOUT Global Layout (Full screen tools) */}
          <Route 
            path="/analysis/:id" 
            element={
              <ProtectedRoute>
                <AnalysisViewer />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;