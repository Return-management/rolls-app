const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const db = new sqlite3.Database("rolls.db");

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nom TEXT UNIQUE
    )
  `);

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

function getOrCreateUser(nom, cb) {
  db.get("SELECT id FROM users WHERE nom = ?", [nom], (err, row) => {
    if (row) return cb(null, row.id);
    db.run("INSERT INTO users(nom) VALUES (?)", [nom], function () {
      cb(null, this.lastID);
    });
  });
}

app.post("/api/login", (req, res) => {
  const { nom } = req.body;
  getOrCreateUser(nom, (err, id) => res.json({ userId: id }));
});

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

app.post("/api/assign", (req, res) => {
  const { roll_id, emplacement, statut, userId } = req.body;
  const now = new Date().toISOString().replace("T", " ").substring(0, 19);

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

app.get("/api/alertes", (req, res) => {
  const limite = new Date(Date.now() - 4 * 3600 * 1000)
    .toISOString()
    .replace("T", " ")
    .substring(0, 19);

  const sql = `
    SELECT r.roll_id, r.emplacement, MAX(h.date) AS last_date
    FROM rolls r
    JOIN historique h ON h.roll_id = r.roll_id
    GROUP BY r.roll_id
    HAVING last_date < ?
  `;

  db.all(sql, [limite], (err, rows) => res.json({ alertes: rows }));
});

app.get("/api/export", (req, res) => {
  const sql = `
    SELECT h.date, h.roll_id, h.emplacement, h.statut, u.nom AS utilisateur, h.action
    FROM historique h
    LEFT JOIN users u ON u.id = h.user_id
    ORDER BY h.date ASC
  `;

  db.all(sql, [], (err, rows) => {
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=historique_rolls.csv");

    let csv = "date;roll_id;emplacement;statut;utilisateur;action\n";
    rows.forEach((r) => {
      csv += `${r.date};${r.roll_id};${r.emplacement};${r.statut};${r.utilisateur || ""};${r.action}\n`;
    });

    res.send(csv);
  });
});

app.listen(PORT, () => {
  console.log("Serveur démarré sur le port " + PORT);
});
