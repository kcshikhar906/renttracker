import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { format, isAfter } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import {
    HiOutlineShieldCheck,
    HiOutlineClock,
    HiOutlineExclamationTriangle,
    HiOutlineOfficeBuilding,
    HiOutlineLink,
    HiOutlineLockClosed
} from "react-icons/hi2";

export default function ProofVerifier() {
    const { token } = useParams();
    const [loading, setLoading] = useState(true);
    const [ticket, setTicket] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchTicket = async () => {
            try {
                if (!token) throw new Error("Missing Security Token");

                const docRef = doc(db, "shared_links", token);
                const docSnap = await getDoc(docRef);

                if (!docSnap.exists()) {
                    throw new Error("This audit link is invalid or has been revoked by the owner.");
                }

                const data = docSnap.data();

                // Check Expiration
                const expiry = data.expiresAt?.toDate();
                if (expiry && isAfter(new Date(), expiry)) {
                    throw new Error("This security link has expired. Document access is no longer permitted.");
                }

                setTicket(data);
            } catch (err) {
                console.error("Verification error:", err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchTicket();
    }, [token]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6">
                <div className="w-16 h-16 border-4 border-brand/20 border-t-brand rounded-full animate-spin mb-6"></div>
                <p className="text-slate-500 font-bold uppercase tracking-[0.3em] text-[10px] animate-pulse">Initializing Security Protocol</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 selection:bg-brand selection:text-white">
            <div className="max-w-4xl mx-auto px-6 py-12 sm:py-24">
                <AnimatePresence mode="wait">
                    {error ? (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 sm:p-16 text-center space-y-8 shadow-2xl"
                        >
                            <div className="w-24 h-24 bg-danger/10 text-danger rounded-3xl flex items-center justify-center mx-auto shadow-2xl shadow-danger/5">
                                <HiOutlineExclamationTriangle className="text-5xl" />
                            </div>
                            <div className="space-y-4">
                                <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Access Denied</h1>
                                <p className="text-slate-400 font-medium leading-relaxed max-w-md mx-auto">{error}</p>
                            </div>
                            <div className="pt-8 border-t border-slate-800">
                                <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">RentTracker Ledger • Security Subsystem</p>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="space-y-10"
                        >
                            {/* Verified Badge */}
                            <div className="flex flex-col items-center text-center space-y-4">
                                <div className="flex items-center gap-3 px-6 py-3 bg-emerald-500/10 border border-emerald-500/30 rounded-full">
                                    <HiOutlineShieldCheck className="text-emerald-500 text-xl" />
                                    <span className="text-[11px] font-black text-emerald-500 uppercase tracking-widest leading-none">Verified Audit Document</span>
                                </div>
                                <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tighter uppercase">Document Portal</h1>
                                <p className="text-slate-500 font-bold text-xs uppercase tracking-[0.2em] max-w-sm">Secure viewport for encrypted property ledger records</p>
                            </div>

                            {/* Info Card */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl space-y-1 group hover:border-brand/30 transition-all">
                                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-2">
                                        <HiOutlineOfficeBuilding className="text-brand opacity-60" /> Asset
                                    </p>
                                    <p className="text-lg font-bold text-white truncate">{ticket.propertyName}</p>
                                </div>
                                <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl space-y-1 group hover:border-brand/30 transition-all">
                                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-2">
                                        <HiOutlineClock className="text-brand opacity-60" /> Expires In
                                    </p>
                                    <p className="text-lg font-bold text-white">
                                        {format(ticket.expiresAt.toDate(), "MMMM dd")}
                                    </p>
                                </div>
                                <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl space-y-1 group hover:border-brand/30 transition-all">
                                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-2">
                                        <HiOutlineLockClosed className="text-brand opacity-60" /> Security
                                    </p>
                                    <p className="text-lg font-bold text-white uppercase tracking-tighter">Encrypted</p>
                                </div>
                            </div>

                            {/* Image Viewport */}
                            <div className="relative group">
                                <div className="absolute -inset-1 bg-gradient-to-r from-brand to-indigo-600 rounded-[3rem] blur opacity-10 group-hover:opacity-20 transition duration-1000"></div>
                                <div className="relative bg-slate-900 border border-slate-800 rounded-[3rem] overflow-hidden shadow-2xl">
                                    <div className="p-4 sm:p-10">
                                        {ticket.fileUrl ? (
                                            <div className="flex flex-col items-center">
                                                <img
                                                    src={ticket.fileUrl}
                                                    alt="Audit Proof"
                                                    className="max-w-full h-auto rounded-2xl shadow-inner select-none pointer-events-none"
                                                    onContextMenu={(e) => e.preventDefault()}
                                                />
                                            </div>
                                        ) : (
                                            <div className="py-20 text-center">
                                                <HiOutlineLink className="text-6xl text-slate-800 mx-auto mb-6" />
                                                <p className="text-slate-600 font-black uppercase tracking-widest text-xs">No image attached to this ticket</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Sub-footer inside portal */}
                                    <div className="bg-slate-950/50 border-t border-slate-800/50 px-8 py-5 flex items-center justify-between">
                                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                                            Audit ID: {token.substring(0, 16)}
                                        </p>
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-lg shadow-emerald-500/50"></div>
                                    </div>
                                </div>
                            </div>

                            {/* Footer Branding */}
                            <div className="text-center pt-8 space-y-6">
                                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-slate-900 border border-slate-800 rounded-full text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em]">
                                    Powered by RentTracker Audit Subsystem
                                </div>
                                <p className="text-[10px] text-slate-700 font-medium leading-relaxed max-w-md mx-auto">
                                    This documentation is provided as an authenticated record for property settlements. Sharing of this link grants temporary access to internal ledger proofs. access will be automatically revoked upon expiry.
                                </p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
