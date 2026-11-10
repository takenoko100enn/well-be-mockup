// We'll Be ― Gemini API 設定ファイル
// 
// 【APIキーの設定方法（以下のいずれかで設定できます）】
// 1. 下記の GEMINI_API_KEY に直接 'AIzaSy...' を記入する
// 2. ブラウザ画面上部の「🔑 AI設定」ボタンから貼り付けて保存する（推奨：localStorageに安全に保存されます）
// 3. GitHub Pages公開時：GitHubのSecretsに GEMINI_API_KEY を登録し、GitHub Actionsで自動注入する

window.CONFIG = {
  // ここにAPIキーを直接入力しても動作します（GitHubへコミットする際は空またはプレースホルダーにしてください）
  GEMINI_API_KEY: "__GEMINI_API_KEY__",

  // 使用するGeminiモデル（高速・低遅延・高精度の gemini-1.5-flash 推奨）
  GEMINI_MODEL: "gemini-1.5-flash",

  // Gemini API呼び出しの有効/無効（falseにすると従来のルールベースモックで動作）
  USE_GEMINI: true,

  // API呼び出しタイムアウト（ミリ秒）
  API_TIMEOUT_MS: 12000
};

// 有効なAPIキーを取得するヘルパー（localStorage優先 -> CONFIG.GEMINI_API_KEY）
window.getGeminiApiKey = function() {
  const localKey = localStorage.getItem('well_be_gemini_api_key');
  if (localKey && localKey.trim().length > 10) {
    return localKey.trim();
  }
  const configKey = window.CONFIG && window.CONFIG.GEMINI_API_KEY;
  if (configKey && configKey !== "__GEMINI_API_KEY__" && configKey.trim().length > 10) {
    return configKey.trim();
  }
  return "";
};
