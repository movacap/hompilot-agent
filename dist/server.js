"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const webhook_1 = __importDefault(require("./routes/webhook"));
const api_1 = __importDefault(require("./routes/api"));
const dashboard_1 = __importDefault(require("./routes/dashboard"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use(express_1.default.static(path_1.default.join(__dirname, '../public')));
app.use('/webhook', webhook_1.default);
app.use('/api', api_1.default);
app.use('/', dashboard_1.default);
app.listen(PORT, () => {
    console.log(`HomPilot Agent running on port ${PORT}`);
});
exports.default = app;
