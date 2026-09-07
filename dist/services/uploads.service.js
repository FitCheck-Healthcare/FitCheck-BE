"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MEAL_IMAGE_MIME_TYPES = exports.MEAL_IMAGE_MAX_BYTES = void 0;
exports.isMealImageMimeType = isMealImageMimeType;
exports.uploadMealImage = uploadMealImage;
const node_crypto_1 = require("node:crypto");
const supabase_js_1 = require("../lib/supabase.js");
const BUCKET = 'meal-images';
exports.MEAL_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
exports.MEAL_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const EXT_BY_MIME = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
};
function isMealImageMimeType(value) {
    return exports.MEAL_IMAGE_MIME_TYPES.includes(value);
}
async function uploadMealImage(userId, buffer, mimeType) {
    const supabase = (0, supabase_js_1.getSupabase)();
    const ext = EXT_BY_MIME[mimeType];
    const path = `meals/${userId}/${(0, node_crypto_1.randomUUID)()}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
        contentType: mimeType,
        upsert: false,
    });
    if (error)
        throw new Error(error.message);
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
}
