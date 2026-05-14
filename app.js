const els = {
    navExams: document.getElementById('nav-exams'),
    homeContainer: document.getElementById('home-container'),
    browseContainer: document.getElementById('browse-container'),
    btnHomeBrowse: document.getElementById('btn-home-browse'),
    btnHomeCreate: document.getElementById('btn-home-create'),
    addExamModal: document.getElementById('add-exam-modal'),
    btnAddNewExam: document.getElementById('btn-add-new-exam'),
    btnCloseAddExam: document.getElementById('btn-close-add-exam'),
    btnSaveCustomExam: document.getElementById('btn-save-custom-exam'),
    customExamTitle: document.getElementById('custom-exam-title'),
    customExamTime: document.getElementById('custom-exam-time'),
    customExamCode: document.getElementById('custom-exam-code')
};

let pendingExamIsBlank = false;

function switchView(viewId) {
    document.querySelectorAll('.view-container').forEach(el => el.classList.remove('active-view'));
    document.getElementById(viewId).classList.add('active-view');
    window.scrollTo(0, 0);
}

function initApp() {
    els.btnHomeBrowse.addEventListener('click', () => switchView('browse-container'));
    els.navExams.addEventListener('click', () => switchView('browse-container'));
    els.btnHomeCreate.addEventListener('click', () => els.addExamModal.classList.remove('hidden'));
    els.btnAddNewExam.addEventListener('click', () => els.addExamModal.classList.remove('hidden'));
    els.btnCloseAddExam.addEventListener('click', () => els.addExamModal.classList.add('hidden'));

    document.querySelector('.btn-start-exam').addEventListener('click', () => {
        EXAM_CONFIG.googleAppsScriptUrl = "";
        EXAM_CONFIG.isCustomExam = false;
        EXAM_CONFIG.allowAddingQuestionsDuringExam = false; // Default exam restricts adding questions
        pendingExamIsBlank = false;
        document.getElementById('student-modal').classList.remove('hidden');
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
        } else {
            localStorage.removeItem('custom_questions');
        }
        
        els.addExamModal.classList.add('hidden');
        pendingExamIsBlank = !code;
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
