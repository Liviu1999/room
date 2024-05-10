import pg from "pg";
import express from "express";
import bcrypt from "bcrypt";
import JWT from "jsonwebtoken";
import dotenv from "dotenv";
import { promisify } from "util";

const { Pool } = pg;

const pool = new Pool({
  // user: "postgres",
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

router.get("/", (req, res) => {
  res.send("hello");
});

export default router;
