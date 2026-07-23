// ============================================================
// Firebase Auth & Firestore State Variables
// ============================================================
let currentUser = null;
let currentUserProfile = null; // { uid, email, userName, role: 'admin'|'user' }
let authMode = "login"; // "login" or "signup"
let firestoreUnsubscribe = null;

const currentTheme = localStorage.getItem("amazonTheme") || "light";
if (currentTheme === "dark") {
  document.body.classList.add("dark-mode");
} else {
  document.body.classList.remove("dark-mode");
}

let teamUsers = JSON.parse(localStorage.getItem("amazonUsers"));
if (!teamUsers || !Array.isArray(teamUsers)) {
  teamUsers = ["Ashir Butt", "Abdul Rehman", "Syed Mehmood", "Syed Junaid", "Mughees",];
  localStorage.setItem("amazonUsers", JSON.stringify(teamUsers));
}
let defaultUser = localStorage.getItem("amazonDefaultUser") || "";

const defaultCounters = [
  {
    id: "invoice",
    label: "Invoices Made",
    icon: "fa-solid fa-file-invoice",
    isDefault: true,
    active: true,
  },
  {
    id: "submission",
    label: "Submission",
    icon: "fa-solid fa-paper-plane",
    isDefault: true,
    active: true,
  },
  {
    id: "cases",
    label: "Cases Open",
    icon: "fa-solid fa-folder-open",
    isDefault: true,
    active: true,
  },
  {
    id: "reopen",
    label: "Reopen Cases",
    icon: "fa-solid fa-rotate",
    isDefault: true,
    active: true,
  },
  {
    id: "approval",
    label: "Approval",
    icon: "fa-solid fa-circle-check",
    isDefault: true,
    active: true,
  },
  {
    id: "ungate",
    label: "Auto Ungate",
    icon: "fa-solid fa-bolt",
    isDefault: true,
    active: true,
  },
  {
    id: "copyListing",
    label: "Copy Listing",
    icon: "fa-solid fa-copy",
    isDefault: true,
    active: true,
  },
];
let configCounters = JSON.parse(localStorage.getItem("amazonCounters"));
if (!configCounters || !Array.isArray(configCounters)) {
  configCounters = defaultCounters;
  localStorage.setItem("amazonCounters", JSON.stringify(configCounters));
} else {
  // Safe upgrade and migration for default counters
  configCounters.forEach((c) => {
    if (c.id === "approval" && c.label === "Approval (Ungated)") {
      c.label = "Approval";
    }
  });
  defaultCounters.forEach((dc) => {
    if (!configCounters.find((c) => c.id === dc.id)) {
      configCounters.push(dc);
    }
  });
  localStorage.setItem("amazonCounters", JSON.stringify(configCounters));
}

// Counter Premium Colors Palette
const counterColors = {
  invoice: "#3b82f6",
  submission: "#8b5cf6",
  cases: "#f59e0b",
  reopen: "#f43f5e",
  approval: "#10b981",
  ungate: "#06b6d4",
  copyListing: "#6366f1",
};
const defaultPresetColors = [
  "#3b82f6",
  "#8b5cf6",
  "#f59e0b",
  "#f43f5e",
  "#10b981",
  "#06b6d4",
  "#6366f1",
  "#ec4899",
  "#14b8a6",
  "#f97316",
];

function getCounterColor(counterId, index) {
  if (counterColors[counterId]) return counterColors[counterId];
  return defaultPresetColors[index % defaultPresetColors.length];
}

// DOM References
const form = document.getElementById("workForm");
const tableBody = document.getElementById("tableBody");
const date = document.getElementById("date");
const notes = document.getElementById("notes");
const blocker = document.getElementById("blocker");
const company = document.getElementById("company");
const userName = document.getElementById("userName");
const searchFilter = document.getElementById("searchFilter");
const dateFilter = document.getElementById("dateFilter");

let workData = JSON.parse(localStorage.getItem("amazonWork")) || [];
let activeUserTab = "all";

// Database Migration: Ensure all records have a unique ID
let idsMigrated = false;
workData.forEach((item) => {
  if (!item.id) {
    item.id = "row_" + Date.now() + "_" + Math.random().toString(36).substring(2, 11);
    idsMigrated = true;
  }
});
if (idsMigrated) {
  localStorage.setItem("amazonWork", JSON.stringify(workData));
}

// Load Google Sheets Sync configurations
let googleSyncEnabled = localStorage.getItem("amazonGoogleSyncEnabled") === "true";
let googleSyncUrl = localStorage.getItem("amazonGoogleSyncUrl") || "";
let localBackupRetention = localStorage.getItem("amazonLocalBackupRetention") || "none";

// Company Management System variables
const defaultCompanies = [
  "Amer Canada",
  "BoldBuy",
  "BUBH",
  "Bzable",
  "Cornercart",
  "Eblitz",
  "Good Choice",
  "HBinnovate",
  "IR Tech",
  "KDOT",
  "OaksMax",
  "OCEANPATH",
  "POLAR HORIZON",
  "Primeshopes",
  "URBAN BAZAAR",
  "ValueVault",
  "9teen Trades",
];
let companies = JSON.parse(localStorage.getItem("amazonCompanies"));
if (!companies || !Array.isArray(companies)) {
  companies = defaultCompanies;
  localStorage.setItem("amazonCompanies", JSON.stringify(companies));
}
let editingCompanyIndex = -1;
let editingUserIndex = -1;

function populateCompanyDropdown() {
  if (!company) return;
  const currentSelected = company.value;
  company.innerHTML = '<option value="">Select Company</option>';
  companies.forEach((co) => {
    const opt = document.createElement("option");
    opt.value = co;
    opt.textContent = co;
    company.appendChild(opt);
  });
  if (companies.includes(currentSelected)) {
    company.value = currentSelected;
  } else {
    company.selectedIndex = 0;
  }
}

function populateUserDropdown() {
  if (!userName) return;
  const currentSelected = userName.value;
  userName.innerHTML = '<option value="">Select User</option>';
  teamUsers.forEach((user) => {
    const opt = document.createElement("option");
    opt.value = user;
    opt.textContent = user;
    userName.appendChild(opt);
  });
  if (teamUsers.includes(currentSelected)) {
    userName.value = currentSelected;
  } else if (defaultUser && teamUsers.includes(defaultUser)) {
    userName.value = defaultUser;
  } else {
    userName.selectedIndex = 0;
  }
}

// Load global blocker
if (blocker) {
  blocker.value = localStorage.getItem("amazonBlocker") || "";
}
let editIndex = -1;

// Today's Date
date.valueAsDate = new Date();

// ============================================================
// Settings Modal Tab & Actions Logic
// ============================================================
window.openSettingsModal = function () {
  if (!currentUser || (currentUserProfile && currentUserProfile.role === "guest")) {
    showToast("Guest mode is read-only. Please Login to access Settings.", "warning", "Login");
    return;
  }
  document.getElementById("settingsModal").style.display = "flex";
  switchSettingsTab("users");
  renderSettingsUsers();
  renderSettingsCounters();

  const darkModeToggle = document.getElementById("darkModeToggle");
  if (darkModeToggle) {
    darkModeToggle.checked =
      document.body.classList.contains("dark-mode");
  }

  const urlInput = document.getElementById("googleSyncUrl");
  if (urlInput) urlInput.value = googleSyncUrl;

  const toggleInput = document.getElementById("googleSyncToggle");
  if (toggleInput) {
    toggleInput.checked = googleSyncEnabled;
    // Slider visual update on modal open
    const slider = document.getElementById("googleSyncSlider");
    if (slider) {
      slider.style.background = googleSyncEnabled ? "#4f46e5" : "#cbd5e1";
      const circle = slider.querySelector("span");
      if (circle) circle.style.left = googleSyncEnabled ? "23px" : "3px";
    }
  }

  const retentionInput = document.getElementById("localBackupRetention");
  if (retentionInput) retentionInput.value = localBackupRetention;
};

window.closeSettingsModal = function () {
  document.getElementById("settingsModal").style.display = "none";
  renderUI();
};

window.switchSettingsTab = function (tabName) {
  document.getElementById("settingsPanel-users").style.display = "none";
  document.getElementById("settingsPanel-counters").style.display =
    "none";
  document.getElementById("settingsPanel-appearance").style.display =
    "none";
  document.getElementById("settingsPanel-guide").style.display = "none";
  document.getElementById("settingsPanel-gsync").style.display = "none";
  if (document.getElementById("settingsPanel-owner")) {
    document.getElementById("settingsPanel-owner").style.display = "none";
  }

  document.getElementById(`settingsPanel-${tabName}`).style.display =
    "block";

  const tabs = document.querySelectorAll(".settings-tab");
  tabs.forEach((btn) => {
    if (btn.id === `tab-${tabName}`) {
      btn.classList.add("active");
      btn.style.color = "#ff9900";
      btn.style.borderBottomColor = "#ff9900";
    } else {
      btn.classList.remove("active");
      btn.style.color = "var(--color-label)";
      btn.style.borderBottomColor = "transparent";
    }
  });

  if (tabName === "owner") {
    renderOwnerSettings();
  }
};

window.renderSettingsUsers = function () {
  const wrapper = document.getElementById("userListWrapper");
  if (!wrapper) return;
  wrapper.innerHTML = "";

  if (teamUsers.length === 0) {
    wrapper.innerHTML = `
            <div style="padding: 15px; text-align: center; color: var(--color-label); font-style: italic;">
              No team members added yet.
            </div>
          `;
    return;
  }

  teamUsers.forEach((user, idx) => {
    const isDefault = defaultUser === user;
    const div = document.createElement("div");
    div.style.display = "flex";
    div.style.justifyContent = "space-between";
    div.style.alignItems = "center";
    div.style.gap = "12px";
    div.style.padding = "10px 12px";
    div.style.background =
      idx % 2 === 0 ? "var(--bg-modal)" : "var(--bg-form-col)";
    div.style.borderBottom =
      idx < teamUsers.length - 1
        ? "1px solid var(--color-border)"
        : "none";

    if (editingUserIndex === idx) {
      div.innerHTML = `
              <input type="text" id="editUserVal_${idx}" value="${user.replace(/"/g, "&quot;")}" style="flex: 1; padding: 6px 10px; border: 1.5px solid #ff9900; border-radius: 6px; font-size: 13px; outline: none; margin-right: 8px; min-width: 0; background: var(--bg-input); color: var(--color-input-text);" />
              <div style="display: flex; gap: 4px; flex-shrink: 0;">
                <button type="button" class="save-btn" style="padding: 6px 10px; font-size: 11px; margin: 0; background: #10b981;" onclick="saveUserEdit(${idx})">
                  <i class="fa-solid fa-check"></i>
                </button>
                <button type="button" class="delete-btn" style="padding: 6px 10px; font-size: 11px; margin: 0; background: #64748b;" onclick="cancelUserEdit()">
                  <i class="fa-solid fa-xmark"></i>
                </button>
              </div>
            `;
    } else {
      div.innerHTML = `
              <span style="font-size: 14px; font-weight: 500; color: var(--color-text-main); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1;" title="${user.replace(/"/g, "&quot;")}">
                ${user} ${isDefault ? '<span style="color:#ff9900; font-size:11px; font-weight:700; margin-left:6px;">(Default)</span>' : ""}
              </span>
              <div style="display: flex; gap: 4px; flex-shrink: 0;">
                <button type="button" class="edit-btn" style="padding: 6px 10px; font-size: 11px; margin: 0;" onclick="startUserEdit(${idx})">
                  <i class="fa-solid fa-pen"></i>
                </button>
                <button type="button" class="delete-btn" style="padding: 6px 10px; font-size: 11px; margin: 0;" onclick="deleteUser(${idx})">
                  <i class="fa-solid fa-trash"></i>
                </button>
              </div>
            `;
    }
    wrapper.appendChild(div);
  });

  const defaultSelect = document.getElementById("defaultUserSelect");
  if (defaultSelect) {
    defaultSelect.innerHTML = '<option value="">None</option>';
    teamUsers.forEach((user) => {
      const opt = document.createElement("option");
      opt.value = user;
      opt.textContent = user;
      if (user === defaultUser) {
        opt.selected = true;
      }
      defaultSelect.appendChild(opt);
    });
  }

  populateUserDropdown();
};

window.addUser = function () {
  if (!currentUser || (currentUserProfile && currentUserProfile.role === "guest")) {
    showToast("Guest mode is read-only. Please Login to add users.", "error", "Login");
    return;
  }
  const input = document.getElementById("newUserName");
  if (!input) return;
  const val = input.value.trim();

  if (!val) {
    alert("Please enter a valid name.");
    return;
  }

  const exists = teamUsers.some(
    (u) => u.toLowerCase() === val.toLowerCase(),
  );
  if (exists) {
    alert("This user name already exists.");
    return;
  }

  teamUsers.push(val);
  localStorage.setItem("amazonUsers", JSON.stringify(teamUsers));
  input.value = "";
  renderSettingsUsers();
};

window.deleteUser = function (idx) {
  const name = teamUsers[idx];
  promptOwnerPin(() => {
    openArchiveReasonModal(name, idx);
  });
};

window.startUserEdit = function (idx) {
  editingUserIndex = idx;
  renderSettingsUsers();
  const input = document.getElementById(`editUserVal_${idx}`);
  if (input) {
    input.focus();
    input.select();
  }
};

window.saveUserEdit = function (idx) {
  const input = document.getElementById(`editUserVal_${idx}`);
  if (!input) return;
  const val = input.value.trim();

  if (!val) {
    alert("Please enter a valid name.");
    return;
  }

  const exists = teamUsers.some(
    (u, i) => i !== idx && u.toLowerCase() === val.toLowerCase(),
  );
  if (exists) {
    alert("This user name already exists.");
    return;
  }

  const oldName = teamUsers[idx];
  teamUsers[idx] = val;
  localStorage.setItem("amazonUsers", JSON.stringify(teamUsers));

  // Update defaultUser if the edited user was the default
  if (defaultUser === oldName) {
    defaultUser = val;
    localStorage.setItem("amazonDefaultUser", val);
  }

  // Update existing work records with the old name
  let updated = false;
  workData.forEach((item) => {
    if (item.userName === oldName) {
      item.userName = val;
      updated = true;
    }
  });
  if (updated) {
    localStorage.setItem("amazonWork", JSON.stringify(workData));
    loadData();
  }

  editingUserIndex = -1;
  renderSettingsUsers();
};

window.cancelUserEdit = function () {
  editingUserIndex = -1;
  renderSettingsUsers();
};

window.saveDefaultUser = function () {
  const defaultSelect = document.getElementById("defaultUserSelect");
  if (defaultSelect) {
    defaultUser = defaultSelect.value;
    if (defaultUser) {
      localStorage.setItem("amazonDefaultUser", defaultUser);
    } else {
      localStorage.removeItem("amazonDefaultUser");
    }
    renderSettingsUsers();
  }
};

window.renderSettingsCounters = function () {
  const listContainer = document.getElementById("counterToggleList");
  if (!listContainer) return;
  listContainer.innerHTML = "";

  configCounters.forEach((c, idx) => {
    const div = document.createElement("div");
    div.style.display = "flex";
    div.style.alignItems = "center";
    div.style.justifyContent = "space-between";
    div.style.background = "var(--bg-form-col)";
    div.style.padding = "10px 14px";
    div.style.borderRadius = "8px";
    div.style.border = "1.5px solid var(--color-border)";

    let deleteBtnHtml = "";
    if (!c.isDefault) {
      deleteBtnHtml = `
              <button type="button" class="delete-btn" style="padding: 4px 8px; font-size: 11px; margin: 0 0 0 10px;" onclick="deleteCustomCounter(${idx})">
                <i class="fa-solid fa-trash"></i>
              </button>
            `;
    }

    div.innerHTML = `
            <div style="display:flex; align-items:center; gap:10px;">
              <i class="${c.icon}" style="color: #ff9900; font-size: 16px; width: 20px; text-align: center;"></i>
              <span style="font-size: 13px; font-weight: 600; color: var(--color-text-main);">${c.label} ${!c.isDefault ? '<span style="color:#3b82f6; font-size:10px; font-weight:700; margin-left:4px;">(Custom)</span>' : ""}</span>
            </div>
            <div style="display:flex; align-items:center;">
              <label style="position:relative; display:inline-block; width:36px; height:20px; cursor:pointer;">
                <input type="checkbox" id="toggle-counter-${c.id}" ${c.active ? "checked" : ""} onchange="toggleCounterActive(${idx})" style="opacity:0; width:0; height:0;">
                <span style="position:absolute; inset:0; background:${c.active ? "#10b981" : "#cbd5e1"}; border-radius:20px; transition:0.3s; cursor:pointer;">
                  <span style="position:absolute; height:14px; width:14px; left:${c.active ? "19px" : "3px"}; bottom:3px; background:#fff; border-radius:50%; transition:0.3s;"></span>
                </span>
              </label>
              ${deleteBtnHtml}
            </div>
          `;
    listContainer.appendChild(div);
  });
};

window.toggleCounterActive = function (idx) {
  configCounters[idx].active = !configCounters[idx].active;
  localStorage.setItem("amazonCounters", JSON.stringify(configCounters));
  renderSettingsCounters();
};

window.addCustomCounter = function () {
  if (!currentUser || (currentUserProfile && currentUserProfile.role === "guest")) {
    showToast("Guest mode is read-only. Please Login to manage counters.", "error", "Login");
    return;
  }
  const labelInp = document.getElementById("customCounterLabel");
  const iconInp = document.getElementById("customCounterIcon");
  if (!labelInp || !iconInp) return;

  const label = labelInp.value.trim();
  let icon = iconInp.value.trim();

  if (!label) {
    alert("Please enter a label for the counter.");
    return;
  }

  if (!icon) {
    icon = "fa-solid fa-star";
  } else if (!icon.startsWith("fa-")) {
    icon = "fa-solid " + icon;
  }

  const id = "custom_" + label.toLowerCase().replace(/[^a-z0-9]/g, "_");

  const exists = configCounters.some(
    (c) => c.id === id || c.label.toLowerCase() === label.toLowerCase(),
  );
  if (exists) {
    alert("A counter with this label already exists.");
    return;
  }

  configCounters.push({
    id: id,
    label: label,
    icon: icon,
    isDefault: false,
    active: true,
  });

  localStorage.setItem("amazonCounters", JSON.stringify(configCounters));

  labelInp.value = "";
  iconInp.value = "fa-solid fa-star";
  renderSettingsCounters();
};

window.deleteCustomCounter = function (idx) {
  const counter = configCounters[idx];
  if (counter.isDefault) return;

  if (
    confirm(
      `Are you sure you want to delete custom counter "${counter.label}"? This will hide it from view permanently.`,
    )
  ) {
    configCounters.splice(idx, 1);
    localStorage.setItem(
      "amazonCounters",
      JSON.stringify(configCounters),
    );
    renderSettingsCounters();
  }
};

window.toggleDarkMode = function () {
  const darkModeToggle = document.getElementById("darkModeToggle");
  if (darkModeToggle.checked) {
    document.body.classList.add("dark-mode");
    localStorage.setItem("amazonTheme", "dark");
  } else {
    document.body.classList.remove("dark-mode");
    localStorage.setItem("amazonTheme", "light");
  }
};

// ============================================================
// Dynamic Renderers
// ============================================================
function renderTableHeader() {
  const thead = document.getElementById("tableHead");
  if (!thead) return;

  const activeCounters = configCounters.filter((c) => c.active);
  let headerHtml = `
          <tr>
            <th>Date</th>
            <th>User</th>
            <th>Company</th>
        `;
  activeCounters.forEach((c) => {
    headerHtml += `<th>${c.label}</th>`;
  });
  headerHtml += `
            <th>Action</th>
          </tr>
        `;
  thead.innerHTML = headerHtml;
}

function renderFormCounters() {
  const grid = document.getElementById("formCountersGrid");
  if (!grid) return;
  grid.innerHTML = "";

  const activeCounters = configCounters.filter((c) => c.active);
  activeCounters.forEach((c) => {
    grid.innerHTML += `
            <div class="input-group">
              <label>${c.label}</label>
              <div class="input-wrapper">
                <i class="${c.icon} input-icon"></i>
                <input type="number" id="${c.id}" placeholder="0" />
              </div>
            </div>
          `;
  });
}

function renderDashboard(totals) {
  const dashboard = document.getElementById("dashboardCards");
  if (!dashboard) return;
  dashboard.innerHTML = "";

  const activeCounters = configCounters.filter((c) => c.active);
  activeCounters.forEach((c, idx) => {
    const color = getCounterColor(c.id, idx);
    dashboard.innerHTML += `
            <div class="card" style="border-left-color: ${color};">
              <div class="card-info">
                <h3>${c.label}</h3>
                <h2 id="total-${c.id}">${totals[c.id] || 0}</h2>
              </div>
              <div class="card-icon" style="background: ${color}1a; color: ${color};">
                <i class="${c.icon}"></i>
              </div>
            </div>
          `;
  });
}

function renderUserTabs() {
  const container = document.getElementById("userTabsContainer");
  if (!container) return;

  // Safeguard active tab if user was deleted
  if (activeUserTab !== "all" && !teamUsers.includes(activeUserTab)) {
    activeUserTab = "all";
  }

  container.innerHTML = "";

  // All Records Tab
  const allCount = workData.length;
  const allBtn = document.createElement("button");
  allBtn.type = "button";
  allBtn.className = `user-tab-btn ${activeUserTab === "all" ? "active" : ""}`;
  allBtn.innerHTML = `<i class="fa-solid fa-list"></i> All Records <span class="user-tab-badge">${allCount}</span>`;
  allBtn.onclick = () => switchUserTab("all");
  container.appendChild(allBtn);

  // Dynamic tabs for each team user
  teamUsers.forEach((user) => {
    const userCount = workData.filter((item) => item.userName === user).length;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `user-tab-btn ${activeUserTab === user ? "active" : ""}`;
    btn.innerHTML = `<i class="fa-regular fa-user"></i> ${user} <span class="user-tab-badge">${userCount}</span>`;
    btn.onclick = () => switchUserTab(user);
    container.appendChild(btn);
  });
}

window.switchUserTab = function (user) {
  activeUserTab = user;
  loadData();
};

window.renderUI = function () {
  renderTableHeader();
  renderFormCounters();
  loadData();
};

// ============================================================
// Form Save / Submit Data
// ============================================================
form.addEventListener("submit", function (e) {
  e.preventDefault();

  if (!currentUser || (currentUserProfile && currentUserProfile.role === "guest")) {
    showToast("Access Denied! Guest mode is read-only. Please Login to add or edit records.", "error", "Login");
    return;
  }

  const editorName = currentUserProfile ? (currentUserProfile.userName || currentUserProfile.email) : (userName.value || "Unknown");
  const editorUid = currentUser ? currentUser.uid : "";

  let obj;
  if (editIndex === -1) {
    obj = {
      id: "row_" + Date.now() + "_" + Math.random().toString(36).substring(2, 11),
      date: date.value,
      userName: userName.value,
      company: company.value,
      notes: notes.value,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastEditedBy: editorName,
      userUid: editorUid,
      editHistory: [{
        editedBy: editorName,
        editedByUid: editorUid,
        timestamp: new Date().toLocaleString("en-GB"),
        isoTimestamp: new Date().toISOString(),
        note: "Initial report submission created"
      }]
    };
    configCounters.forEach((c) => {
      const inp = document.getElementById(c.id);
      obj[c.id] = inp ? Number(inp.value) || 0 : 0;
    });
    workData.push(obj);
  } else {
    const prevItem = workData[editIndex] || {};
    const existingHistory = prevItem.editHistory || [];

    const newChangeRecord = {
      editedBy: editorName,
      editedByUid: editorUid,
      timestamp: new Date().toLocaleString("en-GB"),
      isoTimestamp: new Date().toISOString(),
      note: `Updated report for ${company.value}`
    };

    obj = {
      ...prevItem,
      id: prevItem.id || ("row_" + Date.now() + "_" + Math.random().toString(36).substring(2, 11)),
      date: date.value,
      userName: userName.value,
      company: company.value,
      notes: notes.value,
      updatedAt: new Date().toISOString(),
      lastEditedBy: editorName,
      editHistory: [newChangeRecord, ...existingHistory]
    };
    configCounters.forEach((c) => {
      const inp = document.getElementById(c.id);
      obj[c.id] = inp ? Number(inp.value) || 0 : 0;
    });
    workData[editIndex] = obj;
    editIndex = -1;
  }

  // Save to Firestore Database
  if (db && isFirebaseInitialized) {
    db.collection("reports").doc(obj.id).set(obj, { merge: true }).catch((err) => {
      console.error("Firestore set error:", err);
    });
  }

  localStorage.setItem("amazonBlocker", blocker.value);
  localStorage.setItem("amazonWork", JSON.stringify(workData));
  form.reset();

  populateUserDropdown();
  populateCompanyDropdown();
  company.selectedIndex = 0;
  date.valueAsDate = new Date();
  blocker.value = localStorage.getItem("amazonBlocker") || "";

  if (currentUserProfile && currentUserProfile.role === "user") {
    userName.value = currentUserProfile.userName;
    userName.disabled = true;
  } else if (defaultUser) {
    userName.value = defaultUser;
  }

  loadData();
  runAutoBackup();

  // Background sync row to Google Sheets (Backup only)
  syncRowToGoogleSheets(obj);
});

form.addEventListener("reset", function (e) {
  setTimeout(() => {
    blocker.value = localStorage.getItem("amazonBlocker") || "";
    populateUserDropdown();
    populateCompanyDropdown();
    if (defaultUser) {
      userName.value = defaultUser;
    }
  }, 0);
});

window.saveBlocker = function () {
  localStorage.setItem("amazonBlocker", blocker.value);
  loadData();
};

window.clearBlocker = function () {
  blocker.value = "";
  localStorage.removeItem("amazonBlocker");
  loadData();
};

// ============================================================
// Load Data / Render Table
// ============================================================
function loadData() {
  renderUserTabs();
  tableBody.innerHTML = "";

  const totals = {};
  configCounters.forEach((c) => (totals[c.id] = 0));

  const searchQuery = searchFilter
    ? searchFilter.value.toLowerCase().trim()
    : "";
  const filterDate = dateFilter ? dateFilter.value : "";

  // Find duplicate indices (same company and date)
  const duplicateIndices = new Set();
  for (let i = 0; i < workData.length; i++) {
    for (let j = i + 1; j < workData.length; j++) {
      if (
        workData[i].company &&
        workData[i].date &&
        workData[i].company === workData[j].company &&
        workData[i].date === workData[j].date
      ) {
        duplicateIndices.add(i);
        duplicateIndices.add(j);
      }
    }
  }

  const duplicateAlert = document.getElementById("duplicateAlert");
  if (duplicateAlert) {
    if (duplicateIndices.size > 0) {
      duplicateAlert.style.display = "flex";
      const dupList = [];
      duplicateIndices.forEach((idx) => {
        const d = workData[idx];
        const formattedD = new Date(d.date)
          .toLocaleDateString("en-GB")
          .replace(/\//g, "-");
        const text = `<strong>${d.company}</strong> on <strong>${formattedD}</strong>`;
        if (!dupList.includes(text)) {
          dupList.push(text);
        }
      });
      duplicateAlert.querySelector("span").innerHTML =
        `<strong>Warning:</strong> Duplicate entries detected for ${dupList.join(", ")}. These rows are highlighted in red.`;
    } else {
      duplicateAlert.style.display = "none";
    }
  }

  const activeCounters = configCounters.filter((c) => c.active);

  workData.forEach((item, index) => {
    const matchesSearch =
      !searchQuery ||
      (item.userName &&
        item.userName.toLowerCase().includes(searchQuery)) ||
      (item.company && item.company.toLowerCase().includes(searchQuery));

    const matchesDate = !filterDate || item.date === filterDate;
    const matchesUserTab = activeUserTab === "all" || (item.userName && item.userName === activeUserTab);

    if (matchesSearch && matchesDate && matchesUserTab) {
      configCounters.forEach((c) => {
        totals[c.id] += Number(item[c.id]) || 0;
      });

      const formattedDate = new Date(item.date)
        .toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "2-digit",
          year: "2-digit",
        })
        .replace(/\//g, "-");

      const isDuplicate = duplicateIndices.has(index);
      const rowClass = isDuplicate ? 'class="duplicate-row"' : "";

      let cellsHtml = "";
      activeCounters.forEach((c) => {
        cellsHtml += `<td>${item[c.id] || 0}</td>`;
      });

      tableBody.innerHTML += `
              <tr ${rowClass}>
                <td>${formattedDate}</td>
                <td>${item.userName || "-"}</td>
                <td>${item.company}</td>
                ${cellsHtml}
                <td>
                  ${item.notes && item.notes.trim()
          ? `
                  <button class="blocker-btn" type="button" onclick="showBlockerPopup('${item.notes.replace(/'/g, "\\'").replace(/\r?\n/g, "\\n")}')" title="View Notes">
                    <i class="fa-regular fa-comment-dots"></i>
                  </button>
                  `
          : ""
        }
                  <button class="edit-btn" style="background: #8b5cf6;" onclick="openEditHistoryModal(${index})" title="View Edit History">
                    <i class="fa-solid fa-clock-rotate-left"></i>
                  </button>
                  <button class="edit-btn" onclick="editData(${index})" title="Edit Record">
                    <i class="fa-solid fa-pen"></i>
                  </button>
                  <button class="delete-btn" onclick="deleteData(${index})" title="Delete Record">
                    <i class="fa-solid fa-trash"></i>
                  </button>
                </td>
              </tr>
            `;
    }
  });

  const blockerAlert = document.getElementById("blockerAlert");
  if (blockerAlert) {
    const blockerText = localStorage.getItem("amazonBlocker") || "";
    if (blockerText.trim()) {
      blockerAlert.style.display = "flex";
      const truncated =
        blockerText.trim().length > 80
          ? blockerText.trim().substring(0, 80) + "..."
          : blockerText.trim();
      document.getElementById("blockerAlertText").innerHTML =
        `<strong>Blocker:</strong> ${truncated}`;

      document.getElementById("blockerAlertIcon").onclick = function () {
        showBlockerPopup(blockerText.trim());
      };
    } else {
      blockerAlert.style.display = "none";
    }
  }

  const badge = document.getElementById("filterResultsBadge");
  const visibleCount = tableBody.querySelectorAll("tr").length;
  if (badge) {
    const isFiltered = searchQuery || filterDate;
    badge.textContent = isFiltered
      ? `${visibleCount} of ${workData.length} records`
      : `${workData.length} record${workData.length !== 1 ? "s" : ""}`;
  }

  renderDashboard(totals);
}

// ============================================================
// Edit Data
// ============================================================
window.editData = function (index) {
  if (!currentUser || (currentUserProfile && currentUserProfile.role === "guest")) {
    showToast("Access Denied! Guest mode is read-only. Please Login to edit records.", "error", "Login");
    return;
  }

  const item = workData[index];
  if (!item) return;

  date.value = item.date || "";

  populateUserDropdown();
  if (item.userName && !teamUsers.includes(item.userName)) {
    const opt = document.createElement("option");
    opt.value = item.userName;
    opt.textContent = `${item.userName} (Inactive)`;
    userName.appendChild(opt);
  }
  userName.value = item.userName || "";

  populateCompanyDropdown();
  if (item.company && !companies.includes(item.company)) {
    const opt = document.createElement("option");
    opt.value = item.company;
    opt.textContent = `${item.company} (Inactive)`;
    company.appendChild(opt);
  }

  company.value = item.company || "";
  notes.value = item.notes || "";

  configCounters.forEach((c) => {
    const inp = document.getElementById(c.id);
    if (inp) {
      inp.value =
        item[c.id] !== undefined && item[c.id] !== null ? item[c.id] : "";
    }
  });

  editIndex = index;
  window.scrollTo({ top: 0, behavior: "smooth" });
};

// ============================================================
// Delete Data
// ============================================================
window.deleteData = function (index) {
  if (!currentUser || (currentUserProfile && currentUserProfile.role === "guest")) {
    showToast("Access Denied! Guest mode is read-only. Please Login to delete records.", "error", "Login");
    return;
  }

  if (confirm("Delete this record?")) {
    const deletedItem = workData[index];

    // Delete from Firestore Database
    if (db && isFirebaseInitialized && deletedItem && deletedItem.id) {
      db.collection("reports").doc(deletedItem.id).delete().catch((err) => {
        console.error("Firestore delete error:", err);
      });
    }

    workData.splice(index, 1);
    localStorage.setItem("amazonWork", JSON.stringify(workData));
    loadData();
    runAutoBackup();
    // Sync deletion to Google Sheet (Backup only)
    if (deletedItem && deletedItem.id) {
      deleteRowFromGoogleSheets(deletedItem.id, deletedItem.userName || "");
    }
  }
};

// ============================================================
// Dynamic Exporters (PDF & Screenshot)
// ============================================================
document
  .getElementById("clearAll")
  .addEventListener("click", function () {
    if (!currentUser || (currentUserProfile && currentUserProfile.role === "guest")) {
      showToast("Access Denied! Guest mode is read-only. Please Login to clear data.", "error", "Login");
      return;
    }

    if (
      confirm(
        "Are you sure you want to clear all work tracker data? This action cannot be undone.",
      )
    ) {
      workData = [];
      localStorage.removeItem("amazonWork");
      localStorage.removeItem("amazonBlocker");
      if (blocker) blocker.value = "";
      loadData();
      runAutoBackup();
      // NOTE: Google Sheet data is NOT cleared - only local app data is cleared
    }
  });

document
  .getElementById("downloadPdf")
  .addEventListener("click", downloadPDF);

function downloadPDF(customData = null, customDateStr = null) {
  let targetData =
    customData &&
      !(customData instanceof Event) &&
      Array.isArray(customData)
      ? customData
      : workData;

  // If exporting main history, filter by the active user tab
  if (targetData === workData && activeUserTab !== "all") {
    targetData = workData.filter((item) => item.userName === activeUserTab);
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF("landscape");

  doc.setFontSize(18);
  doc.text("Daily Work Report", 14, 18);

  let reportDate = new Date();
  if (customDateStr && typeof customDateStr === "string") {
    const [yearStr, monthStr, dayStr] = customDateStr.split("-");
    reportDate = new Date(
      Number(yearStr),
      Number(monthStr) - 1,
      Number(dayStr),
    );
  } else if (targetData.length > 0 && targetData[0].date) {
    const [yearStr, monthStr, dayStr] = targetData[0].date.split("-");
    reportDate = new Date(
      Number(yearStr),
      Number(monthStr) - 1,
      Number(dayStr),
    );
  }

  const day = String(reportDate.getDate()).padStart(2, "0");
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const month = monthNames[reportDate.getMonth()];
  const year = reportDate.getFullYear();
  const formattedDate = `${day} ${month}, ${year}`;

  const now = new Date();
  let hours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12;
  const formattedHours = String(hours).padStart(2, "0");
  const formattedTime = `${formattedHours}:${minutes} ${ampm}`;

  doc.setFontSize(11);
  doc.text(`${formattedDate} at ${formattedTime}`, 14, 26);

  const activeCounters = configCounters.filter((c) => c.active);

  // Header for PDF autoTable
  const pdfHead = ["Date", "User", "Company"];
  activeCounters.forEach((c) => pdfHead.push(c.label));

  // Rows for PDF
  const rows = [];
  const sums = {};
  activeCounters.forEach((c) => (sums[c.id] = 0));

  targetData.forEach((item) => {
    const rowData = [
      new Date(item.date).toLocaleDateString("en-GB").replace(/\//g, "-"),
      item.userName || "-",
      item.company || "-",
    ];

    activeCounters.forEach((c) => {
      const val = Number(item[c.id]) || 0;
      sums[c.id] += val;
      rowData.push(val);
    });

    rows.push(rowData);
  });

  doc.autoTable({
    startY: 34,
    head: [pdfHead],
    body: rows,
    theme: "grid",
    styles: {
      fontSize: 9,
      halign: "center",
    },
    headStyles: {
      fillColor: [30, 58, 138],
    },
  });

  let y = doc.lastAutoTable.finalY + 12;
  const summaryCount = activeCounters.length;
  const cardHeight = 15 + summaryCount * 6.5 + 5;

  if (y + cardHeight > 210) {
    doc.addPage();
    y = 20;
  }

  // Draw Summary Card
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.roundedRect(14, y, 110, cardHeight, 2, 2, "FD");

  doc.setFillColor(30, 58, 138);
  doc.rect(14, y, 110, 3, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(30, 58, 138);
  doc.text("TOTAL SUMMARY", 20, y + 10);

  doc.setDrawColor(226, 232, 240);
  doc.line(20, y + 13, 114, y + 13);

  let itemY = y + 19;
  activeCounters.forEach((c, index) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(71, 85, 105);
    doc.text(c.label, 20, itemY);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(String(sums[c.id]), 114, itemY, { align: "right" });

    if (index < activeCounters.length - 1) {
      doc.setDrawColor(241, 245, 249);
      doc.line(20, itemY + 2.5, 114, itemY + 2.5);
    }
    itemY += 6.5;
  });

  const pdfBlockerText =
    customData && !(customData instanceof Event)
      ? ""
      : localStorage.getItem("amazonBlocker") || "";

  if (pdfBlockerText.trim()) {
    doc.setFillColor(239, 246, 255);
    doc.setDrawColor(219, 234, 254);
    doc.setLineWidth(0.5);
    doc.roundedRect(130, y, 153, cardHeight, 2, 2, "FD");

    doc.setFillColor(37, 99, 235);
    doc.rect(130, y, 153, 3, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(30, 58, 138);
    doc.text("BLOCKERS", 136, y + 10);

    doc.setDrawColor(219, 234, 254);
    doc.line(136, y + 13, 277, y + 13);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);

    let noteY = y + 19;
    const splitNotes = doc.splitTextToSize(pdfBlockerText.trim(), 140);

    for (let i = 0; i < splitNotes.length; i++) {
      if (noteY > y + cardHeight - 5) {
        doc.text("...", 136, noteY);
        break;
      }
      doc.text(splitNotes[i], 136, noteY);
      noteY += 5;
    }
  }

  const dateSuffix =
    customDateStr && typeof customDateStr === "string"
      ? new Date(customDateStr)
        .toLocaleDateString("en-GB")
        .replace(/\//g, "-")
      : new Date().toLocaleDateString("en-GB").replace(/\//g, "-");

  const userSuffix = (activeUserTab !== "all" && targetData === workData)
    ? "_" + activeUserTab.replace(/\s+/g, "_")
    : "";
  doc.save("Daily_Report" + userSuffix + "_" + dateSuffix + ".pdf");
}

// Live Header Date & Time
function updateHeaderDateTime() {
  const headerDateTime = document.getElementById("headerDateTime");
  if (!headerDateTime) return;

  const now = new Date();
  const options = {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  };
  const dateStr = now.toLocaleDateString("en-GB", options);

  let hours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12;
  const formattedHours = String(hours).padStart(2, "0");
  const timeStr = `${formattedHours}:${minutes}:${seconds} ${ampm}`;

  headerDateTime.innerHTML = `<i class="fa-regular fa-calendar-days"></i> ${dateStr} <span style="margin: 0 6px; opacity: 0.6;">•</span> <i class="fa-regular fa-clock"></i> ${timeStr}`;
}

if (searchFilter) searchFilter.addEventListener("input", loadData);
if (dateFilter) dateFilter.addEventListener("change", loadData);

const clearFiltersBtn = document.getElementById("clearFiltersBtn");
if (clearFiltersBtn) {
  clearFiltersBtn.addEventListener("click", function () {
    if (searchFilter) searchFilter.value = "";
    if (dateFilter) dateFilter.value = "";
    loadData();
  });
}

updateHeaderDateTime();
setInterval(updateHeaderDateTime, 1000);

// Duplicate Merge System
let modalLang = "en";
window.showMergeInfoGlobal = function () {
  modalLang = "en";
  document.getElementById("modalMainText").innerHTML =
    "Duplicate entries (same company and date) have been detected in the work history list.";
  document.getElementById("modalTipText").innerHTML =
    "<strong>How to resolve:</strong> You should merge these duplicate lists. Edit one list to add the counters together, and then delete the other duplicate list.";

  const toggleBtn = document.getElementById("langToggleBtn");
  if (toggleBtn) {
    toggleBtn.setAttribute("title", "Translate to Urdu");
  }

  const mergeBtn = document.getElementById("modalMergeBtn");
  if (mergeBtn) {
    mergeBtn.innerHTML =
      '<i class="fa-solid fa-code-merge"></i> Merge Automatically';
  }

  document.getElementById("infoModal").style.display = "flex";
};

window.closeInfoModal = function () {
  document.getElementById("infoModal").style.display = "none";
};

window.toggleModalLanguage = function () {
  const mainText = document.getElementById("modalMainText");
  const tipText = document.getElementById("modalTipText");
  const toggleBtn = document.getElementById("langToggleBtn");
  const mergeBtn = document.getElementById("modalMergeBtn");

  if (modalLang === "en") {
    mainText.innerHTML =
      "Work history list mein aik hi company aur date ki aik se ziada (duplicate) entries mili hain.";
    tipText.innerHTML =
      "<strong>Hal kaise karein:</strong> Aap ko in dono lists ko merge karna chahiye. Kisi aik list ko edit karke saare numbers jama (add) kar lein, aur phir doosri duplicate list ko delete kar dein.";
    if (toggleBtn)
      toggleBtn.setAttribute("title", "Translate to English");
    if (mergeBtn)
      mergeBtn.innerHTML =
        '<i class="fa-solid fa-code-merge"></i> Auto Merge Karein';
    modalLang = "ur";
  } else {
    mainText.innerHTML =
      "Duplicate entries (same company and date) have been detected in the work history list.";
    tipText.innerHTML =
      "<strong>How to resolve:</strong> You should merge these duplicate lists. Edit one list to add the counters together, and then delete the other duplicate list.";
    if (toggleBtn) toggleBtn.setAttribute("title", "Translate to Urdu");
    if (mergeBtn)
      mergeBtn.innerHTML =
        '<i class="fa-solid fa-code-merge"></i> Merge Automatically';
    modalLang = "en";
  }
};

window.autoMergeDuplicates = function () {
  const groups = {};
  const mergedData = [];

  workData.forEach((item) => {
    const key = `${item.company.toLowerCase().trim()}_${item.date}`;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(item);
  });

  let mergeCount = 0;

  for (const key in groups) {
    const list = groups[key];
    if (list.length > 1) {
      mergeCount += list.length - 1;
      const master = { ...list[0] };

      for (let i = 1; i < list.length; i++) {
        const other = list[i];

        configCounters.forEach((c) => {
          master[c.id] =
            (Number(master[c.id]) || 0) + (Number(other[c.id]) || 0);
        });

        if (other.userName && other.userName !== master.userName) {
          master.userName = master.userName
            ? `${master.userName}, ${other.userName}`
            : other.userName;
        }

        if (other.notes && other.notes.trim()) {
          master.notes =
            master.notes && master.notes.trim()
              ? `${master.notes} | ${other.notes}`
              : other.notes;
        }
      }
      mergedData.push(master);
    } else {
      mergedData.push(list[0]);
    }
  }

  workData = mergedData;
  localStorage.setItem("amazonWork", JSON.stringify(workData));
  loadData();
  closeInfoModal();
  runAutoBackup();

  // Sync merged data to Google Sheets
  bulkSyncToGoogleSheets();

  alert(`Successfully merged ${mergeCount} duplicate entries!`);
};

window.showBlockerPopup = function (text) {
  document.getElementById("blockerModalText").textContent = text;
  document.getElementById("blockerModal").style.display = "flex";
};

window.closeBlockerModal = function () {
  document.getElementById("blockerModal").style.display = "none";
};

// ============================================================
// Backup Management System
// ============================================================
window.openBackupModal = function () {
  loadBackupList();
  document.getElementById("backupModal").style.display = "flex";
};

window.closeBackupModal = function () {
  document.getElementById("backupModal").style.display = "none";
};

function runAutoBackup() {
  const todayStr = new Date().toLocaleDateString("sv-SE");
  let backups =
    JSON.parse(localStorage.getItem("amazonWorkBackups")) || [];
  const existingIndex = backups.findIndex((b) => b.date === todayStr);

  if (existingIndex !== -1) {
    backups[existingIndex].data = JSON.parse(JSON.stringify(workData));
    backups[existingIndex].timestamp = Date.now();
  } else {
    backups.push({
      date: todayStr,
      timestamp: Date.now(),
      data: JSON.parse(JSON.stringify(workData)),
    });
  }

  // Apply backup retention policy
  if (localBackupRetention && localBackupRetention !== "none") {
    const daysLimit = Number(localBackupRetention) || 7;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysLimit);
    cutoffDate.setHours(0, 0, 0, 0);

    backups = backups.filter((b) => {
      const bDate = new Date(b.date);
      bDate.setHours(0, 0, 0, 0);
      return bDate >= cutoffDate;
    });
  }

  backups.sort((a, b) => b.date.localeCompare(a.date));
  localStorage.setItem("amazonWorkBackups", JSON.stringify(backups));
}

// ============================================================
// Google Sheets Sync Helper Functions
// ============================================================
function updateSyncStatusBadge(status) {
  const badge = document.getElementById("syncStatusBadge");
  const dot = document.getElementById("syncStatusDot");
  const txt = document.getElementById("syncStatusText");
  if (!badge || !dot || !txt) return;

  // Reset classes
  dot.className = "sync-status-dot";

  if (!googleSyncEnabled || !googleSyncUrl) {
    badge.style.display = "none";
    return;
  }

  badge.style.display = "flex";

  if (status === "syncing") {
    dot.classList.add("syncing");
    txt.textContent = "Syncing...";
    badge.setAttribute("title", "Synchronising data with Google Sheets...");
  } else if (status === "error") {
    dot.classList.add("error");
    txt.textContent = "Sync Error";
    badge.setAttribute("title", "Error syncing with Google Sheets. Check connection or URL.");
  } else if (status === "active" || status === "idle" || status === "success") {
    dot.classList.add("active");
    txt.textContent = "Synced";
    badge.setAttribute("title", "All changes synced with Google Sheets successfully.");
  }
}

// Back to Top Logic
window.scrollToTop = function () {
  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
};

window.addEventListener("scroll", function () {
  const btn = document.getElementById("backToTopBtn");
  if (btn) {
    const scrolled = window.scrollY || document.documentElement.scrollTop;
    if (scrolled > 150) {
      btn.classList.add("show");
    } else {
      btn.classList.remove("show");
    }
  }
});

window.toggleHeaderToolsDropdown = function (e) {
  if (e) e.stopPropagation();
  const container = document.getElementById("headerToolsDropdown");
  if (container) {
    container.classList.toggle("open");
  }
};

window.closeHeaderToolsDropdown = function () {
  const container = document.getElementById("headerToolsDropdown");
  if (container) {
    container.classList.remove("open");
  }
};

document.addEventListener("click", function (e) {
  const container = document.getElementById("headerToolsDropdown");
  if (container && !container.contains(e.target)) {
    container.classList.remove("open");
  }
});

window.saveGoogleSyncSettings = function () {
  const urlInput = document.getElementById("googleSyncUrl");
  if (urlInput) {
    googleSyncUrl = urlInput.value.trim();
    localStorage.setItem("amazonGoogleSyncUrl", googleSyncUrl);
  }
  updateSyncStatusBadge("idle");
};

window.toggleGoogleSync = function () {
  const toggle = document.getElementById("googleSyncToggle");
  if (toggle) {
    googleSyncEnabled = toggle.checked;
    localStorage.setItem("amazonGoogleSyncEnabled", googleSyncEnabled ? "true" : "false");
    // Slider visual update
    const slider = document.getElementById("googleSyncSlider");
    if (slider) {
      slider.style.background = googleSyncEnabled ? "#4f46e5" : "#cbd5e1";
      const circle = slider.querySelector("span");
      if (circle) circle.style.left = googleSyncEnabled ? "23px" : "3px";
    }
  }
  updateSyncStatusBadge("idle");
};

window.saveBackupRetentionSettings = function () {
  const retentionSelect = document.getElementById("localBackupRetention");
  if (retentionSelect) {
    localBackupRetention = retentionSelect.value;
    localStorage.setItem("amazonLocalBackupRetention", localBackupRetention);
  }
  runAutoBackup();
};

window.copyAppsScriptCode = function (btn) {
  const codeBlock = document.getElementById("appsScriptCodeBlock");
  if (!codeBlock) return;

  navigator.clipboard.writeText(codeBlock.textContent)
    .then(() => {
      const originalHtml = btn.innerHTML;
      btn.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
      btn.style.background = "#10b981";
      setTimeout(() => {
        btn.innerHTML = originalHtml;
        btn.style.background = "";
      }, 2000);
    })
    .catch(err => {
      alert("Failed to copy code: " + err);
    });
};

window.testSyncConnection = function () {
  const btn = document.getElementById("testSyncBtn");
  if (!googleSyncUrl) {
    alert("Please enter a valid Google Apps Script Web App URL first.");
    return;
  }

  const originalHtml = btn.innerHTML;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Testing...';
  btn.disabled = true;
  updateSyncStatusBadge("syncing");

  fetch(googleSyncUrl, {
    method: "POST",
    mode: "cors",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify({ action: "test" })
  })
    .then(response => response.json())
    .then(data => {
      btn.innerHTML = originalHtml;
      btn.disabled = false;
      if (data && data.status === "success") {
        alert("Connection successful! Google Sheet is ready to sync.");
        updateSyncStatusBadge("idle");
      } else {
        alert("Connection failed: " + (data ? data.message : "Invalid response"));
        updateSyncStatusBadge("error");
      }
    })
    .catch(err => {
      btn.innerHTML = originalHtml;
      btn.disabled = false;
      alert("Connection failed! Please make sure your Apps Script is deployed as a Web App with access 'Anyone'.\n\nError: " + err.message);
      updateSyncStatusBadge("error");
    });
};

window.forceSyncAllData = function () {
  if (!googleSyncUrl) {
    alert("Please enter a Google Apps Script Web App URL first.");
    return;
  }

  if (!confirm("Are you sure you want to replace all records in Google Sheets with your current local data? This will sync " + workData.length + " records.")) {
    return;
  }

  const btn = document.getElementById("forceSyncBtn");
  const originalHtml = btn.innerHTML;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Syncing...';
  btn.disabled = true;
  updateSyncStatusBadge("syncing");

  fetch(googleSyncUrl, {
    method: "POST",
    mode: "cors",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify({ action: "bulkSync", rows: workData })
  })
    .then(response => response.json())
    .then(data => {
      btn.innerHTML = originalHtml;
      btn.disabled = false;
      if (data && data.status === "success") {
        alert("Success! " + workData.length + " records synced to Google Sheets.");
        updateSyncStatusBadge("idle");
      } else {
        alert("Sync failed: " + (data ? data.message : "Invalid response"));
        updateSyncStatusBadge("error");
      }
    })
    .catch(err => {
      btn.innerHTML = originalHtml;
      btn.disabled = false;
      alert("Sync failed! Error: " + err.message);
      updateSyncStatusBadge("error");
    });
};

function syncRowToGoogleSheets(row) {
  if (!googleSyncEnabled || !googleSyncUrl) return;
  updateSyncStatusBadge("syncing");

  // Row is sent with its userName so the Apps Script can route it
  // to the correct per-user sheet tab automatically.
  fetch(googleSyncUrl, {
    method: "POST",
    mode: "cors",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify({ action: "syncRow", row: row })
  })
    .then(response => response.json())
    .then(data => {
      if (data && data.status === "success") {
        updateSyncStatusBadge("idle");
      } else {
        console.error("Row sync failed:", data);
        updateSyncStatusBadge("error");
      }
    })
    .catch(err => {
      console.error("Row sync network error:", err);
      updateSyncStatusBadge("error");
    });
}

function deleteRowFromGoogleSheets(id, userName) {
  if (!googleSyncEnabled || !googleSyncUrl) return;
  updateSyncStatusBadge("syncing");

  // Pass userName so the Apps Script can find the row in the correct sheet tab.
  fetch(googleSyncUrl, {
    method: "POST",
    mode: "cors",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify({ action: "deleteRow", id: id, userName: userName || "" })
  })
    .then(response => response.json())
    .then(data => {
      if (data && data.status === "success") {
        updateSyncStatusBadge("idle");
      } else {
        console.error("Delete sync failed:", data);
        updateSyncStatusBadge("error");
      }
    })
    .catch(err => {
      console.error("Delete sync network error:", err);
      updateSyncStatusBadge("error");
    });
}

function bulkSyncToGoogleSheets() {
  if (!googleSyncEnabled || !googleSyncUrl) return;
  updateSyncStatusBadge("syncing");

  fetch(googleSyncUrl, {
    method: "POST",
    mode: "cors",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify({ action: "bulkSync", rows: workData })
  })
    .then(response => response.json())
    .then(data => {
      if (data && data.status === "success") {
        updateSyncStatusBadge("idle");
      } else {
        console.error("Bulk sync failed:", data);
        updateSyncStatusBadge("error");
      }
    })
    .catch(err => {
      console.error("Bulk sync network error:", err);
      updateSyncStatusBadge("error");
    });
}

window.manualBackup = function () {
  runAutoBackup();
  loadBackupList();
  alert("Backup created successfully for today!");
};

function loadBackupList() {
  const backups =
    JSON.parse(localStorage.getItem("amazonWorkBackups")) || [];
  const tbody = document.getElementById("backupListBody");
  tbody.innerHTML = "";

  if (backups.length === 0) {
    tbody.innerHTML = `
            <tr>
              <td colspan="6" style="padding: 20px; color: var(--color-label); font-style: italic;">
                No backups found. Backups are automatically created when saving work.
              </td>
            </tr>
          `;
    return;
  }

  const active = configCounters.filter((c) => c.active);
  const c1 = active[0];
  const c2 = active[1];
  const c1Label = c1 ? c1.label : "Invoices";
  const c2Label = c2 ? c2.label : "Submissions";

  const heads = document.querySelectorAll("#backupModal table thead th");
  if (heads && heads.length >= 5) {
    heads[3].textContent = c1Label;
    heads[4].textContent = c2Label;
  }

  backups.forEach((backup, idx) => {
    const formattedDate = new Date(backup.date)
      .toLocaleDateString("en-GB")
      .replace(/\//g, "-");
    const backupTime = new Date(backup.timestamp).toLocaleTimeString(
      "en-GB",
      {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      },
    );

    let b1Sum = 0;
    let b2Sum = 0;
    backup.data.forEach((item) => {
      if (c1) b1Sum += Number(item[c1.id]) || 0;
      if (c2) b2Sum += Number(item[c2.id]) || 0;
    });

    tbody.innerHTML += `
            <tr>
              <td style="padding: 10px; font-weight: 600; color: var(--color-filter-badge);">${formattedDate}</td>
              <td style="padding: 10px; color: var(--color-label);">${backupTime}</td>
              <td style="padding: 10px; font-weight: 500; color: var(--color-text-main);">${backup.data.length}</td>
              <td style="padding: 10px; color: #3b82f6; font-weight: 600;">${b1Sum}</td>
              <td style="padding: 10px; color: #8b5cf6; font-weight: 600;">${b2Sum}</td>
              <td style="padding: 10px; white-space: nowrap;">
                <button class="blocker-btn" style="padding: 6px 10px; font-size: 11px; margin: 0 2px;" onclick="restoreBackup(${idx})" title="Restore Data">
                  <i class="fa-solid fa-clock-rotate-left"></i> Restore
                </button>
                <button class="save-btn" style="padding: 6px 10px; font-size: 11px; background: #10b981; margin: 0 2px;" onclick="downloadBackupPDF(${idx})" title="Download PDF of this day's records">
                  <i class="fa-solid fa-file-pdf"></i> PDF
                </button>
                <button class="save-btn" style="padding: 6px 10px; font-size: 11px; background: #06b6d4; margin: 0 2px;" onclick="downloadBackupJSON(${idx})" title="Download JSON file">
                  <i class="fa-solid fa-file-code"></i> JSON
                </button>
                <button class="delete-btn" style="padding: 6px 10px; font-size: 11px; margin: 0 2px;" onclick="deleteBackup(${idx})" title="Delete Backup">
                  <i class="fa-solid fa-trash"></i>
                </button>
              </td>
            </tr>
          `;
  });
}

window.downloadBackupPDF = function (idx) {
  const backups =
    JSON.parse(localStorage.getItem("amazonWorkBackups")) || [];
  const backup = backups[idx];
  if (!backup) return;

  const dayData = backup.data.filter((item) => item.date === backup.date);
  const targetData = dayData.length > 0 ? dayData : backup.data;
  downloadPDF(targetData, backup.date);
};

window.downloadBackupJSON = function (idx) {
  const backups =
    JSON.parse(localStorage.getItem("amazonWorkBackups")) || [];
  const backup = backups[idx];
  if (!backup) return;

  const dayData = backup.data.filter((item) => item.date === backup.date);
  const targetData = dayData.length > 0 ? dayData : backup.data;

  const dataStr =
    "data:text/json;charset=utf-8," +
    encodeURIComponent(JSON.stringify(targetData, null, 2));
  const downloadAnchor = document.createElement("a");
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute(
    "download",
    `Daily_Report_Backup_${backup.date}.json`,
  );
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
};

window.restoreBackup = function (idx) {
  const backups =
    JSON.parse(localStorage.getItem("amazonWorkBackups")) || [];
  const backup = backups[idx];
  if (!backup) return;

  const formattedDate = new Date(backup.date)
    .toLocaleDateString("en-GB")
    .replace(/\//g, "-");

  if (
    confirm(
      `Are you sure you want to restore the backup from ${formattedDate}? This will replace your current work tracker records.`,
    )
  ) {
    workData = JSON.parse(JSON.stringify(backup.data));

    // Ensure all restored records have a unique ID
    let idsRestored = false;
    workData.forEach((item) => {
      if (!item.id) {
        item.id = "row_" + Date.now() + "_" + Math.random().toString(36).substring(2, 11);
        idsRestored = true;
      }
    });

    localStorage.setItem("amazonWork", JSON.stringify(workData));
    loadData();
    closeBackupModal();

    // Sync full updated data to Google Sheets
    bulkSyncToGoogleSheets();

    alert("Backup restored successfully!");
  }
};

window.deleteBackup = function (idx) {
  const backups =
    JSON.parse(localStorage.getItem("amazonWorkBackups")) || [];
  if (!backups[idx]) return;

  if (confirm("Are you sure you want to delete this backup entry?")) {
    backups.splice(idx, 1);
    localStorage.setItem("amazonWorkBackups", JSON.stringify(backups));
    loadBackupList();
  }
};

// ============================================================
// Import / Restore Backup from JSON File
// ============================================================
let importedRecords = null; // holds parsed JSON data from uploaded file

window.openImportModal = function () {
  importedRecords = null;
  resetImportUI();
  document.getElementById("importChoiceModal").style.display = "flex";
};

window.closeImportModal = function () {
  document.getElementById("importChoiceModal").style.display = "none";
  importedRecords = null;
  resetImportUI();
  // also clear the file input so re-selecting same file triggers onchange
  const fileInput = document.getElementById("importJsonFileInput");
  if (fileInput) fileInput.value = "";
};

function resetImportUI() {
  document.getElementById("importPreviewBox").style.display = "none";
  document.getElementById("importWarningBox").style.display = "none";
  setImportBtnsEnabled(false);
}

function setImportBtnsEnabled(enabled) {
  const mergeBtn = document.getElementById("importMergeBtn");
  const overwriteBtn = document.getElementById("importOverwriteBtn");
  if (mergeBtn) {
    mergeBtn.disabled = !enabled;
    mergeBtn.style.opacity = enabled ? "1" : "0.45";
    mergeBtn.style.cursor = enabled ? "pointer" : "not-allowed";
  }
  if (overwriteBtn) {
    overwriteBtn.disabled = !enabled;
    overwriteBtn.style.opacity = enabled ? "1" : "0.45";
    overwriteBtn.style.cursor = enabled ? "pointer" : "not-allowed";
  }
}

// Triggered by file <input> change
window.handleImportFileSelect = function (event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  processImportFile(file);
};

// Drag-and-drop handlers
window.handleImportDragOver = function (event) {
  event.preventDefault();
  document.getElementById("importDropZone").classList.add("drag-over");
};

window.handleImportDragLeave = function (event) {
  document.getElementById("importDropZone").classList.remove("drag-over");
};

window.handleImportDrop = function (event) {
  event.preventDefault();
  document.getElementById("importDropZone").classList.remove("drag-over");
  const file =
    event.dataTransfer.files && event.dataTransfer.files[0];
  if (!file) return;
  if (!file.name.endsWith(".json")) {
    showImportWarning("Please drop a valid .json file.");
    return;
  }
  processImportFile(file);
};

function processImportFile(file) {
  resetImportUI();
  const reader = new FileReader();
  reader.onload = function (e) {
    let parsed;
    try {
      parsed = JSON.parse(e.target.result);
    } catch (err) {
      showImportWarning("Invalid JSON file. Please use a file downloaded from this app.");
      return;
    }

    // Accept both array (single-day export) and wrapped object formats
    let records = [];
    if (Array.isArray(parsed)) {
      records = parsed;
    } else if (parsed && Array.isArray(parsed.data)) {
      records = parsed.data;
    } else {
      showImportWarning("Unrecognised file format. The JSON must be an array of work records.");
      return;
    }

    // Basic validation — each item must have at least a date field
    const valid = records.every(
      (r) => r && typeof r === "object" && r.date
    );
    if (!valid || records.length === 0) {
      showImportWarning(
        records.length === 0
          ? "The file contains 0 records."
          : "Some records are missing required fields (date). Please check the file."
      );
      return;
    }

    importedRecords = records;

    // Build preview stats
    const dates = records
      .map((r) => r.date)
      .filter(Boolean)
      .sort();
    const earliestDate = dates[0];
    const latestDate = dates[dates.length - 1];
    const companies = [
      ...new Set(records.map((r) => r.company).filter(Boolean)),
    ];

    // Count new records (not already in current workData by date+company+user)
    const existingKeys = new Set(
      workData.map(
        (r) =>
          `${(r.date || "").trim()}_${(r.company || "").toLowerCase().trim()}_${(r.userName || "").toLowerCase().trim()}`
      )
    );
    const newCount = records.filter(
      (r) =>
        !existingKeys.has(
          `${(r.date || "").trim()}_${(r.company || "").toLowerCase().trim()}_${(r.userName || "").toLowerCase().trim()}`
        )
    ).length;

    function fmtDate(str) {
      if (!str) return "?";
      const [y, m, d] = str.split("-");
      return new Date(+y, +m - 1, +d).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    }

    document.getElementById("importPreviewFileName").textContent = file.name;
    document.getElementById("importPreviewRecords").textContent = records.length;
    document.getElementById("importPreviewDateRange").textContent =
      earliestDate === latestDate
        ? fmtDate(earliestDate)
        : `${fmtDate(earliestDate)} → ${fmtDate(latestDate)}`;
    document.getElementById("importPreviewCompanies").textContent =
      companies.length > 0
        ? companies.slice(0, 4).join(", ") +
        (companies.length > 4 ? ` +${companies.length - 4} more` : "")
        : "–";
    document.getElementById("importPreviewNew").textContent =
      `${newCount} new record${newCount !== 1 ? "s" : ""} will be added`;

    document.getElementById("importPreviewBox").style.display = "block";
    setImportBtnsEnabled(true);

    // Show overwrite warning if current data is non-empty
    if (workData.length > 0) {
      showImportWarning(
        `Overwrite will permanently delete your ${workData.length} existing record${workData.length !== 1 ? "s" : ""}. Use Merge to keep both datasets.`
      );
    }
  };
  reader.readAsText(file);
}

function showImportWarning(msg) {
  const box = document.getElementById("importWarningBox");
  document.getElementById("importWarningText").textContent = msg;
  box.style.display = "flex";
}

window.executeImport = function (mode) {
  if (!importedRecords || importedRecords.length === 0) return;

  if (mode === "overwrite") {
    if (
      !confirm(
        `⚠️ OVERWRITE: This will permanently delete all ${workData.length} existing records and replace them with ${importedRecords.length} imported records.\n\nAre you sure?`
      )
    )
      return;
    workData = JSON.parse(JSON.stringify(importedRecords));
  } else {
    // MERGE — skip exact duplicates (same date + company + userName)
    const existingKeys = new Set(
      workData.map(
        (r) =>
          `${(r.date || "").trim()}_${(r.company || "").toLowerCase().trim()}_${(r.userName || "").toLowerCase().trim()}`
      )
    );
    const toAdd = importedRecords.filter(
      (r) =>
        !existingKeys.has(
          `${(r.date || "").trim()}_${(r.company || "").toLowerCase().trim()}_${(r.userName || "").toLowerCase().trim()}`
        )
    );
    workData = workData.concat(toAdd);
  }

  // Sort by date descending
  workData.sort((a, b) =>
    (b.date || "").localeCompare(a.date || "")
  );

  // Ensure all records have a unique ID after import
  let idsModified = false;
  workData.forEach((item) => {
    if (!item.id) {
      item.id = "row_" + Date.now() + "_" + Math.random().toString(36).substring(2, 11);
      idsModified = true;
    }
  });
  if (idsModified) {
    localStorage.setItem("amazonWork", JSON.stringify(workData));
  }

  loadData();
  runAutoBackup();

  // Sync full updated data to Google Sheets
  bulkSyncToGoogleSheets();

  closeImportModal();
  closeBackupModal();

  // Show success toast
  const modeLabel = mode === "overwrite" ? "Overwrite" : "Merge";
  const count =
    mode === "overwrite"
      ? importedRecords.length
      : workData.length;
  showImportSuccessToast(
    `${modeLabel} complete! ${count} record${count !== 1 ? "s" : ""} loaded.`
  );
};

function showImportSuccessToast(msg) {
  const existing = document.getElementById("importSuccessToast");
  if (existing) existing.remove();
  const toast = document.createElement("div");
  toast.id = "importSuccessToast";
  toast.className = "import-success-toast";
  toast.innerHTML = `<i class="fa-solid fa-circle-check"></i> ${msg}`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3300);
}


// Screenshot Generator
window.downloadScreenshot = function (
  customData = null,
  customDateStr = null,
) {
  const btn = document.getElementById("downloadImage");
  const originalContent = btn.innerHTML;
  btn.innerHTML =
    '<i class="fa-solid fa-spinner fa-spin"></i> Generating...';
  btn.disabled = true;

  let targetData =
    customData &&
      !(customData instanceof Event) &&
      Array.isArray(customData)
      ? customData
      : workData;

  // If exporting main history, filter by the active user tab
  if (targetData === workData && activeUserTab !== "all") {
    targetData = workData.filter((item) => item.userName === activeUserTab);
  }

  let reportDate = new Date();
  if (customDateStr && typeof customDateStr === "string") {
    const [yearStr, monthStr, dayStr] = customDateStr.split("-");
    reportDate = new Date(
      Number(yearStr),
      Number(monthStr) - 1,
      Number(dayStr),
    );
  } else if (targetData.length > 0 && targetData[0].date) {
    const [yearStr, monthStr, dayStr] = targetData[0].date.split("-");
    reportDate = new Date(
      Number(yearStr),
      Number(monthStr) - 1,
      Number(dayStr),
    );
  }

  const day = String(reportDate.getDate()).padStart(2, "0");
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const month = monthNames[reportDate.getMonth()];
  const year = reportDate.getFullYear();
  const formattedDate = `${day} ${month}, ${year}`;

  const now = new Date();
  let hours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12;
  const formattedHours = String(hours).padStart(2, "0");
  const formattedTime = `${formattedHours}:${minutes} ${ampm}`;
  const reportTimeStr = `${formattedDate} at ${formattedTime}`;

  const blockerText =
    customData && !(customData instanceof Event)
      ? ""
      : localStorage.getItem("amazonBlocker") || "";

  const activeCounters = configCounters.filter((c) => c.active);

  // Header for screenshot table
  let tableHeaderCellsHtml = `
          <th style="padding: 10px; font-weight: 600;">Date</th>
          <th style="padding: 10px; font-weight: 600;">User</th>
          <th style="padding: 10px; font-weight: 600;">Company</th>
        `;
  activeCounters.forEach((c) => {
    tableHeaderCellsHtml += `<th style="padding: 10px; font-weight: 600;">${c.label}</th>`;
  });

  // Create the off-screen template container
  const container = document.createElement("div");
  container.style.position = "absolute";
  container.style.left = "-9999px";
  container.style.top = "-9999px";
  container.style.width = "1120px";
  container.style.backgroundColor = "#ffffff";
  container.style.padding = "40px";
  container.style.fontFamily = "'Poppins', 'Helvetica', sans-serif";
  container.style.boxSizing = "border-box";

  let html = `
          <div style="margin-bottom: 25px;">
            <h1 style="font-size: 26px; color: #1e293b; margin: 0; font-weight: 600;">Daily Work Report</h1>
            <p style="font-size: 13px; color: #64748b; margin: 5px 0 0 0;">${reportTimeStr}</p>
          </div>
          
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 12px; text-align: center;">
            <thead>
              <tr style="background-color: #1e3a8a; color: #ffffff;">
                ${tableHeaderCellsHtml}
              </tr>
            </thead>
            <tbody>
        `;

  targetData.forEach((item, index) => {
    const rowBg = index % 2 === 0 ? "#ffffff" : "#f8fafc";
    const formattedRowDate = new Date(item.date)
      .toLocaleDateString("en-GB")
      .replace(/\//g, "-");

    let rowCellsHtml = "";
    activeCounters.forEach((c) => {
      rowCellsHtml += `<td style="padding: 10px; border: 1px solid #e2e8f0;">${item[c.id] || 0}</td>`;
    });

    html += `
            <tr style="background-color: ${rowBg}; color: #334155;">
              <td style="padding: 10px; border: 1px solid #e2e8f0;">${formattedRowDate}</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0;">${item.userName || "-"}</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: 500;">${item.company}</td>
              ${rowCellsHtml}
            </tr>
          `;
  });

  html += `
            </tbody>
          </table>
          
          <div style="display: flex; gap: 30px; align-items: flex-start; justify-content: flex-start;">
            <div style="flex: 1; max-width: 450px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; border-top: 4px solid #1e3a8a; box-sizing: border-box; padding: 20px;">
              <h2 style="font-size: 13px; color: #1e3a8a; margin: 0 0 15px 0; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">TOTAL SUMMARY</h2>
              
              <div style="display: flex; flex-direction: column; gap: 8px; font-size: 12px; color: #475569;">
        `;

  const sums = {};
  activeCounters.forEach((c) => (sums[c.id] = 0));
  targetData.forEach((item) => {
    activeCounters.forEach((c) => {
      sums[c.id] += Number(item[c.id]) || 0;
    });
  });

  activeCounters.forEach((c, idx) => {
    const borderStyle =
      idx < activeCounters.length - 1
        ? "border-bottom: 1px solid #f1f5f9; padding-bottom: 4px;"
        : "padding-bottom: 4px;";
    html += `
                <div style="display: flex; justify-content: space-between; ${borderStyle}">
                  <span>${c.label}</span><span style="font-weight: 700; color: #0f172a;">${sums[c.id]}</span>
                </div>
          `;
  });

  html += `
              </div>
            </div>
        `;

  if (blockerText.trim()) {
    html += `
            <div style="flex: 1.3; background-color: #eff6ff; border: 1px solid #dbeafe; border-radius: 8px; border-top: 4px solid #2563eb; box-sizing: border-box; padding: 20px;">
              <h2 style="font-size: 13px; color: #1e3a8a; margin: 0 0 15px 0; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #dbeafe; padding-bottom: 8px;">BLOCKERS</h2>
              <p style="font-size: 12px; color: #1e40af; line-height: 1.6; white-space: pre-wrap; font-weight: 500; margin: 0;">${blockerText.trim()}</p>
            </div>
          `;
  }

  html += `
          </div>
        `;

  container.innerHTML = html;
  document.body.appendChild(container);

  html2canvas(container, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: "#ffffff",
  })
    .then((canvas) => {
      document.body.removeChild(container);
      const link = document.createElement("a");
      const dateSuffix =
        customDateStr && typeof customDateStr === "string"
          ? new Date(customDateStr)
            .toLocaleDateString("en-GB")
            .replace(/\//g, "-")
          : new Date().toLocaleDateString("en-GB").replace(/\//g, "-");

      const userSuffix = (activeUserTab !== "all" && targetData === workData)
        ? "_" + activeUserTab.replace(/\s+/g, "_")
        : "";
      link.download = `Daily_Report${userSuffix}_${dateSuffix}.jpg`;
      link.href = canvas.toDataURL("image/jpeg", 0.95);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      btn.innerHTML = originalContent;
      btn.disabled = false;
    })
    .catch((err) => {
      if (document.body.contains(container)) {
        document.body.removeChild(container);
      }
      btn.innerHTML = originalContent;
      btn.disabled = false;
      alert("Error generating image report: " + err.message);
    });
};

// Dynamic UI First Load Trigger
populateUserDropdown();
populateCompanyDropdown();
if (defaultUser) {
  userName.value = defaultUser;
}
renderUI();
runAutoBackup();

// Initialize Google Sync badge status
updateSyncStatusBadge("idle");

// ==============================
// Company Management Modal
// ==============================
window.openCompanyModal = function () {
  editingCompanyIndex = -1;
  const input = document.getElementById("newCompanyName");
  if (input) input.value = "";
  renderCompanyList();
  document.getElementById("companyModal").style.display = "flex";
};

window.closeCompanyModal = function () {
  document.getElementById("companyModal").style.display = "none";
  populateCompanyDropdown();
};

window.renderCompanyList = function () {
  const wrapper = document.getElementById("companyListWrapper");
  if (!wrapper) return;
  wrapper.innerHTML = "";

  if (companies.length === 0) {
    wrapper.innerHTML = `
            <div style="padding: 15px; text-align: center; color: var(--color-label); font-style: italic;">
              No companies added yet.
            </div>
          `;
    return;
  }

  companies.forEach((co, idx) => {
    const div = document.createElement("div");
    div.style.display = "flex";
    div.style.justifyContent = "space-between";
    div.style.alignItems = "center";
    div.style.gap = "12px";
    div.style.padding = "10px 12px";
    div.style.background =
      idx % 2 === 0 ? "var(--bg-modal)" : "var(--bg-form-col)";
    div.style.borderBottom =
      idx < companies.length - 1
        ? "1px solid var(--color-border)"
        : "none";

    if (editingCompanyIndex === idx) {
      div.innerHTML = `
              <input type="text" id="editCoVal_${idx}" value="${co.replace(/"/g, "&quot;")}" style="flex: 1; padding: 6px 10px; border: 1.5px solid #ff9900; border-radius: 6px; font-size: 13px; outline: none; margin-right: 8px; min-width: 0; background: var(--bg-input); color: var(--color-input-text);" />
              <div style="display: flex; gap: 4px; flex-shrink: 0;">
                <button type="button" class="save-btn" style="padding: 6px 10px; font-size: 11px; margin: 0; background: #10b981;" onclick="saveCompanyEdit(${idx})">
                  <i class="fa-solid fa-check"></i>
                </button>
                <button type="button" class="reset-btn" style="padding: 6px 10px; font-size: 11px; margin: 0;" onclick="cancelCompanyEdit()">
                  <i class="fa-solid fa-xmark"></i>
                </button>
              </div>
            `;
    } else {
      div.innerHTML = `
              <span style="font-size: 14px; font-weight: 500; color: var(--color-text-main); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1;" title="${co.replace(/"/g, "&quot;")}">${co}</span>
              <div style="display: flex; gap: 4px; flex-shrink: 0;">
                <button type="button" class="edit-btn" style="padding: 6px 10px; font-size: 11px; margin: 0;" onclick="startCompanyEdit(${idx})">
                  <i class="fa-solid fa-pen"></i>
                </button>
                <button type="button" class="delete-btn" style="padding: 6px 10px; font-size: 11px; margin: 0;" onclick="deleteCompany(${idx})">
                  <i class="fa-solid fa-trash"></i>
                </button>
              </div>
            `;
    }
    wrapper.appendChild(div);
  });
};

window.addCompany = function () {
  const input = document.getElementById("newCompanyName");
  if (!input) return;
  const val = input.value.trim();

  if (!val) {
    alert("Please enter a valid company name.");
    return;
  }

  const exists = companies.some(
    (co) => co.toLowerCase() === val.toLowerCase(),
  );
  if (exists) {
    alert("This company name already exists.");
    return;
  }

  companies.push(val);
  companies.sort((a, b) => a.localeCompare(b));

  localStorage.setItem("amazonCompanies", JSON.stringify(companies));
  input.value = "";

  renderCompanyList();
  populateCompanyDropdown();
};

window.startCompanyEdit = function (idx) {
  editingCompanyIndex = idx;
  renderCompanyList();
  setTimeout(() => {
    const inp = document.getElementById(`editCoVal_${idx}`);
    if (inp) inp.select();
  }, 50);
};

window.saveCompanyEdit = function (idx) {
  const input = document.getElementById(`editCoVal_${idx}`);
  if (!input) return;
  const val = input.value.trim();

  if (!val) {
    alert("Please enter a valid company name.");
    return;
  }

  const exists = companies.some(
    (co, i) => i !== idx && co.toLowerCase() === val.toLowerCase(),
  );
  if (exists) {
    alert("This company name already exists.");
    return;
  }

  companies[idx] = val;
  companies.sort((a, b) => a.localeCompare(b));

  localStorage.setItem("amazonCompanies", JSON.stringify(companies));
  editingCompanyIndex = -1;

  renderCompanyList();
  populateCompanyDropdown();
};

window.cancelCompanyEdit = function () {
  editingCompanyIndex = -1;
  renderCompanyList();
};

window.deleteCompany = function (idx) {
  const name = companies[idx];
  if (
    confirm(
      `Are you sure you want to delete "${name}" from the active dropdown? This will not affect existing reports.`,
    )
  ) {
    companies.splice(idx, 1);
    localStorage.setItem("amazonCompanies", JSON.stringify(companies));
    renderCompanyList();
    populateCompanyDropdown();
  }
};

// ============================================================
// OWNER PIN & ARCHIVE MANAGEMENT SYSTEM
// ============================================================

let ownerPin = localStorage.getItem("amazonOwnerPin") || "0001";
let isOwnerVerified = sessionStorage.getItem("amazonOwnerVerified") === "true";
let pinSuccessCallback = null;

// PIN Digit Auto-advance and Backspace logic
setTimeout(() => {
  const pinInputs = [
    document.getElementById("pin1"),
    document.getElementById("pin2"),
    document.getElementById("pin3"),
    document.getElementById("pin4")
  ];
  pinInputs.forEach((input, index) => {
    if (!input) return;
    input.addEventListener("input", (e) => {
      input.value = input.value.replace(/[^0-9]/g, "");
      if (input.value && index < 3) {
        pinInputs[index + 1].focus();
      }
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Backspace" && !input.value && index > 0) {
        pinInputs[index - 1].focus();
      }
      if (e.key === "Enter") {
        submitPinVerification();
      }
    });
  });
}, 200);

window.promptOwnerPin = function (callback) {
  if (sessionStorage.getItem("amazonOwnerVerified") === "true") {
    isOwnerVerified = true;
    callback();
    return;
  }
  pinSuccessCallback = callback;
  document.getElementById("pin1").value = "";
  document.getElementById("pin2").value = "";
  document.getElementById("pin3").value = "";
  document.getElementById("pin4").value = "";
  document.getElementById("pinError").style.display = "none";
  document.getElementById("pinModal").style.display = "flex";
  setTimeout(() => document.getElementById("pin1").focus(), 100);
};

window.submitPinVerification = function () {
  const p1 = document.getElementById("pin1").value;
  const p2 = document.getElementById("pin2").value;
  const p3 = document.getElementById("pin3").value;
  const p4 = document.getElementById("pin4").value;
  const pinEntered = p1 + p2 + p3 + p4;
  const errDiv = document.getElementById("pinError");

  if (pinEntered === ownerPin) {
    sessionStorage.setItem("amazonOwnerVerified", "true");
    isOwnerVerified = true;
    document.getElementById("pinModal").style.display = "none";
    if (pinSuccessCallback) {
      pinSuccessCallback();
      pinSuccessCallback = null;
    }
  } else {
    errDiv.style.display = "block";
    document.getElementById("pin1").value = "";
    document.getElementById("pin2").value = "";
    document.getElementById("pin3").value = "";
    document.getElementById("pin4").value = "";
    document.getElementById("pin1").focus();
  }
};

window.closePinModal = function () {
  document.getElementById("pinModal").style.display = "none";
  pinSuccessCallback = null;
};

// Archive Reason Modal Controls
let pendingArchiveName = "";
let pendingArchiveIdx = -1;

window.openArchiveReasonModal = function (name, idx) {
  pendingArchiveName = name;
  pendingArchiveIdx = idx;
  document.getElementById("archiveReasonUserName").textContent = name;
  document.getElementById("archiveReasonInput").value = "";
  document.getElementById("archiveReasonError").style.display = "none";
  document.getElementById("archiveReasonModal").style.display = "flex";
  setTimeout(() => document.getElementById("archiveReasonInput").focus(), 100);
};

window.closeArchiveReasonModal = function () {
  document.getElementById("archiveReasonModal").style.display = "none";
};

window.confirmArchiveEmployee = function () {
  const reason = document.getElementById("archiveReasonInput").value.trim();
  if (!reason) {
    document.getElementById("archiveReasonError").style.display = "block";
    return;
  }
  document.getElementById("archiveReasonModal").style.display = "none";
  performArchiving(pendingArchiveName, pendingArchiveIdx, reason);
};

function performArchiving(name, idx, reason) {
  let totals = {};
  configCounters.forEach(c => totals[c.id] = 0);
  let userRecords = workData.filter(item => item.userName === name);
  userRecords.forEach(item => {
    configCounters.forEach(c => {
      totals[c.id] += Number(item[c.id]) || 0;
    });
  });

  let archiveObj = {
    name: name,
    archivedDate: new Date().toLocaleDateString("en-GB").replace(/\//g, "-"),
    archivedBy: "Owner",
    archiveReason: reason,
    totals: totals,
    lastWorkingDate: userRecords.length > 0
      ? userRecords.map(r => r.date).sort().pop()
      : "No entries",
    workRecords: userRecords,
    archivedAt: Date.now()
  };

  let archivedUsers = JSON.parse(localStorage.getItem("amazonArchivedUsers")) || [];
  archivedUsers.push(archiveObj);
  localStorage.setItem("amazonArchivedUsers", JSON.stringify(archivedUsers));

  // Remove from active team list
  teamUsers.splice(idx, 1);
  localStorage.setItem("amazonUsers", JSON.stringify(teamUsers));
  if (defaultUser === name) {
    defaultUser = "";
    localStorage.removeItem("amazonDefaultUser");
  }

  // Remove active work reports of this user
  workData = workData.filter(item => item.userName !== name);
  localStorage.setItem("amazonWork", JSON.stringify(workData));

  // Sync to Google Sheets
  syncArchiveToGoogleSheets(name, archiveObj);

  // Refresh UI
  renderSettingsUsers();
  renderUI();
  renderArchiveSection();
  alert(`Employee "${name}" has been successfully archived!`);
}

// Restore Employee
window.restoreEmployee = function (name) {
  promptOwnerPin(() => {
    performRestore(name);
  });
};

function performRestore(name) {
  let archivedUsers = JSON.parse(localStorage.getItem("amazonArchivedUsers")) || [];
  let idx = archivedUsers.findIndex(u => u.name === name);
  if (idx === -1) return;

  let emp = archivedUsers[idx];

  // Add back to active team users
  if (!teamUsers.includes(emp.name)) {
    teamUsers.push(emp.name);
    localStorage.setItem("amazonUsers", JSON.stringify(teamUsers));
  }

  // Add records back to workData safely avoiding duplicate IDs
  if (emp.workRecords && emp.workRecords.length > 0) {
    const existingIds = new Set(workData.map(item => item.id));
    const newRecords = emp.workRecords.filter(item => !existingIds.has(item.id));
    workData = workData.concat(newRecords);
    localStorage.setItem("amazonWork", JSON.stringify(workData));
  }

  // Remove from archived list
  archivedUsers.splice(idx, 1);
  localStorage.setItem("amazonArchivedUsers", JSON.stringify(archivedUsers));

  // Sync restored user sheet, All Data, and Dashboard to Google Sheets
  syncRestoreToGoogleSheets(emp.name, emp.workRecords || []);

  // Refresh UI (Dashboard, user tabs, records table)
  renderSettingsUsers();
  renderUI();
  renderArchiveSection();
  alert(`Employee "${emp.name}" has been successfully restored!`);
}

// Permanent Delete
window.permanentlyDeleteArchived = function (name) {
  if (confirm(`Are you sure you want to PERMANENTLY delete "${name}" and all historical archive data? This action cannot be undone.`)) {
    promptOwnerPin(() => {
      let archivedUsers = JSON.parse(localStorage.getItem("amazonArchivedUsers")) || [];
      archivedUsers = archivedUsers.filter(u => u.name !== name);
      localStorage.setItem("amazonArchivedUsers", JSON.stringify(archivedUsers));

      syncDeleteArchivedToGoogleSheets(name);

      renderArchiveSection();
      alert(`Successfully deleted "${name}" from archives permanently.`);
    });
  }
};

// Render Archive Section UI
window.renderArchiveSection = function () {
  const container = document.getElementById("archiveListContainer");
  const countBadge = document.getElementById("archiveCountBadge");
  const headerCount = document.getElementById("archiveHeaderCount");
  if (!container) return;

  const archivedUsers = JSON.parse(localStorage.getItem("amazonArchivedUsers")) || [];

  if (countBadge) countBadge.textContent = archivedUsers.length;
  if (headerCount) headerCount.textContent = archivedUsers.length;

  container.innerHTML = "";

  if (archivedUsers.length === 0) {
    container.innerHTML = `
          <div class="archive-empty-state">
            <i class="fa-solid fa-box-open"></i>
            <p>No archived employees found.</p>
            <small>When you delete an employee from settings, they will be archived here.</small>
          </div>
        `;
    return;
  }

  archivedUsers.forEach(emp => {
    const card = document.createElement("div");
    card.className = "archive-employee-card";

    let statsHtml = "";
    configCounters.forEach((c, index) => {
      if (c.active) {
        const val = emp.totals[c.id] || 0;
        statsHtml += `
              <div class="archive-stat-chip">
                <i class="${c.icon}"></i>
                <span>${c.label}:</span>
                <span class="chip-value">${val}</span>
              </div>
            `;
      }
    });

    let actionButtons = "";
    if (isOwnerVerified) {
      actionButtons = `
            <button class="archive-action-btn btn-restore" onclick="restoreEmployee('${emp.name.replace(/'/g, "\\'")}')">
              <i class="fa-solid fa-rotate-left"></i> Restore Employee
            </button>
            <button class="archive-action-btn btn-perm-delete" onclick="permanentlyDeleteArchived('${emp.name.replace(/'/g, "\\'")}')">
              <i class="fa-solid fa-trash-can"></i> Delete Permanently
            </button>
          `;
    } else {
      actionButtons = `
            <span class="owner-only-label"><i class="fa-solid fa-lock"></i> Verification required for Restore/Delete</span>
          `;
    }

    card.innerHTML = `
          <div class="archive-card-header">
            <div class="archive-employee-name">
              <div class="archive-avatar">${emp.name.charAt(0).toUpperCase()}</div>
              <div class="archive-meta">
                <strong>${emp.name}</strong>
                <span>Archived: ${emp.archivedDate}</span>
                <span class="meta-dot"></span>
                <span>Reason: ${emp.archiveReason}</span>
              </div>
            </div>
          </div>
          <div class="archive-stats-row">
            ${statsHtml}
          </div>
          <div class="archive-card-actions">
            <button class="archive-action-btn btn-view" onclick="showArchiveDetails('${emp.name.replace(/'/g, "\\'")}')">
              <i class="fa-solid fa-eye"></i> View History Details
            </button>
            ${actionButtons}
          </div>
        `;
    container.appendChild(card);
  });
};

window.toggleArchiveSection = function () {
  const section = document.getElementById("archiveSection");
  if (!section) return;
  if (section.style.display === "none") {
    section.style.display = "block";
    renderArchiveSection();
    section.scrollIntoView({ behavior: "smooth" });
  } else {
    section.style.display = "none";
  }
};

// Archive Details Modal
window.showArchiveDetails = function (name) {
  const archivedUsers = JSON.parse(localStorage.getItem("amazonArchivedUsers")) || [];
  const emp = archivedUsers.find(u => u.name === name);
  if (!emp) return;

  const detailsBody = document.getElementById("archiveDetailsBody");
  if (!detailsBody) return;

  let headerHtml = `
        <div class="archive-details-header-card">
          <div class="archive-details-avatar">${emp.name.charAt(0).toUpperCase()}</div>
          <div class="archive-details-info">
            <h3>${emp.name}</h3>
            <p>Archive Date: ${emp.archivedDate} (By: ${emp.archivedBy || "Owner"})</p>
          </div>
        </div>
      `;

  let statsGrid = '<div class="archive-details-stats-grid">';
  configCounters.forEach(c => {
    if (c.active) {
      statsGrid += `
            <div class="archive-details-stat">
              <div class="stat-label">${c.label}</div>
              <div class="stat-val">${emp.totals[c.id] || 0}</div>
            </div>
          `;
    }
  });
  statsGrid += '</div>';

  let metaBox = `
        <div class="archive-details-meta-box">
          <div class="archive-meta-row">
            <span class="meta-label"><i class="fa-solid fa-circle-question"></i> Reason</span>
            <span class="meta-value">${emp.archiveReason || "-"}</span>
          </div>
          <div class="archive-meta-row">
            <span class="meta-label"><i class="fa-solid fa-calendar-check"></i> Last Working Date</span>
            <span class="meta-value">${emp.lastWorkingDate || "-"}</span>
          </div>
        </div>
      `;

  let recordsTable = `
        <h4 style="margin:16px 0 8px; font-weight:600; color:var(--color-text-value);">Work Records History (Read-Only)</h4>
        <div style="max-height: 250px; overflow-y: auto; border: 1.5px solid var(--color-border); border-radius: 8px;">
          <table style="width:100%; border-collapse:collapse; font-size:12.5px;">
            <thead style="background:var(--bg-table-header); color:#fff; position:sticky; top:0; z-index:10;">
              <tr>
                <th style="padding:8px;">Date</th>
                <th style="padding:8px;">Company</th>
      `;
  configCounters.forEach(c => {
    if (c.active) {
      recordsTable += `<th style="padding:8px;">${c.label}</th>`;
    }
  });
  recordsTable += `
              </tr>
            </thead>
            <tbody>
      `;

  if (!emp.workRecords || emp.workRecords.length === 0) {
    recordsTable += `<tr><td colspan="${2 + configCounters.filter(c => c.active).length}" style="text-align:center; padding:15px; color:var(--color-label);">No records found.</td></tr>`;
  } else {
    emp.workRecords.forEach(rec => {
      const formattedDate = new Date(rec.date).toLocaleDateString("en-GB").replace(/\//g, "-");
      recordsTable += `
            <tr style="border-bottom:1px solid var(--color-table-border);">
              <td style="padding:8px; text-align:center;">${formattedDate}</td>
              <td style="padding:8px; text-align:center;">${rec.company}</td>
          `;
      configCounters.forEach(c => {
        if (c.active) {
          recordsTable += `<td style="padding:8px; text-align:center;">${rec[c.id] || 0}</td>`;
        }
      });
      recordsTable += `</tr>`;
    });
  }

  recordsTable += `
            </tbody>
          </table>
        </div>
      `;

  detailsBody.innerHTML = headerHtml + statsGrid + metaBox + recordsTable;
  document.getElementById("archiveDetailsModal").style.display = "flex";
};

window.closeArchiveDetailsModal = function () {
  document.getElementById("archiveDetailsModal").style.display = "none";
};

// Owner settings panel rendering
window.renderOwnerSettings = function () {
  const content = document.getElementById("ownerSettingsContent");
  if (!content) return;

  if (!isOwnerVerified) {
    content.innerHTML = `
          <div style="text-align:center; padding:30px 10px;">
            <i class="fa-solid fa-shield-halved" style="font-size:48px; color:var(--color-label); margin-bottom:15px; display:block;"></i>
            <h4 style="font-size:16px; font-weight:700; color:var(--color-text-value); margin-bottom:6px;">Owner Controls Locked</h4>
            <p style="font-size:13px; color:var(--color-label); margin-bottom:20px;">Verification is required to access sensitive actions (PIN change, Archive management, etc.).</p>
            <button type="button" class="pin-submit-btn" style="max-width:200px; margin:0 auto;" onclick="promptOwnerPin(() => { renderOwnerSettings(); renderArchiveSection(); })">
              <i class="fa-solid fa-key"></i> Verify Owner PIN
            </button>
          </div>
        `;
  } else {
    const isDefaultPin = ownerPin === "0000";
    let warningMsg = isDefaultPin
      ? `<div class="alert-danger" style="margin-bottom:15px; font-size:12px; padding:10px 12px;"><i class="fa-solid fa-triangle-exclamation"></i> Warning: You are using the default PIN "0000". Please change it immediately.</div>`
      : "";

    content.innerHTML = `
          <div style="padding:10px 0;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:18px;">
              <span class="owner-verified-badge"><i class="fa-solid fa-circle-check"></i> Owner Mode Verified</span>
              <button type="button" class="reset-btn" style="padding:6px 12px; font-size:12px; margin:0;" onclick="lockOwnerMode()">
                <i class="fa-solid fa-lock"></i> Lock Owner Mode
              </button>
            </div>
            
            ${warningMsg}

            <h4 style="font-size:14px; font-weight:700; color:var(--color-text-value); margin-bottom:12px; border-bottom:1.5px solid var(--color-border); padding-bottom:6px;">
              Change Owner PIN
            </h4>
            
            <div style="display:grid; grid-template-columns:1fr; gap:12px; max-width:300px; margin-bottom:16px;">
              <div class="input-group">
                <label style="font-size:12px; margin-bottom:4px;">Current PIN</label>
                <input type="password" id="currentPinInp" maxlength="4" style="padding:8px 10px; border:1.5px solid var(--color-input-border); border-radius:6px; background:var(--bg-input); color:var(--color-input-text);" placeholder="••••" />
              </div>
              <div class="input-group">
                <label style="font-size:12px; margin-bottom:4px;">New 4-Digit PIN</label>
                <input type="password" id="newPinInp" maxlength="4" style="padding:8px 10px; border:1.5px solid var(--color-input-border); border-radius:6px; background:var(--bg-input); color:var(--color-input-text);" placeholder="••••" />
              </div>
              <div class="input-group">
                <label style="font-size:12px; margin-bottom:4px;">Confirm New PIN</label>
                <input type="password" id="confirmPinInp" maxlength="4" style="padding:8px 10px; border:1.5px solid var(--color-input-border); border-radius:6px; background:var(--bg-input); color:var(--color-input-text);" placeholder="••••" />
              </div>
            </div>
            
            <div id="pinChangeError" style="color:#ef4444; font-size:12px; font-weight:600; margin-bottom:12px; display:none;"></div>
            <div id="pinChangeSuccess" style="color:#10b981; font-size:12px; font-weight:600; margin-bottom:12px; display:none;"></div>

            <button type="button" class="save-btn" style="padding:8px 16px; font-size:13px;" onclick="changeOwnerPin()">
              Update PIN
            </button>
          </div>
        `;
  }
};

window.lockOwnerMode = function () {
  sessionStorage.removeItem("amazonOwnerVerified");
  isOwnerVerified = false;
  renderOwnerSettings();
  renderArchiveSection();
};

window.changeOwnerPin = function () {
  const cur = document.getElementById("currentPinInp").value.trim();
  const n1 = document.getElementById("newPinInp").value.trim();
  const n2 = document.getElementById("confirmPinInp").value.trim();
  const errDiv = document.getElementById("pinChangeError");
  const succDiv = document.getElementById("pinChangeSuccess");

  errDiv.style.display = "none";
  succDiv.style.display = "none";

  if (cur !== ownerPin) {
    errDiv.textContent = "Current PIN is incorrect.";
    errDiv.style.display = "block";
    return;
  }

  if (n1.length !== 4 || !/^\d+$/.test(n1)) {
    errDiv.textContent = "New PIN must be exactly 4 digits.";
    errDiv.style.display = "block";
    return;
  }

  if (n1 !== n2) {
    errDiv.textContent = "New PINs do not match.";
    errDiv.style.display = "block";
    return;
  }

  ownerPin = n1;
  localStorage.setItem("amazonOwnerPin", n1);
  succDiv.textContent = "Owner PIN updated successfully!";
  succDiv.style.display = "block";

  document.getElementById("currentPinInp").value = "";
  document.getElementById("newPinInp").value = "";
  document.getElementById("confirmPinInp").value = "";
};

// Sync helpers
function syncArchiveToGoogleSheets(userName, archiveObj) {
  if (!googleSyncEnabled || !googleSyncUrl) return;
  updateSyncStatusBadge("syncing");

  fetch(googleSyncUrl, {
    method: "POST",
    mode: "cors",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify({ action: "archiveEmployee", userName: userName, archiveData: archiveObj })
  })
    .then(response => response.json())
    .then(data => {
      if (data && data.status === "success") {
        updateSyncStatusBadge("idle");
      } else {
        console.error("Archive sync failed:", data);
        updateSyncStatusBadge("error");
      }
    })
    .catch(err => {
      console.error("Archive sync network error:", err);
      updateSyncStatusBadge("error");
    });
}

function syncRestoreToGoogleSheets(userName, workRecords) {
  if (!googleSyncEnabled || !googleSyncUrl) return;
  updateSyncStatusBadge("syncing");

  fetch(googleSyncUrl, {
    method: "POST",
    mode: "cors",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify({ action: "restoreEmployee", userName: userName, workRecords: workRecords || [] })
  })
    .then(response => response.json())
    .then(data => {
      if (data && data.status === "success") {
        updateSyncStatusBadge("idle");
      } else {
        console.error("Restore sync failed:", data);
        updateSyncStatusBadge("error");
      }
    })
    .catch(err => {
      console.error("Restore sync network error:", err);
      updateSyncStatusBadge("error");
    });
}

function syncDeleteArchivedToGoogleSheets(userName) {
  if (!googleSyncEnabled || !googleSyncUrl) return;
  updateSyncStatusBadge("syncing");

  fetch(googleSyncUrl, {
    method: "POST",
    mode: "cors",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify({ action: "deleteArchived", userName: userName })
  })
    .then(response => response.json())
    .then(data => {
      if (data && data.status === "success") {
        updateSyncStatusBadge("idle");
      } else {
        console.error("Delete archived sync failed:", data);
        updateSyncStatusBadge("error");
      }
    })
    .catch(err => {
      console.error("Delete archived sync network error:", err);
      updateSyncStatusBadge("error");
    });
}

// Auto load archive status on start
setTimeout(() => {
  renderArchiveSection();
}, 100);

// ============================================================
// Firebase Auth, Guest Mode & Toast Notifications
// ============================================================

window.showToast = function (message, type = "error", actionText = "Login") {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast-card ${type}`;

  const iconClass = type === "error" ? "fa-solid fa-circle-exclamation" : (type === "warning" ? "fa-solid fa-triangle-exclamation" : "fa-solid fa-circle-info");
  const iconColor = type === "error" ? "#ef4444" : (type === "warning" ? "#f59e0b" : "#3b82f6");

  toast.innerHTML = `
    <div class="toast-content">
      <i class="${iconClass}" style="color: ${iconColor}; font-size: 16px; flex-shrink: 0;"></i>
      <span>${message}</span>
    </div>
    <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0;">
      ${actionText ? `<button type="button" class="toast-login-btn" onclick="showAuthModal()">${actionText}</button>` : ""}
      <button type="button" class="toast-close-btn" onclick="this.closest('.toast-card').remove()"><i class="fa-solid fa-xmark"></i></button>
    </div>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    if (toast.parentNode) {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(50px)";
      setTimeout(() => toast.remove(), 300);
    }
  }, 4000);
};

window.closeAuthModal = function () {
  const modal = document.getElementById("authModal");
  if (modal) modal.style.display = "none";
  if (!currentUser && (!currentUserProfile || currentUserProfile.role === "guest")) {
    currentUserProfile = { userName: "Guest Mode", role: "guest" };
    applyRolePermissions();
  }
};

window.continueAsGuest = function () {
  closeAuthModal();
};

function initAuthAndFirestore() {
  if (typeof firebase === "undefined") {
    setTimeout(initAuthAndFirestore, 200);
    return;
  }

  if (!initFirebase()) {
    console.warn("Firebase initialization skipped or failed.");
    return;
  }

  auth.onAuthStateChanged(async (user) => {
    if (user) {
      currentUser = user;
      const modal = document.getElementById("authModal");
      if (modal) modal.style.display = "none";

      try {
        const userDoc = await db.collection("users").doc(user.uid).get();
        if (userDoc.exists) {
          currentUserProfile = userDoc.data();
        } else {
          currentUserProfile = {
            uid: user.uid,
            email: user.email,
            userName: user.displayName || user.email.split("@")[0],
            role: "user"
          };
          await db.collection("users").doc(user.uid).set(currentUserProfile, { merge: true });
        }
      } catch (err) {
        console.error("Error loading user profile:", err);
        currentUserProfile = {
          uid: user.uid,
          email: user.email,
          userName: user.displayName || user.email.split("@")[0],
          role: "user"
        };
      }
    } else {
      currentUser = null;
      currentUserProfile = { userName: "Guest Mode", role: "guest" };
    }

    applyRolePermissions();
    subscribeToFirestoreReports();
  });
}

function showAuthModal() {
  const modal = document.getElementById("authModal");
  if (modal) modal.style.display = "flex";
}

window.toggleAuthMode = function () {
  authMode = authMode === "login" ? "signup" : "login";
  const title = document.getElementById("authModalTitle");
  const subtitle = document.getElementById("authModalSubtitle");
  const nameGroup = document.getElementById("authNameGroup");
  const roleGroup = document.getElementById("authRoleGroup");
  const submitBtn = document.getElementById("authSubmitBtn");
  const toggleText = document.getElementById("authToggleText");
  const toggleBtn = document.getElementById("authToggleBtn");
  const errDiv = document.getElementById("authErrorMsg");
  if (errDiv) errDiv.style.display = "none";

  if (authMode === "signup") {
    title.textContent = "Create Account";
    subtitle.textContent = "Register employee or admin profile";
    nameGroup.style.display = "block";
    roleGroup.style.display = "block";
    submitBtn.textContent = "Sign Up";
    toggleText.textContent = "Already have an account?";
    toggleBtn.textContent = "Log In";
  } else {
    title.textContent = "Account Login";
    subtitle.textContent = "Sign in to access Daily Work Report system";
    nameGroup.style.display = "none";
    roleGroup.style.display = "none";
    submitBtn.textContent = "Sign In";
    toggleText.textContent = "Need an account?";
    toggleBtn.textContent = "Create One";
  }
};

window.handleAuthSubmit = async function (e) {
  e.preventDefault();
  const email = document.getElementById("authEmailInput").value.trim();
  const password = document.getElementById("authPasswordInput").value;
  const name = document.getElementById("authNameInput").value.trim();
  const role = document.getElementById("authRoleInput").value;
  const errDiv = document.getElementById("authErrorMsg");
  if (errDiv) errDiv.style.display = "none";

  try {
    if (authMode === "signup") {
      if (!name) {
        errDiv.textContent = "Please enter your employee full name.";
        errDiv.style.display = "block";
        return;
      }
      const cred = await auth.createUserWithEmailAndPassword(email, password);
      await cred.user.updateProfile({ displayName: name });

      const profile = {
        uid: cred.user.uid,
        email: email,
        userName: name,
        role: role,
        createdAt: new Date().toISOString()
      };
      await db.collection("users").doc(cred.user.uid).set(profile);
      currentUserProfile = profile;

      if (!teamUsers.includes(name)) {
        teamUsers.push(name);
        localStorage.setItem("amazonUsers", JSON.stringify(teamUsers));
      }
    } else {
      await auth.signInWithEmailAndPassword(email, password);
    }
  } catch (err) {
    console.error("Auth submit error:", err);
    if (errDiv) {
      if (err.code === "auth/api-key-not-valid" || (err.message && err.message.includes("api-key-not-valid"))) {
        errDiv.innerHTML = `⚠️ <strong>Firebase API Key Error:</strong><br>Aapko Firebase Console se real API key la kar <code>firebase-config.js</code> file mein paste karni hai.<br>Poori tafseel ke liye <strong>firebase_setup_guide.tst</strong> file kholein!`;
      } else {
        errDiv.textContent = err.message || "Authentication failed. Please check credentials.";
      }
      errDiv.style.display = "block";
    }
  }
};

window.logoutUser = function () {
  if (auth) {
    auth.signOut().then(() => {
      window.location.reload();
    });
  }
};

function applyRolePermissions() {
  if (!currentUserProfile) return;

  const userNameHeader = document.getElementById("headerUserNameText");
  const roleBadgeHeader = document.getElementById("headerRoleBadge");
  const userProfileBadge = document.getElementById("userProfileBadge");

  const isGuest = !currentUser || currentUserProfile.role === "guest";
  const roleStr = isGuest ? "guest" : (currentUserProfile.role || "user").toLowerCase();

  if (userNameHeader) userNameHeader.textContent = isGuest ? "Guest Mode" : (currentUserProfile.userName || currentUserProfile.email);
  if (roleBadgeHeader) {
    roleBadgeHeader.textContent = roleStr.toUpperCase();
    roleBadgeHeader.className = `role-pill-badge ${roleStr}`;
  }

  if (userProfileBadge) {
    if (isGuest) {
      userProfileBadge.innerHTML = `
        <i class="fa-solid fa-user-lock" style="color: #94a3b8;"></i>
        <span id="headerUserNameText">Guest Mode</span>
        <span id="headerRoleBadge" class="role-pill-badge guest">GUEST</span>
        <button type="button" onclick="showAuthModal()" title="Login" class="toast-login-btn">
          <i class="fa-solid fa-right-to-bracket"></i> Login
        </button>
      `;
    } else {
      userProfileBadge.innerHTML = `
        <i class="fa-solid fa-user-gear" style="color: #ff9900;"></i>
        <span id="headerUserNameText">${currentUserProfile.userName || currentUserProfile.email}</span>
        <span id="headerRoleBadge" class="role-pill-badge ${roleStr}">${roleStr.toUpperCase()}</span>
        <button type="button" onclick="logoutUser()" title="Logout" style="background: none; border: none; color: #ef4444; cursor: pointer; padding: 0 4px; font-size: 12px;">
          <i class="fa-solid fa-right-from-bracket"></i>
        </button>
      `;
    }
  }

  const isUserRole = currentUserProfile.role === "user";

  if (isUserRole) {
    if (userName) {
      userName.value = currentUserProfile.userName;
      userName.disabled = true;
    }
    activeUserTab = currentUserProfile.userName;
  } else {
    if (userName) {
      userName.disabled = false;
    }
  }

  renderUI();
  if (!isGuest && currentUserProfile.role === "admin") {
    checkMissingTodayReports();
  } else {
    const alertBanner = document.getElementById("missingReportsAlertBanner");
    if (alertBanner) alertBanner.style.display = "none";
  }
}

function subscribeToFirestoreReports() {
  if (!db) return;
  if (firestoreUnsubscribe) firestoreUnsubscribe();

  firestoreUnsubscribe = db.collection("reports").onSnapshot(
    (snapshot) => {
      const remoteData = [];
      snapshot.forEach((doc) => {
        remoteData.push(doc.data());
      });

      remoteData.sort((a, b) => new Date(b.date) - new Date(a.date));
      workData = remoteData;
      localStorage.setItem("amazonWork", JSON.stringify(workData));

      renderUI();
      if (currentUserProfile && currentUserProfile.role === "admin") {
        checkMissingTodayReports();
      }
    },
    (err) => {
      console.error("Firestore real-time subscription error:", err);
    }
  );
}

window.openEditHistoryModal = function (index) {
  const item = workData[index];
  if (!item) return;

  const modal = document.getElementById("editHistoryModal");
  const container = document.getElementById("editHistoryContent");
  if (!modal || !container) return;

  const history = item.editHistory || [];
  if (history.length === 0) {
    container.innerHTML = `
      <div style="padding: 20px; text-align: center; color: var(--color-label); font-style: italic;">
        No edit history recorded for this report. (Original Creation Date: ${item.date || "N/A"})
      </div>
    `;
  } else {
    let html = "";
    history.forEach((h) => {
      html += `
        <div class="history-item">
          <div class="history-dot"></div>
          <div class="history-meta">
            <span class="history-user"><i class="fa-regular fa-user"></i> ${h.editedBy || "Unknown User"}</span>
            <span><i class="fa-regular fa-clock"></i> ${h.timestamp || ""}</span>
          </div>
          <div class="history-changes">
            ${h.note || "Updated report metrics & notes"}
          </div>
        </div>
      `;
    });
    container.innerHTML = html;
  }

  modal.style.display = "flex";
};

window.closeEditHistoryModal = function () {
  const modal = document.getElementById("editHistoryModal");
  if (modal) modal.style.display = "none";
};

function checkMissingTodayReports() {
  if (!currentUserProfile || currentUserProfile.role !== "admin") return;

  const alertBanner = document.getElementById("missingReportsAlertBanner");
  const missingListSpan = document.getElementById("missingUsersList");
  if (!alertBanner || !missingListSpan) return;

  const todayStr = new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD format

  const submittedUserNames = new Set(
    workData.filter((item) => item.date === todayStr).map((item) => item.userName)
  );

  const missingUsers = teamUsers.filter((u) => !submittedUserNames.has(u));

  if (missingUsers.length > 0) {
    missingListSpan.textContent = missingUsers.join(", ");
    alertBanner.style.display = "block";
  } else {
    alertBanner.style.display = "none";
  }
}

// Start Firebase Auth & Real-Time Sync on Page Load
document.addEventListener("DOMContentLoaded", () => {
  initAuthAndFirestore();
});

