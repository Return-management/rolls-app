/* ============================================================
   VARIABLES GLOBALES
============================================================ */
let userId = null;
let isAdmin = false;
let scans = [];
let usersCache = {};
let inactivityTimer = null;

let scannerStream = null;
let codeReader = new ZXing.BrowserMultiFormatReader();

/* ============================================================
   DECONNEXION + INACTIVITÉ
============================================================ */
function logout() {
  userId = null;
  isAdmin = false;

  document.getElementById("btnAdmin").style.display = "none";
  document.getElementById("app").style.display = "none";
  document.getElementById("login").style.display = "block";

  loginUser.value = "";
  loginPass.value = "";

  clearTimeout(inactivityTimer);
}

document.getElementById("btnLogout").addEventListener("click", logout);

function resetInactivityTimer() {
  clearTimeout(inactivityTimer);
  inactivityTimer = setTimeout(() => {
    alert("Déconnexion automatique après 5 minutes d'inactivité.");
    logout();
  }, 5 * 60 * 1000);
}

["click", "keydown", "mousemove", "scroll", "touchstart"].forEach(evt => {
  document.addEventListener(evt, resetInactivityTimer);
});

/* ============================================================
   CONNEXION
============================================================ */
document.getElementById("btnLogin").addEventListener("click", login);

async function login() {
  const username = loginUser.value.trim();
  const password = loginPass.value.trim();

  const res = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });

  const data = await res.json();

  if (!data.success) {
    loginError.textContent = "Identifiant ou mot de passe incorrect.";
    return;
  }

  userId = data.userId;
  isAdmin = data.isAdmin;

  currentUser.textContent = username;

  document.getElementById("login").style.display = "none";
  document.getElementById("app").style.display = "block";

  if (isAdmin) document.getElementById("btnAdmin").style.display = "inline-block";

  await chargerUsersCache();
  showScan();
  resetInactivityTimer();
}

/* ============================================================
   CHARGER UTILISATEURS
============================================================ */
async function chargerUsersCache() {
  const res = await fetch("/api/admin/listUsers");
  const data = await res.json();

  usersCache = {};
  data.users.forEach(u => {
    usersCache[u.id] = u.username;
  });
}

/* ============================================================
   NAVIGATION
============================================================ */
document.getElementById("btnPageScan").addEventListener("click", showScan);
document.getElementById("btnEmplacements").addEventListener("click", showEmplacements);
document.getElementById("btnHistorique").addEventListener("click", showHistorique);
document.getElementById("btnAdmin").addEventListener("click", showAdmin);

function hideAllPages() {
  pageScan.style.display = "none";
  pageEmplacements.style.display = "none";
  pageHistorique.style.display = "none";
  pageAdmin.style.display = "none";
}

function showScan() {
  hideAllPages();
  pageScan.style.display = "block";
}

function showEmplacements() {
  hideAllPages();
  pageEmplacements.style.display = "block";
  chargerEmplacements();
  activerFiltresEmplacements();
}

function showHistorique() {
  hideAllPages();
  pageHistorique.style.display = "block";
  chargerHistorique();
  activerFiltresHistorique();
}

function showAdmin() {
  hideAllPages();
  pageAdmin.style.display = "block";
  chargerUtilisateurs();
}
;
/* ============================================================
   HISTORIQUE DU ROLL
============================================================ */
function remplirTableauHistoriqueScan(historique) {
  const tbody = tableHistoriqueScan.querySelector("tbody");
  tbody.innerHTML = "";

  historique.forEach(h => {
    const username = usersCache[h.user_id] || "(inconnu)";
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${h.date}</td>
      <td>${h.emplacement}</td>
      <td>${h.statut}</td>
      <td>${username}</td>
      <td>${h.action}</td>
    `;

    tbody.appendChild(tr);
  });
}

/* ============================================================
   EMPLACEMENTS
============================================================ */
async function chargerEmplacements() {
  const res = await fetch("/api/emplacements");
  const data = await res.json();

  const tbody = tableEmplacements.querySelector("tbody");
  tbody.innerHTML = "";

  data.emplacements.forEach(e => {
    const username = usersCache[e.user_id] || "(inconnu)";
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${e.emplacement}</td>
      <td>${e.roll_id}</td>
      <td>${e.statut}</td>
      <td>${username}</td>
    `;

    tbody.appendChild(tr);
  });
}

/* ============================================================
   HISTORIQUE COMPLET
============================================================ */
async function chargerHistorique() {
  const res = await fetch("/api/historique");
  const data = await res.json();

  const tbody = tableHistorique.querySelector("tbody");
  tbody.innerHTML = "";

  data.historique.forEach(h => {
    const username = usersCache[h.user_id] || "(inconnu)";
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${h.date}</td>
      <td>${h.roll_id}</td>
      <td>${h.emplacement}</td>
      <td>${h.statut}</td>
      <td>${username}</td>
      <td>${h.action}</td>
    `;

    tbody.appendChild(tr);
  });
}

/* ============================================================
   ADMINISTRATION
============================================================ */
async function chargerUtilisateurs() {
  const res = await fetch("/api/admin/listUsers");
  const data = await res.json();

  const container = document.getElementById("listeUsers");
  container.innerHTML = "";

  data.users.forEach(u => {
    const div = document.createElement("div");
    div.className = "userLine";

    div.innerHTML = `
      <b>${u.username}</b>
      <div class="scanBox">
        <input type="password" id="pass_${u.id}" value="${u.password}">
        <button class="scanBtn" onclick="lancerScanner('pass_${u.id}')">📷</button>
      </div>
      <button onclick="updatePassword(${u.id})">Modifier</button>
      <button onclick="deleteUser(${u.id})">Supprimer</button>
    `;

    container.appendChild(div);
  });
}

document.getElementById("btnAddUser").addEventListener("click", async () => {
  const username = newUser.value.trim();
  const password = newPass.value.trim();

  const res = await fetch("/api/admin/addUser", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });

  const data = await res.json();

  if (!data.success) {
    adminInfo.textContent = "Erreur : " + data.error;
    return;
  }

  adminInfo.textContent = "Utilisateur ajouté.";
  newUser.value = "";
  newPass.value = "";

  chargerUtilisateurs();
});

async function deleteUser(id) {
  await fetch("/api/admin/deleteUser", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id })
  });

  chargerUtilisateurs();
}

async function updatePassword(id) {
  const newPassValue = document.getElementById("pass_" + id).value;

  await fetch("/api/admin/updatePassword", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, password: newPassValue })
  });

  chargerUtilisateurs();
}

document.getElementById("btnExportUsers").addEventListener("click", () => {
  window.location.href = "/api/admin/exportUsers";
});

/* ============================================================
   FILTRES TABLEAUX
============================================================ */
function filtrerTableauAvance(options) {
  const { tableId, rollIndex, statutIndex, emplacementIndex, searchId, statutId, emplacementId } = options;

  const search = document.getElementById(searchId).value.toLowerCase();
  const statut = document.getElementById(statutId).value.toLowerCase();
  const emplacement = document.getElementById(emplacementId).value.toLowerCase();

  const lignes = document.querySelectorAll(`#${tableId} tbody tr`);

  lignes.forEach(tr => {
    const rollVal = tr.children[rollIndex].textContent.toLowerCase();
    const statutVal = tr.children[statutIndex].textContent.toLowerCase();
    const emplacementVal = tr.children[emplacementIndex].textContent.toLowerCase();

    const matchRoll = rollVal.includes(search);
    const matchStatut = statut === "" || statutVal.includes(statut);
    const matchEmpl = emplacement === "" || emplacementVal.includes(emplacement);

    tr.style.display = (matchRoll && matchStatut && matchEmpl) ? "" : "none";
  });
}

function activerFiltresEmplacements() {
  const options = {
    tableId: "tableEmplacements",
    rollIndex: 1,
    statutIndex: 2,
    emplacementIndex: 0,
    searchId: "searchEmplacements",
    statutId: "filterStatutEmpl",
    emplacementId: "filterEmplacementEmpl"
  };

  searchEmplacements.addEventListener("input", () => filtrerTableauAvance(options));
  filterStatutEmpl.addEventListener("change", () => filtrerTableauAvance(options));
  filterEmplacementEmpl.addEventListener("input", () => filtrerTableauAvance(options));

  clearSearchEmpl.addEventListener("click", () => {
    searchEmplacements.value = "";
    filterStatutEmpl.value = "";
    filterEmplacementEmpl.value = "";
    filtrerTableauAvance(options);
  });
}

function activerFiltresHistorique() {
  const options = {
    tableId: "tableHistorique",
    rollIndex: 1,
    statutIndex: 3,
    emplacementIndex: 2,
    searchId: "searchHistorique",
    statutId: "filterStatutHist",
    emplacementId: "filterEmplacementHist"
  };

  searchHistorique.addEventListener("input", () => filtrerTableauAvance(options));
  filterStatutHist.addEventListener("change", () => filtrerTableauAvance(options));
  filterEmplacementHist.addEventListener("input", () => filtrerTableauAvance(options));

  clearSearchHist.addEventListener("click", () => {
    searchHistorique.value = "";
    filterStatutHist.value = "";
    filterEmplacementHist.value = "";
    filtrerTableauAvance(options);
  });
}

/* ============================================================
   FORMULAIRE MANUEL
============================================================ */
document.getElementById("btnSavePanel").addEventListener("click", enregistrerEmplacement);

async function enregistrerEmplacement() {
  let roll = panelRoll.value.trim();
  const emplacement = panelEmplacement.value.trim();
  let statut = panelStatut.value;

  if (!roll) {
    const ok = confirm("Aucun roll renseigné. Enregistrer quand même ?");
    if (!ok) return;
    roll = "EMPTY-" + Date.now();
    statut = "";
  }

  let res = await fetch("/api/assign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      roll_id: roll,
      emplacement,
      statut,
      userId,
      force: false
    })
  });

  let data = await res.json();

  if (data.conflict) {
    const ok = confirm(
      `⚠ L’emplacement "${emplacement}" contient déjà le roll "${data.existingRoll}". Voulez-vous l’écraser ?`
    );
    if (!ok) return;

    res = await fetch("/api/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roll_id: roll,
        emplacement,
        statut,
        userId,
        force: true
      })
    });

    data = await res.json();
  }

  if (data.success) {
    chargerEmplacements();
    panelRoll.value = "";
    panelEmplacement.value = "";
    panelStatut.value = "Arrivé";
  }
}

/* ============================================================
   SCANNER ZXING — TOUJOURS DEVANT
============================================================ */
async function lancerScanner(targetInputId) {

  // Si la fenêtre d’emplacement est ouverte → la cacher temporairement
  const modalEmpl = document.getElementById("modalEmplacement");
  const wasModalOpen = modalEmpl.style.display === "flex";
  if (wasModalOpen) modalEmpl.style.display = "none";

  // Ouvrir le scanner
  document.getElementById("scannerModal").style.display = "flex";

  try {
    const video = document.getElementById("scannerVideo");

    scannerStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" }
    });

    video.srcObject = scannerStream;
    await video.play();

    codeReader.decodeFromVideoDevice(null, "scannerVideo", (result, err) => {
      if (result) {
        fermerScanner();

        const input = document.getElementById(targetInputId);
        if (input) input.value = result.text;

        // Réafficher la fenêtre d’emplacement si elle était ouverte
        if (wasModalOpen) modalEmpl.style.display = "flex";
      }
    });

  } catch (err) {
    alert("Impossible d'accéder à la caméra.");
  }
}

function fermerScanner() {
  document.getElementById("scannerModal").style.display = "none";

  if (scannerStream) {
    scannerStream.getTracks().forEach(t => t.stop());
    scannerStream = null;
  }

  codeReader.reset();
}

document.getElementById("closeScanner").addEventListener("click", fermerScanner);

