import React, { useState, useEffect } from 'react';
import api from '../api';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import {
    FileText,
    Search,
    Clock,
    CheckCircle,
    ChevronRight,
    ArrowRight,
    Filter,
    MoreHorizontal,
    Crown,
    AlertTriangle,
    RotateCcw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
    const { user } = useAuth();
    const [contracts, setContracts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('pending'); // Default to Pending
    const [sortBy, setSortBy] = useState('all'); // Default: Show All Stages
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedContractModal, setSelectedContractModal] = useState(null);
    const [completingLoading, setCompletingLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        fetchContracts();

        // REAL-TIME SUBSCRIPTION
        let channel = null;
        if (supabase) {
            channel = supabase
                .channel('db-changes')
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'contracts' },
                    () => fetchContracts()
                )
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'contract_lots' },
                    () => fetchContracts()
                )
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'lot_decisions' },
                    () => fetchContracts()
                )
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'stage1_chairman_decision' },
                    () => fetchContracts()
                )
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'stage2_manager_report' },
                    () => fetchContracts()
                )
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'stage2_chairman_decision' },
                    () => fetchContracts()
                )
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'contract_payment_decision' },
                    () => fetchContracts()
                )
                .subscribe();
        }

        return () => {
            if (supabase && channel) {
                supabase.removeChannel(channel);
            }
        };
    }, []);

    const fetchContracts = async () => {
        try {
            const res = await api.get('/contracts');
            setContracts(res.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status) => {
        if (!status) return 'text-slate-400 bg-slate-50 border-slate-100';
        if (status === 'Manually Completed' || status.includes('Manually')) return 'text-[#5C3A21] bg-[#F5EBE1] border-[#8B5A2B]';
        if (status.includes('Pending')) return 'text-amber-700 bg-amber-50 border-amber-200';
        if (status === 'Closed' || status.includes('Approved')) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
        if (status.includes('Rollback') || status.includes('Rejected') || status.includes('Revision') || status.includes('Modify')) return 'text-rose-700 bg-rose-50 border-rose-200';
        return 'text-slate-600 bg-slate-100 border-slate-200';
    };

    const handleManualComplete = async (contract) => {
        if (!contract) return;
        try {
            setCompletingLoading(true);
            const safeContractId = encodeURIComponent(String(contract.contract_id).split('/').join('---'));
            await api.post(`/contracts/${safeContractId}/manual-complete`);
            setSelectedContractModal(null);
            fetchContracts();
        } catch (e) {
            console.error('[MANUAL_COMPLETE_ERROR]', e);
            alert('Error completing contract: ' + (e.response?.data?.error || e.message));
        } finally {
            setCompletingLoading(false);
        }
    };

    const handleAction = (c) => {
        // If Lot ID is present, use Lot-Specific Routes for Stage 4/5
        const safeLotId = c.lot_id ? encodeURIComponent(String(c.lot_id).split('/').join('---')) : '';
        const lotPath = c.lot_id ? `/lots/${safeLotId}` : ''; // Part of URL

        // Replace slashes with --- for robust URL segments on hosted environments
        const safeContractId = encodeURIComponent(c.contract_id.split('/').join('---'));

        // For Stage 3 and above, the "Master Row" (no lot_id) always goes to the Manage Lots (Stage 3) page,
        // UNLESS it's a privileged vendor in Stage 5 (Contract-Level Payment — happens before lots).
        if (c.stage === 5 && !c.lot_id) {
            navigate(`/contracts/${safeContractId}/stage5`);
            return;
        }

        if (c.stage >= 3 && !c.lot_id) {
            navigate(`/contracts/${safeContractId}/stage3`);
            return;
        }

        switch (c.stage) {
            case 2: navigate(`/contracts/${safeContractId}/stage2`); break;
            case 3: navigate(`/contracts/${safeContractId}/stage3`); break;
            case 4: navigate(`/contracts/${safeContractId}${lotPath}/stage4`); break;
            case 5:
            case 6: navigate(`/contracts/${safeContractId}${lotPath}/stage5`); break;
            default: navigate(`/contracts/${safeContractId}/view`); break;
        }
    };

    const handleStageClick = (e, c, stepId) => {
        e.stopPropagation();
        const safeContractId = encodeURIComponent(c.contract_id.split('/').join('---'));
        const safeLotId = c.lot_id ? encodeURIComponent(String(c.lot_id).split('/').join('---')) : '';
        const lotPath = c.lot_id ? `/lots/${safeLotId}` : '';

        // ENFORCEMENT: Block future stages
        const steps = Boolean(c.is_privileged)
            ? [1, 2, 5, 3, 4]
            : [1, 2, 3, 4, 5];

        const currentStageValue = c.stage === 6 ? 6 : c.stage;
        const currentStageIdx = steps.indexOf(currentStageValue);
        const targetStageIdx = steps.indexOf(stepId);

        if (targetStageIdx > currentStageIdx && currentStageValue !== 6) {
            // Relaxed for CTL/Payment from Stage 3 onwards
            const stage3Idx = steps.indexOf(3);
            if (currentStageIdx >= stage3Idx && (stepId === 4 || stepId === 5)) {
                // Allow specific jumps
            } else {
                return;
            }
        }

        switch (stepId) {
            case 1: navigate(`/contracts/${safeContractId}/view`); break;
            case 2: navigate(`/contracts/${safeContractId}/stage2`); break;
            case 3: navigate(`/contracts/${safeContractId}/stage3`); break;
            case 4: navigate(`/contracts/${safeContractId}${lotPath}/stage4`); break;
            case 5: navigate(`/contracts/${safeContractId}${lotPath}/stage5`); break;
            default: break;
        }
    };

    // Derived State
    const filteredContracts = contracts.filter(c => {
        // Search Filter
        const matchesSearch = c.vendor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.contract_id.toString().includes(searchTerm);

        // Status Filter
        let matchesStatus = true;

        if (filterStatus === 'action_required') {
            if (user?.role === 'Chairman') {
                // Chairman sees ONLY approval tasks (after manager submission)
                matchesStatus = c.status.includes('Pending Chairman Approval');
            } else {
                // Manager sees everything NOT waiting for Chairman and NOT Closed/Approved
                // Includes: Pending Entry, Lot Management, Rollback, Rejected, and Revision
                matchesStatus = !c.status.includes('Pending Chairman Approval') &&
                    !c.status.includes('Closed') &&
                    !c.status.includes('Approved');
            }
        }
        else if (filterStatus === 'pending') {
            if (user?.role === 'Chairman') {
                // For Chairman, show ONLY items awaiting their approval
                matchesStatus = c.status.includes('Pending Chairman Approval');
            } else {
                // Manager sees 'Pending', 'Rollback', and 'Revision' as pending actions
                matchesStatus = c.status.includes('Pending') || c.status.includes('Rollback') || c.status.includes('Revision');
            }
        }
        else if (filterStatus === 'approved') matchesStatus = c.status.includes('Approved') || c.status === 'Closed' || c.status === 'Manually Completed' || Boolean(c.is_manually_completed);
        else if (filterStatus === 'rejected') matchesStatus = c.status.includes('Rejected'); // Rollback/Revision moved to Pending for clarity

        return matchesSearch && matchesStatus;
    }).filter(c => {
        // Stage Filter
        if (sortBy === 'all') return true;
        if (sortBy.startsWith('stage_')) {
            const targetStage = parseInt(sortBy.split('_')[1]);
            if (targetStage === 5 && c.stage === 6) return true;
            return c.stage === targetStage;
        }
        return true;
    });

    // Group: master row first, then lots sorted by arrival_date, grouped by contract_id
    // Contracts sorted newest entry_date first
    const grouped = [];
    const seen = new Set();
    // Get unique contract IDs sorted by entry_date descending (use master row entry_date)
    const contractOrder = [...filteredContracts]
        .filter(c => !c.lot_id)
        .sort((a, b) => new Date(b.entry_date) - new Date(a.entry_date))
        .map(c => c.contract_id);

    // Also handle contracts that only have lot rows (no master row in current filter)
    filteredContracts.forEach(c => {
        if (!contractOrder.includes(c.contract_id)) contractOrder.push(c.contract_id);
    });

    contractOrder.forEach(cid => {
        if (seen.has(cid)) return;
        seen.add(cid);
        // Master row first
        const master = filteredContracts.find(c => c.contract_id === cid && !c.lot_id);
        if (master) grouped.push(master);
        // Lot rows sorted by arrival_date ascending
        const lots = filteredContracts
            .filter(c => c.contract_id === cid && c.lot_id)
            .sort((a, b) => new Date(a.arrival_date || a.entry_date) - new Date(b.arrival_date || b.entry_date));
        lots.forEach(l => grouped.push(l));
    });

    const sortedContracts = grouped;

    // Stats Logic
    const stats = {
        total: contracts.length,
        // Manager Pending includes Rollbacks/Revisions, Chairman sees only approval tasks
        pending: contracts.filter(c => {
            if (user?.role === 'Chairman') {
                return c.status.includes('Pending Chairman Approval');
            }
            return c.status.includes('Pending') || c.status.includes('Rollback') || c.status.includes('Revision');
        }).length,
        completed: contracts.filter(c => c.status === 'Closed' || c.status.includes('Approved') || c.status === 'Manually Completed' || Boolean(c.is_manually_completed)).length,
        attention: contracts.filter(c => c.status.includes('Rollback') || c.status.includes('Revision')).length
    };

    const handleResume = async (c) => {
        if (!window.confirm(`Are you sure you want to resume contract ${c.contract_id}? This will restart it from Stage 2 (Quality Entry) and clear all data from Stage 2 onwards.`)) return;

        try {
            await api.post(`/contracts/${encodeURIComponent(c.contract_id)}/resume`);
            fetchContracts();
        } catch (e) {
            console.error(e);
            alert('Error resuming contract: ' + (e.response?.data?.error || e.message));
        }
    };

    return (
        <div className="space-y-8">
            {/* Header & Stats */}
            <div>
                <h2 className="text-2xl font-semibold text-slate-900 mb-5">Dashboard Overview</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-3">
                        <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg"><FileText size={18} /></div>
                        <div>
                            <p className="text-slate-400 text-[8px] font-semibold uppercase tracking-wider">Total</p>
                            <p className="text-lg font-semibold text-slate-900">{stats.total}</p>
                        </div>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-3">
                        <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg"><Clock size={18} /></div>
                        <div>
                            <p className="text-slate-400 text-[8px] font-semibold uppercase tracking-wider">Pending</p>
                            <p className="text-lg font-semibold text-slate-900">{stats.pending}</p>
                        </div>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-3">
                        <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg"><CheckCircle size={18} /></div>
                        <div>
                            <p className="text-slate-400 text-[8px] font-semibold uppercase tracking-wider">Completed</p>
                            <p className="text-lg font-semibold text-slate-900">{stats.completed}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
                    <input
                        type="text"
                        placeholder="Search contracts or vendors..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                    />
                </div>

                <div className="flex items-center space-x-3">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-tight">Sort By:</span>
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="bg-slate-50 border border-slate-200 text-slate-900 text-[11px] rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2 outline-none font-semibold cursor-pointer hover:bg-slate-100 transition-colors mr-2"
                    >
                        <option value="all">All Stages</option>
                        <option value="stage_1">Stage 1: Contract</option>
                        <option value="stage_2">Stage 2: Quality</option>
                        <option value="stage_3">Stage 3: Lot Management</option>
                        <option value="stage_4">Stage 4: CTL</option>
                        <option value="stage_5">Stage 5: Payment</option>
                    </select>

                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-tight">Filter By:</span>
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="bg-slate-50 border border-slate-200 text-slate-900 text-[11px] rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2 outline-none font-semibold cursor-pointer hover:bg-slate-100 transition-colors"
                    >
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Denied</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-200 text-slate-500 text-[10px] uppercase tracking-wider font-semibold">
                            <th className="px-4 py-3 w-[15%]">Contract ID</th>
                            <th className="px-4 py-3 w-[8%] text-center">Lot No</th>
                            <th className="px-4 py-3 w-[25%]">Vendor</th>
                            <th className="px-2 py-3 w-[10%]">GST No</th>
                            <th className="px-2 py-3 w-[340px]">Progress</th>
                            <th className="px-4 py-3 w-[10%] text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {sortedContracts.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="px-6 py-20 text-center">
                                    <div className="flex flex-col items-center">
                                        <div className="p-4 bg-slate-50 text-slate-300 rounded-full mb-4">
                                            <Search size={40} />
                                        </div>
                                        <h3 className="text-slate-900 font-bold text-lg mb-1">No contracts found</h3>
                                        <p className="text-slate-500 text-xs">Try adjusting your filters or search term to find what you're looking for.</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            sortedContracts.map((c, idx) => (
                                <tr key={`${c.contract_id}-${c.lot_id || 'main'}-${idx}`}
                                    className={`transition-colors group cursor-default ${c.lot_id
                                        ? 'bg-slate-50/60 hover:bg-indigo-50/30 border-l-2 border-l-indigo-100'
                                        : 'hover:bg-indigo-50/20'
                                        }`}>
                                    <td className="px-4 py-2 font-mono font-semibold tracking-tight w-[15%]">
                                        <div className="flex flex-col items-start gap-0.5">
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedContractModal(c);
                                                }}
                                                className={`text-[13px] font-bold hover:underline transition-all cursor-pointer ${
                                                    c.status === 'Manually Completed' || Boolean(c.is_manually_completed)
                                                        ? 'text-[#6B3E26] hover:text-[#4A2B1A]'
                                                        : 'text-indigo-600 hover:text-indigo-800'
                                                }`}
                                                title="Click for options"
                                            >
                                                {c.contract_id}
                                            </button>
                                            {(c.status === 'Manually Completed' || Boolean(c.is_manually_completed)) && (
                                                <span className="inline-block text-[8px] font-bold px-1.5 py-0.2 rounded border border-[#8B5A2B] bg-[#F5EBE1] text-[#5C3A21] uppercase tracking-wider">
                                                    Manually Completed
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-2 font-mono text-slate-600 font-semibold text-[10px] text-center w-[8%]">
                                        {c.lot_id ? (
                                            <span className="bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md text-indigo-700 font-bold uppercase shadow-sm">
                                                {c.lot_number}
                                            </span>
                                        ) : (
                                            <span className="text-slate-400 font-bold">-</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-2 w-[25%]">
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <span className="text-[13px] font-bold text-slate-900 truncate max-w-[150px]" title={c.vendor_name}>{c.vendor_name}</span>
                                                {Boolean(c.is_privileged) && <Crown size={12} className="text-amber-500 fill-amber-500 shrink-0" title="Privileged Vendor" />}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-2 py-2 text-slate-400 font-mono text-[10px] w-[10%] truncate">{c.gst_number || '-'}</td>
                                    <td className="px-2 py-4 w-[340px]">
                                        <div className="flex items-center space-x-1">
                                            {(() => {
                                                const steps = Boolean(c.is_privileged)
                                                    ? [
                                                        { id: 1, label: 'Contract' },
                                                        { id: 2, label: 'Quality' },
                                                        { id: 5, label: 'Payment' },
                                                        { id: 3, label: 'Lot Entry' },
                                                        { id: 4, label: 'CTL' }
                                                    ]
                                                    : [
                                                        { id: 1, label: 'Contract' },
                                                        { id: 2, label: 'Quality' },
                                                        { id: 3, label: 'Lot Entry' },
                                                        { id: 4, label: 'CTL' },
                                                        { id: 5, label: 'Payment' }
                                                    ];

                                                return steps.map((step, idx, arr) => {
                                                    let isPast = false;
                                                    const currentStage = c.stage;

                                                    if (currentStage === 6) {
                                                        isPast = true;
                                                    } else {
                                                        const currentOrderIdx = steps.findIndex(s => s.id === currentStage);
                                                        const stepOrderIdx = idx;
                                                        if (currentOrderIdx === -1) {
                                                            isPast = currentStage > step.id;
                                                        } else {
                                                            isPast = currentOrderIdx > stepOrderIdx;
                                                        }
                                                    }

                                                    const isCurrent = step.id === currentStage;
                                                    let isFuture = !isPast && !isCurrent;

                                                    // Relax: CTL/Payment not future if at Stage 3+
                                                    if (isFuture && (step.id === 4 || step.id === 5)) {
                                                        const s3Idx = steps.findIndex(s => s.id === 3);
                                                        const curIdx = steps.findIndex(s => s.id === (currentStage === 6 ? 6 : currentStage));
                                                        if (curIdx >= s3Idx) isFuture = false;
                                                    }

                                                    let boxClass = 'border border-slate-200 bg-white text-slate-400';
                                                    if (isPast) boxClass = 'border border-emerald-200 bg-emerald-50 text-emerald-600';
                                                    if (isCurrent) boxClass = 'border border-indigo-300 bg-indigo-50 text-indigo-700 font-semibold';
                                                    if (isFuture) boxClass = 'border border-slate-100 bg-slate-50/50 text-slate-300 opacity-60 cursor-not-allowed';

                                                    return (
                                                        <React.Fragment key={step.id}>
                                                            <button
                                                                onClick={(e) => !isFuture && handleStageClick(e, c, step.id)}
                                                                disabled={isFuture}
                                                                className={`px-1.5 py-0.5 rounded-md text-[9px] tracking-wide ${boxClass} transition-all whitespace-nowrap ${!isFuture ? 'hover:opacity-80 hover:scale-105 active:scale-95 cursor-pointer' : ''}`}
                                                                title={isFuture ? 'Complete previous stages first' : `Go to ${step.label}`}
                                                            >
                                                                {step.label.toLowerCase()}
                                                            </button>
                                                            {idx < arr.length - 1 && (
                                                                <ChevronRight
                                                                    size={9}
                                                                    className={`mx-0.5 shrink-0 ${isPast ? 'text-emerald-300' : 'text-slate-200'}`}
                                                                />
                                                            )}
                                                        </React.Fragment>
                                                    );
                                                });
                                            })()}
                                        </div>
                                        <div className="mt-1 flex items-center gap-2">
                                            {(c.status.includes('Rollback') || c.status.includes('Rejected') || c.status.includes('Revision') || c.status.includes('Modify')) && (
                                                <span className="text-[9px] font-semibold text-rose-600 flex items-center gap-1">
                                                    <AlertTriangle size={10} /> {c.status}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-2 text-right w-[10%]">
                                        <div className="flex justify-end items-center space-x-2">
                                            {c.status.includes('Rejected') && user?.role === 'Manager' && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleResume(c); }}
                                                    className="p-1 text-amber-600 hover:bg-amber-50 rounded-md transition-colors border border-amber-100 shadow-sm"
                                                    title="Resume/Restart"
                                                >
                                                    <RotateCcw size={12} />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleAction(c)}
                                                className="flex items-center space-x-1 px-2.5 py-1 bg-white border border-slate-200 text-indigo-600 rounded-md text-[9px] font-bold hover:bg-indigo-600 hover:text-white hover:border-transparent transition-all shadow-sm group-hover:border-indigo-200"
                                            >
                                                <span>View</span>
                                                <ArrowRight size={10} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* CONTRACT ACTION MODAL */}
            {selectedContractModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-100 overflow-hidden text-slate-900">
                        {/* Modal Header */}
                        <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Contract Options</span>
                                <h3 className="text-lg font-extrabold text-slate-900 font-mono">
                                    {selectedContractModal.contract_id}
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedContractModal(null)}
                                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-4">
                            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs space-y-1.5">
                                <div className="flex justify-between">
                                    <span className="text-slate-400 font-medium">Vendor:</span>
                                    <span className="font-bold text-slate-800">{selectedContractModal.vendor_name}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-400 font-medium">Current Status:</span>
                                    <span className={`font-bold px-2 py-0.5 rounded text-[10px] border ${getStatusColor(selectedContractModal.status)}`}>
                                        {selectedContractModal.status}
                                    </span>
                                </div>
                            </div>

                            <p className="text-xs text-slate-500 text-center font-medium">
                                What action would you like to perform for contract <span className="font-mono font-bold text-slate-700">{selectedContractModal.contract_id}</span>?
                            </p>

                            <div className="space-y-3 pt-1">
                                {/* View Contract Option */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        const c = selectedContractModal;
                                        setSelectedContractModal(null);
                                        handleAction(c);
                                    }}
                                    className="w-full flex items-center justify-between p-3.5 bg-indigo-50/80 hover:bg-indigo-100/80 text-indigo-700 rounded-xl border border-indigo-200 font-bold text-xs transition-all shadow-xs cursor-pointer group"
                                >
                                    <div className="flex items-center space-x-2.5">
                                        <FileText size={16} className="text-indigo-600" />
                                        <span>View Contract</span>
                                    </div>
                                    <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                                </button>

                                {/* Manually Completed Option */}
                                {selectedContractModal.status !== 'Manually Completed' && !selectedContractModal.is_manually_completed ? (
                                    <button
                                        type="button"
                                        disabled={completingLoading}
                                        onClick={() => handleManualComplete(selectedContractModal)}
                                        className="w-full flex items-center justify-between p-3.5 bg-[#F5EBE1] hover:bg-[#EBDCCB] text-[#5C3A21] rounded-xl border border-[#8B5A2B] font-bold text-xs transition-all shadow-xs cursor-pointer disabled:opacity-50"
                                    >
                                        <div className="flex items-center space-x-2.5">
                                            <CheckCircle size={16} className="text-[#8B5A2B]" />
                                            <span>Manually Completed</span>
                                        </div>
                                        {completingLoading && (
                                            <span className="text-[10px] animate-pulse">Updating...</span>
                                        )}
                                    </button>
                                ) : (
                                    <div className="p-3 bg-[#F5EBE1] text-[#5C3A21] rounded-xl border border-[#8B5A2B] text-center font-bold text-xs flex items-center justify-center gap-1.5">
                                        <CheckCircle size={14} /> Manually Completed
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="bg-slate-50/50 px-6 py-3 border-t border-slate-100 flex justify-end">
                            <button
                                type="button"
                                onClick={() => setSelectedContractModal(null)}
                                className="px-4 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
