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
let editingExamId = null;

function initApp() {
    loadExamsFromSupabase();

    // Check URL parameters for direct modal opening
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('create') === 'true') {
        window.requireAuth(() => {
            els.addExamModal.classList.remove('hidden');
        });
    }

    const examIdParam = urlParams.get('examId');
    if (examIdParam) {
        window.requireAuth(() => {
            document.getElementById('student-exam-id').value = examIdParam;
            els.studentAuthSection.classList.remove('hidden');
            els.studentModal.classList.remove('hidden');
            isJoinExamMode = true;
        });
    }

    els.btnJoinExam.addEventListener('click', () => {
        window.requireAuth(() => {
            els.studentAuthSection.classList.remove('hidden');
            els.studentModal.classList.remove('hidden');
            isJoinExamMode = true;
        });
    });

    els.btnAddNewExam.addEventListener('click', () => {
        window.requireAuth(() => {
            editingExamId = null;
            document.querySelector('#add-exam-modal .modal-header h3').textContent = 'Create Custom Exam';
            els.btnSaveCustomExam.textContent = 'Upload Exam';
            els.customExamTitle.value = '';
            els.customExamTime.value = '';
            els.customExamCode.value = '';
            els.addExamModal.classList.remove('hidden');
        });
    });
    els.btnCloseAddExam.addEventListener('click', () => els.addExamModal.classList.add('hidden'));

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

    els.btnSaveCustomExam.addEventListener('click', async () => {
        const title = els.customExamTitle.value.trim();
        const code = els.customExamCode.value.trim();
        const timeVal = els.customExamTime.value.trim();
        
        if (!title) { alert("Please enter an Exam Title."); return; }
        
        let finalQuestions = [];
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
                finalQuestions = parsedData;
            } catch (e) {
                alert("Error parsing code: " + e.message); return;
            }
        } else if (manualQuestions.length > 0) {
            finalQuestions = manualQuestions;
        }

        els.btnSaveCustomExam.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
        els.btnSaveCustomExam.disabled = true;

        const duration = timeVal && !isNaN(timeVal) ? parseInt(timeVal) : 180;

        try {
            if (typeof supabase !== 'undefined' && supabase.from) {
                let error;
                if (editingExamId) {
                    const result = await supabase.from('exams').update({
                        duration: duration,
                        title: title,
                        questions: finalQuestions
                    }).eq('id', editingExamId);
                    error = result.error;
                } else {
                    const randomId = 'TEST-' + Math.random().toString(36).substring(2, 8).toUpperCase();
                    const result = await supabase.from('exams').insert([
                        { 
                            id: randomId, 
                            password: '', 
                            duration: duration, 
                            marks_correct: 4, 
                            marks_incorrect: -1,
                            teacher_name: 'Community',
                            title: title,
                            questions: finalQuestions
                        }
                    ]);
                    error = result.error;
                }

                if (error) {
                    console.warn("Error saving to database: " + error.message);
                    alert("Error saving exam.");
                } else {
                    alert(editingExamId ? "Exam updated successfully!" : "Exam uploaded successfully!");
                    els.addExamModal.classList.add('hidden');
                    loadExamsFromSupabase(); // refresh list
                }
            } else {
                alert("Database connection not found.");
            }
        } catch (err) {
            console.error("Exception during save:", err);
            alert("Exception during save.");
        } finally {
            els.btnSaveCustomExam.innerHTML = editingExamId ? 'Save Changes' : 'Upload Exam';
            els.btnSaveCustomExam.disabled = false;
        }
    });

    els.btnCloseStudent.addEventListener('click', () => {
        els.studentModal.classList.add('hidden');
    });

    els.btnConfirmStartExam.addEventListener('click', async () => {
        els.studentAuthError.classList.add('hidden');

        if (isJoinExamMode) {
            const idVal = document.getElementById('student-exam-id').value.trim();
            const passVal = document.getElementById('student-exam-pass').value.trim();
            const isAuthHidden = els.studentAuthSection.classList.contains('hidden');
            
            if (!idVal || (!passVal && !isAuthHidden)) {
                alert("Exam ID and Password are required to join private exams.");
                return;
            }

            els.btnConfirmStartExam.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Verifying...';
            els.btnConfirmStartExam.disabled = true;

            try {
                if (typeof supabase !== 'undefined' && supabase.from) {
                    let query = supabase.from('exams').select('*').eq('id', idVal);
                    if (passVal) {
                        query = query.eq('password', passVal);
                    }
                    const { data, error } = await query.single();
                        
                    if (error || !data) {
                        if (els.studentAuthSection.classList.contains('hidden')) {
                            alert("Error: Exam not found or could not be loaded.");
                        } else {
                            els.studentAuthError.classList.remove('hidden');
                        }
                        return;
                    }
                    
                    EXAM_CONFIG.totalTimeInMinutes = data.duration;
                    EXAM_CONFIG.marksPerCorrect = data.marks_correct;
                    EXAM_CONFIG.marksPerIncorrect = data.marks_incorrect;
                    EXAM_CONFIG.examTitle = data.title || ("Exam: " + data.id);
                    EXAM_CONFIG.isCustomExam = true;
                    EXAM_CONFIG.googleAppsScriptUrl = "";
                    if (data.questions && Array.isArray(data.questions)) {
                        localStorage.setItem('custom_questions', JSON.stringify(data.questions));
                    }
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

async function loadExamsFromSupabase() {
    const examList = document.getElementById('exam-list');
    examList.innerHTML = '<p style="text-align:center; padding: 2rem;">Loading exams...</p>';
    if (typeof supabase !== 'undefined' && supabase.from) {
        const { data, error } = await supabase.from('exams').select('*').order('created_at', { ascending: false });
        if (data && data.length > 0) {
            examList.innerHTML = '';
            data.forEach(exam => {
                const card = document.createElement('div');
                card.className = 'exam-card';
                card.innerHTML = `
                    <div class="exam-badges">
                        <span class="badge-subject">${exam.teacher_name || 'Community'}</span>
                        <span class="badge-time"><i class="fa-regular fa-clock"></i> ${exam.duration} min</span>
                    </div>
                    <h3 class="exam-card-title">${exam.title || 'Untitled Exam'}</h3>
                    <p class="exam-card-desc">Exam ID: ${exam.id}</p>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1rem;">
                        <button class="btn-text-primary btn-start-exam" onclick="joinExam('${exam.id}')" style="margin-top: 0;">Start exam <i class="fa-solid fa-arrow-right"></i></button>
                        <div>
                            <button class="btn-text" style="color: var(--text-main); padding: 0.5rem; margin-right: 0.5rem;" onclick="editExam('${exam.id}')" title="Edit Exam"><i class="fa-solid fa-pen"></i></button>
                            <button class="btn-text" style="color: #ef4444; padding: 0.5rem;" onclick="removeExam('${exam.id}')" title="Remove Exam"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    </div>
                `;
                examList.appendChild(card);
            });
        } else {
            examList.innerHTML = '<p style="text-align:center; padding: 2rem;">No exams found. Be the first to add one!</p>';
        }
    } else {
        examList.innerHTML = '<p style="text-align:center; padding: 2rem; color: red;">Database not connected.</p>';
    }
}

window.joinExam = function(examId) {
    window.requireAuth(() => {
        document.getElementById('student-exam-id').value = examId;
        // Hide password section for community exams since they don't use it, 
        // or just let it be empty if there's no password
        document.getElementById('student-exam-pass').value = '';
        els.studentAuthSection.classList.add('hidden'); // Hide it because it's a public exam
        
        // We need to fetch questions when they start, or we can fetch them now
        // But the start button logic handles the fetch if isJoinExamMode is true!
        // wait, join exam logic in btnConfirmStartExam fetches from supabase by id and password. 
        // If password is '', it will match because we save password as ''
        isJoinExamMode = true;
        els.studentModal.classList.remove('hidden');
    });
};

window.removeExam = async function(examId) {
    window.requireAuth(async () => {
        if (!confirm("Are you sure you want to delete this exam? This action cannot be undone.")) return;
        
        try {
            if (typeof supabase !== 'undefined' && supabase.from) {
                const { error } = await supabase.from('exams').delete().eq('id', examId);
                if (error) {
                    alert("Error deleting exam: " + error.message);
                } else {
                    alert("Exam removed successfully.");
                    loadExamsFromSupabase(); // Refresh the list
                }
            }
        } catch (err) {
            console.error("Exception deleting exam:", err);
            alert("Failed to delete exam.");
        }
    });
};

window.editExam = async function(examId) {
    window.requireAuth(async () => {
        try {
            const { data, error } = await supabase.from('exams').select('*').eq('id', examId).single();
            if (error) throw error;
            
            editingExamId = examId;
            document.querySelector('#add-exam-modal .modal-header h3').textContent = 'Edit Custom Exam';
            els.btnSaveCustomExam.textContent = 'Save Changes';
            
            els.customExamTitle.value = data.title || '';
            els.customExamTime.value = data.duration || '';
            
            if (data.questions && data.questions.length > 0) {
                els.customExamCode.value = JSON.stringify(data.questions, null, 2);
            } else {
                els.customExamCode.value = '';
            }
            
            els.addExamModal.classList.remove('hidden');
        } catch (err) {
            console.error("Exception fetching exam details:", err);
            alert("Failed to fetch exam details.");
        }
    });
};

window.addEventListener('DOMContentLoaded', initApp);
