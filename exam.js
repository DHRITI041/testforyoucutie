// Exam App State
let questions = [];
let currentQuestionIndex = 0;
let timeRemaining = 0;
let timerInterval = null;
let userResponses = {}; 
let subjects = [];
let currentSubject = "All";
let isExamActive = false;

let studentExamId = null;
let studentDetailsObj = null;

// Prevent accidental exit
window.addEventListener('beforeunload', (e) => {
    if (isExamActive) {
        e.preventDefault();
        e.returnValue = 'You are currently in an exam. Are you sure you want to leave? Your progress will be lost.';
    }
});

// Prevent back button
history.pushState(null, null, location.href);
window.onpopstate = function () {
    if (isExamActive) {
        history.go(1);
    }
};

// Prevent right-click and copy
document.addEventListener('contextmenu', (e) => {
    if (isExamActive) e.preventDefault();
});

document.addEventListener('copy', (e) => {
    if (isExamActive) e.preventDefault();
});

// Tab switching cheat detection
let cheatWarningsCount = parseInt(localStorage.getItem('cheatWarningsCount')) || 0;
let isPenaltyActive = false;
let penaltyTimerInterval = null;

function showPenaltyModal(penaltySeconds) {
    const countSpan = document.getElementById('cheat-warning-count');
    if (countSpan) countSpan.textContent = cheatWarningsCount;
    
    const modal = document.getElementById('cheat-warning-modal');
    const btn = document.getElementById('btn-acknowledge-warning');
    const msg = document.getElementById('cheat-warning-msg');
    
    isPenaltyActive = true;
    btn.disabled = true;
    btn.style.opacity = '0.5';
    btn.style.cursor = 'not-allowed';
    
    const penaltyMinutes = Math.ceil(penaltySeconds / 60);
    if (msg) msg.textContent = `You are not allowed to change tabs. Due to repeated violations, your exam is paused and you are locked out for ${penaltyMinutes} minutes.`;
    
    if (penaltyTimerInterval) clearInterval(penaltyTimerInterval);
    
    penaltyTimerInterval = setInterval(() => {
        penaltySeconds--;
        if (penaltySeconds <= 0) {
            clearInterval(penaltyTimerInterval);
            isPenaltyActive = false;
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
            btn.textContent = "I Understand";
            if (msg) msg.textContent = "You are not allowed to change tabs, minimize the browser, or leave the exam window. This activity has been recorded. Repeated violations may result in exam cancellation.";
            localStorage.removeItem('penaltyEndTime');
        } else {
            const m = Math.floor(penaltySeconds / 60);
            const s = penaltySeconds % 60;
            btn.textContent = `Wait ${m}:${s.toString().padStart(2, '0')}`;
        }
    }, 1000);
    
    const m = Math.floor(penaltySeconds / 60);
    const s = penaltySeconds % 60;
    btn.textContent = `Wait ${m}:${s.toString().padStart(2, '0')}`;
    
    modal.classList.remove('hidden');
}

function checkActivePenalty() {
    if (cheatWarningsCount >= 9) {
        alert("Your exam was automatically submitted due to excessive rule violations.");
        submitExam();
        if (studentDetailsObj && studentDetailsObj.isPublic) {
            cheatWarningsCount = 0;
            localStorage.setItem('cheatWarningsCount', 0);
            localStorage.removeItem('penaltyEndTime');
        }
        return;
    }
    
    const penaltyEndTime = parseInt(localStorage.getItem('penaltyEndTime')) || 0;
    const now = Date.now();
    if (penaltyEndTime > now) {
        const remainingSeconds = Math.ceil((penaltyEndTime - now) / 1000);
        showPenaltyModal(remainingSeconds);
    }
}

document.addEventListener('visibilitychange', () => {
    if (isExamActive && document.visibilityState === 'hidden') {
        cheatWarningsCount++;
        localStorage.setItem('cheatWarningsCount', cheatWarningsCount);
        
        if (cheatWarningsCount >= 9) {
            document.getElementById('cheat-warning-modal').classList.add('hidden');
            alert("Your exam has been automatically submitted due to excessive rule violations (9 warnings).");
            submitExam();
            if (studentDetailsObj && studentDetailsObj.isPublic) {
                cheatWarningsCount = 0;
                localStorage.setItem('cheatWarningsCount', 0);
                localStorage.removeItem('penaltyEndTime');
            }
        } else if (cheatWarningsCount >= 3) {
            const penaltyMinutes = (cheatWarningsCount - 2) * 5;
            const penaltySeconds = penaltyMinutes * 60;
            const penaltyEndTime = Date.now() + (penaltySeconds * 1000);
            localStorage.setItem('penaltyEndTime', penaltyEndTime);
            showPenaltyModal(penaltySeconds);
        } else {
            const countSpan = document.getElementById('cheat-warning-count');
            if (countSpan) countSpan.textContent = cheatWarningsCount;
            document.getElementById('cheat-warning-modal').classList.remove('hidden');
        }
    }
});

const STATES = {
    NOT_VISITED: 'not-visited',
    NOT_ANSWERED: 'not-answered',
    ANSWERED: 'answered',
    MARKED: 'marked',
    ANSWERED_MARKED: 'answered-marked'
};

const els = {
    examContainer: document.getElementById('exam-container'),
    resultContainer: document.getElementById('result-container'),
    loading: document.getElementById('loading-overlay'),
    loadingText: document.getElementById('loading-text'),
    timerContainer: document.getElementById('timer-container'),
    timeLeft: document.getElementById('time-left'),
    qNum: document.getElementById('current-q-num'),
    totalNum: document.getElementById('total-q-num'),
    qSubject: document.getElementById('q-subject'),
    qText: document.getElementById('q-text'),
    optionsContainer: document.getElementById('options-container'),
    btnMarkReview: document.getElementById('btn-mark-review'),
    btnClear: document.getElementById('btn-clear'),
    btnSaveNext: document.getElementById('btn-save-next'),
    btnSubmit: document.getElementById('btn-submit-exam'),
    subjectTabs: document.getElementById('subject-tabs'),
    paletteGrid: document.getElementById('palette-grid'),
    currentSubjectLabel: document.getElementById('current-subject-label'),
    headerTitle: document.getElementById('header-title'),
    markCorrect: document.getElementById('mark-correct'),
    markIncorrect: document.getElementById('mark-incorrect'),

    btnOpenAdmin: document.getElementById('btn-open-admin'),
    adminModal: document.getElementById('admin-modal'),
    btnCloseAdmin: document.getElementById('btn-close-admin'),
    btnSaveQuestion: document.getElementById('btn-save-question'),
    btnExportQuestions: document.getElementById('btn-export-questions'),
    addQSubject: document.getElementById('add-q-subject'),
    addQText: document.getElementById('add-q-text'),
    addQOpt0: document.getElementById('add-q-opt0'),
    addQOpt1: document.getElementById('add-q-opt1'),
    addQOpt2: document.getElementById('add-q-opt2'),
    addQOpt3: document.getElementById('add-q-opt3'),
    addQCorrect: document.getElementById('add-q-correct')
};

function switchView(viewId) {
    document.querySelectorAll('.view-container').forEach(el => el.classList.remove('active-view'));
    document.getElementById(viewId).classList.add('active-view');
    window.scrollTo(0, 0);
}

function initExamApp() {
    // Load config override
    const override = localStorage.getItem('exam_config_override');
    if (override) {
        Object.assign(EXAM_CONFIG, JSON.parse(override));
    }

    // Load student details
    const studentJson = localStorage.getItem('student_details');
    if (studentJson) {
        studentDetailsObj = JSON.parse(studentJson);
        studentExamId = studentDetailsObj.examId;
        document.getElementById('student-name-display').textContent = studentDetailsObj.name;
        document.getElementById('student-roll-display').textContent = 'Roll: ' + studentDetailsObj.roll;
        document.getElementById('student-avatar').src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(studentDetailsObj.name) + '&background=2563eb&color=fff';
    }

    // Admin Events
    els.btnOpenAdmin.addEventListener('click', () => els.adminModal.classList.remove('hidden'));
    els.btnCloseAdmin.addEventListener('click', () => els.adminModal.classList.add('hidden'));
    els.btnSaveQuestion.addEventListener('click', () => {
        const subject = els.addQSubject.value.trim();
        const text = els.addQText.value.trim();
        const opt0 = els.addQOpt0.value.trim();
        const opt1 = els.addQOpt1.value.trim();
        const opt2 = els.addQOpt2.value.trim();
        const opt3 = els.addQOpt3.value.trim();
        const correct = parseInt(els.addQCorrect.value);

        if (!text || !opt0 || !opt1 || !opt2 || !opt3) {
            alert("Please fill out the question and all options!");
            return;
        }

        const newQuestion = {
            id: Date.now(),
            subject: subject || "General",
            question: text,
            options: [opt0, opt1, opt2, opt3],
            correctOption: correct
        };

        const localData = localStorage.getItem('custom_questions');
        let customQuestions = [];
        if (localData) {
            try { customQuestions = JSON.parse(localData); } catch(e){}
        }
        customQuestions.push(newQuestion);
        localStorage.setItem('custom_questions', JSON.stringify(customQuestions));

        const newGlobalIndex = questions.length;
        newQuestion.globalIndex = newGlobalIndex;
        questions.push(newQuestion);
        userResponses[newGlobalIndex] = { selectedOption: null, state: STATES.NOT_VISITED };

        if (!subjects.includes(newQuestion.subject)) {
            subjects.push(newQuestion.subject);
            renderSubjectTabs();
        }

        els.totalNum.textContent = questions.length;
        renderQuestionPalette();
        
        if (questions.length === 1) {
            loadQuestion(0);
            if (EXAM_CONFIG.showTimer && !timerInterval) startTimer();
        }
        alert("Question added successfully!");
        els.adminModal.classList.add('hidden');
        els.addQText.value = ''; els.addQOpt0.value = ''; els.addQOpt1.value = ''; els.addQOpt2.value = ''; els.addQOpt3.value = '';
    });
    
    els.btnExportQuestions.addEventListener('click', () => {
        const exportData = JSON.stringify(questions, null, 4);
        const blob = new Blob(['const FALLBACK_QUESTIONS = \n' + exportData + ';'], {type: 'application/javascript'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'questions.js';
        document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    });

    const isBlank = localStorage.getItem('pending_exam_blank') === 'true';
    startExamSession(isBlank);
}

async function startExamSession(isBlank = false) {
    switchView('exam-container');
    questions = []; currentQuestionIndex = 0; timeRemaining = EXAM_CONFIG.totalTimeInMinutes * 60;
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = null; userResponses = {};

    els.headerTitle.textContent = EXAM_CONFIG.examTitle;
    els.markCorrect.textContent = EXAM_CONFIG.marksPerCorrect;
    els.markIncorrect.textContent = EXAM_CONFIG.marksPerIncorrect;

    if (!EXAM_CONFIG.showTimer) els.timerContainer.classList.add('hidden');
    else els.timerContainer.classList.remove('hidden');

    if (isBlank) { setupExam([]); return; }

    els.loading.classList.remove('hidden');
    els.loadingText.textContent = "Loading Questions...";

    try {
        let data = [];
        if (EXAM_CONFIG.googleAppsScriptUrl && EXAM_CONFIG.googleAppsScriptUrl.trim() !== "") {
            els.loadingText.textContent = "Fetching from Server...";
            const response = await fetch(EXAM_CONFIG.googleAppsScriptUrl);
            data = await response.json();
        } else if (!EXAM_CONFIG.isCustomExam) {
            els.loadingText.textContent = "Loading local questions...";
            data = typeof FALLBACK_QUESTIONS !== 'undefined' ? FALLBACK_QUESTIONS : [];
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        const localData = localStorage.getItem('custom_questions');
        if (localData) {
            try { data = [...data, ...JSON.parse(localData)]; } catch (e) {}
        }
        setupExam(data || []);
    } catch (error) {
        console.error(error);
        els.loadingText.textContent = "Error loading questions.";
        els.loadingText.style.color = "red";
    }
}

function setupExam(data) {
    let normalizedData = data.map(q => {
        let newQ = { ...q };
        
        // Map "unit" to "subject" if needed
        if (!newQ.subject && newQ.unit) {
            newQ.subject = newQ.unit;
        }
        
        // Convert object options {a: '..', b: '..'} to array ['..', '..']
        if (newQ.options && !Array.isArray(newQ.options) && typeof newQ.options === 'object') {
            const keys = Object.keys(newQ.options).sort();
            newQ.options = keys.map(k => newQ.options[k]);
            
            if (newQ.correctAnswer && typeof newQ.correctAnswer === 'string') {
                newQ.correctOption = keys.indexOf(newQ.correctAnswer.toLowerCase());
            }
        }
        
        // Fallback for options if still not an array
        if (!Array.isArray(newQ.options)) {
            newQ.options = [];
        }
        
        return newQ;
    });

    questions = normalizedData.map((q, idx) => ({ ...q, globalIndex: idx }));
    questions.forEach((q, idx) => {
        userResponses[idx] = { selectedOption: null, state: idx === 0 ? STATES.NOT_ANSWERED : STATES.NOT_VISITED };
    });
    els.totalNum.textContent = questions.length;
    const subjectSet = new Set();
    questions.forEach(q => { if (q.subject) subjectSet.add(q.subject); });
    subjects = ["All", ...Array.from(subjectSet)];
    renderSubjectTabs(); renderQuestionPalette();
    els.loading.classList.add('hidden');

    const finishSetup = () => {
        switchView('exam-container');
        isExamActive = true;
        checkActivePenalty();
        if (EXAM_CONFIG.showTimer) startTimer();

        if (questions.length > 0) loadQuestion(0);
        else {
            els.qNum.textContent = "0"; els.qSubject.textContent = "None";
            els.qText.textContent = "No questions added yet. Click 'Add Question' to start building this exam!";
            els.optionsContainer.innerHTML = "";
        }

        const isBlank = localStorage.getItem('pending_exam_blank') === 'true';
        if (!isBlank && !EXAM_CONFIG.allowAddingQuestionsDuringExam) {
            els.btnOpenAdmin.style.display = 'none';
        } else {
            els.btnOpenAdmin.style.display = 'inline-block';
        }
    };

    showAdvertisement(finishSetup);
}

function startTimer() {
    updateTimerDisplay();
    timerInterval = setInterval(() => {
        timeRemaining--; updateTimerDisplay();
        if (timeRemaining <= 300) els.timerContainer.classList.add('warning');
        if (timeRemaining <= 0) { clearInterval(timerInterval); submitExam(); }
    }, 1000);
}

function updateTimerDisplay() {
    const h = Math.floor(timeRemaining / 3600);
    const m = Math.floor((timeRemaining % 3600) / 60);
    const s = timeRemaining % 60;
    els.timeLeft.textContent = 
        h.toString().padStart(2, '0') + ':' + m.toString().padStart(2, '0') + ':' + s.toString().padStart(2, '0');
}

function loadQuestion(index) {
    if (index < 0 || index >= questions.length) return;
    currentQuestionIndex = index;
    const q = questions[index];
    if (userResponses[index].state === STATES.NOT_VISITED) {
        userResponses[index].state = STATES.NOT_ANSWERED;
        updatePaletteBubble(index);
    }
    els.qNum.textContent = index + 1;
    els.qSubject.textContent = q.subject || "General";
    els.qText.textContent = q.question;
    els.optionsContainer.innerHTML = '';
    const currentResponse = userResponses[index].selectedOption;
    q.options.forEach((optText, optIndex) => {
        const lbl = document.createElement('label');
        lbl.className = 'option-label ' + (currentResponse === optIndex ? 'selected' : '');
        const radio = document.createElement('input');
        radio.type = 'radio'; radio.name = 'question-' + index;
        radio.value = optIndex; radio.checked = currentResponse === optIndex;
        radio.addEventListener('change', () => {
            document.querySelectorAll('.option-label').forEach(l => l.classList.remove('selected'));
            lbl.classList.add('selected');
            userResponses[index].selectedOption = optIndex;
        });
        lbl.appendChild(radio); lbl.appendChild(document.createTextNode(optText));
        els.optionsContainer.appendChild(lbl);
    });
    updatePaletteBubble(index);

    // Update btnSaveNext text if it is the last question
    if (index === questions.length - 1) {
        els.btnSaveNext.textContent = "Save & Submit";
    } else {
        els.btnSaveNext.textContent = "Save & Next";
    }
}

function renderSubjectTabs() {
    els.subjectTabs.innerHTML = '';
    subjects.forEach(sub => {
        const btn = document.createElement('button');
        btn.className = 'tab ' + (sub === currentSubject ? 'active' : '');
        btn.textContent = sub;
        btn.onclick = () => {
            currentSubject = sub;
            els.currentSubjectLabel.textContent = sub;
            renderSubjectTabs(); renderQuestionPalette();
        };
        els.subjectTabs.appendChild(btn);
    });
}

function renderQuestionPalette() {
    els.paletteGrid.innerHTML = '';
    questions.forEach((q, idx) => {
        if (currentSubject === "All" || q.subject === currentSubject) {
            const bubble = document.createElement('div');
            bubble.className = 'q-bubble ' + userResponses[idx].state;
            bubble.id = 'bubble-' + idx;
            bubble.textContent = idx + 1;
            bubble.onclick = () => loadQuestion(idx);
            els.paletteGrid.appendChild(bubble);
        }
    });
}

function updatePaletteBubble(index) {
    const bubble = document.getElementById('bubble-' + index);
    if (bubble) bubble.className = 'q-bubble ' + userResponses[index].state;
}

els.btnSaveNext.addEventListener('click', () => {
    if (questions.length === 0) return;
    const currentStatus = userResponses[currentQuestionIndex];
    if (currentStatus.selectedOption !== null) currentStatus.state = STATES.ANSWERED;
    else currentStatus.state = STATES.NOT_ANSWERED;
    updatePaletteBubble(currentQuestionIndex); 
    
    if (currentQuestionIndex === questions.length - 1) {
        document.getElementById('submit-confirm-modal').classList.remove('hidden');
    } else {
        goToNextQuestion();
    }
});

els.btnMarkReview.addEventListener('click', () => {
    if (questions.length === 0) return;
    const currentStatus = userResponses[currentQuestionIndex];
    if (currentStatus.selectedOption !== null) currentStatus.state = STATES.ANSWERED_MARKED;
    else currentStatus.state = STATES.MARKED;
    updatePaletteBubble(currentQuestionIndex); goToNextQuestion();
});

els.btnClear.addEventListener('click', () => {
    if (questions.length === 0) return;
    userResponses[currentQuestionIndex].selectedOption = null;
    userResponses[currentQuestionIndex].state = STATES.NOT_ANSWERED;
    loadQuestion(currentQuestionIndex); 
});

function goToNextQuestion() {
    if (currentQuestionIndex < questions.length - 1) loadQuestion(currentQuestionIndex + 1);
    else {
        const nextUnvisited = questions.findIndex((q, idx) => userResponses[idx].state === STATES.NOT_VISITED);
        if (nextUnvisited !== -1) loadQuestion(nextUnvisited);
    }
}

els.btnSubmit.addEventListener('click', () => {
    document.getElementById('submit-confirm-modal').classList.remove('hidden');
});

document.getElementById('btn-cancel-submit').addEventListener('click', () => {
    document.getElementById('submit-confirm-modal').classList.add('hidden');
});

document.getElementById('btn-confirm-submit').addEventListener('click', () => {
    document.getElementById('submit-confirm-modal').classList.add('hidden');
    submitExam();
});

document.getElementById('btn-acknowledge-warning')?.addEventListener('click', () => {
    document.getElementById('cheat-warning-modal').classList.add('hidden');
});

document.getElementById('btn-analyze-exam')?.addEventListener('click', () => {
    renderAnalysis();
    switchView('analysis-container');
});

function renderAnalysis() {
    const container = document.getElementById('analysis-content');
    if (!container) return;
    
    container.innerHTML = '';
    
    questions.forEach((q, idx) => {
        const response = userResponses[idx];
        const userSelected = response.selectedOption;
        const correctOpt = q.correctOption;
        
        let statusIcon = '<i class="fa-solid fa-minus" style="color: var(--text-muted);"></i>';
        let statusClass = 'analysis-unanswered';
        
        if (userSelected !== null) {
            if (userSelected === correctOpt) {
                statusIcon = '<i class="fa-solid fa-check" style="color: var(--success);"></i>';
                statusClass = 'analysis-correct';
            } else {
                statusIcon = '<i class="fa-solid fa-xmark" style="color: var(--danger);"></i>';
                statusClass = 'analysis-incorrect';
            }
        }
        
        const qCard = document.createElement('div');
        qCard.className = `analysis-card ${statusClass}`;
        
        let optionsHtml = '';
        q.options.forEach((optText, optIdx) => {
            let optClass = 'analysis-option';
            let optIcon = '';
            
            if (optIdx === correctOpt) {
                optClass += ' correct-option';
                optIcon = '<i class="fa-solid fa-check"></i> ';
            } else if (optIdx === userSelected && userSelected !== correctOpt) {
                optClass += ' wrong-option';
                optIcon = '<i class="fa-solid fa-xmark"></i> ';
            }
            
            optionsHtml += `
                <div class="${optClass}">
                    ${optIcon}${optText}
                </div>
            `;
        });
        
        qCard.innerHTML = `
            <div class="analysis-q-header">
                <span class="analysis-q-num">Q${idx + 1}.</span>
                <span class="analysis-q-status">${statusIcon}</span>
            </div>
            <div class="analysis-q-text">${q.question}</div>
            <div class="analysis-options-container">
                ${optionsHtml}
            </div>
        `;
        
        container.appendChild(qCard);
    });
}



function submitExam() {
    isExamActive = false;
    if (timerInterval) clearInterval(timerInterval);
    showAdvertisement(() => {
        switchView('result-container');
        let attempted = 0; let correct = 0; let incorrect = 0;
        questions.forEach((q, idx) => {
            const response = userResponses[idx];
            if (response.selectedOption !== null) {
                attempted++;
                if (response.selectedOption === q.correctOption) correct++; else incorrect++;
            }
        });
        const finalScore = (correct * EXAM_CONFIG.marksPerCorrect) + (incorrect * EXAM_CONFIG.marksPerIncorrect);
        const maxScore = questions.length * EXAM_CONFIG.marksPerCorrect;
        document.getElementById('final-score').textContent = finalScore;
        document.getElementById('max-score').textContent = maxScore;
        document.getElementById('stat-attempted').textContent = attempted;
        document.getElementById('stat-correct').textContent = correct;
        document.getElementById('stat-incorrect').textContent = incorrect;
    });
}

function showAdvertisement(onComplete) {
    switchView('ad-container');
    const btnSkip = document.getElementById('btn-skip-ad');
    if (!btnSkip) {
        onComplete();
        return;
    }
    
    btnSkip.disabled = true;
    let secondsLeft = 5;
    btnSkip.textContent = `Skip Ad (Wait ${secondsLeft}s)`;
    
    const adInterval = setInterval(() => {
        secondsLeft--;
        if (secondsLeft <= 0) {
            clearInterval(adInterval);
            btnSkip.disabled = false;
            btnSkip.textContent = "Skip Ad";
        } else {
            btnSkip.textContent = `Skip Ad (Wait ${secondsLeft}s)`;
        }
    }, 1000);

    btnSkip.onclick = () => {
        if (!btnSkip.disabled) {
            clearInterval(adInterval);
            onComplete();
        }
    };
}

window.addEventListener('DOMContentLoaded', initExamApp);
