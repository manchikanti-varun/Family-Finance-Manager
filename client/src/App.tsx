import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, ProtectedRoute } from './auth';
import Shell from './Shell';
import Login from './pages/Login';
import DashboardPage from './pages/DashboardPage';
import Transactions from './pages/Transactions';
import Accounts from './pages/Accounts';
import People from './pages/People';
import Events from './pages/Events';
import EventDetail from './pages/EventDetail';
import Placeholder from './pages/Placeholder';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute><Shell /></ProtectedRoute>}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/accounts" element={<Accounts />} />
            <Route path="/cards" element={<Accounts cardsOnly />} />
            <Route path="/people" element={<People />} />
            <Route path="/events" element={<Events />} />
            <Route path="/events/:eventId" element={<EventDetail />} />
            <Route path="/budgets" element={<Placeholder title="Budgets" />} />
            <Route path="/bills" element={<Placeholder title="Bills" />} />
            <Route path="/analytics" element={<Placeholder title="Analytics" />} />
            <Route path="/ai" element={<Placeholder title="AI Assistant" note="A read-only assistant that answers questions from your real transaction data is planned." />} />
            <Route path="/settings" element={<Placeholder title="Settings" />} />
          </Route>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
