"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendSuccess = sendSuccess;
exports.sendListSuccess = sendListSuccess;
exports.sendError = sendError;
function sendSuccess(res, data, status = 200) {
    return res.status(status).json({ success: true, data });
}
function sendListSuccess(res, data, meta, status = 200) {
    return res.status(status).json({ success: true, data, meta });
}
function sendError(res, status, code, message) {
    return res.status(status).json({
        success: false,
        error: { code, message },
    });
}
