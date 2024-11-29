export interface RecommendFilter {
  owner_min: number;
  player_min: number;
  player_max: number;
  positive_review_min: number;
  positive_review_max: number;
  review_ratio_min: number;
  review_ratio_max: number;
  genre: string;
}
