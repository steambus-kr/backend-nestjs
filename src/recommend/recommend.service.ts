import { LoggedInjectable } from 'nestlogged';
import { PrismaService } from '../prisma/prisma.service';

@LoggedInjectable()
export class RecommendService {
  constructor(private db: PrismaService) {}
}
