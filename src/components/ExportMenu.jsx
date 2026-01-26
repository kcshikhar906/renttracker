import React, { Fragment } from "react";
import { Menu, Transition, MenuButton, MenuItems, MenuItem } from "@headlessui/react";
import { HiOutlineDownload, HiOutlineDocumentText, HiOutlineTable, HiOutlineDocumentReport, HiChevronDown } from "react-icons/hi";
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { format, parseISO } from "date-fns";

export default function ExportMenu({ data, onExportPDF }) {

    const prepareData = () => {
        return data.map(t => {
            const filingDate = t.date?.toDate ? t.date.toDate() : (typeof t.date === 'string' ? parseISO(t.date) : new Date());
            const pStart = t.periodStart ? (typeof t.periodStart === 'string' ? t.periodStart : format(t.periodStart.toDate(), "yyyy-MM-dd")) : "";
            const pEnd = t.periodEnd ? (typeof t.periodEnd === 'string' ? t.periodEnd : format(t.periodEnd.toDate(), "yyyy-MM-dd")) : "";

            return {
                "Date": format(filingDate, "yyyy-MM-dd"),
                "Property": t.propertyName || "Other",
                "Type": t.type,
                "Description": t.type === "RENT" ? `Rent for ${t.duration} Week(s)` : t.utilityType,
                "Period Start": pStart,
                "Period End": pEnd,
                "Resident": t.tenant || "System",
                "Amount": t.amount || 0,
                "Status": t.status,
                "Notes": t.notes || ""
            };
        });
    };

    const handleExportExcel = () => {
        const cleanedData = prepareData();
        const worksheet = XLSX.utils.json_to_sheet(cleanedData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Transactions");

        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const dataBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(dataBlob, `Rent_Tracker_Export_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    };

    const handleExportCSV = () => {
        const cleanedData = prepareData();
        if (cleanedData.length === 0) return;

        const headers = Object.keys(cleanedData[0]);
        const csvContent = [
            headers.join(','),
            ...cleanedData.map(row =>
                headers.map(fieldName => {
                    const value = row[fieldName];
                    // Escape commas and quotes
                    const escaped = ('' + value).replace(/"/g, '""');
                    return `"${escaped}"`;
                }).join(',')
            )
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        saveAs(blob, `Rent_Tracker_Backup_${format(new Date(), "yyyy-MM-dd")}.csv`);
    };

    return (
        <Menu as="div" className="relative">
            <MenuButton className="w-full sm:w-auto px-6 py-4 bg-indigo-600 text-white hover:bg-indigo-700 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2">
                <HiOutlineDownload className="text-lg" />
                Export Data
                <HiChevronDown className="text-xs" />
            </MenuButton>

            <Transition
                as={Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
            >
                <MenuItems className="absolute right-0 mt-3 w-56 origin-top-right bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden">
                    <div className="p-2 space-y-1">
                        <MenuItem>
                            {({ active }) => (
                                <button
                                    onClick={onExportPDF}
                                    className={`${active ? 'bg-indigo-600 text-white' : 'text-slate-300'} group flex w-full items-center gap-3 rounded-xl px-4 py-3 text-[10px] font-bold uppercase tracking-widest transition-all`}
                                >
                                    <HiOutlineDocumentReport className="text-lg text-brand" />
                                    Export as PDF
                                </button>
                            )}
                        </MenuItem>
                        <MenuItem>
                            {({ active }) => (
                                <button
                                    onClick={handleExportExcel}
                                    className={`${active ? 'bg-indigo-600 text-white' : 'text-slate-300'} group flex w-full items-center gap-3 rounded-xl px-4 py-3 text-[10px] font-bold uppercase tracking-widest transition-all`}
                                >
                                    <HiOutlineTable className="text-lg text-success" />
                                    Export as Excel
                                </button>
                            )}
                        </MenuItem>
                        <MenuItem>
                            {({ active }) => (
                                <button
                                    onClick={handleExportCSV}
                                    className={`${active ? 'bg-indigo-600 text-white' : 'text-slate-300'} group flex w-full items-center gap-3 rounded-xl px-4 py-3 text-[10px] font-bold uppercase tracking-widest transition-all`}
                                >
                                    <HiOutlineDocumentText className="text-lg text-warning" />
                                    Export as CSV
                                </button>
                            )}
                        </MenuItem>
                    </div>
                </MenuItems>
            </Transition>
        </Menu>
    );
}
