// ---------------------------
// VARIABLES
// ---------------------------
const loginDiv = document.getElementById("login");
const appDiv = document.getElementById("app");

const loginUser = document.getElementById("loginUser");
const loginPass = document.getElementById("loginPass");
const btnLogin = document.getElementById("btnLogin");
const loginError = document.getElementById("loginError");

const btnAdmin = document.getElementById("btnAdmin");
const pageAdmin = document.getElementById("pageAdmin");

const currentUser = document.getElementById("currentUser");

let userId = null;
let isAdmin = false;

// ---------------------------
// CONNEXION UNIQUE
// ---------------------------
btnLogin.addEventListener("click", async () => {
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

  // Connexion OK
  userId = data.userId;
  isAdmin = data.isAdmin;

  currentUser.textContent = username;

  loginDiv.style.display = "none";
  appDiv.style.display = "block";

  if (isAdmin) btnAdmin.style.display = "inline-block";
});

// ---------------------------
// NAVIGATION
// ---------------------------
btnAdmin.addEventListener("click", () => {
  hideAllPages();
  pageAdmin.style.display = "block";
  chargerUtilisateurs();
});

function hideAllPages() {
  document.querySelectorAll("#app > div").forEach(div => {
    if (div.id !== "currentUser") div.style.display = "none";
  });
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
  const res = await fetch("/api/admin/deleteUser", {
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

  const res = await fetch("/api/admin/updatePassword", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, password: newPass })
  });

  chargerUtilisateurs();
}
