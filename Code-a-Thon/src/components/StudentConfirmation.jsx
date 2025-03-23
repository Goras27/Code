import React from 'react';
import './StudentConfirmation.css';

export default function StudentConfirmation({ student, onConfirm, onEdit }) {
  return (
    <div className="confirmation-container">
      <h2>Please verify your information</h2>
      <div className="student-info">
        <div className="info-row">
          <label>Name:</label>
          <span>{student.name}</span>
        </div>
        <div className="info-row">
          <label>T Number:</label>
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
      <div className="confirmation-actions">
        <button className="confirm-button" onClick={onConfirm}>
          Yes, Information is Correct
        </button>
        <button className="edit-button" onClick={onEdit}>
          No, Edit Information
        </button>
      </div>
    </div>
  );
} 