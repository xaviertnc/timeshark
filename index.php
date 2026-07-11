<?php
/**
 * index.php
 *
 * Main Application Entry
 *
 * Purpose: Application shell.
 *
 * @package Time Shark
 *
 * Last 3 version commits:
 * @version 3.0 - UPD - 11 Jul 2026 - Browser stability pass: route cleanup, chart/observer/listener disposal, dashboard churn reductions.
 * @version 2.8 - UPD - 22 Jun 2026 - NEW Export Center for Time Entries and TODOs / Tasks with ZIP & Unified JSON support.
 * @version 2.7 - FIX - 14 Jun 2026 - Fix the burnup graph logic and resetting future task dates when we complete them early.
 * @version 2.6 - UPD - 09 Jun 2026 - Standardize modals, delete/save button placement & overflow scrolling.
 */

define('APP_VERSION', 'v3.0');
$appVersion = APP_VERSION;
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Time Shark</title>
    <link rel="icon" type="image/png" href="favicon.png">
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="vendor/chart.min.js"></script>
    <link rel="stylesheet" href="style.css?v=<?=time()?>">
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
                        shark: {
                            teal: '#14b8a6',
                            deep: '#0f172a',
                            sand: '#f8fafc'
                        },
                        soft: 'var(--border-soft)',
                        subtle: 'var(--border-subtle)',
                        highlight: 'var(--highlight-soft)'
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
    <aside class="w-14 lg:w-20 bg-sidebar border-r border-soft flex flex-col transition-all duration-500 z-30 relative" id="sidebar">
        <div class="h-16 flex items-center justify-center shrink-0">
            <a href="#" class="w-11 h-11 rounded-2xl overflow-hidden border border-soft shadow-sm transition-transform hover:scale-110 duration-500 block">
                 <img src="images/time-shark-logo.jpg" class="w-full h-full object-cover">
            </a>
        </div>

        <nav class="flex-1 flex flex-col items-center pt-4 space-y-3 overflow-y-auto overflow-x-hidden">
            <!-- Navigation icons will be injected here. We'll simplify sidebar.js too -->
        </nav>

        <div class="p-3 flex flex-col items-center shrink-0" title="App Version" id="app-version-container">
            <span class="text-xs text-slate-300 font-bold tracking-widest block mt-2 cursor-default hover:text-primary transition-colors"><?= htmlspecialchars($appVersion) ?></span>
        </div>
    </aside>

    <!-- Main Content Area -->
    <main class="flex-1 flex flex-col h-full relative overflow-hidden">
        <!-- Minimal Header -->
        <header class="h-20 flex items-center justify-between px-4 md:px-8 z-10 sticky top-0">
            <div class="opacity-0 transition-opacity duration-700" id="page-header-container">
                <h1 class="text-xs font-black text-dim uppercase tracking-[0.5em]" id="page-title">Dashboard</h1>
            </div>

            <!-- Subtle Timer Indicator -->
            <div id="active-timer-display" class="hidden items-center gap-6 bg-card px-6 py-3 rounded-2xl shadow-soft border border-soft animate-in fade-in slide-in-from-top-4 duration-1000">
                <div class="flex items-center gap-3">
                    <div class="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>
                    <div class="text-[10px] text-dim font-black uppercase tracking-widest whitespace-nowrap" id="timer-project-name">Project</div>
                </div>
                <div class="font-mono text-lg font-black tabular-nums tracking-tighter text-main" id="timer-counter">00:00:00</div>
                <button id="stop-timer-btn-header" class="w-8 h-8 rounded-full border-2 border-red-500/30 flex items-center justify-center text-dim hover:text-red-500 hover:border-red-500/60 transition-all hover:shadow-[0_0_12px_rgba(239,68,68,0.3)]">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
                </button>
            </div>
        </header>

        <!-- The Stage -->
        <div id="app" class="flex-1 overflow-y-auto px-4 md:px-8 pb-16 relative scroll-smooth">
            <!-- Views Injected Here -->
        </div>
    </main>

    <div id="modal-portal" class="fixed inset-0 z-[100] pointer-events-none"></div>
    <script type="module" src="app.js?v=<?=time()?>"></script>
</body>
</html>
