import postgres from "postgres";

const cfg = {
  host: "localhost",
  port: 5432,
  user: "postgres",
  password: "password",
  database: "postgres",
  // ssl: false,
};

const sql = postgres(cfg);

export default sql;
