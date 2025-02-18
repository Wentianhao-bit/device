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
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// DOM元素
const recordForm = document.getElementById('recordForm');
const dateFilter = document.getElementById('dateFilter');
const recordsBody = document.getElementById('recordsBody');

// 提交新记录
recordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const newRecord = {
        deviceName: document.getElementById('deviceName').value,
        deviceType: document.getElementById('deviceType').value,
        operationType: document.getElementById('operationType').value,
        recordTime: document.getElementById('recordTime').value,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    };

    try {
        await database.ref('records').push(newRecord);
        recordForm.reset();
    } catch (error) {
        console.error('提交失败:', error);
        alert('记录提交失败，请重试！');
    }
});

// 实时加载记录
function loadRecords(dateFilter = '') {
    let ref = database.ref('records');
    
    if(dateFilter) {
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
                <td>${value.operator || '系统记录'}</td>
            `;

            recordsBody.appendChild(row);
        });
    });
}

// 日期筛选
dateFilter.addEventListener('change', (e) => {
    loadRecords(e.target.value);
});

// 初始化加载所有记录
loadRecords();
