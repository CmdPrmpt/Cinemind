const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { nuvioLogin, nuvioGetProfiles, getNuvioDebugHistory } = require('../services/nuvio');
const env = require('../config/env');

// Admin authentication middleware — reuses STATS_USER/STATS_PASS from env
function requireAdmin(req, res, next) {
    // Fail-closed: refuse all requests if admin credentials aren't configured
    if (!env.STATS_USER || !env.STATS_PASS) {
        return res.status(503).json({ error: 'Debug panel not configured. Set STATS_USER and STATS_PASS in .env' });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Basic ')) {
        res.setHeader('WWW-Authenticate', 'Basic realm="Admin Debug"');
        return res.status(401).json({ error: 'Authentication required' });
    }

    const base64Credentials = authHeader.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
    const [user, pass] = credentials.split(':');

    const userBuffer = Buffer.from(user);
    const passBuffer = Buffer.from(pass);
    const expectedUserBuffer = Buffer.from(env.STATS_USER);
    const expectedPassBuffer = Buffer.from(env.STATS_PASS);

    const validUser = userBuffer.length === expectedUserBuffer.length &&
        crypto.timingSafeEqual(userBuffer, expectedUserBuffer);
    const validPass = passBuffer.length === expectedPassBuffer.length &&
        crypto.timingSafeEqual(passBuffer, expectedPassBuffer);

    if (!validUser || !validPass) {
        return res.status(403).json({ error: 'Invalid credentials' });
    }
    next();
}

// Protect all debug routes with admin auth
router.use(requireAdmin);

// Debug landing page
router.get('/', (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width,initial-scale=1.0">
    <title>Debug — Cinemind</title>
    <style>
        * { box-sizing:border-box; margin:0; padding:0; }
        body { background:#0a0a0f; color:#e0e0e0; font-family:system-ui,sans-serif; padding:40px; max-width:900px; margin:auto; }
        h1 { color:#818cf8; margin-bottom:8px; }
        .sub { color:#94a3b8; margin-bottom:24px; font-size:14px; }
        .tabs { display:flex; gap:4px; margin-bottom:20px; }
        .tab { padding:10px 20px; border-radius:8px 8px 0 0; cursor:pointer; font-weight:600; background:#1e1e2e; border:1px solid #334155; border-bottom:none; color:#94a3b8; }
        .tab.active { background:#334155; color:#e0e0e0; }
        .tab-content { display:none; }
        .tab-content.active { display:block; }
        .card { background:#1e1e2e; border:1px solid #334155; border-radius:12px; padding:24px; margin-bottom:20px; }
        .card.tab-card { border-radius:0 12px 12px 12px; border-top:1px solid #334155; }
        label { display:block; margin-bottom:6px; font-weight:600; color:#cbd5e1; }
        input, select { width:100%; padding:10px 14px; border-radius:8px; border:1px solid #334155; background:#0a0a0f; color:#e0e0e0; font-size:14px; margin-bottom:16px; }
        .row { display:flex; gap:12px; }
        .row > * { flex:1; }
        button { padding:10px 24px; border-radius:8px; border:none; font-weight:600; cursor:pointer; font-size:14px; }
        .btn-primary { background:#6366f1; color:white; }
        .btn-primary:hover { background:#4f46e5; }
        .btn-primary:disabled { opacity:0.5; cursor:not-allowed; }
        .btn-secondary { background:#334155; color:#e0e0e0; }
        .btn-secondary:hover { background:#475569; }
        #results { margin-top:24px; background:#1e1e2e; border:1px solid #334155; border-radius:12px; padding:24px; display:none; }
        #results.show { display:block; }
        .stat { display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #334155; }
        .stat:last-child { border:none; }
        .stat-label { color:#94a3b8; }
        .stat-value { color:#e0e0e0; font-weight:600; }
        .section-title { margin-top:20px; color:#818cf8; font-weight:600; }
        .item { font-family:monospace; font-size:12px; padding:6px 10px; background:#0a0a0f; border-radius:6px; margin-top:6px; color:#94a3b8; }
        .error { color:#f87171; background:#2d1215; padding:12px; border-radius:8px; margin-top:12px; }
        .success { color:#34d399; background:#0d2b1f; padding:12px; border-radius:8px; margin-top:12px; }
        .stremio-sub-tab { padding:6px 16px; border-radius:6px; cursor:pointer; font-weight:500; font-size:13px; background:#0a0a0f; color:#94a3b8; border:1px solid #334155; }
        .stremio-sub-tab.active { background:#334155; color:#e0e0e0; border-color:#6366f1; }
        .hidden { display:none; }
        .msg { margin-top:8px; }
    </style>
</head>
<body>
    <h1>🔧 Watch History Debug</h1>
    <p class="sub">Verify watch history from any supported library source.</p>

    <div class="tabs">
        <div class="tab active" onclick="switchTab('nuvio')">Nuvio</div>
        <div class="tab" onclick="switchTab('stremio')">Stremio</div>
        <div class="tab" onclick="switchTab('mdblist')">MDBlist</div>
    </div>

    <!-- Nuvio Tab -->
    <div id="tab-nuvio" class="tab-content active">
        <div class="card tab-card">
            <label>Nuvio Email</label>
            <input type="email" id="nuvioEmail" placeholder="your@email.com">
            <label>Nuvio Password</label>
            <input type="password" id="nuvioPassword" placeholder="Your Nuvio password">
            <button id="nuvioLoginBtn" class="btn-primary">Sign In</button>
            <div id="nuvioLoginMsg" class="msg"></div>
        </div>
        <div id="nuvioProfileSection" class="card hidden">
            <label>Profile</label>
            <select id="nuvioProfileId"><option value="">Loading profiles...</option></select>
            <button id="nuvioFetchBtn" class="btn-primary" disabled>Fetch History</button>
            <div id="nuvioFetchMsg" class="msg"></div>
        </div>
    </div>

    <!-- Stremio Tab -->
    <div id="tab-stremio" class="tab-content">
        <div class="card tab-card">
            <div class="stremio-sub-tabs" style="display:flex; gap:4px; margin-bottom:16px;">
                <div class="stremio-sub-tab active" data-method="key" onclick="switchStremioMethod('key')">Auth Key</div>
                <div class="stremio-sub-tab" data-method="login" onclick="switchStremioMethod('login')">Stremio Login</div>
            </div>

            <div id="stremio-key-section">
                <label>Stremio AuthKey</label>
                <input type="password" id="stremioAuthKey" placeholder="Paste your Stremio auth key...">
                <button id="stremioCheckBtn" class="btn-secondary">Check & Load Profiles</button>
            </div>

            <div id="stremio-login-section" style="display:none;">
                <div class="row">
                    <div><label>Email</label><input type="email" id="stremioDebugEmail" placeholder="your@email.com"></div>
                    <div><label>Password</label><input type="password" id="stremioDebugPass" placeholder="Your Stremio password"></div>
                </div>
                <button id="stremioDebugLoginBtn" class="btn-primary">Sign In</button>
            </div>

            <div id="stremioMsg" class="msg"></div>
        </div>
        <div id="stremioProfileSection" class="card hidden">
            <label>Profile</label>
            <select id="stremioProfileId"><option value="">Main Account (Default)</option></select>
            <input type="hidden" id="stremioProfileAuthKey" value="">
            <button id="stremioFetchBtn" class="btn-primary" disabled>Fetch History</button>
            <div id="stremioFetchMsg" class="msg"></div>
        </div>
    </div>

    <!-- MDBlist Tab -->
    <div id="tab-mdblist" class="tab-content">
        <div class="card tab-card">
            <label>MDBlist API Key</label>
            <input type="password" id="mdblistApiKey" placeholder="Paste your MDBlist API key...">
            <button id="mdblistFetchBtn" class="btn-primary">Fetch History</button>
            <div id="mdblistMsg" class="msg"></div>
        </div>
    </div>

    <div id="results"></div>

    <script>
        let nuvioAccessToken = '';
        let nuvioRefreshToken = '';
        let stremioAuthKey = '';

        function switchTab(name) {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            event.target.classList.add('active');
            document.getElementById('tab-' + name).classList.add('active');
            document.getElementById('results').classList.remove('show');
        }

        function esc(s) { 
            return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
        }

        document.getElementById('nuvioLoginBtn').onclick = async () => {
            const btn = document.getElementById('nuvioLoginBtn');
            const msg = document.getElementById('nuvioLoginMsg');
            const email = document.getElementById('nuvioEmail').value.trim();
            const password = document.getElementById('nuvioPassword').value.trim();
            if (!email || !password) { msg.innerHTML = '<span class="error">Email and password required</span>'; return; }
            btn.disabled = true; btn.textContent = 'Signing in...';
            msg.innerHTML = '<span>Connecting...</span>';
            try {
                const res = await fetch('/api/nuvio-login', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ email, password })
                });
                const data = await res.json();
                if (data.success) {
                    nuvioAccessToken = data.access_token;
                    nuvioRefreshToken = data.refresh_token || '';
                    msg.innerHTML = '<span class="success">✓ Logged in</span>';
                    await loadNuvioProfiles();
                } else {
                    msg.innerHTML = '<span class="error">' + esc(data.error || 'Login failed') + '</span>';
                }
            } catch (e) {
                msg.innerHTML = '<span class="error">Network error: ' + esc(e.message) + '</span>';
            }
            btn.disabled = false; btn.textContent = 'Sign In';
        };

        async function loadNuvioProfiles() {
            const section = document.getElementById('nuvioProfileSection');
            const select = document.getElementById('nuvioProfileId');
            const fetchBtn = document.getElementById('nuvioFetchBtn');
            try {
                const res = await fetch('/api/nuvio-profiles', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ nuvioAccessToken, nuvioRefreshToken })
                });
                const data = await res.json();
                if (data.success && data.profiles.length > 0) {
                    select.innerHTML = data.profiles.map(p => '<option value="' + p.profile_index + '">' + p.name + ' (Profile ' + p.profile_index + ')</option>').join('');
                    fetchBtn.disabled = false;
                } else {
                    select.innerHTML = '<option value="1">Default (no profiles found)</option>';
                    fetchBtn.disabled = false;
                }
                section.classList.remove('hidden');
            } catch (e) {
                select.innerHTML = '<option value="1">Error loading profiles</option>';
                section.classList.remove('hidden');
                fetchBtn.disabled = false;
            }
        }

        document.getElementById('nuvioFetchBtn').onclick = async () => {
            const btn = document.getElementById('nuvioFetchBtn');
            const msg = document.getElementById('nuvioFetchMsg');
            const profileId = document.getElementById('nuvioProfileId').value;
            btn.disabled = true; btn.textContent = 'Fetching...';
            msg.innerHTML = '<span>Fetching watch history from Nuvio...</span>';
            document.getElementById('results').classList.remove('show');
            try {
                const res = await fetch('/debug/fetch', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ accessToken: nuvioAccessToken, refreshToken: nuvioRefreshToken, profileId: parseInt(profileId) })
                });
                const data = await res.json();
                msg.innerHTML = '';
                if (data.error) {
                    document.getElementById('results').innerHTML = '<div class="error">' + esc(data.error) + '</div>';
                } else {
                    let html = '<h3 style="margin-bottom:16px; color:#818cf8;">Nuvio Watch History</h3>';
                    html += '<div class="stat"><span class="stat-label">Total Progress Entries</span><span class="stat-value">' + esc(data.total_entries) + '</span></div>';
                    html += '<div class="stat"><span class="stat-label">Movies</span><span class="stat-value">' + esc(data.movie_count) + '</span></div>';
                    html += '<div class="stat"><span class="stat-label">Series Episodes</span><span class="stat-value">' + esc(data.series_episode_count) + '</span></div>';
                    html += '<div class="stat"><span class="stat-label">Unique Shows</span><span class="stat-value">' + esc(data.unique_show_count) + '</span></div>';
                    html += '<div class="stat"><span class="stat-label">Profile ID</span><span class="stat-value">' + esc(data.profile_id) + '</span></div>';
                    if (data.sample_movies && data.sample_movies.length > 0) {
                        html += '<div class="section-title">Sample Movies (up to 5)</div>';
                        for (const m of data.sample_movies) html += '<div class="item">' + esc(m.content_id) + ' | ' + esc(m.progress_pct) + '% watched | last: ' + esc(m.last_watched) + '</div>';
                    }
                    if (data.sample_shows && data.sample_shows.length > 0) {
                        html += '<div class="section-title">Sample Shows (up to 10)</div>';
                        for (const s of data.sample_shows) html += '<div class="item">' + esc(s.content_id) + ' | S' + esc(s.highest_season) + 'E' + esc(s.highest_episode) + ' | ' + esc(s.total_episodes_watched) + ' eps watched | last: ' + esc(s.last_watched) + '</div>';
                    }
                    document.getElementById('results').innerHTML = html;
                    document.getElementById('results').classList.add('show');
                }
            } catch (e) { msg.innerHTML = '<span class="error">Network error: ' + esc(e.message) + '</span>'; }
            btn.disabled = false; btn.textContent = 'Fetch History';
        };

        function switchStremioMethod(method) {
            document.querySelectorAll('.stremio-sub-tab').forEach(t => t.classList.remove('active'));
            document.querySelector('.stremio-sub-tab[data-method="' + method + '"]').classList.add('active');
            document.getElementById('stremio-key-section').style.display = method === 'key' ? 'block' : 'none';
            document.getElementById('stremio-login-section').style.display = method === 'login' ? 'block' : 'none';
            document.getElementById('stremioMsg').innerHTML = '';
        }

        document.getElementById('stremioDebugLoginBtn').onclick = async () => {
            const btn = document.getElementById('stremioDebugLoginBtn');
            const msg = document.getElementById('stremioMsg');
            const email = document.getElementById('stremioDebugEmail').value.trim();
            const password = document.getElementById('stremioDebugPass').value.trim();
            if (!email || !password) { msg.innerHTML = '<span class="error">Email and password required</span>'; return; }
            btn.disabled = true; btn.textContent = 'Signing in...';
            msg.innerHTML = '<span>Connecting...</span>';
            try {
                const res = await fetch('https://api.strem.io/api/login', {
                    method: 'POST',
                    body: JSON.stringify({ email, password })
                });
                const data = await res.json();
                if (data.result && data.result.authKey) {
                    document.getElementById('stremioAuthKey').value = data.result.authKey;
                    msg.innerHTML = '<span class="success">✓ Logged In. Checking key...</span>';
                    // Trigger the check + profiles flow
                    await checkStremioKey(data.result.authKey);
                } else {
                    msg.innerHTML = '<span class="error">Login Failed</span>';
                }
            } catch (e) {
                msg.innerHTML = '<span class="error">Network error: ' + esc(e.message) + '</span>';
            }
            btn.disabled = false; btn.textContent = 'Sign In';
        };

        document.getElementById('stremioCheckBtn').onclick = async () => {
            const msg = document.getElementById('stremioMsg');
            const key = document.getElementById('stremioAuthKey').value.trim();
            if (!key) { msg.innerHTML = '<span class="error">AuthKey required</span>'; return; }
            await checkStremioKey(key);
        };

        async function checkStremioKey(key) {
            const msg = document.getElementById('stremioMsg');
            msg.innerHTML = '<span>Validating...</span>';
            try {
                const res = await fetch('/api/validate-user', {
                    method: 'POST', headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ authKey: key })
                });
                const d = await res.json();
                if (d.valid) {
                    stremioAuthKey = key;
                    msg.innerHTML = '<span class="success">✓ Key valid</span>';
                    await loadStremioProfiles();
                } else { msg.innerHTML = '<span class="error">Invalid Key</span>'; }
            } catch (e) { msg.innerHTML = '<span class="error">Network error: ' + esc(e.message) + '</span>'; }
        }

        async function loadStremioProfiles() {
            const section = document.getElementById('stremioProfileSection');
            const select = document.getElementById('stremioProfileId');
            const fetchBtn = document.getElementById('stremioFetchBtn');
            try {
                const res = await fetch('/api/stremio-profiles', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ authKey: stremioAuthKey })
                });
                const data = await res.json();
                if (data.success && data.profiles && data.profiles.length > 0) {
                    select.innerHTML = '<option value="">Main Account (Default)</option>' + data.profiles.map(p => '<option value="' + p.id + '" data-has-pin="' + p.hasPin + '">' + p.name + (p.hasPin ? ' 🔒' : '') + '</option>').join('');
                }
                fetchBtn.disabled = false;
                section.classList.remove('hidden');
            } catch (e) { section.classList.remove('hidden'); fetchBtn.disabled = false; }
        }

        // Profile selection: authenticate to get profile-specific authKey
        document.getElementById('stremioProfileId').onchange = async function() {
            const profileId = this.value;
            const msg = document.getElementById('stremioFetchMsg');
            const profileAuthKeyInput = document.getElementById('stremioProfileAuthKey');

            if (!profileId) {
                // Main Account selected — use master authKey
                profileAuthKeyInput.value = '';
                msg.innerHTML = '';
                return;
            }

            const selectedOption = this.options[this.selectedIndex];
            const hasPin = selectedOption.dataset.hasPin === 'true';
            let pin = '';
            if (hasPin) {
                pin = prompt('Enter PIN for this Stremio profile:');
                if (pin === null) {
                    this.value = '';
                    return;
                }
            }

            msg.innerHTML = '<span>Authenticating profile...</span>';
            try {
                const res = await fetch('/api/stremio-authenticate-profile', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ authKey: stremioAuthKey, profileId, pin })
                });
                const data = await res.json();
                if (data.success && data.authKey) {
                    profileAuthKeyInput.value = data.authKey;
                    msg.innerHTML = '<span class="success">✓ Profile ready — using profile-specific library</span>';
                } else {
                    msg.innerHTML = '<span class="error">Auth failed: ' + esc(data.error || 'unknown') + '</span>';
                    this.value = '';
                    profileAuthKeyInput.value = '';
                }
            } catch (e) {
                msg.innerHTML = '<span class="error">Network error: ' + esc(e.message) + '</span>';
                this.value = '';
                profileAuthKeyInput.value = '';
            }
        };

        document.getElementById('stremioFetchBtn').onclick = async () => {
            const btn = document.getElementById('stremioFetchBtn');
            const msg = document.getElementById('stremioFetchMsg');
            // Use profile-specific authKey if authenticated, otherwise master key
            const profileAuthKey = document.getElementById('stremioProfileAuthKey').value;
            const keyToUse = profileAuthKey || stremioAuthKey;
            btn.disabled = true; btn.textContent = 'Fetching...';
            msg.innerHTML = '<span>Fetching watch history from Stremio...</span>';
            document.getElementById('results').classList.remove('show');
            try {
                const res = await fetch('/debug/stremio-fetch', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ authKey: keyToUse })
                });
                const data = await res.json();
                msg.innerHTML = '';
                if (data.error) {
                    document.getElementById('results').innerHTML = '<div class="error">' + esc(data.error) + '</div>';
                } else {
                    let html = '<h3 style="margin-bottom:16px; color:#818cf8;">Stremio Library</h3>';
                    html += '<div class="stat"><span class="stat-label">Total Library Items</span><span class="stat-value">' + esc(data.total_entries) + '</span></div>';
                    html += '<div class="stat"><span class="stat-label">Movies</span><span class="stat-value">' + esc(data.movie_count) + '</span></div>';
                    html += '<div class="stat"><span class="stat-label">Series</span><span class="stat-value">' + esc(data.series_count) + '</span></div>';
                    html += '<div class="stat"><span class="stat-label">Removed with History</span><span class="stat-value">' + esc(data.removed_with_history) + '</span></div>';
                    if (data.sample_movies && data.sample_movies.length > 0) {
                        html += '<div class="section-title">Sample Movies (up to 5)</div>';
                        for (const m of data.sample_movies) html += '<div class="item">' + esc(m._id) + ' | ' + esc(m.name) + ' | ' + esc(m.progress_pct) + '% watched | last: ' + esc(m.last_watched) + '</div>';
                    }
                    if (data.sample_series && data.sample_series.length > 0) {
                        html += '<div class="section-title">Sample Series (up to 10)</div>';
                        for (const s of data.sample_series) html += '<div class="item">' + esc(s._id) + ' | ' + esc(s.name) + ' | S' + esc(s.season) + 'E' + esc(s.episode) + ' | last: ' + esc(s.last_watched) + '</div>';
                    }
                    document.getElementById('results').innerHTML = html;
                    document.getElementById('results').classList.add('show');
                }
            } catch (e) { msg.innerHTML = '<span class="error">Network error: ' + esc(e.message) + '</span>'; }
            btn.disabled = false; btn.textContent = 'Fetch History';
        };

        document.getElementById('mdblistFetchBtn').onclick = async () => {
            const btn = document.getElementById('mdblistFetchBtn');
            const msg = document.getElementById('mdblistMsg');
            const apiKey = document.getElementById('mdblistApiKey').value.trim();
            if (!apiKey) { msg.innerHTML = '<span class="error">API key required</span>'; return; }
            btn.disabled = true; btn.textContent = 'Fetching...';
            msg.innerHTML = '<span>Fetching watch history from MDBlist...</span>';
            document.getElementById('results').classList.remove('show');
            try {
                const res = await fetch('/debug/mdblist-fetch', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ mdblistApiKey: apiKey })
                });
                const data = await res.json();
                msg.innerHTML = '';
                if (data.error) {
                    document.getElementById('results').innerHTML = '<div class="error">' + esc(data.error) + '</div>';
                } else {
                    let html = '<h3 style="margin-bottom:16px; color:#818cf8;">MDBlist Watch History</h3>';
                    html += '<div class="stat"><span class="stat-label">Movies Watched</span><span class="stat-value">' + esc(data.total_movies_watched) + '</span></div>';
                    html += '<div class="stat"><span class="stat-label">Episodes Watched</span><span class="stat-value">' + esc(data.total_episodes_watched) + '</span></div>';
                    html += '<div class="stat"><span class="stat-label">Unique Shows</span><span class="stat-value">' + esc(data.unique_shows) + '</span></div>';
                    html += '<div class="stat"><span class="stat-label">In Progress</span><span class="stat-value">' + esc(data.in_progress) + '</span></div>';
                    if (data.sample_movies && data.sample_movies.length > 0) {
                        html += '<div class="section-title">Sample Movies (up to 5)</div>';
                        for (const m of data.sample_movies) html += '<div class="item">' + esc(m.title) + ' | ' + esc(m.id) + ' | last: ' + esc(m.last_watched) + '</div>';
                    }
                    if (data.sample_episodes && data.sample_episodes.length > 0) {
                        html += '<div class="section-title">Sample Episodes (up to 10)</div>';
                        for (const e of data.sample_episodes) html += '<div class="item">' + esc(e.show) + ' | S' + esc(e.season) + 'E' + esc(e.episode) + ' | ' + esc(e.id) + ' | last: ' + esc(e.last_watched) + '</div>';
                    }
                    if (data.sample_in_progress && data.sample_in_progress.length > 0) {
                        html += '<div class="section-title">In Progress (up to 5)</div>';
                        for (const p of data.sample_in_progress) html += '<div class="item">' + esc(p.title) + ' (' + esc(p.type) + ') | ' + esc(p.progress) + '% | ' + esc(p.id) + ' | paused: ' + esc(p.paused_at) + '</div>';
                    }
                    document.getElementById('results').innerHTML = html;
                    document.getElementById('results').classList.add('show');
                }
            } catch (e) { msg.innerHTML = '<span class="error">Network error: ' + esc(e.message) + '</span>'; }
            btn.disabled = false; btn.textContent = 'Fetch History';
        };
    </script>
</body>
</html>`);
});

// Debug fetch endpoint — uses access token directly instead of encrypted token
router.post('/fetch', async (req, res) => {
    const { accessToken, refreshToken, profileId } = req.body;
    if (!accessToken) return res.status(400).json({ error: 'Access token required' });

    try {
        const stats = await getNuvioDebugHistory(
            accessToken,
            refreshToken || '',
            profileId || 1
        );
        res.json(stats);
    } catch (e) {
        res.status(500).json({ error: 'Failed to fetch: ' + e.message });
    }
});

// Stremio debug fetch endpoint
router.post('/stremio-fetch', async (req, res) => {
    const { authKey } = req.body;
    if (!authKey) return res.status(400).json({ error: 'AuthKey required' });

    try {
        const { getStremioDebugHistory } = require('../services/stremio');
        const stats = await getStremioDebugHistory(authKey);
        res.json(stats);
    } catch (e) {
        res.status(500).json({ error: 'Failed to fetch: ' + e.message });
    }
});

// MDBlist debug fetch endpoint
router.post('/mdblist-fetch', async (req, res) => {
    const { mdblistApiKey } = req.body;
    if (!mdblistApiKey) return res.status(400).json({ error: 'MDBlist API key required' });

    try {
        const { getMDBlistDebugHistory } = require('../services/mdblist');
        const stats = await getMDBlistDebugHistory(mdblistApiKey);
        res.json(stats);
    } catch (e) {
        res.status(500).json({ error: 'Failed to fetch: ' + e.message });
    }
});

module.exports = router;
