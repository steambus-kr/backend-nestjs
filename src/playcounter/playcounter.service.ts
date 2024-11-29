import { LoggedInjectable } from 'nestlogged';
import { PrismaService } from '../prisma.service';

@LoggedInjectable()
export class PlaycounterService {
  constructor(private db: PrismaService) {}
}
