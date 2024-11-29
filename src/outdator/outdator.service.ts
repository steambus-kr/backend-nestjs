import { LoggedInjectable } from 'nestlogged';
import { PrismaService } from '../prisma.service';

@LoggedInjectable()
export class OutdatorService {
  constructor(private db: PrismaService) {}
}
