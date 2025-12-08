"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var GraphDataExtractor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GraphDataExtractor = void 0;
const common_1 = require("@nestjs/common");
let GraphDataExtractor = GraphDataExtractor_1 = class GraphDataExtractor {
    logger = new common_1.Logger(GraphDataExtractor_1.name);
    extractGraphData(records) {
        if (!records || records.length === 0) {
            return null;
        }
        const nodesMap = new Map();
        const linksMap = new Map();
        for (const record of records) {
            record.keys.forEach((key) => {
                const value = record.get(key);
                if (this.isNode(value)) {
                    this.addNode(value, nodesMap);
                }
                else if (this.isRelationship(value)) {
                    this.addRelationship(value, linksMap);
                }
                else if (this.isPath(value)) {
                    this.extractPath(value, nodesMap, linksMap);
                }
                else if (Array.isArray(value)) {
                    value.forEach((item) => {
                        if (this.isNode(item)) {
                            this.addNode(item, nodesMap);
                        }
                        else if (this.isRelationship(item)) {
                            this.addRelationship(item, linksMap);
                        }
                    });
                }
            });
        }
        const nodes = Array.from(nodesMap.values());
        const links = Array.from(linksMap.values());
        if (nodes.length === 0) {
            return null;
        }
        this.logger.debug(`Extracted ${nodes.length} nodes and ${links.length} relationships`);
        return { nodes, links };
    }
    isNode(value) {
        return (value && (value.labels || value.identity !== undefined || value.elementId));
    }
    isRelationship(value) {
        return (value &&
            value.type &&
            (value.start !== undefined || value.startNodeElementId));
    }
    isPath(value) {
        return value && value.segments && Array.isArray(value.segments);
    }
    addNode(node, nodesMap) {
        const id = node.elementId || node.identity?.toString() || node.id;
        if (!id || nodesMap.has(id)) {
            return;
        }
        const labels = node.labels || [];
        const properties = node.properties || {};
        const label = properties.ten ||
            properties.name ||
            properties.tenCongTy ||
            properties.tenPhongBan ||
            properties.tenDuAn ||
            labels[0] ||
            'Unknown';
        const type = this.normalizeNodeType(labels[0] || 'unknown');
        const val = this.getNodeSize(type);
        nodesMap.set(id, {
            id,
            label,
            type,
            val,
            properties,
        });
    }
    addRelationship(rel, linksMap) {
        const id = rel.elementId || rel.identity?.toString() || rel.id;
        if (!id || linksMap.has(id)) {
            return;
        }
        const source = rel.startNodeElementId || rel.start?.toString() || rel.startNode;
        const target = rel.endNodeElementId || rel.end?.toString() || rel.endNode;
        if (!source || !target) {
            return;
        }
        const relationship = rel.type || 'RELATED_TO';
        linksMap.set(id, {
            source,
            target,
            relationship,
            value: 1,
            properties: rel.properties || {},
        });
    }
    extractPath(path, nodesMap, linksMap) {
        if (!path.segments || !Array.isArray(path.segments)) {
            return;
        }
        if (path.start) {
            this.addNode(path.start, nodesMap);
        }
        for (const segment of path.segments) {
            if (segment.relationship) {
                this.addRelationship(segment.relationship, linksMap);
            }
            if (segment.end) {
                this.addNode(segment.end, nodesMap);
            }
        }
        if (path.end) {
            this.addNode(path.end, nodesMap);
        }
    }
    normalizeNodeType(label) {
        const labelLower = label.toLowerCase();
        const typeMap = {
            nhansu: 'employee',
            employee: 'employee',
            phongban: 'department',
            department: 'department',
            kynangtechstacks: 'skill',
            skill: 'skill',
            technology: 'skill',
            duan: 'project',
            project: 'project',
            chucvu: 'position',
            position: 'position',
            congty: 'company',
            company: 'company',
            diadiem: 'location',
            location: 'location',
        };
        for (const [key, value] of Object.entries(typeMap)) {
            if (labelLower.includes(key)) {
                return value;
            }
        }
        return label.toLowerCase();
    }
    getNodeSize(type) {
        const sizeMap = {
            company: 20,
            department: 15,
            project: 15,
            employee: 10,
            position: 12,
            skill: 8,
            location: 12,
        };
        return sizeMap[type] || 10;
    }
    shouldGenerateGraph(records) {
        if (!records || records.length === 0) {
            return false;
        }
        for (const record of records) {
            for (const key of record.keys) {
                const value = record.get(key);
                if (this.isNode(value) ||
                    this.isRelationship(value) ||
                    this.isPath(value)) {
                    return true;
                }
                if (Array.isArray(value) &&
                    value.some((v) => this.isNode(v) || this.isRelationship(v))) {
                    return true;
                }
            }
        }
        return false;
    }
};
exports.GraphDataExtractor = GraphDataExtractor;
exports.GraphDataExtractor = GraphDataExtractor = GraphDataExtractor_1 = __decorate([
    (0, common_1.Injectable)()
], GraphDataExtractor);
//# sourceMappingURL=graph-data-extractor.service.js.map