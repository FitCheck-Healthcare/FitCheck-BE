"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const consultRequests_routes_js_1 = __importDefault(require("./routes/consultRequests.routes.js"));
const courses_routes_js_1 = __importDefault(require("./routes/courses.routes.js"));
const gyms_routes_js_1 = __importDefault(require("./routes/gyms.routes.js"));
const me_routes_js_1 = __importDefault(require("./routes/me.routes.js"));
const meals_routes_js_1 = __importDefault(require("./routes/meals.routes.js"));
const uploads_routes_js_1 = __importDefault(require("./routes/uploads.routes.js"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.get('/', (_req, res) => {
    res.send('FitCheck Express 서버가 정상 작동 중입니다! 🚀');
});
app.get('/api/test', (_req, res) => {
    res.json({
        message: '성공적으로 서버와 연결되었습니다.',
        status: 'success',
    });
});
app.use('/api/v1/courses', courses_routes_js_1.default);
app.use('/api/v1/gyms', gyms_routes_js_1.default);
app.use('/api/v1/consult-requests', consultRequests_routes_js_1.default);
app.use('/api/v1/me', me_routes_js_1.default);
app.use('/api/v1/meals', meals_routes_js_1.default);
app.use('/api/v1/uploads', uploads_routes_js_1.default);
app.listen(PORT, () => {
    console.log(`✅ 서버가 실행되었습니다: http://localhost:${PORT}`);
    if (Number(PORT) === 5000) {
        console.log('⚠️  macOS는 5000 포트를 AirPlay가 사용할 수 있습니다. 403이 나오면 .env의 PORT를 5001로 바꿔보세요.');
    }
});
