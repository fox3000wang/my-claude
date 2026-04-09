/**
 * 开心消消乐 — Web Audio API 音效引擎
 * 程序合成，无需外部音频文件
 */

// 单例 AudioContext（用户交互后创建，避免浏览器自动播放策略）
let audioCtx: AudioContext | null = null;
let bgmGain: GainNode | null = null;
let bgmOscillators: OscillatorNode[] = [];
let isBgmPlaying = false;

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/** 初始化 AudioContext（首次用户交互时调用） */
export function initAudio() {
  getCtx();
}

// ---- 工具函数 ----

/**
 * 创建一个带 ADSR 包络的 oscillator
 */
function playTone(
  frequency: number,
  type: OscillatorType,
  duration: number,
  gainPeak: number,
  startTime?: number,
  detune = 0
) {
  const ctx = getCtx();
  const now = startTime ?? ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.type = type;
  osc.frequency.setValueAtTime(frequency, now);
  osc.detune.setValueAtTime(detune, now);

  // ADSR 包络
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(gainPeak, now + 0.01); // Attack
  gain.gain.exponentialRampToValueAtTime(gainPeak * 0.6, now + duration * 0.3); // Decay
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration); // Release

  osc.start(now);
  osc.stop(now + duration);
}

/**
 * 白噪声（用于打击感）
 */
function playNoise(duration: number, gainPeak: number, startTime?: number) {
  const ctx = getCtx();
  const now = startTime ?? ctx.currentTime;
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 3000;
  filter.Q.value = 0.5;

  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(gainPeak, now + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  source.start(now);
}

// ---- 音效 ----

// 5 种动物的基准频率（对应 cat/dog/rabbit/panda/fox）
const BASE_FREQS = [523.25, 587.33, 659.25, 698.46, 783.99]; // C5 D5 E5 F5 G5

/**
 * 消除音效：每种动物不同音高的清脆"啵"声
 * tileTypeIndex: 0-4 对应 cat/dog/rabbit/panda/fox
 */
export function playPopSound(tileTypeIndex = 0) {
  const freq = BASE_FREQS[tileTypeIndex % BASE_FREQS.length];
  const ctx = getCtx();
  const now = ctx.currentTime;

  // 主音：正弦波
  playTone(freq, 'sine', 0.18, 0.35, now);
  // 泛音：增加清脆感
  playTone(freq * 2, 'sine', 0.12, 0.12, now);
  // 打击噪声
  playNoise(0.05, 0.15, now);
}

/**
 * 级联连击音效：连续消除时音高递升
 * combo: 连击数（从 1 开始）
 */
export function playComboSound(combo: number) {
  const ctx = getCtx();
  const now = ctx.currentTime;

  // 每次连击播放一个上行音符
  const baseNote = BASE_FREQS[0]; // C5
  const semitones = (combo - 1) * 4; // 每次升四度
  const freq = baseNote * Math.pow(2, semitones / 12);

  playTone(freq, 'triangle', 0.25, 0.4, now);
  playTone(freq * 1.5, 'sine', 0.2, 0.15, now + 0.05);

  // combo > 2 时加更强的打击感
  if (combo >= 2) {
    playNoise(0.04, 0.2, now);
  }
}

/**
 * 胜利音效：上扬和弦
 */
export function playWinSound() {
  const ctx = getCtx();
  const now = ctx.currentTime;

  // C E G C6 和弦，依次响起
  const chord = [523.25, 659.25, 783.99, 1046.5];
  chord.forEach((freq, i) => {
    playTone(freq, 'sine', 0.6, 0.25, now + i * 0.08);
    playTone(freq * 2, 'sine', 0.4, 0.1, now + i * 0.08);
  });

  // 最后加一个上行滑音
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(600, now + 0.4);
  osc.frequency.exponentialRampToValueAtTime(1200, now + 0.8);
  gain.gain.setValueAtTime(0, now + 0.4);
  gain.gain.linearRampToValueAtTime(0.2, now + 0.45);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
  osc.start(now + 0.4);
  osc.stop(now + 0.9);
}

/**
 * 失败音效：下行音调
 */
export function playLoseSound() {
  const ctx = getCtx();
  const now = ctx.currentTime;

  // 下行三音
  const notes = [523.25, 392, 293.66]; // C5 G4 D4
  notes.forEach((freq, i) => {
    playTone(freq, 'triangle', 0.4, 0.3, now + i * 0.2);
  });
}

// ---- 背景音乐 ----

// 简单的循环旋律（两小节，每小节 4 个音符）
const BGM_MELODY = [
  // 第一小节
  { freq: 392, duration: 0.2 },   // G4
  { freq: 440, duration: 0.2 },   // A4
  { freq: 523.25, duration: 0.2 }, // C5
  { freq: 440, duration: 0.2 },   // A4
  // 第二小节
  { freq: 523.25, duration: 0.2 }, // C5
  { freq: 659.25, duration: 0.2 }, // E5
  { freq: 523.25, duration: 0.2 }, // C5
  { freq: 392, duration: 0.4 },   // G4
];

function scheduleBgmNote(startTime: number, freq: number, duration: number) {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.connect(gain);
  gain.connect(bgmGain!);

  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, startTime);

  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(0.12, startTime + 0.02);
  gain.gain.setValueAtTime(0.12, startTime + duration * 0.7);
  gain.gain.linearRampToValueAtTime(0, startTime + duration);

  osc.start(startTime);
  osc.stop(startTime + duration + 0.01);

  return osc;
}

function playBgmLoop() {
  if (!isBgmPlaying) return;

  const ctx = getCtx();
  const startTime = ctx.currentTime + 0.1;
  let t = startTime;

  // 播放两遍旋律（一遍 = 8 个音符）
  for (let loop = 0; loop < 2; loop++) {
    BGM_MELODY.forEach(({ freq, duration }) => {
      scheduleBgmNote(t, freq, duration * 0.9);
      t += (duration * 1000) / 1000; // 转为秒
    });
  }

  // 计算总时长，循环
  const totalDuration = BGM_MELODY.reduce((sum, n) => sum + n.duration, 0) * 2;
  setTimeout(() => {
    if (isBgmPlaying) playBgmLoop();
  }, totalDuration * 1000);
}

/**
 * 播放背景音乐
 */
export function playBgm() {
  if (isBgmPlaying) return;
  getCtx(); // 确保 context 已初始化

  bgmGain = getCtx().createGain();
  bgmGain.gain.value = 0.5;
  bgmGain.connect(getCtx().destination);

  isBgmPlaying = true;
  playBgmLoop();
}

/**
 * 停止背景音乐
 */
export function stopBgm() {
  isBgmPlaying = false;
  bgmOscillators.forEach(o => { try { o.stop(); } catch {} });
  bgmOscillators = [];
  if (bgmGain) {
    bgmGain.disconnect();
    bgmGain = null;
  }
}

/** 获取当前 BGM 状态 */
export function isBgmActive() {
  return isBgmPlaying;
}
