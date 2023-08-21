import { QueryResult } from "pg";

export default function mergeSongGenres(arr: QueryResult) {
  const mergedSongs = arr.rows.reduce((result, song) => {
    const existingSongIndex = result.findIndex((s: any) => s.id === song.id);

    if (existingSongIndex !== -1) {
      result[existingSongIndex].genre.push(song.genre);
    } else {
      result.push({ ...song, genre: [song.genre] });
    }

    return result;
  }, []);

  return mergedSongs;
}
