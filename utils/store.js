export class Store {
    constructor(initialState = {}) {
        this.state = initialState;
        this.listeners = new Set();
    }

    get() {
        return this.state;
    }

    set(newState) {
        this.state = { ...this.state, ...newState };
        this.notify();
    }

    update(key, value) {
        this.state = { ...this.state, [key]: value };
        this.notify();
    }

    subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener); // Unsubscribe
    }

    notify() {
        this.listeners.forEach(listener => listener(this.state));
    }
}

export const store = new Store({
    customers: [],
    projects: [],
    tasks: [], // Tasks / TODOs
    timeEntries: [],
    currentView: 'dashboard',
    activeTimer: null
});
