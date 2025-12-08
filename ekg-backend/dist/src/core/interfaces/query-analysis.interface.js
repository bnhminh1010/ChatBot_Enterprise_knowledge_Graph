"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EntityType = exports.IntentType = void 0;
var IntentType;
(function (IntentType) {
    IntentType["GET_INFO"] = "get_info";
    IntentType["SEARCH"] = "search";
    IntentType["COUNT"] = "count";
    IntentType["COMPARE"] = "compare";
    IntentType["AGGREGATE"] = "aggregate";
    IntentType["LIST"] = "list";
    IntentType["ANALYZE"] = "analyze";
    IntentType["GREETING"] = "greeting";
    IntentType["GENERAL_KNOWLEDGE"] = "general_knowledge";
    IntentType["UPLOAD"] = "upload";
})(IntentType || (exports.IntentType = IntentType = {}));
var EntityType;
(function (EntityType) {
    EntityType["PERSON"] = "person";
    EntityType["DEPARTMENT"] = "department";
    EntityType["PROJECT"] = "project";
    EntityType["SKILL"] = "skill";
    EntityType["TECHNOLOGY"] = "technology";
    EntityType["POSITION"] = "position";
    EntityType["DOCUMENT"] = "document";
    EntityType["COMPANY"] = "company";
    EntityType["LOCATION"] = "location";
    EntityType["DATE"] = "date";
    EntityType["NUMBER"] = "number";
})(EntityType || (exports.EntityType = EntityType = {}));
//# sourceMappingURL=query-analysis.interface.js.map