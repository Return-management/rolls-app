// ---------------------------
// VARIABLES
// ---------------------------
let userId = null;
let isAdmin = false;
let scans = [];

// RÉFÉRENCES DOM
const loginDiv = document.getElementById("login");
const appDiv = document.getElementById("app");

// ---------------------------
// CONNEXION
// ---------------------------
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

  loginDiv.style.display = "none";
  appDiv.style.display = "block";

  if (isAdmin) btnAdmin.style.display = "inline-block";

  showScan();
}

// ---------------------------
// NAVIGATION
// ---------------------------
btnPageScan.addEventListener("click", showScan);
btnEmplacements.addEventListener("click", showEmplacements);
btnHistorique.addEventListener("click", showHistorique);
btnAdmin.addEventListener("click", showAdmin);

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

// ---------------------------
// SCAN
// ---------------------------
document.getElementById("scan").addEventListener("keydown", (e) => {
  if (e.key === "Enter") traiterScan();
});

async function traiterScan() {
  const code = scan.value.trim();
  if (!code) return;

  const res = await fetch("/api/scan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code })
  });

  const data = await res.json();

  document.getElementById("lastRoll").textContent = code;

  if (data.type === "new_roll") {
    const emplacement = prompt("Nouveau roll détecté. Entrez l’emplacement :");
    if (emplacement) await assignerRoll(code, emplacement);
  }

  if (data.type === "existing_roll") {
    remplirTableauHistoriqueScan(data.historique);

    const emplacement = prompt("Modifier l’emplacement du roll ?");
    if (emplacement) await assignerRoll(code, emplacement);
  }

  scan.value = "";
}

// ---------------------------
// ASSIGNATION
// ---------------------------
async function assignerRoll(roll_id, emplacement) {
  const statut = document.getElementById("statut").value;

  const res = await fetch("/api/assign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      roll_id,
      emplacement,
      statut,
      userId
    })
  });

  const data = await res.json();

  if (data.success) {
    ajouterScanTableau(roll_id, emplacement, statut);
    chargerEmplacements();
  }
}

// ---------------------------
// TABLEAU DES SCANS
// ---------------------------
function ajouterScanTableau(roll, emplacement, statut) {
  const date = new Date().toLocaleString();

  scans.push({ roll, emplacement, statut, date });

  const tbody = document.querySelector("#tableScans tbody");
  const tr = document.createElement("tr");

  tr.innerHTML = `
    <td>${roll}</td>
    <td>${emplacement}</td>
    <td>${statut}</td>
    <td>${date}</td>
  `;

  tbody.appendChild(tr);
}

// ---------------------------
// HISTORIQUE DU ROLL SCANNÉ
// ---------------------------
function remplirTableauHistoriqueScan(historique) {
  const tbody = document.querySelector("#tableHistoriqueScan tbody");
  tbody.innerHTML = "";

  historique.forEach(h => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${h.date}</td>
      <td>${h.emplacement}</td>
      <td>${h.statut}</td>
      <td>${h.action}</td>
    `;
    tbody.appendChild(tr);
  });
}

// ---------------------------
// EMPLACEMENTS
// ---------------------------
async function chargerEmplacements() {
  const res = await fetch("/api/emplacements");
  const data = await res.json();

  const tbody = document.querySelector("#tableEmplacements tbody");
  tbody.innerHTML = "";

  data.emplacements.forEach(e => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${e.roll_id}</td>
      <td>${e.emplacement}</td>
      <td>${e.statut}</td>
    `;
    tbody.appendChild(tr);
  });
}

// ---------------------------
// HISTORIQUE COMPLET
// ---------------------------
async function chargerHistorique() {
  const res = await fetch("/api/historique");
  const data = await res.json();

  const tbody = document.querySelector("#tableHistorique tbody");
  tbody.innerHTML = "";

  data.historique.forEach(h => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${h.date}</td>
      <td>${h.roll_id}</td>
      <td>${h.emplacement}</td>
      <td>${h.statut}</td>
      <td>${h.action}</td>
    `;
    tbody.appendChild(tr);
  });
}

// ---------------------------
// ADMIN
// ---------------------------
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
      <input type="password" id="pass_${u.id}" value="${u.password}">
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

// ---------------------------
// 🔍 RECHERCHE AVANCÉE
// ---------------------------
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

// ---------------------------
// 🔍 FILTRES EMPLACEMENTS
// ---------------------------
function activerFiltresEmplacements() {
  const options = {
    tableId: "tableEmplacements",
    rollIndex: 0,
    statutIndex: 2,
    emplacementIndex: 1,
    searchId: "searchEmplacements",
    statutId: "filterStatutEmpl",
    emplacementId: "filterEmplacementEmpl"
  };

  document.getElementById("searchEmplacements").addEventListener("input", () => filtrerTableauAvance(options));
  document.getElementById("filterStatutEmpl").addEventListener("change", () => filtrerTableauAvance(options));
  document.getElementById("filterEmplacementEmpl").addEventListener("input", () => filtrerTableauAvance(options));

  document.getElementById("clearSearchEmpl").addEventListener("click", () => {
    document.getElementById("searchEmplacements").value = "";
    document.getElementById("filterStatutEmpl").value = "";
    document.getElementById("filterEmplacementEmpl").value = "";
    filtrerTableauAvance(options);
  });
}

// ---------------------------
// 🔍 FILTRES HISTORIQUE
// ---------------------------
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

  document.getElementById("searchHistorique").addEventListener("input", () => filtrerTableauAvance(options));
  document.getElementById("filterStatutHist").addEventListener("change", () => filtrerTableauAvance(options));
  document.getElementById("filterEmplacementHist").addEventListener("input", () => filtrerTableauAvance(options));

  document.getElementById("clearSearchHist").addEventListener("click", () => {
    document.getElementById("searchHistorique").value = "";
    document.getElementById("filterStatutHist").value = "";
    document.getElementById("filterEmplacementHist").value = "";
    filtrerTableauAvance(options);
  });
}
