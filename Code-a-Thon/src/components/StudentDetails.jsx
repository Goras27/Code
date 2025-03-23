import React from 'react';

const StudentDetails = ({ student }) => {
    return (
        <div className="student-details">
            <h2>Student Information</h2>
            <div className="info-container">
                <div className="info-row">
                    <label>Name:</label>
                    <span>{student.name}</span>
                </div>
                <div className="info-row">
                    <label>Student ID:</label>
                    <span>{student.studentId}</span>
                </div>
                <div className="info-row">
                    <label>Email:</label>
                    <span>{student.email}</span>
                </div>
                <div className="info-row">
                    <label>Major:</label>
                    <span>{student.major}</span>
                </div>
                <div className="info-row">
                    <label>Classification:</label>
                    <span>{student.classification}</span>
                </div>
            </div>
        </div>
    );
};

export default StudentDetails; 