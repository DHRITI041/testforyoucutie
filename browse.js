const els = {
    addExamModal: document.getElementById('add-exam-modal'),
    btnAddNewExam: document.getElementById('btn-add-new-exam'),
    btnCloseAddExam: document.getElementById('btn-close-add-exam'),
    btnSaveCustomExam: document.getElementById('btn-save-custom-exam'),
    customExamTitle: document.getElementById('custom-exam-title'),
    customExamTime: document.getElementById('custom-exam-time'),
    customExamCode: document.getElementById('custom-exam-code'),
    
    // Manual Builder
    buildQSubject: document.getElementById('build-q-subject'),
    buildQText: document.getElementById('build-q-text'),
    buildQOpt0: document.getElementById('build-q-opt0'),
    buildQOpt1: document.getElementById('build-q-opt1'),
    buildQOpt2: document.getElementById('build-q-opt2'),
    buildQOpt3: document.getElementById('build-q-opt3'),
    btnAddManualQ: document.getElementById('btn-add-manual-q'),
    builderCount: document.getElementById('builder-count')
};

let pendingExamIsBlank = false;
let manualQuestions = [];

function initApp() {
    // Check URL parameters for direct modal opening
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('create') === 'true') {
        els.addExamModal.classList.remove('hidden');
    }

    els.btnAddNewExam.addEventListener('click', () => els.addExamModal.classList.remove('hidden'));
    els.btnCloseAddExam.addEventListener('click', () => els.addExamModal.classList.add('hidden'));

    document.querySelector('.btn-start-exam').addEventListener('click', () => {
        EXAM_CONFIG.googleAppsScriptUrl = "";
        EXAM_CONFIG.isCustomExam = false;
        EXAM_CONFIG.allowAddingQuestionsDuringExam = false; // Default exam restricts adding questions
        pendingExamIsBlank = false;
        document.getElementById('student-modal').classList.remove('hidden');
    });

    els.btnAddManualQ.addEventListener('click', () => {
        const subject = els.buildQSubject.value.trim();
        const text = els.buildQText.value.trim();
        const opt0 = els.buildQOpt0.value.trim();
        const opt1 = els.buildQOpt1.value.trim();
        const opt2 = els.buildQOpt2.value.trim();
        const opt3 = els.buildQOpt3.value.trim();
        
        let correctRadio = document.querySelector('input[name="build-q-correct"]:checked');
        const correct = correctRadio ? parseInt(correctRadio.value) : 0;

        if (!text || !opt0 || !opt1 || !opt2 || !opt3) {
            alert("Please fill out the question and all options before adding!");
            return;
        }

        const newQuestion = {
            subject: subject || "General",
            question: text,
            options: [opt0, opt1, opt2, opt3],
            correctOption: correct
        };

        manualQuestions.push(newQuestion);
        els.builderCount.textContent = manualQuestions.length + " Added";
        
        // Clear fields
        els.buildQText.value = '';
        els.buildQOpt0.value = '';
        els.buildQOpt1.value = '';
        els.buildQOpt2.value = '';
        els.buildQOpt3.value = '';
        document.querySelector('input[name="build-q-correct"][value="0"]').checked = true;
    });

    els.btnSaveCustomExam.addEventListener('click', () => {
        const title = els.customExamTitle.value.trim();
        const code = els.customExamCode.value.trim();
        const timeVal = els.customExamTime.value.trim();
        
        if (!title) { alert("Please enter an Exam Title."); return; }
        EXAM_CONFIG.examTitle = title;
        if (timeVal && !isNaN(timeVal)) EXAM_CONFIG.totalTimeInMinutes = parseInt(timeVal);
        else EXAM_CONFIG.totalTimeInMinutes = 180;
        
        EXAM_CONFIG.googleAppsScriptUrl = "";
        EXAM_CONFIG.isCustomExam = true;
        EXAM_CONFIG.allowAddingQuestionsDuringExam = document.getElementById('custom-exam-allow-edit').checked;

        // Auto-save any typed but un-added question
        if (els.buildQText.value.trim()) {
            els.btnAddManualQ.click(); 
        }

        if (code) {
            try {
                let codeToEval = code;
                if (codeToEval.match(/^(const|let|var)\s+\w+\s*=\s*/)) codeToEval = codeToEval.replace(/^(const|let|var)\s+\w+\s*=\s*/, '');
                if (codeToEval.endsWith(';')) codeToEval = codeToEval.slice(0, -1);
                let parsedData = new Function("return " + codeToEval)();
                if (!Array.isArray(parsedData)) throw new Error("Data must be an array.");
                localStorage.setItem('custom_questions', JSON.stringify(parsedData));
            } catch (e) {
                alert("Error parsing code: " + e.message); return;
            }
        } else if (manualQuestions.length > 0) {
            localStorage.setItem('custom_questions', JSON.stringify(manualQuestions));
        } else {
            localStorage.removeItem('custom_questions');
        }
        
        els.addExamModal.classList.add('hidden');
        pendingExamIsBlank = !code && manualQuestions.length === 0;
        document.getElementById('student-modal').classList.remove('hidden');
    });

    document.getElementById('btn-close-student').addEventListener('click', () => {
        document.getElementById('student-modal').classList.add('hidden');
    });

    document.getElementById('btn-confirm-start-exam').addEventListener('click', () => {
        const name = document.getElementById('student-name').value.trim() || 'Candidate';
        const roll = document.getElementById('student-roll').value.trim() || 'N/A';
        
        localStorage.setItem('student_details', JSON.stringify({ name, roll }));
        localStorage.setItem('pending_exam_blank', pendingExamIsBlank);
        localStorage.setItem('exam_config_override', JSON.stringify(EXAM_CONFIG));

        window.location.href = 'exam.html';
    });
}

window.addEventListener('DOMContentLoaded', initApp);
