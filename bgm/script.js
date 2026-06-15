/*============================================================
  script.js — IF THAT DAY
  pages : day1.html | day2.html | day3.html | day4.html | ending.html
  구조  : 일차 > 장소 > 코드
============================================================*/

/* ===== SHARED: VOICES ===== */
const VOICES = {
    mono:     { freq: 200, rand: 10,  type: 'sine',     gain: 0.10, dur: 0.08 },
    player:   { freq: 220, rand: 15,  type: 'sine',     gain: 0.12, dur: 0.08 },
    wife:     { freq: 480, rand: 20,  type: 'triangle', gain: 0.12, dur: 0.07 },
    daughter: { freq: 520, rand: 25,  type: 'triangle', gain: 0.10, dur: 0.07 },
    cowork:   { freq: 280, rand: 25,  type: 'sine',     gain: 0.12, dur: 0.08 },
}

/* ===== SHARED: DialogManager ===== */
class DialogManager {
    constructor({ sound = true } = {}) {
        this.sound         = sound
        this._audioCtx     = null
        this._script       = []
        this._lineIdx      = 0
        this._tokens       = []
        this._tokIdx       = 0
        this._typing       = false
        this._timer        = null
        this._onFinish     = null
        this._activeBubble = null
        this._activeType   = null
        this._monoEl       = document.getElementById('monologue')
        this._advance = this._advance.bind(this)
        document.addEventListener('click', this._advance)
        document.addEventListener('keydown', e => {
            if (['Space', 'Enter', 'ArrowRight'].includes(e.code)) { e.preventDefault(); this._advance() }
        })
    }
    play(script, onFinish) {
        this._script = script; this._lineIdx = 0; this._onFinish = onFinish || null
        this._showLine(0)
    }
    get isActive() { return this._activeBubble !== null || (this._monoEl && !this._monoEl.hidden) }
    _showLine(idx) {
        let line = this._script[idx]
        if (!line) { this._finish(); return }
        clearTimeout(this._timer)
        this._removeActive()
        this._activeType = line.type || 'talk'
        this._tokens = this._parseMarkup(line.text || '')
        this._tokIdx = 0
        this._typing = true
        if (this._activeType === 'mono') { this._monoEl.innerHTML = ''; this._monoEl.hidden = false }
        else this._startTalk(line)
        this._typeNext(line)
    }
    _startTalk(line) {
        let charEl = document.getElementById(line.charId)
        if (!charEl) { console.warn(`charId "${line.charId}" not found`); return }
        let bubble = document.createElement('div')
        bubble.className = 'speech-bubble'
        if (line.bubbleColor) bubble.style.setProperty('--bubble-border', line.bubbleColor)
        if (line.speaker) {
            let name = document.createElement('div')
            name.className = 'speech-name'
            name.textContent = line.speaker
            if (line.nameColor) name.style.color = line.nameColor
            bubble.appendChild(name)
        }
        let textEl = document.createElement('div'); textEl.className = 'speech-text'; bubble.appendChild(textEl)
        let hint = document.createElement('span'); hint.className = 'speech-hint'; hint.textContent = ' ▼'; hint.style.display = 'none'; bubble.appendChild(hint)
        bubble.appendChild(document.createElement('div')).className = 'speech-choices'
        charEl.appendChild(bubble)
        this._activeBubble = bubble
        requestAnimationFrame(() => bubble.classList.add('speech-bubble--in'))
    }
    _typeNext(line) {
        if (this._tokIdx >= this._tokens.length) { this._typing = false; this._onTypingComplete(line); return }
        let token = this._tokens[this._tokIdx++]
        if (token.type === 'pause') { this._timer = setTimeout(() => this._typeNext(line), token.duration); return }
        let span = document.createElement('span'); span.textContent = token.char
        if (token.effects.includes('wave'))  span.classList.add('dlg-wave')
        if (token.effects.includes('shake')) span.classList.add('dlg-shake')
        let target = this._activeType === 'mono' ? this._monoEl : this._activeBubble?.querySelector('.speech-text')
        if (target) target.appendChild(span)
        let voice = line.voice ?? (this._activeType === 'mono' ? 'mono' : 'player')
        if (token.char.trim()) this._playTick(voice)
        let delay = token.effects.includes('fast') ? 22 : token.effects.includes('slow') ? 110 : 52
        this._timer = setTimeout(() => this._typeNext(line), delay)
    }
    _onTypingComplete(line) {
        if (this._activeType === 'mono') {
            let hint = document.createElement('span'); hint.className = 'mono-hint'; hint.textContent = ' ▼'
            this._monoEl.appendChild(hint)
        } else {
            let bubble = this._activeBubble; if (!bubble) return
            if (line.choices?.length) {
                let container = bubble.querySelector('.speech-choices')
                line.choices.forEach(choice => {
                    let btn = document.createElement('button'); btn.className = 'dlg-choice-btn'; btn.textContent = choice.label
                    btn.addEventListener('click', e => {
                        e.stopPropagation(); container.innerHTML = ''
                        if (typeof choice.next === 'number') { this._lineIdx = choice.next; this._showLine(this._lineIdx) }
                        else if (typeof choice.next === 'function') { choice.next(this) }
                        else { this._lineIdx++; this._showLine(this._lineIdx) }
                    })
                    container.appendChild(btn)
                })
            } else {
                let hint = bubble.querySelector('.speech-hint')
                bubble.querySelector('.speech-text').appendChild(hint)
                hint.style.display = 'inline'
            }
        }
    }
    _advance(e) {
        if (e && e.target.classList.contains('dlg-choice-btn')) return
        if (e && e.target.closest?.('#phone-overlay')) return
        if (!this.isActive) return
        let line = this._script[this._lineIdx]; if (!line) return
        if (this._typing) {
            clearTimeout(this._timer); this._typing = false
            let target = this._activeType === 'mono' ? this._monoEl : this._activeBubble?.querySelector('.speech-text')
            if (target) {
                target.innerHTML = ''
                this._tokens.forEach(t => {
                    if (t.type === 'pause') return
                    let span = document.createElement('span'); span.textContent = t.char
                    if (t.effects.includes('wave'))  span.classList.add('dlg-wave')
                    if (t.effects.includes('shake')) span.classList.add('dlg-shake')
                    target.appendChild(span)
                })
            }
            this._onTypingComplete(line); return
        }
        if (this._activeType === 'talk') {
            let choices = this._activeBubble?.querySelector('.speech-choices')
            if (choices && choices.children.length) return
        }
        this._lineIdx++; this._showLine(this._lineIdx)
    }
    _removeActive() {
        if (this._activeBubble) {
            let old = this._activeBubble; old.classList.remove('speech-bubble--in'); old.classList.add('speech-bubble--out')
            setTimeout(() => old.remove(), 180); this._activeBubble = null
        }
        if (this._monoEl && !this._monoEl.hidden) { this._monoEl.hidden = true; this._monoEl.innerHTML = '' }
    }
    _finish() { this._removeActive(); this._activeType = null; if (typeof this._onFinish === 'function') this._onFinish() }
    _parseMarkup(text) {
        let tokens = [], effects = [], i = 0
        while (i < text.length) {
            if (text[i] === '[') {
                let end = text.indexOf(']', i)
                if (end !== -1) {
                    let raw = text.slice(i + 1, end)
                    if (raw.startsWith('pause')) { tokens.push({ type: 'pause', duration: parseInt(raw.split('=')[1]) || 300 }); i = end + 1; continue }
                    if (raw.startsWith('/')) { effects = effects.filter(e => e !== raw.slice(1)); i = end + 1; continue }
                    if (['wave','shake','fast','slow'].includes(raw)) { effects.push(raw); i = end + 1; continue }
                }
            }
            tokens.push({ type: 'char', char: text[i], effects: [...effects] }); i++
        }
        return tokens
    }
    _getAudioCtx() {
        if (!this._audioCtx) this._audioCtx = new (window.AudioContext || window.webkitAudioContext)()
        return this._audioCtx
    }
    _playTick(voice) {
        if (!this.sound) return
        let v = (typeof voice === 'string') ? (VOICES[voice] ?? VOICES.mono) : voice
        try {
            let ctx = this._getAudioCtx(), osc = ctx.createOscillator(), gain = ctx.createGain()
            osc.connect(gain); gain.connect(ctx.destination)
            osc.type = v.type ?? 'sine'
            osc.frequency.setValueAtTime((v.freq ?? 440) + (Math.random() * (v.rand ?? 20) - (v.rand ?? 20) / 2), ctx.currentTime)
            let dur = v.dur ?? 0.08
            gain.gain.setValueAtTime(v.gain ?? 0.04, ctx.currentTime)
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur)
            osc.start(ctx.currentTime); osc.stop(ctx.currentTime + dur + 0.01)
        } catch (_) {}
    }
}

/* ===== SHARED: SCRIPTS ===== */
let SCRIPTS = {}
async function loadScripts() {
    try { let res = await fetch('./data/scripts.json'); SCRIPTS = await res.json() }
    catch (e) { console.warn('scripts.json 로드 실패:', e) }
}

/* ===== PAGE 감지 ===== */
const PAGE = (() => {
    const p = location.pathname.toLowerCase()
    if (p.includes('index') || p.endsWith('/') || p === '') return 'index'
    if (p.includes('day1'))   return 'day1'
    if (p.includes('day2'))   return 'day2'
    if (p.includes('day3'))   return 'day3'
    if (p.includes('day4'))   return 'day4'
    if (p.includes('ending')) return 'ending'
    return 'day1'
})()

/* ===== 엔딩 ===== */
function restart() {
    sessionStorage.removeItem('bakeryVisited')
    window.location.href = 'day1.html'
}


/* ============================================================
   1일차  day1.html
   방1 → 복도1 → 부엌1 → 회사 → 빵집 → 부엌2 → 복도2 → 방2/딸방
   ============================================================ */
if (PAGE === 'day1') { ;(function() {

    /* ===== BGM ===== */
    const bgm = new Audio('bgm/folk_acoustic-old-oak-149259.mp3')
    bgm.loop = true; bgm.volume = 0.4
    function fadeBGM() {
        let t = setInterval(() => { bgm.volume = Math.max(0, bgm.volume - 0.02); if (bgm.volume <= 0) { bgm.pause(); bgm.volume = 0.4; clearInterval(t) } }, 50)
    }

    /* ===== 공통 상태 ===== */
    const dlg      = new DialogManager({ sound: true })
    const player   = document.getElementById('player')
    const promptEl = document.getElementById('interact-prompt')
    const promptTEl = document.getElementById('interact-prompt-text')

    let step = 9, playerX = 400, isFacingLeft = false, isMoving = false, isLocked = false
    let keysPressed = {}, isTransitioning = false
    let currentModule = '', activeChapter = null, S = {}
    let currentMode = 'home'  // 'home' | 'company' | 'bakery'

    const minX = 0, maxX = 1920 - 288

    /* ===== 공통 헬퍼 ===== */
    const el = id => document.getElementById(id)
    function isNear(t) {
        if (!t) return false
        let pL = player.offsetLeft, pR = pL + player.offsetWidth
        return pR > t.offsetLeft && pL < t.offsetLeft + t.offsetWidth
    }
    function showPrompt(text, anchor) {
        promptTEl.textContent = text
        let r = anchor.getBoundingClientRect()
        promptEl.style.left = (r.left + r.width / 2) + 'px'
        promptEl.style.top  = (r.top - 20) + 'px'
        promptEl.classList.remove('hidden')
    }
    function hidePrompt() { promptEl.classList.add('hidden') }
    function playKnockSound() {
        try {
            let ctx = dlg._getAudioCtx()
            for (let i = 0; i < 3; i++) {
                let t = ctx.currentTime + i * 0.28
                let osc = ctx.createOscillator(), gain = ctx.createGain()
                osc.connect(gain); gain.connect(ctx.destination)
                osc.type = 'sine'; osc.frequency.setValueAtTime(200, t); osc.frequency.exponentialRampToValueAtTime(60, t + 0.09)
                gain.gain.setValueAtTime(0.45, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12)
                osc.start(t); osc.stop(t + 0.15)
            }
        } catch (_) {}
    }
    function applyClosetState(roomId) {
        let closetId = roomId === 'room-1' ? 'closet-1' : 'closet-2'
        let closet = el(closetId)
        if (!closet) return
        closet.classList.toggle('active', S.closetState >= 1)
        player.classList.toggle('costume-alt', S.closetState >= 2)
        let overlay = el('closet-open-overlay')
        if (overlay) overlay.classList.toggle('hidden', S.closetState < 1)
    }
    function playCutscene(imgSrc, cutClass, boxCount, onComplete) {
        isLocked = true
        let overlay = document.createElement('div'); overlay.className = 'cutscene-overlay'
        let img = document.createElement('img'); img.src = imgSrc; img.className = 'cutscene-img'; overlay.appendChild(img)
        let boxes = []
        for (let i = 1; i <= boxCount; i++) {
            let box = document.createElement('div'); box.className = `cutscene-box ${cutClass}-box-${i}`
            overlay.appendChild(box); boxes.push(box)
        }
        document.body.appendChild(overlay)
        let cur = 0, ending = false
        function advance() {
            if (ending) return
            if (cur < boxes.length) {
                let box = boxes[cur]; box.classList.add('cutscene-box--out')
                box.addEventListener('animationend', () => box.remove(), { once: true }); cur++
            } else {
                ending = true
                document.removeEventListener('keydown', kh)
                overlay.classList.add('cutscene-overlay--out')
                overlay.addEventListener('animationend', () => { overlay.remove() }, { once: true })
                setTimeout(onComplete, 0)
            }
        }
        function kh(e) { if (['Space','Enter','ArrowRight'].includes(e.code)) { e.preventDefault(); advance() } }
        overlay.addEventListener('click', advance); document.addEventListener('keydown', kh)
    }
    function doSwitchModule(toModule, entryX) {
        if (isTransitioning) return; isTransitioning = true
        let fromEl = el(SceneModules[currentModule].htmlId)
        let toEl   = el(SceneModules[toModule].htmlId)
        let from   = currentModule
        playerX = entryX; player.style.left = playerX + 'px'; toEl.appendChild(player)
        fromEl.classList.add('fade-out')
        fromEl.addEventListener('animationend', () => {
            fromEl.classList.remove('active', 'fade-out'); toEl.classList.add('active')
            currentModule = toModule
            setTimeout(() => { isTransitioning = false; SceneModules[toModule].onEnter?.(from) }, 200)
        }, { once: true })
    }

    /* ===== 회사 음향 ===== */
    let ringInterval = null
    function playRingTone() {
        try {
            let ctx = dlg._getAudioCtx(), t = ctx.currentTime + 0.05
            ;[0, 0.35, 1.0, 1.35].forEach(off => {
                let osc = ctx.createOscillator(), gain = ctx.createGain()
                osc.connect(gain); gain.connect(ctx.destination)
                osc.type = 'sine'; osc.frequency.value = 880
                gain.gain.setValueAtTime(0.18, t + off); gain.gain.exponentialRampToValueAtTime(0.001, t + off + 0.25)
                osc.start(t + off); osc.stop(t + off + 0.28)
            })
        } catch (_) {}
    }
    function startRingLoop() { playRingTone(); ringInterval = setInterval(playRingTone, 2000) }
    function stopRingLoop()  { clearInterval(ringInterval); ringInterval = null }
    function playHangupSound() {
        try {
            let ctx = dlg._getAudioCtx(), t = ctx.currentTime + 0.02
            let osc = ctx.createOscillator(), gain = ctx.createGain()
            osc.connect(gain); gain.connect(ctx.destination)
            osc.type = 'sine'; osc.frequency.setValueAtTime(440, t); osc.frequency.exponentialRampToValueAtTime(200, t + 0.3)
            gain.gain.setValueAtTime(0.15, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3)
            osc.start(t); osc.stop(t + 0.35)
        } catch (_) {}
    }
    function playNotifSound() {
        try {
            let ctx = dlg._getAudioCtx(), t = ctx.currentTime + 0.05
            let osc = ctx.createOscillator(), gain = ctx.createGain()
            osc.connect(gain); gain.connect(ctx.destination)
            osc.type = 'sine'; osc.frequency.setValueAtTime(1320, t); osc.frequency.exponentialRampToValueAtTime(880, t + 0.35)
            gain.gain.setValueAtTime(0.25, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8)
            osc.start(t); osc.stop(t + 0.85)
        } catch (_) {}
    }

    /* ===== 방 1 ===== */
    // closet interaction / morning dialogue — handled in SceneModules['room-1']

    /* ===== 복도 1 ===== */
    // 통과 전용 — SceneModules['hallway-1']

    /* ===== 부엌 1 (아침) ===== */
    // 밥 먹기 / rightExit → goToCompany — SceneModules['kitchen-1']

    /* ===== 회사 ===== */
    let awaitingPhoneCheck = false
    function goToCompany() {
        isLocked = true
        let ov = el('company-loading'); ov.removeAttribute('hidden')
        el('company-loading-bar').addEventListener('animationend', () => {
            setTimeout(() => {
                el(SceneModules[currentModule].htmlId).classList.remove('active')
                let cs = el('scene-company'); cs.classList.add('active'); cs.appendChild(player)
                playerX = 640; player.style.left = playerX + 'px'; isFacingLeft = false
                currentMode = 'company'
                ov.style.transition = 'opacity 0.3s'; ov.style.opacity = '0'
                ov.addEventListener('transitionend', () => {
                    ov.setAttribute('hidden', ''); ov.style.opacity = ''; ov.style.transition = ''
                    startCompanyScene()
                }, { once: true })
            }, 800)
        }, { once: true })
    }
    function startCompanyScene() {
        isLocked = true; awaitingPhoneCheck = false
        dlg.play(SCRIPTS.company_meeting ?? [], () => {
            playRingTone()
            setTimeout(() => {
                dlg.play(SCRIPTS.company_ring_interrupt ?? [], () => {
                    el('phone-overlay').classList.remove('hidden'); startRingLoop()
                })
            }, 700)
        })
    }
    function handleCompanyEKey() {
        if (!awaitingPhoneCheck) return
        awaitingPhoneCheck = false; hidePrompt()
        let lockScreen = el('phone-lock-screen'); lockScreen.classList.remove('hidden')
        lockScreen.addEventListener('click', e => {
            e.stopPropagation(); lockScreen.classList.add('hidden')
            dlg.play(SCRIPTS.company_day1_after_notif ?? [{ type: 'mono', text: '들어가는 길에 케이크를 사가야겠네.' }], () => {
                goToBakery()
            })
        }, { once: true })
    }

    /* ===== 빵집 ===== */
    let selectedCake = null, hasPaid = false
    function goToBakery() {
        el('scene-company').classList.remove('active')
        let ov = el('bakery-loading'); ov.removeAttribute('hidden')
        el('bakery-loading-bar').addEventListener('animationend', () => {
            setTimeout(() => {
                let bs = el('scene-bakery'); bs.classList.add('active'); bs.appendChild(player)
                playerX = 100; player.style.left = playerX + 'px'
                isFacingLeft = false; currentMode = 'bakery'
                selectedCake = null; hasPaid = false
                document.querySelectorAll('.cake-item.picked').forEach(c => c.classList.remove('picked'))
                ov.style.transition = 'opacity 0.3s'; ov.style.opacity = '0'
                ov.addEventListener('transitionend', () => {
                    ov.setAttribute('hidden', ''); ov.style.opacity = ''; ov.style.transition = ''
                    isLocked = false
                }, { once: true })
            }, 800)
        }, { once: true })
    }
    function isCakeNear(c) {
        let cx = parseInt(c.dataset.cx ?? 500), half = 150
        let pL = player.offsetLeft, pR = pL + player.offsetWidth
        return pR > cx - half && pL < cx + half
    }
    function handleBakeryEKey() {
        if (!selectedCake) {
            let nearby = [...document.querySelectorAll('.cake-item:not(.picked)')].find(c => isCakeNear(c))
            if (nearby) {
                selectedCake = nearby.dataset.name
                nearby.classList.add('picked')
                dlg.play([{ type: 'mono', text: `${selectedCake}를 집어 들었다.` }], null)
            }
            return
        }
        let cashier = el('cashier')
        if (isNear(cashier) && !hasPaid) { hasPaid = true; dlg.play([{ type: 'mono', text: '계산을 마쳤다.' }], null) }
    }
    function checkBakeryExit() {
        if (isLocked) return
        if (playerX <= 0) {
            if (hasPaid) { isLocked = true; goToEvening(true) }
            else {
                playerX = 20
                if (!dlg.isActive && !isLocked) {
                    isLocked = true
                    let msg = selectedCake ? '계산을 먼저 해야겠다.' : '케이크를 먼저 골라야겠다.'
                    dlg.play([{ type: 'mono', text: msg }], () => { isLocked = false })
                }
            }
        }
    }
    function updateBakeryPrompts() {
        if (isLocked || dlg.isActive) { hidePrompt(); return }
        let cashier = el('cashier')
        if (!selectedCake) {
            let nearby = [...document.querySelectorAll('.cake-item:not(.picked)')].find(c => isCakeNear(c))
            if (nearby) { showPrompt(`E — ${nearby.dataset.name}`, player); return }
        }
        if (selectedCake && !hasPaid && isNear(cashier)) { showPrompt('E — 계산하기', cashier); return }
        hidePrompt()
    }

    /* ===== 저녁 전환 ===== */
    function goToEvening(hasCake) {
        isLocked = true
        document.querySelectorAll('.scene.active').forEach(s => s.classList.remove('active'))
        el('scene-bakery').classList.remove('active')
        let ov = el('home-loading'); ov.removeAttribute('hidden')
        el('home-loading-bar').addEventListener('animationend', () => {
            setTimeout(() => {
                let k2 = el('scene-kitchen-2'); k2.classList.add('active'); k2.appendChild(player)
                playerX = 900; isFacingLeft = true; player.style.left = playerX + 'px'
                currentMode = 'home'; currentModule = 'kitchen-2'
                S = {
                    cakePlaced:         !hasCake,
                    kitchenEntryPlayed: false,
                    hasKnocked:         false,
                    roomLit:            false,
                    closetState:        2,
                }
                activeChapter = eveningChapter
                ov.style.transition = 'opacity 0.3s'; ov.style.opacity = '0'
                ov.addEventListener('transitionend', () => {
                    ov.setAttribute('hidden', ''); ov.style.opacity = ''; ov.style.transition = ''
                    isLocked = false
                    SceneModules['kitchen-2'].onEnter(null)
                }, { once: true })
            }, 800)
        }, { once: true })
    }

    /* ===== 방 2 / 복도 2 / 부엌 2 / 딸의 방 ===== */
    // evening modules — handled in SceneModules below

    /* ===== SceneModules ===== */
    const SceneModules = {
        /* 방 1 */
        'room-1': {
            htmlId: 'scene-room-1',
            onEnter(from) {
                if (!S.morningPlayed) {
                    S.morningPlayed = true; isLocked = true
                    dlg.play(SCRIPTS.day1_room_morning ?? [], () => { isLocked = false })
                }
            },
            canExitRight() {
                if (S.closetState < 2) {
                    playerX = maxX - 200
                    if (!isLocked && !dlg.isActive) { isLocked = true; dlg.play(SCRIPTS.no_clothes_exit ?? [], () => { isLocked = false }) }
                    return false
                }
                return true
            },
            getPrompt() {
                let c = el('closet-1'); if (!isNear(c)) return null
                if (S.closetState === 0) return { text: 'E — 옷장 열기',    anchor: c }
                if (S.closetState === 1) return { text: 'E — 옷 갈아입기', anchor: c }
                return null
            },
            onEKey() {
                let c = el('closet-1')
                if (isNear(c) && S.closetState < 2) { S.closetState++; applyClosetState('room-1') }
            }
        },

        /* 복도 1 */
        'hallway-1': {
            htmlId: 'scene-hallway-1',
            getPrompt() { return null },
            onEKey() {}
        },

        /* 부엌 1 (아침) */
        'kitchen-1': {
            htmlId: 'scene-kitchen-1',
            getPrompt() {
                let p = el('kitchen-eat-point')
                if (isNear(p) && !S.kitchenDone) return { text: 'E — 밥 먹기', anchor: p }
                return null
            },
            onEKey() {
                let p = el('kitchen-eat-point')
                if (!isNear(p) || S.kitchenDone) return
                S.kitchenDone = true; isLocked = true; isFacingLeft = true
                dlg.play(SCRIPTS.day1_kitchen_wife ?? [], () => { isLocked = false })
            }
        },

        /* 부엌 2 (저녁) */
        'kitchen-2': {
            htmlId: 'scene-kitchen-2',
            onEnter(from) {
                if (!S.kitchenEntryPlayed) {
                    S.kitchenEntryPlayed = true; isLocked = true
                    dlg.play(SCRIPTS.day1_home_entry ?? [], () => { isLocked = false })
                }
            },
            getPrompt() {
                let p = el('kitchen-cake-point')
                if (isNear(p) && !S.cakePlaced) return { text: 'E — 케이크 내려놓기', anchor: p }
                return null
            },
            onEKey() {
                let p = el('kitchen-cake-point')
                if (!isNear(p) || S.cakePlaced) return
                S.cakePlaced = true; isLocked = true
                dlg.play(SCRIPTS.day1_cake_placed ?? [{ type: 'mono', text: '케이크를 테이블에 내려놓았다.' }], () => { isLocked = false })
            }
        },

        /* 복도 2 (저녁) */
        'hallway-2': {
            htmlId: 'scene-hallway-2',
            getPrompt() {
                let d = el('door-daughter'); if (!isNear(d)) return null
                return { text: S.hasKnocked ? 'E — 들어가기' : 'E — 노크하기', anchor: player }
            },
            onEKey() {
                let d = el('door-daughter'); if (!isNear(d)) return
                if (!S.hasKnocked) {
                    isLocked = true; playKnockSound()
                    setTimeout(() => {
                        dlg.play([{ type: 'talk', charId: 'player', speaker: '나', voice: 'player', text: '딸? 방에 있니?' }],
                            () => { S.hasKnocked = true; isLocked = false })
                    }, 850)
                } else { doSwitchModule('daughter', 200) }
            }
        },

        /* 방 2 (저녁) */
        'room-2': {
            htmlId: 'scene-room-2',
            getPrompt() { return null },
            onEKey() {}
        },

        /* 딸의 방 */
        'daughter': {
            htmlId: 'scene-daughter',
            onEnter(from) {
                fadeBGM()
            },
            getPrompt() {
                let sw = el('light-switch')
                if (isNear(sw) && !S.roomLit) return { text: 'E — 불 켜기', anchor: sw }
                return null
            },
            onEKey() {
                let sw = el('light-switch'); if (!isNear(sw) || S.roomLit) return
                S.roomLit = true; el('scene-daughter').classList.add('lit'); isLocked = true
                setTimeout(() => {
                    playCutscene('img/cut2.png', 'cut2', 3, () => { window.location.href = 'day2.html' })
                }, 1500)
            }
        }
    }

    /* ===== 챕터 그래프 ===== */
    const morningChapter = {
        startModule: 'room-1', startX: 400, startFacing: false, playerClass: '',
        initState: () => ({
            closetState: 0, morningPlayed: false, kitchenDone: false,
        }),
        graph: {
            'room-1':    { right: 'hallway-1' },
            'hallway-1': { left: 'room-1',    right: 'kitchen-1' },
            'kitchen-1': { left: 'hallway-1', rightExit: goToCompany },
        }
    }
    const eveningChapter = {
        startModule: 'kitchen-2', startX: 900, startFacing: true, playerClass: 'costume-alt',
        graph: {
            'kitchen-2': { left: 'hallway-2' },
            'hallway-2': { left: 'room-2',    right: 'kitchen-2' },
            'room-2':    { right: 'hallway-2' },
            'daughter':  { left: { to: 'hallway-2', entryX: 700 } },
        }
    }

    /* ===== 회사 버튼 핸들러 ===== */
    el('btn-answer').addEventListener('click', () => {
        if (dlg.isActive) return
        dlg.play(SCRIPTS.company_day1_cant_answer ?? [{ type: 'mono', text: '지금은 회의중이다.' }], null)
    })
    el('btn-decline').addEventListener('click', () => {
        stopRingLoop(); el('phone-overlay').classList.add('hidden'); playHangupSound()
        setTimeout(() => {
            dlg.play(SCRIPTS.company_decline ?? [], () => {
                el('fade-overlay').classList.add('dark')
                setTimeout(() => {
                    el('fade-overlay').classList.remove('dark')
                    setTimeout(() => { isLocked = false; playNotifSound(); showPrompt('E — 핸드폰 확인', player); awaitingPhoneCheck = true }, 700)
                }, 650)
            })
        }, 400)
    })

    /* ===== 입력 ===== */
    document.addEventListener('keydown', e => {
        keysPressed[e.key] = true
        if (e.key !== 'e' && e.key !== 'E') return
        if (isLocked || dlg.isActive) return
        if (currentMode === 'home')    SceneModules[currentModule]?.onEKey?.()
        else if (currentMode === 'company') handleCompanyEKey()
        else if (currentMode === 'bakery')  handleBakeryEKey()
    })
    document.addEventListener('keyup', e => { keysPressed[e.key] = false })

    /* ===== 게임 루프 ===== */
    function moveCharacter() {
        let scaleX = isFacingLeft ? -1 : 1
        player.style.left = playerX + 'px'; player.style.transform = `scaleX(${scaleX})`
        let bubble = player.querySelector('.speech-bubble')
        if (bubble) bubble.style.transform = `translateX(-50%) scaleX(${scaleX})`
        if (isMoving) { player.classList.add('walk'); player.classList.remove('idle') }
        else          { player.classList.add('idle'); player.classList.remove('walk') }
    }
    function checkSceneTransition() {
        if (isLocked || isTransitioning || !activeChapter) return
        let conn = activeChapter.graph[currentModule]; if (!conn) return
        if (playerX <= minX) {
            if (conn.left != null) {
                let mod = SceneModules[currentModule]
                if (mod.canExitLeft && !mod.canExitLeft()) return
                let target = typeof conn.left === 'string' ? { to: conn.left, entryX: maxX - 10 } : conn.left
                doSwitchModule(target.to, target.entryX)
            } else if (conn.leftExit) { conn.leftExit() }
        }
        if (playerX >= maxX) {
            if (conn.right != null) {
                let mod = SceneModules[currentModule]
                if (mod.canExitRight && !mod.canExitRight()) return
                let target = typeof conn.right === 'string' ? { to: conn.right, entryX: 10 } : conn.right
                doSwitchModule(target.to, target.entryX)
            } else if (conn.rightExit) { conn.rightExit() }
        }
    }
    function updatePrompts() {
        if (isLocked || dlg.isActive) { hidePrompt(); return }
        let hint = SceneModules[currentModule]?.getPrompt?.()
        if (hint) showPrompt(hint.text, hint.anchor)
        else hidePrompt()
    }
    function updateCompanyPrompts() {
        if (awaitingPhoneCheck) showPrompt('E — 핸드폰 확인', player)
        else hidePrompt()
    }
    function gameLoop() {
        isMoving = false
        if (!isLocked) {
            if (keysPressed['d'] || keysPressed['D']) { playerX += step; isFacingLeft = false; isMoving = true }
            if (keysPressed['a'] || keysPressed['A']) { playerX -= step; isFacingLeft = true;  isMoving = true }
        }
        playerX = Math.max(minX, Math.min(maxX, playerX))
        if      (currentMode === 'home')    { checkSceneTransition(); moveCharacter(); updatePrompts() }
        else if (currentMode === 'bakery')  { checkBakeryExit();      moveCharacter(); updateBakeryPrompts() }
        else if (currentMode === 'company') {                          moveCharacter(); updateCompanyPrompts() }
        requestAnimationFrame(gameLoop)
    }

    /* ===== 챕터 로더 ===== */
    function loadChapter() {
        activeChapter = morningChapter
        S = morningChapter.initState()
        currentModule = morningChapter.startModule
        playerX = morningChapter.startX; isFacingLeft = morningChapter.startFacing
        player.style.left = playerX + 'px'
        player.classList.remove('costume-alt')
        let startEl = el(SceneModules[currentModule].htmlId)
        startEl.classList.add('active'); startEl.appendChild(player)
        SceneModules[currentModule].onEnter?.(null)
    }

    /* ===== 진입점 ===== */
    loadScripts().then(() => {
        document.addEventListener('click',   () => bgm.play().catch(() => {}), { once: true })
        document.addEventListener('keydown', () => bgm.play().catch(() => {}), { once: true })
        playCutscene('img/cut1 (1).png', 'cut1', 3, () => {
            loadChapter()
            gameLoop()
        })
    })

})() }


/* ============================================================
   2일차  day2.html
   방2 → 복도2-1 → 부엌1 → 회사 → (빵집) → 부엌2 → 복도2 → 딸방
   ============================================================ */
if (PAGE === 'day2') { ;(function() {

    /* ===== BGM ===== */
    const bgm = new Audio('bgm/folk_acoustic-old-oak-149259.mp3')
    bgm.loop = true; bgm.volume = 0.4
    function fadeBGM() {
        let t = setInterval(() => { bgm.volume = Math.max(0, bgm.volume - 0.02); if (bgm.volume <= 0) { bgm.pause(); bgm.volume = 0.4; clearInterval(t) } }, 50)
    }

    /* ===== 공통 상태 ===== */
    const dlg      = new DialogManager({ sound: true })
    const player   = document.getElementById('player')
    const promptEl = document.getElementById('interact-prompt')
    const promptTEl = document.getElementById('interact-prompt-text')

    let step = 9, playerX = 300, isFacingLeft = false, isMoving = false, isLocked = false
    let keysPressed = {}, isTransitioning = false
    let currentModule = '', activeChapter = null, S = {}
    let currentMode = 'home'

    const minX = 0, maxX = 1920 - 288

    /* ===== 공통 헬퍼 ===== */
    const el = id => document.getElementById(id)
    function isNear(t) {
        if (!t) return false
        let pL = player.offsetLeft, pR = pL + player.offsetWidth
        return pR > t.offsetLeft && pL < t.offsetLeft + t.offsetWidth
    }
    function showPrompt(text, anchor) {
        promptTEl.textContent = text
        let r = anchor.getBoundingClientRect()
        promptEl.style.left = (r.left + r.width / 2) + 'px'
        promptEl.style.top  = (r.top - 20) + 'px'
        promptEl.classList.remove('hidden')
    }
    function hidePrompt() { promptEl.classList.add('hidden') }
    function playKnockSound() {
        try {
            let ctx = dlg._getAudioCtx()
            for (let i = 0; i < 3; i++) {
                let t = ctx.currentTime + i * 0.28
                let osc = ctx.createOscillator(), gain = ctx.createGain()
                osc.connect(gain); gain.connect(ctx.destination)
                osc.type = 'sine'; osc.frequency.setValueAtTime(200, t); osc.frequency.exponentialRampToValueAtTime(60, t + 0.09)
                gain.gain.setValueAtTime(0.45, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12)
                osc.start(t); osc.stop(t + 0.15)
            }
        } catch (_) {}
    }
    function applyClosetState() {
        let closet = el('closet-2')
        if (!closet) return
        closet.classList.toggle('active', S.closetState >= 1)
        player.classList.toggle('costume-alt', S.closetState >= 2)
        let overlay = el('closet-open-overlay')
        if (overlay) overlay.classList.toggle('hidden', S.closetState < 1)
    }
    function playCutscene(imgSrc, cutClass, boxCount, onComplete) {
        isLocked = true
        let overlay = document.createElement('div'); overlay.className = 'cutscene-overlay'
        let img = document.createElement('img'); img.src = imgSrc; img.className = 'cutscene-img'; overlay.appendChild(img)
        let boxes = []
        for (let i = 1; i <= boxCount; i++) {
            let box = document.createElement('div'); box.className = `cutscene-box ${cutClass}-box-${i}`
            overlay.appendChild(box); boxes.push(box)
        }
        document.body.appendChild(overlay)
        let cur = 0, ending = false
        function advance() {
            if (ending) return
            if (cur < boxes.length) {
                let box = boxes[cur]; box.classList.add('cutscene-box--out')
                box.addEventListener('animationend', () => box.remove(), { once: true }); cur++
            } else {
                ending = true
                document.removeEventListener('keydown', kh)
                overlay.classList.add('cutscene-overlay--out')
                overlay.addEventListener('animationend', () => { overlay.remove() }, { once: true })
                setTimeout(onComplete, 0)
            }
        }
        function kh(e) { if (['Space','Enter','ArrowRight'].includes(e.code)) { e.preventDefault(); advance() } }
        overlay.addEventListener('click', advance); document.addEventListener('keydown', kh)
    }
    function doSwitchModule(toModule, entryX) {
        if (isTransitioning) return; isTransitioning = true
        let fromEl = el(SceneModules[currentModule].htmlId)
        let toEl   = el(SceneModules[toModule].htmlId)
        let from   = currentModule
        playerX = entryX; player.style.left = playerX + 'px'; toEl.appendChild(player)
        fromEl.classList.add('fade-out')
        fromEl.addEventListener('animationend', () => {
            fromEl.classList.remove('active', 'fade-out'); toEl.classList.add('active')
            currentModule = toModule
            setTimeout(() => { isTransitioning = false; SceneModules[toModule].onEnter?.(from) }, 200)
        }, { once: true })
    }

    /* ===== 회사 음향 ===== */
    let ringInterval = null
    function playRingTone() {
        try {
            let ctx = dlg._getAudioCtx(), t = ctx.currentTime + 0.05
            ;[0, 0.35, 1.0, 1.35].forEach(off => {
                let osc = ctx.createOscillator(), gain = ctx.createGain()
                osc.connect(gain); gain.connect(ctx.destination)
                osc.type = 'sine'; osc.frequency.value = 880
                gain.gain.setValueAtTime(0.18, t + off); gain.gain.exponentialRampToValueAtTime(0.001, t + off + 0.25)
                osc.start(t + off); osc.stop(t + off + 0.28)
            })
        } catch (_) {}
    }
    function startRingLoop() { playRingTone(); ringInterval = setInterval(playRingTone, 2000) }
    function stopRingLoop()  { clearInterval(ringInterval); ringInterval = null }
    function playHangupSound() {
        try {
            let ctx = dlg._getAudioCtx(), t = ctx.currentTime + 0.02
            let osc = ctx.createOscillator(), gain = ctx.createGain()
            osc.connect(gain); gain.connect(ctx.destination)
            osc.type = 'sine'; osc.frequency.setValueAtTime(440, t); osc.frequency.exponentialRampToValueAtTime(200, t + 0.3)
            gain.gain.setValueAtTime(0.15, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3)
            osc.start(t); osc.stop(t + 0.35)
        } catch (_) {}
    }
    function playNotifSound() {
        try {
            let ctx = dlg._getAudioCtx(), t = ctx.currentTime + 0.05
            let osc = ctx.createOscillator(), gain = ctx.createGain()
            osc.connect(gain); gain.connect(ctx.destination)
            osc.type = 'sine'; osc.frequency.setValueAtTime(1320, t); osc.frequency.exponentialRampToValueAtTime(880, t + 0.35)
            gain.gain.setValueAtTime(0.25, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8)
            osc.start(t); osc.stop(t + 0.85)
        } catch (_) {}
    }
    function fadeTransition(cb) {
        let ov = el('fade-overlay'); ov.classList.add('dark')
        setTimeout(() => { cb(); setTimeout(() => ov.classList.remove('dark'), 150) }, 650)
    }

    /* ===== 방 2 (아침) ===== */
    // closet / wakeup — SceneModules['room-2']

    /* ===== 복도 2-1 (잠긴 딸방) ===== */
    // SceneModules['hallway-2-1']

    /* ===== 부엌 1 (아침) ===== */
    // SceneModules['kitchen-1']

    /* ===== 회사 ===== */
    let awaitingPhoneCheck = false
    function goToCompany() {
        isLocked = true
        let ov = el('company-loading'); ov.removeAttribute('hidden')
        el('company-loading-bar').addEventListener('animationend', () => {
            setTimeout(() => {
                el(SceneModules[currentModule].htmlId).classList.remove('active')
                let cs = el('scene-company'); cs.classList.add('active'); cs.appendChild(player)
                playerX = 640; player.style.left = playerX + 'px'; isFacingLeft = false
                currentMode = 'company'
                ov.style.transition = 'opacity 0.3s'; ov.style.opacity = '0'
                ov.addEventListener('transitionend', () => {
                    ov.setAttribute('hidden', ''); ov.style.opacity = ''; ov.style.transition = ''
                    startCompanyScene()
                }, { once: true })
            }, 800)
        }, { once: true })
    }
    function startCompanyScene() {
        isLocked = true; awaitingPhoneCheck = false
        dlg.play(SCRIPTS.company_meeting ?? [], () => {
            playRingTone()
            setTimeout(() => {
                dlg.play(SCRIPTS.company_ring_interrupt ?? [], () => {
                    el('phone-overlay').classList.remove('hidden'); startRingLoop()
                })
            }, 700)
        })
    }
    function handleCompanyEKey() {
        if (!awaitingPhoneCheck) return
        awaitingPhoneCheck = false; hidePrompt()
        let lockScreen = el('phone-lock-screen'); lockScreen.classList.remove('hidden')
        lockScreen.addEventListener('click', e => {
            e.stopPropagation(); lockScreen.classList.add('hidden')
            let afterNotif = SCRIPTS.company_day2_after_notif ?? [{ type: 'mono', text: '어떻게 해야 하지...' }]
            let bakeryLabel = typeof SCRIPTS.company_choice_bakery === 'string' ? SCRIPTS.company_choice_bakery : '빵집에 가야겠다'
            let homeLabel   = typeof SCRIPTS.company_choice_home   === 'string' ? SCRIPTS.company_choice_home   : '그냥 집에 가자'
            let choiceScript = [
                ...afterNotif,
                { type: 'talk', charId: 'player', speaker: '나', voice: 'player', text: '...', choices: [
                    { label: bakeryLabel, next: () => { sessionStorage.setItem('bakeryVisited', 'true');  goToBakery() } },
                    { label: homeLabel,   next: () => { sessionStorage.setItem('bakeryVisited', 'false'); goToEvening(false) } },
                ]}
            ]
            dlg.play(choiceScript, null)
        }, { once: true })
    }

    /* ===== 빵집 (선택) ===== */
    let selectedCake = null, hasPaid = false
    function goToBakery() {
        el('scene-company').classList.remove('active')
        let ov = el('bakery-loading'); ov.removeAttribute('hidden')
        el('bakery-loading-bar').addEventListener('animationend', () => {
            setTimeout(() => {
                let bs = el('scene-bakery'); bs.classList.add('active'); bs.appendChild(player)
                playerX = 100; player.style.left = playerX + 'px'
                isFacingLeft = false; currentMode = 'bakery'
                selectedCake = null; hasPaid = false
                document.querySelectorAll('.cake-item.picked').forEach(c => c.classList.remove('picked'))
                ov.style.transition = 'opacity 0.3s'; ov.style.opacity = '0'
                ov.addEventListener('transitionend', () => {
                    ov.setAttribute('hidden', ''); ov.style.opacity = ''; ov.style.transition = ''
                    isLocked = false
                }, { once: true })
            }, 800)
        }, { once: true })
    }
    function isCakeNear(c) {
        let cx = parseInt(c.dataset.cx ?? 500), half = 150
        let pL = player.offsetLeft, pR = pL + player.offsetWidth
        return pR > cx - half && pL < cx + half
    }
    function handleBakeryEKey() {
        if (!selectedCake) {
            let nearby = [...document.querySelectorAll('.cake-item:not(.picked)')].find(c => isCakeNear(c))
            if (nearby) {
                selectedCake = nearby.dataset.name
                nearby.classList.add('picked')
                dlg.play([{ type: 'mono', text: `${selectedCake}를 집어 들었다.` }], null)
            }
            return
        }
        let cashier = el('cashier')
        if (isNear(cashier) && !hasPaid) { hasPaid = true; dlg.play([{ type: 'mono', text: '계산을 마쳤다.' }], null) }
    }
    function checkBakeryExit() {
        if (isLocked) return
        if (playerX <= 0) {
            if (hasPaid) { isLocked = true; goToEvening(true) }
            else {
                playerX = 20
                if (!dlg.isActive && !isLocked) {
                    isLocked = true
                    let msg = selectedCake ? '계산을 먼저 해야겠다.' : '케이크를 먼저 골라야겠다.'
                    dlg.play([{ type: 'mono', text: msg }], () => { isLocked = false })
                }
            }
        }
    }
    function updateBakeryPrompts() {
        if (isLocked || dlg.isActive) { hidePrompt(); return }
        let cashier = el('cashier')
        if (!selectedCake) {
            let nearby = [...document.querySelectorAll('.cake-item:not(.picked)')].find(c => isCakeNear(c))
            if (nearby) { showPrompt(`E — ${nearby.dataset.name}`, player); return }
        }
        if (selectedCake && !hasPaid && isNear(cashier)) { showPrompt('E — 계산하기', cashier); return }
        hidePrompt()
    }

    /* ===== 저녁 전환 ===== */
    function goToEvening(hasCake) {
        isLocked = true
        document.querySelectorAll('.scene.active').forEach(s => s.classList.remove('active'))
        el('scene-bakery').classList.remove('active')
        let ov = el('home-loading'); ov.removeAttribute('hidden')
        el('home-loading-bar').addEventListener('animationend', () => {
            setTimeout(() => {
                let k2 = el('scene-kitchen-2'); k2.classList.add('active'); k2.appendChild(player)
                playerX = 900; isFacingLeft = true; player.style.left = playerX + 'px'
                currentMode = 'home'; currentModule = 'kitchen-2'
                S = {
                    cakePlaced:         !hasCake,
                    kitchenEntryPlayed: false,
                    hasKnocked:         false,
                    roomLit:            false,
                    closetState:        2,
                }
                activeChapter = eveningChapter
                ov.style.transition = 'opacity 0.3s'; ov.style.opacity = '0'
                ov.addEventListener('transitionend', () => {
                    ov.setAttribute('hidden', ''); ov.style.opacity = ''; ov.style.transition = ''
                    isLocked = false
                    SceneModules['kitchen-2'].onEnter(null)
                }, { once: true })
            }, 800)
        }, { once: true })
    }

    /* ===== SceneModules ===== */
    const SceneModules = {
        /* 방 2 (아침) */
        'room-2': {
            htmlId: 'scene-room-2',
            onEnter(from) {
                if (from === null) {
                    isLocked = true
                    setTimeout(() => { dlg.play(SCRIPTS.day2_room_wakeup ?? [], () => { isLocked = false }) }, 400)
                }
            },
            canExitRight() {
                if (S.closetState < 2) {
                    playerX = maxX - 200
                    if (!isLocked && !dlg.isActive) { isLocked = true; dlg.play(SCRIPTS.no_clothes_exit ?? [], () => { isLocked = false }) }
                    return false
                }
                return true
            },
            getPrompt() {
                let c = el('closet-2'); if (!isNear(c) || S.closetState >= 2) return null
                return { text: S.closetState === 0 ? 'E — 옷장 열기' : 'E — 옷 갈아입기', anchor: c }
            },
            onEKey() {
                let c = el('closet-2')
                if (isNear(c) && S.closetState < 2) { S.closetState++; applyClosetState() }
            }
        },

        /* 복도 2-1 (아침 — 잠긴 딸방) */
        'hallway-2-1': {
            htmlId: 'scene-hallway-2-1',
            getPrompt() {
                let d = el('door-daughter-locked')
                if (isNear(d) && !S.knockedLocked) return { text: 'E — 노크하기', anchor: player }
                return null
            },
            onEKey() {
                let d = el('door-daughter-locked')
                if (!isNear(d) || S.knockedLocked) return
                isLocked = true; playKnockSound()
                setTimeout(() => {
                    dlg.play(SCRIPTS.day2_knock_morning ?? [], () => { S.knockedLocked = true; isLocked = false })
                }, 850)
            }
        },

        /* 부엌 1 (아침) */
        'kitchen-1': {
            htmlId: 'scene-kitchen-1',
            getPrompt() {
                let p = el('kitchen-eat-point')
                if (isNear(p) && !S.kitchenDone) return { text: 'E — 밥 먹기', anchor: p }
                return null
            },
            onEKey() {
                let p = el('kitchen-eat-point')
                if (!isNear(p) || S.kitchenDone) return
                S.kitchenDone = true; isLocked = true; isFacingLeft = true
                dlg.play(SCRIPTS.day2_kitchen_wife ?? [], () => { isLocked = false })
            }
        },

        /* 부엌 2 (저녁) */
        'kitchen-2': {
            htmlId: 'scene-kitchen-2',
            onEnter(from) {
                if (!S.kitchenEntryPlayed) {
                    S.kitchenEntryPlayed = true; isLocked = true
                    dlg.play(SCRIPTS.day2_home_entry ?? [], () => { isLocked = false })
                }
            },
            getPrompt() {
                let p = el('kitchen-cake-point')
                if (isNear(p) && !S.cakePlaced) return { text: 'E — 케이크 내려놓기', anchor: p }
                return null
            },
            onEKey() {
                let p = el('kitchen-cake-point')
                if (!isNear(p) || S.cakePlaced) return
                S.cakePlaced = true; isLocked = true
                dlg.play(SCRIPTS.day2_cake_placed ?? [{ type: 'mono', text: '케이크를 내려놓았다.' }], () => { isLocked = false })
            }
        },

        /* 복도 2 (저녁) */
        'hallway-2': {
            htmlId: 'scene-hallway-2',
            getPrompt() {
                let d = el('door-daughter'); if (!isNear(d)) return null
                return { text: S.hasKnocked ? 'E — 들어가기' : 'E — 노크하기', anchor: player }
            },
            onEKey() {
                let d = el('door-daughter'); if (!isNear(d)) return
                if (!S.hasKnocked) {
                    isLocked = true; playKnockSound()
                    setTimeout(() => {
                        dlg.play(SCRIPTS.day2_knock_evening ?? [{ type: 'talk', charId: 'player', speaker: '나', voice: 'player', text: '딸? 방에 있니?' }],
                            () => { S.hasKnocked = true; isLocked = false })
                    }, 850)
                } else { doSwitchModule('daughter', 200) }
            }
        },

        /* 딸의 방 */
        'daughter': {
            htmlId: 'scene-daughter',
            onEnter(from) { fadeBGM() },
            getPrompt() {
                let sw = el('light-switch')
                if (isNear(sw) && !S.roomLit) return { text: 'E — 불 켜기', anchor: sw }
                return null
            },
            onEKey() {
                let sw = el('light-switch'); if (!isNear(sw) || S.roomLit) return
                S.roomLit = true; el('scene-daughter').classList.add('lit'); isLocked = true
                setTimeout(() => { window.location.href = 'day3.html' }, 1500)
            }
        }
    }

    /* ===== 챕터 그래프 ===== */
    const morningChapter = {
        startModule: 'room-2', startX: 300, startFacing: false, playerClass: '',
        initState: () => ({ closetState: 0, kitchenDone: false, knockedLocked: false }),
        graph: {
            'room-2':      { right: 'hallway-2-1' },
            'hallway-2-1': { left: 'room-2',      right: 'kitchen-1' },
            'kitchen-1':   { left: 'hallway-2-1', rightExit: goToCompany },
        }
    }
    const eveningChapter = {
        startModule: 'kitchen-2', startX: 900, startFacing: true, playerClass: 'costume-alt',
        graph: {
            'kitchen-2': { left: 'hallway-2' },
            'hallway-2': { left: 'room-2',    right: 'kitchen-2' },
            'room-2':    { right: 'hallway-2' },
            'daughter':  { left: { to: 'hallway-2', entryX: 700 } },
        }
    }

    /* ===== 회사 버튼 핸들러 ===== */
    el('btn-answer').addEventListener('click', () => {
        if (dlg.isActive) return
        stopRingLoop(); el('phone-overlay').classList.add('hidden'); playHangupSound()
        setTimeout(() => {
            dlg.play(SCRIPTS.company_call ?? [], () => {
                playHangupSound()
                setTimeout(() => { dlg.play(SCRIPTS.company_post_call ?? [], () => { fadeTransition(() => { isLocked = false; playNotifSound(); showPrompt('E — 핸드폰 확인', player); awaitingPhoneCheck = true }) }) }, 400)
            })
        }, 400)
    })
    el('btn-decline').addEventListener('click', () => {
        stopRingLoop(); el('phone-overlay').classList.add('hidden'); playHangupSound()
        setTimeout(() => {
            dlg.play(SCRIPTS.company_decline ?? [], () => { fadeTransition(() => { isLocked = false; playNotifSound(); showPrompt('E — 핸드폰 확인', player); awaitingPhoneCheck = true }) })
        }, 400)
    })

    /* ===== 입력 ===== */
    document.addEventListener('keydown', e => {
        keysPressed[e.key] = true
        if (e.key !== 'e' && e.key !== 'E') return
        if (isLocked || dlg.isActive) return
        if (currentMode === 'home')         SceneModules[currentModule]?.onEKey?.()
        else if (currentMode === 'company') handleCompanyEKey()
        else if (currentMode === 'bakery')  handleBakeryEKey()
    })
    document.addEventListener('keyup', e => { keysPressed[e.key] = false })

    /* ===== 게임 루프 ===== */
    function moveCharacter() {
        let scaleX = isFacingLeft ? -1 : 1
        player.style.left = playerX + 'px'; player.style.transform = `scaleX(${scaleX})`
        let bubble = player.querySelector('.speech-bubble')
        if (bubble) bubble.style.transform = `translateX(-50%) scaleX(${scaleX})`
        if (isMoving) { player.classList.add('walk'); player.classList.remove('idle') }
        else          { player.classList.add('idle'); player.classList.remove('walk') }
    }
    function checkSceneTransition() {
        if (isLocked || isTransitioning || !activeChapter) return
        let conn = activeChapter.graph[currentModule]; if (!conn) return
        if (playerX <= minX) {
            if (conn.left != null) {
                let mod = SceneModules[currentModule]
                if (mod.canExitLeft && !mod.canExitLeft()) return
                let target = typeof conn.left === 'string' ? { to: conn.left, entryX: maxX - 10 } : conn.left
                doSwitchModule(target.to, target.entryX)
            } else if (conn.leftExit) { conn.leftExit() }
        }
        if (playerX >= maxX) {
            if (conn.right != null) {
                let mod = SceneModules[currentModule]
                if (mod.canExitRight && !mod.canExitRight()) return
                let target = typeof conn.right === 'string' ? { to: conn.right, entryX: 10 } : conn.right
                doSwitchModule(target.to, target.entryX)
            } else if (conn.rightExit) { conn.rightExit() }
        }
    }
    function updatePrompts() {
        if (isLocked || dlg.isActive) { hidePrompt(); return }
        let hint = SceneModules[currentModule]?.getPrompt?.()
        if (hint) showPrompt(hint.text, hint.anchor)
        else hidePrompt()
    }
    function updateCompanyPrompts() {
        if (awaitingPhoneCheck) showPrompt('E — 핸드폰 확인', player)
        else hidePrompt()
    }
    function gameLoop() {
        isMoving = false
        if (!isLocked) {
            if (keysPressed['d'] || keysPressed['D']) { playerX += step; isFacingLeft = false; isMoving = true }
            if (keysPressed['a'] || keysPressed['A']) { playerX -= step; isFacingLeft = true;  isMoving = true }
        }
        playerX = Math.max(minX, Math.min(maxX, playerX))
        if      (currentMode === 'home')    { checkSceneTransition(); moveCharacter(); updatePrompts() }
        else if (currentMode === 'bakery')  { checkBakeryExit();      moveCharacter(); updateBakeryPrompts() }
        else if (currentMode === 'company') {                          moveCharacter(); updateCompanyPrompts() }
        requestAnimationFrame(gameLoop)
    }

    /* ===== 진입점 ===== */
    loadScripts().then(() => {
        document.addEventListener('click',   () => bgm.play().catch(() => {}), { once: true })
        document.addEventListener('keydown', () => bgm.play().catch(() => {}), { once: true })
        activeChapter = morningChapter
        S = morningChapter.initState()
        currentModule = morningChapter.startModule
        playerX = morningChapter.startX; isFacingLeft = false
        player.classList.remove('costume-alt')
        let startEl = el(SceneModules[currentModule].htmlId)
        startEl.classList.add('active'); startEl.appendChild(player)
        SceneModules[currentModule].onEnter?.(null)
        gameLoop()
    })

})() }


/* ============================================================
   3일차  day3.html
   방2 → 복도2(막힘/대화) → 딸방 → day4.html
   ============================================================ */
if (PAGE === 'day3') { ;(function() {

    /* ===== BGM ===== */
    const bgm = new Audio('bgm/folk_acoustic-old-oak-149259.mp3')
    bgm.loop = true; bgm.volume = 0.4
    function fadeBGM() {
        let t = setInterval(() => { bgm.volume = Math.max(0, bgm.volume - 0.02); if (bgm.volume <= 0) { bgm.pause(); bgm.volume = 0.4; clearInterval(t) } }, 50)
    }

    /* ===== 공통 상태 ===== */
    const dlg      = new DialogManager({ sound: true })
    const player   = document.getElementById('player')
    const promptEl = document.getElementById('interact-prompt')
    const promptTEl = document.getElementById('interact-prompt-text')

    let step = 9, playerX = 300, isFacingLeft = false, isMoving = false, isLocked = false
    let keysPressed = {}, isTransitioning = false
    let currentModule = 'room-2'
    let S = { closetState: 0, day3Talked: false }

    const minX = 0, maxX = 1920 - 288

    /* ===== 헬퍼 ===== */
    const el = id => document.getElementById(id)
    function isNear(t) {
        if (!t) return false
        let pL = player.offsetLeft, pR = pL + player.offsetWidth
        return pR > t.offsetLeft && pL < t.offsetLeft + t.offsetWidth
    }
    function showPrompt(text, anchor) {
        promptTEl.textContent = text
        let r = anchor.getBoundingClientRect()
        promptEl.style.left = (r.left + r.width / 2) + 'px'; promptEl.style.top = (r.top - 20) + 'px'
        promptEl.classList.remove('hidden')
    }
    function hidePrompt() { promptEl.classList.add('hidden') }
    function applyClosetState() {
        let closet = el('closet-2')
        if (!closet) return
        closet.classList.toggle('active', S.closetState >= 1)
        player.classList.toggle('costume-alt', S.closetState >= 2)
        let overlay = el('closet-open-overlay')
        if (overlay) overlay.classList.toggle('hidden', S.closetState < 1)
    }
    function playCutscene(imgSrc, cutClass, boxCount, onComplete) {
        isLocked = true
        let overlay = document.createElement('div'); overlay.className = 'cutscene-overlay'
        let img = document.createElement('img'); img.src = imgSrc; img.className = 'cutscene-img'; overlay.appendChild(img)
        let boxes = []
        for (let i = 1; i <= boxCount; i++) {
            let box = document.createElement('div'); box.className = `cutscene-box ${cutClass}-box-${i}`
            overlay.appendChild(box); boxes.push(box)
        }
        document.body.appendChild(overlay)
        let cur = 0, ending = false
        function advance() {
            if (ending) return
            if (cur < boxes.length) {
                let box = boxes[cur]; box.classList.add('cutscene-box--out')
                box.addEventListener('animationend', () => box.remove(), { once: true }); cur++
            } else {
                ending = true
                document.removeEventListener('keydown', kh)
                overlay.classList.add('cutscene-overlay--out')
                overlay.addEventListener('animationend', () => { overlay.remove() }, { once: true })
                setTimeout(onComplete, 0)
            }
        }
        function kh(e) { if (['Space','Enter','ArrowRight'].includes(e.code)) { e.preventDefault(); advance() } }
        overlay.addEventListener('click', advance); document.addEventListener('keydown', kh)
    }
    function doSwitchModule(toModule, entryX) {
        if (isTransitioning) return; isTransitioning = true
        let fromEl = el(SceneModules[currentModule].htmlId)
        let toEl   = el(SceneModules[toModule].htmlId)
        let from   = currentModule
        playerX = entryX; player.style.left = playerX + 'px'; toEl.appendChild(player)
        fromEl.classList.add('fade-out')
        fromEl.addEventListener('animationend', () => {
            fromEl.classList.remove('active', 'fade-out'); toEl.classList.add('active')
            currentModule = toModule
            setTimeout(() => { isTransitioning = false; SceneModules[toModule].onEnter?.(from) }, 200)
        }, { once: true })
    }

    /* ===== 방 2 ===== */
    /* ===== 복도 2 (딸방 앞) ===== */
    /* ===== 딸의 방 ===== */

    const SceneModules = {
        /* 방 2 */
        'room-2': {
            htmlId: 'scene-room-2',
            onEnter(from) {
                if (from === null) {
                    isLocked = true
                    setTimeout(() => { dlg.play(SCRIPTS.day3_room_wakeup ?? [], () => { isLocked = false }) }, 400)
                }
            },
            canExitRight() {
                if (S.closetState < 2) {
                    playerX = maxX - 200
                    if (!isLocked && !dlg.isActive) { isLocked = true; dlg.play(SCRIPTS.no_clothes_exit ?? [], () => { isLocked = false }) }
                    return false
                }
                return true
            },
            getPrompt() {
                let c = el('closet-2'); if (!isNear(c) || S.closetState >= 2) return null
                return { text: S.closetState === 0 ? 'E — 옷장 열기' : 'E — 옷 갈아입기', anchor: c }
            },
            onEKey() {
                let c = el('closet-2')
                if (isNear(c) && S.closetState < 2) { S.closetState++; applyClosetState() }
            }
        },

        /* 복도 2 */
        'hallway-2': {
            htmlId: 'scene-hallway-2',
            canExitRight() {
                playerX = maxX - 200
                if (!isLocked && !dlg.isActive) {
                    isLocked = true
                    dlg.play(SCRIPTS.day3_kitchen_blocked ?? [{ type: 'mono', text: '정말로?' }], () => { isLocked = false })
                }
                return false
            },
            getPrompt() {
                let d = el('door-daughter'); if (!isNear(d)) return null
                if (!S.day3Talked) return { text: 'E — 대화하기', anchor: player }
                return { text: 'E — 열기', anchor: player }
            },
            onEKey() {
                let d = el('door-daughter'); if (!isNear(d)) return
                if (!S.day3Talked) {
                    if (isLocked) return
                    isLocked = true
                    dlg.play(SCRIPTS.day3_hallway_conversation ?? [], () => { S.day3Talked = true; isLocked = false })
                } else {
                    isLocked = true
                    fadeBGM()
                    playCutscene('img/cut3.png', 'cut3', 4, () => { window.location.href = 'day4.html' })
                }
            }
        }
    }

    /* ===== 그래프 ===== */
    const graph = {
        'room-2':    { right: 'hallway-2' },
        'hallway-2': { left: 'room-2' },
    }

    /* ===== 입력 ===== */
    document.addEventListener('keydown', e => {
        keysPressed[e.key] = true
        if (e.key !== 'e' && e.key !== 'E') return
        if (isLocked || dlg.isActive) return
        SceneModules[currentModule]?.onEKey?.()
    })
    document.addEventListener('keyup', e => { keysPressed[e.key] = false })

    /* ===== 게임 루프 ===== */
    function moveCharacter() {
        let scaleX = isFacingLeft ? -1 : 1
        player.style.left = playerX + 'px'; player.style.transform = `scaleX(${scaleX})`
        let bubble = player.querySelector('.speech-bubble')
        if (bubble) bubble.style.transform = `translateX(-50%) scaleX(${scaleX})`
        if (isMoving) { player.classList.add('walk'); player.classList.remove('idle') }
        else          { player.classList.add('idle'); player.classList.remove('walk') }
    }
    function checkSceneTransition() {
        if (isLocked || isTransitioning) return
        let conn = graph[currentModule]; if (!conn) return
        if (playerX <= minX && conn.left != null) {
            let mod = SceneModules[currentModule]
            if (mod.canExitLeft && !mod.canExitLeft()) return
            let target = typeof conn.left === 'string' ? { to: conn.left, entryX: maxX - 10 } : conn.left
            doSwitchModule(target.to, target.entryX)
        }
        if (playerX >= maxX) {
            if (conn.right != null) {
                let mod = SceneModules[currentModule]
                if (mod.canExitRight && !mod.canExitRight()) return
                let target = typeof conn.right === 'string' ? { to: conn.right, entryX: 10 } : conn.right
                doSwitchModule(target.to, target.entryX)
            } else if (conn.rightExit) { conn.rightExit() }
        }
    }
    function updatePrompts() {
        if (isLocked || dlg.isActive) { hidePrompt(); return }
        let hint = SceneModules[currentModule]?.getPrompt?.()
        if (hint) showPrompt(hint.text, hint.anchor)
        else hidePrompt()
    }
    function gameLoop() {
        isMoving = false
        if (!isLocked) {
            if (keysPressed['d'] || keysPressed['D']) { playerX += step; isFacingLeft = false; isMoving = true }
            if (keysPressed['a'] || keysPressed['A']) { playerX -= step; isFacingLeft = true;  isMoving = true }
        }
        playerX = Math.max(minX, Math.min(maxX, playerX))
        checkSceneTransition(); moveCharacter(); updatePrompts()
        requestAnimationFrame(gameLoop)
    }

    /* ===== 진입점 ===== */
    loadScripts().then(() => {
        document.addEventListener('click',   () => bgm.play().catch(() => {}), { once: true })
        document.addEventListener('keydown', () => bgm.play().catch(() => {}), { once: true })
        let startEl = el('scene-room-2'); startEl.classList.add('active'); startEl.appendChild(player)
        player.style.left = playerX + 'px'
        SceneModules['room-2'].onEnter(null)
        gameLoop()
    })

})() }


/* ============================================================
   4일차  day4.html
   방2 — 핸드폰 확인 → 독백 → ending.html
   ============================================================ */
if (PAGE === 'day4') { ;(function() {

    /* ===== 공통 상태 ===== */
    const dlg      = new DialogManager({ sound: true })
    const player   = document.getElementById('player')
    const promptEl = document.getElementById('interact-prompt')
    const promptTEl = document.getElementById('interact-prompt-text')

    let step = 9, playerX = 300, isFacingLeft = false, isMoving = false, isLocked = false
    let keysPressed = {}
    let phoneChecked = false

    const minX = 0, maxX = 1920 - 288

    /* ===== 헬퍼 ===== */
    const el = id => document.getElementById(id)
    function isNear(t) {
        if (!t) return false
        let pL = player.offsetLeft, pR = pL + player.offsetWidth
        return pR > t.offsetLeft && pL < t.offsetLeft + t.offsetWidth
    }
    function showPrompt(text, anchor) {
        promptTEl.textContent = text
        let r = anchor.getBoundingClientRect()
        promptEl.style.left = (r.left + r.width / 2) + 'px'; promptEl.style.top = (r.top - 20) + 'px'
        promptEl.classList.remove('hidden')
    }
    function hidePrompt() { promptEl.classList.add('hidden') }

    /* ===== 방 2 — 핸드폰 확인 ===== */
    function playNotifSound() {
        try {
            let ctx = dlg._getAudioCtx(), t = ctx.currentTime + 0.05
            let osc = ctx.createOscillator(), gain = ctx.createGain()
            osc.connect(gain); gain.connect(ctx.destination)
            osc.type = 'sine'; osc.frequency.setValueAtTime(1320, t); osc.frequency.exponentialRampToValueAtTime(880, t + 0.35)
            gain.gain.setValueAtTime(0.25, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8)
            osc.start(t); osc.stop(t + 0.85)
        } catch (_) {}
    }

    function showDay4Phone() {
        isLocked = true; hidePrompt()
        const depressed = new Audio('bgm/atlasaudio-depressed-519613.mp3')
        depressed.loop = true; depressed.volume = 0.4; depressed.play().catch(() => {})
        let overlay = document.createElement('div')
        overlay.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:1920px;height:1080px;background:rgba(10,14,24,0.97);z-index:8000;display:flex;align-items:center;justify-content:center;'
        let inner = document.createElement('div'); inner.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:40px;'
        let now = new Date()
        let timeEl = document.createElement('div')
        timeEl.textContent = String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0')
        timeEl.style.cssText = "font-family:'Noto Sans KR',sans-serif;font-size:88px;color:#fff;font-weight:200;letter-spacing:6px;"
        inner.appendChild(timeEl)
        let notifWrap = document.createElement('div'); notifWrap.style.cssText = 'display:flex;flex-direction:column;gap:12px;min-width:420px;'
        inner.appendChild(notifWrap); overlay.appendChild(inner); document.body.appendChild(overlay)
        function makeCard(text) {
            let card = document.createElement('div')
            card.style.cssText = 'background:rgba(255,255,255,0.1);border-radius:18px;padding:22px 36px;display:flex;align-items:center;gap:18px;min-width:420px;backdrop-filter:blur(6px);opacity:0;transition:opacity 0.3s ease;'
            let icon = document.createElement('div'); icon.textContent = '📅'; icon.style.fontSize = '30px'
            let wrap = document.createElement('div')
            let app = document.createElement('div'); app.textContent = '캘린더'
            app.style.cssText = "font-family:'Noto Sans KR',sans-serif;font-size:11px;color:rgba(255,255,255,0.55);margin-bottom:5px;letter-spacing:1px;"
            let main = document.createElement('div'); main.textContent = text
            main.style.cssText = "font-family:'Noto Sans KR',sans-serif;font-size:18px;color:#fff;"
            wrap.appendChild(app); wrap.appendChild(main); card.appendChild(icon); card.appendChild(wrap)
            return card
        }
        setTimeout(() => {
            let card1 = makeCard('오늘: 수아 1주기'); notifWrap.appendChild(card1); playNotifSound()
            requestAnimationFrame(() => requestAnimationFrame(() => { card1.style.opacity = '1' }))
            setTimeout(() => {
                let card2 = makeCard('내일: 수아 생일'); notifWrap.appendChild(card2); playNotifSound()
                requestAnimationFrame(() => requestAnimationFrame(() => { card2.style.opacity = '1' }))
                setTimeout(() => {
                    overlay.style.cursor = 'pointer'
                    function close() { overlay.remove(); document.removeEventListener('keydown', ck); playBlackoutThenMonologue() }
                    function ck(e) { if (['Space','Enter','ArrowRight'].includes(e.code)) { e.preventDefault(); close() } }
                    overlay.addEventListener('click', close, { once: true }); document.addEventListener('keydown', ck)
                }, 1400)
            }, 80)
        }, 1000)
    }

    /* ===== 독백 → 엔딩 ===== */
    function playBlackoutThenMonologue() {
        const lines = SCRIPTS.day4_ending_monologue ?? [
            { text: '만약 그날, 내가 전화를 제대로 받았다면' },
            { text: '만약 그날, 내가 집에 일찍 들어갔다면.' },
            { text: '만약 그날, 딸에게 무슨 일이 있었는지 더 잘 물었다면.' },
            { text: '만약 이전에, 딸의 안부를 자주 물었다면' },
            { text: '만약, 그날에.' },
        ]
        let container = document.createElement('div')
        container.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:1920px;height:1080px;background:#000;z-index:9500;opacity:0;transition:opacity 1.2s ease;cursor:pointer;display:flex;align-items:flex-end;justify-content:center;padding-bottom:80px;'
        let monoEl = document.createElement('div')
        monoEl.style.cssText = "font-family:'Noto Sans KR',sans-serif;font-size:22px;color:#fff;text-shadow:2px 2px 6px #000;text-align:center;white-space:nowrap;opacity:0;transition:opacity 0.4s ease;"
        container.appendChild(monoEl); document.body.appendChild(container)
        let lineIdx = 0, canAdvance = false
        function showLine() {
            if (lineIdx >= lines.length) {
                canAdvance = false; monoEl.style.opacity = '0'
                setTimeout(() => {
                    document.removeEventListener('keydown', ekh)
                    window.location.href = 'ending.html'
                }, 800); return
            }
            canAdvance = false; monoEl.style.opacity = '0'
            let text = lines[lineIdx].text ?? lines[lineIdx]; lineIdx++
            setTimeout(() => { monoEl.textContent = text; monoEl.style.opacity = '1'; setTimeout(() => { canAdvance = true }, 600) }, 400)
        }
        function advance() { if (canAdvance) showLine() }
        function ekh(e) { if (['Space','Enter','ArrowRight'].includes(e.code)) { e.preventDefault(); advance() } }
        container.addEventListener('click', advance); document.addEventListener('keydown', ekh)
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                container.addEventListener('transitionend', () => { setTimeout(showLine, 500) }, { once: true })
                container.style.opacity = '1'
            })
        })
    }

    /* ===== 입력 ===== */
    document.addEventListener('keydown', e => {
        keysPressed[e.key] = true
        if (e.key !== 'e' && e.key !== 'E') return
        if (isLocked || dlg.isActive) return
        let phoneItem = el('phone-item')
        if (isNear(phoneItem) && !phoneChecked) { phoneChecked = true; showDay4Phone() }
    })
    document.addEventListener('keyup', e => { keysPressed[e.key] = false })

    /* ===== 게임 루프 ===== */
    function moveCharacter() {
        let scaleX = isFacingLeft ? -1 : 1
        player.style.left = playerX + 'px'; player.style.transform = `scaleX(${scaleX})`
        let bubble = player.querySelector('.speech-bubble')
        if (bubble) bubble.style.transform = `translateX(-50%) scaleX(${scaleX})`
        if (isMoving) { player.classList.add('walk'); player.classList.remove('idle') }
        else          { player.classList.add('idle'); player.classList.remove('walk') }
    }
    function updatePrompts() {
        if (isLocked || dlg.isActive) { hidePrompt(); return }
        let phoneItem = el('phone-item')
        if (isNear(phoneItem) && !phoneChecked) { showPrompt('E — 핸드폰 확인하기', phoneItem); return }
        hidePrompt()
    }
    function gameLoop() {
        isMoving = false
        if (!isLocked) {
            if (keysPressed['d'] || keysPressed['D']) { playerX += step; isFacingLeft = false; isMoving = true }
            if (keysPressed['a'] || keysPressed['A']) { playerX -= step; isFacingLeft = true;  isMoving = true }
        }
        playerX = Math.max(minX, Math.min(maxX, playerX))
        moveCharacter(); updatePrompts()
        requestAnimationFrame(gameLoop)
    }

    /* ===== 진입점 ===== */
    loadScripts().then(() => {
        let startEl = el('scene-room-2'); startEl.classList.add('active'); startEl.appendChild(player)
        player.style.left = playerX + 'px'
        isLocked = true
        setTimeout(() => {
            dlg.play(SCRIPTS.day4_room_wakeup ?? [], () => {
                phoneChecked = true
                setTimeout(showDay4Phone, 800)
            })
        }, 400)
        gameLoop()
    })

})() }


/* ============================================================
   엔딩  ending.html
   ============================================================ */
if (PAGE === 'ending') { ;(function() {

    const bgm = new Audio('bgm/atlasaudio-depressed-519613.mp3')
    bgm.loop = true; bgm.volume = 0.4
    bgm.play().catch(() => {})
    document.addEventListener('click',   () => bgm.play().catch(() => {}), { once: true })
    document.addEventListener('keydown', () => bgm.play().catch(() => {}), { once: true })

    window.restart = function() { window.location.href = 'day1.html' }

})() }


/* ============================================================
   타이틀  index.html
   ============================================================ */
if (PAGE === 'index') { ;(function() {
    const bgm = new Audio('bgm/folk_acoustic-morning-in-the-forest-149255.mp3')
    bgm.loop = true; bgm.volume = 0.4
    function fadeBGM() {
        let t = setInterval(() => { bgm.volume = Math.max(0, bgm.volume - 0.02); if (bgm.volume <= 0) { bgm.pause(); bgm.volume = 0.4; clearInterval(t) } }, 50)
    }
    function goToScene(id) {
        let current = document.querySelector('.scene.active')
        if (!current) return
        current.classList.add('fade-out')
        current.addEventListener('animationend', () => {
            current.classList.remove('active', 'fade-out')
            let next = document.getElementById(id)
            next.classList.add('active')

            if (id === 'scene-game') {
                let fill = next.querySelector('.progress-bar-fill')
                fill.style.animation = 'none'
                fill.offsetHeight
                fill.style.animation = ''
                fill.addEventListener('animationend', () => {
                    setTimeout(() => { window.location.href = 'day1.html' }, 1000)
                }, { once: true })
            }
        }, { once: true })
    }

    document.getElementById('start-btn').addEventListener('click', () => goToScene('scene-game'))
    document.getElementById('title-logo').addEventListener('click', () => goToScene('scene-game'))

    ;['start-btn', 'title-logo'].forEach(id => {
        document.getElementById(id).addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') document.getElementById(id).click()
        })
    })

})() }
