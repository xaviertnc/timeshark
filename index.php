<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Time Chomper</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="assets/style.css">
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        primary: {
                            DEFAULT: '#0ea5e9',
                            dark: '#0284c7',
                            light: '#e0f2fe'
                        },
                        secondary: '#0f172a',
                        accent: '#f59e0b',
                        chomper: {
                            teal: '#14b8a6',
                            blue: '#0891b2',
                            dark: '#134e4a'
                        }
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
<body class="bg-[#f8fafc] text-slate-800 font-sans h-screen flex overflow-hidden">

    <!-- Sidebar -->
    <aside class="w-20 lg:w-72 bg-secondary text-white flex flex-col transition-all duration-300 shadow-2xl z-30 relative" id="sidebar">
        <!-- Logo Area -->
        <div class="h-24 flex items-center px-6 border-b border-slate-800/50">
            <div class="w-12 h-12 bg-gradient-to-br from-chomper-teal to-primary rounded-2xl flex items-center justify-center shadow-lg transform rotate-3 hover:rotate-0 transition-transform duration-300">
                 <span class="text-2xl font-black text-white italic">TC</span>
            </div>
            <div class="hidden lg:block ml-4 overflow-hidden">
                <h1 class="font-black text-xl tracking-tighter leading-none bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">TIME CHOMPER</h1>
                <p class="text-[10px] text-chomper-teal font-bold tracking-[0.2em] uppercase mt-1">Track & Conqure</p>
            </div>
        </div>
        
        <nav class="flex-1 overflow-y-auto pt-8 space-y-2 px-4">
            <!-- Navigation items injected by app.js -->
        </nav>

        <!-- User Profile Area -->
        <div class="p-6 border-t border-slate-800/50 bg-slate-900/20">
            <div class="flex items-center group cursor-pointer">
                <div class="relative">
                    <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-accent to-red-500 flex items-center justify-center text-sm font-bold shadow-lg group-hover:scale-110 transition-transform">
                        ME
                    </div>
                    <div class="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-secondary rounded-full"></div>
                </div>
                <div class="hidden lg:block ml-3">
                    <p class="text-sm font-bold text-white group-hover:text-primary transition-colors">Developer</p>
                    <p class="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Workspace Owner</p>
                </div>
            </div>
        </div>
    </aside>

    <!-- Main Content Area -->
    <main class="flex-1 flex flex-col h-full relative overflow-hidden bg-slate-50/50">
        <!-- Sticky Top Header -->
        <header class="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200/60 flex items-center justify-between px-8 z-20 sticky top-0">
            <div>
                <h2 class="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-1" id="breadcrumb">Main Menu</h2>
                <h1 class="text-2xl font-bold text-slate-900 tracking-tight" id="page-title">Dashboard</h1>
            </div>

            <!-- Active Timer Widget -->
            <div id="active-timer-display" class="hidden items-center gap-4 bg-slate-900 text-white pl-2 pr-4 py-2 rounded-2xl shadow-xl border border-slate-800 animate-in fade-in zoom-in duration-300">
                <div class="w-10 h-10 rounded-xl bg-chomper-teal/20 flex items-center justify-center">
                    <div class="w-2.5 h-2.5 rounded-full bg-chomper-teal animate-pulse"></div>
                </div>
                <div>
                   <div class="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mb-1" id="timer-project-name">Project X</div>
                   <div class="font-mono text-xl font-black tabular-nums tracking-wider text-white" id="timer-counter">00:00:00</div>
                </div>
                <button id="stop-timer-btn-header" class="ml-2 w-10 h-10 flex items-center justify-center bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl transition-all group">
                    <svg class="w-5 h-5 fill-current" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
                </button>
            </div>
        </header>

        <!-- Scrollable Content -->
        <div id="app" class="flex-1 overflow-y-auto p-10 relative scroll-smooth">
            <!-- Dynamic Content injected here -->
        </div>
    </main>

    <script type="module" src="assets/app.js"></script>
</body>
</html>
