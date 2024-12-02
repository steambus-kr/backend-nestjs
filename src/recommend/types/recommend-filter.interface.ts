export interface RecommendFilter {
  owner_min: number;
  player_min: number;
  player_max: number;
  review_min: number;
  review_max: number;
  review_positive_min: number;
  review_positive_max: number;
  review_negative_min: number;
  review_negative_max: number;
  review_ratio_min: number;
  review_ratio_max: number;
  genre: string;
}
