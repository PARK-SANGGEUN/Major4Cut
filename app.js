// ===== 모두의 진로 나침반 - app.js =====
const $ = id => document.getElementById(id);
const cats = ['전체 분야', ...Object.keys(CATEGORY_META)];

let state = {
  q: '', cat: '전체 분야', apt: '', outlook: '', sort: 'recommend',
  list: false, compare: [], darkMode: false
};

// ─── 유틸 ───────────────────────────────────────────
function esc(v) {
  return String(v || '').replace(/[&<>"]/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[s]));
}
function colorMeta(cat) { return CATEGORY_META[cat] || ['#edf2ff','#1e4fd8','#2d65f6']; }

// ─── 초기화 ──────────────────────────────────────────
function init() {
  $('jobCount').textContent = JOBS.length;

  // 카테고리 셀렉트
  $('cat').innerHTML = cats.map(c => `<option>${c}</option>`).join('');

  // 카테고리 칩
  $('chips').innerHTML = cats.map(c =>
    `<button class="chip ${c === '전체 분야' ? 'active' : ''}" data-cat="${c}">${c}</button>`
  ).join('');

  // 적성 칩 이벤트
  document.querySelectorAll('.apt-chip').forEach(btn =>
    btn.onclick = () => {
      state.apt = btn.dataset.apt;
      document.querySelectorAll('.apt-chip').forEach(b => b.classList.toggle('active', b.dataset.apt === state.apt));
      $('aptitude').value = state.apt;
      render();
    }
  );

  // 검색 이벤트
  $('q').addEventListener('input', e => { state.q = e.target.value; render(); });
  $('cat').addEventListener('change', e => { state.cat = e.target.value; syncChips(); render(); });
  $('aptitude').addEventListener('change', e => {
    state.apt = e.target.value;
    document.querySelectorAll('.apt-chip').forEach(b => b.classList.toggle('active', b.dataset.apt === state.apt));
    render();
  });
  $('outlook').addEventListener('change', e => { state.outlook = e.target.value; render(); });
  $('sort').addEventListener('change', e => { state.sort = e.target.value; render(); });

  $('resetBtn').onclick = () => {
    state.q = ''; state.cat = '전체 분야'; state.apt = ''; state.outlook = ''; state.sort = 'recommend';
    $('q').value = ''; $('cat').value = '전체 분야'; $('aptitude').value = ''; $('outlook').value = ''; $('sort').value = 'recommend';
    syncChips();
    document.querySelectorAll('.apt-chip').forEach(b => b.classList.toggle('active', b.dataset.apt === ''));
    render();
  };

  // 카테고리 칩 이벤트
  document.querySelectorAll('.chip').forEach(btn =>
    btn.onclick = () => { state.cat = btn.dataset.cat; $('cat').value = state.cat; syncChips(); render(); }
  );

  // 뷰 토글
  $('gridBtn').onclick = () => { state.list = false; $('gridBtn').classList.add('on'); $('listBtn').classList.remove('on'); render(); };
  $('listBtn').onclick = () => { state.list = true; $('listBtn').classList.add('on'); $('gridBtn').classList.remove('on'); render(); };

  // 모달
  $('closeModal').onclick = closeModal;
  $('modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });

  // 비교
  $('clearCompare').onclick = () => { state.compare = []; renderCompare(); };

  // 상담 메모
  $('saveMemo').onclick = saveMemo;
  $('loadMemo').onclick = loadMemo;
  $('exportMemo').onclick = exportMemo;
  $('printBtn').onclick = printReport;
  $('toneBtn').onclick = toggleDark;

  render();
}

function syncChips() {
  document.querySelectorAll('.chip').forEach(b => b.classList.toggle('active', b.dataset.cat === state.cat));
}

// ─── 필터 & 정렬 ──────────────────────────────────
function filtered() {
  const q = state.q.trim().toLowerCase();
  let arr = JOBS.filter(j => state.cat === '전체 분야' || j.category === state.cat);
  if (state.apt) arr = arr.filter(j => j.aptitude === state.apt);
  if (state.outlook) arr = arr.filter(j => j.outlook === state.outlook);
  if (q) arr = arr.filter(j =>
    [j.name, j.category, j.desc, j.aptitude, j.outlook, j.salary, ...j.majors, ...j.curriculum, ...j.s2015, ...j.s2022, ...j.careers, ...j.certs].join(' ').toLowerCase().includes(q)
  );
  if (state.sort === 'name') arr.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
  if (state.sort === 'salary') arr.sort((a, b) => salaryNum(b.salary) - salaryNum(a.salary));
  if (state.sort === 'recommend') arr.sort((a, b) => b.score - a.score);
  return arr;
}

// ─── 렌더링 ───────────────────────────────────────
function render() {
  const arr = filtered();
  $('resultCount').textContent = arr.length;
  const cards = $('cards');
  cards.className = state.list ? 'cards list' : 'cards';
  cards.innerHTML = arr.slice(0, 120).map(cardHTML).join('');
  cards.querySelectorAll('[data-open]').forEach(b => b.onclick = e => { e.stopPropagation(); openModal(b.dataset.open); });
  cards.querySelectorAll('[data-add]').forEach(b => b.onclick = e => { e.stopPropagation(); addCompare(b.dataset.add); });
}

// ─── 전망 배지 ──────────────────────────────────
function outlookBadge(o) {
  const map = { '매우높음': ['🔥', 'badge-hot'], '높음': ['📈', 'badge-up'], '보통': ['📊', 'badge-ok'] };
  const [icon, cls] = map[o] || ['', ''];
  return `<span class="outlook-badge ${cls}">${icon} ${o}</span>`;
}
function aptBadge(a) {
  const map = { '논리':'🧠', '창의':'🎨', '사람':'🤝', '자연':'🌿', '기술':'⚙️', '언어':'✍️' };
  return `<span class="apt-badge">${map[a] || ''} ${a}</span>`;
}

// ─── 카드 HTML ────────────────────────────────────
function cardHTML(j) {
  const [bg, tag, halo] = colorMeta(j.category);
  return `
  <article class="job-card" style="--tagBg:${bg};--tag:${tag};--halo:${halo}" tabindex="0" data-open="${j.id}" aria-label="${j.name}">
    <div class="card-top">
      <span class="cat-badge">${esc(j.category)}</span>
      <div class="card-badges">${outlookBadge(j.outlook)}${aptBadge(j.aptitude)}</div>
    </div>
    <div class="illustration">${jobSvg(j.icon, colorMeta(j.category)[1], colorMeta(j.category)[2])}</div>
    <h3>${esc(j.name)}</h3>
    <p class="desc">${esc(j.desc)}</p>
    <div class="salary-row">💰 <b>${esc(j.salary)}</b></div>
    <div class="tags">${j.majors.slice(0, 3).map(m => `<span class="tag">${esc(m)}</span>`).join('')}</div>
    <div class="actions">
      <button class="btn-primary" data-open="${j.id}">🔍 상세보기</button>
      <button class="btn-compare" data-add="${j.id}">⚖️ 비교</button>
    </div>
  </article>`;
}

// ─── 모달 ────────────────────────────────────────
function findJob(id) { return JOBS.find(j => j.id === id); }

function addCompare(id) {
  const j = findJob(id); if (!j) return;
  if (!state.compare.includes(id)) {
    if (state.compare.length >= 4) state.compare.shift();
    state.compare.push(id);
  }
  renderCompare();
  // 비교 패널로 스크롤
  document.querySelector('.side').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderCompare() {
  const box = $('compareBox');
  if (!state.compare.length) { box.innerHTML = '<p class="muted">아직 선택한 직업이 없습니다.</p>'; return; }
  const jobs = state.compare.map(findJob).filter(Boolean);
  box.innerHTML = `
    <div class="compare-pills">${jobs.map(j => `
      <div class="compare-pill" style="border-color:${colorMeta(j.category)[2]}">
        <b>${esc(j.name)}</b>
        <small>${esc(j.category)}</small>
        <button class="remove-compare" onclick="removeCompare('${j.id}')">✕</button>
      </div>`).join('')}
    </div>
    ${jobs.length >= 2 ? compareTable(jobs) : ''}`;
}

function removeCompare(id) {
  state.compare = state.compare.filter(c => c !== id);
  renderCompare();
}

function compareTable(jobs) {
  const rows = [
    ['직업', j => `<b>${esc(j.name)}</b>`],
    ['분야', j => esc(j.category)],
    ['적성', j => aptBadge(j.aptitude)],
    ['전망', j => outlookBadge(j.outlook)],
    ['연봉', j => `<b>${esc(j.salary)}</b>`],
    ['관련 학과', j => j.majors.map(esc).join('<br>')],
    ['2022 과목', j => j.s2022.map(esc).join('<br>')],
    ['졸업 후 진로', j => j.careers.slice(0, 2).map(esc).join('<br>')],
    ['관련 자격증', j => j.certs.map(esc).join('<br>')],
  ];
  return `<div class="compare-table-wrap"><table class="compare-table">
    ${rows.map(([label, fn]) =>
      `<tr><th>${label}</th>${jobs.map(j => `<td>${fn(j)}</td>`).join('')}</tr>`
    ).join('')}
  </table></div>`;
}

function openModal(id) {
  const j = findJob(id); if (!j) return;
  const [bg, tag, halo] = colorMeta(j.category);
  $('modalBody').innerHTML = `
    <div class="modal-body">
      <!-- 히어로 -->
      <div class="modal-hero" style="background:linear-gradient(135deg,${bg},#fff)">
        <div class="modal-illus">${jobSvg(j.icon, tag, halo, true)}</div>
        <div class="modal-info">
          <div class="modal-badges">
            <span class="cat-badge" style="background:${bg};color:${tag}">${esc(j.category)}</span>
            ${outlookBadge(j.outlook)} ${aptBadge(j.aptitude)}
          </div>
          <h2>${esc(j.name)}</h2>
          <p class="lead">${esc(j.desc)}</p>
          <div class="modal-salary">💰 예상 연봉: <b>${esc(j.salary)}</b></div>
          <div class="tags">${j.majors.map(m => `<span class="tag">${esc(m)}</span>`).join('')}</div>
          <button class="btn-compare wide" onclick="addCompare('${j.id}')">⚖️ 비교에 담기</button>
        </div>
      </div>

      <!-- 정보 그리드 -->
      <div class="info-grid">
        ${infoBox('🎓 관련 대학 학과', j.majors, 'blue')}
        ${infoBox('📚 대학 커리큘럼 (주요 과목)', j.curriculum, 'purple')}
        ${infoBox('📖 2015 개정 고교 연계 과목', j.s2015, 'teal')}
        ${infoBox('🆕 2022 개정 고교 연계 과목', j.s2022, 'green')}
        ${infoBox('🏢 졸업 후 진로·취업처', j.careers, 'orange')}
        ${infoBox('🏅 관련 자격증·면허', j.certs, 'pink')}
      </div>

      <!-- 생기부 팁 -->
      <div class="study-tips-box">
        <h4>📌 생기부 연계 활동 아이디어</h4>
        <div class="tips-grid">
          ${j.studyTips.map(t => `<div class="tip-item">✅ ${esc(t)}</div>`).join('')}
        </div>
      </div>

      <!-- 상담 질문 -->
      <div class="counsel-box">
        <h4>💬 진로 상담 질문 예시</h4>
        <div class="q-list">
          ${j.counselQ.map((q, i) => `<div class="q-item"><span class="q-num">Q${i+1}</span><span>${esc(q)}</span></div>`).join('')}
        </div>
      </div>

      <!-- 교과 연계 심화 -->
      <div class="subject-map-box">
        <h4>🗺️ 고교 교과목 연계 지도</h4>
        <div class="subject-flow">
          <div class="sf-col">
            <div class="sf-head">📘 공통 교과</div>
            ${['국어','수학','영어','통합사회','통합과학'].map(s => `<div class="sf-item sf-common">${s}</div>`).join('')}
          </div>
          <div class="sf-arrow">→</div>
          <div class="sf-col">
            <div class="sf-head">📗 2022 선택 과목</div>
            ${j.s2022.map(s => `<div class="sf-item sf-select">${esc(s)}</div>`).join('')}
          </div>
          <div class="sf-arrow">→</div>
          <div class="sf-col">
            <div class="sf-head">🎓 대학 전공</div>
            ${j.majors.map(m => `<div class="sf-item sf-major">${esc(m)}</div>`).join('')}
          </div>
          <div class="sf-arrow">→</div>
          <div class="sf-col">
            <div class="sf-head">💼 진로</div>
            ${j.careers.slice(0, 3).map(c => `<div class="sf-item sf-career">${esc(c)}</div>`).join('')}
          </div>
        </div>
      </div>
    </div>`;

  $('modal').classList.add('show');
  $('modal').setAttribute('aria-hidden', 'false');
}

function closeModal() {
  $('modal').classList.remove('show');
  $('modal').setAttribute('aria-hidden', 'true');
}

function infoBox(title, items, color = '') {
  return `<div class="info-box info-${color}">
    <h4>${title}</h4>
    <ul>${items.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
  </div>`;
}

// ─── 메모 ─────────────────────────────────────────
function getAptChecked() {
  return Array.from(document.querySelectorAll('#memoAptTags input:checked')).map(el => el.value);
}

function saveMemo() {
  const data = {
    student: $('student').value,
    teacher: $('teacher').value,
    grade: $('grade').value,
    date: $('date').value,
    memo: $('memo').value,
    compare: state.compare,
    apts: getAptChecked(),
  };
  localStorage.setItem('careerMemo_v2', JSON.stringify(data));
  showToast('💾 상담 메모를 저장했습니다.');
}

function loadMemo() {
  const m = JSON.parse(localStorage.getItem('careerMemo_v2') || '{}');
  $('student').value = m.student || '';
  $('teacher').value = m.teacher || '';
  $('grade').value = m.grade || '';
  $('date').value = m.date || '';
  $('memo').value = m.memo || '';
  state.compare = m.compare || [];
  if (m.apts) {
    document.querySelectorAll('#memoAptTags input').forEach(el => { el.checked = m.apts.includes(el.value); });
  }
  renderCompare();
  showToast('📂 메모를 불러왔습니다.');
}

function exportMemo() {
  const jobs = state.compare.map(id => findJob(id)).filter(Boolean);
  let text = `=== 모두의 진로 나침반 - 진로 상담 기록 ===\n\n`;
  text += `학생명: ${$('student').value}\n`;
  text += `학년/반: ${$('grade').value}\n`;
  text += `상담교사: ${$('teacher').value}\n`;
  text += `상담일자: ${$('date').value}\n`;
  text += `관심 적성: ${getAptChecked().join(', ')}\n`;
  text += `\n--- 탐색 직업 ---\n`;
  jobs.forEach(j => {
    text += `\n▶ ${j.name} (${j.category})\n`;
    text += `  설명: ${j.desc}\n`;
    text += `  관련 학과: ${j.majors.join(', ')}\n`;
    text += `  2022 과목: ${j.s2022.join(', ')}\n`;
    text += `  예상 연봉: ${j.salary}\n`;
    text += `  자격증: ${j.certs.join(', ')}\n`;
  });
  text += `\n--- 상담 메모 ---\n${$('memo').value}`;
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `진로상담_${$('student').value || '학생'}_${new Date().toLocaleDateString('ko')}.txt`;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ─── 출력 리포트 ──────────────────────────────────
function printReport() {
  const jobs = state.compare.map(findJob).filter(Boolean).slice(0, 4);
  const fallback = filtered().slice(0, 2);
  const target = jobs.length ? jobs : fallback;
  $('printReport').innerHTML = `
  <div class="report-page">
    <div class="report-header">
      <div class="report-brand">🧭 모두의 진로 나침반</div>
      <div class="report-title-block">
        <h1>학생 진로·학과 상담 리포트</h1>
        <p>2022 개정 교육과정 × 고교학점제 연계 상담자료</p>
      </div>
      <div class="report-meta">
        <table class="report-meta-table">
          <tr><td>학 생 명</td><td>${esc($('student').value || '미입력')}</td></tr>
          <tr><td>학 년/반</td><td>${esc($('grade').value || '미입력')}</td></tr>
          <tr><td>상담교사</td><td>${esc($('teacher').value || '미입력')}</td></tr>
          <tr><td>상담일자</td><td>${esc($('date').value || new Date().toLocaleDateString('ko'))}</td></tr>
          <tr><td>관심 적성</td><td>${getAptChecked().join(', ') || '미선택'}</td></tr>
        </table>
      </div>
    </div>

    <div class="report-grid">
      ${target.map(j => `
      <div class="report-box">
        <div class="report-job-header">
          <h3>${esc(j.name)}</h3>
          <span class="report-cat">${esc(j.category)}</span>
          <span class="report-outlook">${j.outlook}</span>
        </div>
        <p class="report-desc">${esc(j.desc)}</p>
        <div class="report-salary">💰 예상 연봉: <b>${esc(j.salary)}</b></div>
        <div class="report-section">
          <h4>🎓 관련 학과</h4>
          <p>${j.majors.join(' / ')}</p>
        </div>
        <div class="report-section">
          <h4>📚 대학 커리큘럼 (주요 과목)</h4>
          <ul>${j.curriculum.map(m => `<li>${esc(m)}</li>`).join('')}</ul>
        </div>
        <div class="report-two-col">
          <div>
            <h4>📖 2015 개정 고교 연계</h4>
            <p>${j.s2015.join(', ')}</p>
          </div>
          <div>
            <h4>🆕 2022 개정 고교 연계</h4>
            <p>${j.s2022.join(', ')}</p>
          </div>
        </div>
        <div class="report-section">
          <h4>🏢 진로·취업처</h4>
          <p>${j.careers.join(' · ')}</p>
        </div>
        <div class="report-section">
          <h4>📌 생기부 활동 아이디어</h4>
          <ul>${j.studyTips.map(t => `<li>${esc(t)}</li>`).join('')}</ul>
        </div>
        <div class="report-section">
          <h4>🏅 관련 자격증</h4>
          <p>${j.certs.join(', ')}</p>
        </div>
        <div class="report-section">
          <h4>💬 상담 질문 예시</h4>
          <ol>${j.counselQ.map(q => `<li>${esc(q)}</li>`).join('')}</ol>
        </div>
      </div>`).join('')}
    </div>

    <div class="report-memo-box">
      <h3>📝 상담 메모</h3>
      <p>${esc($('memo').value || '').replace(/\n/g, '<br>')}</p>
    </div>

    <div class="report-footer">
      <p>본 자료는 모두의 진로 나침반에서 출력되었습니다. · 2022 개정 교육과정 기준</p>
    </div>
  </div>`;
  window.print();
}

// ─── 다크 모드 ────────────────────────────────────
function toggleDark() {
  state.darkMode = !state.darkMode;
  document.body.classList.toggle('dark', state.darkMode);
  $('toneBtn').textContent = state.darkMode ? '☀️ 라이트모드' : '🌙 다크모드';
}

// ─── 토스트 ───────────────────────────────────────
function showToast(msg) {
  let t = document.querySelector('.toast');
  if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

// ─── SVG 일러스트 ─────────────────────────────────
function jobSvg(type, c1, c2, large = false) {
  const vb = large ? '0 0 360 220' : '0 0 316 160';
  const W = large ? 360 : 316;
  const H = large ? 220 : 160;
  const cx = W / 2;
  const cy = H / 2;

  // 공통 배경 + 사람 요소
  const bg = `
    <defs>
      <linearGradient id="grd${type}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${c1}" stop-opacity="0.15"/>
        <stop offset="100%" stop-color="${c2}" stop-opacity="0.25"/>
      </linearGradient>
      <filter id="glow${type}">
        <feGaussianBlur stdDeviation="3" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
    <rect width="${W}" height="${H}" rx="24" fill="url(#grd${type})"/>
    <circle class="person-bob" cx="70" cy="${cy - 18}" r="20" fill="${c1}" opacity="0.9"/>
    <ellipse cx="70" cy="${cy + 18}" rx="28" ry="18" fill="${c1}" opacity="0.7"/>
  `;

  const svgs = {
    doctor: `${bg}
      <rect class="tool-swing" x="130" y="${cy-40}" width="75" height="65" rx="12" fill="white" stroke="${c1}" stroke-width="6"/>
      <path d="M155 ${cy-15}h26M168 ${cy-28}v26" stroke="${c2}" stroke-width="7" stroke-linecap="round"/>
      <circle class="pulse-ring" cx="${W-60}" cy="${cy}" r="28" fill="none" stroke="${c2}" stroke-width="4" opacity="0.6"/>
      <path class="ecg-line" d="M${W-100} ${cy} l10-5 8 20 12-40 8 30 10-15 10 10" fill="none" stroke="${c2}" stroke-width="4" stroke-linecap="round"/>
      <path d="M82 ${cy+2} c-20 10-24 28-24 28" stroke="${c1}" stroke-width="6" fill="none" stroke-linecap="round"/>
      <circle cx="58" cy="${cy+32}" r="8" fill="${c2}" opacity="0.8"/>`,

    nurse: `${bg}
      <rect class="tool-swing" x="125" y="${cy-45}" width="65" height="90" rx="14" fill="white" stroke="${c1}" stroke-width="6"/>
      <path d="M148 ${cy-25}h20M158 ${cy-35}v20" stroke="${c2}" stroke-width="6" stroke-linecap="round"/>
      <path class="float-right" d="M${W-80} ${cy-30} c35 0 35 45 0 45 s-35-45 0-45" fill="none" stroke="${c1}" stroke-width="6"/>
      <path d="M${W-55} ${cy+16}h35" stroke="${c2}" stroke-width="7" stroke-linecap="round"/>
      <circle cx="${W-100}" cy="${cy-5}" r="6" fill="${c2}" class="blink"/>`,

    pharma: `${bg}
      <rect class="tool-swing" x="128" y="${cy-40}" width="75" height="32" rx="16" fill="none" stroke="${c1}" stroke-width="7"/>
      <path d="M163 ${cy-40}v32" stroke="${c2}" stroke-width="5"/>
      <circle class="float-right" cx="${W-65}" cy="${cy-25}" r="30" fill="none" stroke="${c2}" stroke-width="6"/>
      <path d="M${W-50} ${cy-40} l32 36" stroke="${c1}" stroke-width="7" stroke-linecap="round"/>
      <circle cx="${W-40}" cy="${cy-42}" r="9" fill="${c2}" opacity="0.9"/>
      <circle cx="${W-25}" cy="${cy+5}" r="5" fill="${c2}" opacity="0.6" class="blink"/>`,

    therapy: `${bg}
      <path class="tool-swing" d="M128 ${cy+20} c30-55 82-55 112 0" fill="none" stroke="${c1}" stroke-width="9" stroke-linecap="round"/>
      <circle cx="125" cy="${cy+22}" r="14" fill="${c2}" opacity="0.9"/>
      <circle cx="243" cy="${cy+22}" r="14" fill="${c2}" opacity="0.9"/>
      <path class="float-right" d="M170 ${cy-25} l55 28" stroke="${c1}" stroke-width="7" stroke-linecap="round"/>
      <path d="M240 ${cy-10} h35 M257 ${cy-22} v26" stroke="${c2}" stroke-width="5" stroke-linecap="round"/>`,

    psycho: `${bg}
      <path d="M125 ${cy+10} h100 a20 20 0 0 0 0-40 h-60 l-30-24v24h-10 a20 20 0 0 0 0 40z" fill="white" stroke="${c1}" stroke-width="6"/>
      <path class="tool-swing" d="M148 ${cy-10}h64" stroke="${c2}" stroke-width="6" stroke-linecap="round"/>
      <circle cx="${W-70}" cy="${cy-25}" r="8" fill="${c2}" class="blink"/>
      <circle cx="${W-50}" cy="${cy-5}" r="5" fill="${c1}" class="blink" style="animation-delay:.4s"/>
      <path class="float-right" d="M${W-40} ${cy+30} c20-30 35-20 30 0" fill="none" stroke="${c2}" stroke-width="5"/>`,

    radiology: `${bg}
      <rect x="128" y="${cy-45}" width="100" height="72" rx="13" fill="none" stroke="${c1}" stroke-width="7"/>
      <path class="tool-swing" d="M148 ${cy-25}v36M168 ${cy-25}v36M188 ${cy-25}v36M208 ${cy-25}v36" stroke="${c2}" stroke-width="5" stroke-linecap="round"/>
      <circle cx="${W-50}" cy="${cy}" r="26" fill="none" stroke="${c2}" stroke-width="7" class="pulse-ring"/>
      <ellipse class="float-right" cx="${W-50}" cy="${cy}" rx="12" ry="18" fill="none" stroke="${c1}" stroke-width="5"/>`,

    ai: `${bg}
      <rect class="tool-swing" x="125" y="${cy-45}" width="108" height="82" rx="18" fill="none" stroke="${c1}" stroke-width="7"/>
      <circle cx="155" cy="${cy-15}" r="9" fill="${c2}" opacity="0.9"/>
      <circle cx="183" cy="${cy-15}" r="9" fill="${c2}" opacity="0.9"/>
      <circle cx="211" cy="${cy-15}" r="9" fill="${c2}" opacity="0.9"/>
      <path class="float-right" d="M155 ${cy+10}h56M155 ${cy+28}h35" stroke="${c2}" stroke-width="5" stroke-linecap="round"/>
      <path d="M240 ${cy-25} h30 M240 ${cy} h30 M240 ${cy+25} h30" stroke="${c1}" stroke-width="4" opacity="0.6"/>`,

    aichip: `${bg}
      <rect class="tool-swing" x="130" y="${cy-50}" width="100" height="100" rx="16" fill="none" stroke="${c1}" stroke-width="7"/>
      <rect x="155" y="${cy-28}" width="50" height="50" rx="6" fill="${c2}" opacity="0.15" stroke="${c2}" stroke-width="4"/>
      <path d="M115 ${cy-30}h15M115 ${cy-10}h15M115 ${cy+10}h15M115 ${cy+30}h15M245 ${cy-30}h15M245 ${cy-10}h15M245 ${cy+10}h15M245 ${cy+30}h15" stroke="${c2}" stroke-width="5" stroke-linecap="round"/>
      <path class="float-right" d="M160 ${cy-28}v50M180 ${cy-28}v50M200 ${cy-28}v50" stroke="${c1}" stroke-width="3" opacity="0.6"/>`,

    data: `${bg}
      <rect x="128" y="${cy-45}" width="150" height="80" rx="10" fill="white" opacity="0.5" stroke="${c1}" stroke-width="4"/>
      <path class="tool-swing" d="M140 ${cy+28}V${cy}M160 ${cy+28}V${cy-18}M180 ${cy+28}V${cy-30}M200 ${cy+28}V${cy+10}M220 ${cy+28}V${cy-22}M240 ${cy+28}V${cy-38}" stroke="${c1}" stroke-width="12" stroke-linecap="round"/>
      <path class="float-right" d="M135 ${cy-5} l40-22 36 30 42-42" fill="none" stroke="${c2}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="175" cy="${cy-27}" r="6" fill="${c2}"/>`,

    security: `${bg}
      <path class="tool-swing" d="M178 ${cy-50}l56 24v40c0 26-20 42-56 58-36-16-56-32-56-58V${cy-26}z" fill="none" stroke="${c1}" stroke-width="7" stroke-linejoin="round"/>
      <path d="M154 ${cy+2}l20 20 40-46" stroke="${c2}" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <circle class="pulse-ring" cx="178" cy="${cy}" r="42" fill="none" stroke="${c2}" stroke-width="3" opacity="0.3"/>`,

    developer: `${bg}
      <rect x="125" y="${cy-45}" width="130" height="78" rx="12" fill="none" stroke="${c1}" stroke-width="7"/>
      <path class="tool-swing" d="M160 ${cy-15}l-20 16 20 16M200 ${cy-15}l20 16-20 16M185 ${cy-20}l-15 38" stroke="${c2}" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,

    xr: `${bg}
      <rect class="tool-swing" x="120" y="${cy-30}" width="130" height="55" rx="28" fill="none" stroke="${c1}" stroke-width="7"/>
      <circle cx="155" cy="${cy-2}" r="18" fill="none" stroke="${c2}" stroke-width="5"/>
      <circle cx="210" cy="${cy-2}" r="18" fill="none" stroke="${c2}" stroke-width="5"/>
      <path d="M173 ${cy-2}h14" stroke="${c1}" stroke-width="5"/>
      <path class="float-right" d="M${W-60} ${cy-40} l30 80" stroke="${c2}" stroke-width="6" opacity="0.5" stroke-linecap="round"/>`,

    cloud: `${bg}
      <path class="tool-swing" d="M132 ${cy+12}c-4-28 38-40 50-18 18-26 60-8 52 24 30 0 30 38-2 38H134c-36 0-38-40-2-44z" fill="white" stroke="${c1}" stroke-width="6"/>
      <path class="float-right" d="M168 ${cy+12}v35M185 ${cy+12}v35M202 ${cy+12}v35" stroke="${c2}" stroke-width="5" stroke-linecap="round"/>
      <path d="M160 ${cy+47} h46" stroke="${c1}" stroke-width="4"/>`,

    car: `${bg}
      <path class="tool-swing" d="M118 ${cy+15} l24-38h80l26 38h16v28H105V${cy+15}z" fill="none" stroke="${c1}" stroke-width="7" stroke-linejoin="round"/>
      <circle cx="145" cy="${cy+44}" r="14" fill="${c2}" stroke="white" stroke-width="3"/>
      <circle cx="225" cy="${cy+44}" r="14" fill="${c2}" stroke="white" stroke-width="3"/>
      <path class="float-right" d="M145 ${cy-26}h45M152 ${cy-10}h30" stroke="${c2}" stroke-width="5" stroke-linecap="round"/>
      <path d="M235 ${cy-15}h30v20h-30z" fill="none" stroke="${c1}" stroke-width="5" class="blink"/>`,

    selfdriving: `${bg}
      <path d="M118 ${cy+15} l24-38h80l26 38h16v28H105V${cy+15}z" fill="none" stroke="${c1}" stroke-width="6" stroke-linejoin="round"/>
      <circle cx="145" cy="${cy+44}" r="13" fill="${c2}" opacity="0.8"/>
      <circle cx="225" cy="${cy+44}" r="13" fill="${c2}" opacity="0.8"/>
      <circle class="pulse-ring" cx="185" cy="${cy-20}" r="22" fill="none" stroke="${c2}" stroke-width="5"/>
      <path class="float-right" d="M178 ${cy-20}h14M185 ${cy-28}v16" stroke="${c1}" stroke-width="5" stroke-linecap="round"/>`,

    robot: `${bg}
      <rect class="tool-swing" x="130" y="${cy-45}" width="95" height="78" rx="18" fill="none" stroke="${c1}" stroke-width="7"/>
      <circle cx="158" cy="${cy-15}" r="10" fill="${c2}" opacity="0.9"/>
      <circle cx="196" cy="${cy-15}" r="10" fill="${c2}" opacity="0.9"/>
      <path d="M158 ${cy+10}h38" stroke="${c1}" stroke-width="5" stroke-linecap="round"/>
      <path d="M177 ${cy-45}V${cy-65}M150 ${cy+33}v22M202 ${cy+33}v22M227 ${cy-15}h35" stroke="${c1}" stroke-width="7" stroke-linecap="round"/>`,

    chip: `${bg}
      <rect class="tool-swing" x="132" y="${cy-50}" width="100" height="100" rx="16" fill="none" stroke="${c1}" stroke-width="7"/>
      <rect x="155" y="${cy-26}" width="56" height="56" rx="8" fill="none" stroke="${c2}" stroke-width="5"/>
      <path d="M115 ${cy-28}h17M115 ${cy-8}h17M115 ${cy+12}h17M115 ${cy+32}h17M247 ${cy-28}h17M247 ${cy-8}h17M247 ${cy+12}h17M247 ${cy+32}h17" stroke="${c2}" stroke-width="5" stroke-linecap="round"/>`,

    energy: `${bg}
      <path class="tool-swing" d="M185 ${cy-50}l-45 55h30l-20 55 65-70h-35z" fill="${c2}" opacity="0.25" stroke="${c2}" stroke-width="5" stroke-linejoin="round"/>
      <circle class="pulse-ring" cx="185" cy="${cy}" r="48" fill="none" stroke="${c1}" stroke-width="4" opacity="0.4"/>
      <path class="float-right" d="M250 ${cy-30}c20 10 25 30 5 42" fill="none" stroke="${c1}" stroke-width="6" stroke-linecap="round"/>`,

    rocket: `${bg}
      <path class="tool-swing" d="M178 ${cy-55}c35 38 37 75 0 115-37-40-35-77 0-115z" fill="none" stroke="${c1}" stroke-width="7"/>
      <circle cx="178" cy="${cy-20}" r="14" fill="${c2}" opacity="0.9"/>
      <path d="M158 ${cy+38}l-25 24M198 ${cy+38}l25 24" stroke="${c2}" stroke-width="7" stroke-linecap="round"/>
      <path class="float-right" d="M220 ${cy-45}h30M238 ${cy-55}v20" stroke="${c1}" stroke-width="5" stroke-linecap="round"/>`,

    chem: `${bg}
      <path class="tool-swing" d="M163 ${cy-50}v40l-36 60h96l-36-60V${cy-50}" fill="none" stroke="${c1}" stroke-width="7"/>
      <path d="M143 ${cy+20}h62" stroke="${c2}" stroke-width="7" stroke-linecap="round"/>
      <circle cx="${W-70}" cy="${cy-20}" r="10" fill="${c2}" opacity="0.9" class="float-right"/>
      <circle cx="${W-50}" cy="${cy-42}" r="6" fill="${c2}" opacity="0.6" class="blink"/>
      <path d="M230 ${cy-10}h30M220 ${cy+10}h40" stroke="${c1}" stroke-width="4" opacity="0.5"/>`,

    machine: `${bg}
      <circle class="tool-swing" cx="180" cy="${cy}" r="45" fill="none" stroke="${c1}" stroke-width="9"/>
      <circle cx="180" cy="${cy}" r="15" fill="${c2}" opacity="0.9"/>
      <path d="M180 ${cy-45}v-25M180 ${cy+45}v25M135 ${cy}h-25M225 ${cy}h25M148 ${cy-32}l-17-17M212 ${cy+32}l17 17" stroke="${c1}" stroke-width="7" stroke-linecap="round"/>`,

    bio: `${bg}
      <path class="tool-swing" d="M142 ${cy-45}c66 22 22 78 86 98M228 ${cy-45}c-66 22-22 78-86 98" fill="none" stroke="${c1}" stroke-width="7"/>
      <path d="M155 ${cy-22}h58M148 ${cy+2}h72M155 ${cy+26}h58" stroke="${c2}" stroke-width="5" stroke-linecap="round"/>
      <circle class="pulse-ring" cx="${W-55}" cy="${cy-20}" r="22" fill="none" stroke="${c2}" stroke-width="5" opacity="0.7"/>`,

    genome: `${bg}
      <path class="tool-swing" d="M150 ${cy-45}c40 0 40 30 0 35s-40 35 0 35M205 ${cy-45}c-40 0-40 30 0 35s40 35 0 35" fill="none" stroke="${c1}" stroke-width="7"/>
      <path d="M158 ${cy-30}h48M150 ${cy-10}h64M158 ${cy+10}h48M150 ${cy+30}h64" stroke="${c2}" stroke-width="5" stroke-linecap="round"/>
      <path class="float-right" d="M245 ${cy-40} l25 80" stroke="${c1}" stroke-width="3" opacity="0.4"/>`,

    eco: `${bg}
      <path class="tool-swing" d="M158 ${cy+30}c-6-60 40-82 86-78-2 58-44 85-86 78z" fill="none" stroke="${c1}" stroke-width="7"/>
      <path d="M164 ${cy+22}c24-28 45-44 76-62" stroke="${c2}" stroke-width="6" stroke-linecap="round"/>
      <path d="M130 ${cy+35}h138" stroke="#94a3b8" stroke-width="5"/>
      <path class="float-right" d="M235 ${cy-30}l20-25M245 ${cy-15}l25-5" stroke="${c2}" stroke-width="4" opacity="0.6" stroke-linecap="round"/>`,

    climate: `${bg}
      <path class="tool-swing" d="M133 ${cy+5}c-4-28 37-40 50-18 17-26 60-8 50 24 28 0 30 38-2 38H135c-35 0-38-40-2-44z" fill="none" stroke="${c1}" stroke-width="7"/>
      <path class="float-right" d="M145 ${cy-38}h36M230 ${cy-34}h30" stroke="${c2}" stroke-width="6" stroke-linecap="round"/>
      <path d="M160 ${cy-45}v20M220 ${cy-42}v18" stroke="${c1}" stroke-width="5" stroke-linecap="round"/>`,

    business: `${bg}
      <rect x="125" y="${cy-45}" width="105" height="70" rx="10" fill="none" stroke="${c1}" stroke-width="7"/>
      <path class="tool-swing" d="M145 ${cy+15}l28-26 22 18 40-45" fill="none" stroke="${c2}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M120 ${cy+35}h130" stroke="#94a3b8" stroke-width="5"/>`,

    marketing: `${bg}
      <path class="tool-swing" d="M128 ${cy}l95-36v80l-95-36z" fill="none" stroke="${c1}" stroke-width="7"/>
      <path d="M223 ${cy-28}h36M223 ${cy+10}h36M223 ${cy+28}h36" stroke="${c2}" stroke-width="6" stroke-linecap="round"/>
      <path d="M130 ${cy+12}l18 42" stroke="${c1}" stroke-width="7" stroke-linecap="round"/>`,

    account: `${bg}
      <rect x="128" y="${cy-48}" width="88" height="95" rx="12" fill="none" stroke="${c1}" stroke-width="7"/>
      <path class="tool-swing" d="M145 ${cy-25}h52M145 ${cy}h52M145 ${cy+25}h28" stroke="${c2}" stroke-width="5" stroke-linecap="round"/>
      <rect class="float-right" x="${W-80}" y="${cy-30}" width="55" height="55" rx="8" fill="none" stroke="${c1}" stroke-width="6"/>
      <path d="M${W-68} ${cy-10}h30M${W-68} ${cy+10}h20" stroke="${c2}" stroke-width="4" stroke-linecap="round"/>`,

    invest: `${bg}
      <path class="tool-swing" d="M130 ${cy+30}V${cy-15}l30-20 30 25 35-40 30 20V${cy+30}" fill="none" stroke="${c1}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M125 ${cy+35}h150" stroke="#94a3b8" stroke-width="5"/>
      <circle cx="160" cy="${cy-15}" r="7" fill="${c2}"/>
      <circle cx="190" cy="${cy+10}" r="7" fill="${c2}"/>
      <circle cx="225" cy="${cy-30}" r="7" fill="${c2}"/>`,

    startup: `${bg}
      <path class="tool-swing" d="M178 ${cy-50}c35 38 37 75 0 115-37-40-35-77 0-115z" fill="none" stroke="${c1}" stroke-width="6"/>
      <circle cx="178" cy="${cy-25}" r="12" fill="${c2}" opacity="0.8"/>
      <path d="M160 ${cy+30}l-20 22M196 ${cy+30}l20 22" stroke="${c2}" stroke-width="6" stroke-linecap="round"/>
      <path class="float-right" d="M235 ${cy-20}l15-20M248 ${cy-38}l-5 20M243 ${cy-40}l20 0" stroke="${c1}" stroke-width="5" stroke-linecap="round"/>`,

    teacher: `${bg}
      <rect x="122" y="${cy-45}" width="132" height="78" rx="9" fill="white" opacity="0.7" stroke="${c1}" stroke-width="7"/>
      <path class="tool-swing" d="M140 ${cy-22}h96M140 ${cy+2}h65M140 ${cy+26}h45" stroke="${c2}" stroke-width="6" stroke-linecap="round"/>
      <path d="M105 ${cy-5}l35-22" stroke="${c1}" stroke-width="7" stroke-linecap="round"/>`,

    welfare: `${bg}
      <path class="tool-swing" d="M178 ${cy-30}c0 0-40 18-40 46s18 30 40 30 40-2 40-30-40-46-40-46z" fill="none" stroke="${c1}" stroke-width="7"/>
      <path d="M160 ${cy+15}h36M178 ${cy}v30" stroke="${c2}" stroke-width="6" stroke-linecap="round"/>
      <circle class="pulse-ring" cx="178" cy="${cy}" r="50" fill="none" stroke="${c2}" stroke-width="3" opacity="0.3"/>`,

    counsel: `${bg}
      <path d="M128 ${cy-5}h112a18 18 0 0 1 0 36h-68l-30 22v-22h-14a18 18 0 0 1 0-36z" fill="white" stroke="${c1}" stroke-width="7"/>
      <path class="tool-swing" d="M152 ${cy+14}h72" stroke="${c2}" stroke-width="6" stroke-linecap="round"/>
      <circle cx="${W-70}" cy="${cy-35}" r="18" fill="none" stroke="${c1}" stroke-width="6" class="float-right"/>
      <path d="M${W-70} ${cy-44}v9M${W-74} ${cy-35}h8" stroke="${c2}" stroke-width="4" stroke-linecap="round"/>`,

    special: `${bg}
      <path class="tool-swing" d="M145 ${cy-40}h75v75h-75z" fill="none" stroke="${c1}" stroke-width="7"/>
      <path d="M162 ${cy-18}h42M162 ${cy+5}h42M162 ${cy+28}h28" stroke="${c2}" stroke-width="6" stroke-linecap="round"/>
      <path d="M230 ${cy-40}l30-15v75l-30-15" fill="none" stroke="${c1}" stroke-width="6"/>`,

    law: `${bg}
      <path class="tool-swing" d="M178 ${cy-52}v98M130 ${cy-26}h96M145 ${cy-26}l-28 50h56zM212 ${cy-26}l-28 50h56z" fill="none" stroke="${c1}" stroke-width="7" stroke-linecap="round"/>
      <path d="M146 ${cy+44}h64" stroke="${c2}" stroke-width="7" stroke-linecap="round"/>`,

    diplomat: `${bg}
      <circle class="tool-swing" cx="185" cy="${cy}" r="46" fill="none" stroke="${c1}" stroke-width="7"/>
      <path d="M139 ${cy}h92M185 ${cy-46}c-20 20-20 72 0 92M185 ${cy-46}c20 20 20 72 0 92M140 ${cy-22}h90M140 ${cy+22}h90" stroke="${c2}" stroke-width="5" stroke-linecap="round"/>`,

    police: `${bg}
      <path class="tool-swing" d="M178 ${cy-52}l53 24v36c0 26-19 42-53 56-34-14-53-30-53-56V${cy-28}z" fill="none" stroke="${c1}" stroke-width="7" stroke-linejoin="round"/>
      <path d="M155 ${cy+6}h46M178 ${cy-18}v46" stroke="${c2}" stroke-width="6" stroke-linecap="round"/>`,

    fire: `${bg}
      <path class="tool-swing" d="M176 ${cy+48}c-40-28-8-60-4-86 28 28 64 56 4 86z" fill="none" stroke="${c1}" stroke-width="7"/>
      <path class="float-right" d="M220 ${cy-5}h52M248 ${cy-5}v36" stroke="${c2}" stroke-width="7" stroke-linecap="round"/>
      <circle class="pulse-ring" cx="176" cy="${cy}" r="40" fill="none" stroke="${c2}" stroke-width="3" opacity="0.3"/>`,

    vet: `${bg}
      <path class="tool-swing" d="M143 ${cy+25}c0-36 70-36 70 0M150 ${cy-12}l-22-20M210 ${cy-12}l22-20" fill="none" stroke="${c1}" stroke-width="7"/>
      <circle cx="162" cy="${cy+5}" r="7" fill="${c2}" opacity="0.9"/>
      <circle cx="198" cy="${cy+5}" r="7" fill="${c2}" opacity="0.9"/>
      <path d="M178 ${cy+18}h8" stroke="${c2}" stroke-width="6" stroke-linecap="round"/>
      <path d="M82 ${cy-5}c-20 12-22 32-22 32" stroke="${c1}" stroke-width="6" fill="none"/>`,

    food: `${bg}
      <path class="tool-swing" d="M138 ${cy-48}v75M163 ${cy-48}v75M125 ${cy-18}h52M212 ${cy-50}c32 26 32 58 0 80" fill="none" stroke="${c1}" stroke-width="7" stroke-linecap="round"/>
      <circle cx="${W-48}" cy="${cy}" r="28" fill="none" stroke="${c2}" stroke-width="7" class="float-right"/>`,

    farm: `${bg}
      <path class="tool-swing" d="M132 ${cy+35}c6-44 34-67 72-72 8 44-22 68-72 72z" fill="none" stroke="${c1}" stroke-width="7"/>
      <rect x="${W-90}" y="${cy-38}" width="55" height="50" rx="10" fill="none" stroke="${c2}" stroke-width="7" class="float-right"/>
      <path d="M${W-68} ${cy-38}v-20M${W-58} ${cy-15}h26` + `" stroke="${c2}" stroke-width="5" stroke-linecap="round"/>`,

    design: `${bg}
      <rect class="tool-swing" x="128" y="${cy-48}" width="98" height="82" rx="18" fill="none" stroke="${c1}" stroke-width="7"/>
      <path d="M250 ${cy-48}l-44 88" stroke="${c2}" stroke-width="8" stroke-linecap="round"/>
      <circle cx="252" cy="${cy-48}" r="11" fill="${c2}" opacity="0.9"/>
      <circle cx="208" cy="${cy+40}" r="7" fill="${c1}" opacity="0.7"/>`,

    product: `${bg}
      <path class="tool-swing" d="M178 ${cy-50}l62 36v58l-62 36-62-36V${cy-14}z" fill="none" stroke="${c1}" stroke-width="7" stroke-linejoin="round"/>
      <path d="M116 ${cy-14}l62 36 62-36M178 ${cy+22}v58" stroke="${c2}" stroke-width="6" stroke-linecap="round"/>`,

    art: `${bg}
      <path class="tool-swing" d="M128 ${cy+32}c14-55 86-82 120-46 18 20-6 44-30 35-12-4-18 2-18 14" fill="none" stroke="${c1}" stroke-width="7"/>
      <circle cx="156" cy="${cy+5}" r="8" fill="${c2}"/>
      <circle cx="184" cy="${cy-12}" r="8" fill="${c2}"/>
      <circle cx="218" cy="${cy-8}" r="8" fill="${c2}"/>
      <path class="float-right" d="M${W-55} ${cy-40}l-8 80" stroke="${c1}" stroke-width="5" opacity="0.3" stroke-linecap="round"/>`,

    fashion: `${bg}
      <path class="tool-swing" d="M155 ${cy-48}l-30 25h15v70h76V${cy-23}h15z" fill="none" stroke="${c1}" stroke-width="7" stroke-linejoin="round"/>
      <path d="M155 ${cy-48}c10 15 25 15 35 0" fill="none" stroke="${c2}" stroke-width="6" stroke-linecap="round"/>
      <path class="float-right" d="M235 ${cy-20}h35M242 ${cy-2}h28M248 ${cy+16}h20" stroke="${c2}" stroke-width="5" stroke-linecap="round"/>`,

    camera: `${bg}
      <rect x="125" y="${cy-38}" width="96" height="62" rx="13" fill="none" stroke="${c1}" stroke-width="7"/>
      <circle cx="173" cy="${cy-7}" r="20" fill="none" stroke="${c2}" stroke-width="6" class="pulse-ring"/>
      <path class="tool-swing" d="M221 ${cy-25}l50-26v72l-50-26z" fill="none" stroke="${c1}" stroke-width="7"/>`,

    journal: `${bg}
      <path d="M128 ${cy-48}h96v78h-96z" fill="white" opacity="0.6" stroke="${c1}" stroke-width="7"/>
      <path class="tool-swing" d="M148 ${cy-25}h58M148 ${cy-5}h58M148 ${cy+15}h38" stroke="${c2}" stroke-width="5" stroke-linecap="round"/>
      <path class="float-right" d="M238 ${cy-25}l36 32" stroke="${c1}" stroke-width="8" stroke-linecap="round"/>`,

    game: `${bg}
      <path class="tool-swing" d="M126 ${cy}c18-30 95-30 112 0l15 42c5 14-16 24-28 7l-10-14h-82l-10 14c-12 17-33 7-28-7z" fill="none" stroke="${c1}" stroke-width="7"/>
      <circle cx="150" cy="${cy+12}" r="7" fill="${c2}" opacity="0.9"/>
      <path d="M208 ${cy+10}h28M222 ${cy-4}v28" stroke="${c2}" stroke-width="6" stroke-linecap="round"/>`,

    creator: `${bg}
      <circle class="tool-swing" cx="178" cy="${cy-5}" r="40" fill="none" stroke="${c1}" stroke-width="7"/>
      <path d="M162 ${cy+15}l16-25 16 25-16-8z" fill="${c2}" opacity="0.9"/>
      <path class="float-right" d="M230 ${cy-35}h30M240 ${cy-18}h20M245 ${cy}h15" stroke="${c2}" stroke-width="6" stroke-linecap="round"/>`,

    architect: `${bg}
      <path class="tool-swing" d="M128 ${cy+28}V${cy-22}h60v50M188 ${cy-10}l52 26v12" fill="none" stroke="${c1}" stroke-width="7"/>
      <path d="M124 ${cy+40}c38 10 74-12 115 0" stroke="#94a3b8" stroke-width="5"/>
      <path class="float-right" d="M148 ${cy-48}h66M248 ${cy-35}h28" stroke="${c2}" stroke-width="6" stroke-linecap="round"/>`,

    urban: `${bg}
      <rect x="125" y="${cy-45}" width="118" height="80" rx="10" fill="white" opacity="0.5" stroke="${c1}" stroke-width="7"/>
      <path class="tool-swing" d="M140 ${cy-10}h88M160 ${cy-45}v80M206 ${cy-45}v80M140 ${cy+20}l88-50" stroke="${c2}" stroke-width="5" stroke-linecap="round"/>
      <circle cx="206" cy="${cy}" r="11" fill="${c1}" opacity="0.8"/>`,

    traffic: `${bg}
      <rect x="155" y="${cy-52}" width="46" height="104" rx="20" fill="none" stroke="${c1}" stroke-width="7"/>
      <circle cx="178" cy="${cy-28}" r="10" fill="#ef4444"/>
      <circle cx="178" cy="${cy}" r="10" fill="#f59e0b"/>
      <circle cx="178" cy="${cy+28}" r="10" fill="#22c55e"/>
      <path class="float-right" d="M215 ${cy+40}c32-48 62-48 80 0" stroke="${c2}" stroke-width="7" fill="none" stroke-linecap="round"/>`,

    sport: `${bg}
      <path class="tool-swing" d="M148 ${cy-15}l35 35 42-47M183 ${cy+20}l-35 42M183 ${cy+20}l48 32" fill="none" stroke="${c1}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="148" cy="${cy-30}" r="16" fill="${c2}" opacity="0.9"/>
      <path class="float-right" d="M240 ${cy-25}h42" stroke="${c2}" stroke-width="7" stroke-linecap="round"/>`,

    esport: `${bg}
      <path class="tool-swing" d="M125 ${cy}c18-32 96-32 114 0l14 44c5 14-16 24-28 7l-10-14h-82l-10 14c-12 17-33 7-28-7z" fill="none" stroke="${c1}" stroke-width="7"/>
      <circle cx="148" cy="${cy+14}" r="7" fill="${c2}"/>
      <path d="M205 ${cy+12}h30M220 ${cy-2}v28" stroke="${c2}" stroke-width="6" stroke-linecap="round"/>
      <path class="float-right" d="M255 ${cy-40}l20-20M258 ${cy-15}l25 5" stroke="${c1}" stroke-width="5" stroke-linecap="round"/>`,

    tour: `${bg}
      <rect x="128" y="${cy-45}" width="100" height="78" rx="10" fill="none" stroke="${c1}" stroke-width="7"/>
      <path class="tool-swing" d="M155 ${cy-45}v78M200 ${cy-45}v78M128 ${cy-5}h100" stroke="${c2}" stroke-width="5" stroke-linecap="round"/>
      <path class="float-right" d="M252 ${cy-30}l28-24v57z" fill="none" stroke="${c1}" stroke-width="7"/>`,
  };

  const body = svgs[type] || svgs.developer;
  return `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">${body}</svg>`;
}

// ─── 시작 ─────────────────────────────────────────
window.addEventListener('DOMContentLoaded', init);
