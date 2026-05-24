import axios from 'axios';
// This will use your live backend URL when deployed, or localhost when testing
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export const esgApi = {
    uploadSAP: async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await axios.post(`${API_BASE_URL}/upload/sap/`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },
    uploadUtility: async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await axios.post(`${API_BASE_URL}/upload/utility/`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },
    uploadConcur: async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await axios.post(`${API_BASE_URL}/upload/concur/`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },
    
    // NEW: Fetch all ledger records
    getRecords: async () => {
        const response = await axios.get(`${API_BASE_URL}/records/`);
        return response.data;
    },

    // NEW: Approve a specific row
    approveRecord: async (id) => {
        const response = await axios.post(`${API_BASE_URL}/records/${id}/approve/`);
        return response.data;
    }
};