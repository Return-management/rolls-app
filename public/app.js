let currentUserId = null;
let pendingRollId = null;

// LOGIN
const loginDiv = document.getElementById("login");
const loginUser = document.getElementById("loginUser");
const loginPass = document.getElementById("loginPass");
const btnLogin = document.getElementById("btnLogin");
const loginError = document.getElementById("loginError");

// APP
const appDiv = document.getElementById("app");
const currentUserSpan = document.getElementById("currentUser");

// MENU
const btnPageScan = document.getElementById("btnPageScan");
const btnEmplacements = document.getElementById("btnEmplacements");
const btnHistorique = document.getElementById("btnHistorique");
const btnAdmin = document.getElementById("btnAdmin");

// PAGES
const pageScan = document.getElementById("pageScan");
const pageEmplacements = document.getElementById("pageEmplacements");
const pageHistorique = document.getElementById("pageHistorique");
const pageAdmin = document.getElementById("pageAdmin");

// SCAN PAGE
const scanInput = document.getElementById("scan");
const statutSelect = document.getElementById("statut");
const infoPre = document.getElementById("info");
const histPre = document.getElementById("historique");
const btnAlertes = document.getElementById("btnAlertes");
const btnExport = document.getElementById("btnExport");

// EMPLACEMENTS PAGE
const scanRecherche = document.getElementById("scanRecherche");
const listeEmplacements = document.getElementById("listeEmplacements");
const dernierScan = document.getElementById("dernierScan");

// HISTORIQUE COMPLET PAGE
const filtreHistorique = document.getElementById("filtreHistorique");
const listeHistorique = document.getElementById("listeHistorique");

// ADMIN PAGE
const adminUser = document.getElementById("adminUser");
const adminPass = document.getElementById("adminPass");
const btnAdminLogin = document.getElementById("btnAdminLogin");
const adminLoginDiv = document.getElementById("adminLogin");
const adminPanelDiv = document.getElementById("adminPanel");
const newUser = document.getElementById("newUser");
const newPass = document.getElementById("newPass");
const btnAddUser = document.getElementById("btnAddUser");
const adminInfo = document.getElementById("adminInfo");


// ------------------------------------------------------------
// UTILITAIRE : empêcher l’accès sans login
// ------------------------------------------------------------
function requireLogin() {
  if (!currentUserId) {
    alert("Veuillez vous connecter.");
    showPage(loginDiv);
    return false;
  }
  return true;
}

// ------------------------------------------------------------
// AFFICHAGE DES PAGES
// ------------------------------------------------------------
function showPage(page) {
  pageScan.style.display = "none";
  pageEmplacements.style.display = "none";
  pageHistorique.style.display = "none";
  pageAdmin.style.display = "none";
  loginDiv.style.display = "none";

  page.style.display = "block";
}

// ------------------------------------------------------------
// LOGIN UTILISATEUR
// ------------------------------------------------------------
btnLogin.addEventListener("click", async () => {
  const username = loginUser.value.trim();
  const password = loginPass.value.trim();

  if (!username || !password) {
    loginError.textContent = "Veuillez entrer identifiant et mot de passe.";
    return;
  }

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

  currentUserId = data.userId;
  currentUserSpan.textContent = username;

  loginDiv.style.display = "none";
  appDiv.style.display = "block";
  showPage(pageScan);
  scanInput.focus();
});

// ------------------------------------------------------------
// NAVIGATION
// ------------------------------------------------------------
btnPageScan.addEventListener("click", () => {
  if (!requireLogin()) return;
  showPage(pageScan);
});

btnEmplacements.addEventListener("click", async () => {
  if (!requireLogin()) return;
  showPage(pageEmplacements);

  const res = await fetch("/api/emplacements");
  const data = await res.json();

  let txt = "";
  data.emplacements.forEach((e) => {
    txt += "- " + e.emplacement + "\n";
  });

  listeEmplacements.textContent = txt || "Aucun emplacement.";
});

btnHistorique.addEventListener("click", async () => {
  if (!requireLogin()) return;
  showPage(pageHistorique);

  const res = await fetch("/api/historique");
  const data = await res.json();

  let txt = "";
  data.historique.forEach((h) => {
    txt += `${h.date} | ${h.roll_id} | ${h.emplacement} | ${h.statut} | ${h.utilisateur || ""} | ${h.action}\n`;
  });

  listeHistorique.textContent = txt || "Aucun mouvement.";
});

btnAdmin.addEventListener("click", () => {
  if (!requireLogin()) return;
  showPage(pageAdmin);
});

// ------------------------------------------------------------
// SCAN PRINCIPAL
// ------------------------------------------------------------
scanInput.addEventListener("keydown", async (e) => {
  if (e.key !== "Enter") return;
  if (!currentUserId) return alert("Veuillez vous connecter.");

  const code = scanInput.value.trim();
  scanInput.value = "";
  if (!code) return;

  // Si on attend un emplacement
  if (pendingRollId) {
    const emplacement = code;
    const statut = statutSelect.value;

    const res = await fetch("/api/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roll_id: pendingRollId,
        emplacement,
        statut,
        userId: currentUserId
      })
    });

    const data = await res.json();
    if (data.error) {
      infoPre.textContent = "Erreur assignation : " + data.error;
    } else {
      infoPre.textContent =
        `Roll ${pendingRollId} enregistré à l'emplacement ${emplacement} (statut : ${statut})`;
      await afficherRoll(pendingRollId);
    }

    pendingRollId = null;
    return;
  }

  // Scan normal
  const res = await fetch("/api/scan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code })
  });

  const data = await res.json();
  histPre.textContent = "";

  if (data.type === "new_roll") {
    if (!confirm(`Le roll ${data.roll_id} n'existe pas. Voulez-vous l'enregistrer ?`)) {
      infoPre.textContent = "Roll ignoré.";
      return;
    }

    pendingRollId = data.roll_id;
    infoPre.textContent = `Nouveau roll : ${data.roll_id}\nScanner l'emplacement...`;
  }

  else if (data.type === "existing_roll") {
    const r = data.roll;

    infoPre.textContent =
      `Roll : ${r.roll_id}\nEmplacement : ${r.emplacement}\nStatut : ${r.statut}`;

    let txt = "";
    data.historique.forEach((h) => {
      txt += `${h.date} | ${h.emplacement} | ${h.statut} | ${h.action}\n`;
    });
    histPre.textContent = txt || "Aucun historique.";

    if (confirm(`Le roll ${r.roll_id} est actuellement à ${r.emplacement}. Voulez-vous le déplacer ?`)) {
      pendingRollId = r.roll_id;
      infoPre.textContent = `Scanner le nouvel emplacement pour ${r.roll_id}`;
    }
  }
});

// ------------------------------------------------------------
// AFFICHER UN ROLL APRÈS MISE À JOUR
// ------------------------------------------------------------
async function afficherRoll(rollId) {
  const res = await fetch("/api/scan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: rollId })
  });

  const data = await res.json();

  if (data.type === "existing_roll") {
    const r = data.roll;

    infoPre.textContent =
      `Roll : ${r.roll_id}\nEmplacement : ${r.emplacement}\nStatut : ${r.statut}`;

    let txt = "";
    data.historique.forEach((h) => {
      txt += `${h.date} | ${h.emplacement} | ${h.statut} | ${h.action}\n`;
    });

    histPre.textContent = txt || "Aucun historique.";
  }
}

// ------------------------------------------------------------
// ALERTES
// ------------------------------------------------------------
btnAlertes.addEventListener("click", async () => {
  const res = await fetch("/api/alertes");
  const data = await res.json();

  if (!data.alertes.length) {
    alert("Aucune alerte.");
    return;
  }

  let msg = "Rolls en alerte :\n\n";
  data.alertes.forEach((a) => {
    msg += `${a.roll_id} | ${a.emplacement} | dernière activité : ${a.last_date}\n`;
  });

  alert(msg);
});

// ------------------------------------------------------------
// EXPORT CSV
// ------------------------------------------------------------
btnExport.addEventListener("click", () => {
  window.location.href = "/api/export";
});

// ------------------------------------------------------------
// PAGE EMPLACEMENTS : recherche par scan
// ------------------------------------------------------------
scanRecherche.addEventListener("keydown", async (e) => {
  if (e.key !== "Enter") return;

  const code = scanRecherche.value.trim();
  scanRecherche.value = "";
  if (!code) return;

  dernierScan.textContent = code;

  const res = await fetch("/api/recherche/" + encodeURIComponent(code));
  const data = await res.json();

  if (!data.exists) {
    alert("Ce roll n'existe pas encore.");
    return;
  }

  alert(`Roll ${code} est actuellement à : ${data.emplacement} (statut : ${data.statut})`);
});

// ------------------------------------------------------------
// PAGE HISTORIQUE COMPLET
// ------------------------------------------------------------
filtreHistorique.addEventListener("input", () => {
  const filtre = filtreHistorique.value.toLowerCase();
  const lignes = listeHistorique.textContent.split("\n");
  const filtrées = lignes.filter((l) => l.toLowerCase().includes(filtre));
  listeHistorique.textContent = filtrées.join("\n");
});

// ------------------------------------------------------------
// PAGE ADMIN
// ------------------------------------------------------------
btnAdminLogin.addEventListener("click", async () => {
  const username = adminUser.value.trim();
  const password = adminPass.value.trim();

  if (!username || !password) {
    alert("Saisir identifiant et mot de passe admin");
    return;
  }

  const res = await fetch("/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });

  const data = await res.json();

  if (!data.success) {
    alert("Mot de passe admin incorrect");
    return;
  }

  adminLoginDiv.style.display = "none";
  adminPanelDiv.style.display = "block";
});

btnAddUser.addEventListener("click", async () => {
  const username = newUser.value.trim();
  const password = newPass.value.trim();

  if (!username || !password) {
    adminInfo.textContent = "Saisir un utilisateur et un mot de passe.";
    return;
  }

  const res = await fetch("/api/admin/addUser", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });

  const data = await res.json();

  if (data.success) {
    adminInfo.textContent = "Utilisateur ajouté.";
    newUser.value = "";
    newPass.value = "";
  } else {
    adminInfo.textContent = "Erreur : " + (data.error || "inconnue");
  }
});
;





