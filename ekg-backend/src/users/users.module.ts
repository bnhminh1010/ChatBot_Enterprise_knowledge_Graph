import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { Neo4jModule } from '../core/neo4j/neo4j.module';

@Module({
    imports: [Neo4jModule],
    providers: [UsersService],
    exports: [UsersService],
})
export class UsersModule { }
