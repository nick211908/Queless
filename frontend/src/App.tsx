import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Queue from './pages/Queue';
import Admin from './pages/Admin';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Layout from './components/Layout';
import { AuthProvider } from './context/AuthContext';

function App() {
    return (
        <AuthProvider>
            <Router>
                <Layout>
                    <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/auth" element={<Auth />} />
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/queue/:serviceId" element={<Queue />} />
                        <Route path="/admin/:serviceId" element={<Admin />} />
                    </Routes>
                </Layout>
            </Router>
        </AuthProvider>
    );
}

export default App;
