const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const db = new sqlite3.Database("rolls.db");

// ------------------------------------------------------------
// INITIALISATION DES TABLES
// ------------------------------------------------------------
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS auth (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT,
      isAdmin INTEGER DEFAULT 0
    )
  `);

  // Création automatique de l’admin
  db.run(
    "INSERT OR IGNORE INTO auth(username, password, isAdmin) VALUES (?, ?, ?)",
    ["admin", "admin", 1]
  );

  db.run(`
    CREATE TABLE IF NOT EXISTS rolls (
      roll_id TEXT PRIMARY KEY,
      emplacement TEXT,
      statut TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS historique (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT,
      roll_id TEXT,
      emplacement TEXT,
      statut TEXT,
      user_id INTEGER,
      action TEXT
    )
  `);
});

// ------------------------------------------------------------
// LOGIN UNIQUE
// ------------------------------------------------------------
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;

  db.get(
    "SELECT id, username, password, isAdmin FROM auth WHERE username = ? AND password = ?",
    [username, password],
    (err, row) => {
      if (err) return res.json({ success: false });
      if (!row) return res.json({ success: false, error: "Identifiants incorrects" });

      res.json({
        success: true,
        userId: row.id,
        isAdmin: row.isAdmin === 1
      });
    }
  );
});

// ------------------------------------------------------------
// ADMIN : AJOUT UTILISATEUR
// ------------------------------------------------------------
app.post("/api/admin/addUser", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password)
    return res.json({ success: false, error: "Données manquantes" });

  db.run(
    "INSERT INTO auth(username, password, isAdmin) VALUES (?, ?, 0)",
    [username, password],
    (err) => {
      if (err) return res.json({ success: false, error: "Utilisateur déjà existant" });
      res.json({ success: true });
    }
  );
});

// ------------------------------------------------------------
// ADMIN : LISTE UTILISATEURS
// ------------------------------------------------------------
app.get("/api/admin/listUsers", (req, res) => {
  db.all("SELECT id, username, password, isAdmin FROM auth ORDER BY username ASC", [], (err, rows) => {
    if (err) return res.json({ success: false });
    res.json({ users: rows });
  });
});

// ------------------------------------------------------------
// ADMIN : SUPPRESSION UTILISATEUR
// ------------------------------------------------------------
app.post("/api/admin/deleteUser", (req, res) => {
  const { id } = req.body;

  db.run("DELETE FROM auth WHERE id = ?", [id], (err) => {
    if (err) return res.json({ success: false });
    res.json({ success: true });
  });
});

// ------------------------------------------------------------
// ADMIN : MODIFICATION MOT DE PASSE
// ------------------------------------------------------------
app.post("/api/admin/updatePassword", (req, res) => {
  const { id, password } = req.body;

  db.run("UPDATE auth SET password = ? WHERE id = ?", [password, id], (err) => {
    if (err) return res.json({ success: false });
    res.json({ success: true });
  });
});

// ------------------------------------------------------------
// SCAN
// ------------------------------------------------------------
app.post("/api/scan", (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: "Code requis" });

  db.get("SELECT * FROM rolls WHERE roll_id = ?", [code], (err, roll) => {
    if (err) return res.status(500).json({ error: "Erreur DB" });

    if (roll) {
      db.all(
        "SELECT date, emplacement, statut, action FROM historique WHERE roll_id = ? ORDER BY date ASC",
        [code],
        (err2, hist) => {
          if (err2) return res.status(500).json({ error: "Erreur DB" });
          res.json({
            type: "existing_roll",
            roll,
            historique: hist
          });
        }
      );
    } else {
      res.json({
        type: "new_roll",
        roll_id: code,
        message: "Nouveau roll, scanner l'emplacement"
      });
    }
  });
});

// ------------------------------------------------------------
// ASSIGNATION
// ------------------------------------------------------------
app.post("/api/assign", (req, res) => {
  const { roll_id, emplacement, statut, userId } = req.body;

  if (!roll_id || !emplacement || !userId)
    return res.status(400).json({ error: "Données manquantes" });

  const finalStatut = statut || "Arrivé";
  const now = new Date().toISOString().replace("T", " ").substring(0, 19);

  db.run(
    "INSERT OR REPLACE INTO rolls(roll_id, emplacement, statut) VALUES (?,?,?)",
    [roll_id, emplacement, finalStatut],
    (err) => {
      if (err) return res.status(500).json({ error: "Erreur DB" });

      db.run(
        "INSERT INTO historique(date, roll_id, emplacement, statut, user_id, action) VALUES (?,?,?,?,?,?)",
        [now, roll_id, emplacement, finalStatut, userId, "Déplacement"],
        (err2) => {
          if (err2) return res.status(500).json({ error: "Erreur DB" });
          res.json({ success: true });
        }
      );
    }
  );
});

// ------------------------------------------------------------
// EMPLACEMENTS
// ------------------------------------------------------------
app.get("/api/emplacements", (req, res) => {
  db.all(
    "SELECT roll_id, emplacement, statut FROM rolls ORDER BY emplacement ASC",
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: "Erreur DB" });
      res.json({ emplacements: rows });
    }
  );
});

// ------------------------------------------------------------
// HISTORIQUE COMPLET
// ------------------------------------------------------------
app.get("/api/historique", (req, res) => {
  const sql = `
    SELECT h.date, h.roll_id, h.emplacement, h.statut, h.action
    FROM historique h
    ORDER BY h.date DESC
  `;
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: "Erreur DB" });
    res.json({ historique: rows });
  });
});

// ------------------------------------------------------------
// EXPORT CSV
// ------------------------------------------------------------
app.get("/api/export", (req, res) => {
  const sql = `
    SELECT h.date, h.roll_id, h.emplacement, h.statut, h.action
    FROM historique h
    ORDER BY h.date ASC
  `;
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: "Erreur DB" });

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=historique_rolls.csv");

    let csv = "date;roll_id;emplacement;statut;action\n";
    rows.forEach((r) => {
      csv += `${r.date};${r.roll_id};${r.emplacement};${r.statut};${r.action}\n`;
    });

    res.send(csv);
  });
});

// ------------------------------------------------------------
app.listen(PORT, () => {
  console.log("Serveur démarré sur le port " + PORT);
});
