import React, { useMemo } from "react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend
} from "recharts";
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval, parseISO } from "date-fns";
import { motion } from "framer-motion";

const COLORS = {
    RENT: "#10b981", // Emerald-500
    BILLS: "#f59e0b", // Amber-500
};

export default function ExpenseCharts({ transactions }) {
    const chartData = useMemo(() => {
        if (!transactions || transactions.length === 0) return [];

        const last6Months = Array.from({ length: 6 }).map((_, i) => {
            const date = subMonths(new Date(), i);
            return {
                month: format(date, "MMM yyyy"),
                monthKey: format(date, "yyyy-MM"),
                rent: 0,
                bills: 0
            };
        }).reverse();

        transactions.forEach(t => {
            const date = t.date?.toDate ? t.date.toDate() : (typeof t.date === 'string' ? parseISO(t.date) : new Date());
            const monthKey = format(date, "yyyy-MM");

            const monthEntry = last6Months.find(m => m.monthKey === monthKey);
            if (monthEntry) {
                if (t.type === "RENT") monthEntry.rent += (t.amount || 0);
                else if (t.type === "BILL") monthEntry.bills += (t.amount || 0);
            }
        });

        return last6Months;
    }, [transactions]);

    const pieData = useMemo(() => {
        if (!transactions || transactions.length === 0) return [];

        const totals = transactions.reduce((acc, t) => {
            if (t.type === "RENT") acc.rent += (t.amount || 0);
            else if (t.type === "BILL") acc.bills += (t.amount || 0);
            return acc;
        }, { rent: 0, bills: 0 });

        if (totals.rent === 0 && totals.bills === 0) return [];

        return [
            { name: "Rent", value: totals.rent, color: COLORS.RENT },
            { name: "Bills", value: totals.bills, color: COLORS.BILLS }
        ];
    }, [transactions]);

    const isEmpty = chartData.every(d => d.rent === 0 && d.bills === 0);

    if (isEmpty) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-8">
                {[1, 2].map(i => (
                    <div key={i} className="bg-slate-900/50 border border-slate-800 rounded-[2rem] p-8 flex flex-col items-center justify-center min-h-[300px]">
                        <div className="w-16 h-16 bg-slate-950 rounded-full flex items-center justify-center mb-4 border border-slate-800">
                            <div className="w-8 h-8 border-2 border-slate-700 border-dashed rounded-full animate-pulse" />
                        </div>
                        <p className="text-slate-500 font-black uppercase tracking-widest text-[10px]">No data to display</p>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 my-8">
            {/* Monthly Trend Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-900/50 border border-slate-800 rounded-[2.5rem] p-6 shadow-2xl"
            >
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h3 className="text-lg font-black text-white uppercase tracking-tighter">Financial Trend</h3>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Last 6 Months</p>
                    </div>
                </div>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                            <XAxis
                                dataKey="month"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                                tickFormatter={(value) => `$${value}`}
                            />
                            <Tooltip
                                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                contentStyle={{
                                    backgroundColor: '#0f172a',
                                    border: '1px solid #1e293b',
                                    borderRadius: '16px',
                                    fontSize: '12px',
                                    fontWeight: 'bold'
                                }}
                            />
                            <Legend
                                verticalAlign="top"
                                align="right"
                                iconType="circle"
                                wrapperStyle={{ paddingBottom: '20px', fontSize: '10px', textTransform: 'uppercase', fontWeight: 900 }}
                            />
                            <Bar dataKey="rent" name="Rent" stackId="a" fill={COLORS.RENT} radius={[0, 0, 0, 0]} />
                            <Bar dataKey="bills" name="Bills" stackId="a" fill={COLORS.BILLS} radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </motion.div>

            {/* Split Distribution Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-slate-900/50 border border-slate-800 rounded-[2.5rem] p-6 shadow-2xl"
            >
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h3 className="text-lg font-black text-white uppercase tracking-tighter">Expense Allocation</h3>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Aggregate Split</p>
                    </div>
                </div>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                        <PieChart>
                            <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={100}
                                paddingAngle={8}
                                dataKey="value"
                            >
                                {pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#0f172a',
                                    border: '1px solid #1e293b',
                                    borderRadius: '16px',
                                    fontSize: '12px',
                                    fontWeight: 'bold'
                                }}
                                formatter={(value) => `$${value.toLocaleString()}`}
                            />
                            <Legend
                                verticalAlign="middle"
                                align="right"
                                layout="vertical"
                                iconType="circle"
                                wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 900 }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </motion.div>
        </div>
    );
}
