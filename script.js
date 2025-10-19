/* Script for the Lit & Laid Reading Hub
 *
 * This file contains all of the JavaScript logic powering the Lit & Laid
 * website. It handles authentication (stored locally only), renders each of
 * the data tables (eBooks, poetry sites and extra resources), and
 * implements the wishlist functionality including the ability to add
 * books manually, scan ISBNs using the browser's BarcodeDetector, and
 * upload cover photos. Everything is scoped by username in localStorage
 * so multiple people can share a device without overwriting each other's
 * lists.
 */

/* ------------------ Auth (local only) ------------------ */
// Keys used for localStorage. Changing these will reset existing users/wishlists.
const LS_USER_KEY = "ll_user";
const LS_WL_PREFIX = "ll_wishlist_";

// Elements for login/logout and username/password fields.
const userBox = document.getElementById('userBox');
const welcomeTxt = document.getElementById('welcomeTxt');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const usernameEl = document.getElementById('username');
const passwordEl = document.getElementById('password');

// Return the currently signed in user (or empty string if none).
function currentUser(){ return localStorage.getItem(LS_USER_KEY) || ""; }

// Set the current user. Passing an empty string logs the user out.
function setUser(u){
  if(u){ localStorage.setItem(LS_USER_KEY, u); }
  else { localStorage.removeItem(LS_USER_KEY); }
  renderAuth();
  renderWishlist(); // refresh per-user
}

// Update the login UI to reflect the current user state.
function renderAuth(){
  const u = currentUser();
  if(u){
    welcomeTxt.textContent = `Signed in as ${u}`;
    usernameEl.style.display = 'none';
    passwordEl.style.display = 'none';
    loginBtn.style.display = 'none';
    logoutBtn.style.display = '';
  }else{
    welcomeTxt.textContent = 'Not signed in';
    usernameEl.style.display = '';
    passwordEl.style.display = '';
    loginBtn.style.display = '';
    logoutBtn.style.display = 'none';
  }
}

// Hook up login and logout buttons.
loginBtn.addEventListener('click', ()=>{
  const u = usernameEl.value.trim();
  if(!u){
    alert("Enter a username");
    return;
  }
  // We ignore the password on purpose – this is a demo and not a real auth system.
  setUser(u);
});
logoutBtn.addEventListener('click', ()=> setUser("") );

// Render the auth UI on first load.
renderAuth();

/* ------------------ Data: eBooks / Poetry / Extras ------------------ */

// eBook listing. Each item has an id (n), name, URL, type and notes. Types must
// be one of: downloadable, online, audiobook, mixed.
const ebooksData = [
  {n:1, name:"Planet eBook", url:"https://www.planetebook.com", type:"downloadable", notes:"Classic literature — PDFs ready to download"},
  {n:2, name:"Free-eBooks.net", url:"https://www.free-ebooks.net", type:"downloadable", notes:"Free with sign-up — ePub/Kindle/PDF"},
  {n:3, name:"ManyBooks", url:"https://manybooks.net", type:"downloadable", notes:"DRM-free downloads across genres"},
  {n:4, name:"LibriVox", url:"https://librivox.org", type:"audiobook", notes:"Public-domain audiobooks — downloadable MP3s"},
  {n:5, name:"Internet Archive", url:"https://archive.org", type:"mixed", notes:"Millions of books — some borrow-only, many downloadable"},
  {n:6, name:"BookBub", url:"https://www.bookbub.com/ebook-deals/free-ebooks", type:"online", notes:"Links to free deals on Kindle/Apple/etc."},
  {n:7, name:"Open Library", url:"https://openlibrary.org", type:"mixed", notes:"Borrow or read online; public-domain titles downloadable"},
  {n:8, name:"Bookboon", url:"https://bookboon.com", type:"downloadable", notes:"Free textbooks & business books — PDF"},
  {n:9, name:"Feedbooks — Public Domain", url:"https://www.feedbooks.com/publicdomain", type:"downloadable", notes:"Public-domain classics — ePub/PDF"},
  {n:10, name:"Smashwords (Free)", url:"https://www.smashwords.com/free", type:"downloadable", notes:"Indie authors — DRM-free downloads"},
  {n:11, name:"Project Gutenberg", url:"https://www.gutenberg.org", type:"downloadable", notes:"Public-domain classics — ePub/Kindle/Text"},
  {n:12, name:"Google Books", url:"https://books.google.com", type:"online", notes:"Some full view free; many previews only"},
  {n:13, name:"PDFBooksWorld", url:"https://www.pdfbooksworld.com", type:"downloadable", notes:"Well-formatted PDFs of classics"},
  {n:14, name:"FreeTechBooks", url:"https://www.freetechbooks.com", type:"downloadable", notes:"Academic & tech books — PDF/HTML"},
  {n:15, name:"Bookyards", url:"https://www.bookyards.com", type:"downloadable", notes:"Mixed categories — PDF downloads"},
  {n:16, name:"GetFreeBooks", url:"https://www.getfreeebooks.com", type:"downloadable", notes:"Curated free ebooks — downloads"},
  {n:17, name:"eBookLobby", url:"https://www.ebooklobby.com", type:"downloadable", notes:"Business & education — free PDFs"},
  {n:18, name:"FreeComputerBooks", url:"https://freecomputerbooks.com", type:"downloadable", notes:"Programming, engineering, math — PDF/HTML"},
  {n:19, name:"LibriVox (duplicate in source list)", url:"https://librivox.org", type:"audiobook", notes:"Same as #4 — audiobooks"},
  {n:20, name:"ManyBooks (duplicate in source list)", url:"https://manybooks.net", type:"downloadable", notes:"Same as #3 — DRM-free downloads"}
];

// Helper to build a full URL from a domain. If the string already looks like a URL, return it.
const urlFromDomain = (d) => {
  if(!d) return null;
  d = String(d).trim();
  if(!/^https?:\/\//i.test(d)) d = "https://" + d.replace(/^www\./i, "");
  return d;
};

// Raw poetry source data. Each row: [name, domainOrUrl, label, extraNotes]
const poetryRaw = [
  ["GigglePoetry.com","gigglepoetry.com","Online viewing only","Children’s poetry activities & readings"],
  ["PoemHunter.com","poemhunter.com","PDF","Poems & poets, some downloadable PDFs"],
  ["e-booksdirectory.com","e-booksdirectory.com","various formats","Aggregated ebooks incl. poetry"],
  ["ebooks.adelaide.edu.au","ebooks.adelaide.edu.au","Online viewing only","University of Adelaide ebooks (archive)"],
  ["Literatureproject.com","literatureproject.com","Online viewing only","Classic texts to read online"],
  ["Alharris.com","alharris.com","PDF","Poetry PDFs by Al Harris (site availability varies)"],
  ["Smashwords.com","smashwords.com","All formats","Indie poetry, many free titles"],
  ["Manybooks.net","manybooks.net","All formats","Large catalog incl. poetry"],
  ["Poemsforfree.com","poemsforfree.com","Online viewing only","Occasional printable poems"],
  ["Familyfriendpoems.com","familyfriendpoems.com","Online viewing only","Popular themed poems & submissions"],
  ["Lovepoemsandquotes.com","lovepoemsandquotes.com","Online viewing only","Love poems & quote collections"],
  ["Voicesnet.org","voicesnet.org","Online viewing only","Poet community & contests"],
  ["Poetrypoem.com","poetrypoem.com","Online viewing only","Personal poetry pages & posts"],
  ["Poetryintranslation.com","poetryintranslation.com","Online viewing only","Classic poetry in translation"],
  ["Poetrysoup.com","poetrysoup.com","Online viewing only","Poet social site & forms"],
  ["Firebirdpoetry.com","firebirdpoetry.com","Online viewing only","Poetry resource (availability may vary)"],
  ["Short-love-poem.com","short-love-poem.com","Online viewing only","Short romantic poems"],
  ["Poets.org","poets.org","Online viewing only","Academy of American Poets — poems & essays"],
  ["Librivox.org","librivox.org","MP3","Public-domain poetry audiobooks"],
  ["Poets on Poets","", "Online viewing, MP3, OGG","Poets discussing poets (assorted media)"],
  ["Audio Poetry","", "Online viewing, MP3, OGG","Audio poetry collections (assorted)"],
  ["Free Poems on Demand","", "Handwritten","Request handwritten poems"],
  ["Poetry 180","www.loc.gov/poetry/180/","Online viewing only","Poetry for each of the 180 days of school"],
  ["The Poetry Corner","", "Online viewing only","Poetry portal/collection"],
  ["Red House Books","", "Online viewing only","Poetry & book blog/archives"],
  ["Poetry Explorer","poetryexplorer.net","Online viewing only","Searchable anthology explorer"],
  ["Wattpad.com","wattpad.com","Online viewing only","User fiction & poetry"],
  ["Protagonize.com","protagonize.com","Online viewing only","Collaborative writing (historic/archived)"],
  ["Scrapbook.com","scrapbook.com","Online viewing only","Poem/quote resources for crafts"],
  ["TeenInk.com","teenink.com","Online viewing only","Teen poetry & essays"],
  ["WritersLounge.net","", "Online viewing only","Writing community (availability varies)"],
  ["OutlawPoetry.com","outlawpoetry.com","Online viewing only","Indie poetry & journals"],
  ["Poetry Library","poetrylibrary.org.uk","Online viewing only, Audio","UK poetry library & recordings"],
  ["Hello Poetry","hellopoetry.com","Online viewing only","Poetry posting community"],
  ["Poetry Archive","poetryarchive.org","Online viewing only, Audio","Recorded poets reading their work"],
  ["Poe Stories","poestories.com","Online viewing only","Edgar Allan Poe texts & notes"],
  ["Poetry4kids.com","poetry4kids.com","Online viewing only","Kenn Nesbitt’s children’s poetry"],
  ["Poetry on a Roll","", "Online viewing only","Poetry blog/collection"],
  ["OldPoetry.com","oldpoetry.com","Online viewing only","Classic & community poetry"],
  ["Gratefulness.org","gratefulness.org","Online viewing only","Poems on gratitude & reflection"],
];

// Convert a human-readable label into one of our four types.
const typeFromLabel = (s) => {
  s = (s || "").toLowerCase();
  if (s.includes("mp3") || s.includes("ogg")) return "audiobook";
  if (s.includes("pdf") || s.includes("various") || s.includes("all formats")) return "downloadable";
  if (s.includes("online") && s.includes("audio")) return "mixed";
  if (s.includes("handwritten")) return "online"; // handwritten is closest to online
  if (s.includes("mixed")) return "mixed";
  if (s.includes("online")) return "online";
  return "online";
};

// Build a normalized poetry data array with consistent fields. Derive the URL, type
// and notes from the raw data.
const poetryData = poetryRaw.map((row, idx) => {
  const [name, domain, label, extraNotes] = row;
  const url = domain ? urlFromDomain(domain) : null;
  const type = typeFromLabel(label);
  const notes = [label, extraNotes].filter(Boolean).join(" — ");
  return { n: idx+1, name, url, type, notes };
});

// Extra resources. We start with the user-requested site and can add more later.
const extrasData = [
  {n:1, name:"The Literature Network", url:"https://www.online-literature.com/", type:"online", notes:"Authors, full texts, and study guides"},
];

/* ------------------ Table Rendering & Filtering ------------------ */

// Convert a type into an HTML tag snippet. Used in the tables.
const typeTag = (t) => {
  if (t === "downloadable") return '<span class="tag dl">📥 Downloadable</span>';
  if (t === "online") return '<span class="tag online">🌐 Online</span>';
  if (t === "audiobook") return '<span class="tag audio">🎧 Audio</span>';
  return '<span class="tag mixed">⚖️ Mixed</span>';
};

/**
 * Render a data table into the page. Each namespace (ebooks, poetry, extras) has its own
 * controls and table. This function wires up search filtering, checkbox filtering,
 * copy-as-Markdown functionality and the ability to add items to the wishlist.
 *
 * @param {string} ns The namespace (ebooks, poetry, extras).
 * @param {Array} rows Array of objects representing the table data.
 */
function renderTable(ns, rows){
  const panel = document.querySelector(`[data-table="${ns}"]`);
  const tbody = panel.querySelector("tbody");
  const controls = document.querySelector(`[data-controls="${ns}"]`);
  const countEl = document.querySelector(`[data-count="${ns}"]`);
  const search = document.querySelector(`[data-search="${ns}"]`);

  // Re-render the table whenever search input or filter checkboxes change.
  function doRender(){
    const checks = controls ? [...controls.querySelectorAll('input[type="checkbox"][data-filter]')]
      .filter(i => i.checked).map(i => i.getAttribute("data-filter")) : null;
    const q = (search?.value || "").trim().toLowerCase();

    tbody.innerHTML = "";
    let shown = 0;
    rows.forEach(row => {
      const inType = checks ? checks.includes(row.type) : true;
      const inSearch = !q || row.name.toLowerCase().includes(q) || (row.notes||"").toLowerCase().includes(q);
      if (inType && inSearch){
        const tr = document.createElement("tr");
        tr.dataset.type = row.type;
        const siteCell = row.url
          ? `<a href="${row.url}" target="_blank" rel="noopener">${row.name}</a>`
          : `<span>${row.name}</span>`;
        tr.innerHTML = `
          <td data-label="#">${row.n}</td>
          <td data-label="Site">${siteCell}</td>
          <td data-label="Type">${typeTag(row.type)}</td>
          <td data-label="Notes"><span class="note">${row.notes || ""}</span></td>
          <td data-label=""><button class="btn" data-add="${ns}" data-name="${encodeURIComponent(row.name)}" data-url="${encodeURIComponent(row.url || "")}" data-src="${ns}">⭐</button></td>
        `;
        tbody.appendChild(tr);
        shown++;
      }
    });
    if(countEl) countEl.textContent = `${shown} of ${rows.length} shown`;
  }

  // Wire up filter checkboxes and search input.
  controls?.querySelectorAll('input[type="checkbox"][data-filter]').forEach(el => el.addEventListener("change", doRender));
  if (search) search.addEventListener("input", doRender);
  doRender();

  // Copy-as-Markdown handler.
  const copyBtn = document.querySelector(`[data-copy="${ns}"]`);
  copyBtn?.addEventListener("click", () => {
    const visibleRows = [...tbody.querySelectorAll("tr")];
    const md = [
      "| # | Site | Type | Notes |",
      "|---:|---|---|---|",
      ...visibleRows.map(r => {
        const n = r.children[0].innerText.trim();
        const a = r.children[1].querySelector("a");
        const site = a ? `[${a.innerText}](${a.href})` : r.children[1].innerText.trim();
        const typ = r.children[2].innerText.trim().replace(/\s+/g," ");
        const notes = r.children[3].innerText.trim();
        return `| ${n} | ${site} | ${typ} | ${notes} |`;
      })
    ].join("\n");
    navigator.clipboard.writeText(md).then(
      () => alert("Markdown copied ✅"),
      () => alert("Copy blocked by browser")
    );
  });

  // Add-to-wishlist: event delegation on tbody catches button clicks.
  tbody.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-add]');
    if(!btn) return;
    const name = decodeURIComponent(btn.getAttribute('data-name') || "");
    const url = decodeURIComponent(btn.getAttribute('data-url') || "");
    addToWishlist({title: name, url, source: ns});
  });
}

// Initialize all tables.
renderTable("ebooks", ebooksData);
renderTable("poetry", poetryData);
renderTable("extras", extrasData);

/* ------------------ Tabs: click + keyboard ------------------ */

(function initTabs(){
  const tablist = document.querySelector('.tabs[role="tablist"]') || document.querySelector('.tabs');
  const tabs = [...document.querySelectorAll('.tab-btn[role="tab"], .tab-btn')];
  const panels = [...document.querySelectorAll('.tab-panel[role="tabpanel"], .tab-panel')];
  if(!tabs.length || !panels.length) return;

  // Ensure roles/ids and ARIA linkages
  tabs.forEach(btn => {
    if(!btn.hasAttribute('role')) btn.setAttribute('role','tab');
    const ns = btn.getAttribute('data-tab');
    const id = btn.id || `tab-${ns || Math.random().toString(36).slice(2,7)}`;
    btn.id = id;
    const panel = document.getElementById(`panel-${ns}`);
    if(panel){
      if(!panel.hasAttribute('role')) panel.setAttribute('role','tabpanel');
      panel.setAttribute('aria-labelledby', id);
    }
  });
  if(tablist && !tablist.hasAttribute('role')) tablist.setAttribute('role','tablist');
  if(tablist && !tablist.hasAttribute('aria-orientation')) tablist.setAttribute('aria-orientation','horizontal');

  // Reflect initial visibility
  panels.forEach(p => { p.hidden = !p.classList.contains('active'); });

  function setActive(target){
    const ns = target.getAttribute('data-tab');
    tabs.forEach(t => {
      const sel = t === target;
      t.classList.toggle('active', sel);
      t.setAttribute('aria-selected', sel ? 'true' : 'false');
      t.setAttribute('tabindex', sel ? '0' : '-1');
    });
    panels.forEach(p => {
      const match = p.id === `panel-${ns}`;
      p.classList.toggle('active', match);
      p.hidden = !match;
    });
    target.focus();
  }

  // Initialize selected state
  const current = tabs.find(t => t.classList.contains('active')) || tabs[0];
  tabs.forEach(t => t.setAttribute('tabindex', t === current ? '0' : '-1'));
  if(current){ current.setAttribute('aria-selected','true'); }

  // Click activation
  tabs.forEach(t => t.addEventListener('click', () => setActive(t)));

  // Keyboard navigation
  const key = {
    ArrowLeft: -1, Left: -1,
    ArrowRight: +1, Right: +1
  };
  tablist?.addEventListener('keydown', (e) =>{
    const idx = tabs.indexOf(document.activeElement);
    if(idx === -1) return;
    if(e.key === 'Home'){
      e.preventDefault();
      tabs[0].focus();
      return;
    }
    if(e.key === 'End'){
      e.preventDefault();
      tabs[tabs.length-1].focus();
      return;
    }
    if(e.key in key){
      e.preventDefault();
      let next = idx + key[e.key];
      if(next < 0) next = tabs.length-1;
      if(next >= tabs.length) next = 0;
      tabs[next].focus();
      return;
    }
    if(e.key === 'Enter' || e.key === ' '){
      e.preventDefault();
      const focused = document.activeElement;
      if(tabs.includes(focused)) setActive(focused);
    }
  });
})();

/* ------------------ Wishlist storage & UI ------------------ */

/**
 * Generate a unique key for the current user's wishlist. This ensures that each
 * username has its own separate wishlist stored in localStorage.
 */
function wlKey(){
  const u = currentUser() || "_anon";
  return LS_WL_PREFIX + u;
}

// Retrieve the wishlist array from localStorage, or an empty array if none exists.
function getWishlist(){
  try {
    return JSON.parse(localStorage.getItem(wlKey()) || "[]");
  } catch(e){
    return [];
  }
}

// Write the wishlist array back to localStorage and re-render the wishlist view.
function setWishlist(arr){
  localStorage.setItem(wlKey(), JSON.stringify(arr));
  renderWishlist();
}

/**
 * Add an item to the wishlist. Items can originate from tables (ns=ebooks,
 * poetry, extras) or manual/ISBN/photo entries. Each entry contains a
 * title and optional fields for author, URL, ISBN, assignee, note and
 * photo (as a data URL).
 */
function addToWishlist(item){
  const wl = getWishlist();
  // Use timestamp + random string as ID; ensures uniqueness even under rapid additions.
  const id = Date.now() + "_" + Math.random().toString(36).slice(2,6);
  wl.push({
    id,
    title: item.title || "Untitled",
    author: item.author || "",
    url: item.url || "",
    source: item.source || "",
    isbn: item.isbn || "",
    assignee: item.assignee || "",
    note: item.note || "",
    photo: item.photo || null
  });
  setWishlist(wl);
  alert("Saved to wishlist ⭐");
}

// Remove an entry from the wishlist by ID.
function removeFromWishlist(id){
  const wl = getWishlist().filter(x => x.id !== id);
  setWishlist(wl);
}

// Update the assignee for a given wishlist item.
function updateAssignee(id, name){
  const wl = getWishlist().map(x => x.id === id ? {...x, assignee: name} : x);
  setWishlist(wl);
}

/**
 * Render the wishlist into the #wishlistList container. Also hooks up event
 * handlers for removal and updating assignees, as well as update counts.
 */
function renderWishlist(){
  const box = document.getElementById('wishlistList');
  const items = getWishlist();
  document.getElementById('wlCount').textContent = `${items.length} items saved`;
  if(!items.length){
    box.innerHTML = '<p class="note">Nothing here yet. Add from any tab, type manually, scan ISBN, or attach a photo.</p>';
    return;
  }
  box.innerHTML = items.map(it => `
    <div class="wl-grid" style="border-bottom:1px solid var(--border);padding:8px 0">
      <div>
        <div class="wl-title">${it.title}${it.author?` — <span class="wl-meta">${it.author}</span>`:""}</div>
        <div class="wl-meta">${it.source?`Source: ${it.source} • `:""}${it.isbn?`ISBN: ${it.isbn} • `:""}${it.url?`<a href="${it.url}" target="_blank" rel="noopener">Open link</a>`:""}</div>
        ${it.photo?`<div style="margin-top:6px"><img src="${it.photo}" alt="cover" style="max-width:180px;border-radius:8px;border:1px solid #2a2f42"/></div>`:""}
        <div class="assign">
          <label for="ass_${it.id}">Assigned to:</label>
          <input id="ass_${it.id}" class="input" style="width:200px" value="${it.assignee||""}" data-assign="${it.id}" placeholder="Name"/>
        </div>
      </div>
      <div class="wl-actions">
        <button class="btn danger" data-del="${it.id}">Remove</button>
      </div>
    </div>
  `).join("");
  // Attach handlers for remove buttons and assignee inputs.
  box.querySelectorAll('button[data-del]').forEach(b => b.addEventListener('click', () => removeFromWishlist(b.getAttribute('data-del'))));
  box.querySelectorAll('input[data-assign]').forEach(i => i.addEventListener('change', () => updateAssignee(i.getAttribute('data-assign'), i.value.trim())));
}

// Initial render of wishlist.
renderWishlist();

// Clear all wishlist entries for the current user.
document.getElementById('clearWishlist').addEventListener('click', () =>{
  if(confirm("Clear all wishlist items for this user?")) setWishlist([]);
});

// Export wishlist to Markdown and copy it to clipboard.
document.getElementById('exportMd').addEventListener('click', () =>{
  const wl = getWishlist();
  const md = [
    `# Lit & Laid Wishlist (${currentUser()||"anonymous"})`,
    "",
    "| Title | Author | ISBN | Link | Source | Assigned |",
    "|---|---|---|---|---|---|",
    ...wl.map(x => `| ${x.title||""} | ${x.author||""} | ${x.isbn||""} | ${x.url?`[link](${x.url})`:""} | ${x.source||""} | ${x.assignee||""} |`)
  ].join("\n");
  navigator.clipboard.writeText(md).then(
    () => alert("Markdown copied ✅"),
    () => alert("Copy blocked by browser")
  );
});

/* ------------------ Manual / Photo / ISBN Add ------------------ */

// Add a book manually to the wishlist (from title, author, url inputs).
document.getElementById('addManual').addEventListener('click', () =>{
  const title = document.getElementById('manualTitle').value.trim();
  if(!title){
    alert("Add a title");
    return;
  }
  const author = document.getElementById('manualAuthor').value.trim();
  const url = document.getElementById('manualUrl').value.trim();
  addToWishlist({title, author, url, source:"manual"});
  document.getElementById('manualTitle').value = "";
  document.getElementById('manualAuthor').value = "";
  document.getElementById('manualUrl').value = "";
});

// Add a book with a cover photo. The image is stored as a data URL in localStorage.
document.getElementById('addPhoto').addEventListener('click', async () =>{
  const title = document.getElementById('photoTitle').value.trim();
  if(!title){
    alert("Type the title you see on the cover");
    return;
  }
  const author = document.getElementById('photoAuthor').value.trim();
  const file = document.getElementById('photoFile').files[0];
  let dataUrl = null;
  if(file){
    const buf = await file.arrayBuffer();
    const blob = new Blob([new Uint8Array(buf)], {type:file.type});
    dataUrl = await new Promise(res => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.readAsDataURL(blob);
    });
  }
  addToWishlist({title, author, photo: dataUrl, source:"photo"});
  document.getElementById('photoTitle').value = "";
  document.getElementById('photoAuthor').value = "";
  document.getElementById('photoFile').value = "";
});

// Add a book by typing an ISBN. We accept digits and X/x; all other characters are stripped.
document.getElementById('addIsbnBtn').addEventListener('click', () =>{
  const val = document.getElementById('isbnInput').value.replace(/[^0-9Xx]/g,'').trim();
  if(!val){
    alert("Enter an ISBN");
    return;
  }
  addToWishlist({title:`ISBN ${val}`, isbn: val, source:"isbn"});
  document.getElementById('isbnInput').value = "";
});

/* ------------------ Camera ISBN scanner (BarcodeDetector) ------------------ */

const video = document.getElementById('video');
const startScan = document.getElementById('startScan');
const stopScan = document.getElementById('stopScan');
const scanStatus = document.getElementById('scanStatus');
let stream = null, rafId = null, detector = null, scanning = false;

// Initialize a barcode detector if the browser supports it. Returns true if supported.
async function initDetector(){
  if('BarcodeDetector' in window){
    const formats = ['ean_13','ean_8','upc_e','upc_a','code_128','code_39','itf','codabar','qr_code'];
    try{
      detector = new BarcodeDetector({formats});
      return true;
    }catch(e){
      return false;
    }
  }
  return false;
}

// Display the current state of the scanner in the UI.
function setScanState(txt){
  scanStatus.innerHTML = `Scanner: <span class="kbd">${txt}</span>`;
}

// Start scanning barcodes using the camera.
startScan.addEventListener('click', async () =>{
  if(scanning) return;
  const ok = await initDetector();
  if(!ok){
    alert("BarcodeDetector not supported on this browser. Please type the ISBN.");
    return;
  }
  try{
    stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"}});
    video.srcObject = stream;
    await video.play();
    scanning = true;
    startScan.disabled = true;
    stopScan.disabled = false;
    setScanState("running…");
    const tick = async () =>{
      if(!scanning) return;
      try{
        const codes = await detector.detect(video);
        if(codes && codes.length){
          const best = codes[0].rawValue || "";
          if(best){
            setScanState(`detected: ${best}`);
            addToWishlist({title:`ISBN ${best}`, isbn:best, source:"isbn-scan"});
            alert(`Scanned and saved: ISBN ${best} ✅`);
            stopScan.click();
            return;
          }
        }
      }catch(e){
        // ignore errors, keep scanning
      }
      rafId = requestAnimationFrame(tick);
    };
    tick();
  }catch(err){
    alert("Camera access denied or unavailable.");
  }
});

// Stop scanning and clean up camera resources.
stopScan.addEventListener('click', () =>{
  scanning = false;
  startScan.disabled = false;
  stopScan.disabled = true;
  setScanState("stopped");
  if(rafId) cancelAnimationFrame(rafId);
  if(stream){
    stream.getTracks().forEach(t => t.stop());
    stream = null;
  }
  video.pause();
  video.srcObject = null;
});

// By default, scanning is idle.
setScanState("idle");
