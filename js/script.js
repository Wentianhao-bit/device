const firebaseConfig = {
            apiKey: "AIzaSyCcv6o4A2G69apsrPfqILsaFiWGeT4IICA",
            authDomain: "shebei-7124c.firebaseapp.com",
            databaseURL: "https://shebei-7124c-default-rtdb.firebaseio.com",
            projectId: "shebei-7124c",
            storageBucket: "shebei-7124c.firebasestorage.app",
            messagingSenderId: "145205020186",
            appId: "1:145205020186:web:5b3d1862f048f5d2d733a3",
            measurementId: "G-D25P9BY0T5"
        };

        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        const database = firebase.database();

        // DOM元素
        const recordForm = document.getElementById('recordForm');
        const deviceSelect = document.getElementById('deviceSelect');
        const deviceType = document.getElementById('deviceType');
        const addDeviceBtn = document.getElementById('addDeviceBtn');
        const prevPageBtn = document.getElementById('prevPageBtn');
        const nextPageBtn = document.getElementById('nextPageBtn');

        // 分页相关变量
        let currentPage = 1;
        const recordsPerPage = 16;

        // 动态加载设备到选择框
        function loadDevicesToSelect() {
            database.ref('devices').on('value', (snapshot) => {
                deviceSelect.innerHTML = '<option value="">选择设备</option>';
                const devices = snapshot.val() || {};

                Object.entries(devices).forEach(([key, value]) => {
                    const option = document.createElement('option');
                    option.value = value.name;
                    option.textContent = value.name;
                    deviceSelect.appendChild(option);
                });
            });
        }

        // 当选择设备时自动填充类型
        deviceSelect.addEventListener('change', async () => {
            const deviceName = deviceSelect.value;
            if (!deviceName) {
                deviceType.value = '';
                return;
            }

            const snapshot = await database.ref('devices').orderByChild('name').equalTo(deviceName).once('value');
            const device = snapshot.val();
            if (device) {
                const key = Object.keys(device)[0];
                deviceType.value = device[key].type;
            }
        });

        // 提交新记录
        recordForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const recordData = {
                deviceName: deviceSelect.value,
                deviceType: deviceType.value,
                operationType: document.getElementById('operationType').value,
                recordTime: document.getElementById('recordTime').value,
                personName: document.getElementById('personName').value,
                timestamp: firebase.database.ServerValue.TIMESTAMP
            };

            if (Object.values(recordData).some(v => !v)) {
                alert('请填写所有字段！');
                return;
            }

            try {
                // 提交记录
                await database.ref('records').push(recordData);

                // 更新设备状态
                const snapshot = await database.ref('devices').orderByChild('name').equalTo(recordData.deviceName).once('value');
                const device = snapshot.val();
                if (device) {
                    const key = Object.keys(device)[0];
                    const currentDevice = device[key];

                    if (recordData.operationType === '出库') {
                        // 出库：增加出库数量，添加借用人
                        const updatedDevice = {
                            ...currentDevice,
                            outQuantity: (currentDevice.outQuantity || 0) + 1,
                            borrowers: [...(currentDevice.borrowers || []), recordData.personName]
                        };
                        await database.ref(`devices/${key}`).update(updatedDevice);
                    } else if (recordData.operationType === '入库') {
                        // 入库：减少出库数量，移除当前借用人
                        const updatedDevice = {
                            ...currentDevice,
                            outQuantity: Math.max((currentDevice.outQuantity || 0) - 1, 0),
                            borrowers: (currentDevice.borrowers || []).filter(borrower => borrower !== recordData.personName)
                        };
                        await database.ref(`devices/${key}`).update(updatedDevice);
                    }
                }

                recordForm.reset();
                deviceType.value = '';
                alert('记录提交成功！');
            } catch (error) {
                console.error('提交失败:', error);
                alert('记录提交失败，请重试！');
            }
        });

        // 添加设备
        addDeviceBtn.addEventListener('click', async () => {
            const deviceData = {
                name: document.getElementById('newDeviceName').value.trim(),
                type: document.getElementById('newDeviceType').value,
                quantity: parseInt(document.getElementById('newDeviceQuantity').value) || 0,
                outQuantity: 0,
                borrowers: []
            };

            if (!deviceData.name || deviceData.quantity <= 0) {
                alert('请填写有效的设备信息！');
                return;
            }

            try {
                const snapshot = await database.ref('devices').orderByChild('name').equalTo(deviceData.name).once('value');
                if (snapshot.exists()) {
                    alert('设备已存在！');
                    return;
                }
                await database.ref('devices').push(deviceData);
                document.getElementById('newDeviceName').value = '';
                document.getElementById('newDeviceQuantity').value = '';
                alert('设备添加成功！');
            } catch (error) {
                console.error('添加失败:', error);
                alert('添加设备失败，请重试！');
            }
        });

        // 加载设备列表（按类型排序+显示所有借用人）
        function loadDeviceList() {
            database.ref('devices').on('value', (snapshot) => {
                const deviceListBody = document.getElementById('deviceListBody');
                deviceListBody.innerHTML = '';
                const devices = snapshot.val() || {};

                // 按类型排序（拍摄设备 → 灯光仪器 → 其他设备）
                const sortedDevices = Object.entries(devices).sort((a, b) => {
                    const typeOrder = { '拍摄设备': 1, '灯光仪器': 2, '其他设备': 3 };
                    return typeOrder[a[1].type] - typeOrder[b[1].type];
                });

                sortedDevices.forEach(([key, value]) => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                <td>${value.name}</td>
                <td>${value.type}</td>
                <td>
                    ${value.quantity}
                    <button class="btn btn-sm btn-success quantity-btn" 
                      onclick="handleQuantityUpdate('${key}', ${value.quantity + 1})">+</button>
                    <button class="btn btn-sm btn-warning quantity-btn" 
                      onclick="handleQuantityUpdate('${key}', ${value.quantity - 1})">-</button>
                </td>
                <td>${value.outQuantity || 0}</td>
                <td>${value.borrowers?.join(', ') || '无'}</td>
                <td class="${value.outQuantity > 0 ? 'status-out' : 'status-in'}">
                    ${value.outQuantity > 0 ? '出库中' : '在库'}
                </td>
                <td>
                    <button class="btn btn-sm btn-danger" 
                      onclick="handleDeviceDeletion('${key}')">删除</button>
                </td>
            `;
                    deviceListBody.appendChild(row);
                });
            });
        }

        // 统一处理设备数量更新（含密码验证）
        window.handleQuantityUpdate = async (key, newQuantity) => {
            const password = prompt('请输入操作密码：');
            if (password !== '000000') {
                alert('密码错误！操作已取消');
                return;
            }

            if (newQuantity < 0) {
                alert('设备数量不能为负数！');
                return;
            }

            try {
                await database.ref(`devices/${key}`).update({ quantity: newQuantity });
                alert('数量更新成功！');
            } catch (error) {
                console.error('更新失败:', error);
                alert('更新失败，请检查网络连接');
            }
        };

        // 统一处理设备删除（含密码验证）
        window.handleDeviceDeletion = async (key) => {
            const password = prompt('请输入操作密码：');
            if (password !== '000000') {
                alert('密码错误！操作已取消');
                return;
            }

            if (confirm('确定要永久删除该设备吗？')) {
                try {
                    await database.ref(`devices/${key}`).remove();
                    alert('设备已删除');
                } catch (error) {
                    console.error('删除失败:', error);
                    alert('删除失败，请重试');
                }
            }
        };

        // 加载记录（含分页功能）
        function loadRecords(dateFilter = '') {
            let ref = database.ref('records').orderByChild('timestamp');

            // 获取当前时间和一个月前的时间
            const now = new Date();
            const oneMonthAgo = new Date(now);
            oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

            // 默认查询最近一个月的记录
            ref = ref.startAt(oneMonthAgo.getTime());

            if (dateFilter) {
                const startDate = new Date(dateFilter);
                const endDate = new Date(startDate);
                endDate.setDate(endDate.getDate() + 1);
                ref = ref.startAt(startDate.getTime()).endAt(endDate.getTime() - 1);
            }

            ref.on('value', (snapshot) => {
                const recordsBody = document.getElementById('recordsBody');
                recordsBody.innerHTML = '';
                const allRecords = Object.entries(snapshot.val() || {});

                // 按时间倒序排序
                const sortedRecords = allRecords.sort((a, b) => b[1].timestamp - a[1].timestamp);

                // 分页处理
                const totalPages = Math.ceil(sortedRecords.length / recordsPerPage);
                const startIndex = (currentPage - 1) * recordsPerPage;
                const endIndex = startIndex + recordsPerPage;
                const pageRecords = sortedRecords.slice(startIndex, endIndex);

                // 渲染记录
                pageRecords.forEach(([key, record]) => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                <td>${new Date(record.timestamp).toLocaleString()}</td>
                <td>${record.deviceName}</td>
                <td>${record.deviceType}</td>
                <td class="${record.operationType === '入库' ? 'operation-in' : 'operation-out'}">
                    ${record.operationType}
                </td>
                <td>${record.personName}</td>
                <td>
                    <span class="delete-btn" onclick="handleRecordDeletion('${key}')">🗑️ 删除</span>
                </td>
            `;
                    recordsBody.appendChild(row);
                });

                // 更新分页按钮状态
                prevPageBtn.disabled = currentPage <= 1;
                nextPageBtn.disabled = currentPage >= totalPages;
            });
        }

        // 处理记录删除（含密码验证）
        window.handleRecordDeletion = async (key) => {
            const password = prompt('请输入操作密码：');
            if (password !== '000000') {
                alert('密码错误！操作已取消');
                return;
            }

            if (confirm('确定要删除这条记录吗？')) {
                try {
                    await database.ref(`records/${key}`).remove();
                    alert('记录已删除');
                } catch (error) {
                    console.error('删除失败:', error);
                    alert('删除失败，请重试');
                }
            }
        };

        // 分页控制
        prevPageBtn.addEventListener('click', () => {
            currentPage--;
            loadRecords(document.getElementById('dateFilter').value);
        });

        nextPageBtn.addEventListener('click', () => {
            currentPage++;
            loadRecords(document.getElementById('dateFilter').value);
        });

        // 初始化加载
        document.addEventListener('DOMContentLoaded', () => {
            loadDevicesToSelect();
            loadRecords();
            loadDeviceList();

            // 日期筛选监听
            document.getElementById('dateFilter').addEventListener('change', (e) => {
                currentPage = 1;
        loadRecords(e.target.value);
    });
});
