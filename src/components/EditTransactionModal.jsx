import React, { useState, useEffect, useMemo } from "react";
import { Dialog, Transition, TransitionChild, DialogPanel, DialogBackdrop, DialogTitle } from "@headlessui/react";
import { Fragment } from "react";
import { motion } from "framer-motion";
import { db, storage } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import {
    doc,
    updateDoc,
    getDocs,
    query,
    collection,
    where,
    Timestamp
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {
    HiOutlineX,
    HiOutlineCalendar,
    HiOutlineCurrencyDollar,
    HiOutlineUpload,
    HiOutlineOfficeBuilding,
    HiOutlineClock,
    HiOutlineSwitchHorizontal,
    HiOutlineUserCircle,
    HiOutlinePencilAlt
} from "react-icons/hi";
import { format, parseISO, isValid, addDays, addWeeks } from "date-fns";

export default function EditTransactionModal({ isOpen, onClose, transaction }) {
    const { currentUser } = useAuth();
    const [properties, setProperties] = useState([]);

    // Form State
    const [type, setType] = useState("RENT");
    const [date, setDate] = useState("");
    const [duration, setDuration] = useState("1");
    const [periodStart, setPeriodStart] = useState("");
    const [billAmount, setBillAmount] = useState("");
    const [utilityType, setUtilityType] = useState("ELECTRICITY");
    const [status, setStatus] = useState("PAID");
    const [notes, setNotes] = useState("");
    const [tenant, setTenant] = useState("");
    const [file, setFile] = useState(null);

    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    // Initialize form when transaction changes
    useEffect(() => {
        if (transaction) {
            setType(transaction.type || "RENT");
            setStatus(transaction.status || "PAID");
            setNotes(transaction.notes || "");
            setTenant(transaction.tenant || "");

            // Format Date for input
            const d = transaction.date?.toDate ? transaction.date.toDate() : new Date();
            setDate(format(d, "yyyy-MM-dd"));

            if (transaction.type === "RENT") {
                setDuration(transaction.duration || "1");
                setPeriodStart(transaction.periodStart || "");
            } else {
                setBillAmount(transaction.amount?.toString() || "");
                setUtilityType(transaction.utilityType || "ELECTRICITY");
            }
        }
    }, [transaction]);

    // Fetch properties for the dropdown
    useEffect(() => {
        if (isOpen && currentUser) {
            async function fetchProperties() {
                try {
                    const q = query(collection(db, "properties"), where("uid", "==", currentUser.uid));
                    const snap = await getDocs(q);
                    const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    setProperties(data);
                } catch (err) {
                    console.error("Error fetching properties:", err);
                }
            }
            fetchProperties();
        }
    }, [isOpen, currentUser]);

    const periodEnd = useMemo(() => {
        if (type !== "RENT") return null;
        const start = parseISO(periodStart);
        if (!isValid(start)) return periodStart;
        const daysToAdd = (parseInt(duration) * 7) - 1;
        return format(addDays(start, daysToAdd), "yyyy-MM-dd");
    }, [periodStart, duration, type]);

    async function handleSubmit(e) {
        e.preventDefault();
        if (!currentUser || !transaction) return;

        try {
            setLoading(true);
            let fileUrl = transaction.fileUrl || "";

            if (file) {
                const timestamp = Date.now();
                const fileName = `${timestamp}_${file.name}`;
                const storageRef = ref(storage, `receipts/${currentUser.uid}/${fileName}`);
                const uploadResult = await uploadBytes(storageRef, file);
                fileUrl = await getDownloadURL(uploadResult.ref);
            }

            const settlementDate = parseISO(date);
            const startD = type === "RENT" ? parseISO(periodStart) : null;
            const endD = type === "RENT" ? parseISO(periodEnd) : null;

            const updatedData = {
                type,
                status,
                notes,
                tenant,
                date: Timestamp.fromDate(isValid(settlementDate) ? settlementDate : new Date()),
                fileUrl: fileUrl,
                updatedAt: Timestamp.now()
            };

            if (type === "RENT") {
                updatedData.periodStart = periodStart;
                updatedData.periodEnd = periodEnd;
                updatedData.startDate = isValid(startD) ? Timestamp.fromDate(startD) : null;
                updatedData.endDate = isValid(endD) ? Timestamp.fromDate(endD) : null;
                // Note: Keep existing amount unless we want to recalculate? 
                // Usually editing a rent transaction shouldn't trigger total change unless intentional.
            } else {
                updatedData.amount = parseFloat(billAmount || 0);
                updatedData.utilityType = utilityType;
            }

            await updateDoc(doc(db, "transactions", transaction.id), updatedData);

            setSuccess(true);
            setTimeout(() => {
                setSuccess(false);
                onClose();
            }, 1000);
        } catch (err) {
            console.error("Update error:", err);
            alert("Failed to update: " + err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <Transition show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <DialogBackdrop transition className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl transition-opacity duration-300" />

                <div className="fixed inset-0 z-50 w-screen overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4">
                        <TransitionChild
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 translate-y-12 scale-95"
                            enterTo="opacity-100 translate-y-0 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 translate-y-0 scale-100"
                            leaveTo="opacity-0 translate-y-12 scale-95"
                        >
                            <DialogPanel className="relative transform overflow-hidden rounded-[2.5rem] bg-slate-900 shadow-2xl transition-all w-full max-w-2xl border border-slate-800/50">
                                <div className="bg-slate-900 px-6 pt-10 pb-8 sm:p-12">
                                    <div className="flex items-center justify-between mb-10">
                                        <DialogTitle as="h3" className="text-3xl font-black text-white tracking-tight flex items-center gap-4">
                                            <div className="p-3 bg-warning/20 rounded-2xl shadow-lg border border-warning/30">
                                                <HiOutlinePencilAlt className="text-warning text-2xl" />
                                            </div>
                                            Modify Settlement
                                        </DialogTitle>
                                        <button onClick={onClose} className="text-slate-500 hover:text-white bg-slate-850 p-3 rounded-2xl transition-all active:scale-90">
                                            <HiOutlineX className="text-xl" />
                                        </button>
                                    </div>

                                    <form onSubmit={handleSubmit} className="space-y-8">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Resident / Tenant</label>
                                                <div className="relative">
                                                    <HiOutlineUserCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-lg" />
                                                    <input
                                                        className="input-field pl-12"
                                                        value={tenant}
                                                        onChange={(e) => setTenant(e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Settlement Status</label>
                                                <select
                                                    className="input-field font-black uppercase tracking-widest text-[10px]"
                                                    value={status}
                                                    onChange={(e) => setStatus(e.target.value)}
                                                >
                                                    <option value="PAID">✅ SETTLED / PAID</option>
                                                    <option value="UNPAID">❌ UNPAID / PENDING</option>
                                                </select>
                                            </div>
                                        </div>

                                        {type === "BILL" && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Utility Category</label>
                                                    <select
                                                        className="input-field font-bold"
                                                        value={utilityType}
                                                        onChange={(e) => setUtilityType(e.target.value)}
                                                    >
                                                        <option value="ELECTRICITY">⚡ Electricity</option>
                                                        <option value="GAS">🔥 Gas / Heating</option>
                                                        <option value="WIFI">🌐 Wifi / Internet</option>
                                                        <option value="WATER">💧 Water</option>
                                                        <option value="COUNCIL">🏢 Council Rates</option>
                                                        <option value="OTHER">📦 Other Utility</option>
                                                    </select>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Invoice Amount</label>
                                                    <div className="relative">
                                                        <HiOutlineCurrencyDollar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-lg" />
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            required
                                                            className="input-field pl-12 font-bold"
                                                            value={billAmount}
                                                            onChange={(e) => setBillAmount(e.target.value)}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Filing Date</label>
                                                <input type="date" className="input-field" value={date} onChange={(e) => setDate(e.target.value)} />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Documentation</label>
                                                <div className="relative group">
                                                    <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={(e) => setFile(e.target.files[0])} />
                                                    <div className="input-field flex items-center gap-3 overflow-hidden">
                                                        <HiOutlineUpload className="text-slate-500 flex-shrink-0" />
                                                        <span className="text-xs text-slate-400 truncate">{file ? file.name : (transaction?.fileUrl ? "Update Current Receipt" : "Attach Proof")}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Audit Notes</label>
                                            <textarea className="input-field h-24 pt-4 resize-none font-medium text-slate-300" placeholder="Administrative comments..." value={notes} onChange={(e) => setNotes(e.target.value)} />
                                        </div>

                                        <button disabled={loading || success} type="submit" className="btn-primary w-full py-5 text-xs font-black uppercase tracking-[0.3em] shadow-2xl bg-warning hover:bg-warning/90 border-warning shadow-warning/20">
                                            {loading ? "Syncing..." : success ? "Verified & Updated" : "Apply Audit Changes"}
                                        </button>
                                    </form>
                                </div>
                            </DialogPanel>
                        </TransitionChild>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}
