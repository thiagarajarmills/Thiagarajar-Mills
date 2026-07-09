import React, { useState } from 'react';
import api from '../api';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Loader2, Mail, Key, ShieldCheck, AlertCircle } from 'lucide-react';

export default function ResetPassword() {
    const navigate = useNavigate();
    const [step, setStep] = useState(1); // Step 1: Email verify, Step 2: Enter OTP & New Password
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [simulatedCode, setSimulatedCode] = useState('');

    // Step 1: Send OTP
    const handleSendOtp = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await api.post('/forgot-password', { email });
            
            if (res.data.isSimulated && res.data.code) {
                setSimulatedCode(res.data.code);
            }
            
            setStep(2);
        } catch (err) {
            setError(err.response?.data?.message || "No account found with this email address. Please check and try again.");
        } finally {
            setLoading(false);
        }
    };

    // Step 2: Reset Password
    const handleResetPassword = async (e) => {
        e.preventDefault();
        setError('');

        if (newPassword !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        if (newPassword.length < 6) {
            setError("Password must be at least 6 characters");
            return;
        }

        setLoading(true);

        try {
            await api.post('/reset-password', {
                email,
                otp,
                newPassword
            });

            setSuccess("Password reset successfully! Redirecting to login...");
            setTimeout(() => {
                navigate('/login');
            }, 2500);
        } catch (err) {
            setError(err.response?.data?.message || "Failed to reset password. Please check your verification code.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden text-slate-800">
            {/* Background elements (matching login page) */}
            <div className="absolute top-0 left-0 w-full h-full bg-white opacity-40 z-0"></div>
            <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-100 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
            <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>

            <div className="relative z-10 bg-white/80 backdrop-blur-xl border border-white/50 p-10 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] w-full max-w-md transition-all duration-300">
                
                <Link to="/login" className="flex items-center text-slate-500 hover:text-indigo-600 mb-6 transition-colors text-xs font-medium">
                    <ArrowLeft size={16} className="mr-1" /> Back to Login
                </Link>

                <div className="text-center mb-8">
                    <div className="flex items-center justify-center space-x-3 mb-4">
                        <img src="/temple.webp" alt="Thiagarajar Mills" className="h-16 w-16 object-contain shrink-0" />
                        <div className="leading-tight text-left">
                            <p className="text-[18px] font-semibold text-blue-600 leading-snug">Thiagarajar Mills</p>
                            <p className="text-[13px] text-slate-400">(P) limited</p>
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
                        {step === 1 ? 'Forgot Password' : 'Verify & Reset'}
                    </h1>
                    <p className="text-slate-500 mt-2 text-xs">
                        {step === 1 
                            ? 'Enter your registered email address to receive a verification code.' 
                            : `We have sent a verification code to ${email}`}
                    </p>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-100 text-red-600 p-3.5 rounded-lg mb-6 text-xs text-center font-medium flex items-center justify-center gap-2">
                        <AlertCircle size={14} className="shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                {success && (
                    <div className="bg-emerald-50 border border-emerald-100 text-emerald-600 p-4 rounded-lg mb-6 text-xs text-center font-medium flex items-center justify-center animate-in fade-in">
                        <CheckCircle size={16} className="mr-2 shrink-0" /> {success}
                    </div>
                )}

                {!success && step === 1 && (
                    <form onSubmit={handleSendOtp} className="space-y-5">
                        <div>
                            <label className="block text-slate-700 text-xs font-semibold mb-2">Email Address</label>
                            <input
                                type="email"
                                name="email"
                                className="w-full bg-white border border-slate-200 text-slate-900 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all placeholder-slate-400 text-xs shadow-sm"
                                placeholder="e.g. manager@thiagarajarmills.com"
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value);
                                    setError('');
                                }}
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold py-3.5 rounded-lg shadow-lg hover:shadow-indigo-500/30 transition-all transform hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center text-xs"
                        >
                            {loading ? <Loader2 className="animate-spin mr-2" size={16} /> : 'Send Verification Code'}
                        </button>
                    </form>
                )}

                {!success && step === 2 && (
                    <form onSubmit={handleResetPassword} className="space-y-5">
                        {simulatedCode && (
                            <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-lg text-xs leading-relaxed">
                                <p className="font-semibold mb-1 flex items-center gap-1.5 text-[13px]">
                                    <ShieldCheck size={16} className="text-amber-600" />
                                    Simulated Email Details:
                                </p>
                                <p className="text-slate-600">
                                    Since SMTP credentials are not configured, here is your simulated verification code:
                                </p>
                                <div className="mt-2 text-center bg-slate-50 py-2 rounded font-mono text-lg font-bold tracking-widest text-indigo-600 border border-indigo-200">
                                    {simulatedCode}
                                </div>
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <label className="block text-slate-700 text-xs font-semibold mb-2">Verification Code</label>
                                <input
                                    type="text"
                                    maxLength="6"
                                    className="w-full bg-white border border-slate-200 text-slate-900 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all placeholder-slate-400 text-center font-mono text-lg tracking-widest shadow-sm"
                                    placeholder="Enter 6-digit code"
                                    value={otp}
                                    onChange={(e) => {
                                        setOtp(e.target.value);
                                        setError('');
                                    }}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-slate-700 text-xs font-semibold mb-2">New Password</label>
                                <input
                                    type="password"
                                    className="w-full bg-white border border-slate-200 text-slate-900 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all placeholder-slate-400 text-xs shadow-sm"
                                    placeholder="Minimum 6 characters"
                                    value={newPassword}
                                    onChange={(e) => {
                                        setNewPassword(e.target.value);
                                        setError('');
                                    }}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-slate-700 text-xs font-semibold mb-2">Confirm New Password</label>
                                <input
                                    type="password"
                                    className="w-full bg-white border border-slate-200 text-slate-900 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all placeholder-slate-400 text-xs shadow-sm"
                                    placeholder="Re-enter password"
                                    value={confirmPassword}
                                    onChange={(e) => {
                                        setConfirmPassword(e.target.value);
                                        setError('');
                                    }}
                                    required
                                />
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    setStep(1);
                                    setSimulatedCode('');
                                    setError('');
                                }}
                                className="w-1/3 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-bold py-3.5 rounded-lg transition-all text-xs text-center"
                            >
                                Back
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-2/3 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold py-3.5 rounded-lg shadow-lg hover:shadow-indigo-500/30 transition-all transform hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center text-xs"
                            >
                                {loading ? <Loader2 className="animate-spin mr-2" size={16} /> : 'Reset Password'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
