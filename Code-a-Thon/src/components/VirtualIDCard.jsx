import React from 'react';
import tigerLogo from "../assets/tiger.png";

const VirtualIDCard = ({ student }) => {
    if (!student) return null;

    return (
        <div className="virtual-id-card">
            <div className="id-card-header">
                <div className="id-card-logo">
                    <img src={tigerLogo} alt="TSU Logo" />
                    <div className="id-card-title">
                        <h3>TENNESSEE STATE UNIVERSITY</h3>
                        <span>Student Identification</span>
                    </div>
                </div>
            </div>
            <div className="id-card-body">
                <div className="id-card-photo">
                    <img 
                        src={student.imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(student.name)}&background=003366&color=fff&size=200`}
                        alt={student.name} 
                    />
                </div>
                <div className="id-card-info">
                    <div className="info-item">
                        <label>Name</label>
                        <span>{student.name}</span>
                    </div>
                    <div className="info-item">
                        <label>ID Number</label>
                        <span>{student.studentId}</span>
                    </div>
                    <div className="info-item">
                        <label>Major</label>
                        <span>{student.major}</span>
                    </div>
                    <div className="info-item">
                        <label>Classification</label>
                        <span>{student.classification}</span>
                    </div>
                </div>
            </div>
            <div className="id-card-footer">
                <div className="validity">
                    <span>Valid through: 2024-2025</span>
                </div>
                <div className="signature">
                    <span>Authorized Signature</span>
                    <div className="signature-line"></div>
                </div>
            </div>
        </div>
    );
};

export default VirtualIDCard; 