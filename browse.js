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
    builderCount: document.getElementById('builder-count'),

    // New Modals
    roleSelectionModal: document.getElementById('role-selection-modal'),
    btnCloseRoleSelection: document.getElementById('btn-close-role-selection'),
    btnRoleTeacher: document.getElementById('btn-role-teacher'),
    btnRoleStudent: document.getElementById('btn-role-student'),
    btnJoinExam: document.getElementById('btn-join-exam'),
    
    teacherModal: document.getElementById('teacher-modal'),
    btnCloseTeacher: document.getElementById('btn-close-teacher'),
    btnGenerateLink: document.getElementById('btn-generate-link'),
    btnCopyLink: document.getElementById('btn-copy-link'),
    teacherExamLink: document.getElementById('teacher-exam-link'),
    teacherLinkContainer: document.getElementById('teacher-link-container'),
    
    studentModal: document.getElementById('student-modal'),
    btnCloseStudent: document.getElementById('btn-close-student'),
    btnConfirmStartExam: document.getElementById('btn-confirm-start-exam'),
    studentAuthSection: document.getElementById('student-auth-section'),
    studentAuthError: document.getElementById('student-auth-error')
};

let pendingExamIsBlank = false;
let manualQuestions = [];
let isJoinExamMode = false;

function initApp() {
    // Check URL parameters for direct modal opening
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('create') === 'true') {
        els.addExamModal.classList.remove('hidden');
    }

    const examIdParam = urlParams.get('examId');
    if (examIdParam) {
        document.getElementById('student-exam-id').value = examIdParam;
        els.studentAuthSection.classList.remove('hidden');
        els.studentModal.classList.remove('hidden');
        isJoinExamMode = true;
    }

    els.btnJoinExam.addEventListener('click', () => {
        els.studentAuthSection.classList.remove('hidden');
        els.studentModal.classList.remove('hidden');
        isJoinExamMode = true;
    });

    els.btnAddNewExam.addEventListener('click', () => {
        els.addExamModal.classList.remove('hidden');
    });
    els.btnCloseAddExam.addEventListener('click', () => els.addExamModal.classList.add('hidden'));

    document.querySelector('.btn-start-exam').addEventListener('click', () => {
        EXAM_CONFIG.googleAppsScriptUrl = "";
        EXAM_CONFIG.isCustomExam = false;
        EXAM_CONFIG.allowAddingQuestionsDuringExam = false; 
        pendingExamIsBlank = false;
        els.roleSelectionModal.classList.remove('hidden');
    });

    // Role Selection
    els.btnCloseRoleSelection.addEventListener('click', () => els.roleSelectionModal.classList.add('hidden'));
    
    els.btnRoleStudent.addEventListener('click', () => {
        els.roleSelectionModal.classList.add('hidden');
        els.studentAuthSection.classList.add('hidden');
        currentProtectedExam = null;
        els.studentModal.classList.remove('hidden');
    });

    els.btnRoleTeacher.addEventListener('click', () => {
        els.roleSelectionModal.classList.add('hidden');
        
        // Auto-generate Exam ID
        const randomId = 'TEST-' + Math.random().toString(36).substring(2, 8).toUpperCase();
        document.getElementById('teacher-exam-id').value = randomId;
        
        els.teacherModal.classList.remove('hidden');
    });

    // Teacher Modal
    els.btnCloseTeacher.addEventListener('click', () => els.teacherModal.classList.add('hidden'));

    els.btnGenerateLink.addEventListener('click', async () => {
        const time = document.getElementById('teacher-exam-time').value || 180;
        const marksCorrect = document.getElementById('teacher-marks-correct').value || 4;
        const toggleNegative = document.getElementById('teacher-negative-toggle').checked;
        const marksIncorrect = toggleNegative ? (document.getElementById('teacher-marks-incorrect').value || -1) : 0;
        const examId = document.getElementById('teacher-exam-id').value.trim();
        const examPass = document.getElementById('teacher-exam-pass').value.trim();
        const teacherName = document.getElementById('teacher-name').value.trim() || 'Teacher';

        if (!examId || !examPass) {
            alert("Please provide an Exam ID and Password for security.");
            return;
        }

        els.btnGenerateLink.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
        els.btnGenerateLink.disabled = true;

        try {
            if (typeof supabase !== 'undefined' && supabase.from) {
                const { data, error } = await supabase.from('exams').insert([
                    { 
                        id: examId, 
                        password: examPass, 
                        duration: parseInt(time), 
                        marks_correct: parseInt(marksCorrect), 
                        marks_incorrect: parseInt(marksIncorrect),
                        teacher_name: teacherName
                    }
                ]);

                if (error) {
                    console.warn("Error saving to database: " + error.message);
                }
            } else {
                console.warn("Database connection not found. Generating link locally.");
            }
        } catch (err) {
            console.error("Exception during save:", err);
        } finally {
            els.btnGenerateLink.innerHTML = 'Generate Link';
            els.btnGenerateLink.disabled = false;
        }

        const link = window.location.origin + window.location.pathname + "?examId=" + encodeURIComponent(examId);
        els.teacherExamLink.value = link;
        els.teacherLinkContainer.classList.remove('hidden');
    });

    document.getElementById('btn-copy-exam-id')?.addEventListener('click', () => {
        const examIdInput = document.getElementById('teacher-exam-id');
        examIdInput.select();
        document.execCommand('copy');
        const btn = document.getElementById('btn-copy-exam-id');
        btn.innerHTML = '<i class="fa-solid fa-check"></i>';
        setTimeout(() => {
            btn.innerHTML = '<i class="fa-regular fa-copy"></i>';
        }, 2000);
    });

    els.btnCopyLink.addEventListener('click', () => {
        els.teacherExamLink.select();
        document.execCommand('copy');
        els.btnCopyLink.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
        setTimeout(() => {
            els.btnCopyLink.innerHTML = '<i class="fa-solid fa-copy"></i> Copy';
        }, 2000);
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
        els.roleSelectionModal.classList.remove('hidden');
    });

    els.btnCloseStudent.addEventListener('click', () => {
        els.studentModal.classList.add('hidden');
    });

    els.btnConfirmStartExam.addEventListener('click', async () => {
        els.studentAuthError.classList.add('hidden');

        if (isJoinExamMode) {
            const idVal = document.getElementById('student-exam-id').value.trim();
            const passVal = document.getElementById('student-exam-pass').value.trim();
            
            if (!idVal || !passVal) {
                alert("Exam ID and Password are required to join.");
                return;
            }

            els.btnConfirmStartExam.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Verifying...';
            els.btnConfirmStartExam.disabled = true;

            try {
                if (typeof supabase !== 'undefined' && supabase.from) {
                    const { data, error } = await supabase
                        .from('exams')
                        .select('*')
                        .eq('id', idVal)
                        .eq('password', passVal)
                        .single();
                        
                    if (error || !data) {
                        els.studentAuthError.classList.remove('hidden');
                        return;
                    }
                    
                    EXAM_CONFIG.totalTimeInMinutes = data.duration;
                    EXAM_CONFIG.marksPerCorrect = data.marks_correct;
                    EXAM_CONFIG.marksPerIncorrect = data.marks_incorrect;
                    EXAM_CONFIG.examTitle = "Exam: " + data.id;
                } else {
                    console.warn("Database not connected, bypassing remote verification.");
                }
            } catch (err) {
                console.error("Exception verifying exam:", err);
            } finally {
                els.btnConfirmStartExam.innerHTML = 'Start Exam Now';
                els.btnConfirmStartExam.disabled = false;
            }
        }

        const name = document.getElementById('student-name').value.trim() || 'Candidate';
        const roll = document.getElementById('student-roll').value.trim() || 'N/A';
        
        localStorage.setItem('student_details', JSON.stringify({ name, roll }));
        localStorage.setItem('pending_exam_blank', pendingExamIsBlank);
        localStorage.setItem('exam_config_override', JSON.stringify(EXAM_CONFIG));

        window.location.href = 'exam.html';
    });
}

window.addEventListener('DOMContentLoaded', initApp);
