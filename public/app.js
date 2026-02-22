let currentUserId = null;
let pendingRollId = null;

const userNameInput = document.getElementById("userName");
const btnLogin = document.getElementById("btnLogin");
const appDiv = document.getElementById("app");
const loginDiv = document.getElementById("login");
const currentUserSpan = document.getElementById("currentUser");

const scanInput = document.getElementById("scan");
const statutSelect = document.getElementById("statut");
const infoPre = document.getElementById("info");
const histPre = document.getElementById("historique");
const btnAlertes = document.getElementById("btnAlertes");
const btnExport = document.getElementById("btnExport");

const btnPageScan = document.getElementById("btnPageScan");
const btnEmplacements = document.getElementById("btnEmplacements");
const btnHistorique = document.getElementById("btnHistorique");
const btnAdmin = document.getElementById("btnAdmin");

const pageScan = document.getElementById("pageScan");
const pageEmplacements = document.getElementById("pageEmplacements");
const pageHistorique = document.getElementById("pageHistorique");
const pageAdmin = document.getElementById("pageAdmin");

const scanRecherche = document.getElementById("scanRecherche");
const listeEmplacements = document.getElementById("listeEmplacements");
const filtreHistorique = document.getElementById("filtreHistorique");
const listeHistorique = document.getElementById("listeHistorique");

const adminUser = document.getElementById("adminUser");
const adminPass = document.getElementById("adminPass");
const btnAdminLogin = document.getElementById("btnAdminLogin");
const adminLoginDiv = document.getElementById("adminLogin");
const adminPanelDiv = document.getElementById("adminPanel");
const newUser = document.getElementById("newUser");
const newPass = document.getElementById("newPass");
const btnAddUser = document.getElementById("btnAddUser");
const adminInfo = document.getElementById("adminInfo");

function showPage(page) {
  pageScan.style.display = "none";
  pageEmplacements.style.display = "none";
  pageHistorique.style.display = "none";
  pageAdmin.style.display = "none";

  page.style.display = "block";
}

btnPageScan.addEventListener("click", () => showPage(pageScan));
btnEmplacements.addEventListener("click", () => showPage(pageEmplacements));
btnHistorique.addEventListener("click", () => showPage(pageHistorique));
btnAdmin.addEventListener("click", () => showPage(pageAdmin));

btnLogin.addEventListener("click", async () => {
  const nom = userNameInput.value.trim();
  if (!nom) return alert("Saisir un nom");

  const res = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nom })
  });

  const data = await res.json();
  if (data.error) {
    alert("Erreur de connexion");
    return;
  }

  currentUserId = data.userId;
  loginDiv.style.display = "none";
  appDiv.style.display = "block";
  currentUserSpan.textContent = nom;
  showPage(pageScan);
  scanInput.focus();
});

scanInput.addEventListener("keydown", async (e) => {
  if (e.key !== "Enter") return;

  const code = scanInput.value.trim();
  scanInput.value = "";
  if (!code || !currentUserId) return;

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

  const res = await fetch("/api/scan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code })
  });

  const data = await res.json();
  if (data.error) {
    infoPre.textContent = "Erreur scan : " + data.error;
    return;
  }

  histPre.textContent = "";

  if (data.type === "new_roll") {
    if (!confirm(`Le roll ${data.roll_id} n'existe pas. Voulez-vous l'enregistrer ?`)) {
      infoPre.textContent = "Roll ignoré.";
      return;
    }
    pendingRollId = data.roll_id;
    infoPre.textContent = `Nouveau roll : ${data.roll_id}\nScanner l'emplacement...`;
  } else if (data.type === "existing_roll") {
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

btnAlertes.addEventListener("click", async () => {
  const res = await fetch("/api/alertes");
  const data = await res.json();

  if (!data.alertes || !data.alertes.length) {
    alert("Aucune alerte.");
    return;
  }

  let msg = "Rolls en alerte :\n\n";
  data.alertes.forEach((a) => {
    msg += `${a.roll_id} | ${a.emplacement} | dernière activité : ${a.last_date}\n`;
  });

  alert(msg);
});

btnExport.addEventListener("click", () => {
  window.location.href = "/api/export";
});

btnEmplacements.addEventListener("click", async () => {
  showPage(pageEmplacements);
  const res = await fetch("/api/emplacements");
  const data = await res.json();

  let txt = "";
  data.emplacements.forEach((e) => {
    txt += "- " + e.emplacement + "\n";
  });
  listeEmplacements.textContent = txt || "Aucun emplacement.";
});

scanRecherche.addEventListener("keydown", async (e) => {
  if (e.key !== "Enter") return;

  const code = scanRecherche.value.trim();
  scanRecherche.value = "";
  if (!code) return;

  const res = await fetch("/api/recherche/" + encodeURIComponent(code));
  const data = await res.json();

  if (!data.exists) {
    alert("Ce roll n'existe pas encore.");
    return;
  }

  alert(`Roll ${code} est actuellement à : ${data.emplacement} (statut : ${data.statut})`);
});

btnHistorique.addEventListener("click", async () => {
  showPage(pageHistorique);
  const res = await fetch("/api/historique");
  const data = await res.json();

  let txt = "";
  data.historique.forEach((h) => {
    txt += `${h.date} | ${h.roll_id} | ${h.emplacement} | ${h.statut} | ${h.utilisateur || ""} | ${h.action}\n`;
  });
  listeHistorique.textContent = txt || "Aucun mouvement.";
});

filtreHistorique.addEventListener("input", () => {
  const filtre = filtreHistorique.value.toLowerCase();
  const lignes = listeHistorique.textContent.split("\n");
  const filtrées = lignes.filter((l) => l.toLowerCase().includes(filtre));
  listeHistorique.textContent = filtrées.join("\n");
});

btnAdmin.addEventListener("click", () => {
  showPage(pageAdmin);
});

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


