import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { Client } from "pg";
import filePath from "./filePath";

const app = express();

/** Parses JSON data in a request automatically */
app.use(express.json());
/** To allow 'Cross-Origin Resource Sharing': https://en.wikipedia.org/wiki/Cross-origin_resource_sharing */
app.use(cors());

// read in contents of any environment variables in the .env file
dotenv.config();

// use the environment variable PORT, or 4000 as a fallback
const PORT_NUMBER = process.env.PORT ?? 4000;
const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  throw new Error("Missing env variable DATABASE_URL");
}

const client = new Client(dbUrl);
client.connect();

// API info page
app.get("/", (req, res) => {
  const pathToFile = filePath("../public/index.html");
  res.sendFile(pathToFile);
});

// GET /items
app.get("/resources", async (req, res) => {
  const queryText = "SELECT * FROM content";
  const content = await client.query(queryText);

  console.log(content);

  if (content) {
    res.status(200).json({
      status: "sucesss",
      data: content.rows,
    });
  } else {
    res.status(404).json({
      status: "fail",
      data: {
        id: "Could not find any content",
      },
    });
  }
});

// POST /items
app.post("/resources", (req, res) => {
  // to be rigorous, ought to handle non-conforming request bodies
  // ... but omitting this as a simplification
  const postData = req.body;
  let queryText = "";
  let values = [];

  if (postData.youtube_url !== undefined) {
    queryText =
      "INSERT INTO content (title, summary, youtube_url, article_url) values($1, $2, $3, $4)";
    values = [
      postData.title,
      postData.summary,
      postData.youtube_url,
      postData.article_url,
    ];
  } else {
    queryText =
      "INSERT INTO content (title, summary, article_url) values($1, $2, $3)";
    values = [postData.title, postData.summary, postData.article_url];
  }

  const result = client.query(queryText, values);
  res.status(201).json(result);
});

// GET /resources/:id
app.get<{ id: string }>("/resources/:id", (req, res) => {});

// DELETE /resources/:id
app.delete<{ id: string }>("/resources/:id", (req, res) => {});

// PATCH /resources/:id
app.patch("/resources/:id", (req, res) => {});

app.listen(PORT_NUMBER, () => {
  console.log(`Server is listening on port ${PORT_NUMBER}!`);
});
