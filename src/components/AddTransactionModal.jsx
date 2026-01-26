import React, { useState, useEffect, useMemo } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";
import { db, storage } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import {
    collection,
    addDoc,
    serverTimestamp,
    getDocs,
    query,
    where,
    updateDoc,
    doc
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {
    HiOutlineX,
    HiOutlineCalendar,
    HiOutlineCurrencyDollar,
    HiOutlineDocumentText,
    HiOutlineUpload,
    HiOutlineCheckCircle,
    HiOutlineOfficeBuilding,
    HiOutlineClock,
    HiOutlineSwitchHorizontal,
    HiOutlineUserCircle
} from "react-icons/hi";
import { format, addWeeks, addDays, parseISO } from "date-fns";

export default function AddTransactionModal({ isOpen, onClose }) {
    const { currentUser } = useAuth();
    const [properties, setProperties] = useState([]);
    const [selectedPropertyId, setSelectedPropertyId] = useState("");

    // Form State
    const [type, setType] = useState("RENT");
    const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
    const [duration, setDuration] = useState("1"); // In weeks
    const [overrideStart, setOverrideStart] = useState("");
    const [showOverride, setShowOverride] = useState(false);
    const [notes, setNotes] = useState("");
    const [file, setFile] = useState(null);
    const [status, setStatus] = useState("PAID");
    const [tenant, setTenant] = useState("");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);


    // Fetch properties on open
    useEffect(() => {
        if (isOpen && currentUser) {
            async function fetchProperties() {
                const q = query(collection(db, "properties"), where("uid", "==", currentUser.uid));
                const snap = await getDocs(q);
                const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setProperties(data);
            }
            fetchProperties();
        }
    }, [isOpen, currentUser]);

    // Derived Property details
    const selectedProperty = useMemo(() =>
        properties.find(p => p.id === selectedPropertyId), [properties, selectedPropertyId]
    );

    // Auto-fill tenant when property changes
    useEffect(() => {
        if (selectedProperty) {
            setTenant(selectedProperty.tenantName);
        }
    }, [selectedProperty]);

    // Logic for Rent Periods
    const lastPaidTo = selectedProperty?.paidUpTo;
    const periodStart = showOverride && overrideStart ? overrideStart : (lastPaidTo ? format(addDays(parseISO(lastPaidTo), 1), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"));

    const periodEnd = useMemo(() => {
        if (duration === "CUSTOM") return periodStart;
        return format(addWeeks(parseISO(periodStart), parseInt(duration)), "yyyy-MM-dd");
    }, [periodStart, duration]);

    const totalAmount = useMemo(() => {
        if (!selectedProperty || isNaN(duration)) return 0;
        return selectedProperty.rentAmount * parseInt(duration);
    }, [selectedProperty, duration]);

    async function handleSubmit(e) {
        e.preventDefault();
        if (!currentUser) return;

        try {
            setLoading(true);
            let fileUrl = "";

            if (file) {
                const timestamp = Date.now();
                const fileName = `${timestamp}_${file.name}`;
                const storageRef = ref(storage, `receipts/${currentUser.uid}/${fileName}`);
                const uploadResult = await uploadBytes(storageRef, file);
                fileUrl = await getDownloadURL(uploadResult.ref);
            }

            const transactionData = {
                uid: currentUser.uid,
                propertyId: selectedPropertyId,
                propertyName: selectedProperty?.name || "Manual",
                type,
                date,
                amount: type === "RENT" ? totalAmount : parseFloat(e.target.manualAmount?.value || 0),
                notes,
                status,
                tenant,
                periodStart: type === "RENT" ? periodStart : null,
                periodEnd: type === "RENT" ? periodEnd : null,
                fileUrl: fileUrl || null,
                createdAt: serverTimestamp(),
            };

            // 1. Save Transaction
            await addDoc(collection(db, "transactions"), transactionData);

            // 2. Update Property (Transactional Fix)
            if (type === "RENT" && selectedPropertyId) {
                await updateDoc(doc(db, "properties", selectedPropertyId), {
                    paidUpTo: periodEnd,
                    updatedAt: new Date().toISOString()
                });
            }

            setSuccess(true);
            setTimeout(() => {
                setSuccess(false);
                resetForm();
                onClose();
            }, 1500);
        } catch (err) {
            console.error("Save error:", err);
            alert("Failed to secure transaction.");
        } finally {
            setLoading(false);
        }
    }

    function resetForm() {
        setSelectedPropertyId("");
        setNotes("");
        setFile(null);
        setDuration("1");
        setShowOverride(false);
    }

    return (
        <Transition.Root show={isOpen} as={Fragment}>
            <Dialog as="div" className="fixed inset-0 z-50 overflow-y-auto" onClose={onClose}>
                <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                    <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
                        <Dialog.Overlay className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity" />
                    </Transition.Child>

                    <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                    <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95" enterTo="opacity-100 translate-y-0 sm:scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 translate-y-0 sm:scale-100" leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95">
                        <div className="inline-block align-bottom bg-slate-900 rounded-3xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full border border-slate-800">
                            <div className="bg-slate-900 px-6 pt-6 pb-8 sm:p-10">
                                <div className="flex items-center justify-between mb-8">
                                    <Dialog.Title as="h3" className="text-2xl font-bold text-slate-100 flex items-center gap-3">
                                        <HiOutlineSwitchHorizontal className="text-brand" />
                                        Record Payment
                                    </Dialog.Title>
                                    <button onClick={onClose} className="text-slate-500 hover:text-white border border-slate-800 p-2 rounded-xl transition-all">
                                        <HiOutlineX className="text-xl" />
                                    </button>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-6">
                                    {/* Category & Property Selection */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Payment Category</label>
                                            <div className="flex p-1 bg-slate-950 rounded-2xl border border-slate-800/50">
                                                <button type="button" onClick={() => setType("RENT")} className={`flex-1 py-2 rounded-xl font-bold text-xs transition-all ${type === "RENT" ? "bg-brand text-white shadow-lg" : "text-slate-500 hover:text-slate-300"}`}>RENT</button>
                                                <button type="button" onClick={() => setType("BILL")} className={`flex-1 py-2 rounded-xl font-bold text-xs transition-all ${type === "BILL" ? "bg-warning text-white shadow-lg" : "text-slate-500 hover:text-slate-300"}`}>BILL</button>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Select Property</label>
                                            <div className="relative">
                                                <HiOutlineOfficeBuilding className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-lg" />
                                                <select
                                                    required
                                                    className="input-field pl-12 appearance-none"
                                                    value={selectedPropertyId}
                                                    onChange={(e) => setSelectedPropertyId(e.target.value)}
                                                >
                                                    <option value="">Select a unit...</option>
                                                    {properties.map(p => (
                                                        <option key={p.id} value={p.id}>{p.name} - ${p.rentAmount}/wk</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    {type === "RENT" && selectedProperty && (
                                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="bg-slate-950 rounded-3xl p-6 border border-slate-800/50 space-y-6">
                                            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                                                <div className="flex items-center gap-3">
                                                    <HiOutlineClock className="text-slate-500 text-xl" />
                                                    <div>
                                                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest leading-none mb-1">Last Coverage End</p>
                                                        <p className="text-sm font-bold text-slate-300">{lastPaidTo ? format(parseISO(lastPaidTo), "MMM dd, yyyy") : "N/A"}</p>
                                                    </div>
                                                </div>
                                                <button type="button" onClick={() => setShowOverride(!showOverride)} className={`text-[10px] font-bold px-3 py-1.5 rounded-full border transition-all ${showOverride ? "bg-brand/10 border-brand text-brand" : "border-slate-800 text-slate-500"}`}>
                                                    OVERRIDE DATE
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Period Start</label>
                                                    <input
                                                        type="date"
                                                        readOnly={!showOverride}
                                                        className={`input-field !bg-slate-950 font-bold ${!showOverride ? "border-transparent opacity-60" : "border-brand"}`}
                                                        value={periodStart}
                                                        onChange={(e) => setOverrideStart(e.target.value)}
                                                    />
                                                </div>

                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Duration</label>
                                                    <select className="input-field appearance-none" value={duration} onChange={(e) => setDuration(e.target.value)}>
                                                        <option value="1">1 Week</option>
                                                        <option value="2">2 Weeks</option>
                                                        <option value="4">4 Weeks</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="bg-slate-900 rounded-2xl p-4 flex items-center justify-between border border-slate-800/50">
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1">Coverage End</p>
                                                    <p className="text-lg font-black text-white">{format(parseISO(periodEnd), "MMMM dd, yyyy")}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1">Total Due</p>
                                                    <p className="text-lg font-black text-success">${totalAmount.toFixed(2)}</p>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Payment Date</label>
                                            <div className="relative">
                                                <HiOutlineCalendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                                                <input type="date" className="input-field pl-12" value={date} onChange={(e) => setDate(e.target.value)} />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Tenant</label>
                                            <div className="relative">
                                                <HiOutlineUserCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-lg" />
                                                <input className="input-field pl-12" value={tenant} onChange={(e) => setTenant(e.target.value)} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Evidence / Proof</label>
                                        <div className="group relative border border-slate-800 rounded-2xl p-6 hover:border-brand/40 transition-all bg-slate-950/20">
                                            <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={(e) => setFile(e.target.files[0])} />
                                            <div className="flex items-center gap-4">
                                                <HiOutlineUpload className="text-2xl text-slate-600 group-hover:text-brand transition-colors" />
                                                <span className="text-xs text-slate-500 group-hover:text-slate-300 truncate">{file ? file.name : "Upload screenshot/receipt"}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-4 flex items-center gap-4">
                                        <button disabled={loading || success} type="submit" className="btn-primary flex-1 py-4 text-xs font-black uppercase tracking-[0.2em]">
                                            {loading ? "Authorizing..." : success ? "Verified & Saved" : "Confirm Settlement"}
                                        </button>
                                        <div className="flex items-center gap-2">
                                            <div className={`w-3 h-3 rounded-full ${status === 'PAID' ? 'bg-success' : 'bg-warning'} animate-pulse`}></div>
                                            <span className="text-[10px] font-black text-slate-500 uppercase">System Active</span>
                                        </div>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </Transition.Child>
                </div>
            </Dialog>
        </Transition.Root>
    );
}
