/**
 * Vinmec Ocean Park 2 - Reporting & Morning Briefing Fullstack SPA
 * Single Admin Auth + Dynamic Cascading Form + Power-BI Dashboard + User Management
 */

document.addEventListener('DOMContentLoaded', () => {
    // App State
    const state = {
        token: localStorage.getItem('vinmec_token') || null,
        currentUser: null,
        masterData: null,
        currentReportDate: new Date().toISOString().split('T')[0],
        currentFacility: 'Bệnh viện',
        currentDepartment: 'Cấp cứu',
        dashMode: 'daily', // 'daily' | 'weekly' | 'monthly'
        charts: {},
        selectedModalDepts: new Set(),
        selectedEditModalDepts: new Set(),
        selectedModalFacilities: new Set(),
        selectedEditModalFacilities: new Set()
    };

    // =========================================================================
    // DOM ELEMENTS
    // =========================================================================
    const loginScreen = document.getElementById('loginScreen');
    const mainApp = document.getElementById('mainApp');
    const loginForm = document.getElementById('loginForm');
    const loginUsername = document.getElementById('loginUsername');
    const loginPassword = document.getElementById('loginPassword');

    // Header & User Profile
    const navUserFullName = document.getElementById('navUserFullName');
    const navUserRole = document.getElementById('navUserRole');
    const userBadgeBtn = document.getElementById('userBadgeBtn');
    const userDropdown = document.getElementById('userDropdown');
    const dropUsername = document.getElementById('dropUsername');
    const dropDept = document.getElementById('dropDept');
    const btnLogout = document.getElementById('btnLogout');
    const liveClock = document.getElementById('clockText');
    const btnFullscreen = document.getElementById('btnFullscreen');

    // Navigation Tabs
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');
    const tabDataBtn = document.getElementById('tabDataBtn');
    const tabUsersBtn = document.getElementById('tabUsersBtn');
    const tabGuideBtn = document.getElementById('tabGuideBtn');

    // Form Tab Elements
    const inputDate = document.getElementById('inputDate');
    const selectFacility = document.getElementById('selectFacility');
    const selectDepartment = document.getElementById('selectDepartment');
    const deptRuleAlert = document.getElementById('deptRuleAlert');
    const deptRuleText = document.getElementById('deptRuleText');
    const currentDeptStatus = document.getElementById('currentDeptStatus');
    const dynamicFieldsContainer = document.getElementById('dynamicFieldsContainer');
    const dailyReportForm = document.getElementById('dailyReportForm');
    const btnSubmitReport = document.getElementById('btnSubmitReport');
    const btnResetForm = document.getElementById('btnResetForm');
    const sideProgressBar = document.getElementById('sideProgressBar');
    const sideProgressBadge = document.getElementById('sideProgressBadge');
    const deptChecklist = document.getElementById('deptChecklist');

    // Dashboard Elements
    const btnModeDaily = document.getElementById('btnModeDaily');
    const btnModeWeekly = document.getElementById('btnModeWeekly');
    const btnModeMonthly = document.getElementById('btnModeMonthly');
    const filterItemDate = document.getElementById('filterItemDate');
    const filterItemMonth = document.getElementById('filterItemMonth');
    const dashDateFilter = document.getElementById('dashDateFilter');
    const dashMonthFilter = document.getElementById('dashMonthFilter');
    const dashFacilityFilter = document.getElementById('dashFacilityFilter');
    const btnRefreshDashboard = document.getElementById('btnRefreshDashboard');
    const dashPeriodBanner = document.getElementById('dashPeriodBanner');

    // Data Management Elements
    const tableDateFilter = document.getElementById('tableDateFilter');
    const tableFacilityFilter = document.getElementById('tableFacilityFilter');
    const tableSearchFilter = document.getElementById('tableSearchFilter');
    const reportsTableBody = document.getElementById('reportsTableBody');
    const btnExportExcelMain = document.getElementById('btnExportExcelMain');
    const btnReloadTable = document.getElementById('btnReloadTable');

    // User Management (Admin Only) Elements
    const usersTableBody = document.getElementById('usersTableBody');
    const btnOpenCreateUserModal = document.getElementById('btnOpenCreateUserModal');
    const createUserModal = document.getElementById('createUserModal');
    const btnCloseCreateUserModal = document.getElementById('btnCloseCreateUserModal');
    const btnCancelCreateUser = document.getElementById('btnCancelCreateUser');
    const createUserForm = document.getElementById('createUserForm');
    
    // Multi-Select Facility & Department Elements in Modal
    const facilityMultiSelectContainer = document.getElementById('facilityMultiSelectContainer');
    const facilitySelectedCountText = document.getElementById('facilitySelectedCountText');
    const btnSelectAllFacilities = document.getElementById('btnSelectAllFacilities');
    const btnClearFacilities = document.getElementById('btnClearFacilities');

    const editFacilityMultiSelectContainer = document.getElementById('editFacilityMultiSelectContainer');
    const editFacilitySelectedCountText = document.getElementById('editFacilitySelectedCountText');
    const btnEditSelectAllFacilities = document.getElementById('btnEditSelectAllFacilities');
    const btnEditClearFacilities = document.getElementById('btnEditClearFacilities');

    const deptMultiSelectContainer = document.getElementById('deptMultiSelectContainer');
    const deptSearchInput = document.getElementById('deptSearchInput');
    const deptSelectedCountText = document.getElementById('deptSelectedCountText');
    const btnSelectAllDepts = document.getElementById('btnSelectAllDepts');
    const btnSelectCLSDepts = document.getElementById('btnSelectCLSDepts');
    const btnClearDepts = document.getElementById('btnClearDepts');

    // Pre-Save Confirmation Modal
    const confirmSubmitModal = document.getElementById('confirmSubmitModal');
    const btnCloseConfirmModal = document.getElementById('btnCloseConfirmModal');
    const btnCancelConfirm = document.getElementById('btnCancelConfirm');
    const btnFinalConfirmSubmit = document.getElementById('btnFinalConfirmSubmit');

    // Change Password Modal
    const changePasswordModal = document.getElementById('changePasswordModal');
    const btnOpenChangePass = document.getElementById('btnOpenChangePass');
    const btnCloseChangePassModal = document.getElementById('btnCloseChangePassModal');
    const btnCancelChangePass = document.getElementById('btnCancelChangePass');
    const changePasswordForm = document.getElementById('changePasswordForm');

    // Initialize Default Dates
    inputDate.value = state.currentReportDate;
    dashDateFilter.value = state.currentReportDate;
    tableDateFilter.value = state.currentReportDate;
    if (dashMonthFilter) {
        dashMonthFilter.value = state.currentReportDate.substring(0, 7);
    }

    // Clock Interval
    setInterval(() => {
        const now = new Date();
        liveClock.textContent = now.toLocaleTimeString('vi-VN') + ' | ' + now.toLocaleDateString('vi-VN');
    }, 1000);

    // =========================================================================
    // API FETCH HELPER (With Auto JWT Header)
    // =========================================================================
    async function apiRequest(url, options = {}) {
        options.headers = options.headers || {};
        if (state.token) {
            options.headers['Authorization'] = `Bearer ${state.token}`;
        }
        if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
            options.headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(options.body);
        }

        const res = await fetch(url, options);
        if (res.status === 401) {
            handleLogout();
            throw new Error('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
        }
        return res;
    }

    // =========================================================================
    // AUTHENTICATION FLOW
    // =========================================================================
    async function checkAuth() {
        if (!state.token) {
            showLoginScreen();
            return;
        }

        try {
            const res = await apiRequest('/api/auth/me');
            if (res.ok) {
                const data = await res.json();
                state.currentUser = data.user;
                showMainApp();
            } else {
                showLoginScreen();
            }
        } catch (e) {
            showLoginScreen();
        }
    }

    function showLoginScreen() {
        loginScreen.style.display = 'flex';
        mainApp.style.display = 'none';
    }

    async function showMainApp() {
        loginScreen.style.display = 'none';
        mainApp.style.display = 'block';

        const u = state.currentUser;
        navUserFullName.textContent = u.full_name;
        navUserRole.textContent = u.role === 'admin' ? 'Super Admin' : `${u.department} (${u.facility})`;
        dropUsername.textContent = u.username;
        dropDept.textContent = u.role === 'admin' ? 'Quản trị viên toàn viện' : `${u.department} - ${u.facility}`;

        const quickExportBox = document.getElementById('quickExportBox');
        if (u.role === 'admin') {
            if (tabDataBtn) tabDataBtn.style.display = 'flex';
            tabUsersBtn.style.display = 'flex';
            if (tabGuideBtn) tabGuideBtn.style.display = 'flex';
            if (quickExportBox) quickExportBox.style.display = 'block';
        } else {
            if (tabDataBtn) tabDataBtn.style.display = 'none';
            tabUsersBtn.style.display = 'none';
            if (tabGuideBtn) tabGuideBtn.style.display = 'none';
            if (quickExportBox) quickExportBox.style.display = 'none';
        }

        await fetchMasterData();
        setupUserRoleRestrictions();
        renderDynamicForm();
        checkCurrentDepartmentStatus();
        loadDashboardData();
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = loginUsername.value.trim();
        const password = loginPassword.value;

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await res.json();
            if (res.ok) {
                state.token = data.token;
                state.currentUser = data.user;
                localStorage.setItem('vinmec_token', data.token);
                showToast(`Chào mừng ${data.user.full_name} đăng nhập thành công!`, 'success');
                showMainApp();
            } else {
                showToast(data.error || 'Đăng nhập không thành công', 'error');
            }
        } catch (err) {
            showToast('Lỗi kết nối máy chủ: ' + err.message, 'error');
        }
    });

    function handleLogout() {
        state.token = null;
        state.currentUser = null;
        localStorage.removeItem('vinmec_token');
        showLoginScreen();
        showToast('Đã đăng xuất khỏi hệ thống', 'info');
    }
    btnLogout.addEventListener('click', handleLogout);

    userBadgeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        userDropdown.classList.toggle('show');
    });
    document.addEventListener('click', () => {
        userDropdown.classList.remove('show');
    });

    // =========================================================================
    // MASTER DATA & ROLE SETUP
    // =========================================================================
    async function fetchMasterData() {
        try {
            const res = await apiRequest('/api/reports/master-data');
            if (res.ok) {
                state.masterData = await res.json();
                populateDepartmentDropdowns();
                populateFacilityDropdowns();
            }
        } catch (e) {
            console.error('Master data error:', e);
        }
    }

    function populateFacilityDropdowns() {
        if (!state.masterData || !state.masterData.facilities) return;
        const facList = state.masterData.facilities;

        // 1. selectFacility in Form (for Admins or ALL)
        if (state.currentUser && (state.currentUser.role === 'admin' || state.currentUser.facility === 'ALL')) {
            const currentFormFac = selectFacility.value;
            selectFacility.innerHTML = '';
            facList.forEach(fac => {
                const opt = document.createElement('option');
                opt.value = fac;
                opt.textContent = fac === 'Bệnh viện' ? 'Bệnh viện Vinmec' : fac;
                selectFacility.appendChild(opt);
            });
            if (currentFormFac && facList.includes(currentFormFac)) {
                selectFacility.value = currentFormFac;
            }
        }

        // 2. dashFacilityFilter in Dashboard
        const currentDashFac = dashFacilityFilter.value;
        dashFacilityFilter.innerHTML = '<option value="ALL">Tất cả cơ sở</option>';
        facList.forEach(fac => {
            const opt = document.createElement('option');
            opt.value = fac;
            opt.textContent = fac;
            dashFacilityFilter.appendChild(opt);
        });
        if (currentDashFac && (currentDashFac === 'ALL' || facList.includes(currentDashFac))) {
            dashFacilityFilter.value = currentDashFac;
        }

        // 3. tableFacilityFilter in Data Tab
        const currentTableFac = tableFacilityFilter.value;
        tableFacilityFilter.innerHTML = '<option value="ALL">Tất cả cơ sở</option>';
        facList.forEach(fac => {
            const opt = document.createElement('option');
            opt.value = fac;
            opt.textContent = fac;
            tableFacilityFilter.appendChild(opt);
        });
        if (currentTableFac && (currentTableFac === 'ALL' || facList.includes(currentTableFac))) {
            tableFacilityFilter.value = currentTableFac;
        }

        renderModalFacilityChips();
        renderEditModalFacilityChips();
    }

    function populateDepartmentDropdowns() {
        selectDepartment.innerHTML = '';
        state.masterData.departments.forEach(dept => {
            const opt = document.createElement('option');
            opt.value = dept;
            opt.textContent = dept;
            selectDepartment.appendChild(opt);
        });

        renderMasterDataChips();
    }

    function renderMasterDataChips() {
        const grid = document.getElementById('masterDataChipsGrid');
        if (!grid || !state.masterData) return;

        grid.innerHTML = '';

        const colGroups = [
            { title: '1. Cơ Sở', icon: 'fa-hospital', items: state.masterData.facilities },
            { title: '2. Chuyên Khoa (17 Khoa)', icon: 'fa-stethoscope', items: state.masterData.departments },
            { title: '3. Khám Bệnh', icon: 'fa-user-doctor', items: state.masterData.fields_by_category.kham_benh },
            { title: '4. Điều Trị', icon: 'fa-bed-pulse', items: state.masterData.fields_by_category.dieu_tri },
            { title: '5. Dịch Vụ', icon: 'fa-hand-holding-medical', items: state.masterData.fields_by_category.dich_vu },
            { title: '6. Tình Trạng', icon: 'fa-person-walking-arrow-right', items: state.masterData.fields_by_category.tinh_trang },
            { title: '7. Xét Nghiệm', icon: 'fa-vial-virus', items: state.masterData.fields_by_category.xet_nghiem },
            { title: '8. Chẩn Đoán Hình Ảnh', icon: 'fa-x-ray', items: state.masterData.fields_by_category.cdha },
            { title: '9. Điện Quang Can Thiệp', icon: 'fa-bolt', items: state.masterData.fields_by_category.dqct }
        ];

        colGroups.forEach(g => {
            const box = document.createElement('div');
            box.className = 'master-col-box';
            box.innerHTML = `
                <div class="master-col-title"><i class="fa-solid ${g.icon}"></i> ${g.title}</div>
                <div class="master-tags-list">
                    ${g.items.map(it => `<span class="master-tag">${it}</span>`).join('')}
                </div>
            `;
            grid.appendChild(box);
        });
    }

    function setupUserRoleRestrictions() {
        const u = state.currentUser;
        if (!u) return;

        // 1. Facility Setup (Supports Multi-Facility for accounts)
        if (u.role === 'admin' || u.facility === 'ALL') {
            selectFacility.disabled = false;
            const facList = state.masterData ? state.masterData.facilities : [];
            selectFacility.innerHTML = '';
            facList.forEach(fac => {
                const opt = document.createElement('option');
                opt.value = fac;
                opt.textContent = fac === 'Bệnh viện' ? 'Bệnh viện Vinmec' : fac;
                selectFacility.appendChild(opt);
            });
            if (!selectFacility.value || selectFacility.value === 'ALL') {
                selectFacility.value = facList[0] || 'Bệnh viện';
            }
        } else {
            const allowedFacilities = u.facility.split(',').map(s => s.trim()).filter(Boolean);
            selectFacility.innerHTML = '';
            allowedFacilities.forEach(fac => {
                const opt = document.createElement('option');
                opt.value = fac;
                opt.textContent = fac === 'Bệnh viện' ? 'Bệnh viện Vinmec' : fac;
                selectFacility.appendChild(opt);
            });

            if (allowedFacilities.length === 1) {
                selectFacility.value = allowedFacilities[0];
                selectFacility.disabled = true;
            } else {
                selectFacility.disabled = false;
                if (!allowedFacilities.includes(selectFacility.value)) {
                    selectFacility.value = allowedFacilities[0];
                }
            }

            // In Dashboard filter: allow filtering between allowed facilities
            dashFacilityFilter.innerHTML = '<option value="ALL">Tất cả cơ sở được gán</option>';
            allowedFacilities.forEach(fac => {
                const opt = document.createElement('option');
                opt.value = fac;
                opt.textContent = fac;
                dashFacilityFilter.appendChild(opt);
            });
        }

        // 2. Department Setup
        if (u.role === 'admin' || u.department === 'ALL') {
            selectDepartment.disabled = false;
            deptLockNotice.style.display = 'none';
        } else {
            const allowedDepts = u.department.split(',').map(s => s.trim()).filter(Boolean);

            // Populate department selector with only allowed departments
            selectDepartment.innerHTML = '';
            allowedDepts.forEach(dept => {
                const opt = document.createElement('option');
                opt.value = dept;
                opt.textContent = dept;
                selectDepartment.appendChild(opt);
            });

            if (allowedDepts.length === 1) {
                selectDepartment.disabled = true;
                deptLockNotice.style.display = 'block';
                deptLockNotice.innerHTML = `<i class="fa-solid fa-lock"></i> Tài khoản của bạn được khóa cố định theo chuyên khoa này.`;
            } else {
                selectDepartment.disabled = false;
                deptLockNotice.style.display = 'block';
                deptLockNotice.innerHTML = `<i class="fa-solid fa-layer-group"></i> Tài khoản phụ trách <b>${allowedDepts.length}</b> chuyên khoa (chọn khoa cần nhập ở trên).`;
            }
        }
    }

    // =========================================================================
    // DYNAMIC CASCADING FORM (VINMEC BUSINESS LOGIC)
    // =========================================================================
    function renderDynamicForm() {
        const dept = selectDepartment.value || (state.currentUser && state.currentUser.department) || 'Cấp cứu';
        state.currentDepartment = dept;
        state.currentFacility = selectFacility.value;
        state.currentReportDate = inputDate.value;

        dynamicFieldsContainer.innerHTML = '';
        updateDepartmentRuleAlert(dept);

        // CASE 1: Xét nghiệm
        if (dept === 'Xét nghiệm') {
            createSectionCard('Khối Xét Nghiệm Chuyên Biệt', 'xet_nghiem', state.masterData.fields_by_category.xet_nghiem, 'Mẫu/XN');
            return;
        }

        // CASE 2: Chẩn đoán hình ảnh
        if (dept === 'Chẩn đoán hình ảnh') {
            createSectionCard('Kỹ Thuật Chẩn Đoán Hình Ảnh', 'cdha', state.masterData.fields_by_category.cdha, 'Lượt/Ca');
            return;
        }

        // CASE 3: Điện quang can thiệp
        if (dept === 'Điện quang can thiệp') {
            createSectionCard('Thủ Thuật Điện Quang Can Thiệp', 'dqct', state.masterData.fields_by_category.dqct, 'Ca');
            return;
        }

        // CASE 4: Các khoa Lâm Sàng / Khám bệnh / Cấp cứu / Ngoại / Sản / Nội...
        let khamFields = [...state.masterData.fields_by_category.kham_benh];
        if (dept === 'Cấp cứu') {
            khamFields = ["Khám cấp cứu", "Khám chuyên khoa"];
        }
        createSectionCard('1. Số Lượng Khám Bệnh', 'kham_benh', khamFields, 'Lượt');
        createSectionCard('2. Hình Thức Điều Trị', 'dieu_tri', state.masterData.fields_by_category.dieu_tri, 'Bệnh nhân');

        let dichVuFields = [...state.masterData.fields_by_category.dich_vu];
        if (['Khám bệnh', 'Cấp cứu', 'Nội tổng hợp', 'Thần kinh cột sống', 'Phục hồi chức năng', 'Da liễu', 'Vaccine', 'Nhi sơ sinh'].includes(dept)) {
            dichVuFields = dichVuFields.filter(f => f !== 'Phẫu thuật');
        }
        if (dept !== 'Phụ sản') {
            dichVuFields = dichVuFields.filter(f => f !== 'Chăm sóc sau sinh' && f !== 'Hỗ trợ sinh đẻ');
        }
        createSectionCard('3. Dịch Vụ & Can Thiệp', 'dich_vu', dichVuFields, 'Ca/Lượt');
        createSectionCard('4. Tình Trạng Người Bệnh Ra / Vào Viện', 'tinh_trang', state.masterData.fields_by_category.tinh_trang, 'Ca');
    }

    function createSectionCard(title, categoryKey, fieldList, unit = 'Ca') {
        const card = document.createElement('div');
        card.className = 'dynamic-section-card';

        const header = document.createElement('div');
        header.className = 'section-header';
        header.innerHTML = `
            <h4><i class="fa-solid fa-list-check"></i> ${title}</h4>
            <span class="section-badge">${fieldList.length} chỉ số</span>
        `;
        card.appendChild(header);

        const grid = document.createElement('div');
        grid.className = 'fields-grid';

        fieldList.forEach(fieldName => {
            const fieldBox = document.createElement('div');
            fieldBox.className = 'field-input-box';

            const inputId = `field_${categoryKey}_${slugify(fieldName)}`;
            const isAutoKhamBenh = (categoryKey === 'dich_vu' && fieldName === 'Khám bệnh');
            if (isAutoKhamBenh) {
                fieldBox.classList.add('auto-calc-box');
            }

            fieldBox.innerHTML = `
                <label for="${inputId}" title="${fieldName}">
                    ${fieldName}
                    ${isAutoKhamBenh ? '<span class="auto-calc-badge"><i class="fa-solid fa-calculator"></i> (Tự tính = ∑ Mục 1)</span>' : ''}
                </label>
                <div class="input-stepper-group">
                    ${!isAutoKhamBenh ? '<button type="button" class="stepper-btn stepper-minus" title="Giảm 1">-</button>' : ''}
                    <input type="number" 
                           id="${inputId}" 
                           name="${categoryKey}.${fieldName}" 
                           class="stepper-input field-num-input ${isAutoKhamBenh ? 'auto-calc-field' : ''}" 
                           min="0" 
                           step="1" 
                           placeholder="0" 
                           value="0"
                           ${isAutoKhamBenh ? 'readonly style="background:#F0FDF4; font-weight:800; color:#166534;"' : ''}>
                    ${!isAutoKhamBenh ? '<button type="button" class="stepper-btn stepper-plus" title="Tăng 1">+</button>' : ''}
                    <span class="stepper-unit">${unit}</span>
                </div>
            `;

            const input = fieldBox.querySelector('.stepper-input');
            const btnMinus = fieldBox.querySelector('.stepper-minus');
            const btnPlus = fieldBox.querySelector('.stepper-plus');

            if (btnMinus) {
                btnMinus.addEventListener('click', () => {
                    let val = parseInt(input.value) || 0;
                    if (val > 0) {
                        input.value = val - 1;
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                });
            }

            if (btnPlus) {
                btnPlus.addEventListener('click', () => {
                    let val = parseInt(input.value) || 0;
                    input.value = val + 1;
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                });
            }

            input.addEventListener('change', () => {
                let val = parseInt(input.value) || 0;
                if (val < 0) val = 0;
                input.value = val;
            });

            grid.appendChild(fieldBox);
        });

        card.appendChild(grid);
        dynamicFieldsContainer.appendChild(card);
    }

    // Auto-calculate Mục 3 'Khám bệnh' = sum of all fields in Mục 1 'kham_benh.*'
    function updateAutoCalculatedKhamBenh() {
        const khamBenhInputs = dynamicFieldsContainer.querySelectorAll('input[name^="kham_benh."]');
        let totalKham = 0;
        khamBenhInputs.forEach(inp => {
            totalKham += parseInt(inp.value) || 0;
        });

        const targetDichVuKham = dynamicFieldsContainer.querySelector('input[name="dich_vu.Khám bệnh"]');
        if (targetDichVuKham) {
            targetDichVuKham.value = totalKham;
        }
    }

    // Attach listener for real-time recalculation of Mục 3 'Khám bệnh'
    dynamicFieldsContainer.addEventListener('input', (e) => {
        if (e.target && e.target.name && e.target.name.startsWith('kham_benh.')) {
            updateAutoCalculatedKhamBenh();
        }
    });

    function updateDepartmentRuleAlert(dept) {
        let ruleMsg = `Khoa ${dept}: Các trường nhập liệu đã được tùy biến tự động theo đúng danh mục hoạt động.`;
        
        if (dept === 'Xét nghiệm') {
            ruleMsg = `🔬 <b>Khoa Xét nghiệm:</b> Hiển thị chuyên biệt 7 nhóm xét nghiệm (Sinh hóa, Huyết học, Vi sinh, Tế bào, Mô bệnh học, Hóa mô miễn dịch, Di truyền).`;
        } else if (dept === 'Chẩn đoán hình ảnh') {
            ruleMsg = `🩻 <b>Khoa CĐHA:</b> Hiển thị danh mục riêng (Siêu âm, ABUS, XQ, Panorama, Mammo, MSCT, CBCT, MRI, DEXA, Teleradiology).`;
        } else if (dept === 'Điện quang can thiệp') {
            ruleMsg = `⚡ <b>Khoa ĐQCT:</b> Hiển thị chuyên biệt các kỹ thuật can thiệp (Can thiệp SA, Can thiệp CT, Can thiệp XA).`;
        } else if (dept === 'Phụ sản') {
            ruleMsg = `🤰 <b>Khoa Phụ sản:</b> Tự động bật thêm các trường "Chăm sóc sau sinh", "Hỗ trợ sinh đẻ", "Phẫu thuật mổ lấy thai".`;
        } else if (['Khám bệnh', 'Cấp cứu', 'Nội tổng hợp'].includes(dept)) {
            ruleMsg = `ℹ️ <b>Quy định:</b> Khoa ${dept} được tự động ẩn trường "Phẫu thuật" theo ghi chú form của bệnh viện.`;
        }

        deptRuleText.innerHTML = ruleMsg;
    }

    async function checkCurrentDepartmentStatus() {
        const reportDate = inputDate.value;
        const facility = selectFacility.value;
        const department = selectDepartment.value;

        currentDeptStatus.textContent = 'Đang kiểm tra...';
        currentDeptStatus.className = 'department-status-tag';

        try {
            const res = await apiRequest(`/api/reports?date=${reportDate}&facility=${encodeURIComponent(facility)}&department=${encodeURIComponent(department)}`);
            if (res.ok) {
                const json = await res.json();
                const reports = json.reports || [];
                const inputs = dynamicFieldsContainer.querySelectorAll('input.field-num-input');
                const stepperBtns = dynamicFieldsContainer.querySelectorAll('.stepper-btn');

                if (reports.length > 0) {
                    fillFormData(reports[0].data);

                    if (state.currentUser && state.currentUser.role !== 'admin') {
                        // Non-admin user: Report submitted & locked
                        currentDeptStatus.textContent = '🔒 Đã nộp & Khóa nhập liệu';
                        currentDeptStatus.className = 'department-status-tag submitted';
                        btnSubmitReport.disabled = true;
                        btnSubmitReport.innerHTML = '<i class="fa-solid fa-lock"></i> Đã Nộp & Khóa Nhập Liệu';
                        btnSubmitReport.title = 'Báo cáo ngày này đã được chốt và khóa. Vui lòng liên hệ Admin nếu cần chỉnh sửa.';
                        btnResetForm.disabled = true;
                        
                        inputs.forEach(i => i.disabled = true);
                        stepperBtns.forEach(b => b.disabled = true);
                    } else {
                        // Admin user: Can edit and update anytime
                        currentDeptStatus.textContent = '✓ Đã nộp báo cáo (Admin có thể sửa)';
                        currentDeptStatus.className = 'department-status-tag submitted';
                        btnSubmitReport.disabled = false;
                        btnSubmitReport.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Lưu Thay Đổi (Admin)';
                        btnResetForm.disabled = false;
                        
                        inputs.forEach(i => i.disabled = false);
                        stepperBtns.forEach(b => b.disabled = false);
                    }
                } else {
                    currentDeptStatus.textContent = 'Chưa nhập số liệu';
                    currentDeptStatus.className = 'department-status-tag';
                    btnSubmitReport.disabled = false;
                    btnSubmitReport.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Lưu Báo Cáo Giao Ban';
                    btnResetForm.disabled = false;
                    
                    inputs.forEach(i => {
                        i.disabled = false;
                        i.value = 0;
                    });
                    stepperBtns.forEach(b => b.disabled = false);
                }
            }
        } catch (e) {
            currentDeptStatus.textContent = 'Chưa nhập số liệu';
        }

        updateSideChecklist(reportDate, facility);
    }

    function fillFormData(dataObj) {
        if (!dataObj) return;
        const inputs = dynamicFieldsContainer.querySelectorAll('input.field-num-input');
        inputs.forEach(input => {
            const [cat, fieldName] = input.name.split('.');
            if (dataObj[cat] && dataObj[cat][fieldName] !== undefined) {
                input.value = dataObj[cat][fieldName];
            } else {
                input.value = 0;
            }
        });
        updateAutoCalculatedKhamBenh();
    }

    // Pending report payload for Pre-Save Confirmation Modal
    let pendingReportPayload = null;

    dailyReportForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const reportDate = inputDate.value;
        const facility = selectFacility.value;
        const department = selectDepartment.value;

        // Auto calculate one last time before building payload
        updateAutoCalculatedKhamBenh();

        const dataObj = {};
        const inputs = dynamicFieldsContainer.querySelectorAll('input.field-num-input');
        
        inputs.forEach(input => {
            const [cat, fieldName] = input.name.split('.');
            if (!dataObj[cat]) dataObj[cat] = {};
            const val = parseInt(input.value) || 0;
            dataObj[cat][fieldName] = val;
        });

        pendingReportPayload = {
            report_date: reportDate,
            facility: facility,
            department: department,
            data: dataObj
        };

        // Open Confirmation Modal
        openConfirmSubmitModal(pendingReportPayload);
    });

    function openConfirmSubmitModal(payload) {
        document.getElementById('confirmDateText').textContent = formatDateDisplay(payload.report_date);
        document.getElementById('confirmFacilityText').textContent = payload.facility;
        document.getElementById('confirmDeptText').textContent = payload.department;

        const tableContainer = document.getElementById('confirmSummaryTableContainer');
        const rows = [];

        Object.entries(payload.data).forEach(([catKey, catData]) => {
            Object.entries(catData).forEach(([fName, val]) => {
                if (val > 0) {
                    rows.push({
                        category: catKey,
                        field: fName,
                        value: val
                    });
                }
            });
        });

        if (rows.length === 0) {
            tableContainer.innerHTML = '<div style="padding: 16px; text-align: center; color: #94A3B8; font-size: 13px;">Tất cả chỉ số đều đang là 0 (Báo cáo trống).</div>';
        } else {
            let html = `
                <table class="custom-table" style="font-size: 12px; margin-bottom: 0;">
                    <thead style="position: sticky; top: 0; background: #F8FAFC; z-index: 1;">
                        <tr>
                            <th>Chỉ số</th>
                            <th style="width: 100px; text-align: right;">Số lượng</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            rows.forEach(r => {
                html += `
                    <tr>
                        <td><b>${r.field}</b></td>
                        <td style="text-align: right;"><b style="color: #007A87; font-size: 13px;">${r.value.toLocaleString('vi-VN')}</b></td>
                    </tr>
                `;
            });
            html += '</tbody></table>';
            tableContainer.innerHTML = html;
        }

        confirmSubmitModal.style.display = 'flex';
    }

    if (btnFinalConfirmSubmit) {
        btnFinalConfirmSubmit.addEventListener('click', async () => {
            if (!pendingReportPayload) return;
            btnFinalConfirmSubmit.disabled = true;
            btnFinalConfirmSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang nộp...';

            try {
                const res = await apiRequest('/api/reports', {
                    method: 'POST',
                    body: pendingReportPayload
                });

                const result = await res.json();
                if (res.ok) {
                    showToast(result.message || `Đã lưu thành công và chốt khóa báo cáo!`, 'success');
                    confirmSubmitModal.style.display = 'none';
                    checkCurrentDepartmentStatus();
                    loadDashboardData();
                } else {
                    showToast(result.error || 'Lỗi khi lưu báo cáo', 'error');
                }
            } catch (err) {
                showToast('Lỗi máy chủ: ' + err.message, 'error');
            } finally {
                btnFinalConfirmSubmit.disabled = false;
                btnFinalConfirmSubmit.innerHTML = '<i class="fa-solid fa-circle-check"></i> Xác Nhận & Nộp Báo Cáo';
            }
        });
    }

    if (btnCloseConfirmModal) {
        btnCloseConfirmModal.addEventListener('click', () => {
            confirmSubmitModal.style.display = 'none';
        });
    }
    if (btnCancelConfirm) {
        btnCancelConfirm.addEventListener('click', () => {
            confirmSubmitModal.style.display = 'none';
        });
    }

    btnResetForm.addEventListener('click', () => {
        if (confirm('Bạn có chắc chắn muốn đặt lại tất cả ô nhập liệu về 0?')) {
            const inputs = dynamicFieldsContainer.querySelectorAll('input.field-num-input');
            inputs.forEach(i => i.value = 0);
            showToast('Đã làm mới form nhập liệu!', 'info');
        }
    });

    selectDepartment.addEventListener('change', () => {
        renderDynamicForm();
        checkCurrentDepartmentStatus();
    });

    selectFacility.addEventListener('change', () => {
        checkCurrentDepartmentStatus();
    });

    inputDate.addEventListener('change', () => {
        checkCurrentDepartmentStatus();
    });

    async function updateSideChecklist(reportDate, facility) {
        try {
            const res = await apiRequest(`/api/dashboard?date=${reportDate}&facility=${encodeURIComponent(facility)}`);
            if (res.ok) {
                const dash = await res.json();
                const total = dash.total_departments;
                const submitted = dash.submitted_departments;
                const percent = Math.round((submitted / total) * 100);

                sideProgressBar.style.width = `${percent}%`;
                sideProgressBadge.textContent = `${submitted}/${total} Khoa (${percent}%)`;

                deptChecklist.innerHTML = '';
                Object.entries(dash.department_status).forEach(([deptName, statusInfo]) => {
                    const item = document.createElement('div');
                    item.className = `dept-item ${statusInfo.submitted ? 'submitted' : 'pending'}`;
                    item.innerHTML = `
                        <span>${deptName}</span>
                        <span class="dept-item-icon"><i class="fa-solid ${statusInfo.submitted ? 'fa-circle-check' : 'fa-circle-notch'}"></i></span>
                    `;
                    if (state.currentUser && state.currentUser.role === 'admin') {
                        item.addEventListener('click', () => {
                            selectDepartment.value = deptName;
                            renderDynamicForm();
                            checkCurrentDepartmentStatus();
                        });
                    }
                    deptChecklist.appendChild(item);
                });
            }
        } catch (e) {
            console.warn('Checklist fetch error:', e);
        }
    }

    function getFacilityFullName(fac) {
        if (!fac || fac === 'ALL') {
            return 'Toàn Viện (Tất Cả Các Cơ Sở Bệnh Viện & Phòng Khám)';
        }
        if (state.masterData && state.masterData.facility_details && state.masterData.facility_details[fac]) {
            return state.masterData.facility_details[fac];
        }
        if (fac === 'Bệnh viện') {
            return 'Bệnh Viện Đa Khoa Quốc Tế Vinmec Ocean Park 2';
        }
        if (fac === 'PK OCP1') {
            return 'Phòng Khám Đa Khoa Quốc Tế Vinmec Ocean Park 1';
        }
        if (fac === 'PK OCP2') {
            return 'Phòng Khám Đa Khoa Quốc Tế Vinmec Ocean Park 2';
        }
        return fac;
    }

    // =========================================================================
    // TAB 2: POWER-BI STYLE DASHBOARD (Daily, Weekly, Monthly Views)
    // =========================================================================
    if (btnModeDaily) {
        btnModeDaily.addEventListener('click', () => {
            state.dashMode = 'daily';
            updateDashModeUI();
            loadDashboardData();
        });
    }
    if (btnModeWeekly) {
        btnModeWeekly.addEventListener('click', () => {
            state.dashMode = 'weekly';
            updateDashModeUI();
            loadDashboardData();
        });
    }
    if (btnModeMonthly) {
        btnModeMonthly.addEventListener('click', () => {
            state.dashMode = 'monthly';
            updateDashModeUI();
            loadDashboardData();
        });
    }

    if (dashMonthFilter) {
        dashMonthFilter.addEventListener('change', loadDashboardData);
    }
    if (dashDateFilter) {
        dashDateFilter.addEventListener('change', loadDashboardData);
    }
    if (dashFacilityFilter) {
        dashFacilityFilter.addEventListener('change', loadDashboardData);
    }

    function updateDashModeUI() {
        const mode = state.dashMode || 'daily';
        [btnModeDaily, btnModeWeekly, btnModeMonthly].forEach(b => {
            if (b) b.classList.remove('active');
        });

        if (mode === 'daily') {
            if (btnModeDaily) btnModeDaily.classList.add('active');
            if (filterItemDate) filterItemDate.style.display = 'flex';
            if (filterItemMonth) filterItemMonth.style.display = 'none';
            const lbl = document.getElementById('dashDateLabel');
            if (lbl) lbl.textContent = 'Ngày:';
        } else if (mode === 'weekly') {
            if (btnModeWeekly) btnModeWeekly.classList.add('active');
            if (filterItemDate) filterItemDate.style.display = 'flex';
            if (filterItemMonth) filterItemMonth.style.display = 'none';
            const lbl = document.getElementById('dashDateLabel');
            if (lbl) lbl.textContent = 'Chọn Ngày trong Tuần:';
        } else if (mode === 'monthly') {
            if (btnModeMonthly) btnModeMonthly.classList.add('active');
            if (filterItemDate) filterItemDate.style.display = 'none';
            if (filterItemMonth) filterItemMonth.style.display = 'flex';
        }
    }

    async function loadDashboardData() {
        const facVal = dashFacilityFilter.value;
        const mode = state.dashMode || 'daily';

        if (mode === 'daily') {
            const dateVal = dashDateFilter.value || inputDate.value;
            if (dashPeriodBanner) dashPeriodBanner.style.display = 'none';
            document.getElementById('dashSubTitle').textContent = `Báo cáo số liệu ngày ${formatDateDisplay(dateVal)} - ${getFacilityFullName(facVal)}`;

            try {
                const res = await apiRequest(`/api/dashboard?date=${dateVal}&facility=${encodeURIComponent(facVal)}`);
                if (res.ok) {
                    const data = await res.json();
                    renderDashboardMetrics(data.summary, null);
                    renderCharts(data.summary);
                }
            } catch (e) {
                console.warn('Daily dashboard load error:', e);
            }
        } else if (mode === 'weekly') {
            const dateVal = dashDateFilter.value || inputDate.value;
            try {
                const res = await apiRequest(`/api/dashboard/weekly?date=${dateVal}&facility=${encodeURIComponent(facVal)}`);
                if (res.ok) {
                    const data = await res.json();
                    if (dashPeriodBanner) {
                        dashPeriodBanner.style.display = 'flex';
                        document.getElementById('dashPeriodLabel').textContent = `${data.week_range.label}`;
                        document.getElementById('dashComparisonContextText').textContent = `So sánh với cùng kỳ tuần trước (${formatDateDisplay(data.week_range.prev_start_date)} - ${formatDateDisplay(data.week_range.prev_end_date)})`;
                    }
                    document.getElementById('dashSubTitle').textContent = `Báo cáo tổng hợp Tuần (${formatDateDisplay(data.week_range.start_date)} - ${formatDateDisplay(data.week_range.end_date)}) - ${getFacilityFullName(facVal)}`;

                    renderDashboardMetrics(data.summary, data.comparison);
                    renderWeeklyCharts(data);
                }
            } catch (e) {
                console.warn('Weekly dashboard load error:', e);
            }
        } else if (mode === 'monthly') {
            const monthVal = (dashMonthFilter && dashMonthFilter.value) || state.currentReportDate.substring(0, 7);
            try {
                const res = await apiRequest(`/api/dashboard/monthly?month=${monthVal}&facility=${encodeURIComponent(facVal)}`);
                if (res.ok) {
                    const data = await res.json();
                    if (dashPeriodBanner) {
                        dashPeriodBanner.style.display = 'flex';
                        document.getElementById('dashPeriodLabel').textContent = `Tổng hợp ${data.month_info.month_label} (${data.month_info.days_in_month} ngày)`;
                        document.getElementById('dashComparisonContextText').textContent = `So sánh với cùng kỳ ${data.month_info.prev_month_label}`;
                    }
                    document.getElementById('dashSubTitle').textContent = `Báo cáo tổng hợp ${data.month_info.month_label} - ${getFacilityFullName(facVal)}`;

                    renderDashboardMetrics(data.summary, data.comparison);
                    renderMonthlyCharts(data);
                }
            } catch (e) {
                console.warn('Monthly dashboard load error:', e);
            }
        }
    }

    function renderDashboardMetrics(summary, comparison = null) {
        document.getElementById('kpiTotalKham').textContent = (summary.total_kham || 0).toLocaleString('vi-VN');
        document.getElementById('kpiTotalCapCuu').textContent = (summary.total_cap_cuu || 0).toLocaleString('vi-VN');
        document.getElementById('kpiTotalVaoVien').textContent = (summary.total_vao_vien || 0).toLocaleString('vi-VN');
        document.getElementById('kpiNoiTruSub').textContent = summary.total_noi_tru || 0;
        document.getElementById('kpiDaycareSub').textContent = summary.total_daycare || 0;

        document.getElementById('kpiTotalPhauThuat').textContent = ((summary.total_phau_thuat || 0) + (summary.total_thu_thuat || 0)).toLocaleString('vi-VN');
        document.getElementById('kpiMoSub').textContent = summary.total_phau_thuat || 0;
        document.getElementById('kpiThuThuatSub').textContent = summary.total_thu_thuat || 0;

        const totalCLS = (summary.total_xet_nghiem || 0) + (summary.total_cdha || 0) + (summary.total_dqct || 0);
        document.getElementById('kpiTotalCLS').textContent = totalCLS.toLocaleString('vi-VN');
        document.getElementById('kpiXNSub').textContent = summary.total_xet_nghiem || 0;
        document.getElementById('kpiCDHASub').textContent = summary.total_cdha || 0;
        document.getElementById('kpiDQCTSub').textContent = summary.total_dqct || 0;

        document.getElementById('kpiTotalRaVien').textContent = (summary.total_ra_vien || 0).toLocaleString('vi-VN');
        document.getElementById('kpiChuyenVienSub').textContent = summary.total_chuyen_vien || 0;
        const nangXinVeEl = document.getElementById('kpiNangXinVeSub');
        if (nangXinVeEl) nangXinVeEl.textContent = summary.total_nang_xin_ve || 0;
        document.getElementById('kpiTuVongSub').textContent = summary.total_tu_vong || 0;

        // Render growth comparison badges
        renderGrowthBadge('kpiTotalKhamGrowth', comparison ? comparison.total_kham : null);
        renderGrowthBadge('kpiTotalCapCuuGrowth', comparison ? comparison.total_cap_cuu : null);
        renderGrowthBadge('kpiTotalVaoVienGrowth', comparison ? comparison.total_vao_vien : null);
        renderGrowthBadge('kpiTotalPhauThuatGrowth', comparison ? comparison.total_phau_thuat : null);
        renderGrowthBadge('kpiTotalCLSGrowth', comparison ? comparison.total_xet_nghiem : null);
        renderGrowthBadge('kpiTotalRaVienGrowth', comparison ? comparison.total_ra_vien : null);
    }

    function renderGrowthBadge(elId, compItem) {
        const el = document.getElementById(elId);
        if (!el) return;
        if (!compItem || compItem.previous === undefined) {
            el.style.display = 'none';
            return;
        }

        el.style.display = 'inline-flex';
        const pct = compItem.percent;
        if (pct > 0) {
            el.className = 'growth-badge positive';
            el.innerHTML = `<i class="fa-solid fa-arrow-trend-up"></i> +${pct}%`;
            el.title = `Tăng ${pct}% (Kỳ này: ${compItem.current.toLocaleString()} vs Kỳ trước: ${compItem.previous.toLocaleString()})`;
        } else if (pct < 0) {
            el.className = 'growth-badge negative';
            el.innerHTML = `<i class="fa-solid fa-arrow-trend-down"></i> ${pct}%`;
            el.title = `Giảm ${Math.abs(pct)}% (Kỳ này: ${compItem.current.toLocaleString()} vs Kỳ trước: ${compItem.previous.toLocaleString()})`;
        } else {
            el.className = 'growth-badge neutral';
            el.innerHTML = `<i class="fa-solid fa-minus"></i> 0%`;
            el.title = `Không đổi (${compItem.current.toLocaleString()})`;
        }
    }

    function renderCharts(summary) {
        Object.values(state.charts).forEach(c => c.destroy());
        state.charts = {};

        // 1. Chart Dept Kham
        const ctxKham = document.getElementById('chartDeptKham').getContext('2d');
        const deptLabels = Object.keys(summary.dept_kham_data || {});
        const deptValues = Object.values(summary.dept_kham_data || {});

        state.charts.kham = new Chart(ctxKham, {
            type: 'bar',
            data: {
                labels: deptLabels.length ? deptLabels : ['Chưa có số liệu'],
                datasets: [{
                    label: 'Số lượt khám',
                    data: deptValues.length ? deptValues : [0],
                    backgroundColor: '#007A87',
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { display: false } },
                    y: { beginAtZero: true, grid: { color: '#F1F5F9' } }
                }
            }
        });

        // 2. Chart Services (Donut)
        const ctxServices = document.getElementById('chartServices').getContext('2d');
        const sLabels = Object.keys(summary.service_detail || {});
        const sValues = Object.values(summary.service_detail || {});

        state.charts.services = new Chart(ctxServices, {
            type: 'doughnut',
            data: {
                labels: sLabels.length ? sLabels : ['Chưa có dịch vụ'],
                datasets: [{
                    data: sValues.length ? sValues : [1],
                    backgroundColor: ['#0A2540', '#007A87', '#B71234', '#D4AF37', '#7C3AED', '#10B981']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'right', labels: { boxWidth: 12, font: { size: 11 } } }
                }
            }
        });

        // 3. Chart CDHA
        const ctxCDHA = document.getElementById('chartCDHA').getContext('2d');
        const cdLabels = Object.keys(summary.cdha_detail || {});
        const cdValues = Object.values(summary.cdha_detail || {});

        state.charts.cdha = new Chart(ctxCDHA, {
            type: 'bar',
            data: {
                labels: cdLabels.length ? cdLabels : ['Chưa có kỹ thuật'],
                datasets: [{
                    label: 'Lượt thực hiện',
                    data: cdValues.length ? cdValues : [0],
                    backgroundColor: '#2563EB',
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } }
            }
        });

        // 4. Chart XN
        const ctxXN = document.getElementById('chartXetNghiem').getContext('2d');
        const xnLabels = Object.keys(summary.xet_nghiem_detail || {});
        const xnValues = Object.values(summary.xet_nghiem_detail || {});

        state.charts.xn = new Chart(ctxXN, {
            type: 'bar',
            data: {
                labels: xnLabels.length ? xnLabels : ['Chưa có mẫu'],
                datasets: [{
                    label: 'Số mẫu',
                    data: xnValues.length ? xnValues : [0],
                    backgroundColor: '#7C3AED',
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } }
            }
        });

        // 5. Chart Status (Fixed 6 status labels)
        const ctxStatus = document.getElementById('chartStatus').getContext('2d');
        const fixedStatusLabels = ['Vào viện', 'Ra viện theo chỉ định', 'Ra viện không theo chỉ định', 'Chuyển viện', 'Nặng xin về', 'Tử vong'];
        const fixedStatusValues = fixedStatusLabels.map(st => (summary.status_detail && summary.status_detail[st]) || 0);

        state.charts.status = new Chart(ctxStatus, {
            type: 'bar',
            data: {
                labels: fixedStatusLabels,
                datasets: [{
                    label: 'Số ca',
                    data: fixedStatusValues,
                    backgroundColor: ['#007A87', '#10B981', '#F59E0B', '#3B82F6', '#EF4444', '#1E293B'],
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } }
            }
        });
    }

    function renderWeeklyCharts(weeklyData) {
        Object.values(state.charts).forEach(c => c.destroy());
        state.charts = {};

        const days = weeklyData.daily_breakdown || [];
        const dayLabels = days.map(d => d.label);
        const khamData = days.map(d => d.total_kham);
        const vaoVienData = days.map(d => d.total_vao_vien);

        // 1. Chart 7-day Khám Trend
        const ctxKham = document.getElementById('chartDeptKham').getContext('2d');
        state.charts.kham = new Chart(ctxKham, {
            type: 'bar',
            data: {
                labels: dayLabels,
                datasets: [{
                    label: 'Lượt khám trong tuần',
                    data: khamData,
                    backgroundColor: '#007A87',
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } }
            }
        });

        // 2. Services donut
        const ctxServices = document.getElementById('chartServices').getContext('2d');
        const sLabels = Object.keys(weeklyData.summary.service_detail || {});
        const sValues = Object.values(weeklyData.summary.service_detail || {});
        state.charts.services = new Chart(ctxServices, {
            type: 'doughnut',
            data: {
                labels: sLabels.length ? sLabels : ['Chưa có dữ liệu'],
                datasets: [{
                    data: sValues.length ? sValues : [1],
                    backgroundColor: ['#0A2540', '#007A87', '#B71234', '#D4AF37', '#7C3AED', '#10B981']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'right', labels: { boxWidth: 12, font: { size: 11 } } } }
            }
        });

        // 3. CDHA
        const ctxCDHA = document.getElementById('chartCDHA').getContext('2d');
        const cdLabels = Object.keys(weeklyData.summary.cdha_detail || {});
        const cdValues = Object.values(weeklyData.summary.cdha_detail || {});
        state.charts.cdha = new Chart(ctxCDHA, {
            type: 'bar',
            data: {
                labels: cdLabels.length ? cdLabels : ['Chưa có kỹ thuật'],
                datasets: [{
                    label: 'Tổng lượt CDHA trong tuần',
                    data: cdValues.length ? cdValues : [0],
                    backgroundColor: '#2563EB',
                    borderRadius: 4
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
        });

        // 4. XN
        const ctxXN = document.getElementById('chartXetNghiem').getContext('2d');
        const xnLabels = Object.keys(weeklyData.summary.xet_nghiem_detail || {});
        const xnValues = Object.values(weeklyData.summary.xet_nghiem_detail || {});
        state.charts.xn = new Chart(ctxXN, {
            type: 'bar',
            data: {
                labels: xnLabels.length ? xnLabels : ['Chưa có mẫu'],
                datasets: [{
                    label: 'Tổng mẫu XN trong tuần',
                    data: xnValues.length ? xnValues : [0],
                    backgroundColor: '#7C3AED',
                    borderRadius: 4
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
        });

        // 5. 7-Day Inpatient Trend
        const ctxStatus = document.getElementById('chartStatus').getContext('2d');
        state.charts.status = new Chart(ctxStatus, {
            type: 'line',
            data: {
                labels: dayLabels,
                datasets: [{
                    label: 'Bệnh nhân Vào viện (7 ngày)',
                    data: vaoVienData,
                    borderColor: '#10B981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    fill: true,
                    tension: 0.3,
                    pointRadius: 5
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
        });
    }

    function renderMonthlyCharts(monthlyData) {
        Object.values(state.charts).forEach(c => c.destroy());
        state.charts = {};

        const days = monthlyData.daily_trend || [];
        const dayLabels = days.map(d => `${d.day}`);
        const khamData = days.map(d => d.total_kham);
        const vaoVienData = days.map(d => d.total_vao_vien);

        // 1. Chart Monthly Khám Trend (Line)
        const ctxKham = document.getElementById('chartDeptKham').getContext('2d');
        state.charts.kham = new Chart(ctxKham, {
            type: 'line',
            data: {
                labels: dayLabels,
                datasets: [{
                    label: 'Lượt khám theo ngày trong tháng',
                    data: khamData,
                    borderColor: '#007A87',
                    backgroundColor: 'rgba(0, 122, 135, 0.1)',
                    fill: true,
                    tension: 0.3,
                    pointRadius: 3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { y: { beginAtZero: true } }
            }
        });

        // 2. Services donut
        const ctxServices = document.getElementById('chartServices').getContext('2d');
        const sLabels = Object.keys(monthlyData.summary.service_detail || {});
        const sValues = Object.values(monthlyData.summary.service_detail || {});
        state.charts.services = new Chart(ctxServices, {
            type: 'doughnut',
            data: {
                labels: sLabels.length ? sLabels : ['Chưa có dữ liệu'],
                datasets: [{
                    data: sValues.length ? sValues : [1],
                    backgroundColor: ['#0A2540', '#007A87', '#B71234', '#D4AF37', '#7C3AED', '#10B981']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'right', labels: { boxWidth: 12, font: { size: 11 } } } }
            }
        });

        // 3. CDHA
        const ctxCDHA = document.getElementById('chartCDHA').getContext('2d');
        const cdLabels = Object.keys(monthlyData.summary.cdha_detail || {});
        const cdValues = Object.values(monthlyData.summary.cdha_detail || {});
        state.charts.cdha = new Chart(ctxCDHA, {
            type: 'bar',
            data: {
                labels: cdLabels.length ? cdLabels : ['Chưa có kỹ thuật'],
                datasets: [{
                    label: 'Lượt thực hiện CĐHA trong tháng',
                    data: cdValues.length ? cdValues : [0],
                    backgroundColor: '#2563EB',
                    borderRadius: 4
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
        });

        // 4. XN
        const ctxXN = document.getElementById('chartXetNghiem').getContext('2d');
        const xnLabels = Object.keys(monthlyData.summary.xet_nghiem_detail || {});
        const xnValues = Object.values(monthlyData.summary.xet_nghiem_detail || {});
        state.charts.xn = new Chart(ctxXN, {
            type: 'bar',
            data: {
                labels: xnLabels.length ? xnLabels : ['Chưa có mẫu'],
                datasets: [{
                    label: 'Số mẫu xét nghiệm trong tháng',
                    data: xnValues.length ? xnValues : [0],
                    backgroundColor: '#7C3AED',
                    borderRadius: 4
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
        });

        // 5. Monthly Admissions Trend (Line)
        const ctxStatus = document.getElementById('chartStatus').getContext('2d');
        state.charts.status = new Chart(ctxStatus, {
            type: 'line',
            data: {
                labels: dayLabels,
                datasets: [{
                    label: 'Bệnh nhân Vào viện theo ngày trong tháng',
                    data: vaoVienData,
                    borderColor: '#10B981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    fill: true,
                    tension: 0.3,
                    pointRadius: 3
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
        });
    }

    btnRefreshDashboard.addEventListener('click', loadDashboardData);

    // =========================================================================
    // TAB 3: DATA MANAGEMENT & EXCEL EXPORT (SHEET OUTPUT TABLE)
    // =========================================================================
    async function loadReportsTable() {
        const dateVal = tableDateFilter.value;
        const facVal = tableFacilityFilter.value;
        const searchVal = tableSearchFilter.value.toLowerCase().trim();

        reportsTableBody.innerHTML = '<tr><td colspan="10" style="text-align:center; padding: 20px;">Đang tải dữ liệu...</td></tr>';

        try {
            let url = '/api/reports?';
            if (dateVal) url += `date=${dateVal}&`;
            if (facVal) url += `facility=${encodeURIComponent(facVal)}&`;

            const res = await apiRequest(url);
            if (res.ok) {
                const json = await res.json();
                let reports = json.reports || [];
                if (searchVal) {
                    reports = reports.filter(r => r.department.toLowerCase().includes(searchVal));
                }
                renderTableRows(reports);
            }
        } catch (e) {
            reportsTableBody.innerHTML = '<tr><td colspan="10" style="text-align:center; color:red; padding:20px;">Không thể tải dữ liệu từ máy chủ.</td></tr>';
        }
    }

    function renderTableRows(reports) {
        reportsTableBody.innerHTML = '';
        if (reports.length === 0) {
            reportsTableBody.innerHTML = '<tr><td colspan="10" style="text-align:center; padding: 30px; color: #64748B;">Không tìm thấy bản ghi báo cáo nào.</td></tr>';
            return;
        }

        reports.forEach(r => {
            const d = r.data || {};
            const tr = document.createElement('tr');

            const kb = formatCategoryPills(d.kham_benh, 'stat-pill-kb');
            const dt = formatCategoryPills(d.dieu_tri, 'stat-pill-dt');
            const dv = formatCategoryPills(d.dich_vu, 'stat-pill-dv');
            const tt = formatCategoryPills(d.tinh_trang, 'stat-pill-tt');
            
            const clsParts = [];
            if (d.xet_nghiem) {
                const xnPills = formatCategoryPills(d.xet_nghiem, 'stat-pill-dt');
                if (xnPills !== '<span class="empty-cell-dash">—</span>') clsParts.push(`<b>XN:</b> ${xnPills}`);
            }
            if (d.cdha) {
                const cdPills = formatCategoryPills(d.cdha, 'stat-pill-kb');
                if (cdPills !== '<span class="empty-cell-dash">—</span>') clsParts.push(`<b>CĐHA:</b> ${cdPills}`);
            }
            if (d.dqct) {
                const dqPills = formatCategoryPills(d.dqct, 'stat-pill-dv');
                if (dqPills !== '<span class="empty-cell-dash">—</span>') clsParts.push(`<b>ĐQCT:</b> ${dqPills}`);
            }
            const clsHtml = clsParts.length > 0 ? clsParts.join('<div style="margin-top:4px;"></div>') : '<span class="empty-cell-dash">—</span>';

            const submitterName = r.submitted_by ? (r.submitted_by.full_name || r.submitted_by.username) : 'Hệ thống';

            tr.innerHTML = `
                <td style="white-space:nowrap;"><b>${formatDateDisplay(r.report_date)}</b></td>
                <td><span class="badge-facility">${r.facility}</span></td>
                <td style="white-space:nowrap;"><b style="color: #0A2540;">${r.department}</b></td>
                <td>${kb}</td>
                <td>${dt}</td>
                <td>${dv}</td>
                <td>${tt}</td>
                <td>${clsHtml}</td>
                <td>
                    <div class="submitter-cell">
                        <span class="submitter-avatar"><i class="fa-solid fa-user-check"></i></span>
                        <span style="font-size: 11.5px; font-weight:600; color: #475569;">${submitterName}</span>
                    </div>
                </td>
                <td>
                    <div class="table-actions">
                        <button class="btn-action btn-action-danger btn-del-row" data-id="${r.id}" title="Xóa bản ghi"><i class="fa-solid fa-trash-can"></i></button>
                    </div>
                </td>
            `;

            tr.querySelector('.btn-del-row').addEventListener('click', async () => {
                if (confirm(`Bạn có chắc muốn xóa báo cáo của ${r.department} ngày ${r.report_date}?`)) {
                    const delRes = await apiRequest(`/api/reports/${r.id}`, { method: 'DELETE' });
                    if (delRes.ok) {
                        showToast('Đã xóa bản ghi thành công!', 'success');
                        loadReportsTable();
                        loadDashboardData();
                    } else {
                        const errData = await delRes.json();
                        showToast(errData.error || 'Lỗi khi xóa', 'error');
                    }
                }
            });

            reportsTableBody.appendChild(tr);
        });
    }

    function formatCategoryPills(catObj, customClass = '') {
        if (!catObj) return '<span class="empty-cell-dash">—</span>';
        const entries = Object.entries(catObj).filter(([_, v]) => parseInt(v) > 0);
        if (entries.length === 0) return '<span class="empty-cell-dash">—</span>';

        const pills = entries.map(([k, v]) => `
            <span class="stat-pill ${customClass}">
                <span>${k}:</span> <b>${v}</b>
            </span>
        `).join('');

        return `<div class="stat-pill-group">${pills}</div>`;
    }

    tableDateFilter.addEventListener('change', loadReportsTable);
    tableFacilityFilter.addEventListener('change', loadReportsTable);
    tableSearchFilter.addEventListener('input', loadReportsTable);
    btnReloadTable.addEventListener('click', loadReportsTable);

    function triggerExcelExport() {
        const dateVal = dashDateFilter.value || inputDate.value;
        const facVal = dashFacilityFilter.value;
        let url = `/api/export/excel?date=${dateVal}`;
        if (facVal && facVal !== 'ALL') url += `&facility=${encodeURIComponent(facVal)}`;
        window.location.href = url;
    }
    btnExportExcelMain.addEventListener('click', triggerExcelExport);
    btnQuickExport.addEventListener('click', triggerExcelExport);

    // =========================================================================
    // TAB 4: USER MANAGEMENT & MULTI-SELECT CHIP PICKER (ADMIN ONLY)
    // =========================================================================
    async function loadUsersTable() {
        if (!state.currentUser || state.currentUser.role !== 'admin') return;

        usersTableBody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding: 20px;">Đang tải danh sách tài khoản...</td></tr>';

        try {
            const res = await apiRequest('/api/users');
            if (res.ok) {
                const data = await res.json();
                renderUsersTableRows(data.users || []);
            }
        } catch (e) {
            usersTableBody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:red; padding:20px;">Lỗi tải tài khoản: ' + e.message + '</td></tr>';
        }
    }

    function renderUsersTableRows(users) {
        usersTableBody.innerHTML = '';
        if (users.length === 0) {
            usersTableBody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding: 20px;">Chưa có tài khoản nào.</td></tr>';
            return;
        }

        users.forEach(u => {
            const tr = document.createElement('tr');
            const isAdmin = u.role === 'admin';
            const isActive = u.is_active === 1;

            // Render facility badges
            const facBadges = (u.facility || '').split(',').map(f => `<span class="badge-facility" style="margin: 2px 2px;">${f.trim()}</span>`).join(' ');

            // Render department badges
            const deptBadges = (u.department || '').split(',').map(d => `<span class="stat-pill" style="background:#F8FAFC; border-color:#CBD5E1; font-weight:700;">${d.trim()}</span>`).join(' ');

            tr.innerHTML = `
                <td><b>${u.username}</b></td>
                <td>${u.full_name}</td>
                <td><span class="badge ${isAdmin ? 'badge-admin' : 'badge-accent'}">${isAdmin ? 'Super Admin' : 'Khoa / Phòng'}</span></td>
                <td><div style="display:flex; flex-wrap:wrap; gap:4px;">${facBadges}</div></td>
                <td><div class="stat-pill-group">${deptBadges}</div></td>
                <td>
                    <span class="badge" style="${isActive ? 'background:#DCFCE7; color:#166534;' : 'background:#F1F5F9; color:#94A3B8;'}">
                        ${isActive ? 'Hoạt động' : 'Bị khóa'}
                    </span>
                </td>
                <td style="font-size: 11px; color:#64748B;">${formatDateDisplay(u.created_at ? u.created_at.split('T')[0] : '')}</td>
                <td>
                    <div class="table-actions">
                        <button class="btn-action btn-edit-user" data-id="${u.id}" title="Chỉnh sửa tài khoản"><i class="fa-solid fa-pen-to-square"></i> Sửa</button>
                        <button class="btn-action btn-reset-pass" data-id="${u.id}" data-username="${u.username}" title="Đặt lại mật khẩu"><i class="fa-solid fa-key"></i> Đổi pass</button>
                        ${!isAdmin ? `
                            <button class="btn-action btn-toggle-active" data-id="${u.id}" data-active="${isActive}" title="${isActive ? 'Khóa tài khoản' : 'Mở khóa'}">
                                <i class="fa-solid ${isActive ? 'fa-lock' : 'fa-lock-open'}"></i>
                            </button>
                            <button class="btn-action btn-action-danger btn-delete-user" data-id="${u.id}" data-username="${u.username}" title="Xóa tài khoản">
                                <i class="fa-solid fa-trash-can"></i>
                            </button>
                        ` : ''}
                    </div>
                </td>
            `;

            tr.querySelector('.btn-edit-user').addEventListener('click', () => {
                openEditUserModal(u);
            });

            tr.querySelector('.btn-reset-pass').addEventListener('click', async () => {
                const newPass = prompt(`Nhập mật khẩu mới cho tài khoản "${u.username}":`, '123456');
                if (newPass) {
                    const res = await apiRequest(`/api/users/${u.id}/reset-password`, {
                        method: 'POST',
                        body: { new_password: newPass }
                    });
                    const resData = await res.json();
                    if (res.ok) {
                        showToast(resData.message, 'success');
                    } else {
                        showToast(resData.error || 'Lỗi đặt lại mật khẩu', 'error');
                    }
                }
            });

            const btnToggle = tr.querySelector('.btn-toggle-active');
            if (btnToggle) {
                btnToggle.addEventListener('click', async () => {
                    const nextActive = isActive ? 0 : 1;
                    const res = await apiRequest(`/api/users/${u.id}`, {
                        method: 'PUT',
                        body: { is_active: nextActive }
                    });
                    if (res.ok) {
                        showToast(`Đã ${nextActive ? 'mở khóa' : 'khóa'} tài khoản ${u.username}`, 'success');
                        loadUsersTable();
                    }
                });
            }

            const btnDel = tr.querySelector('.btn-delete-user');
            if (btnDel) {
                btnDel.addEventListener('click', async () => {
                    if (confirm(`Bạn có chắc muốn xóa tài khoản "${u.username}" (${u.full_name})?`)) {
                        const res = await apiRequest(`/api/users/${u.id}`, { method: 'DELETE' });
                        if (res.ok) {
                            showToast(`Đã xóa tài khoản "${u.username}"`, 'success');
                            loadUsersTable();
                        } else {
                            const errData = await res.json();
                            showToast(errData.error || 'Lỗi khi xóa tài khoản', 'error');
                        }
                    }
                });
            }

            usersTableBody.appendChild(tr);
        });
    }

    // =========================================================================
    // EDIT USER MODAL LOGIC (ADMIN ONLY)
    // =========================================================================
    const editUserModal = document.getElementById('editUserModal');
    const btnCloseEditUserModal = document.getElementById('btnCloseEditUserModal');
    const btnCancelEditUser = document.getElementById('btnCancelEditUser');
    const editUserForm = document.getElementById('editUserForm');
    const editUserId = document.getElementById('editUserId');
    const editUsername = document.getElementById('editUsername');
    const editUserHeaderTitle = document.getElementById('editUserHeaderTitle');
    const editFullName = document.getElementById('editFullName');
    const editRole = document.getElementById('editRole');
    const editIsActive = document.getElementById('editIsActive');
    const editNewPassword = document.getElementById('editNewPassword');
    const editDeptSearchInput = document.getElementById('editDeptSearchInput');
    const editDeptSelectedCountText = document.getElementById('editDeptSelectedCountText');
    const editDeptMultiSelectContainer = document.getElementById('editDeptMultiSelectContainer');
    const btnEditSelectAllDepts = document.getElementById('btnEditSelectAllDepts');
    const btnEditSelectCLSDepts = document.getElementById('btnEditSelectCLSDepts');
    const btnEditClearDepts = document.getElementById('btnEditClearDepts');

    function openEditUserModal(u) {
        editUserId.value = u.id;
        editUsername.value = u.username;
        editUserHeaderTitle.textContent = `${u.username} (${u.full_name})`;
        editFullName.value = u.full_name;
        editRole.value = u.role;
        editIsActive.value = u.is_active;
        editNewPassword.value = '';
        if (editDeptSearchInput) editDeptSearchInput.value = '';

        // Facilities multi-select
        state.selectedEditModalFacilities.clear();
        if (u.facility === 'ALL') {
            if (state.masterData && state.masterData.facilities) {
                state.masterData.facilities.forEach(f => state.selectedEditModalFacilities.add(f));
            }
        } else if (u.facility) {
            u.facility.split(',').map(s => s.trim()).filter(Boolean).forEach(f => {
                state.selectedEditModalFacilities.add(f);
            });
        }
        renderEditModalFacilityChips();

        // Departments multi-select
        state.selectedEditModalDepts.clear();
        if (u.department === 'ALL') {
            if (state.masterData) {
                state.masterData.departments.forEach(d => state.selectedEditModalDepts.add(d));
            }
        } else if (u.department) {
            u.department.split(',').map(s => s.trim()).filter(Boolean).forEach(d => {
                state.selectedEditModalDepts.add(d);
            });
        }
        renderEditModalDeptChips();

        editUserModal.style.display = 'flex';
    }

    function renderEditModalFacilityChips() {
        if (!editFacilityMultiSelectContainer || !state.masterData || !state.masterData.facilities) return;
        editFacilityMultiSelectContainer.innerHTML = '';

        state.masterData.facilities.forEach(fac => {
            const isSelected = state.selectedEditModalFacilities.has(fac);
            const chip = document.createElement('div');
            chip.className = `dept-chip ${isSelected ? 'active' : ''}`;
            chip.innerHTML = `
                <i class="fa-solid ${isSelected ? 'fa-square-check' : 'fa-square'} chip-check"></i>
                <span>${fac}</span>
            `;

            chip.addEventListener('click', () => {
                if (state.selectedEditModalFacilities.has(fac)) {
                    state.selectedEditModalFacilities.delete(fac);
                } else {
                    state.selectedEditModalFacilities.add(fac);
                }
                renderEditModalFacilityChips();
            });

            editFacilityMultiSelectContainer.appendChild(chip);
        });

        const count = state.selectedEditModalFacilities.size;
        if (editFacilitySelectedCountText) {
            editFacilitySelectedCountText.innerHTML = `<i class="fa-solid fa-check-double"></i> Đã chọn: <b style="color:#0A2540;">${count}</b> / ${state.masterData.facilities.length} cơ sở`;
        }
    }

    function renderEditModalDeptChips() {
        if (!editDeptMultiSelectContainer || !state.masterData) return;

        editDeptMultiSelectContainer.innerHTML = '';
        const searchVal = (editDeptSearchInput ? editDeptSearchInput.value || '' : '').toLowerCase().trim();

        state.masterData.departments.forEach(dept => {
            if (searchVal && !dept.toLowerCase().includes(searchVal)) return;

            const isSelected = state.selectedEditModalDepts.has(dept);
            const chip = document.createElement('div');
            chip.className = `dept-chip ${isSelected ? 'active' : ''}`;
            chip.innerHTML = `
                <i class="fa-solid ${isSelected ? 'fa-square-check' : 'fa-square'} chip-check"></i>
                <span>${dept}</span>
            `;

            chip.addEventListener('click', () => {
                if (state.selectedEditModalDepts.has(dept)) {
                    state.selectedEditModalDepts.delete(dept);
                } else {
                    state.selectedEditModalDepts.add(dept);
                }
                renderEditModalDeptChips();
            });

            editDeptMultiSelectContainer.appendChild(chip);
        });

        const count = state.selectedEditModalDepts.size;
        if (editDeptSelectedCountText) {
            editDeptSelectedCountText.innerHTML = `<i class="fa-solid fa-check-double"></i> Đã chọn: <b style="color:#0A2540;">${count}</b> / ${state.masterData ? state.masterData.departments.length : 17} chuyên khoa`;
        }
    }

    if (btnEditSelectAllFacilities) {
        btnEditSelectAllFacilities.addEventListener('click', () => {
            if (state.masterData && state.masterData.facilities) {
                state.masterData.facilities.forEach(f => state.selectedEditModalFacilities.add(f));
                renderEditModalFacilityChips();
            }
        });
    }
    if (btnEditClearFacilities) {
        btnEditClearFacilities.addEventListener('click', () => {
            state.selectedEditModalFacilities.clear();
            renderEditModalFacilityChips();
        });
    }

    if (editDeptSearchInput) {
        editDeptSearchInput.addEventListener('input', renderEditModalDeptChips);
    }
    if (btnEditSelectAllDepts) {
        btnEditSelectAllDepts.addEventListener('click', () => {
            if (state.masterData) {
                state.masterData.departments.forEach(d => state.selectedEditModalDepts.add(d));
                renderEditModalDeptChips();
            }
        });
    }
    if (btnEditSelectCLSDepts) {
        btnEditSelectCLSDepts.addEventListener('click', () => {
            state.selectedEditModalDepts.clear();
            ['Xét nghiệm', 'Chẩn đoán hình ảnh', 'Điện quang can thiệp'].forEach(d => state.selectedEditModalDepts.add(d));
            renderEditModalDeptChips();
        });
    }
    if (btnEditClearDepts) {
        btnEditClearDepts.addEventListener('click', () => {
            state.selectedEditModalDepts.clear();
            renderEditModalDeptChips();
        });
    }

    if (btnCloseEditUserModal) {
        btnCloseEditUserModal.addEventListener('click', () => {
            editUserModal.style.display = 'none';
        });
    }
    if (btnCancelEditUser) {
        btnCancelEditUser.addEventListener('click', () => {
            editUserModal.style.display = 'none';
        });
    }

    if (editUserForm) {
        editUserForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = editUserId.value;

            if (state.selectedEditModalFacilities.size === 0) {
                showToast('Vui lòng chọn ít nhất 1 cơ sở phụ trách cho tài khoản!', 'error');
                return;
            }

            if (state.selectedEditModalDepts.size === 0) {
                showToast('Vui lòng chọn ít nhất 1 chuyên khoa phụ trách cho tài khoản!', 'error');
                return;
            }

            const selectedFacList = Array.from(state.selectedEditModalFacilities);
            const facString = selectedFacList.length === state.masterData.facilities.length ? 'ALL' : selectedFacList.join(', ');

            const selectedList = Array.from(state.selectedEditModalDepts);
            const deptString = selectedList.length === state.masterData.departments.length ? 'ALL' : selectedList.join(', ');

            const payload = {
                full_name: editFullName.value.trim(),
                facility: facString,
                department: deptString,
                role: editRole.value,
                is_active: parseInt(editIsActive.value)
            };

            const newPass = editNewPassword.value.trim();
            if (newPass) {
                if (newPass.length < 6) {
                    showToast('Mật khẩu mới nếu đổi phải có tối thiểu 6 ký tự!', 'error');
                    return;
                }
                payload.new_password = newPass;
            }

            try {
                const res = await apiRequest(`/api/users/${id}`, {
                    method: 'PUT',
                    body: payload
                });
                const data = await res.json();
                if (res.ok) {
                    showToast(data.message || 'Cập nhật tài khoản thành công!', 'success');
                    editUserModal.style.display = 'none';
                    loadUsersTable();
                } else {
                    showToast(data.error || 'Lỗi cập nhật tài khoản', 'error');
                }
            } catch (err) {
                showToast('Lỗi máy chủ: ' + err.message, 'error');
            }
        });
    }

    // =========================================================================
    // CREATE USER MODAL LOGIC (ADMIN ONLY)
    // =========================================================================
    function renderModalFacilityChips() {
        if (!facilityMultiSelectContainer || !state.masterData || !state.masterData.facilities) return;
        facilityMultiSelectContainer.innerHTML = '';

        state.masterData.facilities.forEach(fac => {
            const isSelected = state.selectedModalFacilities.has(fac);
            const chip = document.createElement('div');
            chip.className = `dept-chip ${isSelected ? 'active' : ''}`;
            chip.innerHTML = `
                <i class="fa-solid ${isSelected ? 'fa-square-check' : 'fa-square'} chip-check"></i>
                <span>${fac}</span>
            `;

            chip.addEventListener('click', () => {
                if (state.selectedModalFacilities.has(fac)) {
                    state.selectedModalFacilities.delete(fac);
                } else {
                    state.selectedModalFacilities.add(fac);
                }
                renderModalFacilityChips();
            });

            facilityMultiSelectContainer.appendChild(chip);
        });

        const count = state.selectedModalFacilities.size;
        if (facilitySelectedCountText) {
            facilitySelectedCountText.innerHTML = `<i class="fa-solid fa-check-double"></i> Đã chọn: <b style="color:#0A2540;">${count}</b> / ${state.masterData.facilities.length} cơ sở`;
        }
    }

    if (btnSelectAllFacilities) {
        btnSelectAllFacilities.addEventListener('click', () => {
            if (state.masterData && state.masterData.facilities) {
                state.masterData.facilities.forEach(f => state.selectedModalFacilities.add(f));
                renderModalFacilityChips();
            }
        });
    }
    if (btnClearFacilities) {
        btnClearFacilities.addEventListener('click', () => {
            state.selectedModalFacilities.clear();
            renderModalFacilityChips();
        });
    }

    // Interactive Multi-Select Department Chips in Modal
    function renderModalDeptChips() {
        if (!deptMultiSelectContainer || !state.masterData) return;

        deptMultiSelectContainer.innerHTML = '';
        const searchVal = (deptSearchInput.value || '').toLowerCase().trim();

        state.masterData.departments.forEach(dept => {
            if (searchVal && !dept.toLowerCase().includes(searchVal)) return;

            const isSelected = state.selectedModalDepts.has(dept);
            const chip = document.createElement('div');
            chip.className = `dept-chip ${isSelected ? 'active' : ''}`;
            chip.innerHTML = `
                <i class="fa-solid ${isSelected ? 'fa-square-check' : 'fa-square'} chip-check"></i>
                <span>${dept}</span>
            `;

            chip.addEventListener('click', () => {
                if (state.selectedModalDepts.has(dept)) {
                    state.selectedModalDepts.delete(dept);
                } else {
                    state.selectedModalDepts.add(dept);
                }
                renderModalDeptChips();
                updateSelectedDeptCountText();
            });

            deptMultiSelectContainer.appendChild(chip);
        });

        updateSelectedDeptCountText();
    }

    function updateSelectedDeptCountText() {
        const count = state.selectedModalDepts.size;
        deptSelectedCountText.innerHTML = `<i class="fa-solid fa-check-double"></i> Đã chọn: <b style="color:#0A2540;">${count}</b> / ${state.masterData ? state.masterData.departments.length : 17} chuyên khoa`;
    }

    if (deptSearchInput) {
        deptSearchInput.addEventListener('input', renderModalDeptChips);
    }

    if (btnSelectAllDepts) {
        btnSelectAllDepts.addEventListener('click', () => {
            if (state.masterData) {
                state.masterData.departments.forEach(d => state.selectedModalDepts.add(d));
                renderModalDeptChips();
            }
        });
    }

    if (btnSelectCLSDepts) {
        btnSelectCLSDepts.addEventListener('click', () => {
            state.selectedModalDepts.clear();
            ['Xét nghiệm', 'Chẩn đoán hình ảnh', 'Điện quang can thiệp'].forEach(d => state.selectedModalDepts.add(d));
            renderModalDeptChips();
        });
    }

    if (btnClearDepts) {
        btnClearDepts.addEventListener('click', () => {
            state.selectedModalDepts.clear();
            renderModalDeptChips();
        });
    }

    btnOpenCreateUserModal.addEventListener('click', () => {
        createUserForm.reset();
        state.selectedModalDepts.clear();
        state.selectedModalFacilities.clear();
        if (state.masterData && state.masterData.facilities) {
            state.selectedModalFacilities.add(state.masterData.facilities[0]);
        }
        if (deptSearchInput) deptSearchInput.value = '';
        renderModalFacilityChips();
        renderModalDeptChips();
        createUserModal.style.display = 'flex';
    });
    btnCloseCreateUserModal.addEventListener('click', () => {
        createUserModal.style.display = 'none';
    });
    btnCancelCreateUser.addEventListener('click', () => {
        createUserModal.style.display = 'none';
    });

    createUserForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (state.selectedModalFacilities.size === 0) {
            showToast('Vui lòng chọn ít nhất 1 cơ sở phụ trách cho tài khoản!', 'error');
            return;
        }

        if (state.selectedModalDepts.size === 0) {
            showToast('Vui lòng chọn ít nhất 1 chuyên khoa phụ trách cho tài khoản!', 'error');
            return;
        }

        const selectedFacList = Array.from(state.selectedModalFacilities);
        const facString = selectedFacList.length === state.masterData.facilities.length ? 'ALL' : selectedFacList.join(', ');

        const selectedList = Array.from(state.selectedModalDepts);
        const deptString = selectedList.length === state.masterData.departments.length ? 'ALL' : selectedList.join(', ');

        const payload = {
            username: document.getElementById('newUsername').value.trim(),
            password: document.getElementById('newPassword').value,
            full_name: document.getElementById('newFullName').value.trim(),
            facility: facString,
            department: deptString,
            role: document.getElementById('newRole').value
        };

        try {
            const res = await apiRequest('/api/users', {
                method: 'POST',
                body: payload
            });

            const data = await res.json();
            if (res.ok) {
                showToast(data.message, 'success');
                createUserModal.style.display = 'none';
                loadUsersTable();
            } else {
                showToast(data.error || 'Lỗi tạo tài khoản', 'error');
            }
        } catch (err) {
            showToast('Lỗi máy chủ: ' + err.message, 'error');
        }
    });

    // =========================================================================
    // FACILITY MANAGEMENT (ADMIN ONLY)
    // =========================================================================
    const btnOpenFacilityModal = document.getElementById('btnOpenFacilityModal');
    const facilityModal = document.getElementById('facilityModal');
    const btnCloseFacilityModal = document.getElementById('btnCloseFacilityModal');
    const btnCloseFacilityModalBtn = document.getElementById('btnCloseFacilityModalBtn');
    const createFacilityForm = document.getElementById('createFacilityForm');
    const newFacilityName = document.getElementById('newFacilityName');
    const newFacilityDesc = document.getElementById('newFacilityDesc');
    const facilitiesTableBody = document.getElementById('facilitiesTableBody');

    if (btnOpenFacilityModal) {
        btnOpenFacilityModal.addEventListener('click', () => {
            facilityModal.style.display = 'flex';
            loadFacilitiesList();
        });
    }

    if (btnCloseFacilityModal) {
        btnCloseFacilityModal.addEventListener('click', () => {
            facilityModal.style.display = 'none';
        });
    }

    if (btnCloseFacilityModalBtn) {
        btnCloseFacilityModalBtn.addEventListener('click', () => {
            facilityModal.style.display = 'none';
        });
    }

    async function loadFacilitiesList() {
        if (!facilitiesTableBody) return;
        facilitiesTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #64748B;">Đang tải danh sách cơ sở...</td></tr>';

        try {
            const res = await apiRequest('/api/facilities');
            const data = await res.json();
            if (res.ok && data.facilities) {
                renderFacilitiesTable(data.facilities);
            } else {
                facilitiesTableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--danger);">${data.error || 'Lỗi tải cơ sở'}</td></tr>`;
            }
        } catch (err) {
            facilitiesTableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--danger);">Lỗi máy chủ: ${err.message}</td></tr>`;
        }
    }

    const facilityFormTitle = document.getElementById('facilityFormTitle');
    const editFacilityId = document.getElementById('editFacilityId');
    const btnSubmitFacility = document.getElementById('btnSubmitFacility');
    const btnCancelEditFacility = document.getElementById('btnCancelEditFacility');

    function resetFacilityForm() {
        if (!createFacilityForm) return;
        createFacilityForm.reset();
        if (editFacilityId) editFacilityId.value = '';
        if (facilityFormTitle) {
            facilityFormTitle.innerHTML = '<i class="fa-solid fa-circle-plus" style="color: var(--accent-teal);"></i> Thêm Cơ Sở Hoạt Động Mới';
        }
        if (btnSubmitFacility) {
            btnSubmitFacility.innerHTML = '<i class="fa-solid fa-plus"></i> Thêm Cơ Sở';
        }
        if (btnCancelEditFacility) {
            btnCancelEditFacility.style.display = 'none';
        }
    }

    if (btnCancelEditFacility) {
        btnCancelEditFacility.addEventListener('click', resetFacilityForm);
    }

    function renderFacilitiesTable(facilities) {
        facilitiesTableBody.innerHTML = '';
        if (facilities.length === 0) {
            facilitiesTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #64748B;">Chưa có cơ sở nào</td></tr>';
            return;
        }

        facilities.forEach((fac, idx) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="font-weight: 700; text-align: center;">${idx + 1}</td>
                <td>
                    <span class="badge badge-info" style="font-size: 12px; font-weight: 700;">${fac.name}</span>
                </td>
                <td style="color: #334155;">${fac.description || '<i style="color: #94A3B8;">Chưa có mô tả</i>'}</td>
                <td style="color: #64748B; font-size: 11px;">${fac.created_at ? fac.created_at.substring(0, 10) : '-'}</td>
                <td>
                    <div class="table-actions" style="justify-content: center;">
                        <button class="btn-action btn-edit-facility" data-id="${fac.id}" data-name="${fac.name}" data-desc="${fac.description || ''}" title="Sửa thông tin cơ sở">
                            <i class="fa-solid fa-pen-to-square"></i> Sửa
                        </button>
                        <button class="btn-action btn-action-danger btn-delete-facility" data-id="${fac.id}" data-name="${fac.name}" title="Xóa cơ sở">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                </td>
            `;
            facilitiesTableBody.appendChild(tr);
        });

        // Add edit handlers
        facilitiesTableBody.querySelectorAll('.btn-edit-facility').forEach(btn => {
            btn.addEventListener('click', () => {
                const facId = btn.dataset.id;
                const facName = btn.dataset.name;
                const facDesc = btn.dataset.desc;

                if (editFacilityId) editFacilityId.value = facId;
                if (newFacilityName) newFacilityName.value = facName;
                if (newFacilityDesc) newFacilityDesc.value = facDesc;
                if (facilityFormTitle) {
                    facilityFormTitle.innerHTML = `<i class="fa-solid fa-pen-to-square" style="color: var(--accent-gold);"></i> Chỉnh Sửa Cơ Sở: <b style="color: var(--accent-teal);">${facName}</b>`;
                }
                if (btnSubmitFacility) {
                    btnSubmitFacility.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Cập Nhật';
                }
                if (btnCancelEditFacility) {
                    btnCancelEditFacility.style.display = 'inline-block';
                }
                if (newFacilityName) newFacilityName.focus();
            });
        });

        // Add delete handlers
        facilitiesTableBody.querySelectorAll('.btn-delete-facility').forEach(btn => {
            btn.addEventListener('click', async () => {
                const facId = btn.dataset.id;
                const facName = btn.dataset.name;

                if (!confirm(`Bạn có chắc chắn muốn xóa cơ sở "${facName}"?\nLưu ý: Không thể xóa nếu đã có dữ liệu báo cáo hoặc tài khoản gắn với cơ sở này.`)) {
                    return;
                }

                try {
                    const res = await apiRequest(`/api/facilities/${facId}`, {
                        method: 'DELETE'
                    });
                    const data = await res.json();
                    if (res.ok) {
                        showToast(data.message || `Đã xóa cơ sở ${facName}`, 'success');
                        resetFacilityForm();
                        loadFacilitiesList();
                        await fetchMasterData();
                    } else {
                        showToast(data.error || 'Lỗi xóa cơ sở', 'error');
                    }
                } catch (err) {
                    showToast('Lỗi máy chủ: ' + err.message, 'error');
                }
            });
        });
    }

    if (createFacilityForm) {
        createFacilityForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = newFacilityName.value.trim();
            const desc = newFacilityDesc.value.trim();
            const id = editFacilityId ? editFacilityId.value : '';

            if (!name) {
                showToast('Vui lòng nhập tên cơ sở!', 'error');
                return;
            }

            try {
                let res;
                if (id) {
                    // Update existing facility
                    res = await apiRequest(`/api/facilities/${id}`, {
                        method: 'PUT',
                        body: { name, description: desc }
                    });
                } else {
                    // Create new facility
                    res = await apiRequest('/api/facilities', {
                        method: 'POST',
                        body: { name, description: desc }
                    });
                }

                const data = await res.json();
                if (res.ok) {
                    showToast(data.message || (id ? 'Đã cập nhật cơ sở thành công!' : 'Đã tạo cơ sở thành công!'), 'success');
                    resetFacilityForm();
                    loadFacilitiesList();
                    await fetchMasterData();
                    loadDashboardData();
                } else {
                    showToast(data.error || 'Lỗi xử lý cơ sở', 'error');
                }
            } catch (err) {
                showToast('Lỗi máy chủ: ' + err.message, 'error');
            }
        });
    }

    // Change Password Modal Handlers
    btnOpenChangePass.addEventListener('click', () => {
        changePasswordForm.reset();
        userDropdown.classList.remove('show');
        changePasswordModal.style.display = 'flex';
    });
    btnCloseChangePassModal.addEventListener('click', () => {
        changePasswordModal.style.display = 'none';
    });
    btnCancelChangePass.addEventListener('click', () => {
        changePasswordModal.style.display = 'none';
    });

    changePasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const currentPass = document.getElementById('currentPass').value;
        const newPass = document.getElementById('newPass').value;
        const confirmPass = document.getElementById('confirmPass').value;

        if (newPass !== confirmPass) {
            showToast('Xác nhận mật khẩu mới không khớp!', 'error');
            return;
        }

        try {
            const res = await apiRequest('/api/auth/change-password', {
                method: 'POST',
                body: { current_password: currentPass, new_password: newPass }
            });

            const data = await res.json();
            if (res.ok) {
                showToast(data.message || 'Đổi mật khẩu thành công!', 'success');
                changePasswordModal.style.display = 'none';
            } else {
                showToast(data.error || 'Lỗi đổi mật khẩu', 'error');
            }
        } catch (err) {
            showToast('Lỗi máy chủ: ' + err.message, 'error');
        }
    });

    // Tab Switching
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.dataset.tab;
            tabBtns.forEach(b => b.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(targetTab).classList.add('active');

            if (targetTab === 'dashboard-tab') {
                loadDashboardData();
            } else if (targetTab === 'data-tab') {
                loadReportsTable();
            } else if (targetTab === 'users-tab') {
                loadUsersTable();
            }
        });
    });

    btnFullscreen.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                showToast(`Không thể bật toàn màn hình: ${err.message}`, 'error');
            });
            btnFullscreen.innerHTML = '<i class="fa-solid fa-compress"></i> Thoát Toàn Màn Hình';
        } else {
            document.exitFullscreen();
            btnFullscreen.innerHTML = '<i class="fa-solid fa-expand"></i> Chế độ Giao Ban';
        }
    });

    function showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        const icon = type === 'success' ? 'fa-circle-check' : (type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-info');
        toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
        container.appendChild(toast);
        setTimeout(() => {
            toast.remove();
        }, 3500);
    }

    function slugify(text) {
        return text.toString().toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, '_')
            .replace(/[^\w\-]+/g, '');
    }

    function formatDateDisplay(dStr) {
        if (!dStr) return '';
        const parts = dStr.split('-');
        if (parts.length === 3) {
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        return dStr;
    }

    // Start App & Check Authentication
    checkAuth();
});
