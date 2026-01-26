import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { motion } from "framer-motion";
import { HiOutlineLogin, HiOutlineMail, HiOutlineLockClosed, HiOutlineExclamationCircle } from "react-icons/hi";
import { FcGoogle } from "react-icons/fc";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const { login, googleLogin } = useAuth();
    const navigate = useNavigate();

    async function handleSubmit(e) {
        e.preventDefault();

        try {
            setError("");
            setLoading(true);
            await login(email, password);
            navigate("/");
        } catch (err) {
            setError("Session authentication failed. Verify credentials.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    async function handleGoogleLogin() {
        try {
            setError("");
            setLoading(true);
            await googleLogin();
            navigate("/");
        } catch (err) {
            setError("Google authentication failed.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 text-slate-200">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-900 border border-slate-800 p-8 md:p-10 rounded-3xl w-full max-w-md shadow-2xl"
            >
                <div className="text-center mb-10">
                    <div className="w-16 h-16 bg-brand rounded-2xl flex items-center justify-center shadow-lg shadow-brand/20 mx-auto mb-6">
                        <HiOutlineLogin className="text-3xl text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-slate-100 tracking-tight">Admin Portal</h1>
                    <p className="text-slate-500 mt-2 font-medium">Access your financial ledger</p>
                </div>

                {error && (
                    <div className="bg-danger/10 border border-danger/20 text-danger p-4 rounded-xl mb-6 flex items-center gap-3">
                        <HiOutlineExclamationCircle className="text-xl flex-shrink-0" />
                        <span className="text-sm font-semibold tracking-tight">{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Identifier</label>
                        <div className="relative">
                            <HiOutlineMail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-lg" />
                            <input
                                type="email"
                                required
                                className="input-field pl-12"
                                placeholder="corporate@domain.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Security Key</label>
                        <div className="relative">
                            <HiOutlineLockClosed className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-lg" />
                            <input
                                type="password"
                                required
                                className="input-field pl-12"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <button
                        disabled={loading}
                        type="submit"
                        className="btn-primary w-full py-4 uppercase tracking-widest font-bold text-sm"
                    >
                        {loading ? "Authenticating..." : "Authorize Access"}
                    </button>
                </form>

                <div className="relative my-8 text-center uppercase">
                    <hr className="border-slate-800" />
                    <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900 px-4 text-[10px] font-bold text-slate-600 tracking-widest">
                        or continue with
                    </span>
                </div>

                <button
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-3 bg-white text-slate-900 font-bold py-4 rounded-xl hover:bg-slate-100 transition-colors uppercase tracking-widest text-sm"
                >
                    <FcGoogle className="text-2xl" />
                    Sign in with Google
                </button>

                <div className="mt-10 pt-8 border-t border-slate-800 text-center">
                    <p className="text-slate-500 text-sm font-medium">
                        Unauthorized?{" "}
                        <Link to="/signup" className="text-brand hover:text-brand/80 font-bold transition-colors">
                            Create Account
                        </Link>
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
