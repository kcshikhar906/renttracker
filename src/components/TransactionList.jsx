import React from "react";
import {
    HiOutlineEye,
    HiOutlineArchiveBox,
    HiOutlineBuildingOffice,
    HiOutlineUserCircle,
    HiOutlineCalendar,
    HiOutlineClock,
    HiOutlinePaperClip,
    HiOutlineTrash,
    HiOutlinePencilSquare,
    HiOutlineBolt,
    HiOutlineFire,
    HiOutlineGlobeAlt,
    HiOutlineBuildingLibrary,
    HiOutlineEllipsisHorizontalCircle,
    HiOutlineCalendarDays,
    HiOutlineArrowPath
} from "react-icons/hi2";
import { Droplet, Info } from "lucide-react";
import { format, isValid, parseISO, differenceInDays, differenceInWeeks } from "date-fns";

export default function TransactionList({ transactions, loading, onSelect, onEdit, onDelete }) {

    const safeFormat = (dateData, formatStr) => {
        if (!dateData) return "—";
        const date = typeof dateData === 'string' ? parseISO(dateData) : dateData.toDate();
        return isValid(date) ? format(date, formatStr) : "Invalid";
    };

    const getUtilityIcon = (type) => {
        switch (type) {
            case 'ELECTRICITY': return <HiOutlineBolt className="text-yellow-500" />;
            case 'GAS': return <HiOutlineFire className="text-orange-500" />;
            case 'WIFI': return <HiOutlineGlobeAlt className="text-blue-500" />;
            case 'WATER': return <Droplet className="text-cyan-500 w-4 h-4" />;
            case 'COUNCIL': return <HiOutlineBuildingLibrary className="text-indigo-500" />;
            default: return <HiOutlineEllipsisHorizontalCircle className="text-slate-500" />;
        }
    };

    if (loading) {
        return (
            <div className="py-24 flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-slate-800 border-t-brand rounded-full animate-spin"></div>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em]">Querying Database</p>
            </div>
        );
    }

    if (transactions.length === 0) {
        return (
            <div className="bg-slate-900/50 border border-slate-800 border-dashed rounded-[2rem] py-24 flex flex-col items-center text-center">
                <HiOutlineArchiveBox className="text-6xl text-slate-800 mb-6 opacity-40" />
                <h4 className="text-xl font-black text-slate-300 uppercase tracking-tight">Vault Empty</h4>
                <p className="text-slate-500 text-xs max-w-[240px] mx-auto mt-3 font-medium leading-relaxed">
                    No matches found for current filter criteria.
                </p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto overflow-y-visible">
            <table className="w-full text-left border-separate border-spacing-y-2">
                <thead>
                    <tr className="text-slate-500 uppercase text-[9px] font-black tracking-[0.2em]">
                        <th className="px-5 py-4">Filing Date</th>
                        <th className="px-5 py-4">Asset & Segment</th>
                        <th className="px-5 py-4">Utility Type</th>
                        <th className="px-5 py-4">Settled By</th>
                        <th className="px-5 py-4">Amount</th>
                        <th className="px-5 py-4">Status</th>
                        <th className="px-5 py-4 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-transparent">
                    {transactions.map((t) => (
                        <tr
                            key={t.id}
                            onClick={() => onSelect(t)}
                            className="bg-slate-950/20 hover:bg-slate-800/40 transition-all cursor-pointer group rounded-xl"
                        >
                            <td className="px-5 py-4 first:rounded-l-2xl">
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold text-slate-200">
                                        {safeFormat(t.date, "MMM dd, yyyy")}
                                    </span>
                                    {t.createdAt && (
                                        <span className="text-[9px] font-medium text-slate-500 mt-0.5 uppercase tracking-tighter">
                                            Added: {safeFormat(t.createdAt, "hh:mm a")}
                                        </span>
                                    )}
                                </div>
                            </td>

                            <td className="px-5 py-4">
                                <div className="flex items-center gap-3 bg-slate-900/40 p-2 rounded-xl border border-slate-800/50 w-fit min-w-[140px]">
                                    <div className="p-2 bg-indigo-500/10 rounded-lg">
                                        <HiOutlineBuildingOffice className="text-indigo-400 text-base" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-black text-slate-200 uppercase tracking-tight truncate max-w-[120px]">
                                            {t.propertyName || "Other"}
                                        </span>
                                        <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Asset Unit</span>
                                    </div>
                                </div>
                            </td>

                            <td className="px-5 py-4">
                                {t.type === "RENT" ? (
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-emerald-500/10 rounded-lg">
                                            <HiOutlineCalendar className="text-emerald-400 text-base" />
                                        </div>
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[10px] font-black text-white uppercase tracking-tighter">
                                                    {safeFormat(t.periodStart, "MMM dd")} - {safeFormat(t.periodEnd, "MMM dd")}
                                                </span>
                                            </div>
                                            <span className="text-[9px] font-black text-emerald-500/80 uppercase tracking-widest mt-0.5">
                                                {(() => {
                                                    const start = typeof t.periodStart === 'string' ? parseISO(t.periodStart) : t.periodStart.toDate();
                                                    const end = typeof t.periodEnd === 'string' ? parseISO(t.periodEnd) : t.periodEnd.toDate();
                                                    if (!isValid(start) || !isValid(end)) return "Cycle Incomplete";
                                                    const totalDays = differenceInDays(end, start) + 1;
                                                    const weeks = totalDays / 7;
                                                    return `${weeks.toFixed(1)} Week Cycle`;
                                                })()}
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-warning/10 rounded-lg">
                                            {getUtilityIcon(t.utilityType)}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-warning uppercase tracking-widest">
                                                {t.utilityType || "Utility"}
                                            </span>
                                            <span className="text-[9px] font-bold text-slate-600 uppercase mt-0.5">Standard Billing</span>
                                        </div>
                                    </div>
                                )}
                            </td>

                            <td className="px-5 py-4">
                                <div className="flex items-center gap-2">
                                    <HiOutlineUserCircle className="text-slate-600" />
                                    <span className="text-xs font-medium text-slate-400 group-hover:text-white transition-colors">
                                        {t.tenant || "System"}
                                    </span>
                                </div>
                            </td>

                            <td className="px-5 py-4">
                                <div className="flex flex-col">
                                    <span className="text-sm font-black text-white">
                                        ${t.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </span>
                                    <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Gross Settle</span>
                                </div>
                            </td>

                            <td className="px-5 py-4">
                                <div className="flex items-center gap-2 bg-slate-900/50 px-3 py-1.5 rounded-full border border-slate-800/50 w-fit">
                                    <div className={`w-1 h-1 rounded-full ${t.status === 'PAID' ? 'bg-success shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-danger shadow-[0_0_8px_rgba(239,68,68,0.4)]'}`}></div>
                                    <span className={`text-[8px] font-black uppercase tracking-[0.2em] ${t.status === 'PAID' ? 'text-success' : 'text-danger'}`}>
                                        {t.status || "Pending"}
                                    </span>
                                </div>
                            </td>

                            <td className="px-5 py-3 text-right last:rounded-r-2xl">
                                <div className="flex items-center justify-end gap-2">
                                    {t.fileUrl && (
                                        <a
                                            href={t.fileUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            className="p-2 bg-slate-900 border border-slate-800 text-brand rounded-xl hover:bg-brand hover:text-white transition-all shadow-sm flex items-center gap-1 group/proof"
                                            title="View Proof"
                                        >
                                            <span className="text-[10px] font-black uppercase hidden group-hover/proof:block ml-1">View Proof</span>
                                            <HiOutlinePaperClip className="text-lg" />
                                        </a>
                                    )}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onEdit(t); }}
                                        className="p-2 bg-slate-900 border border-slate-800 text-slate-500 rounded-xl hover:bg-warning hover:text-white hover:border-warning/50 transition-all shadow-sm"
                                        title="Quick Edit"
                                    >
                                        <HiOutlinePencilSquare className="text-lg" />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onSelect(t); }}
                                        className="p-2 bg-slate-900 border border-slate-800 text-slate-500 rounded-xl hover:bg-brand hover:text-white hover:border-brand/50 transition-all shadow-sm"
                                        title="View Statement"
                                    >
                                        <HiOutlineEye className="text-lg" />
                                    </button>
                                    {onDelete && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onDelete(t); }}
                                            className="p-2 bg-slate-900 border border-slate-800 text-slate-500 rounded-xl hover:bg-danger hover:text-white hover:border-danger/50 transition-all shadow-sm"
                                            title="Delete Record"
                                        >
                                            <HiOutlineTrash className="text-lg" />
                                        </button>
                                    )}
                                </div>
                            </td>

                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Mobile Indicator */}
            <div className="lg:hidden text-center py-4 bg-slate-950/20 rounded-2xl border border-slate-800/50 mt-4">
                <p className="text-[9px] font-bold text-slate-600 uppercase tracking-[0.1em]">Scroll horizontally for full ledger</p>
            </div>
        </div>
    );
}
