import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { Client } from "pg";
import filePath from "./filePath";
import mergeSongGenres from "./utils/mergeGenres";

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

// GET /songs
app.get("/songs", async (req, res) => {
  const songQuery =
    "SELECT c.id, userid, title, artist, youtube_url, spotify_url, created_at, u.username, sg.genre_id, g.genre FROM content AS c LEFT JOIN songs_genres AS sg ON sg.song_id = c.id JOIN users as u ON c.userid = u.id  LEFT JOIN genres AS g ON sg.genre_id = g.id";

  const songsResult = await client.query(songQuery);
  console.log(songsResult);

  const mergedSongs = mergeSongGenres(songsResult);

  res.status(200).json(mergedSongs);
});

//GET /users
app.get("/users", async (req, res) => {
  const queryText = "SELECT * FROM users";
  const users = await client.query(queryText);

  if (users) {
    res.status(200).json({
      status: "success",
      data: users.rows,
    });
  } else {
    res.status(404).json({
      status: "fail",
      data: {
        id: "Could not find any users",
      },
    });
  }
});

// POST /songs
app.post("/songs", async (req, res) => {
  // to be rigorous, ought to handle non-conforming request bodies
  // ... but omitting this as a simplification
  const postData = req.body;
  let queryText = "";
  let values: string[] = [];
  console.log(postData);
  if (postData.youtube_url === "") {
    queryText =
      "INSERT INTO content (title, artist, spotify_url, userid, created_at) values($1, $2, $3, $4, $5) RETURNING *";
    values = [
      postData.title,
      postData.artist,
      postData.spotify_url,
      postData.userid,
      Date.now(),
    ];
  } else if (postData.spotify_url === "") {
    queryText =
      "INSERT INTO content (title, artist, youtube_url, userid, created_at) values($1, $2, $3, $4, $5) RETURNING *";
    values = [
      postData.title,
      postData.artist,
      postData.youtube_url,
      postData.userid,
      Date.now(),
    ];
  }

  const result = await client.query(queryText, values);
  res.status(200).json(result.rows[0]);
});

//get all genres:

app.get("/genres/", async (req, res) => {
  const queryText = "SELECT * FROM genres";
  const genres = await client.query(queryText);

  res.status(200).json({
    status: "success",
    result: genres.rows,
  });
});

//get genreid by tag name?
app.get("/genres/:name", async (req, res) => {
  const name = req.params.name;

  const queryText = "SELECT id FROM genres where genre = $1";
  const values = [name];

  const result = await client.query(queryText, values);

  res.status(201).json(result.rows[0].id);
});

// POST /song_genre - many-to-many relationship with genres to handle song tags (hopefully!)
app.post("/songs_genres", async (req, res) => {
  const body = req.body;

  console.log(body);

  for (let i = 0; i < body.genreid.length; i++) {
    const queryText = "INSERT INTO songs_genres VALUES($1, $2)";
    const values = [body.songid, body.genreid[i]];

    const result = await client.query(queryText, values);

    res.status(200).json(result.rows[0]);
  }
});

//POST /favourites
app.post("/favourites", async (req, res) => {
  const body = req.body;
  const queryText = "INSERT INTO favourites VALUES($1, $2)";

  const values = [body.id, body.userid];
  const result = await client.query(queryText, values);

  res.status(200).json(result.rows[0]);
});

//GET /favourites for displaying
app.get("/favourites/:id", async (req, res) => {
  const queryText =
    "SELECT c.id, userid, title, youtube_url, spotify_url, created_at, u.username, sg.genre_id, g.genre, f.favourited_user FROM content AS c LEFT JOIN songs_genres AS sg ON sg.song_id = c.id JOIN users as u ON c.userid = u.id LEFT JOIN genres AS g ON sg.genre_id = g.id JOIN favourites as f ON f.song_id = c.id WHERE f.favourited_user = $1";
  const values = [req.params.id];

  const songsResult = await client.query(queryText, values);
  const mergedSongs = mergeSongGenres(songsResult);

  res.status(200).json(mergedSongs);
});

app.delete("/favourites/:id", async (req, res) => {
  const body = req.body;
  const queryText =
    "DELETE FROM favourites where song_id = $1 and favourited_user = $2 RETURNING *";
  const values = [req.params.id, body.activeUser.id];

  const result = await client.query(queryText, values);

  res.status(200).json(result.rows[0]);
});

//DELETE songs_genres
app.delete("/songs_genres/:id", async (req, res) => {
  const queryText = "DELETE FROM songs_genres where song_id = $1 RETURNING *";
  const values = [req.params.id];

  const result = await client.query(queryText, values);

  res.status(200).json(result.rows[0]);
});

//DELETE songs
app.delete("/content/:id", async (req, res) => {
  const queryText = "DELETE FROM content where id = $1 RETURNING *";
  const values = [req.params.id];

  const result = await client.query(queryText, values);

  res.status(200).json(result.rows[0]);
});

//POST comments
app.post("/comments", async (req, res) => {
  const body = req.body;
  const queryText =
    "INSERT INTO comments (user_id, comment, created_at, song_id) VALUES ($1, $2, $3, $4) RETURNING *";

  const values = [body.userid, body.commentText, new Date(), body.song_id];
  const result = await client.query(queryText, values);

  res.status(200).json(result.rows[0]);
});

//GET comments
app.get("/comments", async (req, res) => {
  const queryText =
    "SELECT co.user_id, co.comment, co.created_at, co.song_id, u.username FROM comments as co JOIN users as u ON u.id = co.user_id";
  const commentsList = await client.query(queryText);

  res.status(200).json(commentsList);
});

app.listen(PORT_NUMBER, () => {
  console.log(`Server is listening on port ${PORT_NUMBER}!`);
});
