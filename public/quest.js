// quest.js — общая логика для всех 7 станций

function initPoint(cfg) {
    const userId    = localStorage.getItem('quest_userId');
    const groupCode = localStorage.getItem('quest_groupCode');
    const userName  = localStorage.getItem('quest_name');
  
    // ── Auth guard ──────────────────────────────────────────────────────
    if (!userId || !groupCode) {
      document.body.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;
                    justify-content:center;height:100dvh;gap:16px;
                    background:#0d1a0f;color:#e8f5eb;font-family:sans-serif;padding:32px;text-align:center;">
          <p style="opacity:.7">Сначала войдите в группу</p>
          <a href="/" style="color:#4ade80;border:1px solid #4ade8055;
                             padding:12px 28px;border-radius:10px;text-decoration:none;">← Войти</a>
        </div>`;
      return;
    }
  
    // ── HUD ─────────────────────────────────────────────────────────────
    const hudName = document.getElementById('hudName');
    if (hudName) hudName.textContent = userName || 'Участник';
    updateDots(cfg.pointId);
  
    const phName  = document.querySelector('.ph-name');
    const phLatin = document.querySelector('.ph-latin');
    const phIcon  = document.querySelector('.ph-icon');
    if (phName)  phName.textContent  = cfg.plantName;
    if (phLatin) phLatin.textContent = cfg.plantLatin;
    if (phIcon)  phIcon.textContent  = cfg.plantEmoji;
  
    // ── AR logic ─────────────────────────────────────────────────────────
    const arTarget    = document.querySelector('#ar-target');
    const video       = document.querySelector('#plant-video');
    const ui          = document.getElementById('ui');
    const hint        = document.getElementById('hint');
    const placeholder = document.getElementById('placeholder');
  
    let progressSaved = false;
    let stationDone   = false;
  
    const completed = JSON.parse(localStorage.getItem('quest_completed') || '[]');
    if (completed.includes(cfg.pointId)) stationDone = true;
  
    if (arTarget) {
      arTarget.addEventListener('targetFound', () => {
        if (hint) hint.classList.add('hidden');
        if (placeholder) placeholder.classList.add('hidden');
  
        if (video && cfg.hasVideo) {
          video.currentTime = 0;
          video.play().catch(() => { video.muted = true; video.play(); });
        }
  
        if (ui) ui.classList.add('visible');
        showPanel(stationDone ? 'stamp-panel' : 'fact-panel');
  
        if (!progressSaved) {
          saveProgress(cfg.pointId, groupCode, userId);
          progressSaved = true;
        }
      });
  
      arTarget.addEventListener('targetLost', () => {
        if (video) video.pause();
      });
    }
  
    // ── Quiz ──────────────────────────────────────────────────────────────
    window.showQuiz = function() { showPanel('quiz-panel'); };
  
    window.checkAnswer = function(btn, answerNum) {
      const resultMsg = document.getElementById('result-msg');
      const buttons   = document.querySelectorAll('.btn-answer');
  
      buttons.forEach(b => b.disabled = true);
      stationDone = true;
  
      if (answerNum === cfg.correctAns) {
        btn.classList.add('correct');
        if (resultMsg) resultMsg.innerHTML =
          `<p class="result correct-msg">${cfg.correctText}</p>`;
        setTimeout(() => showPanel('stamp-panel'), 1400);
      } else {
        btn.classList.add('wrong');
        buttons[cfg.correctAns - 1]?.classList.add('correct');
        if (resultMsg) resultMsg.innerHTML =
          `<p class="result wrong-msg">${cfg.wrongText}</p>`;
        setTimeout(() => showPanel('stamp-panel'), 2500);
      }
    };
  
    // ── После штампа: переход на страницу-сканер ─────────────────────────
    window.goNext = function() {
      const done = JSON.parse(localStorage.getItem('quest_completed') || '[]');
      if (done.length >= 7) {
        window.location.href = '/final.html';
      } else {
        // Переходим на универсальный сканер — он поймёт какой маркер перед камерой
        window.location.href = '/scan.html';
      }
    };
  
    window.showPanel = showPanel;
  }
  
  // ── Helpers ────────────────────────────────────────────────────────────────
  
  function showPanel(id) {
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    if (id) {
      const t = document.getElementById(id);
      if (t) t.classList.add('active');
    }
  }
  
  function updateDots(currentId) {
    const dotsEl    = document.getElementById('dots');
    const doneEl    = document.getElementById('done-count');
    const completed = JSON.parse(localStorage.getItem('quest_completed') || '[]');
  
    if (doneEl) doneEl.textContent = completed.length;
  
    if (dotsEl) {
      dotsEl.innerHTML = Array.from({ length: 7 }, (_, i) => {
        const n   = i + 1;
        const cls = completed.includes(n) ? 'dot done'
                  : n === currentId       ? 'dot current'
                  : 'dot';
        return `<div class="${cls}"></div>`;
      }).join('');
    }
  }
  
  async function saveProgress(pointId, groupCode, userId) {
    let completed = JSON.parse(localStorage.getItem('quest_completed') || '[]');
    if (!completed.includes(pointId)) {
      completed.push(pointId);
      localStorage.setItem('quest_completed', JSON.stringify(completed));
      updateDots(pointId);
      const doneEl = document.getElementById('done-count');
      if (doneEl) doneEl.textContent = completed.length;
    }
    try {
      await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupCode, userId, stationId: pointId })
      });
    } catch (e) {
      console.warn('Progress sync failed:', e);
    }
  }