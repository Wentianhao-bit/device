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
        await database.ref('records').push(recordData);
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
        outQuantity: 0, // 初始出库数量为0
        borrower: '' // 初始借用人为空
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

// 加载设备列表（含出库状态和借用人）
function loadDeviceList() {
    database.ref('devices').on('value', (snapshot) => {
        const deviceListBody = document.getElementById('deviceListBody');
        deviceListBody.innerHTML = '';
        const devices = snapshot.val() || {};

        Object.entries(devices).forEach(([key, value]) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${value.name}</td>
                <td>${value.type}</td>
                <td>${value.quantity}</td>
                <td>${value.outQuantity || 0}</td>
                <td>${value.borrower || '无'}</td>
                <td class="${value.outQuantity > 0 ? 'status-out' : 'status-in'}">
                    ${value.outQuantity > 0 ? '出库中' : '在库'}
                </td>
            `;
            deviceListBody.appendChild(row);
        });
    });
}

// 加载记录（含删除功能）
function loadRecords(dateFilter = '') {
    let ref = database.ref('records');
    
    if (dateFilter) {
        const startDate = new Date(dateFilter);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 1);
        ref = ref.orderByChild('timestamp').startAt(startDate.getTime()).endAt(endDate.getTime() - 1);
    }

    ref.on('value', (snapshot) => {
        const recordsBody = document.getElementById('recordsBody');
        recordsBody.innerHTML = '';
        const records = snapshot.val() || {};

        Object.entries(records).forEach(([key, value]) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${new Date(value.timestamp).toLocaleString()}</td>
                <td>${value.deviceName}</td>
                <td>${value.deviceType}</td>
                <td class="${value.operationType === '入库' ? 'operation-in' : 'operation-out'}">${value.operationType}</td>
                <td>${value.personName}</td>
                <td><span class="delete-btn" onclick="deleteRecord('${key}')">🗑️ 删除</span></td>
            `;
            recordsBody.appendChild(row);
        });
    });
}

// 删除记录（需密码验证）
window.deleteRecord = async (key) => {
    const password = prompt('请输入删除密码：');
    if (password !== '000000') {
        alert('密码错误！');
        return;
    }

    try {
        await database.ref(`records/${key}`).remove();
        alert('记录删除成功！');
    } catch (error) {
        console.error('删除失败:', error);
        alert('删除记录失败，请重试！');
    }
};

// 初始化加载
loadDevicesToSelect();
loadRecords();
loadDeviceList();
document.getElementById('dateFilter').addEventListener('change', (e) => loadRecords(e.target.value));
