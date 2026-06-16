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
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// In Vercel serverless, __dirname = bundle root, public/ is placed there via includeFiles
// In local dev, __dirname = dist/, so ../public works — we check both
const publicDir = path_1.default.join(__dirname, 'public');
app.use(express_1.default.static(publicDir));
app.use('/webhook', webhook_1.default);
app.use('/api', api_1.default);
// Serve index.html for all other routes (SPA fallback)
app.get('*', (_req, res) => {
    res.sendFile(path_1.default.join(publicDir, 'index.html'));
});
app.listen(PORT, () => {
    console.log(`HomPilot Agent running on port ${PORT}`);
});
exports.default = app;
