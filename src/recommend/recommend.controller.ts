import { Controller } from '@nestjs/common';
import { LoggedController } from 'nestlogged';

@LoggedController('recommend')
export class RecommendController {}
