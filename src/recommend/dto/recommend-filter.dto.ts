import { IsOptional, IsPositive, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class RecommendReviewFilterDto {
  @IsOptional()
  @IsPositive()
  review_min?: number;

  @IsOptional()
  @IsPositive()
  review_max?: number;

  @IsOptional()
  @IsPositive()
  review_positive_min?: number;

  @IsOptional()
  @IsPositive()
  review_positive_max?: number;

  @IsOptional()
  @IsPositive()
  review_negative_min?: number;

  @IsOptional()
  @IsPositive()
  review_negative_max?: number;

  @IsOptional()
  @IsPositive()
  review_ratio_min?: number;

  @IsOptional()
  @IsPositive()
  review_ratio_max?: number;
}

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

  @ValidateNested()
  reviews: RecommendReviewFilterDto[] = [];

  @IsOptional()
  genre?: string;
}

export class RecommendBodyDto {
  @IsPositive({ each: true })
  @IsOptional()
  exclude: number[] = [];

  @ValidateNested()
  @Type(() => RecommendFilterDto)
  filter: RecommendFilterDto = new RecommendFilterDto();
}
