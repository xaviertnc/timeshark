export const ConfirmModal = {
    show: function(message, options = {}) {
        return new Promise((resolve) => {
            const portal = document.getElementById('modal-portal') || document.body;
            
            const overlay = document.createElement('div');
            overlay.className = 'fixed inset-0 bg-[#0a0f14]/40 z-[9999] flex flex-col items-center justify-center p-4 transition-all duration-200 opacity-0 pointer-events-auto';
            
            const title = options.title || 'Confirm Action';
            const confirmText = options.confirmText || 'Confirm';
            const cancelText = options.cancelText || 'Cancel';
            const isDestructive = options.isDestructive || false;

            overlay.innerHTML = `
                <div class="bg-card w-full max-w-md rounded-2xl shadow-2xl border border-white/10 overflow-hidden transform transition-all duration-300 scale-95 opacity-0 flex flex-col">
                    <div class="p-8">
                        <div class="flex items-center gap-3 mb-3">
                            ${isDestructive 
                                ? '<div class="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 shrink-0"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg></div>'
                                : '<div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></div>'
                            }
                            <h3 class="text-xl font-black text-main tracking-tight">${title}</h3>
                        </div>
                        <p class="text-base text-dim/80 pl-13">${message}</p>
                    </div>
                    <div class="bg-black/20 p-5 mt-auto flex gap-3 justify-end border-t border-white/5">
                        <button id="confirm-cancel-btn" class="px-5 py-2.5 rounded-xl text-xs font-bold text-dim hover:text-white hover:bg-white/5 transition-colors uppercase tracking-widest">
                            ${cancelText}
                        </button>
                        <button id="confirm-action-btn" class="px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-[0.2em] transition-all shadow-lg text-white flex items-center justify-center ${
                            isDestructive 
                            ? 'bg-red-500 hover:bg-red-400 shadow-red-500/20' 
                            : 'bg-primary hover:bg-primary-dark shadow-primary/20'
                        }">
                            ${confirmText}
                        </button>
                    </div>
                </div>
            `;

            portal.appendChild(overlay);

            // Animate in
            requestAnimationFrame(() => {
                overlay.classList.remove('opacity-0');
                overlay.querySelector('div').classList.remove('scale-95', 'opacity-0');
            });

            let resolved = false;

            const cleanup = () => {
                if (resolved) return;
                resolved = true;
                document.removeEventListener('keydown', handleKeydown);
                if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
            };

            const confirmBtn = overlay.querySelector('#confirm-action-btn');
            const cancelBtn = overlay.querySelector('#confirm-cancel-btn');

            confirmBtn.onclick = () => {
                cleanup();
                resolve(true);
            };

            cancelBtn.onclick = () => {
                cleanup();
                resolve(false);
            };

            overlay.onclick = (e) => {
                if (e.target === overlay) {
                    cleanup();
                    resolve(false);
                }
            };
            
            // Focus logic
            if (options.focusCancel) {
                cancelBtn.focus();
            } else {
                confirmBtn.focus();
            }

            // Keyboard support
            const handleKeydown = (e) => {
                if (e.key === 'Escape') {
                    cleanup();
                    resolve(false);
                } else if (e.key === 'Enter') {
                    // Only trigger if focus is not already on a button to avoid double triggering
                    if (document.activeElement !== confirmBtn && document.activeElement !== cancelBtn) {
                        e.preventDefault();
                        cleanup();
                        resolve(!options.focusCancel);
                    }
                }
            };
            document.addEventListener('keydown', handleKeydown);
        });
    }
};
