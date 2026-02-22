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
// PANNEAU COULISSANT
// ---------------------------
const panel = document.getElementById("sidePanel");
const overlay = document.getElementById("overlay");

document.getElementById("btnOpenPanel").addEventListener("click", () => {
  panel.classList.add("open");
  overlay.style.display = "block";
});

document.getElementById("btnClosePanel").addEventListener("click", fermerPanel);
overlay.addEventListener("click", fermerPanel);

function fermerPanel() {
  panel.classList.remove("open");
  overlay.style.display = "none";
}

// ---------------------------
// ENREGISTREMENT MANUEL D'UN EMPLACEMENT
// ---------------------------
document.getElementById("btnSavePanel").addEventListener("click", enregistrerEmplacement);

async function enregistrerEmplacement() {
  const roll = document.getElementById("panelRoll").value.trim();
  const emplacement = document.getElementById("panelEmplacement").value.trim();
  const statut = document.getElementById("panelStatut").value;

  if (!roll) {
    alert("Le roll est obligatoire.");
    return;
  }

  // 1) Tentative normale
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

  // 2) Conflit détecté
  if (data.conflict) {
    const confirmReplace = confirm(
      `⚠ L’emplacement "${emplacement}" contient déjà le roll "${data.existingRoll}".\nVoulez-vous l’écraser ?`
    );

    if (!confirmReplace) return;

    // 3) Écrasement forcé
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
    fermerPanel();
    chargerEmplacements();
  }
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
    const emplacement = prompt("Nouveau roll détecté. Entrez l’emplacement (laisser vide possible) :");
    if (emplacement !== null) await assignerRoll(code, emplacement);
  }

  if (data.type === "existing_roll") {
    remplirTableauHistoriqueScan(data.historique);

    const emplacement = prompt("Modifier l’emplacement du roll (laisser vide possible) ?");
    if (emplacement !== null) await assignerRoll(code, emplacement);
  }

  scan.value = "";
}

// ---------------------------
// ASSIGNATION AVEC GESTION DES CONFLITS
// ---------------------------
async function assignerRoll(roll_id, emplacement) {
  const statut = document.getElementById("statut").value;

  let res = await fetch("/api/assign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      roll_id,
      emplacement,
      statut,
      userId,
      force: false
    })
  });

  let data = await res.json();

  if (data.conflict) {
    const confirmReplace = confirm(
      `⚠ L’emplacement "${emplacement}" contient déjà le roll "${data.existingRoll}".\nVoulez-vous l’écraser ?`
    );

    if (!confirmReplace) return;

    res = await fetch("/api/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roll_id,
        emplacement,
        statut,
        userId,
        force: true
      })
    });

    data = await res.json();
  }

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

