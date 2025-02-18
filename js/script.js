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
        // 提交记录
        await database.ref('records').push(recordData);

        // 更新设备状态
        if (recordData.operationType === '出库') {
            const snapshot = await database.ref('devices').orderByChild('name').equalTo(recordData.deviceName).once('value');
            const device = snapshot.val();
            if (device) {
                const key = Object.keys(device)[0];
                const updatedDevice = {
                    ...device[key],
                    outQuantity: (device[key].outQuantity || 0) + 1,
                    borrower: recordData.personName
                };
                await database.ref(`devices/${key}`).update(updatedDevice);
            }
        } else if (recordData.operationType === '入库') {
            const snapshot = await database.ref('devices').orderByChild('name').equalTo(recordData.deviceName).once('value');
            const device = snapshot.val();
            if (device) {
                const key = Object.keys(device)[0];
                const updatedDevice = {
                    ...device[key],
                    outQuantity: Math.max((device[key].outQuantity || 0) - 1, 0),
                    borrower: device[key].outQuantity > 1 ? device[key].borrower : ''
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
            alert('设备已存在！
