interface IRefinedGameInfo {
  app_id: number;
  title: string;
  description: string;
  owner_min: number;
  release_date: string;
  player_count: {
    latest: {
      count: number;
      date: number;
    } | null;
    peak: {
      count: number;
      date: number;
    } | null;
  };
  thumbnail_src: string;
  review: {
    positive: number;
    negative: number;
    ratio: number;
  };
  genres: string[];
}
