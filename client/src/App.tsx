import { Route, Switch, Redirect } from "wouter";
import { AuthProvider, useAuth } from "./lib/auth";
import PlatformDashboard from "./pages/platform-dashboard";
import LoginPage from "./pages/login";

function ProtectedRoute({ component: Component }: { component: React.ComponentType<any> }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen text-gray-400">Loading...</div>;
  if (!user) return <Redirect to="/login" />;
  return <Component />;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen text-gray-400">Loading...</div>;

  return (
    <Switch>
      <Route path="/login">
        {user ? <Redirect to="/dashboard" /> : <LoginPage />}
      </Route>
      <Route path="/dashboard">
        <ProtectedRoute component={PlatformDashboard} />
      </Route>
      <Route>
        {user ? <Redirect to="/dashboard" /> : <Redirect to="/login" />}
      </Route>
    </Switch>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
