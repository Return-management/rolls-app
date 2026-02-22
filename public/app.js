// ---------------------------
// VARIABLES
// ---------------------------
let userId = null;
let isAdmin = false;

// Éléments DOM
const loginDiv = document.getElementById("login");
const appDiv = document.getElementById("app");

const loginUser = document.getElementById("loginUser");
const loginPass = document.getElementById("loginPass");
const btnLogin = document.getElementById("btnLogin");
const loginError = document.getElementById("loginError");

const currentUser = document.getElementById("currentUser");

const btnPageScan = document.getElementById("btnPageScan");
const btnEmplacements = document.getElementById("btnEmplacements");
const btnHistorique = document.getElementById("btnHistorique");
const btnAdmin = document.getElementById("btnAdmin");

// Pages
const pageScan = document.getElementById("pageScan");
const pageEmplacements = document.getElementById("pageEmplacements");
const pageHistorique = document.getElementById("pageHistorique");
const pageAdmin = document.getElementById("pageAdmin");

// ---------------------------
// CONNEXION UNIQUE
// ---------------------------
btnLogin.addEventListener("click", login);

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
}

function showHistorique() {
  hideAllPages();
  pageHistorique.style.display = "block";
  chargerHistorique();
}

function showAdmin() {
  hideAllPages();
  pageAdmin.style.display = "block";
  chargerUtilisateurs();
}

// ---------------------------
// SCAN (Entrée valide le scan)
// ---------------------------
document.getElementById("scan").addEventListener("keydown", (e) => {
  if (e.key === "Enter") traiterScan();
});

async function traiterScan() {
  const code = document.getElementById("scan").value.trim();
  if (!code) return;

  const res = await fetch("/api/scan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code })
  });

  const data = await res.json();

  document.getElementById("info").textContent = JSON.stringify(data, null, 2);

  if (data.type === "existing_roll") {
    document.getElementById("historique").textContent =
      JSON.stringify(data.historique, null, 2);
  }

  document.getElementById("scan").value = "";
}

// ---------------------------
// EMPLACEMENTS
// ---------------------------
async function chargerEmplacements() {
  const res = await fetch("/api/emplacements");
  const data = await res.json();

  document.getElementById("listeEmplacements").textContent =
    JSON.stringify(data.emplacements, null, 2);
}

// ---------------------------
// HISTORIQUE COMPLET
// ---------------------------
async function chargerHistorique() {
  const res = await fetch("/api/historique");
  const data = await res.json();

  document.getElementById("listeHistorique").textContent =
    JSON.stringify(data.historique, null, 2);
}

// ---------------------------
// ADMIN : LISTE UTILISATEURS
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

// ---------------------------
// ADMIN : AJOUT UTILISATEUR
// ---------------------------
document.getElementById("btnAddUser").addEventListener("click", async () => {
  const username = document.getElementById("newUser").value.trim();
  const password = document.getElementById("newPass").value.trim();

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
  document.getElementById("newUser").value = "";
  document.getElementById("newPass").value = "";

  chargerUtilisateurs();
});

// ---------------------------
// ADMIN : SUPPRESSION
// ---------------------------
async function deleteUser(id) {
  await fetch("/api/admin/deleteUser", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id })
  });

  chargerUtilisateurs();
}

// ---------------------------
// ADMIN : MODIFICATION MDP
// ---------------------------
async function updatePassword(id) {
  const newPass = document.getElementById("pass_" + id).value;

  await fetch("/api/admin/updatePassword", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, password: newPass })
  });

  chargerUtilisateurs();
}
