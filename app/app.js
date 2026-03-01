// ======== API Key Management ========
function getApiKey() { return localStorage.getItem('gemini_api_key') || ''; }
function saveApiKey() {
  const key = document.getElementById('apiKeyInput').value.trim();
  if (!key) return;
  localStorage.setItem('gemini_api_key', key);
  closeModal();
}
function openModal() {
  document.getElementById('apiKeyModal').style.display = 'flex';
  document.getElementById('apiKeyInput').value = getApiKey();
}
function closeModal() { document.getElementById('apiKeyModal').style.display = 'none'; }

// ======== History Management ========
function getHistory() {
  try { return JSON.parse(localStorage.getItem('analysis_history') || '[]'); }
  catch { localStorage.removeItem('analysis_history'); return []; }
}
function saveToHistory(data) {
  const history = getHistory();
  history.unshift({
    id: Date.now(),
    title: data.title,
    date: new Date().toLocaleDateString('ja-JP'),
    url: data.url || '',
    fileName: data.fileName || '',
    type: data.type || 'youtube',
    report: data
  });
  if (history.length > 20) history.pop();
  try {
    localStorage.setItem('analysis_history', JSON.stringify(history));
  } catch {
    // QuotaExceeded: remove oldest entries and retry
    while (history.length > 1) {
      history.pop();
      try { localStorage.setItem('analysis_history', JSON.stringify(history)); break; }
      catch { continue; }
    }
  }
  renderHistory();
}
function deleteHistory(id) {
  const history = getHistory().filter(h => h.id !== id);
  localStorage.setItem('analysis_history', JSON.stringify(history));
  renderHistory();
}
function renderHistory() {
  const history = getHistory();
  const section = document.getElementById('historySection');
  const list = document.getElementById('historyList');
  if (history.length === 0) { section.style.display = 'none'; return; }
  section.style.display = 'block';
  list.innerHTML = history.map(h => {
    const icon = h.type === 'file' ? '&#128196;' : '&#127909;';
    const label = h.title || h.fileName || h.url;
    return `
    <div class="history-item" onclick="loadFromHistory(${h.id})">
      <span class="history-title">${icon} ${escHtml(label)}</span>
      <span class="history-date">${h.date}</span>
      <button class="history-delete" onclick="event.stopPropagation();deleteHistory(${h.id})" title="削除">&#10005;</button>
    </div>`;
  }).join('');
}

function loadFromHistory(id) {
  const item = getHistory().find(h => h.id === id);
  if (!item) return;
  showScreen('report');
  renderReport(item.report);
}

// ======== Screen Management ========
function showScreen(name) {
  document.getElementById('heroScreen').style.display = name === 'hero' ? 'block' : 'none';
  document.getElementById('loadingScreen').style.display = name === 'loading' ? 'block' : 'none';
  document.getElementById('reportScreen').style.display = name === 'report' ? 'block' : 'none';
  window.scrollTo(0, 0);
}
function goHome() { showScreen('hero'); renderHistory(); }

// ======== Tab Management ========
let activeTab = 'youtube';

function switchTab(tabName) {
  activeTab = tabName;
  document.getElementById('tabYoutube').className = 'tab-btn' + (tabName === 'youtube' ? ' active' : '');
  document.getElementById('tabUpload').className = 'tab-btn' + (tabName === 'upload' ? ' active' : '');
  document.getElementById('tabContentYoutube').style.display = tabName === 'youtube' ? 'block' : 'none';
  document.getElementById('tabContentUpload').style.display = tabName === 'upload' ? 'block' : 'none';
  document.getElementById('inputError').style.display = 'none';
}

// ======== Loading Steps ========
function setStep(n) {
  for (let i = 1; i <= 3; i++) {
    const el = document.getElementById('step' + i);
    el.className = 'step' + (i < n ? ' done' : i === n ? ' active' : '');
  }
}

function showLoadingMode(mode) {
  document.getElementById('youtubeSteps').style.display = mode === 'youtube' ? 'block' : 'none';
  document.getElementById('uploadSteps').style.display = mode === 'upload' ? 'block' : 'none';
  document.getElementById('progressContainer').style.display = 'none';
}

function showProgress(text, percent) {
  const container = document.getElementById('progressContainer');
  container.style.display = 'block';
  document.getElementById('progressFill').style.width = percent + '%';
  document.getElementById('progressText').textContent = text;
}

function hideProgress() {
  document.getElementById('progressContainer').style.display = 'none';
}

// ======== File Selection ========
let selectedFile = null;
const TWO_GB = 2 * 1024 * 1024 * 1024;

function formatFileSize(bytes) {
  if (bytes >= 1024 * 1024 * 1024) return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return bytes + ' B';
}

function onFileSelected(event) {
  const file = event.target.files[0];
  if (!file) return;
  selectedFile = file;

  document.getElementById('dropZone').style.display = 'none';
  document.getElementById('fileInfo').style.display = 'flex';
  document.getElementById('fileName').textContent = file.name;
  document.getElementById('fileSize').textContent = formatFileSize(file.size);
  document.getElementById('fileAnalyzeBtn').disabled = false;

  if (file.size > TWO_GB) {
    document.getElementById('compressNotice').style.display = 'block';
    document.getElementById('fileAnalyzeBtn').disabled = true;
  } else {
    document.getElementById('compressNotice').style.display = 'none';
  }
}

function clearFileSelection() {
  selectedFile = null;
  document.getElementById('fileInput').value = '';
  document.getElementById('dropZone').style.display = 'block';
  document.getElementById('fileInfo').style.display = 'none';
  document.getElementById('compressNotice').style.display = 'none';
  document.getElementById('fileAnalyzeBtn').disabled = true;
}

// ======== Drag & Drop ========
function initDropZone() {
  const dropZone = document.getElementById('dropZone');
  if (!dropZone) return;

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });
  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
  });
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file && (file.type.startsWith('video/') || /\.(mp4|mov|avi|webm|mkv)$/i.test(file.name))) {
      const input = document.getElementById('fileInput');
      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
      onFileSelected({ target: input });
    } else if (file) {
      const errEl = document.getElementById('inputError');
      errEl.textContent = '動画ファイルのみ対応しています（MP4, MOV, AVI, WebM, MKV）';
      errEl.style.display = 'block';
    }
  });
}

// ======== YouTube Info ========
async function fetchVideoInfo(url) {
  const videoId = extractVideoId(url);
  if (!videoId) throw new Error('無効なYouTube URLです');
  const oembed = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
  if (!oembed.ok) throw new Error('動画情報を取得できませんでした');
  const data = await oembed.json();
  return { videoId, title: data.title, channel: data.author_name, url };
}

function extractVideoId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/
  ];
  for (const p of patterns) { const m = url.match(p); if (m) return m[1]; }
  return null;
}

// ======== Gemini API (YouTube URL) ========
async function analyzeWithGemini(videoInfo) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('Gemini APIキーが設定されていません。右上の⚙️ボタンから設定してください。');

  const prompt = buildPrompt(videoInfo);
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 8192, responseMimeType: 'application/json' }
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'Gemini APIエラー');
  }

  const result = await res.json();
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('AIからの応答が空です');
  return parseGeminiJson(text);
}

function parseGeminiJson(text) {
  const cleaned = text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error('AIの応答をJSONとして解析できませんでした。再度お試しください。');
  }
}

function buildPrompt(info) {
  return `あなたはトップYouTuberの顧問も務める「動画戦略コンサルタント」です。
以下のYouTube動画情報を分析し、「この動画と同じようなヒット動画を作るための設計図」をJSON形式で出力してください。

## 動画情報
- タイトル: ${info.title}
- チャンネル: ${info.channel}
- URL: ${info.url}

${getJsonSchemaPrompt()}

注意事項:
- key_pointsは3〜5個
- power_wordsは3〜5個
- timelineは3〜6個
- template.sectionsは3〜5個
- transfersは3〜4個
- strengths, improvementsはそれぞれ3〜4個
- 提供された情報から読み取れない部分は、一般的なYouTubeの傾向に基づき論理的に推測してください
- 全ての値は日本語で記入してください`;
}

function getJsonSchemaPrompt() {
  return `## 出力JSON構造
以下のJSON構造で出力してください。全ての値は日本語で記入してください。

{
  "title": "動画タイトル",
  "channel": "チャンネル名",
  "url": "動画URL",
  "info_source": "情報ソースの説明（例：⚠️ タイトル・チャンネル名のみ）",
  "summary": {
    "overview": "動画の概要（1行で）",
    "key_points": [
      {"title": "ポイントのタイトル", "description": "詳細説明"}
    ],
    "conclusion": "結論"
  },
  "strategy": {
    "target": {
      "age_job": "年代・職業",
      "attributes": "属性・背景",
      "pain_points": "潜在的な悩み/欲求"
    },
    "power_words": [
      {"word": "パワーワード", "type": "訴求タイプ", "effect": "効果", "color": "amber|blue|emerald|violet|rose"}
    ],
    "traffic": [
      {"label": "経路名", "stars": 4, "description": "説明"}
    ],
    "differentiation": ["差別化ポイント1", "差別化ポイント2"]
  },
  "structure": {
    "pattern": "構成パターン名",
    "pattern_description": "構成パターンの説明",
    "timeline": [
      {"time": "0:00-1:30", "title": "セクション名", "description": "内容", "percent": 7}
    ],
    "hook": {"method": "フック手法の説明", "retention": "離脱防止の工夫"},
    "tempo": {
      "density": "情報密度の評価",
      "speed": "進行スピードの評価",
      "balance": "バランスの評価"
    }
  },
  "template": {
    "name": "テンプレート名",
    "sections": [
      {"time": "0:00-1:30", "title": "導入部", "percent": 7, "method": "手法の説明", "effect": "効果の説明"}
    ],
    "transfers": [
      {"theme": "転用テーマ", "method": "転用方法の説明"}
    ]
  },
  "evaluation": {
    "strengths": [
      {"title": "強みのタイトル", "description": "説明"}
    ],
    "improvements": [
      {"title": "改善点のタイトル", "description": "説明"}
    ]
  }
}`;
}

// ======== FFmpeg Compression ========
let ffmpegInstance = null;
let ffmpegLoaded = false;

function canUseFFmpeg() {
  return typeof SharedArrayBuffer !== 'undefined';
}

async function loadFFmpeg(onStatus) {
  if (ffmpegLoaded && ffmpegInstance) return ffmpegInstance;

  if (onStatus) onStatus('FFmpegモジュールを読み込み中...');
  const { FFmpeg } = await import('@ffmpeg/ffmpeg');
  const { toBlobURL } = await import('@ffmpeg/util');

  ffmpegInstance = new FFmpeg();

  const coreBaseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';

  if (onStatus) onStatus('Worker.jsを取得中...');
  const classWorkerURL = await toBlobURL(
    'https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.15/dist/esm/worker.js',
    'text/javascript'
  );

  if (onStatus) onStatus('FFmpeg Core (.js) を取得中...');
  const coreURL = await toBlobURL(`${coreBaseURL}/ffmpeg-core.js`, 'text/javascript');

  if (onStatus) onStatus('FFmpeg Core (.wasm, 約30MB) を取得中...');
  const wasmURL = await toBlobURL(`${coreBaseURL}/ffmpeg-core.wasm`, 'application/wasm');

  if (onStatus) onStatus('FFmpegを初期化中...');
  await ffmpegInstance.load({ coreURL, wasmURL, classWorkerURL });

  ffmpegLoaded = true;
  return ffmpegInstance;
}

async function compressVideo(file, onProgress, onStatus) {
  const ffmpeg = await loadFFmpeg();
  const { fetchFile } = await import('@ffmpeg/util');

  const progressHandler = ({ progress }) => {
    const pct = Math.round(progress * 100);
    if (onProgress) onProgress(pct);
  };
  ffmpeg.on('progress', progressHandler);

  const inputName = 'input' + getExtension(file.name);
  const outputName = 'output.mp4';

  try {
    if (onStatus) onStatus(`動画ファイルを読み込み中 (${formatFileSize(file.size)})... しばらくお待ちください`);
    await ffmpeg.writeFile(inputName, await fetchFile(file));

    if (onStatus) onStatus('動画を圧縮中 (720p, CRF 28)... これには数分かかることがあります');
    await ffmpeg.exec([
      '-i', inputName,
      '-vf', 'scale=-2:720',
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '28',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-movflags', '+faststart',
      outputName
    ]);

    const data = await ffmpeg.readFile(outputName);
    const blob = new Blob([data.buffer], { type: 'video/mp4' });

    await ffmpeg.deleteFile(inputName);
    await ffmpeg.deleteFile(outputName);

    return blob;
  } finally {
    ffmpeg.off('progress', progressHandler);
  }
}

function getExtension(filename) {
  const dot = filename.lastIndexOf('.');
  return dot >= 0 ? filename.substring(dot) : '.mp4';
}

// ======== Gemini File API Upload ========
async function uploadToGemini(blob, fileName, mimeType, onProgress) {
  const apiKey = getApiKey();

  // Step 1: Initiate resumable upload
  const initRes = await fetch(`https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Upload-Protocol': 'resumable',
      'X-Goog-Upload-Command': 'start',
      'X-Goog-Upload-Header-Content-Length': blob.size.toString(),
      'X-Goog-Upload-Header-Content-Type': mimeType,
    },
    body: JSON.stringify({
      file: { displayName: fileName }
    })
  });

  if (!initRes.ok) {
    const err = await initRes.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'アップロードの開始に失敗しました');
  }

  const uploadUrl = initRes.headers.get('X-Goog-Upload-URL');
  if (!uploadUrl) throw new Error('アップロードURLを取得できませんでした');

  // Step 2: Upload file bytes using XMLHttpRequest for progress
  const fileData = await uploadFileBytes(uploadUrl, blob, onProgress);
  return fileData;
}

function uploadFileBytes(uploadUrl, blob, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('X-Goog-Upload-Offset', '0');
    xhr.setRequestHeader('X-Goog-Upload-Command', 'upload, finalize');
    xhr.setRequestHeader('Content-Type', blob.type || 'video/mp4');

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const result = JSON.parse(xhr.responseText);
          resolve(result.file || result);
        } catch {
          reject(new Error('アップロードのレスポンス解析に失敗しました'));
        }
      } else {
        reject(new Error('アップロードに失敗しました: ' + xhr.status));
      }
    };

    xhr.onerror = () => reject(new Error('ネットワークエラー: アップロードに失敗しました'));
    xhr.send(blob);
  });
}

// ======== Poll File Processing State ========
async function pollFileState(fileName) {
  const apiKey = getApiKey();
  const maxRetries = 120; // 10 minutes at 5s intervals

  for (let i = 0; i < maxRetries; i++) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${apiKey}`);
    if (!res.ok) throw new Error('ファイル状態の確認に失敗しました');

    const fileData = await res.json();

    if (fileData.state === 'ACTIVE') return fileData;
    if (fileData.state === 'FAILED') throw new Error('Geminiでの動画処理に失敗しました');

    await new Promise(r => setTimeout(r, 5000));
  }

  throw new Error('動画処理がタイムアウトしました（10分超過）');
}

// ======== Video Analysis with Gemini ========
async function analyzeVideoWithGemini(fileUri, mimeType, fileName) {
  const apiKey = getApiKey();

  const prompt = buildVideoPrompt(fileName);
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { file_data: { mime_type: mimeType, file_uri: fileUri } },
          { text: prompt }
        ]
      }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 8192, responseMimeType: 'application/json' }
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'Gemini APIエラー');
  }

  const result = await res.json();
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('AIからの応答が空です');
  return parseGeminiJson(text);
}

function buildVideoPrompt(fileName) {
  return `あなたはトップYouTuberの顧問も務める「動画戦略コンサルタント」です。
アップロードされた動画を詳しく視聴・分析し、「この動画と同じようなヒット動画を作るための設計図」をJSON形式で出力してください。

## 分析対象
- ファイル名: ${fileName}
- この動画の映像・音声・テロップ・編集を徹底的に分析してください

## 分析ポイント
- 映像: カメラアングル、カット割り、テロップ・テキストオーバーレイ、B-roll、サムネイル戦略
- 音声: 話し方のトーン・スピード、BGM、効果音、間の取り方
- 編集: カットのテンポ、エフェクト、トランジション
- 構成: オープニング〜エンディングの流れ、フック、視聴維持の工夫
- 内容: テーマ、メッセージ、ターゲット、訴求ポイント

${getJsonSchemaPrompt()}

注意事項:
- key_pointsは3〜5個
- power_wordsは3〜5個
- timelineは3〜6個（実際の動画のタイムスタンプを使ってください）
- template.sectionsは3〜5個
- transfersは3〜4個
- strengths, improvementsはそれぞれ3〜4個
- info_sourceには「動画ファイル直接分析（映像・音声）」と記入してください
- titleには動画の内容から推測されるタイトルを、channelにはファイル名を記入してください
- urlは空文字にしてください
- 全ての値は日本語で記入してください`;
}

// ======== Main Analysis Flow (YouTube URL) ========
let isAnalyzing = false;

async function startAnalysis() {
  if (isAnalyzing) return;
  const url = document.getElementById('urlInput').value.trim();
  const errEl = document.getElementById('inputError');
  errEl.style.display = 'none';

  if (!url) { errEl.textContent = 'URLを入力してください'; errEl.style.display = 'block'; return; }
  if (!getApiKey()) { errEl.textContent = 'まずAPIキーを設定してください（右上の⚙️）'; errEl.style.display = 'block'; return; }

  isAnalyzing = true;
  document.getElementById('analyzeBtn').disabled = true;
  showScreen('loading');
  showLoadingMode('youtube');
  try {
    setStep(1);
    const videoInfo = await fetchVideoInfo(url);

    setStep(2);
    const analysis = await analyzeWithGemini(videoInfo);

    setStep(3);
    await new Promise(r => setTimeout(r, 500));

    const reportData = { ...analysis, title: analysis.title || videoInfo.title, channel: analysis.channel || videoInfo.channel, url, type: 'youtube' };
    saveToHistory(reportData);
    showScreen('report');
    renderReport(reportData);
  } catch (e) {
    showScreen('hero');
    errEl.textContent = e.message;
    errEl.style.display = 'block';
  } finally {
    isAnalyzing = false;
    document.getElementById('analyzeBtn').disabled = false;
  }
}

// ======== File Upload Analysis Flow ========
async function startFileAnalysis() {
  if (isAnalyzing) return;
  const errEl = document.getElementById('inputError');
  errEl.style.display = 'none';

  if (!selectedFile) { errEl.textContent = 'ファイルを選択してください'; errEl.style.display = 'block'; return; }
  if (!getApiKey()) { errEl.textContent = 'まずAPIキーを設定してください（右上の⚙️）'; errEl.style.display = 'block'; return; }

  // Block files over 2GB — Gemini File API limit
  if (selectedFile.size > TWO_GB) {
    errEl.textContent = `ファイルサイズが2GBを超えています (${formatFileSize(selectedFile.size)})。Gemini File APIの上限は2GBです。外部ツール（HandBrake等）で圧縮してから再度お試しください。`;
    errEl.style.display = 'block';
    return;
  }

  isAnalyzing = true;
  document.getElementById('fileAnalyzeBtn').disabled = true;

  showScreen('loading');
  showLoadingMode('upload');

  // Hide compression step (no longer used)
  document.getElementById('ustep2').style.display = 'none';

  // Steps: ustep1(Prepare) → ustep3(Upload) → ustep4(Process) → ustep5(Analyze)
  const stepMap = [1, 3, 4, 5];

  function setCurrentStep(logicalStep) {
    for (let si = 0; si < stepMap.length; si++) {
      const el = document.getElementById('ustep' + stepMap[si]);
      if (!el) continue;
      if (si < logicalStep) el.className = 'step done';
      else if (si === logicalStep) el.className = 'step active';
      else el.className = 'step';
    }
  }

  try {
    let uploadBlob = selectedFile;
    let mimeType = selectedFile.type || 'video/mp4';
    let currentLogicalStep = 0;

    // Step: Prepare video
    setCurrentStep(currentLogicalStep);

    // Step: Upload to Gemini
    currentLogicalStep++;
    setCurrentStep(currentLogicalStep);
    showProgress('アップロード中... 0%', 0);

    const uploadResult = await uploadToGemini(uploadBlob, selectedFile.name, mimeType, (pct) => {
      showProgress(`アップロード中... ${pct}%`, pct);
    });
    hideProgress();

    const geminiFileName = uploadResult?.name;
    const fileUri = uploadResult?.uri;
    if (!geminiFileName || !fileUri) {
      throw new Error('アップロードは成功しましたが、ファイル情報の取得に失敗しました。再度お試しください。');
    }

    // Step: Wait for processing
    currentLogicalStep++;
    setCurrentStep(currentLogicalStep);

    const activeFile = await pollFileState(geminiFileName);

    // Step: Analyze
    currentLogicalStep++;
    setCurrentStep(currentLogicalStep);

    const analysis = await analyzeVideoWithGemini(activeFile.uri, mimeType, selectedFile.name);

    const reportData = {
      ...analysis,
      title: analysis.title || selectedFile.name,
      channel: analysis.channel || selectedFile.name,
      url: '',
      fileName: selectedFile.name,
      type: 'file'
    };
    saveToHistory(reportData);
    showScreen('report');
    renderReport(reportData);

  } catch (e) {
    showScreen('hero');
    switchTab('upload');
    errEl.textContent = e.message;
    errEl.style.display = 'block';
  } finally {
    isAnalyzing = false;
    document.getElementById('fileAnalyzeBtn').disabled = !selectedFile;
  }
}

// ======== Render Report ========
function escHtml(s) { if (s == null) return ''; const d = document.createElement('div'); d.textContent = String(s); return d.innerHTML; }
function safeUrl(url) { return /^https?:\/\//i.test(url) ? escHtml(url) : '#'; }

function stars(n, max = 5) {
  return Array.from({ length: max }, (_, i) => `<div class="star${i < n ? ' filled' : ''}"></div>`).join('');
}

let reportObserver = null;
const pwColors = { amber: 'background:rgba(251,191,36,0.15);color:#fbbf24;border:1px solid rgba(251,191,36,0.3)', blue: 'background:rgba(96,165,250,0.15);color:#60a5fa;border:1px solid rgba(96,165,250,0.3)', emerald: 'background:rgba(52,211,153,0.15);color:#34d399;border:1px solid rgba(52,211,153,0.3)', violet: 'background:rgba(167,139,250,0.15);color:#a78bfa;border:1px solid rgba(167,139,250,0.3)', rose: 'background:rgba(251,113,133,0.15);color:#fb7185;border:1px solid rgba(251,113,133,0.3)' };

function renderReport(d) {
  const el = document.getElementById('reportContent');
  const urlSection = d.url
    ? `<div class="meta-item"><div class="meta-label">URL</div><div class="meta-value" style="font-size:12px;word-break:break-all;"><a href="${safeUrl(d.url)}" target="_blank" rel="noopener noreferrer" style="color:var(--accent-indigo);text-decoration:none;">動画を見る ↗</a></div></div>`
    : (d.fileName ? `<div class="meta-item"><div class="meta-label">ファイル</div><div class="meta-value" style="font-size:13px;word-break:break-all;">${escHtml(d.fileName)}</div></div>` : '');

  const footerSource = d.url
    ? `<p>分析対象: <a href="${safeUrl(d.url)}" target="_blank" rel="noopener noreferrer">${escHtml(d.url)}</a></p>`
    : (d.fileName ? `<p>分析対象: ${escHtml(d.fileName)}</p>` : '');

  el.innerHTML = `
    <!-- Hero -->
    <div class="report-hero">
      <div class="report-badge">動画戦略分析レポート</div>
      <div class="report-title">${escHtml(d.title)}</div>
      <p class="report-subtitle">${escHtml(d.summary?.overview || '')}</p>
      <div class="report-channel">チャンネル：<strong>${escHtml(d.channel)}</strong></div>
    </div>
    <div class="meta-grid">
      <div class="meta-item"><div class="meta-label">情報ソース</div><div class="meta-value source">${escHtml(d.info_source || '⚠️ タイトルのみ')}</div></div>
      ${urlSection}
    </div>

    <!-- 1: Summary -->
    <section class="section">
      <div class="section-header"><div class="section-number">1</div><h2 class="section-title">動画の内容要約</h2></div>
      <div class="card">
        <div class="card-title">主要ポイント</div>
        <ol>${(d.summary?.key_points || []).map(p => `<li><strong>${escHtml(p.title)}</strong> — ${escHtml(p.description)}</li>`).join('')}</ol>
      </div>
      <div class="highlight-box"><p><strong>結論：</strong> ${escHtml(d.summary?.conclusion || '')}</p></div>
    </section>

    <!-- 2: Strategy -->
    <section class="section">
      <div class="section-header"><div class="section-number">2</div><h2 class="section-title">戦略・ペルソナ分析</h2></div>
      <div class="card">
        <div class="card-title">ターゲット層の詳細分析</div>
        <div class="table-wrapper"><table><thead><tr><th>分析軸</th><th>内容</th></tr></thead><tbody>
          <tr><td><strong>年代・職業</strong></td><td>${escHtml(d.strategy?.target?.age_job || '')}</td></tr>
          <tr><td><strong>属性・背景</strong></td><td>${escHtml(d.strategy?.target?.attributes || '')}</td></tr>
          <tr><td><strong>潜在的な悩み/欲求</strong></td><td>${escHtml(d.strategy?.target?.pain_points || '')}</td></tr>
        </tbody></table></div>
      </div>
      <div class="card">
        <div class="card-title">パワーワード抽出</div>
        <div style="margin-bottom:16px">${(d.strategy?.power_words || []).map(w => `<span class="pw" style="${pwColors[w.color] || pwColors.blue}">${escHtml(w.word)}</span>`).join('')}</div>
        <div class="table-wrapper"><table><thead><tr><th>ワード</th><th>訴求タイプ</th><th>効果</th></tr></thead><tbody>
          ${(d.strategy?.power_words || []).map(w => `<tr><td><span class="pw" style="${pwColors[w.color] || pwColors.blue}">${escHtml(w.word)}</span></td><td>${escHtml(w.type)}</td><td>${escHtml(w.effect)}</td></tr>`).join('')}
        </tbody></table></div>
      </div>
      <div class="card">
        <div class="card-title">流入経路の意図分析</div>
        ${(d.strategy?.traffic || []).map(t => `<div class="traffic-item"><span class="traffic-label">${escHtml(t.label)}</span><div class="star-bar">${stars(t.stars)}</div><span class="traffic-desc">${escHtml(t.description)}</span></div>`).join('')}
      </div>
      <div class="card">
        <div class="card-title">競争性・差別化</div>
        <ul>${(d.strategy?.differentiation || []).map(p => `<li>${escHtml(p)}</li>`).join('')}</ul>
      </div>
    </section>

    <!-- 3: Structure -->
    <section class="section">
      <div class="section-header"><div class="section-number">3</div><h2 class="section-title">動画構成の分析（編集者向け）</h2></div>
      <div class="card">
        <div class="card-title">構成パターン</div>
        <div class="highlight-box"><p><strong>${escHtml(d.structure?.pattern || '')}</strong></p><p style="margin-top:8px;font-size:14px;">${escHtml(d.structure?.pattern_description || '')}</p></div>
      </div>
      <div class="card">
        <div class="card-title">タイムライン構成</div>
        <div style="position:relative;padding-left:32px;">
          <div style="position:absolute;left:14px;top:8px;bottom:8px;width:2px;background:linear-gradient(to bottom,var(--accent-indigo),var(--accent-violet),var(--accent-rose));border-radius:2px;"></div>
          ${(d.structure?.timeline || []).map(t => `
            <div style="position:relative;padding:12px 0 24px 24px;">
              <div style="position:absolute;left:-24px;top:18px;width:10px;height:10px;border-radius:50%;background:var(--accent-indigo);border:2px solid var(--bg-primary);box-shadow:0 0 12px rgba(129,140,248,0.4);"></div>
              <div style="font-family:'Inter',monospace;font-size:13px;font-weight:600;color:var(--accent-indigo);margin-bottom:4px;">${escHtml(t.time)} <span style="color:var(--text-muted);font-weight:400;">≒${t.percent}%</span></div>
              <div style="font-size:14px;color:var(--text-secondary);"><strong>${escHtml(t.title)}</strong>${t.description ? ' — ' + escHtml(t.description) : ''}</div>
              <div style="margin-top:8px;height:6px;border-radius:3px;background:var(--gradient-subtle);overflow:hidden;"><div style="height:100%;border-radius:3px;background:var(--gradient-main);width:${t.percent}%;"></div></div>
            </div>`).join('')}
        </div>
      </div>
      <div class="card">
        <div class="card-title">冒頭のフック分析</div>
        <div class="table-wrapper"><table><thead><tr><th>分析項目</th><th>内容</th></tr></thead><tbody>
          <tr><td><strong>フックの手法</strong></td><td>${escHtml(d.structure?.hook?.method || '')}</td></tr>
          <tr><td><strong>離脱防止の工夫</strong></td><td>${escHtml(d.structure?.hook?.retention || '')}</td></tr>
        </tbody></table></div>
      </div>
      <div class="card">
        <div class="card-title">尺とテンポの分析</div>
        <div class="table-wrapper"><table><thead><tr><th>分析項目</th><th>評価</th></tr></thead><tbody>
          <tr><td><strong>情報密度</strong></td><td>${escHtml(d.structure?.tempo?.density || '')}</td></tr>
          <tr><td><strong>進行スピード</strong></td><td>${escHtml(d.structure?.tempo?.speed || '')}</td></tr>
          <tr><td><strong>各セクションのバランス</strong></td><td>${escHtml(d.structure?.tempo?.balance || '')}</td></tr>
        </tbody></table></div>
      </div>
    </section>

    <!-- 4: Template -->
    <section class="section">
      <div class="section-header"><div class="section-number">4</div><h2 class="section-title">再利用可能な台本テンプレート</h2></div>
      <div class="card" style="padding:0;overflow:hidden;"><div style="padding:20px 28px;background:var(--gradient-subtle);border-bottom:1px solid var(--border-accent);"><div class="card-title" style="margin:0;">${escHtml(d.template?.name || '台本テンプレート')}</div></div></div>
      <div class="template-block">
        ${(d.template?.sections || []).map(s => `
          <div class="template-section">
            <div class="template-time">${escHtml(s.time)}　${escHtml(s.title)} <span style="font-size:11px;color:var(--text-muted);font-weight:500;">≒${s.percent}%</span></div>
            <div class="template-label method">手法</div><p class="template-text">${escHtml(s.method)}</p>
            <div class="template-label effect">効果</div><p class="template-text">${escHtml(s.effect)}</p>
          </div>`).join('')}
      </div>
      <div class="card">
        <div class="card-title">別テーマへの転用例</div>
        <div class="table-wrapper"><table><thead><tr><th>#</th><th>転用テーマ</th><th>転用方法</th></tr></thead><tbody>
          ${(d.template?.transfers || []).map((t, i) => `<tr><td><span class="transfer-num">${i + 1}</span></td><td><strong>${escHtml(t.theme)}</strong></td><td>${escHtml(t.method)}</td></tr>`).join('')}
        </tbody></table></div>
      </div>
    </section>

    <!-- 5: Evaluation -->
    <section class="section">
      <div class="section-header"><div class="section-number">5</div><h2 class="section-title">総合評価 & 制作者への提言</h2></div>
      <h3 style="font-size:16px;font-weight:600;color:var(--accent-emerald);margin-bottom:16px;">この動画の強み</h3>
      <div class="eval-grid" style="margin-bottom:32px;">
        ${(d.evaluation?.strengths || []).map(s => `<div class="eval-card strength"><div class="eval-card-title">${escHtml(s.title)}</div><p>${escHtml(s.description)}</p></div>`).join('')}
      </div>
      <h3 style="font-size:16px;font-weight:600;color:var(--accent-amber);margin-bottom:16px;">改善余地</h3>
      <div class="eval-grid">
        ${(d.evaluation?.improvements || []).map(s => `<div class="eval-card improve"><div class="eval-card-title">${escHtml(s.title)}</div><p>${escHtml(s.description)}</p></div>`).join('')}
      </div>
    </section>

    <footer class="footer">
      <p>分析日: ${new Date().toLocaleDateString('ja-JP')}</p>
      ${footerSource}
      <p>分析者: 動画戦略コンサルタントAI (Gemini)</p>
    </footer>
  `;

  // Scroll animation (clean up previous observer to prevent memory leak)
  if (reportObserver) reportObserver.disconnect();
  reportObserver = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
  el.querySelectorAll('.section').forEach(s => reportObserver.observe(s));
}

// ======== Init ========
document.addEventListener('DOMContentLoaded', () => {
  renderHistory();
  document.getElementById('urlInput').addEventListener('keydown', e => { if (e.key === 'Enter') startAnalysis(); });
  initDropZone();
});
