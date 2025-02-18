// Firebase配置
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

// 初始化Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const database = firebase.database();

// DOM元素
const recordForm = document.getElementById('recordForm');
const dateFilter = document.getElementById('dateFilter');
const recordsBody = document.getElementById('recordsBody');
const deviceListBody = document.getElementById('deviceListBody');
const addDeviceBtn = document.getElementById('addDeviceBtn');
const newDeviceName = document.getElementById('newDeviceName');
const newDeviceQuantity = document.getElementById('newDeviceQuantity');

// 提交新记录
recordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const deviceName = document.getElementById('deviceName').value.trim();
    const deviceType = document.getElementById('deviceType').value.trim();
    const operationType = document.getElementById('operationType').value.trim();
    const recordTime = document.getElementById('recordTime').value.trim();
    const personName = document.getElementById('personName').value.trim();

    if (!deviceName || !deviceType || !operationType || !recordTime || !personName) {
        alert('请填写所有字段！');
        return;
    }

    const newRecord = {
        deviceName,
        deviceType,
        operationType,
        recordTime,
        personName,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    };

    try {
        await database.ref('records').push(newRecord);
        recordForm.reset();
        alert('记录提交成功！');
    } catch (error) {
        console.error('提交失败:', error);
        alert('记录提交失败，请重试！');
    }
});

// 添加设备
addDeviceBtn.addEventListener('click', async () => {
    const deviceName = newDeviceName.value.trim();
    const quantity = parseInt(newDeviceQuantity.value);

    if (!deviceName || isNaN(quantity) || quantity <= 0) {
        alert('请填写设备名称和有效数量！');
        return;
    }

    try {
        const snapshot = await database.ref('devices').orderByChild('name').equalTo(deviceName).once('value');
        const existingDevice = snapshot.val();

        if (existingDevice) {
            const key = Object.keys(existingDevice)[0];
            const newQuantity = existingDevice[key].quantity + quantity;
            await database.ref(`devices/${key}`).update({ quantity: newQuantity });
        } else {
            await database.ref('devices').push({ name: deviceName, quantity: quantity });
        }

        newDeviceName.value = '';
        newDeviceQuantity.value = '';
        alert('设备添加成功！');
    } catch (error) {
        console.error('添加设备失败:', error);
        alert('添加设备失败，请重试！');
    }
});

// 实时加载记录
function loadRecords(dateFilter = '') {
    let ref = database.ref('records');
    
    if (dateFilter) {
        const startDate = new Date(dateFilter);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 1);
        
        ref = ref.orderByChild('timestamp')
                .startAt(startDate.getTime())
                .endAt(endDate.getTime() - 1);
    }

    ref.on('value', (snapshot) => {
        recordsBody.innerHTML = '';
        const records = snapshot.val() || {};

        Object.entries(records).forEach(([key, value]) => {
            const recordDate = new Date(value.timestamp);
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>${recordDate.toLocaleString()}</td>
                <td>${value.deviceName}</td>
                <td>${value.deviceType}</td>
                <td class="${value.operationType === '入库' ? 'operation-in' : 'operation-out'}">
                    ${value.operationType}
                </td>
                <td>${value.personName}</td>
            `;

            recordsBody.appendChild(row);
        });
    });
}

// 实时加载设备列表
function loadDeviceList() {
    database.ref('devices').on('value', (snapshot) => {
        deviceListBody.innerHTML = '';
        const devices = snapshot.val() || {};

        Object.entries(devices).forEach(([key, value]) => {
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>${value.name}</td>
                <td>${value.quantity}</td>
                <td>
                    <button class="btn btn-sm btn-danger" onclick="deleteDevice('${key}')">删除</button>
                    <button class="btn btn-sm btn-warning" onclick="updateDevice('${key}', ${value.quantity - 1})">-1</button>
                    <button class="btn btn-sm btn-success" onclick="updateDevice('${key}', ${value.quantity + 1})">+1</button>
                </td>
            `;

            deviceListBody.appendChild(row);
        });
    });
}

// 删除设备
window.deleteDevice = async (key) => {
    if (confirm('确定删除该设备吗？')) {
        try {
            await database.ref(`devices/${key}`).remove();
            alert('设备删除成功！');
        } catch (error) {
            console.error('删除设备失败:', error);
            alert('删除设备失败，请重试！');
        }
    }
};

// 更新设备数量
window.updateDevice = async (key, newQuantity) => {
    if (newQuantity < 0) {
        alert('设备数量不能为负数！');
        return;
    }

    try {
        await database.ref(`devices/${key}`).update({ quantity: newQuantity });
        alert('设备数量更新成功！');
    } catch (error) {
        console.error('更新设备数量失败:', error);
        alert('更新设备数量失败，请重试！');
    }
};

// 日期筛选
dateFilter.addEventListener('change', (e) => {
    loadRecords(e.target.value);
});

// 初始化加载所有记录和设备列表
loadRecords();
loadDeviceList();
