export interface QueryRes {
  rows: {
    title: string;
    artist: string;
    userid: number;
    username: string;
    youtube_url?: string;
    spotify_url?: string;
    tags: string;
    id: number;
    genre: string[];
  };
}

export interface User {
  username: string;
  id: number;
}

export interface Genre {
  id: number;
  genre: string;
}
