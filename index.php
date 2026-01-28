<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Time Shark</title>
    <link rel="icon" type="image/jpeg" href="assets/images/time-chomper-logo.jpg">
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <link rel="stylesheet" href="assets/style.css">
    <script>
        tailwind.config = {
            darkMode: 'class',
            theme: {
                extend: {
                    colors: {
                        primary: {
                            DEFAULT: '#338a81', // Darker shark teal
                            dark: '#1f5e58',
                            light: '#b2dfdb'
                        },
                        secondary: '#1e293b', // Rich slate
                        accent: {
                            DEFAULT: '#f59e0b', // Amber/Gold
                            light: '#fef3c7'
                        },
                        chomper: {
                            teal: '#14b8a6',
                            deep: '#0f172a',
                            sand: '#f8fafc'
                        }
                    },
                    borderRadius: {
                        '3xl': '1rem',
                        '4xl': '1.25rem',
                    },
                    fontFamily: {
                        sans: ['Outfit', 'Inter', 'sans-serif'],
                    }
                }
            }
        }
    </script>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
</head>
<body class="bg-app text-main font-sans h-screen flex overflow-hidden">

    <!-- Sidebar: Ultra Zen -->
    <aside class="w-20 lg:w-24 bg-sidebar border-r border-soft flex flex-col transition-all duration-500 z-30 relative" id="sidebar">
        <div class="h-24 flex items-center justify-center">
            <a href="#" class="w-12 h-12 rounded-2xl overflow-hidden border border-soft shadow-sm transition-transform hover:scale-110 duration-500 block">
                 <img src="assets/images/time-chomper-logo.jpg" class="w-full h-full object-cover">
            </a>
        </div>

        <nav class="flex-1 flex flex-col items-center pt-10 space-y-8">
            <!-- Navigation icons will be injected here. We'll simplify sidebar.js too -->
        </nav>

        <div class="p-6 flex flex-col items-center gap-6">
            <div class="w-10 h-10 rounded-xl bg-app border border-soft flex items-center justify-center text-[10px] font-black opacity-40">
                TC
            </div>
        </div>
    </aside>

    <!-- Main Content Area -->
    <main class="flex-1 flex flex-col h-full relative overflow-hidden">
        <!-- Minimal Header -->
        <header class="h-24 flex items-center justify-between px-16 z-20 sticky top-0">
            <div class="opacity-0 transition-opacity duration-700" id="page-header-container">
                <h1 class="text-xs font-black text-slate-300 uppercase tracking-[0.5em]" id="page-title">Dashboard</h1>
            </div>

            <!-- Subtle Timer Indicator -->
            <div id="active-timer-display" class="hidden items-center gap-6 bg-card px-6 py-3 rounded-2xl shadow-soft border border-soft animate-in fade-in slide-in-from-top-4 duration-1000">
                <div class="flex items-center gap-3">
                    <div class="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>
                    <div class="text-[10px] text-dim font-black uppercase tracking-widest whitespace-nowrap" id="timer-project-name">Project</div>
                </div>
                <div class="font-mono text-lg font-black tabular-nums tracking-tighter text-main" id="timer-counter">00:00:00</div>
                <button id="stop-timer-btn-header" class="text-dim hover:text-red-500 transition-colors">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="7" y="7" width="10" height="10" rx="1" stroke-width="2.5"/></svg>
                </button>
            </div>
        </header>

        <!-- The Stage -->
        <div id="app" class="flex-1 overflow-y-auto px-16 pb-16 relative scroll-smooth">
            <!-- Views Injected Here -->
        </div>
    </main>

    <div id="modal-portal" class="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center"></div>
    <script type="module" src="assets/app.js"></script>
</body>
</html>
