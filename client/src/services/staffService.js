import API from './api';

export const staffService = {
    getStats:        ()         => API.get('/staff/stats'),
    getStaff:        ()         => API.get('/staff'),
    addStaff:        (data)     => API.post('/auth/register-staff', data),
    updateStaff:     (id, data) => API.put(`/staff/${id}`, data),
    toggleStatus:    (id)       => API.put(`/staff/${id}/toggle`),
    resetPassword:   (id, data) => API.put(`/staff/${id}/reset-password`, data)
};