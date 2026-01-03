// landingpage.js

function renderLandingPage(config = {}) {
    const safeConfig = JSON.stringify(config).replace(/</g, "\\u003c");

    // Inject genre constants
    const GENRES = {
        TMDB_MOVIE: ["Action", "Adventure", "Animation", "Comedy", "Crime", "Documentary", "Drama", "Family", "Fantasy", "History", "Horror", "Music", "Mystery", "Romance", "Science Fiction", "TV Movie", "Thriller", "War", "Western"],
        TMDB_TV: ["Action & Adventure", "Animation", "Comedy", "Crime", "Documentary", "Drama", "Family", "Kids", "Mystery", "News", "Reality", "Sci-Fi & Fantasy", "Soap", "Talk", "War & Politics", "Western"],
        ANIME: ["Action", "Adventure", "Comedy", "Drama", "Ecchi", "Fantasy", "Horror", "Isekai", "Iyashikei", "Josei", "Mahou Shoujo", "Mecha", "Music", "Mystery", "Psychological", "Romance", "Sci-Fi", "Seinen", "Shoujo", "Shonen", "Slice of Life", "Sports", "Supernatural", "Thriller"]
    };
    const genresScript = `const GENRES = ${JSON.stringify(GENRES)};`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1.0" />
    <title>Configuration -- Cinemind</title>
    
    <!-- SEO & Social Embed -->
    <meta name="description" content="Algorithmic-powered personalized movie and TV recommendations for Stremio. Integrates with MDBList, Trakt, TMDB, and AniList.">
    <meta property="og:type" content="website">
    <meta property="og:title" content="Cinemind - Personalized Stremio Recommendations">
    <meta property="og:description" content="Smart Movie and TV recommendations based on your watch history. Integrates with Stremio, MDBList, Trakt, and AniList.">
    <meta property="og:image" content="https://i.imgur.com/VuuIDMY.png">
    <meta property="og:url" content="https://recs.shss.men">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="Cinemind - Personalized Stremio Recommendations">
    <meta name="twitter:description" content="Smart Movie and TV recommendations based on your watch history.">
    <meta name="twitter:image" content="https://i.imgur.com/VuuIDMY.png">
    <link rel="icon" type="image/png" href="https://i.imgur.com/VuuIDMY.png">
    
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
    
    <style>
        /* --- Tooltips --- */
        .tooltip-container { position: relative; display: inline-block; margin-left: 6px; }
        .tooltip-icon { 
            color: var(--text-muted); cursor: help; font-size: 12px; 
            border: 1px solid var(--border); border-radius: 50%; width: 16px; height: 16px; 
            display: inline-flex; align-items: center; justify-content: center;
        }
        .tooltip-content {
            visibility: hidden; position: absolute; bottom: 125%; left: 50%; transform: translateX(-50%);
            background: rgba(10, 10, 12, 0.95); border: 1px solid var(--border);
            color: var(--text-main); text-align: left; padding: 12px; border-radius: 8px;
            width: 260px; z-index: 100; opacity: 0; transition: 0.2s;
            box-shadow: 0 4px 20px rgba(0,0,0,0.5); pointer-events: none;
            font-size: 12px; line-height: 1.4; font-weight: 400; text-transform: none;
        }
        .tooltip-container:hover .tooltip-content { visibility: visible; opacity: 1; bottom: 140%; }
        .tooltip-header { font-weight: 600; color: white; margin-bottom: 4px; display: block; }

        :root {
            /* Aurora Palette */
            --bg-root: #000000;
            --bg-panel: rgba(10, 10, 12, 0.7);
            --bg-card: rgba(20, 20, 25, 0.6);
            --bg-hover: rgba(255, 255, 255, 0.05);
            
            --border: rgba(255,255,255,0.08); 
            --border-light: rgba(255,255,255,0.15);
            
            --accent: #6366f1;       /* Indigo */
            --accent-grad: linear-gradient(135deg, #6366f1, #8b5cf6);
            --accent-glow: 0 0 20px rgba(99, 102, 241, 0.3);
            
            --text-main: #ffffff;
            --text-muted: #94a3b8;
            
            --radius: 12px;
            --font-main: 'Space Grotesk', system-ui, sans-serif;
            --font-mono: 'Space Mono', monospace;
            
            --ease: cubic-bezier(0.2, 0.0, 0, 1.0);
        }

        /* --- Base --- */
        * { box-sizing: border-box; outline: none; }
        ::selection { background: rgba(99, 102, 241, 0.5); color: white; }

        body {
            margin: 0;
            background-color: var(--bg-root);
            color: var(--text-main);
            font-family: var(--font-main);
            -webkit-font-smoothing: antialiased;
            display: flex;
            height: 100vh;
            overflow: hidden;
            font-size: 14px;
        }

        /* --- Dynamic Background --- */
        .bg-blob {
            position: fixed;
            width: 800px; height: 800px;
            border-radius: 50%;
            filter: blur(80px);
            opacity: 0.15;
            z-index: -1;
            animation: float 20s infinite ease-in-out;
            pointer-events: none;
        }
        .blob-1 { top: -200px; left: -200px; background: #4f46e5; animation-delay: 0s; }
        .blob-2 { bottom: -200px; right: -200px; background: #c026d3; animation-delay: -5s; }
        .blob-3 { top: 40%; left: 40%; width: 500px; height: 500px; background: #0891b2; opacity: 0.1; animation-delay: -10s; }

        @keyframes float {
            0%, 100% { transform: translate(0, 0) scale(1); }
            33% { transform: translate(30px, -50px) scale(1.1); }
            66% { transform: translate(-20px, 20px) scale(0.9); }
        }

        /* --- Layout --- */
        .layout {
            display: grid;
            grid-template-columns: 280px 1fr;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.2); /* Tint */
        }

        /* --- Sidebar --- */
        .sidebar {
            background: rgba(5, 5, 8, 0.6);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border-right: 1px solid var(--border);
            display: flex;
            flex-direction: column;
            padding: 24px;
            gap: 24px;
            z-index: 20;
        }

        .brand {
            display: flex; align-items: center; gap: 14px;
            padding-bottom: 24px; border-bottom: 1px solid var(--border);
        }
        .brand-logo {
            width: 32px; height: 32px; 
            background: transparent;
            border-radius: 8px;
            display: grid; place-items: center; font-size: 24px;
            text-shadow: 0 0 20px rgba(99, 102, 241, 0.6);
        }
        .brand-name { font-weight: 700; font-size: 1.1em; letter-spacing: -0.01em; color: white; }

        .nav { display: flex; flex-direction: column; gap: 4px; }
        .nav-item {
            display: flex; align-items: center; gap: 12px;
            padding: 10px 14px;
            border-radius: 8px;
            font-size: 13px;
            color: var(--text-muted);
            cursor: pointer;
            transition: all 0.2s var(--ease);
            font-weight: 500;
            border: 1px solid transparent;
        }
        .nav-item:hover { background: var(--bg-hover); color: var(--text-main); }
        .nav-item.active { 
            background: rgba(99, 102, 241, 0.1); 
            color: #818cf8; 
            border-color: rgba(99, 102, 241, 0.2);
        }
        .nav-num { 
            font-family: var(--font-mono); font-size: 11px; 
            opacity: 0.8;
        }

        .status-panel {
            margin-top: auto; margin-bottom: auto;
            border-top: 1px solid var(--border);
            padding-top: 20px;
            display: flex; flex-direction: column; gap: 16px;
        }
        .stat-group h4 { margin: 0 0 10px 0; font-size: 10px; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.1em; opacity: 1; }
        
        .stat-row { 
            display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 12px; 
            color: var(--text-muted); align-items: center;
        }
        .stat-val { font-family: var(--font-mono); color: var(--text-main); text-align: right; }
        .status-dot { width: 6px; height: 6px; background: #333; border-radius: 50%; display: inline-block; margin-right: 6px; }
        .connected .status-dot { background: #10b981; box-shadow: 0 0 10px #10b981; }

        /* --- Main Content --- */
        .content {
            overflow-y: auto;
            position: relative;
            padding-bottom: 100px;
            background-image: radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px);
            background-size: 24px 24px;
        }

        .container {
            max-width: 860px;
            margin: 0 auto;
            padding: 60px 40px;
            display: flex; flex-direction: column; gap: 40px;
        }

        /* Animations */
        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-in { animation: fadeInUp 0.6s var(--ease) forwards; opacity: 0; }
        .delay-1 { animation-delay: 0.1s; }
        .delay-2 { animation-delay: 0.2s; }
        .delay-3 { animation-delay: 0.3s; }
        .delay-4 { animation-delay: 0.4s; }

        .section {
            position: relative;
        }
        
        .section-header {
            margin-bottom: 20px;
            display: flex; align-items: center; gap: 16px;
        }
        .section-number {
            font-family: var(--font-mono); font-size: 32px; font-weight: 700;
            color: rgba(255,255,255,0.4);
            line-height: 1;
        }
        .section-title { font-size: 18px; font-weight: 600; color: white; letter-spacing: -0.01em; }
        
        /* Glass Card */
        .glass-card {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 16px;
            padding: 32px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.2);
            backdrop-filter: blur(10px);
            transition: transform 0.3s var(--ease), border-color 0.3s;
        }
        .glass-card:hover {
            border-color: var(--border-light);
            box-shadow: 0 12px 40px rgba(0,0,0,0.3);
        }

        /* --- Controls --- */
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
        .form-group { margin-bottom: 24px; }
        .form-group:last-child { margin-bottom: 0; }
        
        .label {
            display: block; font-size: 11px; font-weight: 600; 
            color: var(--text-muted); margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.05em;
        }

        .input {
            width: 100%;
            background: rgba(0,0,0,0.3);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 12px 16px;
            font-family: var(--font-mono); font-size: 13px; color: var(--text-main);
            transition: 0.2s;
        }
        .input:focus {
            background: black;
            border-color: var(--accent);
            box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
        }

        /* Select */
        .select-wrapper { position: relative; }
        .select {
            width: 100%;
            appearance: none;
            background: rgba(0,0,0,0.3);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 12px 16px;
            color: var(--text-main);
            font-size: 13px;
            cursor: pointer;
            transition: 0.2s;
        }
        .select option { background: #1a1a1a; color: white; }

        .select:hover { border-color: var(--text-muted); background: rgba(255,255,255,0.05); }
        .select:focus { border-color: var(--accent); box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2); }
        .select-arrow {
            position: absolute; right: 16px; top: 50%; transform: translateY(-50%);
            pointer-events: none; font-size: 10px; color: var(--text-muted);
        }

        /* Chips */
        .chips { display: flex; flex-wrap: wrap; gap: 10px; }
        .chip {
            border: 1px solid var(--border);
            background: rgba(255,255,255,0.02);
            padding: 10px 18px;
            border-radius: 100px;
            font-size: 13px;
            color: var(--text-muted);
            cursor: pointer;
            transition: 0.2s;
            display: flex; align-items: center; gap: 8px;
            font-weight: 500;
        }
        .chip:hover { border-color: var(--text-muted); color: var(--text-main); transform: translateY(-2px); background: rgba(255,255,255,0.05); }
        .chip.active {
            background: white; color: black; border-color: white; 
            box-shadow: 0 4px 12px rgba(255,255,255,0.2);
        }
        .chip input { display: none; }
        .chip-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--border); transition: 0.2s; }
        .chip.active .chip-dot { background: black; }

        /* Switches */
        .row-switch {
            display: flex; justify-content: space-between; align-items: center;
            padding: 16px; border: 1px solid var(--border); border-radius: 10px; background: rgba(255,255,255,0.02);
            transition: 0.2s;
            cursor: pointer;
        }
        .row-switch:hover { border-color: var(--text-muted); background: rgba(255,255,255,0.04); }
        
        .switch-base {
            width: 44px; height: 24px;
            background: #222;
            border-radius: 99px;
            position: relative;
            cursor: pointer;
            transition: 0.2s;
            box-shadow: inset 0 2px 4px rgba(0,0,0,0.5);
        }
        .switch-knob {
            width: 20px; height: 20px;
            background: #666;
            border-radius: 50%;
            position: absolute; top: 2px; left: 2px;
            transition: 0.2s var(--ease);
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        .switch-input { display: none; }
        .switch-input:checked + .switch-base { background: var(--accent); }
        .switch-input:checked + .switch-base .switch-knob { transform: translateX(20px); background: white; }

        /* Draggable List */
        .sort-list { display: flex; flex-direction: column; gap: 8px; }
        .sort-item {
            display: flex; align-items: center; gap: 16px;
            padding: 14px 20px;
            background: rgba(255,255,255,0.02);
            border: 1px solid transparent;
            border-radius: 10px;
            font-size: 13px;
            transition: 0.2s;
        }
        .sort-item:hover { border-color: var(--border-light); background: rgba(255,255,255,0.04); transform: translateX(4px); }
        .sort-item.dragging { opacity: 0.4; border: 1px dashed var(--accent); background: black; }
        
        .handle { color: var(--text-muted); cursor: grab; font-size: 16px; }
        
        .checkbox-modern {
            width: 20px; height: 20px;
            border: 2px solid var(--text-muted); border-radius: 6px;
            display: grid; place-items: center; cursor: pointer;
            transition: 0.2s;
            position: relative;
        }
        .checkbox-modern.checked { border-color: var(--accent); background: var(--accent); box-shadow: 0 0 10px rgba(99, 102, 241, 0.4); }
        
        .checkbox-modern svg {
            width: 14px; height: 14px;
            fill: white;
            opacity: 0;
            transform: scale(0.5);
            transition: 0.2s;
        }
        .checkbox-modern.checked svg { opacity: 1; transform: scale(1); }
        
        .checkbox-modern input {
            position: absolute; inset: 0; width: 100%; height: 100%;
            opacity: 0; cursor: pointer; margin: 0;
        }

        /* Tabs - Separated Pill Buttons */
        .tabs { 
            display: flex; 
            gap: 12px; 
            margin-bottom: 24px; 
        }
        .tab {
            padding: 10px 28px; 
            font-size: 13px; 
            color: var(--text-muted); 
            cursor: pointer;
            border-radius: 100px; 
            font-weight: 500;
            border: 1px solid var(--border);
            background: rgba(255,255,255,0.02);
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .tab:hover { 
            color: var(--text-main); 
            background: rgba(255,255,255,0.05); 
            border-color: var(--text-muted);
        }
        .tab.active { 
            background: linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.15)); 
            color: white; 
            border-color: rgba(99, 102, 241, 0.4);
            box-shadow: 0 0 20px rgba(99, 102, 241, 0.15);
        }

        /* Buttons */
        .btn-primary {
            width: 100%;
            background: var(--accent-grad); 
            color: white;
            border: none; border-radius: 10px;
            padding: 18px; font-weight: 700; font-size: 14px;
            cursor: pointer; transition: 0.3s;
            box-shadow: 0 4px 20px rgba(99, 102, 241, 0.3);
            text-transform: uppercase; letter-spacing: 0.05em;
        }
        .btn-primary:hover { 
            transform: translateY(-2px); 
            box-shadow: 0 8px 30px rgba(99, 102, 241, 0.5); 
            filter: brightness(1.1);
        }
        
        .btn-text {
            background: transparent; border: 1px solid var(--border); 
            color: var(--text-main); padding: 8px 16px; border-radius: 8px;
            font-size: 12px; cursor: pointer; transition: 0.2s;
        }
        .btn-text:hover { background: var(--bg-hover); border-color: var(--text-muted); }

        /* Msgs */
        .msg { font-size: 13px; margin-top: 12px; padding: 12px; border-radius: 8px; display: none; line-height: 1.5; }
        .msg.show { display: block; animation: fadeInUp 0.3s ease; }
        .success { background: rgba(16, 185, 129, 0.1); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.2); box-shadow: 0 4px 12px rgba(16,185,129,0.1); }
        .error { background: rgba(239, 68, 68, 0.1); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.2); box-shadow: 0 4px 12px rgba(239, 68, 68, 0.1); }

        /* Output Info */
        #outputInfoBox a { color: #818cf8; text-decoration: none; border-bottom: 1px dashed #818cf8; }
        #outputInfoBox a:hover { color: white; border-bottom-style: solid; }

        #installScreen { display: none; text-align: center; padding-top: 100px; }
        .code-block {
             background: rgba(0,0,0,0.5); border: 1px solid var(--border); padding: 24px; border-radius: 12px;
             font-family: var(--font-mono); color: #a5b4fc;
             margin: 30px auto; max-width: 600px;
             word-break: break-all; font-size: 13px;
        }

        /* ==========================================
           MOBILE RESPONSIVE
           ========================================== */
        @media (max-width: 900px) {
            body { overflow: auto; height: auto; }
            .layout { grid-template-columns: 1fr; display: block; }
            .sidebar { display: none; }
            .content { padding-bottom: 40px; }
            .container { padding: 24px 16px; gap: 24px; }
            .glass-card { padding: 20px; border-radius: 12px; }
            .grid-2, .grid-3 { grid-template-columns: 1fr; gap: 16px; }
            .section-header { margin-bottom: 16px; }
            .section-number { font-size: 24px; }
            .section-title { font-size: 16px; }
            .tabs { flex-wrap: wrap; width: 100%; }
            .tab { flex: 1; text-align: center; padding: 10px 12px; }
            .chips { gap: 8px; }
            .chip { padding: 8px 14px; font-size: 12px; }
            .row-switch { padding: 14px; }
            .sort-item { padding: 12px 16px; }
            .btn-primary { padding: 16px; font-size: 13px; }
            .code-block { font-size: 10px; padding: 16px; margin: 20px 0; }
            #installScreen { padding-top: 40px; }
            .form-group { margin-bottom: 16px; }
            .input, .select { padding: 14px 16px; font-size: 14px; }
        }
        @media (max-width: 400px) {
            .container { padding: 16px 12px; }
            .glass-card { padding: 16px; }
        }

        /* ==========================================
           MICRO-INTERACTIONS & GLOW EFFECTS
           ========================================== */
        
        /* Button press effect */
        .btn-primary:active { transform: translateY(0) scale(0.98); }
        .btn-text:active { transform: scale(0.95); }
        
        /* Enhanced chip hover with glow */
        .chip:hover {
            box-shadow: 0 0 15px rgba(99, 102, 241, 0.2);
        }
        .chip.active:hover {
            box-shadow: 0 4px 20px rgba(255,255,255,0.4);
        }
        
        /* Input glow on focus */
        .input:focus, .select:focus {
            border-color: var(--accent);
            box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15), 0 0 20px rgba(99, 102, 241, 0.2);
        }
        
        /* Switch glow when on */
        .switch-input:checked + .switch-base {
            box-shadow: 0 0 15px rgba(99, 102, 241, 0.5);
        }
        

        
        /* Subtle hover pulse for cards */
        .glass-card:hover {
            transform: translateY(-2px);
        }
        
        /* Row switch subtle lift */
        .row-switch:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }
        

        
        /* Step indicators */
        .step-indicator {
            position: fixed;
            top: 12px;
            right: 24px;
            display: flex;
            gap: 8px;
            z-index: 1000;
        }
        .step-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: rgba(255,255,255,0.2);
            transition: 0.3s var(--ease);
        }
        .step-dot.active {
            background: var(--accent);
            box-shadow: 0 0 10px rgba(99, 102, 241, 0.6);
        }
        .step-dot.completed {
            background: #10b981;
            box-shadow: 0 0 10px rgba(16, 185, 129, 0.5);
        }
        
        @media (max-width: 900px) {
            .step-indicator { display: none; }
        }
        
        /* ==========================================
           CELEBRATORY INSTALL SCREEN
           ========================================== */
        #installScreen {
            display: none;
            text-align: center;
            padding: 60px 20px 80px;
            position: fixed;
            inset: 0;
            overflow-y: auto;
            overflow-x: hidden;
            background: var(--bg-root);
            z-index: 100;
        }
        
        /* Aurora blobs for install screen */
        .install-blob {
            position: fixed;
            border-radius: 50%;
            filter: blur(80px);
            opacity: 0.15;
            z-index: -1;
            pointer-events: none;
            animation: float 20s infinite ease-in-out;
        }
        .install-blob-1 { top: -200px; left: -200px; width: 800px; height: 800px; background: #4f46e5; animation-delay: 0s; }
        .install-blob-2 { bottom: -200px; right: -200px; width: 800px; height: 800px; background: #c026d3; animation-delay: -5s; }
        .install-blob-3 { top: 40%; left: 40%; width: 500px; height: 500px; background: #0891b2; opacity: 0.1; animation-delay: -10s; }
        
        /* Success icon with pulse */
        .success-icon {
            width: 80px;
            height: 80px;
            background: linear-gradient(135deg, #10b981, #34d399);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 24px;
            font-size: 36px;
            animation: successPulse 2s infinite;
            box-shadow: 0 0 40px rgba(16, 185, 129, 0.4);
        }
        
        @keyframes successPulse {
            0%, 100% { transform: scale(1); box-shadow: 0 0 40px rgba(16, 185, 129, 0.4); }
            50% { transform: scale(1.05); box-shadow: 0 0 60px rgba(16, 185, 129, 0.6); }
        }
        
        /* Confetti animation - covers full viewport */
        #confettiContainer {
            position: fixed;
            inset: 0;
            pointer-events: none;
            z-index: 1000;
            overflow: hidden;
        }
        .confetti {
            position: absolute;
            width: 10px;
            height: 10px;
            opacity: 0;
        }
        
        .confetti.active {
            animation: confettiFall 4s ease-out forwards;
        }
        
        @keyframes confettiFall {
            0% { opacity: 1; transform: translateY(0) rotate(0deg); }
            100% { opacity: 0; transform: translateY(100vh) rotate(1080deg); }
        }
        
        /* Secondary action buttons on install screen */
        .btn-secondary {
            padding: 12px 24px;
            font-size: 14px;
            font-weight: 500;
            font-family: var(--font-main);
            border: 1px solid var(--border-light);
            background: rgba(255,255,255,0.05);
            color: var(--text-main);
            border-radius: 10px;
            cursor: pointer;
            transition: all 0.2s var(--ease);
            display: inline-flex;
            align-items: center;
            gap: 8px;
        }
        .btn-secondary:hover {
            background: rgba(255,255,255,0.1);
            border-color: rgba(255,255,255,0.3);
            transform: translateY(-1px);
        }
        
        /* Copy button with success state */
        .btn-copy {
            background: linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.1));
            border-color: rgba(99, 102, 241, 0.3);
        }
        .btn-copy:hover {
            background: linear-gradient(135deg, rgba(99, 102, 241, 0.25), rgba(139, 92, 246, 0.2));
            border-color: rgba(99, 102, 241, 0.5);
        }
        .btn-copy.copied {
            background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(52, 211, 153, 0.15));
            border-color: rgba(16, 185, 129, 0.4);
            color: #34d399;
        }
        
        /* Gradient text for title */
        .gradient-title {
            background: linear-gradient(135deg, #fff, #a5b4fc);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        
        /* Install button glow animation */
        #installBtn {
            position: relative;
            overflow: hidden;
        }
        #installBtn::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
            animation: shimmer 2s infinite;
        }
        @keyframes shimmer {
            0% { left: -100%; }
            100% { left: 100%; }
        }
        
        /* Glow ring around code block */
        .code-block-glow {
            position: relative;
        }
        .code-block-glow::before {
            content: '';
            position: absolute;
            inset: -2px;
            background: linear-gradient(135deg, var(--accent), #c026d3, var(--accent));
            border-radius: 14px;
            z-index: -1;
            opacity: 0.3;
            filter: blur(8px);
        }
        
        /* Config import/export notification */
        .toast {
            position: fixed;
            bottom: 24px;
            left: 50%;
            transform: translateX(-50%) translateY(100px);
            background: rgba(16, 185, 129, 0.95);
            color: white;
            padding: 12px 24px;
            border-radius: 10px;
            font-size: 14px;
            font-weight: 500;
            z-index: 10000;
            opacity: 0;
            transition: all 0.3s var(--ease);
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        }
        .toast.show {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
        }
        .toast.error {
            background: rgba(239, 68, 68, 0.95);
        }
        
        /* Rename button and inline edit */
        .rename-btn {
            background: transparent;
            border: 1px solid var(--border);
            color: var(--text-muted);
            cursor: pointer;
            padding: 4px 8px;
            font-size: 14px;
            opacity: 0.7;
            transition: all 0.2s;
            border-radius: 8px;
        }
        .rename-btn:hover {
            opacity: 1;
            color: var(--text-main);
            background: var(--bg-hover);
            border-color: var(--text-muted);
        }
        .catalog-name {
            flex: 1;
            font-weight: 500;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .catalog-name-text {
            cursor: default;
        }
        .catalog-name-input {
            background: rgba(0,0,0,0.4);
            border: 1px solid var(--accent);
            border-radius: 6px;
            padding: 4px 8px;
            color: var(--text-main);
            font-size: 13px;
            font-weight: 500;
            width: 100%;
            max-width: 200px;
            font-family: var(--font-main);
        }
        .catalog-name-input:focus {
            outline: none;
            box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.3);
        }

    </style>
</head>
<body>
    <script>const currentConfig = ${safeConfig};</script>
    
    <div class="layout" id="appLayout">
        <!-- Step Indicator -->
        <div class="step-indicator">
            <div class="step-dot active" data-step="1"></div>
            <div class="step-dot" data-step="2"></div>
            <div class="step-dot" data-step="3"></div>
            <div class="step-dot" data-step="4"></div>
        </div>
        
        <aside class="sidebar">
            <div class="brand">
                <div class="brand-logo">🧠</div>
                <div class="brand-name">Cinemind</div>
            </div>

            <nav class="nav">
                <div class="nav-item active" id="nav-sec-auth" onclick="scrollToSection('sec-auth')">
                    <span class="nav-num">01</span> <span>Connection</span>
                </div>
                <div class="nav-item" id="nav-sec-pref" onclick="scrollToSection('sec-pref')">
                    <span class="nav-num">02</span> <span>Preferences</span>
                </div>
                <div class="nav-item" id="nav-sec-cats" onclick="scrollToSection('sec-cats')">
                    <span class="nav-num">03</span> <span>Catalogs</span>
                </div>
                <div class="nav-item" id="nav-sec-fine" onclick="scrollToSection('sec-fine')">
                    <span class="nav-num">04</span> <span>Fine Tuning</span>
                </div>
            </nav>

            <div class="status-panel">
                <div class="stat-group">
                    <h4>System</h4>
                    <div class="stat-row"><span>Status</span><div class="stat-val" id="statusIndicator"><span class="status-dot"></span><span id="txtStatus">Not Linked</span></div></div>
                    <div class="stat-row"><span>Source</span><span class="stat-val" id="sumLibrarySource">Stremio</span></div>
                    <div class="stat-row"><span>Engine</span><span class="stat-val" id="sumEngine">TMDB</span></div>
                    <div class="stat-row" id="rowAnimeEngine" style="display:none"><span>Anime</span><span class="stat-val" id="sumAnimeEngine">AniList</span></div>
                    <div class="stat-row"><span>Language</span><span class="stat-val" id="sumLang">English</span></div>
                </div>
                
                <div class="stat-group">
                    <h4>Filters</h4>
                    <div class="stat-row"><span>Eras</span><span class="stat-val" id="sumEras">All</span></div>
                    <div class="stat-row"><span>Watched</span><span class="stat-val" id="sumHideWatched">Show</span></div>
                    <div class="stat-row"><span>Auto-Fill</span><span class="stat-val" id="sumFillGaps" style="color:#555">OFF</span></div>
                    <div class="stat-row"><span>Min Rating</span><span class="stat-val" id="sumRating">None</span></div>
                </div>

                <div class="stat-group">
                    <div class="stat-row"><span>Catalogs</span><span class="stat-val" id="sumCats">0</span></div>
                    <div class="stat-row"><span>Sort</span><span class="stat-val" id="sumSort">Rand</span></div>
                    <div class="stat-row"><span>RPDB</span><span class="stat-val" id="sumRPDB" style="color:#555">OFF</span></div>
                </div>
                
                <!-- Config Import/Export -->
                <div class="config-io" style="display:flex; gap:8px; margin-top:16px;">
                    <button class="btn-secondary" onclick="exportConfig()" title="Export settings" style="flex:1; font-size:12px; padding:8px 12px; justify-content:center;">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        Export
                    </button>
                    <button class="btn-secondary" onclick="document.getElementById('importFile').click()" title="Import settings" style="flex:1; font-size:12px; padding:8px 12px; justify-content:center;">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                        Import
                    </button>
                    <input type="file" id="importFile" accept=".json" style="display:none" onchange="importConfig(event)">
                </div>
            </div>
        </aside>

        <main class="content" id="configForm">
            <div class="container">
                
                <!-- Auth -->
                <section class="section animate-in delay-1" id="sec-auth">
                    <div class="section-header">
                        <div class="section-number">01</div>
                        <div class="section-title">Connection</div>
                    </div>
                    <div class="glass-card">
                        <div class="form-group">
                            <label class="label">
                                Library Source
                                <div class="tooltip-container"><span class="tooltip-icon">?</span>
                                    <div class="tooltip-content"><span class="tooltip-header">Library Sources</span>
                                    <b>Stremio:</b> Uses your Stremio watch history and library.<br><br>
                                    <b>MDBlist:</b> Uses your MDBlist scrobble history with full progress tracking.
                                    </div>
                                </div>
                            </label>
                            <div class="tabs" id="librarySourceTabs">
                                <div class="tab active" onclick="switchLibrarySource('stremio')">Stremio</div>
                                <div class="tab" onclick="switchLibrarySource('mdblist')">MDBlist</div>
                            </div>
                        </div>
                        
                        <!-- Stremio Auth Section -->
                        <div id="stremio-auth">
                            <div class="tabs" id="stremioAuthTabs">
                                <div class="tab active" onclick="switchAuth('manual')">Auth Key</div>
                                <div class="tab" onclick="switchAuth('login')">Stremio Login</div>
                            </div>
                            
                            <div id="auth-manual">
                                <div class="form-group">
                                    <label class="label">Stremio AuthKey</label>
                                    <div style="display:flex; gap:12px;">
                                        <input type="password" id="authKey" class="input" placeholder="Paste your key here...">
                                        <button class="btn-text" onclick="toggleAuthVisibility()">Show</button>
                                        <button id="checkAuthBtn" class="btn-text">Check</button>
                                    </div>
                                    <div id="authMsg" class="msg"></div>
                                </div>
                            </div>

                            <div id="auth-login" style="display:none">
                                <div class="grid-2">
                                    <div class="form-group"><label class="label">Email</label><input type="email" id="stremioEmail" class="input"></div>
                                    <div class="form-group"><label class="label">Password</label><input type="password" id="stremioPass" class="input"></div>
                                </div>
                                <button id="loginBtn" class="btn-primary" style="margin-top:10px">Sign In</button>
                                <div id="loginMsg" class="msg" style="text-align:center"></div>
                            </div>
                        </div>
                        
                        <!-- MDBlist Auth Section -->
                        <div id="mdblist-auth" style="display:none">
                            <div class="form-group">
                                <label class="label">MDBlist API Key</label>
                                <div style="display:flex; gap:12px;">
                                    <input type="password" id="mdblistApiKey" class="input" placeholder="Paste your MDBlist API key...">
                                    <button class="btn-text" onclick="toggleMdblistVisibility()">Show</button>
                                    <button id="checkMdblistBtn" class="btn-text">Check</button>
                                </div>
                                <div id="mdblistMsg" class="msg"></div>
                                <small style="color:var(--text-muted); margin-top:8px; display:block;">Get your API key from <a href="https://mdblist.com/preferences/" target="_blank" style="color:#818cf8;">MDBlist Preferences</a></small>
                            </div>
                        </div>
                    </div>
                    <input type="hidden" id="librarySource" value="stremio">
                </section>

                <!-- Prefs -->
                <section class="section animate-in delay-2" id="sec-pref">
                     <div class="section-header">
                        <div class="section-number">02</div>
                        <div class="section-title">Preferences</div>
                    </div>
                    <div class="glass-card">
                        <div class="grid-2">
                            <div class="form-group">
                                <label class="label">
                                    Recommendation Source
                                    <div class="tooltip-container"><span class="tooltip-icon">?</span>
                                        <div class="tooltip-content"><span class="tooltip-header">Sources</span>
                                        <b>TMDB:</b> Content-based matches (similar plots/genres).<br><br>
                                        <b>Trakt:</b> Social recommendations (user trends).<br><br>
                                        <b>Hybrid:</b> Combines both for variety.
                                        </div>
                                    </div>
                                </label>
                                <div class="select-wrapper">
                                    <select id="recEngine" class="select" onchange="updateTraktFieldVisibility(); updateSummary();"><option value="tmdb">TMDB</option><option value="trakt">Trakt</option><option value="both">Hybrid</option></select>
                                    <div class="select-arrow">▼</div>
                                </div>
                            </div>
                            <div class="form-group">
                                <label class="label">Anime Recommendation Source</label>
                                <div class="select-wrapper">
                                    <select id="animeEngine" class="select"><option value="anilist">AniList</option></select>
                                    <div class="select-arrow">▼</div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Trakt Client ID (conditional) -->
                        <div id="traktClientIdSection" class="form-group" style="display:none;">
                            <label class="label">
                                Trakt Client ID (Required for Trakt)
                                <div class="tooltip-container"><span class="tooltip-icon">?</span>
                                    <div class="tooltip-content" style="width:320px;"><span class="tooltip-header">How to Get Your Trakt Client ID</span>
                                    1. Go to <b>trakt.tv/oauth/applications</b><br>
                                    2. Click <b>"New Application"</b><br>
                                    3. Fill in the fields:<br>
                                    &nbsp;&nbsp;• <b>Name:</b> Cinemind (or any name)<br>
                                    &nbsp;&nbsp;• <b>Description:</b> Stremio Recommendations<br>
                                    &nbsp;&nbsp;• <b>Redirect URI:</b> urn:ietf:wg:oauth:2.0:oob<br>
                                    4. Click <b>"Save App"</b><br>
                                    5. Copy your <b>Client ID</b> (not the secret!)
                                    </div>
                                </div>
                            </label>
                            <div style="display:flex; gap:12px;">
                                <input type="password" id="traktClientId" class="input" placeholder="Your Trakt Client ID">
                                <button class="btn-text" onclick="toggleTraktVisibility()">Show</button>
                                <button class="btn-text" id="checkTraktBtn">Check</button>
                            </div>
                            <div id="traktMsg" class="msg"></div>
                            <div class="msg" style="margin-top:12px; color:var(--accent-text); background:rgba(99,102,241,0.08); border:1px solid rgba(99,102,241,0.15); padding:12px; border-radius:8px;">
                                <b>📋 Quick Setup:</b><br>
                                1. Visit <a href="https://trakt.tv/oauth/applications" target="_blank" style="color:#818cf8;">trakt.tv/oauth/applications</a><br>
                                2. Create a new application with any name<br>
                                3. Set Redirect URI to: <code style="background:rgba(0,0,0,0.3); padding:2px 6px; border-radius:4px;">urn:ietf:wg:oauth:2.0:oob</code><br>
                                4. Copy the <b>Client ID</b> (64-character code)
                            </div>
                        </div>
                        
                        <div class="grid-2">
                            <div class="form-group">
                                 <label class="label">
                                    Algorithm Mode
                                    <div class="tooltip-container"><span class="tooltip-icon">?</span>
                                        <div class="tooltip-content"><span class="tooltip-header">Algorithms</span>
                                        <b>Adaptive:</b> Analyzes your watch history to find similar content you'll like.<br><br>
                                        <b>Discovery:</b> Selects random items from your library to seed fresh recommendations.
                                        </div>
                                    </div>
                                 </label>
                                 <div class="select-wrapper">
                                     <select id="inputMode" class="select"><option value="recent">Adaptive</option><option value="random">Discovery</option></select>
                                     <div class="select-arrow">▼</div>
                                 </div>
                            </div>
                            <div class="form-group">
                                 <label class="label">Language</label>
                                 <div class="select-wrapper">
                                     <select id="language" class="select">
                                        <option value="any">Global (Any)</option><option value="en" selected>English</option><option value="es">Spanish</option><option value="fr">French</option><option value="de">German</option><option value="it">Italian</option><option value="pt">Portuguese</option><option value="ru">Russian</option><option value="ja">Japanese</option><option value="ko">Korean</option><option value="zh">Chinese</option><option value="hi">Hindi</option>
                                     </select>
                                     <div class="select-arrow">▼</div>
                                 </div>
                            </div>
                        </div>

                        <div class="form-group">
                            <label class="label">Eras</label>
                            <div class="chips" id="eraContainer">
                                <div class="chip" onclick="toggleChip(this, event)"><span class="chip-dot"></span>Modern (2010+) <input type="checkbox" value="modern"></div>
                                <div class="chip" onclick="toggleChip(this, event)"><span class="chip-dot"></span>2000s <input type="checkbox" value="2000s"></div>
                                <div class="chip" onclick="toggleChip(this, event)"><span class="chip-dot"></span>90s <input type="checkbox" value="90s"></div>
                                <div class="chip" onclick="toggleChip(this, event)"><span class="chip-dot"></span>Classics <input type="checkbox" value="classic"></div>
                            </div>
                        </div>

                         <div class="form-group">
                             <label class="label">TMDB API Key (Required)</label>
                             <div style="display:flex; gap:12px;">
                                 <input type="password" id="tmdbApiKey" class="input" placeholder="Your TMDB API Key">
                                 <button class="btn-text" id="showTmdbBtn" onclick="toggleTmdbVisibility()">Show</button>
                                 <button class="btn-text" id="checkTmdbBtn">Check</button>
                             </div>
                             <div id="tmdbMsg" class="msg"></div>
                             <small style="color:var(--text-muted); margin-top:8px; display:block;">Get a free API key from <a href="https://www.themoviedb.org/settings/api" target="_blank" style="color:#818cf8;">TMDB Settings</a></small>
                         </div>

                         <div class="form-group">
                             <label class="label">RPDB Key (Optional)</label>
                             <input type="text" id="rpdbKey" class="input" placeholder="Enable rated posters...">
                         </div>
                    </div>
                </section>

                <!-- Catalogs -->
                <section class="section animate-in delay-3" id="sec-cats">
                    <div class="section-header">
                        <div class="section-number">03</div>
                        <div class="section-title">Catalogs</div>
                    </div>
                    <div class="glass-card">
                        <div class="sort-list" id="catalogList">
                             <div class="sort-item" draggable="true" data-id="std_mov" onclick="toggleCheck(this)">
                                 <span class="handle">⋮⋮</span>
                                 <div class="checkbox-modern checked"><svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg></div>
                                 <span style="flex:1; font-weight:500;">Recommended Movies</span>
                                 <input type="checkbox" checked style="display:none">
                             </div>
                             <div class="sort-item" draggable="true" data-id="std_ser" onclick="toggleCheck(this)">
                                 <span class="handle">⋮⋮</span>
                                 <div class="checkbox-modern checked"><svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg></div>
                                 <span style="flex:1; font-weight:500;">Recommended Series</span>
                                 <input type="checkbox" checked style="display:none">
                             </div>
                             <div class="sort-item" draggable="true" data-id="ani_mov" onclick="toggleCheck(this)">
                                 <span class="handle">⋮⋮</span>
                                 <div class="checkbox-modern"><svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg></div>
                                 <span style="flex:1; font-weight:500;">Anime Movies</span>
                                 <input type="checkbox" style="display:none">
                             </div>
                             <div class="sort-item" draggable="true" data-id="ani_ser" onclick="toggleCheck(this)">
                                 <span class="handle">⋮⋮</span>
                                 <div class="checkbox-modern"><svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg></div>
                                 <span style="flex:1; font-weight:500;">Anime Series</span>
                                 <input type="checkbox" style="display:none">
                             </div>
                              <div class="sort-item" draggable="true" data-id="crew_mov" onclick="toggleCheck(this)">
                                 <span class="handle">⋮⋮</span>
                                 <div class="checkbox-modern"><svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg></div>
                                 <span style="flex:1; font-weight:500;">Cast & Crew (Movies)</span>
                                 <input type="checkbox" style="display:none">
                             </div>
                             <div class="sort-item" draggable="true" data-id="crew_ser" onclick="toggleCheck(this)">
                                 <span class="handle">⋮⋮</span>
                                 <div class="checkbox-modern"><svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg></div>
                                 <span style="flex:1; font-weight:500;">Cast & Crew (Series)</span>
                                 <input type="checkbox" style="display:none">
                             </div>
                        </div>
                    </div>
                </section>

                <!-- Fine Tuning -->
                <section class="section animate-in delay-4" id="sec-fine">
                    <div class="section-header">
                        <div class="section-number">04</div>
                        <div class="section-title">Fine Tuning</div>
                    </div>
                     <div class="glass-card">
                         <div class="grid-2">
                            <div class="form-group">
                                <label class="label">Min Rating</label>
                                <div class="select-wrapper">
                                    <select id="minRating" class="select"><option value="0">No Minimum</option><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5</option><option value="6">6</option><option value="7">7</option><option value="8">8</option><option value="9">9</option></select>
                                    <div class="select-arrow">▼</div>
                                </div>
                            </div>
                            <div class="form-group">
                                <label class="label">History Sample Size</label>
                                <div class="select-wrapper">
                                    <select id="sourceCount" class="select"><option value="5">5 items</option><option value="10">10 items</option><option value="25" selected>25 items</option><option value="50">50 items</option></select>
                                    <div class="select-arrow">▼</div>
                                </div>
                            </div>
                        </div>

                        <div class="grid-2">
                             <div class="row-switch" onclick="document.getElementById('hideWatched').click()">
                                <div><b style="font-size:13px;">Hide Watched</b><br><small style="color:var(--text-muted)">Remove items you've seen</small></div>
                                <label><input type="checkbox" id="hideWatched" class="switch-input"><div class="switch-base"><div class="switch-knob"></div></div></label>
                            </div>
                            <div class="row-switch" onclick="document.getElementById('fillGaps').click()">
                                <div><b style="font-size:13px;">Auto-Fill Gaps</b><br><small style="color:var(--text-muted)">Auto-fill empty slots with trending items</small></div>
                                <label><input type="checkbox" id="fillGaps" class="switch-input"><div class="switch-base"><div class="switch-knob"></div></div></label>
                            </div>
                            <div class="row-switch" id="rowAnimeFill" style="display:none" onclick="document.getElementById('animeFillGaps').click()">
                                <div><b style="font-size:13px;">Anime Auto-Fill</b><br><small style="color:var(--text-muted)">Auto-fill empty slots with trending anime</small></div>
                                <label><input type="checkbox" id="animeFillGaps" class="switch-input"><div class="switch-base"><div class="switch-knob"></div></div></label>
                            </div>
                        </div>
                        
                        <div style="margin-top:40px; border-top:1px solid var(--border); padding-top:24px;">
                            <label class="label">ID Mapping</label>
                            <div class="grid-3">
                                <div class="form-group">
                                    <label class="label-sm" style="font-size:12px; color:var(--text-muted); margin-bottom:6px; display:block;">Movies</label>
                                    <div class="select-wrapper"><select id="movieIdType" class="select"><option value="tmdb">TMDB</option><option value="imdb">IMDB</option></select><div class="select-arrow">▼</div></div>
                                </div>
                                <div class="form-group">
                                    <label class="label-sm" style="font-size:12px; color:var(--text-muted); margin-bottom:6px; display:block;">Series</label>
                                    <div class="select-wrapper"><select id="seriesIdType" class="select"><option value="tvdb">TVDB</option><option value="tmdb">TMDB</option><option value="imdb">IMDB</option></select><div class="select-arrow">▼</div></div>
                                </div>
                                <div class="form-group">
                                    <label class="label-sm" style="font-size:12px; color:var(--text-muted); margin-bottom:6px; display:block;">Anime</label>
                                    <div class="select-wrapper"><select id="animeIdType" class="select"><option value="kitsu">Kitsu</option><option value="mal">MAL</option><option value="tmdb">TMDB</option><option value="imdb">IMDB</option></select><div class="select-arrow">▼</div></div>
                                </div>
                            </div>
                            <div id="outputInfoBox" class="msg" style="margin-top:16px; color:var(--accent-text); background:rgba(99,102,241,0.05); border:1px solid rgba(99,102,241,0.1);"></div>
                            <div style="margin-top:16px;">
                                <label class="label-sm" style="font-size:12px; color:var(--text-muted); margin-bottom:6px; display:block;">Sort Order</label>
                                <div class="select-wrapper"><select id="sortOrder" class="select"><option value="random">Randomized</option><option value="rating_desc">Highest Rated</option><option value="date_desc">Newest</option><option value="popularity_desc">Trending</option></select><div class="select-arrow">▼</div></div>
                            </div>
                        </div>
                        
                        <div style="margin-top:40px; border-top:1px solid var(--border); padding-top:24px;">
                            <label class="label">
                                Password Protection (Required)
                                <div class="tooltip-container"><span class="tooltip-icon">?</span>
                                    <div class="tooltip-content"><span class="tooltip-header">Zero-Knowledge Security</span>
                                    Protect your API keys with a password. Your password is <b>never stored</b> - it's used only to encrypt your keys.<br><br>
                                    <b>Requirements:</b><br>
                                    • 8+ characters<br>
                                    • 1 uppercase letter<br>
                                    • 1 lowercase letter<br>
                                    • 1 number<br><br>
                                    <b>⚠ Warning:</b> If you forget your password, you'll need to create a new configuration.
                                    </div>
                                </div>
                            </label>
                            <div class="grid-2">
                                <div class="form-group">
                                    <label class="label-sm" style="font-size:12px; color:var(--text-muted); margin-bottom:6px; display:block;">Password</label>
                                    <div style="display:flex; gap:8px;">
                                        <input type="password" id="configPassword" class="input" placeholder="Enter a secure password..." required>
                                        <button class="btn-text" onclick="togglePasswordVisibility()">Show</button>
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label class="label-sm" style="font-size:12px; color:var(--text-muted); margin-bottom:6px; display:block;">Confirm Password</label>
                                    <input type="password" id="configPasswordConfirm" class="input" placeholder="Retype password..." required>
                                </div>
                            </div>
                            <div id="passwordMsg" class="msg" style="margin-top:12px;"></div>
                        </div>
                        
                         <div id="reinstallNotice" class="msg error" style="text-align:center;">⚠ NOTE: You must reinstall the addon for these changes to take effect in Stremio.</div>
                    </div>
                </section>
                
                <button id="generateBtn" class="btn-primary">Generate Addon</button>
            </div>
        </main>
        
        <div id="installScreen">
             <!-- Aurora background blobs -->
             <div class="install-blob install-blob-1"></div>
             <div class="install-blob install-blob-2"></div>
             <div class="install-blob install-blob-3"></div>
             
             <!-- Confetti container -->
             <div id="confettiContainer"></div>
             
             <div class="container animate-in" style="max-width:600px; padding-top:0; position:relative; z-index:10;">
                 <div class="success-icon">✓</div>
                 <h1 class="gradient-title" style="margin-bottom:10px; font-size:32px;">Ready to Install</h1>
                 <p style="color:var(--text-muted); margin-bottom:30px;">Your configuration is secure and ready.</p>
                 
                 <a id="installBtn" href="#" class="btn-primary" style="text-decoration:none; display:block;">Install in Stremio</a>
                 
                 <div class="code-block code-block-glow" id="urlDisplay" style="margin:24px 0; word-break:break-all;"></div>
                 
                 <button id="copyUrlBtn" class="btn-secondary btn-copy" onclick="copyManifestUrl()" style="margin-bottom:30px;">
                     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                         <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                         <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                     </svg>
                     <span id="copyBtnText">Copy URL</span>
                 </button>
                 
                 <div style="display:flex; gap:12px; justify-content:center; flex-wrap:wrap;">
                     <button class="btn-secondary" onclick="editConfig()">✏️ Edit Config</button>
                     <button class="btn-secondary" onclick="window.location.reload()">➕ Create New</button>
                 </div>
             </div>
        </div>
        
        <div id="passwordModal" style="display:none; position:fixed; inset:0; z-index:2000; align-items:center; justify-content:center;">
             <div class="glass-card" style="width:100%; max-width:400px; padding:32px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);">
                 <div style="text-align:center; margin-bottom:24px;">
                     <div style="font-size:40px; margin-bottom:16px;">🔒</div>
                     <h2 style="margin:0 0 8px 0;">Protected Config</h2>
                     <p style="color:var(--text-muted); margin:0;">Enter your password to unlock and edit.</p>
                 </div>
                 
                 <div class="form-group">
                     <input type="password" id="unlockPassword" class="input" placeholder="Enter password..." autofocus>
                 </div>
                 
                 <button id="unlockBtn" class="btn-primary" onclick="unlockConfig()" style="width:100%;">Unlock</button>
                 <div id="unlockMsg" class="msg" style="text-align:center; margin-top:12px;"></div>
                 
                 <div style="text-align:center; margin-top:24px;">
                     <button class="btn-text" onclick="window.location.href='/'">Cancel</button>
                 </div>
             </div>
        </div>
        
        <!-- Genre Exclusion Modal -->
        <div id="catalogSettingsModal" style="display:none; position:fixed; inset:0; z-index:2010; align-items:center; justify-content:center; background:rgba(0,0,0,0.85);">
             <div class="glass-card" style="width:100%; max-width:500px; padding:24px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); max-height:85vh; display:flex; flex-direction:column;">
                 <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
                     <h2 style="margin:0;">Catalog Settings</h2>
                     <button class="btn-text" onclick="closeCatalogSettings()">✕</button>
                 </div>
                 
                 <p style="color:var(--text-muted); margin-bottom:16px;" id="catalogSettingsTitle">Manage exclusions for this catalog.</p>
                 
                 <div class="form-group">
                     <label class="label-sm">Excluded Genres</label>
                     <p style="font-size:12px; color:var(--text-muted); margin-top:4px;">Checked genres won't appear in this catalog's recommendations. They'll still be available as separate genre filters in Stremio.</p>
                     
                     <div id="genreList" style="display:grid; grid-template-columns: 1fr 1fr; gap:8px; max-height:300px; overflow-y:auto; padding:8px; border:1px solid rgba(255,255,255,0.1); border-radius:8px;">
                        <!-- Genres injected here -->
                     </div>
                 </div>
                 
                 <div style="margin-top:auto; padding-top:16px; display:flex; gap:12px; justify-content:flex-end;">
                     <button class="btn-text" onclick="closeCatalogSettings()">Cancel</button>
                     <button class="btn-primary" onclick="saveCatalogSettings()">Save Changes</button>
                 </div>
             </div>
        </div>
    </div>

    <script>
        ${genresScript}
        // --- Nav Spy & Smooth Scroll ---
        const content = document.querySelector('.content');
        const stepDots = document.querySelectorAll('.step-dot');
        
        // Step indicator update
        function updateProgress(sectionIndex) {
            stepDots.forEach((dot, i) => {
                dot.classList.remove('active', 'completed');
                if (i < sectionIndex) dot.classList.add('completed');
                else if (i === sectionIndex) dot.classList.add('active');
            });
        }
        
        function onScroll() {
            const scrollPos = content.scrollTop;
            const scrollHeight = content.scrollHeight;
            const offsetHeight = content.offsetHeight;
            
            if (scrollPos + offsetHeight >= scrollHeight - 50) {
                 setActiveNav('sec-fine');
                 updateProgress(3);
                 return;
            }

            const sections = ['sec-fine', 'sec-cats', 'sec-pref', 'sec-auth'];
            const sectionIndices = { 'sec-auth': 0, 'sec-pref': 1, 'sec-cats': 2, 'sec-fine': 3 };
            for (const id of sections) {
                const el = document.getElementById(id);
                if (el && el.offsetTop - 300 <= scrollPos) {
                    setActiveNav(id);
                    updateProgress(sectionIndices[id]);
                    return;
                }
            }
        }
        function setActiveNav(id) {
            document.querySelectorAll('.nav-item').forEach(n => {
                n.classList.remove('active');
                if(n.id === 'nav-' + id) n.classList.add('active');
            });
        }
        content.addEventListener('scroll', onScroll);
        
        // Confetti effect for install screen
        function createConfetti() {
            const container = document.getElementById('confettiContainer');
            if (!container) return;
            
            const colors = ['#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];
            
            for (let i = 0; i < 50; i++) {
                const confetti = document.createElement('div');
                confetti.className = 'confetti';
                confetti.style.left = Math.random() * 100 + '%';
                confetti.style.top = '-10px';
                confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
                confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
                confetti.style.animationDelay = (Math.random() * 2) + 's';
                confetti.style.animationDuration = (2 + Math.random() * 2) + 's';
                container.appendChild(confetti);
                
                setTimeout(() => confetti.classList.add('active'), 100);
            }
        }
        
        function scrollToSection(id) {
             const el = document.getElementById(id);
             if(el) {
                 content.scrollTo({ top: el.offsetTop - 40, behavior: 'smooth' });
             }
        }

        // --- Logic ---
        function toggleChip(el, e) {
            if(e) e.preventDefault();
            const cb = el.querySelector('input');
            cb.checked = !cb.checked;
            if(cb.checked) el.classList.add('active'); else el.classList.remove('active');
            updateSummary();
        }
        
        function toggleCheck(el) {
             const cb = el.querySelector('input');
             cb.checked = !cb.checked;
             const viz = el.querySelector('.checkbox-modern');
             if(cb.checked) viz.classList.add('checked'); else viz.classList.remove('checked');
             updateSummary();
        }

        function switchAuth(method) {
            const tabs = document.querySelectorAll('#stremioAuthTabs .tab');
            tabs.forEach(t => t.classList.remove('active'));
            if(method === 'manual') {
                tabs[0].classList.add('active');
                document.getElementById('auth-manual').style.display = 'block';
                document.getElementById('auth-login').style.display = 'none';
            } else {
                tabs[1].classList.add('active');
                document.getElementById('auth-manual').style.display = 'none';
                document.getElementById('auth-login').style.display = 'block';
            }
        }
        
        function switchLibrarySource(source) {
            const tabs = document.querySelectorAll('#librarySourceTabs .tab');
            tabs.forEach(t => t.classList.remove('active'));
            
            document.getElementById('librarySource').value = source;
            
            if(source === 'stremio') {
                tabs[0].classList.add('active');
                document.getElementById('stremio-auth').style.display = 'block';
                document.getElementById('mdblist-auth').style.display = 'none';
            } else {
                tabs[1].classList.add('active');
                document.getElementById('stremio-auth').style.display = 'none';
                document.getElementById('mdblist-auth').style.display = 'block';
            }
            updateSummary();
        }
        
        function toggleAuthVisibility() {
            const i = document.getElementById('authKey');
            const btn = document.querySelector('#auth-manual .btn-text');
            if(i.type === 'password') {
                i.type = 'text';
                btn.textContent = 'Hide';
            } else {
                i.type = 'password';
                btn.textContent = 'Show';
            }
        }
        
        function toggleMdblistVisibility() {
            const i = document.getElementById('mdblistApiKey');
            const btn = document.querySelector('#mdblist-auth .btn-text');
            if(i.type === 'password') {
                i.type = 'text';
                btn.textContent = 'Hide';
            } else {
                i.type = 'password';
                btn.textContent = 'Show';
            }
        }
        
        function updateSidebar(connected) {
             const ind = document.getElementById('statusIndicator');
             const txt = document.getElementById('txtStatus');
             if(connected) {
                 ind.classList.add('connected');
                 txt.textContent = 'Connected';
             } else {
                 ind.classList.remove('connected');
                 txt.textContent = 'Not Linked';
             }
        }

        function updateOutputInfo() {
             const m = document.getElementById('movieIdType').value;
             const s = document.getElementById('seriesIdType').value;
             const a = document.getElementById('animeIdType').value;
             const msgs = [];
             const aio = ' OR <a href="https://aiometadata.12312023.xyz/" target="_blank">AIOMetadata</a>';

             if (m === 'tmdb') msgs.push('<b>Movie:</b> Requires <a href="https://94c8cb9f702d-tmdb-addon.baby-beamup.club/configure" target="_blank">TMDB</a>' + aio);
             if (s === 'tmdb') msgs.push('<b>Series:</b> Requires <a href="https://94c8cb9f702d-tmdb-addon.baby-beamup.club/configure" target="_blank">TMDB</a>' + aio);
             if (s === 'tvdb') msgs.push('<b>Series (TVDB):</b> Requires <a href="https://debridio.com/addons/tvdb" target="_blank">Debridio</a>' + aio);
             if (a === 'kitsu' || a === 'mal') msgs.push('<b>Anime:</b> Requires <a href="https://anime-kitsu.strem.fun" target="_blank">Kitsu</a>' + aio);
             if (a === 'tmdb') msgs.push('<b>Anime:</b> Requires <a href="https://94c8cb9f702d-tmdb-addon.baby-beamup.club/configure" target="_blank">TMDB</a>' + aio);
             
             const box = document.getElementById('outputInfoBox');
             if(msgs.length) { box.innerHTML = msgs.join('<br>'); box.classList.add('show'); }
             else box.classList.remove('show');
        }

        function updateSummary() {
             // Library Source
             const libSource = document.getElementById('librarySource').value;
             document.getElementById('sumLibrarySource').textContent = libSource === 'mdblist' ? 'MDBlist' : 'Stremio';
             
             // Engine
             const rec = document.getElementById('recEngine').value;
             let eTxt = rec === 'both' ? 'Hybrid' : (rec === 'trakt' ? 'Trakt' : 'TMDB');
             document.getElementById('sumEngine').textContent = eTxt;
             
             // Anime Engine
             const ani = document.getElementById('animeEngine').value;
             const aniTxt = ani === 'anilist' ? 'AniList' : 'TMDB';
             document.getElementById('sumAnimeEngine').textContent = aniTxt;
             // Show only if needed
             const shouldShowAnime = (rec !== 'tmdb') || (ani !== 'tmdb');
             document.getElementById('rowAnimeEngine').style.display = shouldShowAnime ? 'flex' : 'none';

             // Lang
             const lng = document.getElementById('language');
             document.getElementById('sumLang').textContent = lng.options[lng.selectedIndex].text.split('(')[0].trim();
             
             // Eras
             const eras = [];
             document.querySelectorAll('#eraContainer input:checked').forEach(c => {
                 eras.push(c.parentElement.textContent.trim());
             });
             document.getElementById('sumEras').textContent = eras.length ? 'Selected ('+eras.length+')' : 'None';
             
             // Watched
             document.getElementById('sumHideWatched').textContent = document.getElementById('hideWatched').checked ? 'Hidden' : 'Shown';
             
             // Auto-Fill
             const fill = document.getElementById('fillGaps').checked;
             const fillEl = document.getElementById('sumFillGaps');
             fillEl.textContent = fill ? 'ON' : 'OFF';
             fillEl.style.color = fill ? '#10b981' : '#555';

             // Rating
             const r = document.getElementById('minRating').value;
             document.getElementById('sumRating').textContent = r === '0' ? 'None' : r + '+';
             
             // Cats
             let cats = 0;
             let hasAnime = false;
             document.querySelectorAll('#catalogList input:checked').forEach(cb => {
                 cats++;
                 const catId = cb.closest('.sort-item').getAttribute('data-id');
                 if(catId === 'ani_mov' || catId === 'ani_ser') hasAnime = true;
             });
             document.getElementById('sumCats').textContent = cats;

             // Anime Auto-Fill Visibility
             const afRow = document.getElementById('rowAnimeFill');
             if(hasAnime) {
                 afRow.style.display = 'flex';
             } else {
                 afRow.style.display = 'none';
             }
             
             // Sort
             const s = document.getElementById('sortOrder').value;
             let sTxt = 'Random';
             if(s === 'rating_desc') sTxt = 'Highest Rated';
             if(s === 'date_desc') sTxt = 'Newest';
             if(s === 'popularity_desc') sTxt = 'Trending';
             document.getElementById('sumSort').textContent = sTxt;
             
             // RPDB
             const rpdb = document.getElementById('rpdbKey').value.trim();
             const rpdbEl = document.getElementById('sumRPDB');
             if(rpdb) { rpdbEl.textContent = 'ON'; rpdbEl.style.color = '#10b981'; }
             else { rpdbEl.textContent = 'OFF'; rpdbEl.style.color = '#555'; }
             
             updateOutputInfo();
        }

        // --- Auth & API ---
        async function checkKey(key) {
             const msg = document.getElementById('authMsg');
             msg.textContent = 'Validating...'; msg.className = 'msg show';
             try {
                 const res = await fetch('/api/validate-user', { 
                    method: 'POST', headers: {'Content-Type': 'application/json'}, 
                    body: JSON.stringify({ authKey: key }) 
                });
                const d = await res.json();
                if(d.valid) {
                    msg.textContent = '✓ Verified'; msg.className = 'msg show success';
                    updateSidebar(true);
                    return true;
                }
                msg.textContent = 'Invalid Key'; msg.className = 'msg show error';
                updateSidebar(false);
                return false;
             } catch(e) {
                 msg.textContent = 'Error checking key'; msg.className = 'msg show error';
                 return false;
             }
        }
        
        document.getElementById('checkAuthBtn').onclick = async () => {
             checkKey(document.getElementById('authKey').value);
        };

        async function checkTmdbKey(key) {
            const msg = document.getElementById('tmdbMsg');
            msg.textContent = "Validating..."; msg.className = "msg show";
            try {
                const res = await fetch('/api/validate-tmdb', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({tmdbKey: key}) });
                const data = await res.json();
                if (data.valid) {
                    msg.textContent = '✓ Verified'; msg.className = 'msg show success';
                    return true;
                }
                msg.textContent = 'Invalid Key'; msg.className = 'msg show error';
                return false;
            } catch(e) {
                msg.textContent = 'Error checking key'; msg.className = 'msg show error';
                return false;
            }
        }

        document.getElementById('checkTmdbBtn').onclick = async () => {
             checkTmdbKey(document.getElementById('tmdbApiKey').value);
        };
        
        async function checkTraktKey(key) {
            const msg = document.getElementById('traktMsg');
            msg.textContent = "Validating..."; msg.className = "msg show";
            try {
                const res = await fetch('/api/validate-trakt', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({traktClientId: key}) });
                const data = await res.json();
                if (data.valid) {
                    msg.textContent = '✓ Verified'; msg.className = 'msg show success';
                    return true;
                }
                msg.textContent = data.error || 'Invalid Client ID'; msg.className = 'msg show error';
                return false;
            } catch(e) {
                msg.textContent = 'Error checking Client ID'; msg.className = 'msg show error';
                return false;
            }
        }

        document.getElementById('checkTraktBtn').onclick = async () => {
             checkTraktKey(document.getElementById('traktClientId').value);
        };
        
        async function checkMdblistKey(key) {
            const msg = document.getElementById('mdblistMsg');
            msg.textContent = "Validating..."; msg.className = "msg show";
            try {
                const res = await fetch('/api/validate-mdblist', { 
                    method: 'POST', 
                    headers: {'Content-Type': 'application/json'}, 
                    body: JSON.stringify({mdblistKey: key}) 
                });
                const data = await res.json();
                if (data.valid) {
                    msg.textContent = '✓ Verified' + (data.username ? ' (' + data.username + ')' : ''); 
                    msg.className = 'msg show success';
                    updateSidebar(true);
                    return true;
                }
                msg.textContent = data.error || 'Invalid Key'; msg.className = 'msg show error';
                updateSidebar(false);
                return false;
            } catch(e) {
                msg.textContent = 'Error checking key'; msg.className = 'msg show error';
                return false;
            }
        }

        document.getElementById('checkMdblistBtn').onclick = async () => {
             checkMdblistKey(document.getElementById('mdblistApiKey').value);
        };
        
        // Show/Hide Helpers
        window.toggleTmdbVisibility = () => {
             const input = document.getElementById('tmdbApiKey');
             const btn = document.getElementById('showTmdbBtn');
             if (input.type === 'password') { input.type = 'text'; btn.textContent = 'Hide'; }
             else { input.type = 'password'; btn.textContent = 'Show'; }
        };
        
        window.togglePasswordVisibility = () => {
             const input = document.getElementById('configPassword');
             const confirmInput = document.getElementById('configPasswordConfirm');
             const btn = event.target;
             if (input.type === 'password') { 
                 input.type = 'text'; 
                 confirmInput.type = 'text';
                 btn.textContent = 'Hide'; 
             } else { 
                 input.type = 'password'; 
                 confirmInput.type = 'password';
                 btn.textContent = 'Show'; 
             }
        };
        
        window.toggleTraktVisibility = () => {
             const input = document.getElementById('traktClientId');
             const btn = event.target;
             if (input.type === 'password') { input.type = 'text'; btn.textContent = 'Hide'; }
             else { input.type = 'password'; btn.textContent = 'Show'; }
        };
        
        window.updateTraktFieldVisibility = () => {
             const rec = document.getElementById('recEngine').value;
             const section = document.getElementById('traktClientIdSection');
             if (rec === 'trakt' || rec === 'both') {
                 section.style.display = 'block';
             } else {
                 section.style.display = 'none';
             }
        };

        document.getElementById('loginBtn').onclick = async () => {
             const email = document.getElementById('stremioEmail').value;
             const password = document.getElementById('stremioPass').value;
             const msg = document.getElementById('loginMsg');
             if(!email || !password) return;
             
             msg.textContent = "Connecting..."; msg.className = "msg show";
             try {
                 const res = await fetch('https://api.strem.io/api/login', { method: 'POST', body: JSON.stringify({email, password}) });
                 const data = await res.json();
                 if(data.result && data.result.authKey) {
                     document.getElementById('authKey').value = data.result.authKey;
                     switchAuth('manual');
                     msg.textContent = "";
                     document.getElementById('authMsg').textContent = "✓ Logged In";
                     document.getElementById('authMsg').className = "msg show success";
                     updateSidebar(true);
                 } else {
                     msg.textContent = "Login Failed"; msg.className = "msg show error";
                 }
             } catch(e) { msg.textContent = "Network Error"; msg.className = "msg show error"; }
        };
        
        // --- Drag (Desktop) ---
        const list = document.getElementById('catalogList');
        let dragged = null;
        list.addEventListener('dragstart', e => { dragged = e.target.closest('.sort-item'); dragged.classList.add('dragging'); });
        list.addEventListener('dragend', e => { e.target.classList.remove('dragging'); dragged = null; });
        list.addEventListener('dragover', e => {
             e.preventDefault();
             const siblings = [...list.querySelectorAll('.sort-item:not(.dragging)')];
             const next = siblings.find(sib => {
                 return e.clientY <= sib.getBoundingClientRect().top + sib.offsetHeight / 2;
             });
             list.insertBefore(dragged, next);
        });
        
        // --- Touch Drag (Mobile) ---
        let touchDragged = null;
        let touchStartY = 0;
        
        list.addEventListener('touchstart', e => {
            const item = e.target.closest('.sort-item');
            if (!item) return;
            touchDragged = item;
            touchStartY = e.touches[0].clientY;
            touchDragged.classList.add('dragging');
        }, { passive: true });
        
        list.addEventListener('touchmove', e => {
            if (!touchDragged) return;
            e.preventDefault();
            const touchY = e.touches[0].clientY;
            const siblings = [...list.querySelectorAll('.sort-item:not(.dragging)')];
            const next = siblings.find(sib => {
                return touchY <= sib.getBoundingClientRect().top + sib.offsetHeight / 2;
            });
            list.insertBefore(touchDragged, next);
        }, { passive: false });
        
        list.addEventListener('touchend', e => {
            if (touchDragged) {
                touchDragged.classList.remove('dragging');
                touchDragged = null;
            }
        });

        // --- Generate ---
        document.getElementById('generateBtn').onclick = async () => {
             const btn = document.getElementById('generateBtn');
             const librarySource = document.getElementById('librarySource').value;
             
             btn.disabled = true; btn.textContent = 'Validating...';
             
             // Validate based on library source
             if (librarySource === 'stremio') {
                 const key = document.getElementById('authKey').value.trim();
                 if(!key) { alert("Stremio AuthKey required"); btn.disabled = false; btn.textContent = btn.dataset.originalText || "Generate Addon"; return; }
                 if(!await checkKey(key)) { btn.disabled = false; btn.textContent = btn.dataset.originalText || "Generate Addon"; return; }
             } else if (librarySource === 'mdblist') {
                 const mdblistKey = document.getElementById('mdblistApiKey').value.trim();
                 if(!mdblistKey) { alert("MDBlist API Key required"); btn.disabled = false; btn.textContent = btn.dataset.originalText || "Generate Addon"; return; }
                 if(!await checkMdblistKey(mdblistKey)) { btn.disabled = false; btn.textContent = btn.dataset.originalText || "Generate Addon"; return; }
             }
             
             btn.textContent = "Processing...";

             const config = {
                 librarySource: librarySource,
                 authKey: document.getElementById('authKey').value.trim(),
                 mdblistApiKey: document.getElementById('mdblistApiKey').value.trim(),
                 movieIdType: document.getElementById('movieIdType').value,
                 seriesIdType: document.getElementById('seriesIdType').value,
                 animeIdType: document.getElementById('animeIdType').value,
                 inputMode: document.getElementById('inputMode').value,
                 minRating: document.getElementById('minRating').value,
                 sourceCount: document.getElementById('sourceCount').value,
                 sortOrder: document.getElementById('sortOrder').value,
                 language: document.getElementById('language').value,
                 hideWatched: document.getElementById('hideWatched').checked,
                 fillGaps: document.getElementById('fillGaps').checked,
                 animeFillGaps: document.getElementById('animeFillGaps').checked,
                 rpdbKey: document.getElementById('rpdbKey').value.trim(),
                 recEngine: document.getElementById('recEngine').value,
                 animeEngine: document.getElementById('animeEngine').value,
                 tmdbApiKey: document.getElementById('tmdbApiKey').value.trim(),
                 traktClientId: document.getElementById('traktClientId').value.trim()
             };

              if (!config.tmdbApiKey) { alert("TMDB API Key is required"); btn.disabled=false; btn.textContent = btn.dataset.originalText || "Generate Addon"; return; }
              
              // Trakt Client ID validation
              if ((config.recEngine === 'trakt' || config.recEngine === 'both') && !config.traktClientId) {
                  alert("Trakt Client ID is required when using Trakt or Hybrid recommendation engine");
                  btn.disabled = false;
                  btn.textContent = btn.dataset.originalText || "Generate Addon";
                  return;
              }
             
             // Password validation (REQUIRED)
             const password = document.getElementById('configPassword').value;
             const passwordConfirm = document.getElementById('configPasswordConfirm').value;
             const passwordMsg = document.getElementById('passwordMsg');
             
             if (!password) {
                 passwordMsg.textContent = 'Password is required to protect your API keys';
                 passwordMsg.className = 'msg show error';
                 btn.disabled = false;
                 btn.textContent = btn.dataset.originalText || "Generate Addon";
                 return;
             }
             
             // Validate password requirements
             const errors = [];
             if (password.length < 8) errors.push('8+ characters');
             if (!/[A-Z]/.test(password)) errors.push('1 uppercase letter');
             if (!/[a-z]/.test(password)) errors.push('1 lowercase letter');
             if (!/[0-9]/.test(password)) errors.push('1 number');
             
             if (errors.length > 0) {
                 passwordMsg.textContent = 'Password missing: ' + errors.join(', ');
                 passwordMsg.className = 'msg show error';
                 btn.disabled = false;
                 btn.textContent = btn.dataset.originalText || "Generate Addon";
                 return;
             }
             
             if (password !== passwordConfirm) {
                 passwordMsg.textContent = 'Passwords do not match';
                 passwordMsg.className = 'msg show error';
                 btn.disabled = false;
                 btn.textContent = btn.dataset.originalText || "Generate Addon";
                 return;
             }
             
             passwordMsg.textContent = '';
             passwordMsg.className = 'msg';
             config.configPassword = password;
             
             const cats = [];
             document.querySelectorAll('#catalogList .sort-item').forEach(i => {
                 const id = i.getAttribute('data-id');
                 if(i.querySelector('input').checked) {
                     const catObj = { id: id };
                     // Include exclusions if present
                     if (catalogExclusions[id] && catalogExclusions[id].length > 0) {
                         catObj.excludedGenres = catalogExclusions[id];
                     }
                     // Include custom name if present
                     if (catalogCustomNames[id]) {
                         catObj.customName = catalogCustomNames[id];
                     }
                     cats.push(catObj);
                 }
             });
             config.catalog_order = cats;
             
             const era = [];
             document.querySelectorAll('#eraContainer input:checked').forEach(i => era.push(i.value));
             config.era = era.join(',');

             try {
                const res = await fetch('/api/encrypt-config', {
                    method: 'POST', headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(config)
                });
                const data = await res.json();
                if(data.token) {
                    document.querySelector('.sidebar').style.display='none';
                    document.querySelector('.content').style.display='none';
                    // keep bg bubbles
                    document.getElementById('appLayout').style.display='block';
                    document.getElementById('installScreen').style.display='block';
                    
                    // Trigger confetti celebration
                    createConfetti();
                    
                    // Use path-based password for Stremio deep links (query params are stripped)
                    // Format: /:token/:password/manifest.json for protected, /:token/manifest.json for unprotected
                    let url, stremioUrl;
                    if (data.encryptedPassword) {
                        url = window.location.protocol + '//' + window.location.host + '/' + data.token + '/' + encodeURIComponent(data.encryptedPassword) + '/manifest.json';
                        stremioUrl = 'stremio://' + window.location.host + '/' + data.token + '/' + encodeURIComponent(data.encryptedPassword) + '/manifest.json';
                    } else {
                        url = window.location.protocol + '//' + window.location.host + '/' + data.token + '/manifest.json';
                        stremioUrl = 'stremio://' + window.location.host + '/' + data.token + '/manifest.json';
                    }
                    document.getElementById('urlDisplay').textContent = url;
                    document.getElementById('installBtn').href = stremioUrl;
                    
                    // Show password reminder if protected
                    if (data.passwordProtected) {
                        const reminderEl = document.createElement('p');
                        reminderEl.style.cssText = 'color:#10b981; margin-top:16px; font-size:13px;';
                        reminderEl.innerHTML = '🔒 <b>Password Protected</b> - Your password is encrypted in the URL using AES-256.';
                        document.getElementById('urlDisplay').after(reminderEl);
                    }
                } else { alert("Failed to generate token: " + (data.error || 'Unknown error')); }
             } catch(e) { alert('Network error'); }
             btn.disabled=false; btn.textContent = btn.dataset.originalText || "Generate Addon";
        };
        
        function editConfig() {
            document.getElementById('installScreen').style.display='none';
            document.querySelector('.sidebar').style.display='flex';
            document.querySelector('.content').style.display='block';
            document.getElementById('appLayout').style.display='grid';
            
            const btn = document.getElementById('generateBtn');
            btn.textContent = "Save Changes";
            btn.dataset.originalText = "Save Changes";
            document.getElementById('reinstallNotice').style.display='block';
            content.scrollTop = 0;
        }
        
        function copyManifestUrl() {
            const url = document.getElementById('urlDisplay').textContent;
            navigator.clipboard.writeText(url).then(() => {
                const btn = document.getElementById('copyUrlBtn');
                const text = document.getElementById('copyBtnText');
                btn.classList.add('copied');
                text.textContent = 'Copied!';
                setTimeout(() => {
                    btn.classList.remove('copied');
                    text.textContent = 'Copy URL';
                }, 2000);
            });
        }
        
        function showToast(message, isError = false) {
            let toast = document.getElementById('configToast');
            if (!toast) {
                toast = document.createElement('div');
                toast.id = 'configToast';
                toast.className = 'toast';
                document.body.appendChild(toast);
            }
            toast.textContent = message;
            toast.classList.toggle('error', isError);
            toast.classList.add('show');
            setTimeout(() => toast.classList.remove('show'), 3000);
        }
        
        function exportConfig() {
            // Collect current config from form (excluding API keys)
            const config = {
                _exportVersion: 1,
                _exportDate: new Date().toISOString(),
                librarySource: document.getElementById('librarySource').value,
                movieIdType: document.getElementById('movieIdType').value,
                seriesIdType: document.getElementById('seriesIdType').value,
                animeIdType: document.getElementById('animeIdType').value,
                inputMode: document.getElementById('inputMode').value,
                minRating: document.getElementById('minRating').value,
                sourceCount: document.getElementById('sourceCount').value,
                sortOrder: document.getElementById('sortOrder').value,
                language: document.getElementById('language').value,
                hideWatched: document.getElementById('hideWatched').checked,
                fillGaps: document.getElementById('fillGaps').checked,
                animeFillGaps: document.getElementById('animeFillGaps').checked,
                recEngine: document.getElementById('recEngine').value,
                animeEngine: document.getElementById('animeEngine').value
            };
            
            // Collect era selections
            const eras = [];
            document.querySelectorAll('#eraContainer input:checked').forEach(i => eras.push(i.value));
            config.era = eras.join(',');
            
            // Collect catalog order
            const cats = [];
            document.querySelectorAll('#catalogList .sort-item').forEach(item => {
                const id = item.getAttribute('data-id');
                const catObj = {
                    id: id,
                    enabled: item.querySelector('input').checked
                };
                // Include exclusions if present
                 if (catalogExclusions[id] && catalogExclusions[id].length > 0) {
                    catObj.excludedGenres = catalogExclusions[id];
                }
                // Include custom name if present
                if (catalogCustomNames[id]) {
                    catObj.customName = catalogCustomNames[id];
                }
                cats.push(catObj);
            });
            config.catalog_order = cats;
            
            // Download as JSON
            const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'cinemind-config-' + new Date().toISOString().split('T')[0] + '.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            showToast('✓ Config exported (API keys excluded)');
        }
        
        function importConfig(event) {
            const file = event.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const config = JSON.parse(e.target.result);
                    
                    // Apply settings to form
                    const simpleFields = ['librarySource', 'movieIdType', 'seriesIdType', 'animeIdType', 
                                         'inputMode', 'minRating', 'sourceCount', 'sortOrder', 'language',
                                         'recEngine', 'animeEngine'];
                    simpleFields.forEach(id => {
                        const el = document.getElementById(id);
                        if (el && config[id] !== undefined) el.value = config[id];
                    });
                    
                    // Checkboxes
                    if (config.hideWatched !== undefined) document.getElementById('hideWatched').checked = config.hideWatched;
                    if (config.fillGaps !== undefined) document.getElementById('fillGaps').checked = config.fillGaps;
                    if (config.animeFillGaps !== undefined) document.getElementById('animeFillGaps').checked = config.animeFillGaps;
                    
                    // Era selections
                    if (config.era) {
                        const savedEras = config.era.split(',');
                        document.querySelectorAll('#eraContainer .chip').forEach(chip => {
                            const cb = chip.querySelector('input');
                            const isActive = savedEras.includes(cb.value);
                            cb.checked = isActive;
                            chip.classList.toggle('active', isActive);
                        });
                    }
                    
                    // Catalog order and enabled state
                    if (config.catalog_order && Array.isArray(config.catalog_order)) {
                        const list = document.getElementById('catalogList');
                        const items = {};
                        list.querySelectorAll('.sort-item').forEach(el => items[el.getAttribute('data-id')] = el);
                        list.innerHTML = '';
                        
                        config.catalog_order.forEach(cat => {
                            const id = typeof cat === 'string' ? cat : cat.id;
                            const enabled = typeof cat === 'string' ? true : cat.enabled;
                            
                            // Restore exclusions
                            if (typeof cat === 'object' && cat.excludedGenres) {
                                catalogExclusions[id] = cat.excludedGenres;
                            }
                            // Restore custom names
                            if (typeof cat === 'object' && cat.customName) {
                                catalogCustomNames[id] = cat.customName;
                            }
                            
                            if (items[id]) {
                                const cb = items[id].querySelector('input');
                                cb.checked = enabled;
                                items[id].querySelector('.checkbox-modern').classList.toggle('checked', enabled);
                                list.appendChild(items[id]);
                                delete items[id];
                            }
                        });
                        // Append remaining items at end
                        Object.values(items).forEach(el => list.appendChild(el));
                        
                        // Update catalog list to show custom names
                        updateCatalogList();
                    }
                    
                    // Handle library source UI switch
                    if (config.librarySource) {
                        switchLibrarySource(config.librarySource);
                    }
                    
                    updateSummary();
                    showToast('✓ Config imported! Add your API keys to generate.');
                } catch (err) {
                    showToast('✗ Invalid config file', true);
                    console.error('Import error:', err);
                }
            };
            reader.readAsText(file);
            event.target.value = ''; // Reset file input
        }


        // --- Catalog Settings Logic ---
        let currentEditingCatalogId = null;
        // Map to store excluded genres for each catalog ID: { "catalogId": ["Horror", "Action"] }
        let catalogExclusions = {};
        // Map to store custom catalog names: { "catalogId": "My Custom Name" }
        let catalogCustomNames = {};
        
        // Default catalog names for reference
        const DEFAULT_CATALOG_NAMES = {
            'std_mov': 'Recommended Movies',
            'std_ser': 'Recommended Series',
            'ani_mov': 'Anime Movies',
            'ani_ser': 'Anime Series',
            'crew_mov': 'Cast & Crew (Movies)',
            'crew_ser': 'Cast & Crew (Series)'
        };
        
        // Client-side sanitization for catalog names
        function sanitizeCatalogName(name) {
            if (!name || typeof name !== 'string') return null;
            // Trim and limit length
            let sanitized = name.trim().slice(0, 50);
            // Remove any HTML tags
            sanitized = sanitized.replace(/<[^>]*>/g, '');
            // Only allow alphanumeric, spaces, and basic punctuation
            sanitized = sanitized.replace(/[^a-zA-Z0-9\\s\\-'&()]/g, '');
            // Collapse multiple spaces
            sanitized = sanitized.replace(/\\s+/g, ' ').trim();
            return sanitized.length > 0 ? sanitized : null;
        }
        
        function getDisplayName(catalogId) {
            return catalogCustomNames[catalogId] || DEFAULT_CATALOG_NAMES[catalogId] || 'Catalog';
        }
        
        function startRename(catalogId, nameSpan) {
            const currentName = getDisplayName(catalogId);
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'catalog-name-input';
            input.value = currentName;
            input.maxLength = 50;
            
            const originalHtml = nameSpan.innerHTML;
            nameSpan.innerHTML = '';
            nameSpan.appendChild(input);
            input.focus();
            input.select();
            
            function finishRename() {
                const sanitized = sanitizeCatalogName(input.value);
                if (sanitized && sanitized !== DEFAULT_CATALOG_NAMES[catalogId]) {
                    catalogCustomNames[catalogId] = sanitized;
                    nameSpan.innerHTML = '<span class="catalog-name-text">' + sanitized + '</span>';
                } else {
                    // Revert to default if empty or same as default
                    delete catalogCustomNames[catalogId];
                    nameSpan.innerHTML = '<span class="catalog-name-text">' + DEFAULT_CATALOG_NAMES[catalogId] + '</span>';
                }
                updateSummary();
            }
            
            input.addEventListener('blur', finishRename);
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    input.blur();
                } else if (e.key === 'Escape') {
                    nameSpan.innerHTML = '<span class="catalog-name-text">' + currentName + '</span>';
                }
            });
        }

        function getCatalogGenres(id) {

            // Determine likely content type based on catalog ID or config
            // Simple heuristic mapping
            if (id.startsWith('ani_') || id.includes('anime') || id.includes('kitsu') || id.includes('mal')) return GENRES.ANIME;
            if (id.includes('series') || id.includes('show')) return GENRES.TMDB_TV;
            return GENRES.TMDB_MOVIE; // Default
        }

        function openCatalogSettings(id, displayName) {
            currentEditingCatalogId = id;
            document.getElementById('catalogSettingsTitle').textContent = 'Manage exclusions for "' + displayName + '"';
            
            const genres = getCatalogGenres(id);
            const excluded = catalogExclusions[id] || [];
            
            const container = document.getElementById('genreList');
            container.innerHTML = genres.map(g => 
                '<label class="checkbox-modern-wrapper" style="padding:8px; display:flex; align-items:center; gap:12px; cursor:pointer; background:rgba(255,255,255,0.03); border-radius:8px; transition:background 0.2s;">' +
                    '<div class="checkbox-modern ' + (excluded.includes(g) ? 'checked' : '') + '">' +
                        '<input type="checkbox" value="' + g + '" ' + (excluded.includes(g) ? 'checked' : '') + ' onchange="this.parentElement.classList.toggle(\\'checked\\', this.checked)">' +
                    '</div>' +
                    '<span style="font-size:13px; font-weight:500;">' + g + '</span>' +
                '</label>'
            ).join('');
            
            const modal = document.getElementById('catalogSettingsModal');
            if (modal.parentElement !== document.body) {
                document.body.appendChild(modal);
            }
            
            modal.style.display = 'flex';
            // Force background to verify visibility/ z-index issues
            modal.style.backgroundColor = 'rgba(0,0,0,0.5)';
            document.getElementById('appLayout').style.filter = 'blur(5px)';
        }

        function closeCatalogSettings() {
            document.getElementById('catalogSettingsModal').style.display = 'none';
            document.getElementById('appLayout').style.filter = 'none';
            currentEditingCatalogId = null;
        }

        function saveCatalogSettings() {
            if (!currentEditingCatalogId) return;
            
            const checked = [];
            document.querySelectorAll('#genreList input:checked').forEach(cb => checked.push(cb.value));
            
            if (checked.length > 0) {
                catalogExclusions[currentEditingCatalogId] = checked;
            } else {
                delete catalogExclusions[currentEditingCatalogId];
            }
            
            closeCatalogSettings();
            updateSummary(); // Trigger config update
            showToast('Settings saved for this catalog');
        }

        // --- Updated Catalog List Renderer ---
        function updateCatalogList() {
            const list = document.getElementById('catalogList');
            
            list.querySelectorAll('.sort-item').forEach(item => {
                const id = item.getAttribute('data-id');
                
                // Find or create the name container
                let nameSpan = item.querySelector('.catalog-name');
                if (!nameSpan) {
                    // Convert old span to new structure
                    const oldSpan = item.querySelector('span[style*="font-weight:500"]') || item.querySelector('span:nth-of-type(2)');
                    if (oldSpan) {
                        nameSpan = document.createElement('div');
                        nameSpan.className = 'catalog-name';
                        const displayName = getDisplayName(id);
                        nameSpan.innerHTML = '<span class="catalog-name-text">' + displayName + '</span>';
                        oldSpan.replaceWith(nameSpan);
                    }
                } else {
                    // Update existing name display
                    const displayName = getDisplayName(id);
                    const textSpan = nameSpan.querySelector('.catalog-name-text');
                    if (textSpan && textSpan.textContent !== displayName) {
                        textSpan.textContent = displayName;
                    }
                }
                
                // Check if rename button exists
                if (!item.querySelector('.rename-btn')) {
                    const renameBtn = document.createElement('button');
                    renameBtn.className = 'rename-btn';
                    renameBtn.innerHTML = '✏️';
                    renameBtn.title = 'Rename catalog';
                    renameBtn.onclick = (e) => {
                        e.stopPropagation();
                        if (nameSpan) startRename(id, nameSpan);
                    };
                    
                    // Insert before settings button or at end
                    const settingsBtn = item.querySelector('.settings-btn');
                    if (settingsBtn) {
                        item.insertBefore(renameBtn, settingsBtn);
                    } else {
                        item.appendChild(renameBtn);
                    }
                }
                
                // Check if settings button exists
                if (!item.querySelector('.settings-btn')) {
                    const btn = document.createElement('button');
                    btn.className = 'btn-text settings-btn';
                    btn.innerHTML = '⚙️';
                    btn.title = 'Exclude Genres';
                    btn.style.padding = '4px 8px';
                    btn.style.opacity = '0.7';
                    btn.onclick = (e) => {
                        e.stopPropagation();
                        const displayName = getDisplayName(id);
                        openCatalogSettings(id, displayName);
                    };
                    item.appendChild(btn);
                }
                
                // Ensure item is flex centered
                item.style.display = 'flex';
                item.style.alignItems = 'center';
            });
        }

        // Call this on init
        window.addEventListener('load', updateCatalogList);

        // --- Init ---
        const ids = ['recEngine', 'animeEngine', 'language', 'minRating', 'rpdbKey', 'sourceCount', 'sortOrder', 'movieIdType', 'seriesIdType', 'animeIdType', 'tmdbApiKey'];
        ids.forEach(id => {
            const el = document.getElementById(id);
            if(el) {
                el.addEventListener('change', updateSummary);
                if(el.tagName === 'INPUT') el.addEventListener('input', updateSummary);
            }
        });
        document.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.addEventListener('change', updateSummary));

        function populateForm(cfg) {
             const hasConfig = cfg && (cfg.authKey || cfg.mdblistApiKey);
             
             if(hasConfig) {
                 // Restore library source first
                 const savedSource = cfg.librarySource || 'stremio';
                 document.getElementById('librarySource').value = savedSource;
                 switchLibrarySource(savedSource);
                 
                 // Restore auth keys
                 if(cfg.authKey) document.getElementById('authKey').value = cfg.authKey;
                 if(cfg.mdblistApiKey) document.getElementById('mdblistApiKey').value = cfg.mdblistApiKey;
                 
                 updateSidebar(true);
                 
                 ['movieIdType', 'seriesIdType', 'animeIdType', 'inputMode', 'minRating', 'sourceCount', 'sortOrder', 'language', 'rpdbKey', 'recEngine', 'animeEngine', 'tmdbApiKey', 'traktClientId'].forEach(id => {
                    if(cfg[id]) document.getElementById(id).value = cfg[id];
                });
                document.getElementById('hideWatched').checked = cfg.hideWatched === true;
                document.getElementById('fillGaps').checked = cfg.fillGaps === true;
                document.getElementById('animeFillGaps').checked = cfg.animeFillGaps === true;
                
                // Show Trakt field if needed
                updateTraktFieldVisibility();
                
                const savedEras = (cfg.era || '').split(',');
                document.querySelectorAll('#eraContainer .chip').forEach(chip => {
                    const cb = chip.querySelector('input');
                    if(savedEras.includes(cb.value)) { cb.checked = true; chip.classList.add('active'); }
                });
                
                if (cfg.catalog_order && Array.isArray(cfg.catalog_order)) {
                    const list = document.getElementById('catalogList');
                    const items = {};
                    list.querySelectorAll('.sort-item').forEach(el => items[el.getAttribute('data-id')] = el);
                    list.innerHTML = '';
                    
                    cfg.catalog_order.forEach(cat => {
                        const id = typeof cat === 'string' ? cat : cat.id;
                        const enabled = typeof cat === 'string' ? true : cat.enabled;
                        
                        // Restore exclusions
                        if (typeof cat === 'object' && cat.excludedGenres) {
                            catalogExclusions[id] = cat.excludedGenres;
                        }
                        // Restore custom names
                        if (typeof cat === 'object' && cat.customName) {
                            catalogCustomNames[id] = cat.customName;
                        }

                        if(items[id]) { 
                            const cb = items[id].querySelector('input');
                            cb.checked = enabled;
                            items[id].querySelector('.checkbox-modern').classList.toggle('checked', enabled);
                            list.appendChild(items[id]); 
                            delete items[id]; 
                        }
                    });
                    
                    Object.values(items).forEach(el => { 
                        const cb = el.querySelector('input');
                        cb.checked = false;
                        el.querySelector('.checkbox-modern').classList.remove('checked');
                        list.appendChild(el); 
                    });
                    
                    // Re-run this to add gear icons to re-ordered items
                    updateCatalogList();
                }
                
                const btn = document.getElementById('generateBtn');
                btn.textContent = "Save Changes";
                btn.dataset.originalText = "Save Changes";
                document.getElementById('reinstallNotice').style.display = 'block';
             }
             updateSummary();
        }

        async function unlockConfig() {
            const password = document.getElementById('unlockPassword').value;
            const msg = document.getElementById('unlockMsg');
            const btn = document.getElementById('unlockBtn');
            
            if(!password) { msg.textContent = "Password required"; msg.className = 'msg show error'; return; }
            
            btn.disabled = true;
            btn.textContent = 'Unlocking...';
            msg.textContent = '';
            
            try {
                const pathParts = window.location.pathname.split('/');
                // Basic check to strip empty strings
                const cleanParts = pathParts.filter(p => p);
                // URL: /TOKEN/configure -> token is second to last
                const token = cleanParts[cleanParts.length - 2]; 

                const res = await fetch('/api/decrypt-config', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ token, password })
                });
                
                const data = await res.json();
                
                if (data.error) {
                    msg.textContent = data.error;
                    msg.className = 'msg show error';
                    btn.disabled = false;
                    btn.textContent = 'Unlock';
                } else {
                    document.getElementById('passwordModal').style.display = 'none';
                    // Re-move modal to body if it was put back? No, just hide it.
                    document.body.style.overflow = 'auto'; 
                    
                    populateForm(data.config);
                    
                    document.getElementById('configPassword').value = password;
                    document.getElementById('configPasswordConfirm').value = password;
                }
            } catch (e) {
                msg.textContent = "Connection failed";
                msg.className = 'msg show error';
                btn.disabled = false;
                btn.textContent = 'Unlock';
            }
        }

        window.onload = () => {
             // Move modal to body
             const modal = document.getElementById('passwordModal');
             if(modal && modal.parentElement !== document.body) {
                 document.body.appendChild(modal);
             }
             
             // Move catalog settings modal too
             const catModal = document.getElementById('catalogSettingsModal');
             if(catModal && catModal.parentElement !== document.body) {
                 document.body.appendChild(catModal);
             }
             
             updateCatalogList(); // Ensure gear icons are added on load

             if (currentConfig && currentConfig._passwordProtected) {
                 document.getElementById('passwordModal').style.display = 'flex';
                 document.body.style.overflow = 'hidden'; 
                 document.getElementById('unlockPassword').addEventListener('keyup', (e) => {
                     if(e.key === 'Enter') unlockConfig();
                 });
             } else {
                 populateForm(currentConfig);
             }
        };




    </script>
</body>
</html>`;
}

module.exports = { renderLandingPage };
