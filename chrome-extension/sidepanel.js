const API_BASE = "https://awesome.manus.space/api/extension";
const SITE_BASE = "https://awesome.manus.space";

let currentTab = "browse";
let currentOffset = 0;
let currentTotal = 0;
let allUseCases = [];
let debounceTimer = null;

// Multi-select state
let selectMode = false;
let selectedItems = new Map(); // slug -> { title, url, replayUrl }

// --- Init ---
document.addEventListener("DOMContentLoaded", async () => {
  setupTabs();
  setupSearch();
  setupSelectMode();
  await loadCategories();
  await loadUseCases();
});

// --- Tabs ---
function setupTabs() {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      currentTab = tab.dataset.tab;
      currentOffset = 0;
      allUseCases = [];

      if (currentTab === "collections") {
        loadCollections();
      } else if (currentTab === "highlights") {
        loadHighlights();
      } else {
        loadUseCases();
      }
    });
  });
}

// --- Search ---
function setupSearch() {
  const searchInput = document.getElementById("searchInput");
  const categoryFilter = document.getElementById("categoryFilter");
  const sortFilter = document.getElementById("sortFilter");

  searchInput.addEventListener("input", () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      currentOffset = 0;
      allUseCases = [];
      if (currentTab === "browse") loadUseCases();
      else if (currentTab === "highlights") loadHighlights();
    }, 300);
  });

  categoryFilter.addEventListener("change", () => {
    currentOffset = 0;
    allUseCases = [];
    if (currentTab === "browse") loadUseCases();
    else if (currentTab === "highlights") loadHighlights();
  });

  sortFilter.addEventListener("change", () => {
    currentOffset = 0;
    allUseCases = [];
    if (currentTab === "browse") loadUseCases();
    else if (currentTab === "highlights") loadHighlights();
  });
}

// --- Multi-Select Mode ---
function setupSelectMode() {
  const selectModeBtn = document.getElementById("selectModeBtn");
  const clearSelectBtn = document.getElementById("clearSelectBtn");
  const openGroupBtn = document.getElementById("openGroupBtn");

  selectModeBtn.addEventListener("click", () => {
    selectMode = !selectMode;
    selectModeBtn.classList.toggle("active", selectMode);

    if (!selectMode) {
      clearSelection();
    }

    // Re-render current view to show/hide checkboxes
    if (currentTab === "browse" || currentTab === "highlights") {
      renderUseCases(allUseCases, currentTab === "highlights");
    }
  });

  clearSelectBtn.addEventListener("click", () => {
    clearSelection();
    // Re-render to uncheck all
    if (currentTab === "browse" || currentTab === "highlights") {
      renderUseCases(allUseCases, currentTab === "highlights");
    }
  });

  openGroupBtn.addEventListener("click", () => {
    if (selectedItems.size === 0) return;

    const urls = Array.from(selectedItems.values()).map((item) => item.url);
    const count = selectedItems.size;
    const categoryName = document.getElementById("categoryFilter").selectedOptions[0]?.textContent || "";
    const groupName = categoryName && categoryName !== "All Categories"
      ? `Manus: ${categoryName} (${count})`
      : `Manus Use Cases (${count})`;

    chrome.runtime.sendMessage({
      action: "openTabGroup",
      urls,
      groupName,
    });

    // Visual feedback
    openGroupBtn.textContent = "Opening...";
    setTimeout(() => {
      openGroupBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg> Open as Tab Group`;
    }, 1500);
  });
}

function clearSelection() {
  selectedItems.clear();
  updateSelectBar();
}

function toggleSelection(slug, title, replayUrl) {
  const url = `${SITE_BASE}/use-case/${slug}`;
  if (selectedItems.has(slug)) {
    selectedItems.delete(slug);
  } else {
    selectedItems.set(slug, { title, url, replayUrl });
  }
  updateSelectBar();
}

function updateSelectBar() {
  const selectBar = document.getElementById("selectBar");
  const selectCount = document.getElementById("selectCount");

  if (selectMode && selectedItems.size > 0) {
    selectBar.classList.remove("hidden");
    selectCount.textContent = selectedItems.size;
  } else {
    selectBar.classList.add("hidden");
  }
}

// --- Load Categories ---
async function loadCategories() {
  try {
    const res = await fetch(`${API_BASE}/categories`);
    const data = await res.json();
    const select = document.getElementById("categoryFilter");

    // Group by type
    const jobFunctions = data.categories.filter((c) => c.type === "job_function");
    const features = data.categories.filter((c) => c.type === "feature");

    if (jobFunctions.length > 0) {
      const group = document.createElement("optgroup");
      group.label = "By Job Function";
      jobFunctions.forEach((cat) => {
        const opt = document.createElement("option");
        opt.value = cat.slug;
        opt.textContent = cat.name;
        group.appendChild(opt);
      });
      select.appendChild(group);
    }

    if (features.length > 0) {
      const group = document.createElement("optgroup");
      group.label = "By Feature";
      features.forEach((cat) => {
        const opt = document.createElement("option");
        opt.value = cat.slug;
        opt.textContent = cat.name;
        group.appendChild(opt);
      });
      select.appendChild(group);
    }
  } catch (err) {
    console.error("Failed to load categories:", err);
  }
}

// --- Load Use Cases ---
async function loadUseCases(append = false) {
  const content = document.getElementById("content");
  if (!append) {
    content.innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading use cases...</p></div>';
  }

  try {
    const search = document.getElementById("searchInput").value.trim();
    const category = document.getElementById("categoryFilter").value;
    const sort = document.getElementById("sortFilter").value;

    const params = new URLSearchParams({
      sort,
      limit: "30",
      offset: String(currentOffset),
    });
    if (search) params.set("search", search);
    if (category) params.set("category", category);

    const res = await fetch(`${API_BASE}/use-cases?${params}`);
    const data = await res.json();

    currentTotal = data.total;
    allUseCases = append ? [...allUseCases, ...data.useCases] : data.useCases;

    renderUseCases(allUseCases);
  } catch (err) {
    content.innerHTML = '<div class="empty-state"><p>Failed to load use cases. Please try again.</p></div>';
    console.error("Failed to load use cases:", err);
  }
}

// --- Load Highlights ---
async function loadHighlights() {
  const content = document.getElementById("content");
  content.innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading highlights...</p></div>';

  try {
    const search = document.getElementById("searchInput").value.trim();
    const category = document.getElementById("categoryFilter").value;
    const sort = document.getElementById("sortFilter").value;

    const params = new URLSearchParams({
      sort,
      limit: "50",
      offset: "0",
    });
    if (search) params.set("search", search);
    if (category) params.set("category", category);

    const res = await fetch(`${API_BASE}/use-cases?${params}`);
    const data = await res.json();

    const highlights = data.useCases.filter((uc) => uc.isHighlight);
    allUseCases = highlights;
    renderUseCases(highlights, true);
  } catch (err) {
    content.innerHTML = '<div class="empty-state"><p>Failed to load highlights.</p></div>';
  }
}

// --- Load Collections ---
async function loadCollections() {
  const content = document.getElementById("content");
  content.innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading collections...</p></div>';

  try {
    const res = await fetch(`${API_BASE}/collections`);
    const data = await res.json();

    if (!data.collections || data.collections.length === 0) {
      content.innerHTML = '<div class="empty-state"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg><p>No collections available yet.</p></div>';
      return;
    }

    content.innerHTML = data.collections
      .map(
        (coll) => `
      <div class="collection-card">
        <div class="collection-title">${escapeHtml(coll.title)}</div>
        ${coll.description ? `<div class="collection-desc">${escapeHtml(coll.description)}</div>` : ""}
        <div class="collection-items">
          ${coll.useCases
            .map(
              (uc) => `
            <div class="collection-item" data-slug="${escapeHtml(uc.slug)}" data-replay="${escapeHtml(uc.sessionReplayUrl || "")}" data-deliverable="${escapeHtml(uc.deliverableUrl || "")}">
              <span class="collection-item-title">${escapeHtml(uc.title)}</span>
              <span class="collection-item-arrow">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
              </span>
            </div>
          `
            )
            .join("")}
        </div>
      </div>
    `
      )
      .join("");

    // Add click handlers
    content.querySelectorAll(".collection-item").forEach((item) => {
      item.addEventListener("click", () => {
        const slug = item.dataset.slug;
        openUrl(`${SITE_BASE}/use-case/${slug}`);
      });
    });
  } catch (err) {
    content.innerHTML = '<div class="empty-state"><p>Failed to load collections.</p></div>';
  }
}

// --- Render Use Cases ---
function renderUseCases(useCases, isHighlightTab = false) {
  const content = document.getElementById("content");

  if (useCases.length === 0) {
    const msg = isHighlightTab ? "No highlighted use cases found." : "No use cases found matching your search.";
    content.innerHTML = `<div class="empty-state">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <p>${msg}</p>
    </div>`;
    return;
  }

  const checkSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;

  const cards = useCases
    .map((uc) => {
      const isSelected = selectedItems.has(uc.slug);
      const selectedClass = isSelected ? " selected" : "";
      const selectableClass = selectMode ? " selectable" : "";

      return `
    <div class="uc-card${selectableClass}${selectedClass}" data-slug="${escapeHtml(uc.slug)}" data-title="${escapeHtml(uc.title)}" data-replay="${escapeHtml(uc.sessionReplayUrl || "")}">
      ${selectMode ? `<div class="uc-checkbox">${checkSvg}</div>` : ""}
      ${
        uc.thumbnailUrl
          ? `<img class="uc-thumb" src="${escapeHtml(uc.thumbnailUrl)}" alt="" loading="lazy">`
          : `<div class="uc-thumb-placeholder">${uc.title.charAt(0).toUpperCase()}</div>`
      }
      <div class="uc-info">
        <div class="uc-title">${escapeHtml(uc.title)}</div>
        <div class="uc-desc">${escapeHtml(uc.description)}</div>
        <div class="uc-meta">
          ${uc.isHighlight ? '<span class="uc-badge highlight">Highlight</span>' : ""}
          ${uc.score ? `<span class="uc-badge score">&#9733; ${escapeHtml(uc.score)}</span>` : ""}
          <span>${uc.views || 0} views</span>
          <span>${uc.upvotes || 0} upvotes</span>
        </div>
      </div>
      ${
        !selectMode
          ? `<div class="uc-actions">
        <button class="uc-action-btn" data-action="detail" data-slug="${escapeHtml(uc.slug)}" title="View details">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        </button>
        ${
          uc.sessionReplayUrl
            ? `<button class="uc-action-btn" data-action="replay" data-url="${escapeHtml(uc.sessionReplayUrl)}" title="Watch session replay">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          </button>`
            : ""
        }
      </div>`
          : ""
      }
    </div>
  `;
    })
    .join("");

  const hasMore = !isHighlightTab && allUseCases.length < currentTotal;
  const loadMoreBtn = hasMore ? `<button class="load-more" id="loadMoreBtn">Load more (${allUseCases.length} of ${currentTotal})</button>` : "";

  content.innerHTML = cards + loadMoreBtn;

  // Click handlers for cards
  content.querySelectorAll(".uc-card").forEach((card) => {
    card.addEventListener("click", (e) => {
      // Don't trigger card click if action button was clicked
      if (e.target.closest(".uc-action-btn")) return;

      const slug = card.dataset.slug;
      const title = card.dataset.title;
      const replayUrl = card.dataset.replay;

      if (selectMode) {
        // Toggle selection
        toggleSelection(slug, title, replayUrl);
        card.classList.toggle("selected");
        // Update checkbox visual
        const checkbox = card.querySelector(".uc-checkbox");
        if (checkbox) {
          const svg = checkbox.querySelector("svg");
          if (svg) {
            svg.style.opacity = card.classList.contains("selected") ? "1" : "0";
          }
        }
      } else {
        openUrl(`${SITE_BASE}/use-case/${slug}`);
      }
    });
  });

  // Click handlers for action buttons (only in non-select mode)
  if (!selectMode) {
    content.querySelectorAll(".uc-action-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const action = btn.dataset.action;
        if (action === "detail") {
          openUrl(`${SITE_BASE}/use-case/${btn.dataset.slug}`);
        } else if (action === "replay") {
          openUrl(btn.dataset.url);
        }
      });
    });
  }

  // Load more handler
  if (hasMore) {
    document.getElementById("loadMoreBtn").addEventListener("click", () => {
      currentOffset += 30;
      loadUseCases(true);
    });
  }
}

// --- Helpers ---
function openUrl(url) {
  chrome.tabs.create({ url });
}

function escapeHtml(str) {
  if (!str) return "";
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
