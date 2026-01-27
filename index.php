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
                        primary: '#003366', // Deep Blue
                        secondary: '#1a1a1a', // Dark Gray/Black
                        accent: '#F97316', // Orange
                    },
                    fontFamily: {
                        sans: ['Inter', 'sans-serif'],
                    }
                }
            }
        }
    </script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
</head>
<body class="bg-[#f0f2f5] text-slate-800 font-sans h-screen flex overflow-hidden">

    <!-- Sidebar -->
    <aside class="w-20 lg:w-64 bg-white border-r border-gray-200 flex flex-col transition-all duration-300 shadow-sm z-20" id="sidebar">
        <div class="h-20 flex items-center justify-center border-b border-gray-100 p-4">
            <img src="time-chomper-logo.jpg" alt="Time Chomper" class="h-full object-contain max-w-[150px]">
        </div>
        
        <nav class="flex-1 overflow-y-auto py-6 space-y-1 px-3">
            <!-- Navigation items will be injected here by app.js -->
        </nav>

        <div class="p-4 border-t border-gray-100">
            <div class="flex items-center justify-center lg:justify-start">
                <div class="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold border border-slate-200">
                    ME
                </div>
                <div class="hidden lg:block ml-3">
                    <p class="text-sm font-bold text-slate-700">User</p>
                    <p class="text-xs text-slate-400">Admin</p>
                </div>
            </div>
        </div>
    </aside>

    <!-- Main Content -->
    <main class="flex-1flex flex-col h-full relative overflow-hidden flex-1 w-full">
        <!-- Top Bar -->
        <header class="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm z-10">
            <h1 class="text-xl font-semibold text-gray-800" id="page-title">Dashboard</h1>
            <div id="active-timer-display" class="hidden flex items-center gap-3 bg-blue-50 px-4 py-2 rounded-full border border-blue-100">
                <div class="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                <span class="text-sm font-medium text-blue-700" id="timer-project-name">Project X</span>
                <span class="font-mono text-blue-900 font-bold" id="timer-counter">00:00:00</span>
                <button id="stop-timer-btn-header" class="text-xs bg-white hover:bg-red-50 text-red-600 border border-red-200 px-2 py-1 rounded transition-colors uppercase tracking-wider font-bold">Stop</button>
            </div>
        </header>

        <!-- Content Area -->
        <div id="app" class="flex-1 overflow-y-auto p-6 bg-slate-50 relative">
            <!-- Dynamic Content -->
        </div>
    </main>

    <script type="module" src="assets/app.js"></script>
</body>
</html>
