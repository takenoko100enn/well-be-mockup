// We'll Be ― VOICEVOX 音声合成モジュール
// ローカル起動（localhost:50021）および クラウドWEB API（tts.quest）の両対応

(function() {
  let currentAudio = null;
  const audioCache = new Map();

  // 利用可能なVOICEVOX話者
  const SPEAKERS = [
    { id: 2, name: '四国めたん（ノーマル・丁寧で安心感のある声）', desc: 'おすすめ・コンシェルジュ向き' },
    { id: 3, name: 'ずんだもん（ノーマル・元気で親しみやすい声）', desc: '人気' },
    { id: 47, name: 'ナースロボ＿タイプＴ（医療向け・落ち着いた声）', desc: '医療テーマに最適' },
    { id: 0, name: '四国めたん（あまあま・優しい声）', desc: '癒し' }
  ];

  function stopVoicevox() {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio = null;
    }
  }

  function cleanSpeechText(text) {
    return String(text || '')
      .replace(/[⚠️📞🚑💊💬📝🎒📅👨‍👩‍👧📷✅💡🔄🤖💌👀📱⚙️✨]/g, '')
      .replace(/\(.*?\)/g, '')
      .replace(/（.*?）/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/(\d{1,2}):(\d{2})/g, '$1時$2分')
      .replace(/119番/g, 'ひゃくじゅうきゅうばん')
      .replace(/…/g, '、')
      .replace(/~/g, '')
      .replace(/〜/g, '')
      .replace(/[「」『』]/g, '')
      .trim();
  }

  // 1. ローカルVOICEVOX (localhost:50021)
  async function synthesizeLocalVoicevox(text, speakerId) {
    const queryUrl = `http://localhost:50021/audio_query?text=${encodeURIComponent(text)}&speaker=${speakerId}`;
    const queryRes = await fetch(queryUrl, { method: 'POST', signal: AbortSignal.timeout(1500) });
    if (!queryRes.ok) throw new Error('Local query failed');
    const queryJson = await queryRes.json();

    const synthUrl = `http://localhost:50021/synthesis?speaker=${speakerId}`;
    const synthRes = await fetch(synthUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(queryJson),
      signal: AbortSignal.timeout(5000)
    });
    if (!synthRes.ok) throw new Error('Local synth failed');
    const blob = await synthRes.blob();
    return URL.createObjectURL(blob);
  }

  // 2. クラウドWEB API (tts.quest)
  async function synthesizeWebVoicevox(text, speakerId) {
    const url = `https://api.tts.quest/v3/voicevox/synthesis?text=${encodeURIComponent(text)}&speaker=${speakerId}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(7000) });
    if (!res.ok) throw new Error(`Web API HTTP ${res.status}`);
    const data = await res.json();

    if (!data.success) throw new Error('Web API returned success:false');

    const statusUrl = data.audioStatusUrl;
    const downloadUrl = data.mp3DownloadUrl;

    if (!statusUrl) {
      return downloadUrl;
    }

    // 生成完了をポーリング（最大15回 = 約4秒）
    for (let i = 0; i < 15; i++) {
      try {
        const sRes = await fetch(statusUrl, { signal: AbortSignal.timeout(2000) });
        if (sRes.ok) {
          const sData = await sRes.json();
          if (sData.isAudioReady) {
            return downloadUrl;
          }
        }
      } catch (e) {
        // 次のポーリングへ
      }
      await new Promise(r => setTimeout(r, 250));
    }

    return downloadUrl;
  }

  /**
   * VOICEVOXで音声を合成して再生する
   */
  async function speakVoicevox(rawText, speakerId = 2, onStart, onEnd) {
    stopVoicevox();
    const text = cleanSpeechText(rawText);
    if (!text) return false;

    const cacheKey = `${speakerId}:${text}`;
    let audioUrl = audioCache.get(cacheKey);

    if (!audioUrl) {
      try {
        // まずPCローカルで起動中のVOICEVOX（約50ms・超高速）を試行
        audioUrl = await synthesizeLocalVoicevox(text, speakerId);
      } catch (localErr) {
        // ローカルが動いていない場合はクラウドWEB APIを使用（ゼロインストールで動作）
        try {
          audioUrl = await synthesizeWebVoicevox(text, speakerId);
        } catch (webErr) {
          console.warn('VOICEVOX Web API failed:', webErr);
          throw webErr;
        }
      }
      if (audioUrl) {
        audioCache.set(cacheKey, audioUrl);
      }
    }

    if (!audioUrl) return false;

    const audio = new Audio(audioUrl);
    currentAudio = audio;

    return new Promise((resolve, reject) => {
      audio.onplay = () => {
        if (typeof onStart === 'function') onStart();
      };
      audio.onended = () => {
        currentAudio = null;
        if (typeof onEnd === 'function') onEnd();
        resolve(true);
      };
      audio.onerror = (e) => {
        console.warn('Audio playback error:', e);
        currentAudio = null;
        if (typeof onEnd === 'function') onEnd();
        reject(e);
      };

      audio.play().catch(reject);
    });
  }

  window.VOICEVOX_SPEAKERS = SPEAKERS;
  window.speakVoicevox = speakVoicevox;
  window.stopVoicevox = stopVoicevox;
})();
