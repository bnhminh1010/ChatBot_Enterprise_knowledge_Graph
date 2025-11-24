import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { Neo4jService } from '../core/neo4j/neo4j.service';

@Injectable()
export class LocationsService {
  constructor(private neo: Neo4jService) {}

  async list() {
    try {
      const rows = await this.neo.run(
        `MATCH (l:DiaDiem)
         RETURN {
           id: l.id,
           code: l.id,
           name: l.ten,
           address: l.dia_chi,
           type: l.loai,
           description: COALESCE(l.mo_ta, ''),
           city: l.thanh_pho,
           country: l.quoc_gia,
           latitude: l.vi_do,
           longitude: l.kinh_do
         } AS location
         ORDER BY l.ten`
      );
      return rows.map(r => r.location);
    } catch (e) {
      throw new ServiceUnavailableException('Database connection error');
    }
  }

  async findByName(name: string) {
    try {
      const rows = await this.neo.run(
        `MATCH (l:DiaDiem)
         WHERE toLower(l.ten) CONTAINS toLower($name) OR toLower(l.id) CONTAINS toLower($name)
         RETURN {
           id: l.id,
           code: l.id,
           name: l.ten,
           address: l.dia_chi,
           type: l.loai,
           description: COALESCE(l.mo_ta, ''),
           city: l.thanh_pho,
           country: l.quoc_gia,
           latitude: l.vi_do,
           longitude: l.kinh_do
         } AS location
         LIMIT 1`,
        { name }
      );
      if (!rows[0]) throw new NotFoundException(`Location "${name}" not found`);
      return rows[0].location;
    } catch (e) {
      if (e instanceof NotFoundException) throw e;
      throw new ServiceUnavailableException('Database connection error');
    }
  }
}
