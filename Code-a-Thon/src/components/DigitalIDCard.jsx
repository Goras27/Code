import React from 'react';
import './DigitalIDCard.css';
import Barcode from 'react-barcode';

export default function DigitalIDCard({ student, onSendEmail, onStartOver }) {
  const handleSendEmail = async () => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5002';
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
          // Optionally open the pass URL directly
          window.location.href = data.passData.appleWalletUrl;
        } else if (isAndroid && data.passData.googleWalletUrl) {
          alert('ID card has been sent to your email! Click the Google Wallet button in the email to add your ID to your wallet.');
          // Optionally open the pass URL directly
          window.location.href = data.passData.googleWalletUrl;
        } else {
          alert('ID card has been sent to your email! Check your inbox for wallet pass options.');
        }
      } else {
        alert('ID card has been sent to your email!');
      }
    } catch (error) {
      console.error('Error sending ID card:', error);
      alert(error.message || 'Failed to send ID card to email. Please try again.');
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
        <button className="email-btn" onClick={handleSendEmail}>
          Send to Email
        </button>
        <button className="reset-btn" onClick={onStartOver}>
          Start Over
        </button>
      </div>
    </div>
  );
} 