import API from './api';

// 💡 Individual Named Exports (මෙහෙම තිබුණම තමයි NewPurchase.jsx එකට ලේසි වෙන්නේ)
export const createGRN = (data) => API.post('/grn', data);
export const getGRNList = (params) => API.get('/grn', { params });
export const getGRNById = (id) => API.get(`/grn/${id}`);
export const voidGRN = (id, voidReason) => API.put(`/grn/${id}/void`, { voidReason });

export const grnService = {
    createGRN,
    getGRNList,
    getGRNById,
    voidGRN
};

export default grnService;