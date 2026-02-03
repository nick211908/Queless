import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Queue from './pages/Queue';
import Admin from './pages/Admin';
import Layout from './components/Layout';

function App() {
    return (
        <Router>
            <Layout>
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/queue/:serviceId" element={<Queue />} />
                    <Route path="/admin/:serviceId" element={<Admin />} />
                </Routes>
            </Layout>
        </Router>
    );
}

export default App;
