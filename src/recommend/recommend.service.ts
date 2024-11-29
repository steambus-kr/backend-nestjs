import { Injectable } from '@nestjs/common';
import { LoggedInjectable } from 'nestlogged';
import { PrismaService } from '../prisma.service';

@LoggedInjectable()
export class RecommendService {
  constructor(private db: PrismaService) {}
}
