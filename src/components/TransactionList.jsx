import React from "react";
import {
    HiOutlineEye,
    HiOutlineArchive,
    HiOutlineOfficeBuilding,
    HiOutlineUserCircle,
    HiOutlineCalendar,
    HiOutlineClock,
    HiOutlinePaperClip,
    HiOutlineTrash,
    HiOutlinePencilAlt
} from "react-icons/hi";
import { format, isValid, parseISO, differenceInDays } from "date-fns";

export default function TransactionList({ transactions, loading, onSelect, onEdit, onDelete }) {

    const safeFormat = (dateData, formatStr) => {
        if (!dateData) return "—";
        const date = typeof dateData === 'string' ? parseISO(dateData) : dateData.toDate();
        return isValid(date) ? format(date, formatStr) : "Invalid";
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
                <HiOutlineArchive className="text-6xl text-slate-800 mb-6 opacity-40" />
                <h4 className="text-xl font-black text-slate-300 uppercase tracking-tight">Vault Empty</h4>
                <p className="text-slate-500 text-xs max-w-[240px] mx-auto mt-3 font-medium leading-relaxed">
                    No matches found for current filter criteria.
                </p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left border-separate border-spacing-y-2">
                <thead>
                    <tr className="text-slate-500 uppercase text-[9px] font-black tracking-[0.2em]">
                        <th className="px-5 py-2">Filing Date</th>
                        <th className="px-5 py-2">Asset Unit</th>
                        <th className="px-5 py-2">Coverage Period</th>
                        <th className="px-5 py-2">Settled By</th>
                        <th className="px-5 py-2">Amount</th>
                        <th className="px-5 py-2">Status</th>
                        <th className="px-5 py-2 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-transparent">
                    {transactions.map((t) => (
                        <tr
                            key={t.id}
                            onClick={() => onSelect(t)}
                            className="bg-slate-950/40 hover:bg-slate-800/40 transition-all cursor-pointer group rounded-xl"
                        >
                            <td className="px-5 py-3 first:rounded-l-2xl cursor-pointer" onClick={(e) => { e.stopPropagation(); onEdit(t); }}>
                                <div className="flex flex-col group/date">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-slate-200">
                                            {safeFormat(t.date, "MMM dd, yyyy")}
                                        </span>
                                        <HiOutlinePencilAlt className="text-[10px] text-slate-600 opacity-0 group-hover/date:opacity-100 transition-opacity" />
                                    </div>
                                    {t.createdAt && (
                                        <span className="text-[9px] font-medium text-slate-500 mt-0.5 uppercase tracking-tighter">
                                            Added: {safeFormat(t.createdAt, "hh:mm a")}
                                        </span>
                                    )}
                                </div>
                            </td>

                            <td className="px-5 py-3 cursor-pointer" onClick={(e) => { e.stopPropagation(); onEdit(t); }}>
                                <div className="flex items-center gap-2 group/asset">
                                    <HiOutlineOfficeBuilding className="text-slate-600 text-sm" />
                                    <span className="text-xs font-bold text-slate-400 group-hover/asset:text-white transition-colors">
                                        {t.propertyName || "Other"}
                                    </span>
                                    <HiOutlinePencilAlt className="text-[10px] text-slate-600 opacity-0 group-hover/asset:opacity-100 transition-opacity" />
                                </div>
                            </td>

                            <td className="px-5 py-3 cursor-pointer" onClick={(e) => { e.stopPropagation(); onEdit(t); }}>
                                {t.type === "RENT" ? (
                                    <div className="flex flex-col group/period">
                                        <div className="flex items-center gap-2">
                                            <HiOutlineClock className="text-slate-650 text-xs" />
                                            <span className="text-[10px] font-black text-success uppercase tracking-tighter">
                                                {safeFormat(t.periodStart, "MMM dd")} - {safeFormat(t.periodEnd, "MMM dd")}
                                            </span>
                                            <HiOutlinePencilAlt className="text-[10px] text-slate-600 opacity-0 group-hover/period:opacity-100 transition-opacity" />
                                        </div>
                                        {t.periodStart && t.periodEnd && (
                                            <span className="text-[9px] font-bold text-slate-600 uppercase mt-0.5 pl-5">
                                                {(() => {
                                                    const start = typeof t.periodStart === 'string' ? parseISO(t.periodStart) : t.periodStart.toDate();
                                                    const end = typeof t.periodEnd === 'string' ? parseISO(t.periodEnd) : t.periodEnd.toDate();
                                                    if (!isValid(start) || !isValid(end)) return "";
                                                    const totalDays = differenceInDays(end, start) + 1;
                                                    const weeks = Math.floor(totalDays / 7);
                                                    const rem = totalDays % 7;
                                                    return `${weeks > 0 ? `${weeks}W` : ''}${weeks > 0 && rem > 0 ? ' ' : ''}${rem > 0 ? `${rem}D` : ''} (${totalDays} Days)`;
                                                })()}
                                            </span>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex flex-col group/utility">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-black text-warning uppercase bg-warning/10 border border-warning/20 px-2 py-0.5 rounded-full">
                                                {t.utilityType || "Utility"}
                                            </span>
                                            <HiOutlinePencilAlt className="text-[10px] text-slate-600 opacity-0 group-hover/utility:opacity-100 transition-opacity" />
                                        </div>
                                        <span className="text-[9px] font-bold text-slate-600 uppercase mt-1 pl-1">Standard Billing</span>
                                    </div>
                                )}
                            </td>

                            <td className="px-5 py-3 cursor-pointer" onClick={(e) => { e.stopPropagation(); onEdit(t); }}>
                                <div className="flex items-center gap-2 group/tenant">
                                    <HiOutlineUserCircle className="text-slate-600" />
                                    <span className="text-xs font-medium text-slate-400 group-hover/tenant:text-white transition-colors">
                                        {t.tenant || "System"}
                                    </span>
                                    <HiOutlinePencilAlt className="text-[10px] text-slate-600 opacity-0 group-hover/tenant:opacity-100 transition-opacity" />
                                </div>
                            </td>

                            <td className="px-5 py-3 cursor-pointer" onClick={(e) => { e.stopPropagation(); onEdit(t); }}>
                                <div className="flex items-center gap-2 group/amount">
                                    <span className="text-sm font-black text-white">
                                        ${t.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </span>
                                    <HiOutlinePencilAlt className="text-[10px] text-slate-600 opacity-0 group-hover/amount:opacity-100 transition-opacity" />
                                </div>
                            </td>

                            <td className="px-5 py-3 cursor-pointer" onClick={(e) => { e.stopPropagation(); onEdit(t); }}>
                                <div className="flex items-center gap-2 group/status">
                                    <div className={`w-1.5 h-1.5 rounded-full ${t.status === 'PAID' ? 'bg-success shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-danger shadow-[0_0_8px_rgba(239,68,68,0.4)]'}`}></div>
                                    <span className={`text-[9px] font-black uppercase tracking-widest ${t.status === 'PAID' ? 'text-success' : 'text-danger'}`}>
                                        {t.status || "Pending"}
                                    </span>
                                    <HiOutlinePencilAlt className="text-[10px] text-slate-600 opacity-0 group-hover/status:opacity-100 transition-opacity" />
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
                                        <HiOutlinePencilAlt className="text-lg" />
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
