import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { HiOutlineOfficeBuilding, HiOutlineCurrencyDollar, HiOutlineTrendingUp, HiOutlineShieldCheck } from "react-icons/hi";

export default function PropertyComparisonTable({ transactions, properties }) {
    const summaryData = useMemo(() => {
        if (!properties || properties.length === 0) return [];

        const data = properties.map(property => {
            const propertyTransactions = transactions.filter(t => t.propertyId === property.id && !t.isDeleted);

            const totals = {
                id: property.id,
                name: property.name,
                status: property.status,
                rent: 0,
                bills: 0,
                bonds: 0,
                total: 0
            };

            propertyTransactions.forEach(t => {
                const amount = parseFloat(t.amount || 0);
                if (t.type === "RENT") {
                    totals.rent += amount;
                } else if (t.type === "BILL") {
                    if (t.utilityType === "BOND") {
                        totals.bonds += amount;
                    } else {
                        totals.bills += amount;
                    }
                }
                totals.total += amount;
            });

            return totals;
        });

        // Add Portfolio Total Row
        const portfolioTotal = data.reduce((acc, curr) => ({
            name: "Portfolio Aggregate",
            rent: acc.rent + curr.rent,
            bills: acc.bills + curr.bills,
            bonds: acc.bonds + curr.bonds,
            total: acc.total + curr.total,
            isTotal: true
        }), { rent: 0, bills: 0, bonds: 0, total: 0 });

        return [...data, portfolioTotal];
    }, [transactions, properties]);

    const isEmpty = summaryData.length <= 1 || (summaryData.length > 0 && summaryData[summaryData.length - 1].total === 0);

    if (isEmpty) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900/50 border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl mt-8"
        >
            <div className="p-8 border-b border-slate-800/50 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/40">
                <div>
                    <h3 className="text-xl font-black text-white uppercase tracking-tighter">Asset Expenditure Comparison</h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Lifecycle Capital Distribution by Asset</p>
                </div>
                <div className="px-4 py-2 bg-slate-950 border border-slate-800 rounded-2xl flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cross-Asset Audited Ledger</span>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-950/50">
                            <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-slate-800">Property Identifier</th>
                            <th className="px-8 py-5 text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] border-b border-slate-800 text-right">Total Rent</th>
                            <th className="px-8 py-5 text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] border-b border-slate-800 text-right">Total Bills</th>
                            <th className="px-8 py-5 text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] border-b border-slate-800 text-right">Total Bonds</th>
                            <th className="px-8 py-5 text-[10px] font-black text-white uppercase tracking-[0.2em] border-b border-slate-800 text-right bg-slate-900/50">Cumulative Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {summaryData.map((row, idx) => (
                            <tr
                                key={idx}
                                className={`group transition-colors ${row.isTotal
                                    ? "bg-slate-950 border-t-2 border-slate-800"
                                    : "hover:bg-slate-800/30 border-b border-slate-800/50"
                                    }`}
                            >
                                <td className="px-8 py-5">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-2 rounded-xl ${row.isTotal ? "bg-white text-black" : "bg-slate-800 text-slate-400"} group-hover:scale-110 transition-transform`}>
                                            {row.isTotal ? <HiOutlineTrendingUp className="text-sm" /> : <HiOutlineOfficeBuilding className="text-sm" />}
                                        </div>
                                        <span className={`text-xs font-black uppercase tracking-widest ${row.isTotal ? "text-white" : "text-slate-300"}`}>
                                            {row.name}
                                            {!row.isTotal && row.status === 'ARCHIVED' && (
                                                <span className="ml-2 text-[8px] font-black text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 tracking-normal">PAST</span>
                                            )}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-8 py-5 text-right font-mono text-xs font-bold text-slate-400 group-hover:text-emerald-400 transition-colors">
                                    ${row.rent.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </td>
                                <td className="px-8 py-5 text-right font-mono text-xs font-bold text-slate-400 group-hover:text-amber-400 transition-colors">
                                    ${row.bills.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </td>
                                <td className="px-8 py-5 text-right font-mono text-xs font-bold text-slate-400 group-hover:text-indigo-400 transition-colors">
                                    ${row.bonds.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </td>
                                <td className={`px-8 py-5 text-right font-mono text-sm font-black border-l border-slate-800/50 ${row.isTotal ? "text-success" : "text-white bg-slate-900/20 group-hover:bg-slate-900/40"}`}>
                                    ${row.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="p-8 bg-slate-950/20 flex items-center gap-3">
                <HiOutlineShieldCheck className="text-slate-600 text-lg" />
                <p className="text-[10px] text-slate-600 font-bold uppercase tracking-[0.15em]">
                    Validated accounting data. Calculations based on historically recorded ledger entries.
                </p>
            </div>
        </motion.div>
    );
}
