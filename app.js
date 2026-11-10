// We'll Be ― 家族とAIがそばにいる通院支援アプリ モックアップ ロジック（音声対話・TTS読み上げ対応版）

const STORAGE_KEY = 'well_be_mockup_state_v4';

const MIC_SVG = `<svg viewBox="0 0 512 512" fill="var(--ai)"><path d="M383.788,206.98v51.113c-0.013,35.266-14.301,67.108-37.475,90.318 c-23.212,23.176-55.042,37.464-90.307,37.464c-35.267,0-67.108-14.288-90.32-37.464c-23.174-23.211-37.462-55.052-37.474-90.318 V206.98H90.503v51.113c0.036,84.93,64.21,154.935,146.649,164.337V512h37.709v-89.57c82.426-9.402,146.599-79.407,146.636-164.337 V206.98H383.788z"/><path d="M256.006,344.41c47.589,0,86.305-38.728,86.305-86.318V86.318C342.311,38.728,303.596,0,256.006,0 c-47.59,0-86.318,38.728-86.318,86.318v171.775C169.688,305.682,208.416,344.41,256.006,344.41z"/></svg>`;
const CHECK_SVG = `<svg width="10" height="8" viewBox="0 0 10 8"><path d="M1 4l3 3 5-6" stroke="#fff" stroke-width="2" fill="none"/></svg>`;

function getDefaultState() {
  return {
    patientScreen: 'home',          // 左：患者本人スマホに表示中の画面
    familyScreen: 'family-dash',    // 右：見守り家族スマホに表示中の画面
    visibleRole: 'patient',         // 狭い画面で表示するスマホ
    homeSubTab: 'card',
    familyNotices: [
      { time: '前日 15:00', text: '📅 明日10月1日（木）9:30 内科の予約があります。' },
      { time: '前日 18:00', text: '🎒 まだ用意できていない持ち物があります（採血の検査結果の紙）。声かけをお願いします。' }
    ],
    ttsEnabled: true,
    voiceEngine: 'voicevox', // 'voicevox' | 'browser'
    voicevoxSpeaker: 2,      // 2: 四国めたん（ノーマル）
    ttsVoiceName: '',
    ttsRate: 0.95,
    ttsPitch: 1.0,
    familyRegistered: true,
    inviteCode: ['4', '7', '2', '9', '1', '5'],
    nightMedTaken: false,
    medChat: [
      { sender: 'ai', text: '夜のお薬の時間です。飲んだら「飲んだよ」と教えてくださいね。' },
      { sender: 'me', time: '20:02', text: '飲んだよ。そういえば今朝、ちょっとふらついた。' },
      { sender: 'ai', text: 'ふらつきも記録しました。次の診察で伝えられるようにしますね。', actionLabel: '📝 診察前のメモを見る', actionScreen: 'memo' }
    ],
    symptomChat: [
      { sender: 'me', time: '14:10', text: '今、胸がどきどきしてる' },
      { sender: 'ai', text: '14時10分から記録します。強い胸の痛みや息苦しさはありますか？' },
      { sender: 'me', time: '14:12', text: 'それはない。座ってたら急になった' },
      { sender: 'ai', text: '14時10分、座っているときに急に、と記録しました。' },
      { sender: 'me', time: '14:25', text: '今は収まってきた' }
    ],
    pendingSymptom: null, // マルチターン症状聞き取り用 { symptom, time, situation }
    latestRecSummary: {
      date: '9月23日（水）',
      timeRange: '14:10〜14:25　胸のどきどき',
      detail: '座っているときに急に／痛み・息苦しさなし'
    },
    memoSymptoms: [
      { id: 1, date: '9/12 朝', text: '立ち上がったときにふらついた（1回）' },
      { id: 2, date: '9/23', text: '14:10〜14:25 胸のどきどき。座っているときに急に。痛み・息苦しさなし' },
      { id: 3, date: 'お薬', text: '夜の分の飲み忘れ 2回' }
    ],
    memoQuestions: [
      '夜の薬を飲み忘れやすい。飲む時間を相談したい'
    ],
    checklist: [
      { id: 'ins', title: '保険証', note: '', checked: true },
      { id: 'paper', title: '採血の検査結果の紙', note: '前回の診察後に「次は検査結果の紙を持ってきてと言われた」と話した内容から登録', checked: false },
      { id: 'notebook', title: 'お薬手帳', note: '前回の診察後に「次はお薬手帳を忘れずに」と話した内容から登録', checked: true },
      { id: 'card', title: '診察券', note: '', checked: true }
    ],
    savedPhotoNote: false,
    omakaseEnabled: true,
    omakaseAlways: true,
    timelineStep: 3, // 0:朝受付, 1:9:05到着, 2:9:25採血済, 3:10:05まもなく診察, 4:会計・お薬完了
    familyMessages: [
      { time: '18:05', text: '明日の内科、気をつけて行ってきてね！検査結果の紙とお薬手帳も忘れずにね。' }
    ]
  };
}

let state = loadState();

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return Object.assign(getDefaultState(), JSON.parse(raw));
    }
  } catch (e) {
    console.warn('localStorage load failed:', e);
  }
  return getDefaultState();
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    // ignore quota errors
  }
}

function resetDemoState() {
  stopAiSpeech();
  state = getDefaultState();
  saveState();
  dismissIncomingToast();
  closeCommonModal();
  closeDoctorLargeView();
  dismissFamToast();
  navigateTo('family-dash');
  navigateTo('home');
}

// ==================== AI音声読み上げ（TTS: Web Speech Synthesis 改良版） ====================
let availableVoices = [];

function updateAvailableVoices() {
  if ('speechSynthesis' in window) {
    availableVoices = window.speechSynthesis.getVoices();
  }
}

if ('speechSynthesis' in window) {
  updateAvailableVoices();
  window.speechSynthesis.onvoiceschanged = updateAvailableVoices;
}

function getBestJapaneseVoice() {
  if (!('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  const jpVoices = voices.filter(v => v.lang && (v.lang.includes('ja') || v.lang.includes('JP')));
  if (jpVoices.length === 0) return null;

  // ユーザーが明示的に選択した声がある場合
  if (state.ttsVoiceName) {
    const chosen = jpVoices.find(v => v.name === state.ttsVoiceName);
    if (chosen) return chosen;
  }

  // 音声の品質スコアリング（高音質なNatural/Neural/Online/Google音声を最優先、古いDesktop機械音声を排除）
  function scoreVoice(v) {
    const name = v.name.toLowerCase();
    let score = 0;
    if (name.includes('natural') || name.includes('neural') || name.includes('online')) score += 100;
    if (name.includes('nanami')) score += 60;
    if (name.includes('google')) score += 50;
    if (name.includes('keita') || name.includes('aoi') || name.includes('shiori')) score += 40;
    if (name.includes('kyoko') || name.includes('otoya') || name.includes('siri')) score += 30;
    if (name.includes('ayumi')) score += 10;
    // 古いSAPIデスクトップ音声（Haruka Desktopなど機械的な声）は減点
    if (name.includes('desktop')) score -= 50;
    if (name.includes('haruka') && !name.includes('natural') && !name.includes('online')) score -= 40;
    if (name.includes('ichiro') && !name.includes('natural') && !name.includes('online')) score -= 40;
    return score;
  }

  jpVoices.sort((a, b) => scoreVoice(b) - scoreVoice(a));
  return jpVoices[0];
}

function speakAiText(text, forceSpeak = false) {
  if (!state.ttsEnabled && !forceSpeak) return;

  // 1. VOICEVOX が有効な場合（デフォルト）
  if ((!state.voiceEngine || state.voiceEngine === 'voicevox') && typeof window.speakVoicevox === 'function') {
    setSpeakingIndicator(true);
    window.speakVoicevox(text, state.voicevoxSpeaker || 2, () => {
      setSpeakingIndicator(true);
    }, () => {
      setSpeakingIndicator(false);
    }).catch(err => {
      console.warn('VOICEVOX error, fallback to browser speech synthesis:', err);
      speakBrowserTts(text, forceSpeak);
    });
    return;
  }

  // 2. ブラウザ標準TTS
  speakBrowserTts(text, forceSpeak);
}

function speakBrowserTts(text, forceSpeak = false) {
  if (!('speechSynthesis' in window)) {
    setSpeakingIndicator(false);
    return;
  }
  if (!state.ttsEnabled && !forceSpeak) return;

  try {
    window.speechSynthesis.cancel();

    // 自然な発音・滑らかな抑揚のためのクリーンアップ
    let cleanText = String(text || '')
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

    if (!cleanText) return;

    const utter = new SpeechSynthesisUtterance(cleanText);
    utter.lang = 'ja-JP';
    utter.rate = state.ttsRate || 0.95; // 高齢者にも聞き取りやすい自然な速度
    utter.pitch = state.ttsPitch || 1.0;

    const jpVoice = getBestJapaneseVoice();
    if (jpVoice) utter.voice = jpVoice;

    utter.onstart = () => {
      setSpeakingIndicator(true);
    };
    utter.onend = () => {
      setSpeakingIndicator(false);
    };
    utter.onerror = () => {
      setSpeakingIndicator(false);
    };

    window.speechSynthesis.speak(utter);
  } catch (e) {
    console.warn('TTS error:', e);
    setSpeakingIndicator(false);
  }
}

function stopAiSpeech() {
  if (typeof window.stopVoicevox === 'function') {
    window.stopVoicevox();
  }
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  setSpeakingIndicator(false);
}

function setSpeakingIndicator(isSpeaking) {
  const medBar = document.getElementById('medSpeakingBar');
  const symBar = document.getElementById('symptomSpeakingBar');
  if (medBar) medBar.style.display = isSpeaking ? 'flex' : 'none';
  if (symBar) symBar.style.display = isSpeaking ? 'flex' : 'none';
}

function toggleTtsEnabled() {
  state.ttsEnabled = !state.ttsEnabled;
  if (!state.ttsEnabled) {
    stopAiSpeech();
  }
  saveState();
  renderTtsButtons();
}

function renderTtsButtons() {
  document.querySelectorAll('.tts-toggle-btn').forEach(btn => {
    btn.textContent = state.ttsEnabled ? '🔊 音声ON' : '🔇 音声OFF';
    btn.style.opacity = state.ttsEnabled ? '1' : '0.75';
  });
}

// 画面ごとのメタ情報
const SCREEN_META = {
  'home': {
    role: 'patient',
    theme: 'orange',
    tab: 'home',
    time: '9:12',
    batt: '100',
    tag: '全体・ホーム（新設フッター搭載）',
    title: '① ホーム画面（診察券）',
    desc: '今のホーム画面に<b>「AIコンシェルジュに話しかける」ボタン</b>と、服薬サポート・体調記録・持ち物・見守り家族を追加。どの画面からでも下部フッターで1タップ移動できます。'
  },
  'med': {
    role: 'patient',
    theme: 'ai',
    tab: 'ai',
    time: '20:02',
    batt: '76',
    tag: '軸2：AI通院コンシェルジュ（音声対話・服薬）',
    title: '②-A 服薬サポート（AI音声対応）',
    desc: '薬を飲む時間にAIが<b>声で呼びかけ</b>、「飲んだよ」と話すだけで記録できます。下の入力欄やマイクから自由に話しかけると、AIが声で返答します。'
  },
  'symptom': {
    role: 'patient',
    theme: 'ai',
    tab: 'ai',
    time: '14:26',
    batt: '58',
    tag: '軸2：AI通院コンシェルジュ（音声対話・症状・操作支援）',
    title: '②-B AIコンシェルジュ（症状記録＆操作案内）',
    desc: '体調や症状、アプリの操作（「明日の受付をして」「持ち物は何？」など）を自由に話しかけられます。AIが<b>声で返答して記録・案内</b>し、危険ワード検知時は119番等を最優先案内します。'
  },
  'memo': {
    role: 'patient',
    theme: 'ai',
    tab: 'ai',
    time: '10:02',
    batt: '64',
    tag: '軸2：AI通院コンシェルジュ（診察支援）',
    title: '③ 診察前のメモ',
    desc: '受診の数日前に、<b>症状の記録と飲み忘れ回数</b>をAIが「前回から気になったこと」として自動要約します。「診察で先生に見せる（大きな文字で表示）」で言い忘れを防ぎます。'
  },
  'checklist': {
    role: 'patient',
    theme: 'orange',
    tab: 'home',
    time: '18:00',
    batt: '71',
    tag: '軸1 × 軸2：持ち物リマインド＆家族連携',
    title: '⑥ 持ち物チェック',
    desc: '「次回持ってくるもの」を数日前・前日・当日の朝にお知らせ。<b>用意できていなければ見守り家族にも通知</b>が届き、本人と家族の二重で忘れ物を防ぎます。'
  },
  'omakase': {
    role: 'patient',
    theme: 'orange',
    tab: 'home',
    time: '15:00',
    batt: '58',
    tag: '軸3：おまかせ受付（操作の壁へ）',
    title: '④ おまかせ受付（予約情報）',
    desc: '前日の予約通知に<b>「明日の受付をしておく」</b>スイッチを設置。1タップで当日は自動で受付が済み、次回からも毎回自動にできるため、当日朝の操作忘れがなくなります。'
  },
  'patient-family': {
    role: 'patient',
    theme: 'fam',
    tab: 'fam',
    time: '10:06',
    batt: '98',
    tag: '軸1：見守り家族（本人スマホ・メッセージ確認）',
    title: '⑤-C 見守り家族（本人スマホ）',
    desc: '娘さんと見守り連携中です。<b>家族から届いたメッセージや見守り共有状況</b>をいつでも確認できます。音声読み上げやワンタップ返信も可能です。'
  },
  'family-invite': {
    role: 'family',
    theme: 'fam',
    tab: 'fam',
    time: '21:40',
    batt: '88',
    tag: '軸1：見守り家族（登録の壁へ）',
    title: '⑤-A 家族の登録（家族のスマホ）',
    desc: '本人が来院時に同意して発行した<b>6桁の招待コード</b>を入れるだけで登録完了。離れて暮らす家族も、病院の窓口に同席せず自分のスマホから登録できます。'
  },
  'family-dash': {
    role: 'family',
    theme: 'fam',
    tab: 'fam',
    time: '10:05',
    batt: '90',
    tag: '軸1：見守り家族（リアルタイム共有）',
    title: '⑤-B 見守り家族（家族のスマホ）',
    desc: '離れて暮らす家族が、<b>親の通院の進み具合・持ち物・今週の服薬状況</b>を自分のスマホで確認できます。ひとことメッセージ送信や受付の代行も可能です。'
  }
};

// 画面遷移
// 画面遷移：画面IDの role に応じて「左：本人スマホ」か「右：家族スマホ」だけを切り替える
function navigateTo(screenId, options = {}) {
  if (!SCREEN_META[screenId]) screenId = 'home';
  const meta = SCREEN_META[screenId];
  const isFamily = meta.role === 'family';

  if (isFamily) {
    state.familyScreen = screenId;
  } else {
    state.patientScreen = screenId;
  }
  saveState();

  // 対象のスマホ内のビューだけを切り替え（もう一方のスマホはそのまま）
  const screenRoot = document.getElementById(isFamily ? 'familyScreen' : 'patientScreen');
  screenRoot.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const targetView = document.getElementById(`view-${screenId}`);
  if (targetView) targetView.classList.add('active');

  if (isFamily) {
    document.getElementById('famStatusTime').textContent = meta.time;
    document.getElementById('famStatusBatt').textContent = meta.batt;
    document.getElementById('famTabDash').classList.toggle('active', screenId === 'family-dash');
    document.getElementById('famTabInvite').classList.toggle('active', screenId === 'family-invite');
  } else {
    const statusBar = document.getElementById('statusBar');
    statusBar.className = 'status' + (meta.theme === 'ai' ? ' ai' : meta.theme === 'fam' ? ' fam' : '');
    document.getElementById('statusTime').textContent = meta.time;
    document.getElementById('statusBatt').textContent = meta.batt;

    const tabBar = document.getElementById('bottomTabBar');
    tabBar.className = 'tabbar' + (meta.theme === 'ai' ? ' bar-ai' : meta.theme === 'fam' ? ' bar-fam' : '');
    document.getElementById('tabHome').classList.toggle('active', meta.tab === 'home');
    document.getElementById('tabAi').classList.toggle('active', meta.tab === 'ai');
    document.getElementById('tabFam').classList.toggle('active', meta.tab === 'fam');
  }

  // 画面ジャンプのセレクト
  const selectEl = document.getElementById('screenSelect');
  if (selectEl && selectEl.value !== screenId) {
    selectEl.value = screenId;
  }

  // 狭い画面（1台表示）のときは、操作したスマホ側を表示する
  if (!options.keepVisible) {
    setVisibleRole(meta.role);
  }

  // 中央ガイドパネル更新
  updateGuidePanel(meta);

  renderAll();
}

function updateGuidePanel(meta) {
  const guideTag = document.getElementById('guideAxisTag');
  if (!guideTag) return;
  const who = meta.role === 'family' ? '右：家族のスマホ ／ ' : '左：本人のスマホ ／ ';
  guideTag.textContent = who + meta.tag;
  guideTag.className = 'guide-tag' + (meta.theme === 'ai' ? ' ai' : meta.theme === 'fam' ? ' fam' : '');
  document.getElementById('guideTitle').textContent = meta.title;
  document.getElementById('guideDesc').innerHTML = meta.desc;
}

// 狭い画面用：どちらのスマホを表示するか
function setVisibleRole(role) {
  state.visibleRole = role;
  document.body.classList.toggle('show-patient', role === 'patient');
  document.body.classList.toggle('show-family', role === 'family');
  document.getElementById('modePatientBtn').classList.toggle('active', role === 'patient');
  document.getElementById('modeFamilyBtn').classList.toggle('active', role === 'family');
}

function switchRole(role) {
  setVisibleRole(role);
  saveState();
}

function switchHomeSubTab(tab) {
  state.homeSubTab = tab;
  saveState();
  document.getElementById('homeTabCard').classList.toggle('on', tab === 'card');
  document.getElementById('homeTabMsg').classList.toggle('on', tab === 'msg');
  document.getElementById('homeSubCard').style.display = tab === 'card' ? 'flex' : 'none';
  document.getElementById('homeSubMsg').style.display = tab === 'msg' ? 'flex' : 'none';
}

// ==================== 本人 ⇄ 家族 のスマホ間通知 ====================
let famToastTimer = null;

// 本人スマホでの出来事を、右の家族スマホに通知する
function notifyFamily(text, isDanger = false) {
  const nowStr = new Date().toTimeString().slice(0, 5);
  state.familyNotices.push({ time: nowStr, text, danger: isDanger });
  if (state.familyNotices.length > 8) state.familyNotices.shift();
  saveState();

  const toast = document.getElementById('famToast');
  const toastText = document.getElementById('famToastText');
  if (toast && toastText) {
    toastText.textContent = text;
    toast.classList.toggle('danger', isDanger);
    toast.style.display = 'block';
    clearTimeout(famToastTimer);
    famToastTimer = setTimeout(dismissFamToast, isDanger ? 12000 : 6000);
  }

  flashColumn('familyColumn');
  pulseSyncArrow('to-family');
  renderFamilyNotices();
}

function dismissFamToast() {
  const toast = document.getElementById('famToast');
  if (toast) toast.style.display = 'none';
}

function flashColumn(id) {
  const col = document.getElementById(id);
  if (!col) return;
  col.classList.remove('flash');
  void col.offsetWidth; // アニメーション再始動
  col.classList.add('flash');
}

function flashFamilyRow(id) {
  const row = document.getElementById(id);
  if (!row) return;
  row.classList.remove('updated');
  void row.offsetWidth;
  row.classList.add('updated');
}

function pulseSyncArrow(direction) {
  const el = document.getElementById('syncPulse');
  if (!el) return;
  el.classList.remove('pulse-to-family', 'pulse-to-patient');
  void el.offsetWidth;
  el.classList.add(direction === 'to-family' ? 'pulse-to-family' : 'pulse-to-patient');
  el.textContent = direction === 'to-family' ? '→' : '←';
  setTimeout(() => {
    el.classList.remove('pulse-to-family', 'pulse-to-patient');
    el.textContent = '⇄';
  }, 1400);
}

function renderFamilyNotices() {
  const listEl = document.getElementById('famNoticeList');
  if (!listEl) return;
  listEl.innerHTML = state.familyNotices.slice().reverse().slice(0, 5).map(n => `
    <div class="fam-notice-item ${n.danger ? 'danger' : ''}">
      <span class="t">${escapeHtml(n.time)}</span>${escapeHtml(n.text)}
    </div>
  `).join('');
}

// 全体再描画
function renderAll() {
  renderTtsButtons();
  renderAiStatusButton();
  renderHomeMessages();
  renderMedScreen();
  renderSymptomScreen();
  renderMemoScreen();
  renderChecklistScreen();
  renderOmakaseScreen();
  renderPatientFamilyScreen();
  renderFamilyInviteScreen();
  renderFamilyDashScreen();
  renderFamilyNotices();
  renderSyncSidePanel();
}

// AI設定ボタンの状態更新（接続中／未設定）
function renderAiStatusButton() {
  const btn = document.getElementById('aiConfigBtn');
  const label = document.getElementById('aiConfigLabel');
  if (!btn || !label) return;

  const hasKey = typeof window.getGeminiApiKey === 'function' && Boolean(window.getGeminiApiKey());
  if (hasKey) {
    btn.classList.add('active');
    label.textContent = '✨ Gemini接続中';
  } else {
    btn.classList.remove('active');
    label.textContent = '⚙️ AI設定';
  }
}

// AI吹き出しHTML生成（🔊読み上げボタン＋画面遷移アクションボタン付き）
function renderChatBubble(m, idx, listName) {
  if (m.thinking) {
    return `
      <div class="msg ai thinking">
        <span class="who"><span>AIコンシェルジュ</span></span>
        <div class="thinking-dots">✨ 返答を生成中<span>.</span><span>.</span><span>.</span></div>
      </div>
    `;
  }
  if (m.sender === 'ai') {
    const encodedText = encodeURIComponent(m.text || '');
    const actionBtn = m.actionScreen && m.actionLabel
      ? `<div><button type="button" class="ai-action-btn" onclick="navigateTo('${escapeHtml(m.actionScreen)}')">${escapeHtml(m.actionLabel)}</button></div>`
      : '';
    return `
      <div class="msg ai">
        <span class="who">
          <span>AIコンシェルジュ</span>
          <button type="button" class="speak-msg-btn" onclick="speakAiText(decodeURIComponent('${encodedText}'), true)" title="音声で読み上げる">🔊 聞く</button>
        </span>
        <div>${escapeHtml(m.text)}</div>
        ${actionBtn}
      </div>
    `;
  } else {
    return `
      <div class="msgrow">
        <span class="meta">${MIC_SVG}<span>${escapeHtml(m.time || '20:02')}</span></span>
        <div class="msg me">${escapeHtml(m.text)}</div>
      </div>
    `;
  }
}

// ① ホーム画面のメッセージ＆家族バナー描画
function renderHomeMessages() {
  const badge = document.getElementById('homeMsgBadge');
  const totalMsgs = 2 + state.familyMessages.length;
  if (badge) badge.textContent = totalMsgs;

  const banner = document.getElementById('homeFamilyBanner');
  const bannerText = document.getElementById('homeFamilyBannerText');
  if (state.familyMessages.length > 0) {
    const latest = state.familyMessages[state.familyMessages.length - 1];
    banner.style.display = 'flex';
    bannerText.textContent = `「${latest.text}」`;
  } else {
    banner.style.display = 'none';
  }

  const listEl = document.getElementById('homeMsgFamilyList');
  if (listEl) {
    listEl.innerHTML = state.familyMessages.slice().reverse().map(m => `
      <div class="card msg-item fam" style="margin-bottom:5px;" onclick="navigateTo('patient-family')">
        <div class="msg-item-head">
          <span class="pill p1">見守り家族（娘）</span>
          <span class="muted">${escapeHtml(m.time)}</span>
        </div>
        <h4>ひとことメッセージが届いています</h4>
        <div style="font-weight:700;color:var(--family);margin-top:2px;">「${escapeHtml(m.text)}」</div>
      </div>
    `).join('');
  }
}

// ==================== ② AIコンシェルジュ 対話エンジン ====================
const DANGER_KEYWORDS = ['強い痛み', '強く痛', '息苦し', 'くるしい', '意識', '動けない', '激しい胸', '胸が痛'];
const SYMPTOM_KEYWORDS = ['どきどき', 'ドキドキ', 'ふらつ', 'めまい', '立ちくらみ', '頭が痛', '頭痛', '胃が', 'お腹', '吐き気', 'しびれ', 'だるい', '熱', '咳', '息切れ', '眠れない', 'むくみ', '痛い', '調子が悪'];

function containsDangerKeyword(text) {
  return DANGER_KEYWORDS.some(k => text.includes(k));
}

function containsSymptomKeyword(text) {
  return SYMPTOM_KEYWORDS.some(k => text.includes(k));
}

// ユーザーの発話に対するAIコンシェルジュの返答生成＆状態連動（Gemini API ＋ ルールベースフォールバック）
async function processAiConversation(userText, mode) {
  const text = userText.trim();
  const nowStr = new Date().toTimeString().slice(0, 5);
  const chatList = mode === 'med' ? state.medChat : state.symptomChat;

  chatList.push({ sender: 'me', time: nowStr, text });
  saveState();
  renderAll();
  scrollToBottom(mode === 'med' ? 'medBody' : 'symptomBody');

  const alertCard = document.getElementById('dangerAlertCard');
  if (alertCard) alertCard.classList.remove('highlight-danger');

  // Gemini APIの利用可否を判定
  const hasGemini = typeof window.callGeminiApi === 'function' &&
                    (!window.CONFIG || window.CONFIG.USE_GEMINI) &&
                    typeof window.getGeminiApiKey === 'function' &&
                    Boolean(window.getGeminiApiKey());

  let geminiResult = null;

  if (hasGemini) {
    const thinkingMsg = { sender: 'ai', text: '考え中…', thinking: true };
    chatList.push(thinkingMsg);
    renderAll();
    scrollToBottom(mode === 'med' ? 'medBody' : 'symptomBody');

    try {
      const history = chatList.filter(c => !c.thinking);
      geminiResult = await window.callGeminiApi(text, history);
    } catch (err) {
      console.warn('Gemini API call failed, falling back to rule engine:', err);
    } finally {
      const thinkIdx = chatList.indexOf(thinkingMsg);
      if (thinkIdx !== -1) chatList.splice(thinkIdx, 1);
    }
  }

  let reply = '';
  let actionLabel = '';
  let actionScreen = '';
  let famNotice = '';        // 右の家族スマホへ送る通知
  let famNoticeDanger = false;
  let famRow = '';           // 家族スマホで光らせる行

  if (geminiResult) {
    // ==================== Gemini API 返答連動 ====================
    reply = geminiResult.reply;
    actionLabel = geminiResult.actionLabel || '';
    actionScreen = geminiResult.actionScreen || '';
    famNotice = geminiResult.familyNotify || '';
    famNoticeDanger = Boolean(geminiResult.danger);

    if (geminiResult.danger) {
      if (alertCard) alertCard.classList.add('highlight-danger');
      if (!famNotice) {
        famNotice = `⚠️ お父さんが「${text}」とAIに話しました。AIが病院・119番への連絡を案内しています。すぐに連絡を取ってください。`;
      }
    }

    if (geminiResult.action === 'take_med' || geminiResult.action === 'take_med_and_symptom') {
      state.nightMedTaken = true;
      famRow = 'famMedRow';
      if (!famNotice) {
        famNotice = '💊 お父さんが夜のお薬を飲みました。';
      }
    }

    if (geminiResult.action === 'omakase_guide' || text.includes('受付')) {
      state.omakaseEnabled = true;
    }

    if (geminiResult.symptomSummary) {
      const exists = state.memoSymptoms.some(s => s.text.includes(geminiResult.symptomSummary));
      if (!exists) {
        state.memoSymptoms.splice(1, 0, {
          id: Date.now(),
          date: '本日',
          text: `${geminiResult.symptomSummary}（AI対話から記録）`
        });
      }
      state.latestRecSummary = {
        date: '本日（AI記録）',
        timeRange: `${nowStr}　${geminiResult.symptomSummary}`,
        detail: 'AIコンシェルジュとの会話から自動要約'
      };
      if (!actionLabel) {
        actionLabel = '📝 診察前のメモを見る';
        actionScreen = 'memo';
      }
    }

    if (geminiResult.memoQuestion) {
      if (!state.memoQuestions.includes(geminiResult.memoQuestion)) {
        state.memoQuestions.push(geminiResult.memoQuestion);
      }
      if (!actionLabel) {
        actionLabel = '📝 診察前のメモを確認する';
        actionScreen = 'memo';
      }
    }
  } else {
    // ==================== ルールベース・フォールバック ====================
    // 1. 危険キーワード検知（最優先・ルールベース）
    if (containsDangerKeyword(text)) {
      reply = '強い胸の痛みや息苦しさがある場合は、記録より先にすぐ病院へ電話するか、119番へ連絡してください！下の赤いボタンからすぐに発信できます。';
      if (alertCard) alertCard.classList.add('highlight-danger');
      state.pendingSymptom = null;
      famNotice = `⚠️ お父さんが「${text}」とAIに話しました。AIが病院・119番への連絡を案内しています。すぐに連絡を取ってください。`;
      famNoticeDanger = true;
    }
  // 2. 服薬完了＋体調の同時発話（例：「飲んだよ。そういえば今朝、ちょっとふらついた。」）
  else if ((text.includes('飲んだ') || text.includes('のんだ') || text.includes('服用')) && containsSymptomKeyword(text)) {
    state.nightMedTaken = true;
    reply = '夜のお薬の服用と、体調の記録の両方を残しました。次の診察で先生に伝えられるよう「診察前のメモ」にまとめておきますね。';
    actionLabel = '📝 診察前のメモを見る';
    actionScreen = 'memo';
    famNotice = '💊 お父さんが夜のお薬を飲みました。体調の記録も追加されています（本人が共有を選択）。';
    famRow = 'famMedRow';

    const exists = state.memoSymptoms.some(s => s.text.includes(text));
    if (!exists) {
      state.memoSymptoms.splice(1, 0, {
        id: Date.now(),
        date: '本日',
        text: `${text}（服薬確認時の会話から記録）`
      });
    }
  }
  // 3. 服薬完了の発話（例：「飲んだよ」「夜の分飲んだ」）
  else if (text.includes('飲んだ') || text.includes('のんだ') || text.includes('飲みました')) {
    state.nightMedTaken = true;
    reply = '夜のお薬の服用を記録しました！今日のお薬はすべてバッチリですね。変わった体調などはありませんか？';
    famNotice = '💊 お父さんが夜のお薬を飲みました（今日の分はすべて服用済み）。';
    famRow = 'famMedRow';
  }
  // 4. 薬の飲み忘れ相談（例：「飲み忘れやすい」「飲み忘れた」）
  else if (text.includes('飲み忘れ') || text.includes('忘れる')) {
    reply = '夜のお薬が飲み忘れやすいのですね。次回の診察で先生に飲む時間帯を相談できるよう、「診察前のメモ」の質問リストに残しておきました。';
    if (!state.memoQuestions.some(q => q.includes('飲み忘れ'))) {
      state.memoQuestions.push('夜の薬を飲み忘れやすい。飲む時間を相談したい');
    }
    actionLabel = '📝 診察前のメモを確認する';
    actionScreen = 'memo';
  }
  // 5. おまかせ受付・予約操作サポート（例：「明日の受付をして」「受付お願い」）
  else if (text.includes('受付') || text.includes('おまかせ')) {
    state.omakaseEnabled = true;
    reply = '明日の「おまかせ受付」をオンに設定しました！当日の朝に自動で受付が完了し、ご家族にも通知が届きますのでご安心ください。';
    actionLabel = '📅 予約情報・おまかせ受付を見る';
    actionScreen = 'omakase';
    famNotice = '✅ お父さんが明日の受付を「おまかせ受付」に設定しました。当日の朝に自動で受付されます。';
  }
  // 6. 持ち物の確認（例：「明日の持ち物は何？」「何持っていけばいい？」）
  else if (text.includes('持ち物') || text.includes('持っていく') || text.includes('準備')) {
    const unchecked = state.checklist.filter(i => !i.checked).map(i => i.title);
    if (unchecked.length === 0) {
      reply = '明日の持ち物（保険証・採血の検査結果の紙・お薬手帳・診察券）は、すべて準備完了になっています！';
    } else {
      reply = `明日は内科の受診です。まだ「${unchecked.join('・')}」にチェックが入っていません。カバンに入れたら教えてくださいね。`;
    }
    actionLabel = '🎒 持ち物チェック画面を開く';
    actionScreen = 'checklist';
  }
  // 7. 診察前のメモ確認（例：「メモを見せて」「先生に何を話すんだっけ」）
  else if (text.includes('メモ') || text.includes('先生')) {
    reply = `現在、前回からの症状や服薬の記録が${state.memoSymptoms.length}件まとまっています。診察室で先生にそのまま見せられる大文字画面も開けますよ。`;
    actionLabel = '📝 診察前のメモを開く';
    actionScreen = 'memo';
  }
  // 8. 家族・見守りについて（例：「家族」「娘に連絡」）
  else if (text.includes('家族') || text.includes('見守り') || text.includes('娘')) {
    reply = '見守り家族には、おまかせ受付の状況や持ち物の準備状況が自動で共有されています。見守り家族の画面を確認しますか？';
    actionLabel = '👨‍👩‍👧 見守り家族画面を見る';
    actionScreen = 'family-dash';
  }
  // 9. 院内案内・フロアマップ・会計などの質問
  else if (text.includes('どこ') || text.includes('何階') || text.includes('採血') || text.includes('会計') || text.includes('場所')) {
    reply = '明日の流れをご案内しますね。まず1階の総合受付で保険証を確認し、次に1階の採血室へ進みます。そのあと2階の内科外来へお越しください。順番が近づいたら「まもなくコール」でお知らせします。';
  }
  // 10. マルチターン症状記録：状況の返答（「座ってたら急になった」「それはない」など）
  else if (state.pendingSymptom && (text.includes('座って') || text.includes('立って') || text.includes('歩いて') || text.includes('寝て') || text.includes('急') || text.includes('それはない') || text.includes('ない'))) {
    state.pendingSymptom.situation = text;
    reply = `${state.pendingSymptom.time}から、「${text}」という状況ですね。記録しました。今はおさまっていますか？おさまったら教えてくださいね。`;
  }
  // 11. マルチターン症状記録：おさまった報告（「今は収まってきた」「おさまった」「治った」など）
  else if (text.includes('収まって') || text.includes('おさまっ') || text.includes('落ち着いた') || text.includes('治った') || text.includes('大丈夫')) {
    const symName = state.pendingSymptom ? state.pendingSymptom.symptom : '胸のどきどき';
    const startTime = state.pendingSymptom ? state.pendingSymptom.time : '14:10';
    const sitText = state.pendingSymptom && state.pendingSymptom.situation
      ? state.pendingSymptom.situation
      : '座っているときに急に／痛み・息苦しさなし';

    state.latestRecSummary = {
      date: '本日（記録完了）',
      timeRange: `${startTime}〜${nowStr}　${symName}`,
      detail: `${sitText}`
    };

    const memoEntry = `${startTime}〜${nowStr} ${symName}（${sitText}）`;
    if (!state.memoSymptoms.some(s => s.text === memoEntry)) {
      state.memoSymptoms.push({
        id: Date.now(),
        date: '本日',
        text: memoEntry
      });
    }
    state.pendingSymptom = null;
    reply = `おさまってよかったです。「${startTime}〜${nowStr} ${symName}」として記録し、診察前のメモにも追加しました。`;
    actionLabel = '📝 診察前のメモを見る';
    actionScreen = 'memo';
    famNotice = `📝 お父さんの体調記録が追加されました：${startTime}〜${nowStr} ${symName}（現在はおさまっています）`;
  }
  // 12. 新しい症状の申告（「胸がどきどきしてる」「頭が痛い」「めまいがする」など）
  else if (containsSymptomKeyword(text)) {
    state.pendingSymptom = {
      symptom: text,
      time: nowStr,
      situation: ''
    };
    state.latestRecSummary = {
      date: '本日（記録中）',
      timeRange: `${nowStr}〜　${text}`,
      detail: '状況を聞き取り中'
    };
    reply = `${nowStr}から「${text}」ですね、記録します。強い胸の痛みや息苦しさはありますか？また、何をしていたときになりましたか？`;
  }
  // 13. あいさつ・その他の自由会話
  else if (text.includes('こんにちは') || text.includes('おはよう') || text.includes('こんばんは') || text.includes('ありがとう')) {
    reply = 'こんにちは、近大太郎さん！いつもそばにいるAIコンシェルジュです。お薬の記録や体調のメモ、明日の受付や持ち物の確認など、なんでも気軽にお話しくださいね。';
  } else {
    // 自由な発言も体調・相談メモとして記録できるように優しく応答
    state.memoSymptoms.push({
      id: Date.now(),
      date: '本日',
      text: `${nowStr} ${text}`
    });
    state.latestRecSummary = {
      date: '本日（会話記録）',
      timeRange: `${nowStr}　${text}`,
      detail: 'AIコンシェルジュとの会話から自動記録'
    };
    reply = `「${text}」ですね。${nowStr}の記録として診察前のメモに残しました。ほかにも気になることや、先生に聞いておきたいことはありますか？`;
    actionLabel = '📝 診察前のメモを見る';
    actionScreen = 'memo';
  }
  } // end of rule-based fallback else

  chatList.push({
    sender: 'ai',
    text: reply,
    actionLabel: actionLabel || undefined,
    actionScreen: actionScreen || undefined
  });

  saveState();
  renderAll();
  scrollToBottom(mode === 'med' ? 'medBody' : 'symptomBody');
  speakAiText(reply);

  if (famNotice) {
    notifyFamily(famNotice, famNoticeDanger);
    if (famRow) flashFamilyRow(famRow);
  }
}

// ②-A 服薬サポート描画・操作
function renderMedScreen() {
  const dot = document.getElementById('nightMedDot');
  const st = document.getElementById('nightMedStatus');
  const btn = document.getElementById('btnTakeNightMed');

  if (state.nightMedTaken) {
    dot.className = 'dot on';
    dot.innerHTML = `<svg width="9" height="7" viewBox="0 0 10 8"><path d="M1 4l3 3 5-6" stroke="#fff" stroke-width="2" fill="none"/></svg>`;
    st.className = 'st done';
    st.textContent = '飲んだ';
    btn.textContent = '記録済み（タップで戻す）';
  } else {
    dot.className = 'dot off';
    dot.innerHTML = '';
    st.className = 'st wait';
    st.textContent = '今の時間です';
    btn.textContent = '飲んだ';
  }

  const chatEl = document.getElementById('medChatList');
  chatEl.innerHTML = state.medChat.map((m, i) => renderChatBubble(m, i, 'med')).join('');
}

function markNightMedTaken(fromVoice) {
  if (!fromVoice && state.nightMedTaken) {
    state.nightMedTaken = false;
    saveState();
    renderAll();
    return;
  }
  processAiConversation('夜の薬を飲んだよ', 'med');
}

function triggerMedVoice(phrase) {
  processAiConversation(phrase, 'med');
}

function submitMedFreeChat() {
  const input = document.getElementById('medChatInput');
  if (!input) return;
  const val = input.value.trim();
  if (!val) return;
  input.value = '';
  processAiConversation(val, 'med');
}

function remindLaterMed() {
  const msg = 'わかりました。30分後にまたお薬のお声がけをしますね。';
  state.medChat.push({ sender: 'ai', text: msg });
  saveState();
  renderAll();
  scrollToBottom('medBody');
  speakAiText(msg);
}

// ②-B 症状記録＆自由対話
function renderSymptomScreen() {
  const chatEl = document.getElementById('symptomChatList');
  chatEl.innerHTML = state.symptomChat.map((m, i) => renderChatBubble(m, i, 'symptom')).join('');

  const recEl = document.getElementById('latestSymptomRec');
  if (recEl && state.latestRecSummary) {
    recEl.innerHTML = `<b>記録しました</b>　${escapeHtml(state.latestRecSummary.date)}<br>${escapeHtml(state.latestRecSummary.timeRange)}<br>${escapeHtml(state.latestRecSummary.detail)}`;
  }
}

function sendSymptomPreset(type) {
  if (type === 'doki') {
    state.pendingSymptom = { symptom: '胸のどきどき', time: '14:10', situation: '' };
    processAiConversation('今、胸がどきどきしてる', 'symptom');
  } else if (type === 'sit') {
    if (!state.pendingSymptom) {
      state.pendingSymptom = { symptom: '胸のどきどき', time: '14:10', situation: '' };
    }
    processAiConversation('それはない。座ってたら急になった', 'symptom');
  } else if (type === 'calm') {
    processAiConversation('今は収まってきた', 'symptom');
  } else if (type === 'danger') {
    processAiConversation('胸が強く痛んで息苦しい', 'symptom');
  }
}

function handleUserSymptomSpeech(text) {
  processAiConversation(text, 'symptom');
}

function submitSymptomFreeChat() {
  const input = document.getElementById('symptomChatInput');
  if (!input) return;
  const val = input.value.trim();
  if (!val) return;
  input.value = '';
  processAiConversation(val, 'symptom');
}

// ブラウザ音声認識（Web Speech API）＋フォールバックモーダル
let activeRecognitionMode = 'symptom';

function startVoiceRecognition(mode = 'symptom') {
  activeRecognitionMode = mode;
  stopAiSpeech();

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const micBtn = mode === 'med' ? document.getElementById('medMicBtn') : document.getElementById('micRecordBtn');
  const fullBtn = document.getElementById('micFullBtn');
  const label = document.getElementById('micRecordLabel');

  if (SpeechRecognition) {
    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'ja-JP';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      if (micBtn) micBtn.classList.add('recording');
      if (fullBtn) fullBtn.classList.add('recording');
      if (label) label.textContent = '聞いています…お話ください';

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (micBtn) micBtn.classList.remove('recording');
        if (fullBtn) fullBtn.classList.remove('recording');
        if (label) label.textContent = '声で話しかける';
        if (transcript) {
          processAiConversation(transcript, activeRecognitionMode);
        }
      };

      recognition.onerror = () => {
        if (micBtn) micBtn.classList.remove('recording');
        if (fullBtn) fullBtn.classList.remove('recording');
        if (label) label.textContent = '声で話しかける';
        openVoiceFallbackModal(activeRecognitionMode);
      };

      recognition.onend = () => {
        if (micBtn) micBtn.classList.remove('recording');
        if (fullBtn) fullBtn.classList.remove('recording');
        if (label) label.textContent = '声で話しかける';
      };

      recognition.start();
      return;
    } catch (e) {
      // Fallback below
    }
  }
  openVoiceFallbackModal(mode);
}

function openVoiceFallbackModal(mode = 'symptom') {
  activeRecognitionMode = mode;
  const html = `
    <h4 style="color:var(--ai);">🎤 AIコンシェルジュと会話する</h4>
    <p class="muted" style="margin-bottom:6px;">話したい内容を入力するか、下のフレーズを選ぶとAIが<b>音声付きで返答</b>します。</p>
    <input type="text" id="voiceModalInput" placeholder="例：薬飲んだよ／頭が痛い／明日の持ち物は？" style="width:100%;padding:6px;border:1px solid #ccc;border-radius:6px;font-size:10.5px;margin-bottom:6px;">
    <div style="display:flex;flex-direction:column;gap:4px;margin-bottom:8px;">
      <button type="button" class="chip-btn" onclick="document.getElementById('voiceModalInput').value='階段を上ったときに少し息切れがした'">「階段を上ったときに少し息切れがした」</button>
      <button type="button" class="chip-btn" onclick="document.getElementById('voiceModalInput').value='明日の受付をしておいて'">「明日の受付をしておいて」</button>
      <button type="button" class="chip-btn" onclick="document.getElementById('voiceModalInput').value='明日の持ち物は何だっけ？'">「明日の持ち物は何だっけ？」</button>
      <button type="button" class="chip-btn danger" onclick="document.getElementById('voiceModalInput').value='胸が強く痛んで息苦しい'">⚠️「胸が強く痛んで息苦しい」（危険検知テスト）</button>
    </div>
    <div style="display:flex;gap:6px;">
      <div class="btn out ai" style="flex:1;" onclick="closeCommonModal()">キャンセル</div>
      <div class="btn ai" style="flex:1;" onclick="submitVoiceModalInput()">話す（AIが返答）</div>
    </div>
  `;
  showCommonModal(html);
}

function submitVoiceModalInput() {
  const input = document.getElementById('voiceModalInput');
  const val = input ? input.value.trim() : '';
  closeCommonModal();
  if (val) {
    processAiConversation(val, activeRecognitionMode);
  }
}

function showEmergencyCall(targetName) {
  const html = `
    <h4 style="color:#C62828;">📞 緊急連絡の発信確認（デモ）</h4>
    <p style="margin-bottom:8px;line-height:1.5;">
      <b>${escapeHtml(targetName)}</b> へ電話を発信します。<br>
      <span class="muted">※AIは診断を行わず、強い痛み・息苦しさ等の危険キーワード検知時は記録より先に緊急連絡を案内します。</span>
    </p>
    <div class="btn" style="background:#E05252;color:#fff;" onclick="closeCommonModal()">閉じる</div>
  `;
  showCommonModal(html);
}

// ③ 診察前のメモ描画
function renderMemoScreen() {
  const symEl = document.getElementById('memoSymptomList');
  if (symEl) {
    symEl.innerHTML = state.memoSymptoms.map(item => `
      <div class="memo-li">
        <span class="d">${escapeHtml(item.date)}</span>
        <span style="flex:1;">${escapeHtml(item.text)}</span>
      </div>
    `).join('');
  }

  const qEl = document.getElementById('memoQuestionList');
  if (qEl) {
    qEl.innerHTML = state.memoQuestions.map((q, idx) => `
      <div style="padding:3px 0;border-bottom:1px solid #eee;display:flex;justify-content:space-between;align-items:center;gap:4px;">
        <span>・${escapeHtml(q)}</span>
        <button type="button" onclick="removeMemoQuestion(${idx})" style="border:none;background:none;color:#999;font-size:10px;cursor:pointer;" title="削除">×</button>
      </div>
    `).join('');
  }
}

function removeMemoQuestion(idx) {
  state.memoQuestions.splice(idx, 1);
  saveState();
  renderAll();
}

function openAddQuestionModal() {
  const html = `
    <h4 style="color:var(--ai);">＋ 先生に聞きたいことを追加</h4>
    <p class="muted" style="margin-bottom:6px;">診察時に聞き忘れないよう、話してメモに残せます（修正も可能）。</p>
    <input type="text" id="memoQInput" placeholder="先生に聞きたいことを入力" style="width:100%;padding:6px;border:1px solid #ccc;border-radius:6px;font-size:10.5px;margin-bottom:6px;">
    <div style="display:flex;flex-direction:column;gap:4px;margin-bottom:8px;">
      <button type="button" class="chip-btn" onclick="document.getElementById('memoQInput').value='朝に立ちくらみがすることがあるので相談したい'">🎤「朝に立ちくらみがすることがあるので相談したい」</button>
      <button type="button" class="chip-btn" onclick="document.getElementById('memoQInput').value='次回の採血結果がいつ出るか確認したい'">🎤「次回の採血結果がいつ出るか確認したい」</button>
    </div>
    <div style="display:flex;gap:6px;">
      <div class="btn out ai" style="flex:1;" onclick="closeCommonModal()">キャンセル</div>
      <div class="btn ai" style="flex:1;" onclick="submitMemoQuestion()">追加する</div>
    </div>
  `;
  showCommonModal(html);
}

function submitMemoQuestion() {
  const input = document.getElementById('memoQInput');
  const val = input ? input.value.trim() : '';
  closeCommonModal();
  if (val) {
    state.memoQuestions.push(val);
    saveState();
    renderAll();
    speakAiText(`「${val}」を先生に聞きたいことに追加しました。`);
  }
}

function openDoctorLargeView() {
  const symEl = document.getElementById('doctorLargeSymptoms');
  const qEl = document.getElementById('doctorLargeQuestions');

  symEl.innerHTML = state.memoSymptoms.map(s => `
    <div class="doctor-large-item">
      <div style="color:var(--ai);font-size:11px;">${escapeHtml(s.date)}</div>
      <div>${escapeHtml(s.text)}</div>
    </div>
  `).join('');

  qEl.innerHTML = state.memoQuestions.map(q => `
    <div class="doctor-large-item">${escapeHtml(q)}</div>
  `).join('');

  document.getElementById('doctorLargeModal').style.display = 'flex';
}

function closeDoctorLargeView() {
  const modal = document.getElementById('doctorLargeModal');
  if (modal) modal.style.display = 'none';
}

// ⑥ 持ち物チェック描画
function renderChecklistScreen() {
  const container = document.getElementById('checklistContainer');
  if (!container) return;

  container.innerHTML = state.checklist.map((item, idx) => `
    <div class="chk ${!item.checked ? 'warn' : ''}" onclick="toggleChecklistItem(${idx})">
      <div class="box ${item.checked ? 'on' : ''}">
        ${item.checked ? CHECK_SVG : ''}
      </div>
      <div>
        <div style="${!item.checked ? 'font-weight:700;' : ''}">${escapeHtml(item.title)}</div>
        ${item.note ? `<span class="muted">${escapeHtml(item.note)}</span>` : ''}
      </div>
    </div>
  `).join('') + (state.savedPhotoNote ? `
    <div style="margin-top:5px;padding:4px 6px;background:var(--orange-l);border-radius:5px;font-size:9px;color:var(--orange-d);font-weight:700;">
      📷 検査結果の紙の写真（スマホ保存済み）
    </div>
  ` : '');

  const unchecked = state.checklist.filter(i => !i.checked).map(i => i.title);
  const preview = document.getElementById('checklistFamilyPreview');
  if (preview) {
    if (unchecked.length === 0) {
      preview.innerHTML = `<b>見守り家族</b>　18:05<br>お父さんの明日の受診の持ち物は<b>すべて用意できました</b>（カバンに入れました）。`;
    } else {
      preview.innerHTML = `<b>見守り家族</b>　18:00<br>お父さんの明日の受診で、まだ用意できていない持ち物があります（<b>${escapeHtml(unchecked.join('・'))}</b>）。声かけをお願いします。`;
    }
  }
}

function toggleChecklistItem(idx) {
  state.checklist[idx].checked = !state.checklist[idx].checked;
  saveState();
  renderAll();
  const uncheckedCount = state.checklist.filter(i => !i.checked).length;
  if (uncheckedCount === 0) {
    notifyFamily('🎒 持ち物がすべて揃いました。');
  } else {
    notifyFamily(`🎒 持ち物チェックが更新されました（残り未準備 ${uncheckedCount}点）`);
  }
}

function markAllItemsReady() {
  state.checklist.forEach(item => { item.checked = true; });
  saveState();
  renderAll();
  notifyFamily('🎒 持ち物がすべて準備完了になりました。');
  speakAiText('明日の持ち物がすべて揃いましたね。ご家族にも用意できたことをお知らせしました。');
}

function openPhotoSaveModal() {
  state.savedPhotoNote = true;
  const paperItem = state.checklist.find(i => i.id === 'paper');
  if (paperItem) paperItem.checked = true;
  saveState();
  renderAll();
  notifyFamily('📷 採血の検査結果の紙を写真で保存しました。');

  const html = `
    <h4 style="color:var(--orange-d);">📷 検査結果の紙を写真で保存しました</h4>
    <p style="margin-bottom:8px;line-height:1.5;">
      当日もし紙が見当たらなくても、アプリ内に保存した写真データを診察室で先生にお見せできます。<br>
      <span class="muted">（「採血の検査結果の紙」をチェック済みに更新しました）</span>
    </p>
    <div class="btn pri" onclick="closeCommonModal()">OK</div>
  `;
  showCommonModal(html);
}

// ④ おまかせ受付描画
function renderOmakaseScreen() {
  const box = document.getElementById('omakaseBox');
  const toggle = document.getElementById('omakaseToggle');
  const alwaysBox = document.getElementById('omakaseAlwaysBox');
  const desc = document.getElementById('omakaseDesc');

  if (state.omakaseEnabled) {
    box.classList.remove('off-mode');
    toggle.classList.remove('off');
    desc.innerHTML = `当日は<b>自動で受付</b>します。家族にもお知らせします。`;
  } else {
    box.classList.add('off-mode');
    toggle.classList.add('off');
    desc.innerHTML = `<span class="muted">現在オフです。オンにすると当日の朝に自動で受付が完了します。</span>`;
  }

  if (state.omakaseAlways) {
    alwaysBox.className = 'box on';
    alwaysBox.innerHTML = `<svg width="8" height="6" viewBox="0 0 10 8"><path d="M1 4l3 3 5-6" stroke="#fff" stroke-width="2" fill="none"/></svg>`;
  } else {
    alwaysBox.className = 'box';
    alwaysBox.innerHTML = '';
  }
}

function toggleOmakase() {
  state.omakaseEnabled = !state.omakaseEnabled;
  saveState();
  renderAll();
  if (state.omakaseEnabled) {
    notifyFamily('🤖 明日の自動受付がオンになりました。');
    speakAiText('明日の自動受付をオンにしました。当日の朝に自動で受付いたします。');
  } else {
    notifyFamily('⚠️ 明日の自動受付がオフになりました。');
  }
}

function toggleOmakaseAlways() {
  state.omakaseAlways = !state.omakaseAlways;
  saveState();
  renderAll();
}

// ⑤-C 患者側：見守り家族画面（メッセージ・共有確認）
function renderPatientFamilyScreen() {
  const countEl = document.getElementById('patientFamMsgCount');
  const listEl = document.getElementById('patientFamMsgList');
  if (!listEl) return;

  const msgs = state.familyMessages || [];
  if (countEl) countEl.textContent = `${msgs.length}件`;

  if (msgs.length === 0) {
    listEl.innerHTML = `<div class="muted" style="text-align:center;padding:12px 0;font-size:9.5px;">まだメッセージはありません</div>`;
    return;
  }

  listEl.innerHTML = msgs.slice().reverse().map(m => {
    const encoded = encodeURIComponent(m.text || '');
    return `
      <div class="patient-msg-card">
        <div class="patient-msg-card-head">
          <span class="sender">👩 娘さん</span>
          <span class="time">${escapeHtml(m.time)}</span>
        </div>
        <div class="patient-msg-card-body">「${escapeHtml(m.text)}」</div>
        <div class="patient-msg-card-footer">
          <button type="button" class="patient-msg-speak-btn" onclick="speakAiText(decodeURIComponent('${encoded}'), true)" title="メッセージを音声で読み上げる">
            🔊 声で聞く
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function replyToFamily(text) {
  notifyFamily(`お父さんからお返事: 「${text}」`);
  speakAiText(`娘さんに「${text}」とお返事を送りました。`);
}

// ⑤-A 見守り家族 招待コード画面
function renderFamilyInviteScreen() {
  for (let i = 0; i < 6; i++) {
    const el = document.getElementById(`code${i}`);
    if (el) el.textContent = state.inviteCode[i] || '';
  }
}

function clearInviteCode() {
  state.inviteCode = ['', '', '', '', '', ''];
  saveState();
  renderFamilyInviteScreen();
}

function fillSampleInviteCode() {
  state.inviteCode = ['4', '7', '2', '9', '1', '5'];
  saveState();
  renderFamilyInviteScreen();
}

function completeFamilyRegistration() {
  if (state.inviteCode.join('').length < 6) {
    fillSampleInviteCode();
  }
  state.familyRegistered = true;
  saveState();
  navigateTo('family-dash');
}

// ⑤-B 見守り家族 ダッシュボード描画
function renderFamilyDashScreen() {
  const tlEl = document.getElementById('familyTimeline');
  if (tlEl) {
    const step0Label = state.omakaseEnabled
      ? '受付済み（おまかせ受付）'
      : `未受付 <button type="button" onclick="familyProxyCheckIn()" style="border:none;background:var(--family);color:#fff;font-size:8.5px;font-weight:700;padding:2px 6px;border-radius:8px;margin-left:4px;cursor:pointer;">代わりに受付する</button>`;

    const steps = [
      { tm: '朝', label: step0Label },
      { tm: '9:05', label: '病院に到着' },
      { tm: '9:25', label: '採血が終わりました' },
      { tm: '10:05', label: '内科　まもなく診察です' },
      { tm: '10:35', label: '会計・お薬（完了）' }
    ];

    tlEl.innerHTML = steps.map((s, idx) => {
      let cls = 'tli';
      if (idx === state.timelineStep) cls += ' now';
      else if (idx > state.timelineStep) cls += ' todo';

      const content = idx === state.timelineStep
        ? `<span class="st">${s.label}</span>`
        : s.label;

      return `<div class="${cls}"><span class="tm">${idx > state.timelineStep && idx === 4 ? '' : s.tm}</span>${content}</div>`;
    }).join('');
  }

  // 持ち物ステータス連動
  const famItems = document.getElementById('famItemsStatus');
  const unchecked = state.checklist.filter(i => !i.checked).map(i => i.title);
  if (famItems) {
    if (unchecked.length === 0) {
      famItems.textContent = 'すべて用意できました';
      famItems.style.color = 'var(--ai)';
    } else {
      famItems.textContent = `未準備あり（${unchecked[0]}）`;
      famItems.style.color = 'var(--family)';
    }
  }

  // 今週のお薬ステータス連動
  const famMed = document.getElementById('famMedStatus');
  if (famMed) {
    if (state.nightMedTaken) {
      famMed.textContent = '今日の分すべて服用済（今週の飲み忘れ 1回）';
      famMed.style.color = 'var(--ai)';
    } else {
      famMed.textContent = '飲み忘れ 1回（夜の薬：今の時間です）';
      famMed.style.color = 'var(--family)';
    }
  }
}

function familyProxyCheckIn() {
  state.omakaseEnabled = true;
  saveState();
  renderAll();
}

function advanceTimelineStep() {
  state.timelineStep = (state.timelineStep + 1) % 5;
  saveState();
  renderAll();
}

// 家族から「ひとことメッセージを送る」モーダル
function openSendFamilyMsgModal() {
  const html = `
    <h4 style="color:var(--family);">💌 お父さんへひとことメッセージを送る</h4>
    <p class="muted" style="margin-bottom:6px;">送ったメッセージは、お父さん（近大 太郎さん）のホーム画面にすぐ届きます。</p>
    <input type="text" id="famMsgInput" placeholder="ひとことメッセージを入力" style="width:100%;padding:6px;border:1px solid #ccc;border-radius:6px;font-size:10.5px;margin-bottom:6px;" value="気をつけて行ってきてね！検査結果の紙、持った？">
    <div style="display:flex;flex-direction:column;gap:4px;margin-bottom:8px;">
      <button type="button" class="chip-btn" style="border-color:var(--family);background:var(--family-l);color:var(--family);" onclick="document.getElementById('famMsgInput').value='気をつけて行ってきてね！検査結果の紙、持った？'">「気をつけて行ってきてね！検査結果の紙、持った？」</button>
      <button type="button" class="chip-btn" style="border-color:var(--family);background:var(--family-l);color:var(--family);" onclick="document.getElementById('famMsgInput').value='夜のお薬、飲む時間だよ〜！'">「夜のお薬、飲む時間だよ〜！」</button>
      <button type="button" class="chip-btn" style="border-color:var(--family);background:var(--family-l);color:var(--family);" onclick="document.getElementById('famMsgInput').value='もうすぐ診察だね。先生にメモ見せてね！'">「もうすぐ診察だね。先生にメモ見せてね！」</button>
    </div>
    <div style="display:flex;gap:6px;">
      <div class="btn out" style="flex:1;border-color:var(--family);color:var(--family);background:var(--family-l);" onclick="closeFamModal()">キャンセル</div>
      <div class="btn fam" style="flex:1;" onclick="sendFamilyMessage()">送る（本人画面で確認）</div>
    </div>
  `;
  showFamModal(html);
}

function sendFamilyMessage() {
  const input = document.getElementById('famMsgInput');
  const text = input ? input.value.trim() : '';
  closeFamModal();
  if (!text) return;

  const nowStr = new Date().toTimeString().slice(0, 5);
  state.familyMessages.push({ time: nowStr, text });
  saveState();
  renderAll();

  // 患者スマホにメッセージ通知トーストを表示＆左スマホを光らせる
  pulseSyncArrow('to-patient');
  flashColumn('patientColumn');
  const toast = document.getElementById('incomingToast');
  const toastText = document.getElementById('incomingToastText');
  if (toast && toastText) {
    toastText.textContent = `「${text}」`;
    toast.style.display = 'block';
  }
  flashFamilyRow('famRowMsg');
  speakAiText(`見守り家族からメッセージが届きました。「${text}」`);
}

function dismissIncomingToast() {
  const toast = document.getElementById('incomingToast');
  if (toast) toast.style.display = 'none';
}

function openPatientFamilyModal() {
  const html = `
    <h4 style="color:var(--family);">👨‍👩‍👧 見守り家族の設定・招待コード</h4>
    <p style="margin-bottom:6px;line-height:1.45;">
      来院時に窓口で同意して発行された招待コードです。家族のスマホで入力すると見守り連携ができます。
    </p>
    <div style="background:var(--family-l);border:1.5px solid var(--family);border-radius:8px;padding:8px;text-align:center;margin-bottom:8px;">
      <div class="muted">招待コード（有効期限：24時間・1回使い切り）</div>
      <div style="font-size:18px;font-weight:800;color:var(--family);letter-spacing:4px;margin:2px 0;">472915</div>
      <div class="muted">現在の連携状況：長女（登録済み）</div>
    </div>
    <div style="display:flex;flex-direction:column;gap:5px;">
      <div class="btn fam" onclick="closeCommonModal();navigateTo('patient-family');">💬 届いたメッセージ一覧を見る</div>
      <div class="btn out" style="border-color:var(--family);color:var(--family);background:var(--family-l);" onclick="closeCommonModal();navigateTo('family-dash');">👀 家族のスマホ（見守り画面）を見る</div>
      <div class="btn out" onclick="closeCommonModal()">閉じる</div>
    </div>
  `;
  showCommonModal(html);
}

// PC横のリアルタイム連動ステータスパネル更新
function renderSyncSidePanel() {
  const omakaseEl = document.getElementById('syncOmakase');
  const nightMedEl = document.getElementById('syncNightMed');
  const itemsEl = document.getElementById('syncItems');
  const memoCountEl = document.getElementById('syncMemoCount');

  if (omakaseEl) {
    omakaseEl.textContent = state.omakaseEnabled ? 'ON（自動受付済）' : 'OFF（未受付）';
    omakaseEl.style.color = state.omakaseEnabled ? 'var(--orange-d)' : '#94a3b8';
  }
  if (nightMedEl) {
    nightMedEl.textContent = state.nightMedTaken ? '服用済み（✅飲んだ）' : '未服用（今の時間です）';
    nightMedEl.style.color = state.nightMedTaken ? 'var(--ai)' : 'var(--orange-d)';
  }
  if (itemsEl) {
    const uncheckedCount = state.checklist.filter(i => !i.checked).length;
    itemsEl.textContent = uncheckedCount === 0 ? 'すべて準備完了（✅）' : `未完了（残り${uncheckedCount}点）`;
    itemsEl.style.color = uncheckedCount === 0 ? 'var(--ai)' : 'var(--family)';
  }
  if (memoCountEl) {
    memoCountEl.textContent = `${state.memoSymptoms.length}件（質問 ${state.memoQuestions.length}件）`;
  }
}

// 汎用モーダル表示
function showInfoModal(title, message) {
  const html = `
    <h4 style="color:var(--orange-d);">${escapeHtml(title)}</h4>
    <p style="margin-bottom:10px;line-height:1.55;">${escapeHtml(message)}</p>
    <div class="btn pri" onclick="closeCommonModal()">閉じる</div>
  `;
  showCommonModal(html);
}

function showCommonModal(innerHtml) {
  const modal = document.getElementById('commonModal');
  const content = document.getElementById('commonModalContent');
  if (modal && content) {
    content.innerHTML = innerHtml;
    modal.style.display = 'flex';
  }
}

function closeCommonModal() {
  const modal = document.getElementById('commonModal');
  if (modal) modal.style.display = 'none';
  const famModal = document.getElementById('famCommonModal');
  if (famModal) famModal.style.display = 'none';
}

// 家族スマホ用モーダル
function showFamModal(innerHtml) {
  const modal = document.getElementById('famCommonModal');
  const content = document.getElementById('famCommonModalContent');
  if (modal && content) {
    content.innerHTML = innerHtml;
    modal.style.display = 'flex';
  }
}

function closeFamModal() {
  const modal = document.getElementById('famCommonModal');
  if (modal) modal.style.display = 'none';
}

// ==================== Gemini API & 音声設定モーダル ====================
function openAiConfigModal() {
  const currentKey = typeof window.getGeminiApiKey === 'function' ? window.getGeminiApiKey() : '';
  const isConnected = Boolean(currentKey);

  const allVoices = ('speechSynthesis' in window) ? window.speechSynthesis.getVoices() : [];
  const jpVoices = allVoices.filter(v => v.lang && (v.lang.includes('ja') || v.lang.includes('JP')));
  const bestVoice = getBestJapaneseVoice();
  const currentVoiceName = state.ttsVoiceName || (bestVoice ? bestVoice.name : '');

  const voiceOptions = jpVoices.length > 0
    ? jpVoices.map(v => {
        const isRec = v.name.includes('Natural') || v.name.includes('Online') || v.name.includes('Google') || v.name.includes('Nanami');
        const badge = isRec ? ' ★推奨(自然)' : (v.name.includes('Desktop') ? '（機械的）' : '');
        const isSelected = v.name === currentVoiceName ? 'selected' : '';
        return `<option value="${escapeHtml(v.name)}" ${isSelected}>${escapeHtml(v.name)}${badge}</option>`;
      }).join('')
    : '<option value="">端末の標準日本語音声</option>';

  const html = `
    <h4 style="color:var(--ai);">✨ AIコンシェルジュ設定（Gemini ＆ 音声）</h4>
    <div class="ai-status-card ${isConnected ? 'active' : ''}" id="modalAiStatusCard">
      ${isConnected ? '🟢 Gemini 1.5 Flash 接続中（リアルタイム対話有効）' : '⚪ APIキー未設定（ルールベース応答で動作中）'}
    </div>
    <p class="muted" style="margin-bottom:8px;line-height:1.45;">
      Google AI Studioで取得したAPIキーを入力すると、AIコンシェルジュがリアルなGemini 1.5 Flashと連携します。<br>
      ※未設定時は自動的にルールベースの安心モックで動作します。
    </p>

    <div style="font-weight:700;font-size:10px;margin-bottom:3px;">Gemini APIキー:</div>
    <div class="ai-key-input-row">
      <input type="password" id="modalApiKeyInput" placeholder="AIzaSy... から始まるキーを入力" value="${escapeHtml(currentKey)}">
      <button type="button" class="btn out" style="padding:4px 8px;font-size:9.5px;" onclick="toggleApiKeyVisibility()">表示</button>
    </div>
    <div id="modalTestResult" style="font-size:9.5px;min-height:16px;margin-bottom:8px;font-weight:700;"></div>

    <div style="display:flex;gap:6px;margin-bottom:6px;">
      <button type="button" class="btn ai" style="flex:2;" onclick="saveAndTestModalApiKey()">接続テストして保存</button>
      <button type="button" class="btn out" style="flex:1;" onclick="clearModalApiKey()">消去</button>
    </div>

    <!-- 音声チューニングセクション（VOICEVOX ＆ ブラウザ音声） -->
    <div style="border-top:1.5px solid #e2e8f0;padding-top:8px;margin-top:8px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
        <h5 style="color:var(--ai);font-size:11.5px;margin:0;">🎙️ AI音声エンジン（VOICEVOX連携）</h5>
        <span style="background:#e0f2fe;color:#0369a1;font-size:8px;font-weight:700;padding:2px 6px;border-radius:10px;">超自然・人間肉声</span>
      </div>

      <div style="display:flex;gap:4px;margin-bottom:6px;">
        <button type="button" class="btn ${(!state.voiceEngine || state.voiceEngine === 'voicevox') ? 'ai' : 'out'}" style="flex:1;font-size:9.5px;padding:5px;" onclick="switchVoiceEngine('voicevox')">
          ✨ VOICEVOX（おすすめ）
        </button>
        <button type="button" class="btn ${state.voiceEngine === 'browser' ? 'ai' : 'out'}" style="flex:1;font-size:9.5px;padding:5px;" onclick="switchVoiceEngine('browser')">
          標準ブラウザ音声
        </button>
      </div>

      <div id="voicevoxConfigArea" style="display:${(!state.voiceEngine || state.voiceEngine === 'voicevox') ? 'block' : 'none'};">
        <div style="font-weight:700;font-size:9.5px;margin-bottom:2px;">キャラクター・話者を選択：</div>
        <select id="modalVoicevoxSpeaker" style="width:100%;padding:5px;font-size:9.5px;border:1px solid #cbd5e1;border-radius:6px;margin-bottom:5px;" onchange="updateVoicevoxSpeaker(this.value)">
          <option value="2" ${(state.voicevoxSpeaker === 2 || !state.voicevoxSpeaker) ? 'selected' : ''}>四国めたん（ノーマル・丁寧で安心感のある声） ★おすすめ</option>
          <option value="3" ${state.voicevoxSpeaker === 3 ? 'selected' : ''}>ずんだもん（ノーマル・元気で親しみやすい声）</option>
          <option value="47" ${state.voicevoxSpeaker === 47 ? 'selected' : ''}>ナースロボ＿タイプＴ（医療向けアンドロイド声）</option>
          <option value="0" ${state.voicevoxSpeaker === 0 ? 'selected' : ''}>四国めたん（あまあま・優しい声）</option>
        </select>
        <p class="muted" style="font-size:8px;line-height:1.35;margin-bottom:6px;">
          💡 クラウドWEB API連携により、完全無料でインストール不要！どこでも高品質なVOICEVOX肉声が再生されます。<br>
          ※PCにVOICEVOXアプリが起動している場合は自動で最速ローカル通信（遅延0.1秒）に切り替わります。
        </p>
      </div>

      <div id="browserTtsConfigArea" style="display:${state.voiceEngine === 'browser' ? 'block' : 'none'};">
        <div style="font-weight:700;font-size:9.5px;margin-bottom:2px;">ブラウザ音声モデル：</div>
        <select id="modalVoiceSelect" style="width:100%;padding:5px;font-size:9.5px;border:1px solid #cbd5e1;border-radius:6px;margin-bottom:6px;" onchange="updateModalTtsSettings()">
          ${voiceOptions}
        </select>
        <div style="display:flex;gap:8px;align-items:center;margin-bottom:6px;">
          <div style="flex:1;">
            <div style="font-size:9px;color:var(--sub);margin-bottom:1px;">話す速度: <span id="labelTtsRate">${(state.ttsRate || 0.95).toFixed(2)}x</span></div>
            <input type="range" id="inputTtsRate" min="0.8" max="1.2" step="0.05" value="${state.ttsRate || 0.95}" style="width:100%;" oninput="updateModalTtsSettings()">
          </div>
          <div style="flex:1;">
            <div style="font-size:9px;color:var(--sub);margin-bottom:1px;">声の高さ: <span id="labelTtsPitch">${(state.ttsPitch || 1.0).toFixed(2)}</span></div>
            <input type="range" id="inputTtsPitch" min="0.8" max="1.2" step="0.05" value="${state.ttsPitch || 1.0}" style="width:100%;" oninput="updateModalTtsSettings()">
          </div>
        </div>
      </div>

      <button type="button" class="btn out" id="btnTestVoice" style="width:100%;padding:6px;font-size:9.5px;margin-bottom:4px;" onclick="testSampleAiVoice()">
        🔊 この設定で声をテスト再生
      </button>
    </div>

    <div style="border-top:1px solid #e2e8f0;padding-top:6px;margin-top:6px;">
      <div class="muted" style="font-size:8.5px;line-height:1.4;">
        🔒 設定はブラウザ（localStorage）に安全に保存されます。<br>
        📁 プロンプトは <code>prompt.js</code> で自由に調整できます。
      </div>
    </div>
    <div style="margin-top:6px;">
      <div class="btn out" onclick="closeCommonModal()">閉じる</div>
    </div>
  `;
  showCommonModal(html);
}

function updateModalTtsSettings() {
  const sel = document.getElementById('modalVoiceSelect');
  const rateInput = document.getElementById('inputTtsRate');
  const pitchInput = document.getElementById('inputTtsPitch');
  const rateLabel = document.getElementById('labelTtsRate');
  const pitchLabel = document.getElementById('labelTtsPitch');

  if (sel) state.ttsVoiceName = sel.value;
  if (rateInput) {
    state.ttsRate = parseFloat(rateInput.value) || 0.95;
    if (rateLabel) rateLabel.textContent = `${state.ttsRate.toFixed(2)}x`;
  }
  if (pitchInput) {
    state.ttsPitch = parseFloat(pitchInput.value) || 1.0;
    if (pitchLabel) pitchLabel.textContent = state.ttsPitch.toFixed(2);
  }
  saveState();
}

function testSampleAiVoice() {
  updateModalTtsSettings();
  const btn = document.getElementById('btnTestVoice');
  if (btn) btn.textContent = '🔊 音声を生成・再生中…';
  speakAiText('こんにちは、近大太郎さん。いつもそばにいるAIコンシェルジュです。お薬の記録や体調の確認をお手伝いします。', true);
  setTimeout(() => {
    if (btn) btn.textContent = '🔊 この設定で声をテスト再生';
  }, 3000);
}

function switchVoiceEngine(engine) {
  state.voiceEngine = engine;
  saveState();
  openAiConfigModal();
}

function updateVoicevoxSpeaker(speakerId) {
  state.voicevoxSpeaker = parseInt(speakerId, 10) || 2;
  saveState();
}

function toggleApiKeyVisibility() {
  const input = document.getElementById('modalApiKeyInput');
  if (input) {
    input.type = input.type === 'password' ? 'text' : 'password';
  }
}

async function saveAndTestModalApiKey() {
  const input = document.getElementById('modalApiKeyInput');
  const resEl = document.getElementById('modalTestResult');
  const key = input ? input.value.trim() : '';

  if (!key) {
    if (resEl) {
      resEl.style.color = '#ef4444';
      resEl.textContent = 'APIキーを入力してください。';
    }
    return;
  }

  if (resEl) {
    resEl.style.color = 'var(--ai)';
    resEl.textContent = '接続テスト中…';
  }

  if (typeof window.testGeminiApiKey !== 'function') {
    if (resEl) {
      resEl.style.color = '#ef4444';
      resEl.textContent = 'エラー: gemini.js が読み込まれていません。';
    }
    return;
  }

  const result = await window.testGeminiApiKey(key);
  if (result.ok) {
    localStorage.setItem('well_be_gemini_api_key', key);
    if (resEl) {
      resEl.style.color = '#16a34a';
      resEl.textContent = '✅ 接続成功！Gemini APIキーを保存しました。';
    }
    const card = document.getElementById('modalAiStatusCard');
    if (card) {
      card.className = 'ai-status-card active';
      card.textContent = '🟢 Gemini 1.5 Flash 接続中（リアルタイム対話有効）';
    }
    renderAiStatusButton();
  } else {
    if (resEl) {
      resEl.style.color = '#ef4444';
      resEl.textContent = `❌ 接続失敗: ${result.error}`;
    }
  }
}

function clearModalApiKey() {
  localStorage.removeItem('well_be_gemini_api_key');
  const input = document.getElementById('modalApiKeyInput');
  const resEl = document.getElementById('modalTestResult');
  const card = document.getElementById('modalAiStatusCard');
  if (input) input.value = '';
  if (resEl) {
    resEl.style.color = '#64748b';
    resEl.textContent = 'APIキーを消去しました（モック応答モードになります）。';
  }
  if (card) {
    card.className = 'ai-status-card';
    card.textContent = '⚪ APIキー未設定（ルールベース応答で動作中）';
  }
  renderAiStatusButton();
}

function scrollToBottom(elementId) {
  const el = document.getElementById(elementId);
  if (el) {
    setTimeout(() => {
      el.scrollTop = el.scrollHeight;
    }, 50);
  }
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// 初期化＆ホイールスクロール補助
document.addEventListener('DOMContentLoaded', () => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.getVoices();
  }
  // 左：患者スマホ、右：家族スマホの初期画面をそれぞれ初期化
  navigateTo(state.familyScreen || 'family-dash', { keepVisible: true });
  navigateTo(state.patientScreen || 'home', { keepVisible: true });
  setVisibleRole(state.visibleRole || 'patient');

  document.querySelectorAll('.grid, .body').forEach(el => {
    el.addEventListener('wheel', e => {
      if (el.scrollHeight > el.clientHeight) {
        el.scrollTop += e.deltaY;
        e.preventDefault();
      }
    }, { passive: false });
  });
});
