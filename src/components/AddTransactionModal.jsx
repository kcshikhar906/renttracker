import React, { useState, useEffect, useMemo } from "react";
import { createWorker } from "tesseract.js";
import { Dialog, Transition, TransitionChild, DialogPanel, DialogBackdrop, DialogTitle } from "@headlessui/react";
import { Fragment } from "react";
import { motion } from "framer-motion";
import { db, storage } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import {
    collection,
    addDoc,
    serverTimestamp,
    getDocs,
    query,
    where,
    orderBy,
    limit,
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
    HiOutlineArrowNarrowRight,
    HiOutlineInformationCircle,
    HiOutlineSearchCircle,
    HiOutlineSparkles
} from "react-icons/hi";
import { format, addWeeks, addDays, parseISO, isValid, isBefore, isAfter, isSameDay } from "date-fns";

export default function AddTransactionModal({ isOpen, onClose }) {
    const { currentUser } = useAuth();
    const [properties, setProperties] = useState([]);
    const [selectedPropertyId, setSelectedPropertyId] = useState("");

    // History State
    const [lastTxHistory, setLastTxHistory] = useState(null);

    // Form State
    const [type, setType] = useState("RENT");
    const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
    const [duration, setDuration] = useState("1"); // 1-5 weeks
    const [manualStart, setManualStart] = useState(format(new Date(), "yyyy-MM-dd"));
    const [billAmount, setBillAmount] = useState("");
    const [utilityType, setUtilityType] = useState("ELECTRICITY");
    const [status, setStatus] = useState("PAID");
    const [notes, setNotes] = useState("");
    const [file, setFile] = useState(null);
    const [tenant, setTenant] = useState("");
    const [loading, setLoading] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [success, setSuccess] = useState(false);

    // Fetch properties
    useEffect(() => {
        if (isOpen && currentUser) {
            const q = query(collection(db, "users", currentUser.uid, "properties"));
            const unsubscribe = onSnapshot(q, (snapshot) => {
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setProperties(data);
            }, (error) => {
                console.error("Error fetching properties:", error);
            });

            return () => unsubscribe(); // Cleanup listener on unmount or if dependencies change
        }
    }, [isOpen, currentUser]);

    // Derived Property details
    const selectedProperty = useMemo(() =>
        properties.find(p => p.id === selectedPropertyId), [properties, selectedPropertyId]
    );

    // Smart Date Logic: Fetch last transaction when property changes
    useEffect(() => {
        if (selectedPropertyId && type === "RENT") {
            async function fetchLastTx() {
                try {
                    const q = query(
                        collection(db, "users", currentUser.uid, "transactions"),
                        where("propertyId", "==", selectedPropertyId),
                        orderBy("periodEnd", "desc"),
                        limit(1)
                    );
                    const snap = await getDocs(q);
                    if (!snap.empty) {
                        const lastTx = { id: snap.docs[0].id, ...snap.docs[0].data() };
                        console.log("Last Transaction Found:", lastTx);
                        setLastTxHistory(lastTx);
                    } else {
                        console.log("No previous transaction found for property:", selectedPropertyId);
                        setLastTxHistory(null);
                    }
                } catch (err) {
                    console.error("Error fetching history:", err);
                    setLastTxHistory(null);
                }
            }
            fetchLastTx();
        } else {
            setLastTxHistory(null);
        }
    }, [selectedPropertyId, type, currentUser]);

    // Calculate Period Start
    const periodStart = useMemo(() => {
        if (lastTxHistory?.periodEnd) {
            const lastEndDate = typeof lastTxHistory.periodEnd === 'string'
                ? parseISO(lastTxHistory.periodEnd)
                : lastTxHistory.periodEnd.toDate();

            if (isValid(lastEndDate)) {
                return format(addDays(lastEndDate, 1), "yyyy-MM-dd");
            }
        }
        return manualStart;
    }, [lastTxHistory, manualStart]);

    const periodEnd = useMemo(() => {
        const start = parseISO(periodStart);
        if (!isValid(start)) return periodStart;

        // Ensure 7 days per week inclusive: (1 week starts Monday, ends Sunday)
        // Calculation: duration weeks * 7 days - 1 day offset
        const daysToAdd = (parseInt(duration) * 7) - 1;
        return format(addDays(start, daysToAdd), "yyyy-MM-dd");
    }, [periodStart, duration]);

    // Historical Rent Logic
    const historicalRentData = useMemo(() => {
        if (!selectedProperty || type !== "RENT") return null;

        const currentPeriodStart = parseISO(periodStart);
        if (!isValid(currentPeriodStart)) return null;

        const history = [...(selectedProperty.rentHistory || [])];
        if (history.length === 0) return { amount: selectedProperty.rentAmount, sourceDate: null };

        // Sort by effective date ascending to find the right segment
        history.sort((a, b) => {
            const dateA = a.effectiveDate?.toDate ? a.effectiveDate.toDate() : new Date();
            const dateB = b.effectiveDate?.toDate ? b.effectiveDate.toDate() : new Date();
            return dateA - dateB;
        });

        // Find the LATEST entry where effectiveDate <= currentPeriodStart
        let activeEntry = null;
        for (const entry of history) {
            const effDate = entry.effectiveDate?.toDate ? entry.effectiveDate.toDate() : new Date();
            if (isBefore(effDate, currentPeriodStart) || isSameDay(effDate, currentPeriodStart)) {
                activeEntry = entry;
            }
        }

        if (activeEntry) {
            return {
                amount: activeEntry.amount,
                sourceDate: activeEntry.effectiveDate
            };
        }

        // Default to the first history entry if everything is ahead, or the current rentAmount
        return { amount: history[0].amount, sourceDate: history[0].effectiveDate };
    }, [selectedProperty, periodStart, type]);

    const activeRentRate = historicalRentData?.amount || selectedProperty?.rentAmount || 0;

    const totalAmount = useMemo(() => {
        return activeRentRate * parseInt(duration);
    }, [activeRentRate, duration]);

    // Receipt OCR Scanning Logic
    async function handleScanReceipt() {
        if (!file) {
            alert("Please attach a receipt image (JPG/PNG) first.");
            return;
        }

        try {
            setIsScanning(true);
            const worker = await createWorker('eng');
            const { data: { text } } = await worker.recognize(file);
            console.log("Extracted OCR Text:", text);

            // 1. Extract Amount (Handles $, £, €, and plain numbers with decimals)
            const amountRegex = /(?:\$|£|€)?\s*(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})\b/g;
            const matches = [...text.matchAll(amountRegex)];
            if (matches.length > 0) {
                const amounts = matches.map(m => parseFloat(m[1].replace(/[, ]/g, '')));
                const maxAmount = Math.max(...amounts);
                if (maxAmount > 0) {
                    setBillAmount(maxAmount.toFixed(2));
                    if (type === "RENT" && !selectedPropertyId) {
                        setType("BILL");
                    }
                }
            }

            // 2. Extract Date (Handles DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD)
            const dateRegex = /(\d{1,4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,4})/;
            const dateMatch = text.match(dateRegex);
            if (dateMatch) {
                let [_, p1, p2, p3] = dateMatch;
                let y, m, d;

                if (p1.length === 4) { // YYYY-MM-DD
                    y = p1; m = p2; d = p3;
                } else if (p3.length === 4 || p3.length === 2) { // DD/MM/YYYY or MM/DD/YYYY
                    y = p3.length === 2 ? "20" + p3 : p3;
                    // Ambiguous cases usually default to local preference, 
                    // Let's assume DD/MM if p1 <= 31 and p2 <= 12
                    d = p1; m = p2;
                }

                const isoDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
                if (isValid(parseISO(isoDate))) {
                    setDate(isoDate);
                }
            }

            // 3. Smart Property Detection
            const detectedProperty = properties.find(p =>
                text.toLowerCase().includes(p.name.toLowerCase()) ||
                (p.address && text.toLowerCase().includes(p.address.toLowerCase()))
            );
            if (detectedProperty) {
                setSelectedPropertyId(detectedProperty.id);
            }

            // 4. Utility Type Keywords
            const lowerText = text.toLowerCase();
            if (lowerText.includes("elect") || lowerText.includes("power") || lowerText.includes("energy")) setUtilityType("ELECTRICITY");
            else if (lowerText.includes("gas")) setUtilityType("GAS");
            else if (lowerText.includes("water")) setUtilityType("WATER");
            else if (lowerText.includes("internet") || lowerText.includes("wifi") || lowerText.includes("telecom")) setUtilityType("WIFI");
            else if (lowerText.includes("council") || lowerText.includes("tax")) setUtilityType("COUNCIL");
            else if (lowerText.includes("repair") || lowerText.includes("maintenance")) setUtilityType("OTHER");

            await worker.terminate();

            // Final Step: If we detected it's likely a rent receipt (by property match or keywords)
            if (lowerText.includes("rent") || lowerText.includes("lease")) {
                setType("RENT");
            }

            alert("AI Scan Complete: Verified data injected into form.");
        } catch (err) {
            console.error("OCR Error:", err);
            alert("AI Scan Failed: Ensure the image is clear and text is legible.");
        } finally {
            setIsScanning(false);
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();
        if (!currentUser) return;
        if (type === "RENT" && !selectedPropertyId) {
            alert("Please select a property first.");
            return;
        }
        if (type === "RENT" && !tenant) {
            alert("Please select which tenant paid.");
            return;
        }

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

            const settlementDate = parseISO(date);
            const startD = parseISO(periodStart);
            const endD = parseISO(periodEnd);

            const payload = {
                propertyId: selectedPropertyId || null,
                propertyName: selectedProperty?.name || "Manual/Other",
                type,
                date: Timestamp.fromDate(isValid(settlementDate) ? settlementDate : new Date()),
                amount: type === "RENT" ? totalAmount : parseFloat(billAmount || 0),
                utilityType: type === "BILL" ? utilityType : null,
                rentRate: activeRentRate,
                notes,
                status: status,
                tenant,
                periodStart: type === "RENT" ? periodStart : null,
                periodEnd: type === "RENT" ? periodEnd : null,
                startDate: type === "RENT" && isValid(startD) ? Timestamp.fromDate(startD) : null,
                endDate: type === "RENT" && isValid(endD) ? Timestamp.fromDate(endD) : null,
                fileUrl: fileUrl || null,
            };

            const finalPayload = {
                ...payload,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                isDeleted: false
            };

            await addDoc(collection(db, "users", currentUser.uid, "transactions"), finalPayload);

            setSuccess(true);
            setTimeout(() => {
                setSuccess(false);
                resetForm();
                onClose();
            }, 1500);
        } catch (err) {
            console.error("Save error:", err);
            alert("Failed to secure transaction: " + err.message);
        } finally {
            setLoading(false);
        }
    }

    function resetForm() {
        setSelectedPropertyId("");
        setBillAmount("");
        setNotes("");
        setFile(null);
        setDuration("1");
        setUtilityType("ELECTRICITY");
        setStatus("PAID");
        setManualStart(format(new Date(), "yyyy-MM-dd"));
        setTenant("");
        setLastTxHistory(null);
    }

    function safeFormat(dateStr, formatStr) {
        if (!dateStr) return "N/A";
        const parsed = parseISO(dateStr);
        return isValid(parsed) ? format(parsed, formatStr) : "Invalid Date";
    }

    function formatTs(ts) {
        if (!ts) return "N/A";
        const d = ts.toDate ? ts.toDate() : new Date();
        return format(d, "MMM dd, yyyy");
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
                                <div className="bg-slate-900 px-5 py-8 sm:p-12">
                                    <div className="flex items-center justify-between mb-10">
                                        <DialogTitle as="h3" className="text-3xl font-black text-white tracking-tight flex items-center gap-4">
                                            <div className="p-3 bg-brand rounded-2xl shadow-lg shadow-brand/20">
                                                <HiOutlineSwitchHorizontal className="text-white text-2xl" />
                                            </div>
                                            Record Settlement
                                        </DialogTitle>
                                        <button onClick={onClose} className="text-slate-500 hover:text-white bg-slate-850 p-3 rounded-2xl transition-all active:scale-90">
                                            <HiOutlineX className="text-xl" />
                                        </button>
                                    </div>

                                    <form onSubmit={handleSubmit} className="space-y-8">
                                        {/* Category Selection */}
                                        <div className="flex p-1.5 bg-slate-950 rounded-2xl border border-slate-800/50">
                                            <button type="button" onClick={() => setType("RENT")} className={`flex-1 py-3.5 rounded-xl font-black text-[10px] tracking-[0.2em] uppercase transition-all ${type === "RENT" ? "bg-brand text-white shadow-lg shadow-brand/20" : "text-slate-500 hover:text-slate-300"}`}>RENT</button>
                                            <button type="button" onClick={() => setType("BILL")} className={`flex-1 py-3.5 rounded-xl font-black text-[10px] tracking-[0.2em] uppercase transition-all ${type === "BILL" ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20" : "text-slate-500 hover:text-slate-300"}`}>BILL</button>
                                            <button type="button" onClick={() => setType("SCAN")} className={`flex-1 py-3.5 rounded-xl font-black text-[10px] tracking-[0.2em] uppercase transition-all ${type === "SCAN" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" : "text-slate-500 hover:text-slate-300"}`}>✨ AI SCAN</button>
                                        </div>

                                        {type === "SCAN" ? (
                                            <div className="space-y-6 py-4">
                                                <div className="relative group border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-[2rem] p-12 transition-all bg-slate-950/30 text-center">
                                                    <input
                                                        type="file"
                                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                        onChange={(e) => setFile(e.target.files[0])}
                                                        accept="image/*,.pdf"
                                                    />
                                                    <div className="space-y-4">
                                                        <div className="w-20 h-20 bg-indigo-600/10 rounded-full flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                                                            <HiOutlineUpload className="text-4xl text-indigo-500" />
                                                        </div>
                                                        <div>
                                                            <p className="text-lg font-bold text-white">{file ? file.name : "Drop receipt or screenshot here"}</p>
                                                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Smart-match will detect property & amount</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {file && (
                                                    <button
                                                        type="button"
                                                        onClick={handleScanReceipt}
                                                        disabled={isScanning}
                                                        className="w-full py-5 bg-indigo-600 text-white font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50"
                                                    >
                                                        {isScanning ? (
                                                            <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                        ) : (
                                                            <HiOutlineSparkles className="text-xl" />
                                                        )}
                                                        {isScanning ? "AI IS ANALYZING..." : "START AI EXTRACTION"}
                                                    </button>
                                                )}

                                                <div className="flex items-center gap-2 justify-center text-slate-500">
                                                    <HiOutlineInformationCircle className="text-lg" />
                                                    <span className="text-[9px] font-bold uppercase tracking-widest">Supports Rent Receipts, Electricity, Gas & Wifi Bills</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-8">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] pl-1">Allocated Asset</label>
                                                        <div className="relative">
                                                            <HiOutlineOfficeBuilding className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-lg" />
                                                            <select
                                                                required
                                                                className="input-field pl-12 appearance-none"
                                                                value={selectedPropertyId}
                                                                onChange={(e) => setSelectedPropertyId(e.target.value)}
                                                            >
                                                                <option value="">Select Target Unit...</option>
                                                                {properties.map(p => (
                                                                    <option key={p.id} value={p.id}>{p.name}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] pl-1">Paid By (Tenant)</label>
                                                        <div className="relative">
                                                            <HiOutlineUserCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-lg" />
                                                            <select
                                                                required
                                                                className="input-field pl-12 appearance-none"
                                                                value={tenant}
                                                                onChange={(e) => setTenant(e.target.value)}
                                                            >
                                                                <option value="">Select Resident...</option>
                                                                {selectedProperty?.tenantNames?.map((name, i) => (
                                                                    <option key={i} value={name}>{name}</option>
                                                                ))}
                                                                {selectedProperty && (!selectedProperty.tenantNames || selectedProperty.tenantNames.length === 0) && (
                                                                    <option disabled>No tenants found - Go to Settings</option>
                                                                )}
                                                            </select>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* RENT LOGIC */}
                                                {type === "RENT" && selectedProperty && (
                                                    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
                                                        <div className="grid grid-cols-2 gap-6">
                                                            <div className="space-y-2">
                                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] pl-1">Start Date</label>
                                                                <input
                                                                    type="date"
                                                                    readOnly={!!lastTxHistory}
                                                                    className={`input-field font-bold ${lastTxHistory ? "opacity-60 border-brand/20 bg-brand/5 cursor-not-allowed" : "border-brand"}`}
                                                                    value={periodStart}
                                                                    onChange={(e) => setManualStart(e.target.value)}
                                                                />
                                                                {lastTxHistory && (
                                                                    <p className="text-[9px] font-bold text-slate-500 pl-1">Locked sync with history</p>
                                                                )}
                                                            </div>
                                                            <div className="space-y-2">
                                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] pl-1">Commit Duration</label>
                                                                <select className="input-field font-bold" value={duration} onChange={(e) => setDuration(e.target.value)}>
                                                                    <option value="1">1 Week</option>
                                                                    <option value="2">2 Weeks</option>
                                                                    <option value="3">3 Weeks</option>
                                                                    <option value="4">4 Weeks</option>
                                                                    <option value="5">5 Weeks</option>
                                                                </select>
                                                            </div>
                                                        </div>

                                                        {/* Historical Rent Feedback */}
                                                        <div className="flex items-start gap-2 bg-slate-950/20 border border-slate-800/50 p-4 rounded-2xl">
                                                            <HiOutlineInformationCircle className="text-brand text-lg mt-0.5 flex-shrink-0" />
                                                            <div>
                                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pricing Analysis</p>
                                                                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                                                    {historicalRentData?.sourceDate ? (
                                                                        <>Using historical rent rate of <span className="text-white font-bold">${activeRentRate}</span> active since <span className="text-white font-bold">{formatTs(historicalRentData.sourceDate)}</span>.</>
                                                                    ) : (
                                                                        <>Using current market rate of <span className="text-white font-bold">${activeRentRate}</span> per week.</>
                                                                    )}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {/* Summary Box */}
                                                        <div className="bg-slate-950 rounded-[2rem] sm:rounded-[2.5rem] p-5 sm:p-8 border border-slate-800 shadow-inner flex flex-col items-center justify-between gap-6 overflow-hidden relative group">
                                                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                                                <HiOutlineClock className="text-8xl text-brand" />
                                                            </div>
                                                            <div className="relative z-10 text-center md:text-left">
                                                                <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mb-3">Coverage Period</p>
                                                                <div className="flex items-center gap-3">
                                                                    <span className="text-lg font-black text-white">{safeFormat(periodStart, "MMM dd")}</span>
                                                                    <HiOutlineArrowNarrowRight className="text-slate-700" />
                                                                    <span className="text-lg font-black text-white">{safeFormat(periodEnd, "MMM dd, yyyy")}</span>
                                                                </div>
                                                            </div>
                                                            <div className="relative z-10 text-center md:text-right border-t md:border-t-0 md:border-l border-slate-800 pt-6 md:pt-0 md:pl-8">
                                                                <p className="text-[10px] font-black text-brand uppercase tracking-[0.2em] mb-3">Total Settlement</p>
                                                                <p className="text-3xl sm:text-4xl font-black text-white leading-none tracking-tight">
                                                                    <span className="text-brand mr-1">$</span>
                                                                    {totalAmount.toLocaleString()}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                )}

                                                {/* BILL LOGIC */}
                                                {type === "BILL" && (
                                                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
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
                                                                        placeholder="0.00"
                                                                        value={billAmount}
                                                                        onChange={(e) => setBillAmount(e.target.value)}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                )}

                                                <div className="grid grid-cols-2 gap-6">
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Filing Date</label>
                                                        <input type="date" className="input-field" value={date} onChange={(e) => setDate(e.target.value)} />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Settlement Status</label>
                                                        <select
                                                            className="input-field font-black uppercase tracking-widest text-[10px]"
                                                            value={status}
                                                            onChange={(e) => setStatus(e.target.value)}
                                                        >
                                                            <option value="PAID" className="text-success">✅ SETTLED / PAID</option>
                                                            <option value="UNPAID" className="text-danger">❌ UNPAID / PENDING</option>
                                                        </select>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 gap-6">
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Audit Documentation</label>
                                                        <div className="relative group">
                                                            <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={(e) => setFile(e.target.files[0])} />
                                                            <div className="input-field flex items-center justify-between gap-3 overflow-hidden">
                                                                <div className="flex items-center gap-3 truncate">
                                                                    <HiOutlineUpload className="text-slate-500 flex-shrink-0" />
                                                                    <span className="text-xs text-slate-400 truncate">{file ? file.name : "Attach Invoice / Receipt"}</span>
                                                                </div>
                                                                {file && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => { e.stopPropagation(); handleScanReceipt(); }}
                                                                        disabled={isScanning}
                                                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${isScanning ? 'bg-slate-800 text-slate-500' : 'bg-brand/10 text-brand hover:bg-brand hover:text-white shadow-lg shadow-brand/10'}`}
                                                                    >
                                                                        {isScanning ? (
                                                                            <div className="w-3 h-3 border-2 border-slate-600 border-t-slate-400 rounded-full animate-spin"></div>
                                                                        ) : (
                                                                            <HiOutlineSparkles className="text-xs" />
                                                                        )}
                                                                        {isScanning ? "Scanning..." : "AI SCAN"}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Internal Notes</label>
                                                    <textarea className="input-field h-24 pt-4 resize-none" placeholder="Administrative comments..." value={notes} onChange={(e) => setNotes(e.target.value)} />
                                                </div>

                                                <button disabled={loading || success} type="submit" className="btn-primary w-full py-5 text-xs font-black uppercase tracking-[0.3em] shadow-2xl shadow-brand/20">
                                                    {loading ? "Authenticating..." : success ? "Verified & Recorded" : "Commit Statement"}
                                                </button>
                                            </div>
                                        )}
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
