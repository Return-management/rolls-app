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
// LOGIN
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
// ADMIN
// ------------------------------------------------------------
app.post("/api/admin/addUser", (req, res) => {
  const { username, password } = req.body;

  db.run(
    "INSERT INTO auth(username, password, isAdmin) VALUES (?, ?, 0)",
    [username, password],
    (err) => {
      if (err) return res.json({ success: false, error: "Utilisateur déjà existant" });
      res.json({ success: true });
    }
  );
});

app.get("/api/admin/listUsers", (req, res) => {
  db.all("SELECT id, username, password, isAdmin FROM auth ORDER BY username ASC", [], (err, rows) => {
    if (err) return res.json({ success: false });
    res.json({ users: rows });
  });
});

app.post("/api/admin/deleteUser", (req, res) => {
  db.run("DELETE FROM auth WHERE id = ?", [req.body.id], (err) => {
    if (err) return res.json({ success: false });
    res.json({ success: true });
  });
});

app.post("/api/admin/updatePassword", (req, res) => {
  db.run("UPDATE auth SET password = ? WHERE id = ?", [req.body.password, req.body.id], (err) => {
    if (err) return res.json({ success: false });
    res.json({ success: true });
  });
});

// ------------------------------------------------------------
// SCAN
// ------------------------------------------------------------
app.post("/api/scan", (req, res) => {
  const { code } = req.body;

  db.get("SELECT * FROM rolls WHERE roll_id = ?", [code], (err, roll) => {
    if (roll) {
      db.all(
        "SELECT date, emplacement, statut, action FROM historique WHERE roll_id = ? ORDER BY date ASC",
        [code],
        (err2, hist) => {
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
// ASSIGNATION AVEC GESTION DES CONFLITS
// ------------------------------------------------------------
app.post("/api/assign", (req, res) => {
  const { roll_id, emplacement, statut, userId, force } = req.body;

  const now = new Date().toISOString().replace("T", " ").substring(0, 19);

  db.get("SELECT roll_id FROM rolls WHERE emplacement = ?", [emplacement], (err, row) => {
    if (row && row.roll_id !== roll_id && !force) {
      return res.json({
        success: false,
        conflict: true,
        existingRoll: row.roll_id
      });
    }

    db.run(
      "INSERT OR REPLACE INTO rolls(roll_id, emplacement, statut) VALUES (?,?,?)",
      [roll_id, emplacement, statut],
      () => {
        db.run(
          "INSERT INTO historique(date, roll_id, emplacement, statut, user_id, action) VALUES (?,?,?,?,?,?)",
          [now, roll_id, emplacement, statut, userId, "Déplacement"],
          () => res.json({ success: true })
        );
      }
    );
  });
});

// ------------------------------------------------------------
// EMPLACEMENTS
// ------------------------------------------------------------
app.get("/api/emplacements", (req, res) => {
  db.all("SELECT roll_id, emplacement, statut FROM rolls ORDER BY emplacement ASC", [], (err, rows) => {
    res.json({ emplacements: rows });
  });
});

// ------------------------------------------------------------
// HISTORIQUE COMPLET
// ------------------------------------------------------------
app.get("/api/historique", (req, res) => {
  db.all(
    "SELECT date, roll_id, emplacement, statut, action FROM historique ORDER BY date DESC",
    [],
    (err, rows) => res.json({ historique: rows })
  );
});

// ------------------------------------------------------------
app.listen(PORT, () => console.log("Serveur démarré sur le port " + PORT));
