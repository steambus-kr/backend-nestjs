import { LoggedInjectable } from 'nestlogged';
import { PrismaService } from '../prisma/prisma.service';

@LoggedInjectable()
export class UpdatorService {
  constructor(private db: PrismaService) {}
}
