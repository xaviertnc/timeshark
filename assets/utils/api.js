const API_BASE = 'api/';

export const api = {
    async get(endpoint) {
        const sep = endpoint.includes('?') ? '&' : '?';
        const response = await fetch(`${API_BASE}${endpoint}${sep}cb=${Date.now()}`);
        if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
        return await response.json();
    },

    async post(endpoint, data) {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
        return await response.json();
    },

    async delete(endpoint) {
        const sep = endpoint.includes('?') ? '&' : '?';
        const response = await fetch(`${API_BASE}${endpoint}${sep}cb=${Date.now()}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
        return await response.json();
    }
};
