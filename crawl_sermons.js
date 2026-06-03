const fs = require('fs');
const path = require('path');

const url = 'https://www.gty.org/api/core-non-user';
const CACHE_FILE = path.join(__dirname, 'sermons_cache.json');
const OUTPUT_HTML = path.join(__dirname, 'sermons.html');
const DELAY_MS = 1500; // Polite 1.5s delay

// Helper function to sleep
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchYearSermons(year) {
  const relativePath = `/api/website/sermons-by-field?locale=en&year=${year}&start=0&limit=1000`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 AntigravityPoliteScraper/1.0'
      },
      body: JSON.stringify({ relativePath })
    });
    
    if (!res.ok) {
      console.error(`[Error] Failed to fetch year ${year}. Status: ${res.status}`);
      return [];
    }
    
    const json = await res.json();
    return Array.isArray(json) ? json : [];
  } catch (err) {
    console.error(`[Error] Exception while fetching year ${year}:`, err.message);
    return [];
  }
}

function generateHtml(sermons) {
  console.log(`Generating HTML file containing ${sermons.length} sermons...`);
  
  // Sort sermons by date descending
  sermons.sort((a, b) => {
    const dateA = a.date || '';
    const dateB = b.date || '';
    return dateB.localeCompare(dateA);
  });

  // Calculate stats
  const total = sermons.length;
  const withAudio = sermons.filter(s => s.audio && s.audio.url).length;
  
  // Create HTML content with a premium, responsive glassmorphism dark template
  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>John MacArthur Sermons Index - Grace to You</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-dark: #0f1115;
      --bg-card: rgba(30, 34, 42, 0.6);
      --border-color: rgba(212, 175, 55, 0.2);
      --gold-primary: #D4AF37;
      --gold-hover: #F3E5AB;
      --text-main: #e2e8f0;
      --text-muted: #94a3b8;
      --text-dark: #0f172a;
      --success: #10b981;
      --glow-gold: 0 0 15px rgba(212, 175, 55, 0.15);
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      background-color: var(--bg-dark);
      background-image: radial-gradient(circle at 50% 0%, #1e1e24 0%, #0f1115 60%);
      color: var(--text-main);
      font-family: 'Inter', sans-serif;
      min-height: 100vh;
      line-height: 1.6;
      padding: clamp(1rem, 3vw, 2rem) clamp(0.5rem, 2vw, 1.5rem);
    }

    .container {
      max-width: 100%;
      margin: 0 auto;
      width: 100%;
    }

    header {
      text-align: center;
      margin-bottom: 3rem;
      position: relative;
    }

    header h1 {
      font-family: 'Cinzel', serif;
      font-size: clamp(1.75rem, 5vw, 2.75rem);
      color: var(--gold-primary);
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-bottom: 0.5rem;
      text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
    }

    header p.subtitle {
      font-size: clamp(0.9rem, 2.5vw, 1.1rem);
      color: var(--text-muted);
      letter-spacing: 1px;
    }

    .stats-bar {
      display: flex;
      justify-content: center;
      gap: 1rem;
      margin-top: 1.5rem;
      flex-wrap: wrap;
    }

    .stat-item {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      padding: 0.75rem 1.5rem;
      border-radius: 12px;
      backdrop-filter: blur(10px);
      box-shadow: var(--glow-gold);
      display: flex;
      flex-direction: column;
      align-items: center;
      flex: 1 1 calc(33.33% - 1rem);
      min-width: 160px;
    }

    .stat-value {
      font-size: clamp(1.35rem, 3vw, 1.75rem);
      font-weight: 700;
      color: var(--gold-primary);
      font-family: 'Cinzel', serif;
    }

    .stat-label {
      font-size: 0.75rem;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-top: 0.25rem;
      text-align: center;
    }

    .controls-card {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 16px;
      padding: clamp(1rem, 3vw, 2rem);
      margin-bottom: 2rem;
      backdrop-filter: blur(12px);
      box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
    }

    .search-row {
      display: grid;
      grid-template-columns: 2fr 1fr 1fr 1fr;
      gap: 1rem;
    }

    input, select {
      background: rgba(15, 17, 21, 0.8);
      border: 1px solid rgba(212, 175, 55, 0.3);
      color: var(--text-main);
      padding: 0.85rem 1.2rem;
      border-radius: 8px;
      font-size: 16px; /* 16px prevents automatic browser zoom on iOS */
      transition: all 0.3s ease;
      outline: none;
      width: 100%;
    }

    input::placeholder {
      color: #64748b;
    }

    input:focus, select:focus {
      border-color: var(--gold-primary);
      box-shadow: 0 0 10px rgba(212, 175, 55, 0.25);
    }

    .table-container {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 16px;
      overflow: hidden;
      backdrop-filter: blur(12px);
      box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.35);
      margin-top: 1.5rem;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }

    th {
      background: rgba(212, 175, 55, 0.08);
      color: var(--gold-primary);
      font-family: 'Cinzel', serif;
      font-size: 0.95rem;
      text-transform: uppercase;
      letter-spacing: 1px;
      padding: 1.2rem 1.5rem;
      border-bottom: 1px solid var(--border-color);
    }

    td {
      padding: 1.1rem 1.5rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      font-size: 0.95rem;
      vertical-align: middle;
      transition: background 0.2s ease;
    }

    tr:hover td {
      background: rgba(212, 175, 55, 0.03);
    }

    tr:last-child td {
      border-bottom: none;
    }

    .sermon-title {
      font-weight: 600;
      color: #f8fafc;
      font-size: 1rem;
      display: block;
      margin-bottom: 0.25rem;
    }

    .sermon-meta-detail {
      font-size: 0.8rem;
      color: var(--text-muted);
      display: flex;
      gap: 1rem;
    }

    .scripture-badge {
      background: rgba(212, 175, 55, 0.1);
      color: var(--gold-primary);
      padding: 0.25rem 0.6rem;
      border-radius: 6px;
      font-size: 0.8rem;
      font-weight: 500;
      border: 1px solid rgba(212, 175, 55, 0.15);
      display: inline-block;
    }

    .action-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.6rem 1.1rem;
      border-radius: 8px;
      font-size: 0.85rem;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      cursor: pointer;
      border: 1px solid transparent;
    }

    .btn-download {
      background: linear-gradient(135deg, var(--gold-primary) 0%, #b3922e 100%);
      color: var(--text-dark);
      box-shadow: 0 4px 12px rgba(212, 175, 55, 0.2);
    }

    .btn-download:hover {
      background: linear-gradient(135deg, #e5c158 0%, var(--gold-primary) 100%);
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(212, 175, 55, 0.35);
    }

    .btn-transcript {
      background: transparent;
      color: var(--gold-primary);
      border: 1px solid var(--border-color);
      margin-left: 0.5rem;
    }

    .btn-transcript:hover {
      background: rgba(212, 175, 55, 0.08);
      border-color: var(--gold-primary);
      color: #fff;
      transform: translateY(-2px);
    }

    .btn-disabled {
      background: #334155;
      color: #64748b;
      cursor: not-allowed;
      box-shadow: none;
    }

    .btn-disabled:hover {
      background: #334155;
      color: #64748b;
      transform: none;
    }

    .no-results {
      padding: 4rem;
      text-align: center;
      color: var(--text-muted);
      font-size: 1.1rem;
    }

    /* Pagination controls */
    .pagination-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.2rem 1.5rem;
      background: rgba(0, 0, 0, 0.2);
      border-top: 1px solid var(--border-color);
      font-size: 0.9rem;
      color: var(--text-muted);
    }

    .pagination-buttons {
      display: flex;
      gap: 0.5rem;
    }

    .page-btn {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: var(--text-main);
      padding: 0.4rem 0.8rem;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .page-btn:hover:not(:disabled) {
      background: rgba(212, 175, 55, 0.15);
      border-color: var(--gold-primary);
      color: var(--gold-primary);
    }

    .page-btn:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }

    .active-page {
      background: var(--gold-primary);
      color: var(--text-dark);
      border-color: var(--gold-primary);
      font-weight: bold;
    }

    /* Responsive adjustments */
    @media (max-width: 1024px) {
      .search-row {
        grid-template-columns: 1fr 1fr;
      }
    }

    @media (max-width: 768px) {
      /* Stats bar adjustments */
      .stat-item {
        flex: 1 1 calc(50% - 1rem);
      }

      /* Transform table to mobile cards */
      table, thead, tbody, th, td, tr {
        display: block;
      }
      
      thead tr {
        position: absolute;
        top: -9999px;
        left: -9999px;
      }
      
      tr {
        background: rgba(255, 255, 255, 0.02);
        border-bottom: 1px solid var(--border-color);
        padding: 1.25rem 1.1rem;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      tr:hover {
        background: rgba(212, 175, 55, 0.04);
      }

      tr:hover td {
        background: none;
      }
      
      td {
        padding: 0 !important;
        border: none !important;
        width: 100% !important;
      }

      /* Cell 1: Date */
      td:nth-child(1) {
        font-size: 0.85rem;
        font-weight: 600;
        letter-spacing: 0.5px;
        text-transform: uppercase;
        color: var(--gold-primary);
      }

      /* Cell 2: Sermon Info */
      td:nth-child(2) {
        margin-bottom: 0.25rem;
      }

      .sermon-title {
        font-size: 1.05rem;
        line-height: 1.4;
      }

      .sermon-meta-detail {
        margin-top: 0.5rem;
        flex-wrap: wrap;
        gap: 0.5rem 1rem;
      }

      /* Cell 3: Scripture Badge */
      td:nth-child(3) {
        display: block !important;
      }

      .scripture-badge {
        font-size: 0.75rem;
        padding: 0.2rem 0.5rem;
      }

      /* Cell 4: Download and Resource buttons */
      td:nth-child(4) {
        display: flex;
        gap: 0.75rem;
        margin-top: 0.5rem;
        justify-content: stretch;
      }

      .action-btn {
        flex: 1;
        text-align: center;
        padding: 0.75rem 1rem;
        margin: 0 !important; /* Override desktop margin-left */
        font-size: 0.85rem;
      }

      /* Pagination responsive styling */
      .pagination-bar {
        flex-direction: column;
        gap: 1rem;
        padding: 1.2rem 1rem;
        align-items: center;
        text-align: center;
      }

      .pagination-buttons {
        width: 100%;
        justify-content: center;
        flex-wrap: wrap;
        gap: 0.35rem;
      }

      .page-btn {
        padding: 0.5rem 0.75rem;
        font-size: 0.85rem;
      }
    }

    @media (max-width: 640px) {
      .search-row {
        grid-template-columns: 1fr;
      }
      .stat-item {
        flex: 1 1 100%;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>John MacArthur Sermons Index</h1>
      <p class="subtitle">Grace to You Historical Archives (1969 - Present)</p>
      
      <div class="stats-bar">
        <div class="stat-item">
          <div class="stat-value" id="stat-total">${total}</div>
          <div class="stat-label">Total Sermons</div>
        </div>
        <div class="stat-item">
          <div class="stat-value" id="stat-audio">${withAudio}</div>
          <div class="stat-label">Audio MP3s Available</div>
        </div>
        <div class="stat-item">
          <div class="stat-value" id="stat-transcripts">${total}</div>
          <div class="stat-label">Transcripts Linked</div>
        </div>
      </div>
    </header>

    <div class="controls-card">
      <div class="search-row">
        <div>
          <input type="text" id="search-input" placeholder="Search sermons by title, code, keyword...">
        </div>
        <div>
          <input type="text" id="scripture-input" placeholder="Search by Scripture...">
        </div>
        <div>
          <select id="year-select">
            <option value="">All Years</option>
            <!-- Generated dynamically -->
          </select>
        </div>
        <div>
          <select id="sort-select">
            <option value="desc">Date (Newest First)</option>
            <option value="asc">Date (Oldest First)</option>
          </select>
        </div>
      </div>
    </div>

    <div class="table-container">
      <table id="sermons-table">
        <thead>
          <tr>
            <th style="width: 120px;">Date</th>
            <th>Sermon Information</th>
            <th style="width: 250px;">Scripture</th>
            <th style="width: 280px; text-align: center;">Downloads \u0026 Resources</th>
          </tr>
        </thead>
        <tbody id="sermons-tbody">
          <!-- Rendered dynamically -->
        </tbody>
      </table>
      <div id="no-results-msg" class="no-results" style="display: none;">
        No sermons found matching your filters.
      </div>
      <div class="pagination-bar">
        <div id="pagination-info">Showing 0-0 of 0 sermons</div>
        <div class="pagination-buttons" id="pagination-btns"></div>
      </div>
    </div>
  </div>

  <script>
    // Embedded sermon list (populated at build time)
    const sermons = ${JSON.stringify(sermons)};

    // State
    let filteredSermons = [...sermons];
    let currentPage = 1;
    const itemsPerPage = 50;

    // Elements
    const searchInput = document.getElementById('search-input');
    const scriptureInput = document.getElementById('scripture-input');
    const yearSelect = document.getElementById('year-select');
    const sortSelect = document.getElementById('sort-select');
    const tbody = document.getElementById('sermons-tbody');
    const noResultsMsg = document.getElementById('no-results-msg');
    const paginationInfo = document.getElementById('pagination-info');
    const paginationBtns = document.getElementById('pagination-btns');

    // Initialize UI
    function init() {
      // 1. Populate year select options
      const years = [...new Set(sermons.map(s => s.date ? s.date.substring(0, 4) : ''))]
        .filter(y => y.length === 4)
        .sort((a, b) => b.localeCompare(a));
      
      years.forEach(year => {
        const opt = document.createElement('option');
        opt.value = year;
        opt.textContent = year;
        yearSelect.appendChild(opt);
      });

      // 2. Add event listeners
      searchInput.addEventListener('input', filterAndRender);
      scriptureInput.addEventListener('input', filterAndRender);
      yearSelect.addEventListener('change', filterAndRender);
      sortSelect.addEventListener('change', filterAndRender);

      // 3. Render
      filterAndRender();
    }

    // Filtering and Sorting logic
    function filterAndRender() {
      const q = searchInput.value.toLowerCase().trim();
      const scriptureQ = scriptureInput.value.toLowerCase().trim();
      const selectedYear = yearSelect.value;
      const sortOrder = sortSelect.value;

      filteredSermons = sermons.filter(s => {
        const title = (s.title || '').toLowerCase();
        const code = (s.code || '').toLowerCase();
        const slug = (s.slug || '').toLowerCase();
        const speaker = (s.speaker || '').toLowerCase();
        
        const matchesText = !q || title.includes(q) || code.includes(q) || slug.includes(q) || speaker.includes(q);
        
        const scripture = (s.scripture || '').toLowerCase();
        const matchesScripture = !scriptureQ || scripture.includes(scriptureQ);
        
        const year = s.date ? s.date.substring(0, 4) : '';
        const matchesYear = !selectedYear || year === selectedYear;

        return matchesText && matchesScripture && matchesYear;
      });

      // Sort
      filteredSermons.sort((a, b) => {
        const dateA = a.date || '';
        const dateB = b.date || '';
        return sortOrder === 'desc' ? dateB.localeCompare(dateA) : dateA.localeCompare(dateB);
      });

      // Update counters
      document.getElementById('stat-total').textContent = filteredSermons.length;
      document.getElementById('stat-audio').textContent = filteredSermons.filter(s => s.audio && s.audio.url).length;

      currentPage = 1;
      renderTable();
    }

    // Render Table Page
    function renderTable() {
      tbody.innerHTML = '';
      const totalItems = filteredSermons.length;
      
      if (totalItems === 0) {
        noResultsMsg.style.display = 'block';
        paginationInfo.textContent = 'Showing 0-0 of 0 sermons';
        paginationBtns.innerHTML = '';
        return;
      }
      
      noResultsMsg.style.display = 'none';
      
      const totalPages = Math.ceil(totalItems / itemsPerPage);
      if (currentPage > totalPages) currentPage = totalPages;
      
      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
      const pageItems = filteredSermons.slice(startIndex, endIndex);

      pageItems.forEach(s => {
        const tr = document.createElement('tr');
        
        // Date Cell
        const tdDate = document.createElement('td');
        tdDate.style.fontWeight = '500';
        tdDate.style.color = 'var(--gold-primary)';
        tdDate.textContent = s.date || 'N/A';
        tr.appendChild(tdDate);

        // Sermon Info Cell
        const tdInfo = document.createElement('td');
        const titleSpan = document.createElement('span');
        titleSpan.className = 'sermon-title';
        titleSpan.textContent = s.title || 'Untitled';
        tdInfo.appendChild(titleSpan);

        const metaDiv = document.createElement('div');
        metaDiv.className = 'sermon-meta-detail';
        metaDiv.innerHTML = \`
          <span>Code: \${s.code || 'N/A'}</span>
          <span>Speaker: \${s.speaker || 'John MacArthur'}</span>
          \${s.totalLength ? \`<span>Length: \${Math.round(s.totalLength / 60)} min</span>\` : ''}
        \`;
        tdInfo.appendChild(metaDiv);
        tr.appendChild(tdInfo);

        // Scripture Cell
        const tdScripture = document.createElement('td');
        if (s.scripture) {
          const badge = document.createElement('span');
          badge.className = 'scripture-badge';
          badge.textContent = s.scripture;
          tdScripture.appendChild(badge);
        } else {
          tdScripture.textContent = 'Selected Scriptures';
        }
        tr.appendChild(tdScripture);

        // Resource Links Cell
        const tdLinks = document.createElement('td');
        tdLinks.style.textAlign = 'center';
        
        // MP3 Link
        const hasAudio = s.audio && s.audio.url;
        const audioLink = document.createElement('a');
        audioLink.className = 'action-btn ' + (hasAudio ? 'btn-download' : 'btn-disabled');
        audioLink.textContent = 'MP3 Audio';
        if (hasAudio) {
          audioLink.href = s.audio.url;
          audioLink.target = '_blank';
          audioLink.title = 'Click to listen or right-click to download MP3';
        } else {
          audioLink.title = 'No audio file available';
          audioLink.removeAttribute('href');
        }
        tdLinks.appendChild(audioLink);

        // Print/Transcript Link
        const hasTranscript = s.code && s.slug;
        const transLink = document.createElement('a');
        transLink.className = 'action-btn ' + (hasTranscript ? 'btn-transcript' : 'btn-disabled');
        transLink.textContent = 'Transcript';
        if (hasTranscript) {
          // Construct GTY Print page link
          transLink.href = \`https://www.gty.org/sermons/print/\${s.code}/\${s.slug}\`;
          transLink.target = '_blank';
          transLink.title = 'Click to open printable text transcript';
        } else {
          transLink.title = 'No transcript available';
          transLink.removeAttribute('href');
        }
        tdLinks.appendChild(transLink);
        
        tr.appendChild(tdLinks);
        tbody.appendChild(tr);
      });

      // Update Pagination Text
      paginationInfo.textContent = \`Showing \${startIndex + 1}-\${endIndex} of \${totalItems} sermons\`;

      // Render Pagination Buttons
      renderPaginationControls(totalPages);
    }

    function renderPaginationControls(totalPages) {
      paginationBtns.innerHTML = '';
      
      const prevBtn = document.createElement('button');
      prevBtn.className = 'page-btn';
      prevBtn.textContent = 'Previous';
      prevBtn.disabled = currentPage === 1;
      prevBtn.onclick = () => { currentPage--; renderTable(); };
      paginationBtns.appendChild(prevBtn);

      // Show first page, last page, and current page +/- 1
      const pagesToShow = new Set([1, totalPages, currentPage, currentPage - 1, currentPage + 1]);
      const sortedPages = [...pagesToShow].filter(p => p >= 1 && p <= totalPages).sort((a, b) => a - b);

      let lastPage = 0;
      sortedPages.forEach(p => {
        if (lastPage !== 0 && p - lastPage > 1) {
          const ellipsis = document.createElement('span');
          ellipsis.textContent = '...';
          ellipsis.style.padding = '0.25rem 0.5rem';
          paginationBtns.appendChild(ellipsis);
        }
        const btn = document.createElement('button');
        btn.className = 'page-btn ' + (p === currentPage ? 'active-page' : '');
        btn.textContent = p;
        btn.onclick = () => { currentPage = p; renderTable(); };
        paginationBtns.appendChild(btn);
        lastPage = p;
      });

      const nextBtn = document.createElement('button');
      nextBtn.className = 'page-btn';
      nextBtn.textContent = 'Next';
      nextBtn.disabled = currentPage === totalPages;
      nextBtn.onclick = () => { currentPage++; renderTable(); };
      paginationBtns.appendChild(nextBtn);
    }

    // Start
    init();
  </script>
</body>
</html>`;

  fs.writeFileSync(OUTPUT_HTML, htmlContent);
  console.log(`[Success] HTML file written to: ${OUTPUT_HTML}`);
}

async function run() {
  console.log('=== GTY.org Polite Sermon Scraper ===');
  
  let allSermons = [];
  
  // 1. Check if cache file exists
  if (fs.existsSync(CACHE_FILE)) {
    console.log(`Found local cache file: ${CACHE_FILE}. Loading data from cache...`);
    try {
      allSermons = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
      console.log(`Loaded ${allSermons.length} sermons from cache.`);
    } catch (e) {
      console.error('[Error] Failed to read cache file, starting clean scrape...', e.message);
    }
  }
  
  // 2. If no cache or empty, scrape years 1969 to 2026
  if (allSermons.length === 0) {
    console.log('Starting polite metadata crawling from 1969 to 2026...');
    const currentYear = new Date().getFullYear();
    
    for (let year = 1969; year <= 2026; year++) {
      console.log(`[Crawl] Fetching sermons for year ${year}...`);
      const yearSermons = await fetchYearSermons(year);
      console.log(`[Crawl] Found ${yearSermons.length} sermons in ${year}.`);
      
      allSermons = allSermons.concat(yearSermons);
      
      // Save incremental backup to cache
      fs.writeFileSync(CACHE_FILE, JSON.stringify(allSermons, null, 2));
      
      // Polite delay between requests
      if (year < 2026) {
        console.log(`[Polite] Waiting ${DELAY_MS}ms before next request...`);
        await sleep(DELAY_MS);
      }
    }
    
    console.log(`\nScrape completed! Total sermons scraped: ${allSermons.length}`);
  }
  
  // 3. Generate the interactive index HTML file
  generateHtml(allSermons);
  console.log('=== Scrape & Generate Finished ===');
}

run();
