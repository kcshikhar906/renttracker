import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { db } from "../firebase";
import { doc, getDoc, Timestamp } from "firebase/firestore";
import { format, isAfter } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
    HiOutlineShieldCheck,
    HiOutlineClock,
    HiOutlineExclamationTriangle,
    HiOutlineBuildingOffice,
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

    const safeDate = (dateVal) => {
        if (!dateVal) return null;
        if (typeof dateVal.toDate === 'function') return dateVal.toDate();
        if (dateVal.seconds) return new Timestamp(dateVal.seconds, dateVal.nanoseconds).toDate();
        const parsed = new Date(dateVal);
        return isNaN(parsed.getTime()) ? null : parsed;
    };

    const generatePDF = () => {
        if (!ticket) return;
        const doc = new jsPDF();
        const accentColor = [15, 23, 42];

        // 1. Header
        doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
        doc.rect(0, 0, 210, 45, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont(undefined, 'bold');
        doc.text("VERIFIED STATEMENT", 105, 20, { align: "center" });

        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(148, 163, 184);
        doc.text(`AUDIT VERIFICATION ID: ${token.substring(0, 16).toUpperCase()}`, 105, 30, { align: "center" });
        doc.text(`VERIFIED ON ${format(new Date(), "MMMM dd, yyyy")}`, 105, 36, { align: "center" });

        // 2. Info Box
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text("SETTLEMENT DETAILS", 14, 60);

        const tableData = [
            ["Property Asset:", ticket.propertyName],
            ["Resident/Tenant:", ticket.tenant || "System Record"],
            ["Category:", ticket.type === "RENT" ? "Housing Rental" : (ticket.utilityType || ticket.category || "Utility Bill")],
            ["Verified Amount:", `$${ticket.amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}`],
            ["Status:", ticket.status],
            ["Filing Date:", safeDate(ticket.date) ? format(safeDate(ticket.date), "MMMM dd, yyyy") : "N/A"]
        ];

        if (ticket.type === "RENT") {
            tableData.push(["Rental Period:", `${format(safeDate(ticket.periodStart), "MMM dd")} - ${format(safeDate(ticket.periodEnd), "MMM dd, yyyy")}`]);
        }

        autoTable(doc, {
            startY: 65,
            body: tableData,
            theme: 'plain',
            styles: { fontSize: 10, cellPadding: 2 },
            columnStyles: {
                0: { fontStyle: 'bold', textColor: [100, 116, 139], cellWidth: 40 },
                1: { textColor: [15, 23, 42], fontStyle: 'bold' }
            }
        });

        const currentY = (doc).lastAutoTable.finalY + 15;

        // 3. Notes
        if (ticket.notes) {
            doc.setFontSize(12);
            doc.setFont(undefined, 'bold');
            doc.text("AUDIT NOTES", 14, currentY);
            doc.setFontSize(9);
            doc.setFont(undefined, 'italic');
            doc.setTextColor(100, 116, 139);
            const splitNotes = doc.splitTextToSize(ticket.notes, 182);
            doc.text(splitNotes, 14, currentY + 7);
        }

        // 4. Verification Footer
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text("This document was generated from a verified live ledger on RentTracker.", 105, 285, { align: "center" });

        doc.save(`Audit_${ticket.propertyName.replace(/\s+/g, '_')}.pdf`);
    };

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
                                        <HiOutlineBuildingOffice className="text-brand opacity-60" /> Asset
                                    </p>
                                    <p className="text-lg font-bold text-white truncate">{ticket.propertyName}</p>
                                </div>
                                <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl space-y-1 group hover:border-brand/30 transition-all">
                                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-2">
                                        <HiOutlineClock className="text-brand opacity-60" /> Expires In
                                    </p>
                                    <p className="text-lg font-bold text-white">
                                        {safeDate(ticket.expiresAt) ? format(safeDate(ticket.expiresAt), "MMMM dd") : "N/A"}
                                    </p>
                                </div>
                                <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl space-y-1 group hover:border-brand/30 transition-all">
                                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-2">
                                        <HiOutlineLockClosed className="text-brand opacity-60" /> Security
                                    </p>
                                    <p className="text-lg font-bold text-white uppercase tracking-tighter">Encrypted</p>
                                </div>
                            </div>

                            {/* Transaction Summary Grid */}
                            <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] overflow-hidden">
                                <div className="bg-slate-800/30 px-8 py-4 border-b border-slate-800 flex items-center justify-between">
                                    <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <HiOutlineShieldCheck className="text-brand" /> Audit Summary
                                    </h2>
                                    <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full uppercase tracking-tighter shadow-lg shadow-emerald-500/5">
                                        Verified Settlement
                                    </span>
                                </div>
                                <div className="p-8 sm:p-10 grid grid-cols-1 sm:grid-cols-2 gap-y-8 gap-x-12">
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Verified Amount</p>
                                        <p className="text-3xl font-black text-white leading-none">
                                            ${ticket.amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Recipient / Tenant</p>
                                        <p className="text-lg font-bold text-white truncate">{ticket.tenant || "System Record"}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest border-t border-slate-800 pt-3">Classification</p>
                                        <p className="text-sm font-bold text-slate-300">
                                            {ticket.type === "RENT" ? "Housing Rental" : (ticket.utilityType || ticket.category || "Utility Bill")}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest border-t border-slate-800 pt-3">Filing Date</p>
                                        <p className="text-sm font-bold text-slate-300">
                                            {safeDate(ticket.date) ? format(safeDate(ticket.date), "MMMM dd, yyyy") : "N/A"}
                                        </p>
                                    </div>

                                    {ticket.type === "RENT" && ticket.periodStart && (
                                        <div className="sm:col-span-2 bg-slate-950/50 rounded-2xl p-6 border border-slate-800/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                                            <div className="flex items-center gap-4">
                                                <div className="p-3 bg-brand/10 text-brand rounded-xl">
                                                    <HiOutlineClock className="text-xl" />
                                                </div>
                                                <div>
                                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Rental Duration</p>
                                                    <p className="text-sm font-bold text-white">
                                                        {format(safeDate(ticket.periodStart), "MMM dd")} — {format(safeDate(ticket.periodEnd), "MMM dd, yyyy")}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="h-px sm:h-8 w-full sm:w-px bg-slate-800"></div>
                                            <div className="text-center sm:text-right">
                                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Proof Status</p>
                                                <p className="text-sm font-bold text-emerald-400 capitalize">{ticket.status}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                {ticket.notes && (
                                    <div className="px-8 pb-8 sm:px-10 sm:pb-10">
                                        <div className="bg-slate-950/30 rounded-2xl p-6 border border-slate-800/30">
                                            <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-2">Audit Notes</p>
                                            <p className="text-xs text-slate-400 leading-relaxed italic">"{ticket.notes}"</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Image Viewport Heading */}
                            <div className="flex items-center gap-4 px-4">
                                <div className="h-px flex-1 bg-slate-800"></div>
                                <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em]">Document Attachment</h3>
                                <div className="h-px flex-1 bg-slate-800"></div>
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
                                            Audit ID: {token.substring(0, 16).toUpperCase()}
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[8px] font-black text-emerald-500/60 uppercase tracking-tighter">Live Audit Active</span>
                                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-lg shadow-emerald-500/50"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Self-Service Download Section */}
                            <div className="flex justify-center">
                                <button
                                    onClick={generatePDF}
                                    className="flex items-center gap-3 px-10 py-5 bg-emerald-500 text-white rounded-[2rem] font-black text-[11px] uppercase tracking-[0.2em] hover:bg-emerald-400 transition-all shadow-2xl shadow-emerald-500/20 active:scale-95 group"
                                >
                                    <HiOutlineShieldCheck className="text-lg group-hover:scale-110 transition-transform" />
                                    Download Official Statement
                                </button>
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
