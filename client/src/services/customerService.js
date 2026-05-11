import API from './api';

/**
 * @description Customer Service with Multi-tenant support.
 * Handles active/inactive filtering and credit management.
 */
export const customerService = {
    
    // 📊 Fetch customers with Search and Inactive filters
    getCustomers: (search = '', includeInactive = false) => {
        return API.get(`/customers?search=${search}&includeInactive=${includeInactive}`);
    },

    // 🔍 Fetch a specific customer audit log
    getCustomerById: (id) => {
        return API.get(`/customers/${id}`);
    },

    // ➕ Register a new customer
    addCustomer: (customerData) => {
        return API.post('/customers', customerData);
    },

    // ✏️ Update existing customer profile
    updateCustomer: (id, customerData) => {
        return API.put(`/customers/${id}`, customerData);
    },

    // 🔄 SaaS Soft-Delete / Reactivate Toggle
    toggleCustomerStatus: (id) => {
        return API.put(`/customers/${id}/toggle`);
    },

    // 💰 Settle Credit Debt (Naya Potha Payment)
    recordPayment: (id, paymentData) => {
        return API.post(`/customers/${id}/pay`, paymentData);
    }
};

export default customerService;