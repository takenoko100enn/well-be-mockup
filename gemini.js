// We'll Be ― Gemini API 通信モジュール

(function() {
  const GEMINI_API_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

  /**
   * Gemini APIを呼び出し、構造化された返答（JSON）を取得する
   * @param {string} userText - ユーザーの発話
   * @param {Array} history - 直近の会話履歴 [{ sender: 'me'|'ai', text: string }]
   * @returns {Promise<Object>} - パースされたAI返答オブジェクト
   */
  async function callGeminiApi(userText, history = []) {
    const apiKey = window.getGeminiApiKey();
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY_NOT_CONFIGURED");
    }

    const model = (window.CONFIG && window.CONFIG.GEMINI_MODEL) || "gemini-1.5-flash";
    const timeoutMs = (window.CONFIG && window.CONFIG.API_TIMEOUT_MS) || 12000;
    const url = `${GEMINI_API_ENDPOINT}/${model}:generateContent?key=${apiKey}`;

    // 直近の会話履歴（最大6往復）をGeminiの形式に変換
    const contents = [];
    const recentHistory = (history || []).slice(-8);
    for (const h of recentHistory) {
      contents.push({
        role: h.sender === 'me' ? 'user' : 'model',
        parts: [{ text: h.text }]
      });
    }

    // 最新の発話を追加
    contents.push({
      role: 'user',
      parts: [{ text: userText }]
    });

    const requestBody = {
      systemInstruction: {
        parts: [{ text: window.SYSTEM_PROMPT || "" }]
      },
      contents: contents,
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.3,
        maxOutputTokens: 500
      }
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`Gemini API HTTP Error (${response.status}):`, errorText);
        throw new Error(`HTTP_${response.status}`);
      }

      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawText) {
        throw new Error("EMPTY_RESPONSE");
      }

      // JSONのパース（Markdownの ```json ... ``` で囲まれている場合も考慮して抽出）
      const cleanedText = rawText
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/, "")
        .replace(/\s*```$/, "")
        .trim();

      const parsed = JSON.parse(cleanedText);
      return {
        reply: parsed.reply || "お話しいただきありがとうございます。",
        action: parsed.action || "none",
        danger: Boolean(parsed.danger),
        symptomSummary: parsed.symptom_summary || null,
        memoQuestion: parsed.memo_question || null,
        familyNotify: parsed.family_notify || null,
        actionLabel: parsed.action_label || null,
        actionScreen: parsed.action_screen || null,
        source: "gemini"
      };
    } catch (err) {
      clearTimeout(timeoutId);
      console.warn("Gemini API call failed, falling back to rule-based engine:", err.message);
      throw err;
    }
  }

  /**
   * APIキーが有効に機能するか接続テストを行う
   */
  async function testGeminiApiKey(candidateKey) {
    const key = (candidateKey || "").trim();
    if (!key) return { ok: false, error: "キーが入力されていません" };

    const model = (window.CONFIG && window.CONFIG.GEMINI_MODEL) || "gemini-1.5-flash";
    const url = `${GEMINI_API_ENDPOINT}/${model}:generateContent?key=${key}`;

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: "こんにちは。一言だけで「テスト成功」と返してください。" }] }]
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return { ok: false, error: err?.error?.message || `HTTPエラー ${res.status}` };
      }

      const data = await res.json();
      const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || "接続成功";
      return { ok: true, reply };
    } catch (e) {
      return { ok: false, error: e.message || "通信エラー" };
    }
  }

  // グローバルに公開
  window.callGeminiApi = callGeminiApi;
  window.testGeminiApiKey = testGeminiApiKey;
})();
