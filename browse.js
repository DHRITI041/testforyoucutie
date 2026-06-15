const els = {
    addExamModal: document.getElementById('add-exam-modal'),
    btnAddNewExam: document.getElementById('btn-add-new-exam'),
    btnCloseAddExam: document.getElementById('btn-close-add-exam'),
    btnSaveCustomExam: document.getElementById('btn-save-custom-exam'),
    customExamTitle: document.getElementById('custom-exam-title'),
    customExamTime: document.getElementById('custom-exam-time'),
    customExamCode: document.getElementById('custom-exam-code'),
    customExamMarksCorrect: document.getElementById('custom-exam-marks-correct'),
    customExamMarksIncorrect: document.getElementById('custom-exam-marks-incorrect'),
    customExamPassword: document.getElementById('custom-exam-password'),
    
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
    btnStartExam: document.getElementById('btn-start-exam'),
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
    studentAuthError: document.getElementById('student-auth-error'),

    deleteConfirmModal: document.getElementById('delete-confirm-modal'),
    btnCancelDelete: document.getElementById('btn-cancel-delete'),
    btnConfirmDelete: document.getElementById('btn-confirm-delete'),

    btnBackToBrowse: document.getElementById('btn-back-to-browse'),
    monitorContainer: document.getElementById('monitor-container'),
    browseContainer: document.getElementById('browse-container'),
    monitorExamIdDisplay: document.getElementById('monitor-exam-id-display'),
    monitorStudentsList: document.getElementById('monitor-students-list'),

    monitorAuthModal: document.getElementById('monitor-auth-modal'),
    monitorAuthPassword: document.getElementById('monitor-auth-password'),
    monitorAuthError: document.getElementById('monitor-auth-error'),
    btnCancelMonitorAuth: document.getElementById('btn-cancel-monitor-auth'),
    btnConfirmMonitorAuth: document.getElementById('btn-confirm-monitor-auth')
};

let pendingExamIdForRole = null;
let pendingExamIsBlank = false;
let manualQuestions = [];
let isJoinExamMode = false;
let editingExamId = null;
let examToDelete = null;
let currentMonitorSubscription = null;
let monitoredStudents = {};
let pendingMonitorExamId = null;
let pendingMonitorExamPassword = null;

function initApp() {
    loadExamsFromSupabase();

    // Check URL parameters for direct modal opening
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('create') === 'true') {
        window.requireAuth(() => {
            els.addExamModal.classList.remove('hidden');
        });
    }

    if (urlParams.get('start') === 'true') {
        els.roleSelectionModal.classList.remove('hidden');
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
            els.customExamMarksCorrect.value = '4';
            els.customExamMarksIncorrect.value = '-1';
            els.customExamPassword.value = '';
            els.customExamCode.value = '';
            els.addExamModal.classList.remove('hidden');
        });
    });
    els.btnCloseAddExam.addEventListener('click', () => els.addExamModal.classList.add('hidden'));

    // Role Selection

    if (els.btnStartExam) {
        els.btnStartExam.addEventListener('click', () => {
            pendingExamIdForRole = null;
            els.roleSelectionModal.classList.remove('hidden');
        });
    }

    els.btnCloseRoleSelection.addEventListener('click', () => {
        els.roleSelectionModal.classList.add('hidden');
    });

    els.btnRoleStudent.addEventListener('click', () => {
        els.roleSelectionModal.classList.add('hidden');
        
        if (pendingExamIdForRole) {
            document.getElementById('student-exam-id').value = pendingExamIdForRole;
            document.getElementById('student-exam-pass').value = '';
            els.studentAuthSection.classList.add('hidden'); 
            isJoinExamMode = true;
            pendingExamIsBlank = false;
        } else {
            els.studentAuthSection.classList.add('hidden');
            currentProtectedExam = null;
            isJoinExamMode = false;
            pendingExamIsBlank = true;
        }
        
        els.studentModal.classList.remove('hidden');
    });

    els.btnRoleTeacher.addEventListener('click', () => {
        els.roleSelectionModal.classList.add('hidden');
        
        if (pendingExamIdForRole) {
            document.getElementById('teacher-exam-id').value = pendingExamIdForRole;
        } else {
            const randomId = 'TEST-' + Math.random().toString(36).substring(2, 8).toUpperCase();
            document.getElementById('teacher-exam-id').value = randomId;
        }
        
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
                let dbError = null;
                if (pendingExamIdForRole) {
                    const { error } = await supabase.from('exams').update({ 
                        password: examPass, 
                        duration: parseInt(time), 
                        marks_correct: parseInt(marksCorrect), 
                        marks_incorrect: parseInt(marksIncorrect),
                        teacher_name: teacherName
                    }).eq('id', examId);
                    dbError = error;
                } else {
                    const { error } = await supabase.from('exams').insert([
                        { 
                            id: examId, 
                            password: examPass, 
                            duration: parseInt(time), 
                            marks_correct: parseInt(marksCorrect), 
                            marks_incorrect: parseInt(marksIncorrect),
                            teacher_name: teacherName
                        }
                    ]);
                    dbError = error;
                }

                if (dbError) {
                    console.warn("Error saving to database: " + dbError.message);
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
        const mcVal = els.customExamMarksCorrect.value.trim();
        const miVal = els.customExamMarksIncorrect.value.trim();
        const passwordVal = els.customExamPassword.value.trim();
        const marksCorrect = mcVal && !isNaN(mcVal) ? parseInt(mcVal) : 4;
        const marksIncorrect = miVal && !isNaN(miVal) ? parseInt(miVal) : -1;

        try {
            if (typeof supabase !== 'undefined' && supabase.from) {
                let error;
                if (editingExamId) {
                    const result = await supabase.from('exams').update({
                        duration: duration,
                        title: title,
                        password: passwordVal,
                        marks_correct: marksCorrect,
                        marks_incorrect: marksIncorrect,
                        questions: finalQuestions
                    }).eq('id', editingExamId);
                    error = result.error;
                } else {
                    const randomId = 'TEST-' + Math.random().toString(36).substring(2, 8).toUpperCase();
                    const result = await supabase.from('exams').insert([
                        { 
                            id: randomId, 
                            password: passwordVal, 
                            duration: duration, 
                            marks_correct: marksCorrect, 
                            marks_incorrect: marksIncorrect,
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
        const currentExamId = isJoinExamMode ? document.getElementById('student-exam-id').value.trim() : 'custom-exam';
        const isPublic = !isJoinExamMode || els.studentAuthSection.classList.contains('hidden');
        
        localStorage.setItem('student_details', JSON.stringify({ name, roll, examId: currentExamId, isPublic }));
        localStorage.setItem('pending_exam_blank', pendingExamIsBlank);
        localStorage.setItem('exam_config_override', JSON.stringify(EXAM_CONFIG));

        window.location.href = 'exam.html';
    });

    els.btnBackToBrowse?.addEventListener('click', () => {
        if (currentMonitorSubscription) {
            currentMonitorSubscription.unsubscribe();
            currentMonitorSubscription = null;
        }
        els.monitorContainer.classList.remove('active-view');
        els.browseContainer.classList.add('active-view');
    });

    els.btnCancelMonitorAuth?.addEventListener('click', () => {
        els.monitorAuthModal.classList.add('hidden');
        pendingMonitorExamId = null;
        pendingMonitorExamPassword = null;
    });

    els.btnConfirmMonitorAuth?.addEventListener('click', () => {
        const enteredPassword = els.monitorAuthPassword.value.trim();
        if (enteredPassword === pendingMonitorExamPassword) {
            els.monitorAuthModal.classList.add('hidden');
            startMonitoring(pendingMonitorExamId);
            pendingMonitorExamId = null;
            pendingMonitorExamPassword = null;
        } else {
            els.monitorAuthError.classList.remove('hidden');
        }
    });

    els.btnCancelDelete?.addEventListener('click', () => {
        els.deleteConfirmModal.classList.add('hidden');
        examToDelete = null;
    });

    els.btnConfirmDelete?.addEventListener('click', async () => {
        if (!examToDelete) return;
        
        const originalText = els.btnConfirmDelete.innerHTML;
        els.btnConfirmDelete.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Deleting...';
        els.btnConfirmDelete.disabled = true;

        try {
            if (typeof supabase !== 'undefined' && supabase.from) {
                const { error } = await supabase.from('exams').delete().eq('id', examToDelete);
                if (error) {
                    alert("Error deleting exam: " + error.message);
                } else {
                    els.deleteConfirmModal.classList.add('hidden');
                    loadExamsFromSupabase(); // Refresh the list
                }
            }
        } catch (err) {
            console.error("Exception deleting exam:", err);
            alert("Failed to delete exam.");
        } finally {
            els.btnConfirmDelete.innerHTML = originalText;
            els.btnConfirmDelete.disabled = false;
            if (els.deleteConfirmModal.classList.contains('hidden')) {
                examToDelete = null;
            }
        }
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
                        <div>
                            <button class="btn-text-primary btn-start-exam" onclick="joinExam('${exam.id}')" style="margin-top: 0;">Start exam <i class="fa-solid fa-arrow-right"></i></button>
                            <button class="btn-text-primary" onclick="openMonitor('${exam.id}')" style="margin-top: 0; margin-left: 0.5rem;"><i class="fa-solid fa-desktop"></i> Live Monitor</button>
                        </div>
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
        pendingExamIdForRole = examId;
        els.roleSelectionModal.classList.remove('hidden');
    });
};

window.removeExam = function(examId) {
    window.requireAuth(() => {
        examToDelete = examId;
        els.deleteConfirmModal.classList.remove('hidden');
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
            els.customExamMarksCorrect.value = data.marks_correct !== undefined ? data.marks_correct : 4;
            els.customExamMarksIncorrect.value = data.marks_incorrect !== undefined ? data.marks_incorrect : -1;
            els.customExamPassword.value = data.password || '';
            
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

window.openMonitor = async function(examId) {
    window.requireAuth(async () => {
        try {
            const { data, error } = await supabase.from('exams').select('password').eq('id', examId).single();
            if (error) throw error;

            if (data.password && data.password.trim() !== '') {
                pendingMonitorExamId = examId;
                pendingMonitorExamPassword = data.password;
                els.monitorAuthPassword.value = '';
                els.monitorAuthError.classList.add('hidden');
                els.monitorAuthModal.classList.remove('hidden');
            } else {
                startMonitoring(examId);
            }
        } catch (err) {
            console.error("Exception fetching exam for monitor:", err);
            alert("Failed to fetch exam details.");
        }
    });
};

async function startMonitoring(examId) {
    els.monitorExamIdDisplay.textContent = examId;
    els.browseContainer.classList.remove('active-view');
    els.monitorContainer.classList.add('active-view');
    els.monitorStudentsList.innerHTML = '<p style="text-align:center; padding: 2rem; color: var(--text-muted);">Loading live sessions...</p>';
    monitoredStudents = {};

    if (typeof supabase !== 'undefined' && supabase.from) {
        // Load initial state
        const { data, error } = await supabase.from('exam_sessions').select('*').eq('exam_id', examId);
        if (error) {
            els.monitorStudentsList.innerHTML = `<p style="text-align:center; padding: 2rem; color: red;">Error: ${error.message}</p>`;
            return;
        }

        data.forEach(session => {
            monitoredStudents[session.id] = session;
        });
        renderMonitorList();

        // Subscribe to realtime changes
        currentMonitorSubscription = supabase.channel('exam_sessions_channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'exam_sessions', filter: `exam_id=eq.${examId}` }, payload => {
                if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                    monitoredStudents[payload.new.id] = payload.new;
                } else if (payload.eventType === 'DELETE') {
                    delete monitoredStudents[payload.old.id];
                }
                renderMonitorList();
            })
            .subscribe();
    }
}

function renderMonitorList() {
    els.monitorStudentsList.innerHTML = '';
    const sessions = Object.values(monitoredStudents);
    
    if (sessions.length === 0) {
        els.monitorStudentsList.innerHTML = '<p style="text-align:center; padding: 2rem; color: var(--text-muted);">No students have joined yet.</p>';
        return;
    }

    // Sort by most recently pinged
    sessions.sort((a, b) => new Date(b.last_ping) - new Date(a.last_ping));

    sessions.forEach(session => {
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.justifyContent = 'space-between';
        row.style.alignItems = 'center';
        row.style.padding = '0.75rem 0';
        row.style.borderBottom = '1px solid var(--border)';
        
        let statusColor = 'var(--success)';
        if (session.status === 'paused') statusColor = 'var(--warning)';
        else if (session.status === 'submitted') statusColor = 'var(--text-muted)';
        
        row.innerHTML = `
            <div style="width: 25%;">
                <div style="font-weight: 600;">${session.student_name}</div>
                <div style="font-size: 0.8rem; color: var(--text-muted);">Roll: ${session.student_roll}</div>
            </div>
            <div style="width: 15%; text-align: center; font-weight: bold;">${session.score}</div>
            <div style="width: 15%; text-align: center;">
                <span style="background: ${session.warnings > 0 ? '#fee2e2' : 'var(--bg-main)'}; color: ${session.warnings > 0 ? '#ef4444' : 'var(--text-main)'}; padding: 0.2rem 0.5rem; border-radius: 1rem; font-size: 0.9rem;">
                    ${session.warnings}
                </span>
            </div>
            <div style="width: 15%; text-align: center;">
                <span style="color: ${statusColor}; font-size: 0.9rem; font-weight: 500; text-transform: capitalize;">
                    <i class="fa-solid fa-circle" style="font-size: 0.5rem; vertical-align: middle;"></i> ${session.status}
                </span>
            </div>
            <div style="width: 30%; text-align: right; display: flex; justify-content: flex-end; gap: 0.5rem;">
                <button class="btn-outline" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;" onclick="updateStudentSession('${session.id}', {warnings: ${Math.max(0, session.warnings - 1)}})" title="Decrease Warning">-1</button>
                <button class="btn-outline" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;" onclick="updateStudentSession('${session.id}', {warnings: ${session.warnings + 1}})" title="Increase Warning">+1</button>
                <button class="btn-outline" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;" onclick="updateStudentSession('${session.id}', {status: '${session.status === 'paused' ? 'active' : 'paused'}'})" title="${session.status === 'paused' ? 'Resume' : 'Pause'}">
                    <i class="fa-solid ${session.status === 'paused' ? 'fa-play' : 'fa-pause'}"></i>
                </button>
                <button class="btn-outline" style="padding: 0.25rem 0.5rem; font-size: 0.8rem; border-color: #ef4444; color: #ef4444;" onclick="updateStudentSession('${session.id}', {status: 'submitted'})" title="Force Submit">
                    <i class="fa-solid fa-check-double"></i>
                </button>
            </div>
        `;
        els.monitorStudentsList.appendChild(row);
    });
}

window.updateStudentSession = async function(sessionId, updates) {
    if (typeof supabase !== 'undefined' && supabase.from) {
        const { error } = await supabase.from('exam_sessions').update(updates).eq('id', sessionId);
        if (error) {
            console.error("Failed to update student session:", error);
            alert("Failed to update student session.");
        }
    }
};

window.addEventListener('DOMContentLoaded', initApp);
