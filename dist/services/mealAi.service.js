"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isGeminiConfigured = isGeminiConfigured;
exports.analyzeMealWithGemini = analyzeMealWithGemini;
exports.hasExplicitMacros = hasExplicitMacros;
const generative_ai_1 = require("@google/generative-ai");
/** 신규 API 키에서 gemini-2.5-flash 등 고정 버전은 404가 날 수 있어 alias 사용 */
const DEFAULT_MODEL = 'gemini-flash-latest';
const FALLBACK_MODELS = ['gemini-3.5-flash', 'gemini-3-flash-preview'];
const REQUEST_TIMEOUT_MS = 45_000;
function getApiKey() {
    const key = process.env.GEMINI_API_KEY?.trim();
    return key || null;
}
function isGeminiConfigured() {
    return Boolean(getApiKey());
}
function resolveModelCandidates() {
    const configured = process.env.GEMINI_MODEL?.trim();
    const ordered = configured
        ? [configured, DEFAULT_MODEL, ...FALLBACK_MODELS]
        : [DEFAULT_MODEL, ...FALLBACK_MODELS];
    return [...new Set(ordered)];
}
function isRetryableModelError(err) {
    const message = err instanceof Error ? err.message : String(err);
    return (message.includes('[404') ||
        message.includes('404 Not Found') ||
        message.includes('no longer available') ||
        message.includes('is not found for API version'));
}
function withTimeout(promise, ms, label) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`${label}_TIMEOUT`)), ms);
        promise
            .then((value) => {
            clearTimeout(timer);
            resolve(value);
        })
            .catch((err) => {
            clearTimeout(timer);
            reject(err);
        });
    });
}
function buildPrompt(input) {
    const memo = input.memo.trim() || '(설명 없음)';
    const macroInstruction = input.estimateMacros
        ? '사진과 메모를 바탕으로 carb, protein, fat, kcal을 현실적인 범위로 추정하세요.'
        : '탄단지·칼로리 숫자는 추정하지 마세요. feedback만 작성하세요. carb/protein/fat/kcal은 0으로 두세요.';
    return `당신은 영양 코치 AI입니다.
${macroInstruction}
1~2문장의 자연스러운 한국어 피드백을 작성하세요. 의학적 진단은 하지 마세요.

- 끼니: ${input.mealType}
- 메모: ${memo}
- 사진: ${input.imageUrl ? '첨부됨' : '없음'}

반드시 아래 JSON만 출력:
{
  "carb": 0,
  "protein": 0,
  "fat": 0,
  "kcal": 0,
  "feedback": "짧은 한국어 피드백"
}`;
}
function parseAnalysisJson(text) {
    const trimmed = text.trim();
    const jsonStr = trimmed.startsWith('{')
        ? trimmed
        : trimmed.slice(trimmed.indexOf('{'), trimmed.lastIndexOf('}') + 1);
    if (!jsonStr.includes('{'))
        return null;
    try {
        const parsed = JSON.parse(jsonStr);
        const feedback = typeof parsed.feedback === 'string' ? parsed.feedback.trim() : '';
        if (!feedback)
            return null;
        return {
            macros: {
                carb: Math.max(0, Math.round(Number(parsed.carb) || 0)),
                protein: Math.max(0, Math.round(Number(parsed.protein) || 0)),
                fat: Math.max(0, Math.round(Number(parsed.fat) || 0)),
                kcal: Math.max(0, Math.round(Number(parsed.kcal) || 0)),
            },
            aiFeedback: feedback,
        };
    }
    catch {
        return null;
    }
}
async function fetchImageInlineData(imageUrl) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
        const res = await fetch(imageUrl, { signal: controller.signal });
        if (!res.ok) {
            throw new Error(`IMAGE_FETCH_FAILED:${res.status}`);
        }
        const buffer = Buffer.from(await res.arrayBuffer());
        const mimeType = res.headers.get('content-type')?.split(';')[0]?.trim() || 'image/jpeg';
        return { mimeType, data: buffer.toString('base64') };
    }
    finally {
        clearTimeout(timer);
    }
}
async function generateWithModel(apiKey, modelName, parts) {
    const genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.3,
        },
    });
    const result = await withTimeout(model.generateContent({ contents: [{ role: 'user', parts }] }), REQUEST_TIMEOUT_MS, 'GEMINI');
    const text = result.response.text();
    if (!text)
        return null;
    return parseAnalysisJson(text);
}
async function analyzeMealWithGemini(input) {
    const apiKey = getApiKey();
    if (!apiKey)
        return null;
    const parts = [{ text: buildPrompt(input) }];
    if (input.imageUrl) {
        const inline = await fetchImageInlineData(input.imageUrl);
        parts.push({ inlineData: inline });
    }
    else if (input.estimateMacros) {
        return null;
    }
    const models = resolveModelCandidates();
    let lastError;
    for (const modelName of models) {
        try {
            const analysis = await generateWithModel(apiKey, modelName, parts);
            if (analysis) {
                if (modelName !== models[0]) {
                    console.warn(`[mealAi] fallback model used: ${modelName}`);
                }
                return analysis;
            }
            console.warn(`[mealAi] empty analysis from model: ${modelName}`);
        }
        catch (err) {
            lastError = err;
            const message = err instanceof Error ? err.message : String(err);
            console.error(`[mealAi] model ${modelName} failed:`, message.split('\n')[0]);
            if (!isRetryableModelError(err)) {
                throw err;
            }
        }
    }
    if (lastError) {
        throw lastError instanceof Error ? lastError : new Error(String(lastError));
    }
    return null;
}
function hasExplicitMacros(macros) {
    if (!macros)
        return false;
    return ['carb', 'protein', 'fat', 'kcal'].some((key) => macros[key] !== undefined && Number(macros[key]) > 0);
}
