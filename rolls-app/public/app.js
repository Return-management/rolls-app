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

btnLogin.addEventListener("click", async () => {
  const nom = userNameInput.value.trim();
  if (!nom) return alert("Saisir un nom");

  const res = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nom })
  });

  const data = await res.json();
  currentUserId = data.userId;

  loginDiv.style.display = "none";
  appDiv.style.display = "block";
  currentUserSpan.textContent = nom;
  scanInput.focus();
});

scanInput.addEventListener("keydown", async (e) => {
  if (e.key !== "Enter") return;

  const code = scanInput.value.trim();
  scanInput.value = "";

  if (!code) return;

  if (pendingRollId) {
    const emplacement = code;
    const statut = statutSelect.value;

    await fetch("/api/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roll_id: pendingRollId,
        emplacement,
        statut,
        userId: currentUserId
      })
    });

    infoPre.textContent = `Roll ${pendingRollId} enregistré à ${emplacement} (statut : ${statut})`;
    pendingRollId = null;
    return;
  }

  const res = await fetch("/api/scan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code })
  });

  const data = await res.json();

  if (data.type === "new_roll") {
    pendingRollId = data.roll_id;
    infoPre.textContent = `Nouveau roll : ${data.roll_id}\nScanner l'emplacement...`;
    histPre.textContent = "";
  } else {
    const r = data.roll;
    infoPre.textContent = `Roll : ${r.roll_id}\nEmplacement : ${r.emplacement}\nStatut : ${r.statut}`;

    let txt = "";
    data.historique.forEach((h) => {
      txt += `${h.date} | ${h.emplacement} | ${h.statut} | ${h.action}\n`;
    });
    histPre.textContent = txt || "Aucun historique.";
  }
});

btnAlertes.addEventListener("click", async () => {
  const res = await fetch("/api/alertes");
  const data = await res.json();

  if (!data.alertes.length) return alert("Aucune alerte");

  let msg = "Rolls en alerte :\n\n";
  data.alertes.forEach((a) => {
    msg += `${a.roll_id} | ${a.emplacement} | dernière activité : ${a.last_date}\n`;
  });

  alert(msg);
});

btnExport.addEventListener("click", () => {
  window.location.href = "/api/export";
});
