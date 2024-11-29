import { LoggedInjectable } from 'nestlogged';
import { PrismaService } from '../prisma.service';

@LoggedInjectable()
export class UpdatorService {
  constructor(private db: PrismaService) {}
}
