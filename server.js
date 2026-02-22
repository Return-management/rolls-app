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

  // Admin par défaut
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
// LOGIN UNIQUE (ADMIN + UTILISATEURS)
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
// ADMIN — AJOUT UTILISATEUR
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
// ADMIN — LISTE UTILISATEURS
// ------------------------------------------------------------
app.get("/api/admin/listUsers", (req, res) => {
  db.all("SELECT id, username, password, isAdmin FROM auth ORDER BY username ASC", [], (err, rows) => {
    if (err) return res.json({ success: false });
    res.json({ users: rows });
  });
});

// ------------------------------------------------------------
// ADMIN — SUPPRESSION UTILISATEUR
// ------------------------------------------------------------
app.post("/api/admin/deleteUser", (req, res) => {
  const { id } = req.body;

  db.run("DELETE FROM auth WHERE id = ?", [id], (err) => {
    if (err) return res.json({ success: false });
    res.json({ success: true });
  });
});

// ------------------------------------------------------------
// ADMIN — MODIFICATION MOT DE PASSE
// ------------------------------------------------------------
app.post("/api/admin/updatePassword", (req, res) => {
  const { id, password } = req.body;

  db.run("UPDATE auth SET password = ? WHERE id = ?", [password, id], (err) => {
    if (err) return res.json({ success: false });
    res.json({ success: true });
  });
});

// ------------------------------------------------------------
// SCAN / HISTORIQUE / EXPORT (inchangé)
// ------------------------------------------------------------
// (Je peux te remettre ces routes si tu veux)
// ------------------------------------------------------------

app.listen(PORT, () => {
  console.log("Serveur démarré sur le port " + PORT);
});
