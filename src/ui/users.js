import { auth, db, functions } from '../config/firebase.js';
import { state } from '../store/state.js';
import { FirestoreService } from '../services/firestore.js';
import { httpsCallable } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-functions.js";
import { showDialog, showToast } from '../utils/ui.js';

let openUserDetailsModal;

async function loadNotificationSettings() {
    try {
        const settings = await FirestoreService.getNotificationSettings();

        if (settings) {
            // Load SMTP settings
            if (settings.smtp) {
                document.getElementById("email-enabled").checked = settings.smtp.enabled || false;
                document.getElementById("smtp-host").value = settings.smtp.host || "";
                document.getElementById("smtp-port").value = settings.smtp.port || 587;
                document.getElementById("smtp-user").value = settings.smtp.user || "";
                document.getElementById("smtp-password").value = settings.smtp.password || "";
                document.getElementById("smtp-from").value = settings.smtp.from || "";
                document.getElementById("smtp-secure").checked = settings.smtp.secure || false;

                // Load recipients
                if (settings.smtp.recipients && settings.smtp.recipients.length > 0) {
                    loadEmailRecipients(settings.smtp.recipients);
                } else {
                    loadEmailRecipients([]);
                }
            } else {
                // Default to OFF if no settings
                document.getElementById("email-enabled").checked = false;
                loadEmailRecipients([]);
            }

            // Load Telegram settings
            if (settings.telegram) {
                document.getElementById("telegram-enabled").checked = settings.telegram.enabled || false;
                document.getElementById("telegram-bot-token").value = settings.telegram.botToken || "";
                document.getElementById("telegram-chat-id").value = settings.telegram.chatId || "";
            } else {
                // Default to OFF if no settings
                document.getElementById("telegram-enabled").checked = false;
            }
        } else {
            // No settings found - default all toggles to OFF
            document.getElementById("email-enabled").checked = false;

            document.getElementById("telegram-enabled").checked = false;
            loadEmailRecipients([]);
        }
    } catch (error) {
        console.error("Error loading notification settings:", error);
        showToast("เกิดข้อผิดพลาดในการโหลดการตั้งค่า", "error");
    }
}

async function renderUserRoles() {
    const usersList = document.getElementById('users-list');
    if (!usersList) return;

    const currentUser = auth.currentUser;
    if (!currentUser) return;

    // Check if current user is admin
    const currentUserDoc = await FirestoreService.getUser(currentUser.uid);
    const isAdmin = currentUserDoc?.role === 'admin';

    if (!isAdmin) {
        usersList.innerHTML = '<p class="text-muted" style="font-size: 0.9rem;">คุณไม่มีสิทธิ์จัดการผู้ใช้งาน</p>';
        return;
    }

    try {
        usersList.innerHTML = '<p class="text-muted" style="font-size: 0.9rem;">กำลังโหลดข้อมูล...</p>';

        const users = await FirestoreService.getAllUsers();

        console.log('=== USER MANAGEMENT DEBUG ===');
        console.log('Current user:', currentUser.email);
        console.log('Users loaded:', users.length);
        users.forEach((user, index) => {
            console.log(`User ${index + 1}:`, {
                email: user.email,
                displayName: user.displayName,
                uid: user.uid,
                role: user.role,
                createdAt: user.createdAt,
                lastLogin: user.lastLogin
            });
        });
        console.log('=== END DEBUG ===');

        if (!users || users.length === 0) {
            usersList.innerHTML = `
                <div style="text-align: center; padding: 2rem;">
                    <p class="text-muted" style="font-size: 0.9rem;">ไม่พบผู้ใช้งาน</p>
                    <p class="text-muted" style="font-size: 0.8rem; margin-top: 0.5rem;">
                        ตรวจสอบ Console (F12) เพื่อดูข้อมูล Debug
                    </p>
                </div>
            `;
            return;
        }

        renderUsersList(users);
        setupUserSearch(users);

        // Setup cleanup button
        const cleanupBtn = document.getElementById('btn-cleanup-users');
        if (cleanupBtn) {
            cleanupBtn.onclick = handleCleanupUsers;
        }

    } catch (error) {
        console.error('Error loading users:', error);
        usersList.innerHTML = '<p class="text-muted" style="font-size: 0.9rem; color: var(--danger-color);">เกิดข้อผิดพลาดในการโหลดข้อมูล</p>';
    }
}

async function handleCleanupUsers() {
    const confirmed = await showDialog(
        'คุณต้องการลบข้อมูลผู้ใช้ที่ไม่ถูกต้องหรือไม่?\n\nระบบจะลบผู้ใช้ที่:\n- ไม่มีอีเมล\n- มีข้อมูลเป็น null\n- เป็นข้อมูลทดสอบ',
        { type: 'confirm' }
    );

    if (!confirmed) return;

    try {
        const invalidUsers = await FirestoreService.cleanupInvalidUsers();

        if (invalidUsers.length === 0) {
            showToast('ไม่พบข้อมูลผู้ใช้ที่ไม่ถูกต้อง', 'success');
            return;
        }

        // Show what will be deleted
        const userNames = invalidUsers.map(u => u.data.displayName || u.data.email || u.id).join('\n');
        const confirmDelete = await showDialog(
            `พบผู้ใช้ไม่ถูกต้อง ${invalidUsers.length} คน:\n\n${userNames}\n\nต้องการลบหรือไม่?`,
            { type: 'confirm' }
        );

        if (!confirmDelete) return;

        // Delete invalid users
        for (const user of invalidUsers) {
            await FirestoreService.deleteInvalidUser(user.id);
        }

        showToast(`ลบข้อมูลผู้ใช้ไม่ถูกต้อง ${invalidUsers.length} คนเรียบร้อยแล้ว`, 'success');

        // Reload user list
        await renderUserRoles();

    } catch (error) {
        console.error('Error cleaning up users:', error);
        showToast('เกิดข้อผิดพลาดในการลบข้อมูล', 'error');
    }
}

function renderUsersList(users) {
    const usersList = document.getElementById('users-list');
    if (!usersList) return;

    const currentUser = auth.currentUser;

    usersList.innerHTML = users.map(user => {
        const initial = (user.displayName || user.email || 'U').charAt(0).toUpperCase();
        const photoUrl = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(initial)}&background=38bdf8&color=fff`;
        const role = user.role || 'user';
        const isCurrentUser = user.uid === currentUser.uid;

        // Format dates
        const createdAt = user.createdAt ? new Date(user.createdAt).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        }) : 'ไม่ระบุ';

        const lastLogin = user.lastLogin ? new Date(user.lastLogin).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }) : 'ไม่เคยเข้าสู่ระบบ';

        const phone = user.phone || 'ไม่ระบุ';

        // Role badge
        const roleBadge = role === 'admin'
            ? '<span class="user-role-badge admin"><i class="fa-solid fa-shield-halved"></i> ผู้ดูแลระบบ</span>'
            : role === 'manager'
                ? '<span class="user-role-badge manager"><i class="fa-solid fa-user-tie"></i> ผู้จัดการ</span>'
                : '<span class="user-role-badge viewer"><i class="fa-solid fa-user"></i> ผู้ใช้งานทั่วไป</span>';

        return `<div class="user-role-item" data-user-email="${user.email}" data-user-name="${user.displayName || ''}">
            <div class="user-role-avatar">
                ${user.photoURL ? `<img src="${photoUrl}" alt="${user.displayName || 'User'}">` : initial}
            </div>
            <div class="user-role-info">
                <div class="user-role-name">
                    ${user.displayName || 'ไม่ระบุชื่อ'}
                    ${isCurrentUser ? '<span class="user-role-badge admin"><i class="fa-solid fa-user-shield"></i> คุณ</span>' : ''}
                </div>
                <div class="user-role-email">${user.email}</div>
                <div class="user-role-details">
                    <span class="user-detail-item">
                        <i class="fa-solid fa-phone"></i>
                        ${phone}
                    </span>
                    <span class="user-detail-item">
                        <i class="fa-solid fa-calendar-plus"></i>
                        สมัคร: ${createdAt}
                    </span>
                    <span class="user-detail-item">
                        <i class="fa-solid fa-clock"></i>
                        เข้าล่าสุด: ${lastLogin}
                    </span>
                </div>
            </div>
            <div class="user-role-actions">
                ${roleBadge}
                <select class="user-role-select" data-user-id="${user.uid}" ${isCurrentUser ? 'disabled' : ''}>
                    <option value="admin" ${role === 'admin' ? 'selected' : ''}>ผู้ดูแลระบบ</option>
                    <option value="manager" ${role === 'manager' ? 'selected' : ''}>ผู้จัดการ</option>
                    <option value="user" ${role === 'user' ? 'selected' : ''}>ผู้ใช้งานทั่วไป</option>
                </select>
            </div>
        </div>`;
    }).join('');

    // Add event listeners to role selects
    usersList.querySelectorAll('.user-role-select').forEach(select => {
        select.addEventListener('change', async (e) => {
            const userId = e.target.getAttribute('data-user-id');
            const newRole = e.target.value;
            await handleRoleChange(userId, newRole);
        });
    });

    // Add event listeners to user items for details modal
    usersList.querySelectorAll('.user-role-item').forEach(item => {
        item.style.cursor = 'pointer';
        item.addEventListener('click', (e) => {
            // Ignore if clicked on select dropdown
            if (e.target.tagName.toLowerCase() === 'select' || e.target.closest('select')) {
                return;
            }
            const email = item.getAttribute('data-user-email');
            const user = users.find(u => u.email === email);
            if (user) {
                if (typeof openUserDetailsModal === 'function') {
                    openUserDetailsModal(user);
                }
            }
        });
    });
}

function setupUserSearch(users) {
    const searchInput = document.getElementById('user-search-input');
    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();

        if (!query) {
            renderUsersList(users);
            return;
        }

        const filtered = users.filter(user => {
            const name = (user.displayName || '').toLowerCase();
            const email = (user.email || '').toLowerCase();
            return name.includes(query) || email.includes(query);
        });

        renderUsersList(filtered);
    });
}

async function handleRoleChange(userId, newRole) {
    try {
        await FirestoreService.updateUserRole(userId, newRole);
        const roleLabel = newRole === 'admin' ? 'ผู้ดูแลระบบ' : newRole === 'manager' ? 'ผู้จัดการ' : 'ผู้ใช้งานทั่วไป';
        showToast(`อัปเดตสิทธิ์ผู้ใช้เป็น ${roleLabel} เรียบร้อยแล้ว`, 'success');

        // Log the action
        await FirestoreService.logAction('USER', 'UPDATE_ROLE', `Updated user role to ${newRole}`, {
            userId: userId,
            newRole: newRole
        });

        // Reload to update badges
        await renderUserRoles();
    } catch (error) {
        console.error('Error updating role:', error);
        showToast('ไม่สามารถอัปเดตสิทธิ์ผู้ใช้ได้', 'error');
        // Reload to reset the select
        await renderUserRoles();
    }
}

// --- User Management Add User Logic ---
document.addEventListener('DOMContentLoaded', () => {
    const btnAddUser = document.getElementById('btn-add-user');
    const modalAddUser = document.getElementById('add-user-modal');
    const btnCloseModal = document.getElementById('btn-close-add-user-modal');
    const btnCancelModal = document.getElementById('btn-cancel-add-user');
    const formAddUser = document.getElementById('add-user-form');

    if (btnAddUser && modalAddUser) {
        btnAddUser.addEventListener('click', () => {
            modalAddUser.classList.remove('hidden');
            modalAddUser.style.display = 'flex';
        });

        const closeModal = () => {
            modalAddUser.classList.add('hidden');
            modalAddUser.style.display = 'none';
            formAddUser.reset();
        };

        if (btnCloseModal) btnCloseModal.addEventListener('click', closeModal);
        if (btnCancelModal) btnCancelModal.addEventListener('click', closeModal);

        formAddUser.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('add-user-email').value;
            const password = document.getElementById('add-user-password').value;
            const name = document.getElementById('add-user-name').value;
            const role = document.getElementById('add-user-role').value;

            try {
                // Show loading toast
                showToast('กำลังสร้างผู้ใช้งาน...', 'info');
                
                // Create a secondary app to avoid logging out the current admin
                const secondaryApp = initializeApp(firebaseConfig, "Secondary");
                const secondaryAuth = getAuth(secondaryApp);
                
                const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
                const newUser = userCredential.user;
                
                // Update profile name
                await updateProfile(newUser, { displayName: name });
                
                // Save user info to Firestore using primary db
                const userData = {
                    email: email,
                    displayName: name,
                    role: role,
                    uid: newUser.uid,
                    createdAt: serverTimestamp(),
                    lastLogin: null
                };
                
                await setDoc(doc(db, "users", newUser.uid), userData);
                
                // Sign out secondary auth
                await signOut(secondaryAuth);
                
                showToast('สร้างบัญชีผู้ใช้ใหม่เรียบร้อยแล้ว', 'success');
                closeModal();
                
                // Refresh users list
                if (typeof renderUserRoles === 'function') {
                    await renderUserRoles();
                }
            } catch (error) {
                console.error('Error creating user:', error);
                
                if (error.code === 'auth/email-already-in-use') {
                    // Offer to delete the orphaned account
                    const confirmed = await showDialog(
                        `อีเมล ${email} มีอยู่ในระบบแล้ว (อาจเป็นบัญชีที่เคยลบไปก่อนหน้า)\n\nคุณต้องการเคลียร์บัญชีนี้ทิ้งเพื่อสร้างใหม่หรือไม่?`,
                        { type: 'confirm' }
                    );

                    if (confirmed) {
                        try {
                            showToast('กำลังเคลียร์บัญชีเก่า...', 'info');
                            const deleteByEmailFn = httpsCallable(functions, 'deleteUserByEmail');
                            const res = await deleteByEmailFn({ email: email });
                            if (res.data.success) {
                                showToast('เคลียร์บัญชีเก่าสำเร็จ กรุณากด "บันทึก" อีกครั้งเพื่อสร้างใหม่', 'success');
                            } else {
                                showToast(res.data.message || 'ไม่สามารถเคลียร์บัญชีได้', 'error');
                            }
                        } catch (delErr) {
                            console.error('Error deleting orphaned user:', delErr);
                            showToast('เกิดข้อผิดพลาดในการเคลียร์บัญชีเก่า', 'error');
                        }
                    }
                    return;
                }

                let errorMsg = 'เกิดข้อผิดพลาดในการสร้างผู้ใช้งาน';
                if (error.code === 'auth/weak-password') {
                    errorMsg = 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร';
                } else if (error.code === 'auth/invalid-email') {
                    errorMsg = 'รูปแบบอีเมลไม่ถูกต้อง';
                }
                showToast(errorMsg, 'error');
            }
        });
    }

    // --- User Details Modal Logic ---
    const modalUserDetails = document.getElementById('user-details-modal');
    const btnCloseUserDetails = document.getElementById('btn-close-user-details-modal');
    const btnCancelUserDetails = document.getElementById('btn-cancel-user-details');
    const formUserDetails = document.getElementById('user-details-form');
    const btnDeleteUser = document.getElementById('btn-delete-user');

    if (modalUserDetails) {
        openUserDetailsModal = window.openUserDetailsModal = (user) => {
            document.getElementById('edit-user-id').value = user.uid;
            document.getElementById('edit-user-email').value = user.email || '';
            document.getElementById('edit-user-name').value = user.displayName || '';
            document.getElementById('edit-user-phone').value = user.phone || '';
            document.getElementById('edit-user-role').value = user.role || 'user';

            // Disable delete if it's the current user
            if (auth.currentUser && auth.currentUser.uid === user.uid) {
                btnDeleteUser.style.display = 'none';
            } else {
                btnDeleteUser.style.display = 'flex';
            }

            modalUserDetails.classList.remove('hidden');
            modalUserDetails.style.display = 'flex';
        };

        const closeUserDetailsModal = () => {
            modalUserDetails.classList.add('hidden');
            modalUserDetails.style.display = 'none';
            formUserDetails.reset();
        };

        if (btnCloseUserDetails) btnCloseUserDetails.addEventListener('click', closeUserDetailsModal);
        if (btnCancelUserDetails) btnCancelUserDetails.addEventListener('click', closeUserDetailsModal);

        formUserDetails.addEventListener('submit', async (e) => {
            e.preventDefault();
            const userId = document.getElementById('edit-user-id').value;
            const name = document.getElementById('edit-user-name').value;
            const phone = document.getElementById('edit-user-phone').value;
            const role = document.getElementById('edit-user-role').value;

            try {
                showToast('กำลังอัปเดตข้อมูล...', 'info');
                await FirestoreService.updateUserDetails(userId, {
                    displayName: name,
                    phone: phone,
                    role: role
                });
                showToast('อัปเดตข้อมูลเรียบร้อยแล้ว', 'success');
                closeUserDetailsModal();
                if (typeof renderUserRoles === 'function') {
                    await renderUserRoles();
                }
            } catch (error) {
                console.error('Error updating user details:', error);
                showToast('เกิดข้อผิดพลาดในการอัปเดตข้อมูล', 'error');
            }
        });

        if (btnDeleteUser) {
            btnDeleteUser.addEventListener('click', async () => {
                const userId = document.getElementById('edit-user-id').value;
                const name = document.getElementById('edit-user-name').value;
                
                const confirmed = await showDialog(
                    `คุณแน่ใจหรือไม่ว่าต้องการลบบัญชีผู้ใช้ "${name}"?\nการดำเนินการนี้ไม่สามารถเรียกคืนได้`,
                    { type: 'confirm' }
                );

                if (!confirmed) return;

                try {
                    showToast('กำลังลบข้อมูลผู้ใช้งาน...', 'info');
                    await FirestoreService.deleteUser(userId);
                    showToast('ลบข้อมูลผู้ใช้เรียบร้อยแล้ว', 'success');
                    closeUserDetailsModal();
                    if (typeof renderUserRoles === 'function') {
                        await renderUserRoles();
                    }
                } catch (error) {
                    console.error('Error deleting user:', error);
                    showToast('เกิดข้อผิดพลาดในการลบผู้ใช้งาน', 'error');
                }
            });
        }
    }
});
let currentUserRole = "user"; // Default


export { loadNotificationSettings, renderUserRoles, handleRoleChange, renderUsersList, setupUserSearch, openUserDetailsModal };