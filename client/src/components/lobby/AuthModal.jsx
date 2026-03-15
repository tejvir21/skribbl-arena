import { useState } from "react";
import { X, LogIn, UserPlus, Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuthStore, useNotifStore } from "../../store";
import { authAPI } from "../../api";

export default function AuthModal({ mode, onClose, onSwitch }) {
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const { setAuth } = useAuthStore();
  const { addNotif } = useNotifStore();

  const isLogin = mode === "login";

  const validate = () => {
    const errs = {};
    if (!form.email) errs.email = "Email required";
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = "Invalid email";
    if (!form.password) errs.password = "Password required";
    else if (form.password.length < 6) errs.password = "Min 6 characters";
    if (!isLogin) {
      if (!form.username) errs.username = "Username required";
      else if (form.username.length < 3) errs.username = "Min 3 characters";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const { user, token } = isLogin
        ? await authAPI.login({ email: form.email, password: form.password })
        : await authAPI.register(form);
      setAuth(user, token);
      addNotif({ type: "success", message: `Welcome${isLogin ? " back" : ""}, ${user.username}! 🎨` });
      onClose();
    } catch (err) {
      addNotif({ type: "error", message: typeof err === "string" ? err : "Authentication failed" });
    } finally {
      setLoading(false);
    }
  };

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((er) => ({ ...er, [field]: null }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="arena-card p-8 max-w-md w-full mx-4 animate-slide-up" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-display text-2xl text-gradient flex items-center gap-2">
              {isLogin ? <LogIn size={22} /> : <UserPlus size={22} />}
              {isLogin ? "Welcome Back" : "Join the Arena"}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {isLogin ? "Sign in to track your stats and climb the leaderboard" : "Create your account and start drawing"}
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">Username</label>
              <input
                className={`input-field ${errors.username ? "border-red-500/50" : ""}`}
                placeholder="YourUsername"
                value={form.username}
                onChange={set("username")}
                maxLength={20}
                autoComplete="username"
              />
              {errors.username && <p className="text-red-400 text-xs mt-1">{errors.username}</p>}
            </div>
          )}

          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">Email</label>
            <input
              className={`input-field ${errors.email ? "border-red-500/50" : ""}`}
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={set("email")}
              autoComplete="email"
            />
            {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">Password</label>
            <div className="relative">
              <input
                className={`input-field pr-10 ${errors.password ? "border-red-500/50" : ""}`}
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={form.password}
                onChange={set("password")}
                autoComplete={isLogin ? "current-password" : "new-password"}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password}</p>}
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full py-3 flex items-center justify-center gap-2 mt-2">
            {loading ? <Loader2 size={18} className="animate-spin" /> : isLogin ? <LogIn size={18} /> : <UserPlus size={18} />}
            {loading ? "Please wait..." : isLogin ? "Sign In" : "Create Account"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            {isLogin ? "Don't have an account?" : "Already have an account?"}
            {" "}
            <button
              onClick={() => onSwitch(isLogin ? "register" : "login")}
              className="text-arena-purple hover:text-arena-purple/80 font-semibold transition-colors"
            >
              {isLogin ? "Sign up" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
