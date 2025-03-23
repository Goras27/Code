import React, { useState } from 'react';
import './DigitalIDCard.css';
import Barcode from 'react-barcode';

export default function DigitalIDCard({ student, onSendEmail, onStartOver }) {
  const [passUrls, setPassUrls] = useState(null);
  const [loading, setLoading] = useState(false);

  const createWalletPass = async () => {
    try {
      setLoading(true);
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
        throw new Error(data.error || 'Failed to create wallet pass');
      }

      if (data.passData && (data.passData.appleWalletUrl || data.passData.googleWalletUrl)) {
        setPassUrls(data.passData);
        // On iOS, directly open the pass
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        if (isIOS && data.passData.appleWalletUrl) {
          window.location.href = data.passData.appleWalletUrl;
        }
      }
    } catch (error) {
      console.error('Error creating wallet pass:', error);
      alert(error.message || 'Failed to create wallet pass. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = async () => {
    try {
      setLoading(true);
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

      alert('ID card has been sent to your email!');
      
      if (data.passData) {
        setPassUrls(data.passData);
      }
    } catch (error) {
      console.error('Error sending ID card:', error);
      alert(error.message || 'Failed to send ID card to email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="digital-id-container">
      <div className="digital-id-card">
        <div className="card-header">
          <h2>Tennessee State University</h2>
          <span>Student Identification</span>
        </div>
        
        <div className="card-body">
          <div className="photo-section">
            <img 
              src={student.imageUrl || 'https://via.placeholder.com/200x200?text=No+Photo'} 
              alt="Student" 
              className="student-photo" 
            />
          </div>
          
          <div className="details-section">
            <div className="info-item">
              <label>Name:</label>
              <span>{student.name}</span>
            </div>
            <div className="info-item">
              <label>T Number:</label>
              <span>{student.studentId}</span>
            </div>
            <div className="info-item">
              <label>Major:</label>
              <span>{student.major}</span>
            </div>
            <div className="info-item">
              <label>Valid Until:</label>
              <span>December 1, 2026</span>
            </div>
            <div className="barcode-section">
              <Barcode 
                value={student.studentId} 
                width={2}
                height={80}
                displayValue={false}
                background="transparent"
                lineColor="white"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="card-actions">
        <button className="email-btn" onClick={handleSendEmail} disabled={loading}>
          Send to Email
        </button>
        <div className="wallet-buttons">
          {passUrls?.appleWalletUrl && (
            <a 
              href={passUrls.appleWalletUrl} 
              className="wallet-button apple-wallet"
              onClick={(e) => {
                e.preventDefault();
                window.location.href = passUrls.appleWalletUrl;
              }}
            >
              Add to Apple Wallet
            </a>
          )}
          {passUrls?.googleWalletUrl && (
            <a 
              href={passUrls.googleWalletUrl}
              className="wallet-button google-wallet"
              target="_blank"
              rel="noopener noreferrer"
            >
              Add to Google Wallet
            </a>
          )}
        </div>
        {!passUrls && (
          <button 
            className="wallet-btn" 
            onClick={createWalletPass}
            disabled={loading}
          >
            Create Wallet Pass
          </button>
        )}
        <button className="start-over-btn" onClick={onStartOver}>
          Start Over
        </button>
      </div>
    </div>
  );
}