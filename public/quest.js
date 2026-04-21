// quest.js — общая логика для всех 7 станций

function initPoint(cfg) {
    // cfg: { pointId, targetIndex, correctAns, nextUrl,
    //        plantName, plantLatin, plantEmoji, hasVideo,
    //        correctText, wrongText }
  
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
                             padding:12px 28px;border-radius:10px;text-decoration:none;">
            ← Войти
          </a>
        </div>`;
      return;
    }
  
    // ── HUD ─────────────────────────────────────────────────────────────
    const hudName = document.getElementById('hudName');
    if (hudName) hudName.textContent = userName || 'Участник';
  
    // Progress dots
    updateDots(cfg.pointId);
  
    // Placeholder plant name
    const phName  = document.querySelector('.ph-name');
    const phLatin = document.querySelector('.ph-latin');
    const phIcon  = document.querySelector('.ph-icon');
    if (phName)  phName.textContent  = cfg.plantName;
    if (phLatin) phLatin.textContent = cfg.plantLatin;
    if (phIcon)  phIcon.textContent  = cfg.plantEmoji;
  
    // ── AR logic ─────────────────────────────────────────────────────────
    const arTarget = document.querySelector('#ar-target');
    const video    = document.querySelector('#plant-video');
    const ui       = document.getElementById('ui');
    const hint     = document.getElementById('hint');
    const placeholder = document.getElementById('placeholder');
  
    let progressSaved = false;
    let targetVisible = false;
  
    if (arTarget) {
      arTarget.addEventListener('targetFound', () => {
        targetVisible = true;
        if (hint) hint.classList.add('hidden');
  
        if (video && cfg.hasVideo) {
          video.currentTime = 0;
          video.play().catch(() => { video.muted = true; video.play(); });
        }
  
        // Show UI panels
        if (ui) ui.classList.add('visible');
        if (placeholder) placeholder.classList.add('hidden');
  
        // Show fact panel first
        showPanel('fact-panel');
  
        // Save progress once
        if (!progressSaved) {
          saveProgress(cfg.pointId, groupCode, userId);
          progressSaved = true;
        }
      });
  
      arTarget.addEventListener('targetLost', () => {
        targetVisible = false;
        if (video) video.pause();
        if (hint) hint.classList.remove('hidden');
      });
    }
  
    // ── Quiz logic ────────────────────────────────────────────────────────
    window.showQuiz = function() {
      showPanel('quiz-panel');
    };
  
    window.checkAnswer = function(btn, answerNum) {
      const resultMsg = document.getElementById('result-msg');
      const buttons   = document.querySelectorAll('.btn-answer');
  
      buttons.forEach(b => b.disabled = true);
  
      if (answerNum === cfg.correctAns) {
        btn.classList.add('correct');
        if (resultMsg) resultMsg.innerHTML = `<p class="result correct-msg">${cfg.correctText}</p>`;
        setTimeout(() => showPanel('stamp-panel'), 1400);
      } else {
        btn.classList.add('wrong');
        // Highlight correct
        buttons[cfg.correctAns - 1]?.classList.add('correct');
        if (resultMsg) resultMsg.innerHTML = `<p class="result wrong-msg">${cfg.wrongText}</p>`;
      }
    };
  
    window.goNext = function() {
      window.location.href = cfg.nextUrl;
    };
  
    window.showPanel = showPanel;
  }
  
  // ── Helpers ────────────────────────────────────────────────────────────────
  
  function showPanel(id) {
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    const target = document.getElementById(id);
    if (target) target.classList.add('active');
  }
  
  function updateDots(currentId) {
    const dotsEl = document.getElementById('dots');
    const doneEl = document.getElementById('done-count');
    const TOTAL  = 7;
  
    // Get completed stations from localStorage
    let completed = JSON.parse(localStorage.getItem('quest_completed') || '[]');
  
    if (doneEl) doneEl.textContent = completed.length;
  
    if (dotsEl) {
      dotsEl.innerHTML = Array.from({ length: TOTAL }, (_, i) => {
        const n   = i + 1;
        const cls = completed.includes(n) ? 'dot done' : n === currentId ? 'dot current' : 'dot';
        return `<div class="${cls}"></div>`;
      }).join('');
    }
  }
  
  async function saveProgress(pointId, groupCode, userId) {
    // Mark locally
    let completed = JSON.parse(localStorage.getItem('quest_completed') || '[]');
    if (!completed.includes(pointId)) {
      completed.push(pointId);
      localStorage.setItem('quest_completed', JSON.stringify(completed));
      updateDots(pointId);
      const doneEl = document.getElementById('done-count');
      if (doneEl) doneEl.textContent = completed.length;
    }
  
    // Send to server
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