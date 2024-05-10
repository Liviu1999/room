import pg from "pg";
import express from "express";
import bcrypt from "bcrypt";
import JWT from "jsonwebtoken";
import dotenv from "dotenv";
import { promisify } from "util";

const { Pool } = pg;

const pool = new Pool({
  //user: "postgres",
  // host: "localhost",
  // user: "my_new_project_admin",
  // database: "my_new_project",
  // password: "root",
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

const router = express.Router();

router.get("/:lobbyId", async (req, res) => {
  const lobbyId = req.params.lobbyId;
  try {
    const q = await pool.query(`SELECT * FROM messages WHERE lobby_id = $1`, [
      lobbyId,
    ]);
    return res.send(q.rows);
  } catch (error) {
    console.log(error);
  }
});

router.post("/:lobbyId", async (req, res) => {
  const lobbyId = req.params.lobbyId;
  const { message } = req.body;
  if (!message) return res.status(400).send({ error: "Invalid request" });

  try {
    // change the id by just 1
    const all = await pool.query("SELECT * FROM users");
    const id = all.rows[0].id;
    const exist = await pool.query(
      "SELECT lobby_id FROM lobbies WHERE lobby_id = $1",
      [lobbyId]
    );
    if (exist.rows.length === 0) {
      await pool.query(
        "INSERT INTO lobbies (lobby_id, admin_id) VALUES($1, $2)",
        [lobbyId, id]
      );
      console.log("!-------------------------------!");
    }

    await pool.query(
      "INSERT INTO messages (content, lobby_id, user_id) VALUES($1, $2, $3)",
      [message, lobbyId, id]
    );
    return res.send({ info: "A message has been posted" });
  } catch (error) {
    console.log(error);
  }
});

router.get("/:lobbyId/:messageId", async (req, res) => {
  const lobbyId = req.params.lobbyId;
  const messageId = req.params.messageId;
  try {
    const q = await pool.query(
      `SELECT * FROM messages WHERE message_id = $1 AND lobby_id = $2`,
      [messageId, lobbyId]
    );
    return res.send(q.rows);
  } catch (error) {
    console.log(error);
  }
});

router.patch("/:messageId", async (req, res) => {
  const messageId = req.params.messageId;
  const { message } = req.body;

  if (!message) return res.status(400).send({ error: "Invalid request" });

  try {
    const q = await pool.query(
      `UPDATE messages SET content = $1 WHERE message_id = $2`,
      [message, messageId]
    );
    return res.send("messages updated!");
  } catch (error) {
    console.log(error);
  }
});

router.delete("/:messageId", async (req, res) => {
  const messageId = req.params.messageId;

  try {
    const q = await pool.query(`DELETE FROM messages WHERE message_id = $1`, [
      messageId,
    ]);
    return res.send("messages deleted!");
  } catch (error) {
    console.log(error);
  }
});

router.post("/:lobbyId/addUser", async (req, res) => {
  const lobbyId = req.params.lobbyId;
  const { add } = req.body;
  const { message } = req.body;

  try {
    const q = await pool.query(
      `INSERT INTO messages (lobby_id, content) VALUES ($1,$2)`,
      [lobbyId, message]
    );
    return res.send("User add");
  } catch (error) {
    console.log(error);
  }
});

export default router;
