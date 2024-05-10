import pg from "pg";
import pkg from "pg-connection-string";
import express from "express";
import bcrypt from "bcrypt";
import JWT from "jsonwebtoken";
import dotenv from "dotenv";
import { promisify } from "util";
import lobbyRouter from "./routes/lobby.mjs";
import usersRouter from "./routes/users.mjs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";

import cors from "cors";

// const { parse } = pkg;
// // Parse the DATABASE_URL
// const dbConfig = parse(
//   "postgres://ufc9v4otg7j292:p400fb3b861459baa5797e430d2145a43410ce5d5c5ee35bca0f6de5a6d8fa140@c54frm92m19bh1.cluster-czz5s0kz4scl.eu-west-1.rds.amazonaws.com:5432/d7lms4pjq3k54n"
// );

// Create a new pool using the parsed connection details
const { Pool } = pg;

//const pool = new Pool(dbConfig);

// Loading variables from the .env file
dotenv.config();

const pool = new Pool({
  // user: "postgres",
  // host: "localhost",
  // user: "my_new_project_admin",
  // database: "my_new_project",
  // password: "root",
  // host: "c54frm92m19bh1.cluster-czz5s0kz4scl.eu-west-1.rds.amazonaws.com",
  // database: "d7lms4pjq3k54n",
  // user: "ufc9v4otg7j292",
  // password: "p400fb3b861459baa5797e430d2145a43410ce5d5c5ee35bca0f6de5a6d8fa140",
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});
console.log("-----------PROBLEM just under------------");

const blabla = async () => {
  await pool.connect();
};

blabla();

// Launching express
const server = express();

// Promisify the JWT helpers
// => transform callback into Promise based function (async)
const sign = promisify(JWT.sign);
const verify = promisify(JWT.verify);

// Use the json middleware to parse the request body
server.use(express.json());
server.use(cors());

// Set EJS as the view engine
// server.set("view engine", "ejs");

// server.use(express.static("views"));

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = dirname(__filename);
//test to see if it's work
// server.use(express.static(path.join(__dirname, "locker-react", "dist")));

// server.get("*", (req, res) => {
//   res.sendFile(path.join(__dirname, "locker-react", "dist", "index.html"));
// });

server.get("/", (req, res) => {
  res.send({ name: "utu" });
});

server.post("/api/register", async (req, res) => {
  const { email, nickname, password } = req.body;

  if (!email || !password || !nickname)
    return res.status(400).send({ error: "Invalid request" });

  try {
    const encryptedPassword = await bcrypt.hash(password, 10);

    await pool.query(
      "INSERT INTO users (email, password, nickname) VALUES ($1, $2, $3)",
      [email, encryptedPassword, nickname]
    );

    return res.send({ info: "User succesfully created" });
  } catch (err) {
    console.log(err);

    return await pool.query("select * from users");
  }
});

server.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).send({ error: "Invalid request" });

  const q = await pool.query(
    "SELECT password, id, nickname from users WHERE email=$1",
    [email]
  );

  if (q.rowCount === 0) {
    return res.status(404).send({ error: "This user does not exist" });
  }

  const result = q.rows[0];
  const match = await bcrypt.compare(password, result.password);

  if (!match) {
    return res.status(403).send({ error: "Wrong password" });
  }

  try {
    const token = await sign(
      { id: result.id, nickname: result.nickname, email },
      process.env.JWT_SECRET,
      {
        algorithm: "HS512",
        expiresIn: "4h",
      }
    );

    return res.send({ token });
  } catch (err) {
    console.log(err);
    return res.status(500).send({ error: "Cannot generate token" });
  }
});

// This middleware will ensure that all subsequent routes include a valid token in the authorization header
// The 'user' variable will be added to the request object, to be used in the following request listeners
server.use(async (req, res, next) => {
  if (!req.headers.authorization) return res.status(401).send("Unauthorized");

  try {
    const decoded = await verify(
      req.headers.authorization.split(" ")[1],
      process.env.JWT_SECRET
    );

    if (decoded !== undefined) {
      req.user = decoded;
      return next();
    }
  } catch (err) {
    console.log(err);
  }

  return res.status(403).send("Invalid token");
});

server.use("/api/lobby", lobbyRouter);

server.use("/api/users", usersRouter);

server.get("/api/hello", (req, res) => {
  res.send({ info: "Hello " + req.user.nickname });
});

server.get("/api/users", async (req, res) => {
  const q = await pool.query("SELECT nickname from users");
  return res.send(q.rows);
});

app.delete("/api/messages/:messageId", async (req, res) => {
  const messageId = req.params.messageId;
  const userId = req.user.id;

  try {
    const result = await pool.query(
      "SELECT ml.user_id, ml.is_admin FROM message_lobbies ml JOIN messages m ON ml.user_id = m.user_id WHERE m.id = $1",
      [messageId]
    );

    if (result.rowCount === 0) {
      return res.status(404).send({ error: "Message not found" });
    }

    const messageUserId = result.rows[0].user_id;
    const isAdmin = result.rows[0].is_admin;

    if (userId !== messageUserId && !isAdmin) {
      return res
        .status(403)
        .send({ error: "You are not authorized to delete this message" });
    }

    await pool.query("DELETE FROM messages WHERE id = $1", [messageId]);

    res.send(`Successfully deleted message with id ${messageId}`);
  } catch (error) {
    console.error("Error deleting message:", error);
    res.status(500).send({ error: "Internal server error" });
  }
});



const PORT = process.env.PORT || 3000;

server.listen(PORT, () =>
  console.log(`Server is now running in PORT: ${PORT}`)
);
