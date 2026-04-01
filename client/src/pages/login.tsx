import { useState, useEffect } from "react";
import { useAuth } from "../lib/auth";
import { Eye, EyeOff, Loader2 } from "lucide-react";

interface PropertyBrand {
  name: string;
  agentName: string;
  logoUrl?: string;
  primaryColor?: string;
}

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [brand, setBrand] = useState<PropertyBrand | null>(null);

  useEffect(() => {
    fetch(`/api/public/brand?host=${encodeURIComponent(window.location.hostname)}`)
      .then(r => r.ok ? r.json() : null)
      .then((data: PropertyBrand | null) => { if (data) setBrand(data); })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message ?? "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: brand?.primaryColor ?? "#0F2942" }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="w-24 h-24 rounded-2xl bg-[#0F2942]/8 flex items-center justify-center shadow-inner">
              <svg style={{ width: 56, height: 56, stroke: "#2563EB", fill: "none", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" }} viewBox="0 0 24 24">
                <path d="M3 21V9l5-4v16H3zm6 0V7l6-5v19H9zm8 0V5l4-3v19h-4z"/>
              </svg>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{brand?.name ?? "LIRE Help"}</h1>
          <p className="text-sm text-gray-500 mt-1">Administration Panel</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              placeholder="admin@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <div className="relative">
              <input
                type={showPwd ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                placeholder="********"
              />
              <button type="button" onClick={() => setShowPwd(v => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" tabIndex={-1}>
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-semibold rounded-lg px-4 py-2.5 text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
