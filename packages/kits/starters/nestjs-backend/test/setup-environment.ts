import "reflect-metadata";

// Settings the app checks at start-up; the database suite gets the real ones from `.env.test`.
process.env.DATABASE_URL ??= "postgres://unused@127.0.0.1:1/unused";
