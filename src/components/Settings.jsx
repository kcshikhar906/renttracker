import React, { useEffect, useState } from "react";
import Layout from "./Layout";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import {
    HiOutlineUser,
    HiOutlineMail,
    HiOutlineCurrencyDollar,
    HiOutlineCheckCircle,
    HiOutlineShieldCheck
} from "react-icons/hi";
import { motion, AnimatePresence } from "framer-motion";

export default function Settings() {
    const { currentUser } = useAuth();
    const [monthlyRent, setMonthlyRent] = useState("");
    const [loading, setLoading] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    useEffect(() => {
        async function loadSettings() {
            if (!currentUser) return;
            const docRef = doc(db, "settings", currentUser.uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                setMonthlyRent(docSnap.data().monthlyRent || "");
            }
        }
        loadSettings();
    }, [currentUser]);

    async function handleSaveSettings(e) {
        e.preventDefault();
        if (!currentUser) return;

        try {
            setLoading(true);
            await setDoc(doc(db, "settings", currentUser.uid), {
                monthlyRent: parseFloat(monthlyRent) || 0,
                updatedAt: new Date().toISOString()
            }, { merge: true });

            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (err) {
            console.error("Failed to save settings:", err);
            alert("Failed to save configuration.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <Layout>
            <div className="max-w-4xl mx-auto space-y-8">
                <div>
                    <h2 className="text-3xl font-bold text-slate-100 tracking-tight">System Settings</h2>
                    <p className="text-slate-500 mt-1">Configure your profile and rental parameters.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* User Profile Card */}
                    <div className="lg:col-span-1">
                        <div className="stats-card h-full flex flex-col items-center text-center p-8 bg-gradient-to-b from-slate-900 to-slate-950">
                            <div className="relative mb-6">
                                {currentUser?.photoURL ? (
                                    <img src={currentUser.photoURL} alt="Profile" className="w-24 h-24 rounded-full border-4 border-slate-800 shadow-2xl" />
                                ) : (
                                    <div className="w-24 h-24 rounded-full bg-slate-800 flex items-center justify-center border-4 border-slate-700">
                                        <HiOutlineUser className="text-4xl text-slate-500" />
                                    </div>
                                )}
                                <div className="absolute bottom-0 right-0 bg-brand p-1.5 rounded-full border-4 border-slate-950">
                                    <HiOutlineShieldCheck className="text-white text-sm" />
                                </div>
                            </div>
                            <h3 className="text-xl font-bold text-slate-100">{currentUser?.displayName || 'Authorized User'}</h3>
                            <p className="text-slate-500 text-sm mt-1">{currentUser?.email}</p>

                            <div className="mt-8 pt-8 border-t border-slate-800 w-full space-y-4">
                                <div className="flex items-center gap-3 text-left">
                                    <HiOutlineMail className="text-slate-600 text-xl" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Login Identifier</p>
                                        <p className="text-xs text-slate-300 truncate">{currentUser?.email}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Configuration Form */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="stats-card p-8">
                            <h4 className="text-lg font-bold text-slate-100 mb-6 flex items-center gap-3">
                                <span className="w-1 h-6 bg-brand rounded-full"></span>
                                Rental Configuration
                            </h4>

                            <form onSubmit={handleSaveSettings} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Fixed Monthly Rent</label>
                                    <div className="relative">
                                        <HiOutlineCurrencyDollar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-lg" />
                                        <input
                                            type="number"
                                            step="0.01"
                                            placeholder="0.00"
                                            className="input-field pl-12"
                                            value={monthlyRent}
                                            onChange={(e) => setMonthlyRent(e.target.value)}
                                        />
                                    </div>
                                    <p className="text-[10px] text-slate-600 px-1 mt-2 leading-relaxed">
                                        This value is used as a baseline for your "Rent" category transactions.
                                        Set this to your standard monthly payment amount.
                                    </p>
                                </div>

                                <div className="pt-4">
                                    <button
                                        disabled={loading || saveSuccess}
                                        type="submit"
                                        className="btn-primary w-full py-4 uppercase tracking-widest font-bold text-xs"
                                    >
                                        <AnimatePresence mode="wait">
                                            {loading ? (
                                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
                                                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                                    Syncing...
                                                </motion.div>
                                            ) : saveSuccess ? (
                                                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-2 text-success">
                                                    <HiOutlineCheckCircle className="text-lg" />
                                                    Configuration Updated
                                                </motion.div>
                                            ) : (
                                                "Commit Changes"
                                            )}
                                        </AnimatePresence>
                                    </button>
                                </div>
                            </form>
                        </div>

                        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
                            <h4 className="text-sm font-bold text-slate-400 mb-4 uppercase tracking-widest">Administrative Notice</h4>
                            <p className="text-xs text-slate-500 leading-relaxed italic">
                                These settings are stored globally for your account and affect how the dashboard calculates your financial summary.
                                Data encryption is applied at the document level using Firebase standard security protocols.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
