import React, { useState } from 'react';
import "./App.css";
import tigerLogo from "./assets/tiger.png";
import { students } from "./data/students";
import StudentConfirmation from './components/StudentConfirmation';
import DigitalIDCard from './components/DigitalIDCard';

const Form = () => {
    const [formData, setFormData] = useState({
        email: '',
        campusId: '',
    });
    const [showOtpInput, setShowOtpInput] = useState(false);
    const [otp, setOtp] = useState('');
    const [student, setStudent] = useState(null);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [showDigitalID, setShowDigitalID] = useState(false);

    const findStudent = (email, campusId) => {
        return students.find(s => 
            s.email.toLowerCase() === email.toLowerCase() && 
            s.studentId === campusId
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            if (!showOtpInput) {
                const foundStudent = findStudent(formData.email, formData.campusId);
                if (foundStudent) {
                    const apiUrl = import.meta.env.VITE_API_URL || 'https://tsu-virtual-id-backend.onrender.com';
                    const response = await fetch(`${apiUrl}/send-otp`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: formData.email })
                    });

                    if (!response.ok) {
                        const data = await response.json();
                        throw new Error(data.error || 'Failed to send OTP');
                    }

                    setShowOtpInput(true);
                    setStudent(foundStudent);
                } else {
                    setError('Student not found. Please check your email and campus ID.');
                }
            } else {
                if (!otp || otp.length !== 6) {
                    throw new Error('Please enter a valid 6-digit OTP');
                }

                const apiUrl = import.meta.env.VITE_API_URL || 'https://tsu-virtual-id-backend.onrender.com';
                const response = await fetch(`${apiUrl}/verify-otp`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        email: formData.email, 
                        otp: parseInt(otp)
                    })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Invalid OTP');
                }

                if (data.message !== "OTP verified successfully") {
                    throw new Error('Invalid OTP verification response');
                }

                if (student && data.message === "OTP verified successfully") {
                    setShowConfirmation(true);
                } else {
                    throw new Error('Verification failed. Please try again.');
                }
            }
        } catch (err) {
            console.error('Error in handleSubmit:', err);
            setError(err.message);
            if (err.message.includes('expired') || err.message.includes('No OTP found')) {
                setOtp('');
                setShowOtpInput(false);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleConfirmation = (confirmed) => {
        if (confirmed) {
            setShowConfirmation(false);
            setShowDigitalID(true);
        } else {
            handleReset();
        }
    };

    const handleSendEmail = async () => {
        setIsLoading(true);
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'https://tsu-virtual-id-backend.onrender.com';
            const response = await fetch(`${apiUrl}/send-id-card`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    email: student.email,
                    studentData: student
                })
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to send ID card to email');
            }

            // Check if we have wallet pass URLs
            if (data.passData && (data.passData.appleWalletUrl || data.passData.googleWalletUrl)) {
                // Detect device type
                const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
                const isAndroid = /Android/.test(navigator.userAgent);

                // Show appropriate message based on device
                if (isIOS && data.passData.appleWalletUrl) {
                    alert('ID card has been sent to your email! Click the Apple Wallet button in the email to add your ID to your wallet.');
                    window.location.href = data.passData.appleWalletUrl;
                } else if (isAndroid && data.passData.googleWalletUrl) {
                    alert('ID card has been sent to your email! Click the Google Wallet button in the email to add your ID to your wallet.');
                    window.location.href = data.passData.googleWalletUrl;
                } else {
                    alert('ID card has been sent to your email! Check your inbox for wallet pass options.');
                }
            } else {
                alert('ID card has been sent to your email!');
            }
        } catch (error) {
            console.error('Error sending ID card:', error);
            setError(error.message || 'Failed to send ID card to email. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleReset = () => {
        setFormData({
            email: '',
            campusId: ''
        });
        setShowOtpInput(false);
        setOtp('');
        setStudent(null);
        setError('');
        setShowConfirmation(false);
        setShowDigitalID(false);
    };

    if (showDigitalID) {
        return (
            <DigitalIDCard 
                student={student}
                onSendEmail={handleSendEmail}
                onStartOver={handleReset}
            />
        );
    }

    if (showConfirmation) {
        return (
            <StudentConfirmation
                student={student}
                onConfirm={() => handleConfirmation(true)}
                onEdit={() => handleConfirmation(false)}
            />
        );
    }

    return (
        <div className="form-container">
            <div className="form-header">
                <img src={tigerLogo} alt="tiger" className="form-image" />
                <div className="form-body">
                    <form onSubmit={handleSubmit}>
                        <input
                            type="email"
                            className="form-input"
                            placeholder="Enter your email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            disabled={showOtpInput}
                            required
                        />
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Enter your campus ID"
                            value={formData.campusId}
                            onChange={(e) => setFormData({ ...formData, campusId: e.target.value })}
                            disabled={showOtpInput}
                            required
                        />
                        {showOtpInput && (
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Enter OTP from your email"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                required
                            />
                        )}
                        <button 
                            type="submit" 
                            className="form-button"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Processing...' : (showOtpInput ? 'Verify OTP' : 'Get OTP')}
                        </button>
                    </form>
                    {error && <p className="error-message">{error}</p>}
                </div>
            </div>
        </div>
    );
};

export default Form;
