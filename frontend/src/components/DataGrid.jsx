import React from 'react';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import { esgApi } from '../services/api';

export default function DataGrid({ records, onRefresh }) {
    
    const handleApprove = async (id) => {
        try {
            await esgApi.approveRecord(id);
            onRefresh(); // Tell the Dashboard to re-fetch the data so the stats update!
        } catch (error) {
            alert("Failed to approve record.");
        }
    };

    if (!records || records.length === 0) {
        return <p style={{ textAlign: 'center', marginTop: '20px', color: '#888' }}>No records found in the ledger.</p>;
    }

    return (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'left', background: '#fff', borderRadius: '8px', overflow: 'hidden', border: '1px solid #ebebeb' }}>
            <thead>
                <tr style={{ backgroundColor: '#f9fafb', color: '#6b7280', borderBottom: '2px solid #e5e7eb' }}>
                    <th style={{ padding: '12px 16px' }}>Date</th>
                    <th style={{ padding: '12px 16px' }}>Facility</th>
                    <th style={{ padding: '12px 16px' }}>Category</th>
                    <th style={{ padding: '12px 16px' }}>Quantity</th>
                    <th style={{ padding: '12px 16px' }}>Status</th>
                    <th style={{ padding: '12px 16px' }}>Action</th>
                </tr>
            </thead>
            <tbody>
                {records.map((row) => (
                    <tr key={row.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '12px 16px' }}>{row.start_date}</td>
                        <td style={{ padding: '12px 16px' }}>{row.facility_name}</td>
                        <td style={{ padding: '12px 16px', color: '#666', fontSize: '12px' }}>{row.ghg_category}</td>
                        <td style={{ padding: '12px 16px', fontWeight: '600' }}>{row.raw_quantity} {row.raw_unit}</td>
                        <td style={{ padding: '12px 16px' }}>
                            {row.status === 'APPROVED' ? (
                                <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: '500' }}>
                                    <CheckCircle size={15} /> Approved
                                </span>
                            ) : row.status === 'FLAGGED' ? (
                                <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: '500' }}>
                                    <AlertTriangle size={15} /> Flagged
                                    <div style={{ fontSize: '11px', color: '#991b1b', marginTop: '2px', fontWeight: 'normal' }}>{row.anomaly_reason}</div>
                                </span>
                            ) : (
                                <span style={{ color: '#6b7280' }}>RAW</span>
                            )}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                            {row.status !== 'APPROVED' && (
                                <button 
                                    onClick={() => handleApprove(row.id)}
                                    style={{ backgroundColor: '#10b981', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: '500', fontSize: '12px' }}
                                >
                                    Approve
                                </button>
                            )}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}