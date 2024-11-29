import { IsOptional, IsPositive } from 'class-validator';

export class RecommendFilterDto {
  @IsOptional()
  @IsPositive()
  owner_min?: number;

  @IsOptional()
  @IsPositive()
  player_min?: number;

  @IsOptional()
  @IsPositive()
  player_max?: number;

  @IsOptional()
  @IsPositive()
  positive_review_min?: number;

  @IsOptional()
  @IsPositive()
  positive_review_max?: number;

  @IsOptional()
  @IsPositive()
  review_ratio_min?: number;

  @IsOptional()
  @IsPositive()
  review_ratio_max?: number;

  @IsOptional()
  genre?: string;
}
