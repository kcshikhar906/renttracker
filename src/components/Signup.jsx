import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { motion } from "framer-motion";
import { HiOutlineUserAdd, HiOutlineMail, HiOutlineLockClosed, HiOutlineExclamationCircle } from "react-icons/hi";
import { db } from "../firebase";
import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    serverTimestamp,
    query,
    limit
} from "firebase/firestore";

export default function Signup() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const { signup } = useAuth();
    const navigate = useNavigate();

    async function handleSubmit(e) {
        e.preventDefault();

        if (password !== confirmPassword) {
            return setError("Security keys do not match.");
        }

        try {
            setError("");
            setLoading(true);

            // 🔍 Verification: Check if the user is on the Global Invitation List
            const inviteDoc = await getDoc(doc(db, "whitelists", email.toLowerCase()));

            // EMERGENCY BYPASS: If there are ZERO people in the whitelist, the first user becomes Admin.
            const whitelistSnap = await getDocs(query(collection(db, "whitelists"), limit(1)));
            const isWhitelistEmpty = whitelistSnap.empty;

            if (!inviteDoc.exists() && !isWhitelistEmpty) {
                throw new Error("This email is not on the authorized guest list. Please contact the administrator.");
            }

            const userCredential = await signup(email, password);

            // Initialize User Profile in Firestore
            await setDoc(doc(db, "users", userCredential.user.uid), {
                email: email.toLowerCase(),
                role: (isWhitelistEmpty || inviteDoc.data()?.role === "admin") ? "admin" : "user",
                createdAt: serverTimestamp(),
                lastLogin: serverTimestamp()
            });

            // If they are the first user, add them to the whitelist as well
            if (isWhitelistEmpty) {
                await setDoc(doc(db, "whitelists", email.toLowerCase()), {
                    role: "admin",
                    invitedBy: "system",
                    invitedAt: serverTimestamp()
                });
            }

            navigate("/");
        } catch (err) {
            console.error("Signup error:", err);
            let userMessage = err.message;
            if (err.code === "auth/email-already-in-use") {
                userMessage = "An account already exists with this identifier.";
            } else if (err.code === "auth/weak-password") {
                userMessage = "Security key is too weak. Use a stronger sequence.";
            }
            setError("Account provisioning failed. " + userMessage);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950">
            <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-slate-900 border border-slate-800 p-8 md:p-10 rounded-3xl w-full max-w-md shadow-2xl"
            >
                <div className="text-center mb-10">
                    <div className="w-16 h-16 bg-brand rounded-2xl flex items-center justify-center shadow-lg shadow-brand/20 mx-auto mb-6">
                        <HiOutlineUserAdd className="text-3xl text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-slate-100 tracking-tight">Provision Account</h1>
                    <p className="text-slate-500 mt-2 font-medium">Initialize your financial environment</p>
                </div>

                {error && (
                    <div className="bg-danger/10 border border-danger/20 text-danger p-4 rounded-xl mb-6 flex items-center gap-3">
                        <HiOutlineExclamationCircle className="text-xl flex-shrink-0" />
                        <span className="text-sm font-semibold tracking-tight">{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Email Identifier</label>
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

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Verify Security Key</label>
                        <div className="relative">
                            <HiOutlineLockClosed className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-lg" />
                            <input
                                type="password"
                                required
                                className="input-field pl-12"
                                placeholder="••••••••"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <button
                        disabled={loading}
                        type="submit"
                        className="btn-primary w-full py-4 uppercase tracking-widest font-bold text-sm mt-4"
                    >
                        {loading ? "Provisioning..." : "Initialize Account"}
                    </button>
                </form>

                <div className="mt-10 pt-8 border-t border-slate-800 text-center">
                    <p className="text-slate-500 text-sm font-medium">
                        Existing user?{" "}
                        <Link to="/login" className="text-brand hover:text-brand/80 font-bold transition-colors">
                            Authorize Access
                        </Link>
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
