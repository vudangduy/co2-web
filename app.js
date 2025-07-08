//hàm hiển thị biểu đồ CO2 theo device_id
async function showChart() {
  const deviceId = document.getElementById('deviceIdInput').value.trim();
  const startDate = document.getElementById('StartDateInput').value;
  const endDate = document.getElementById('EndDateInput').value;
  
  if (!deviceId || !startDate || !endDate) {
    alert("Vui lòng nhập đầy đủ tên thiết bị và khoảng thời gian.");
    return;
  }

  const startDateObj = new Date(startDate);
  const endDateObj = new Date(endDate);

  if (startDateObj > endDateObj) {
    alert("❌ Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc.");
    return;
  }

  const btn = document.getElementById('btnShowChart');
  btn.disabled = true;
  btn.textContent = "⏳ Đang tải...";


  const apiUrl = `https://ldtj96f6t3.execute-api.us-east-1.amazonaws.com/get-co2-data?device_id=${deviceId}&start_date=${startDate}&end_date=${endDate}`;

  try {
    //call API
    const response = await fetch(apiUrl);
    if(!response.ok){
      const errorText = await response.text();
      console.error("API Error:", response.status, errorText);
      alert("Lỗi khi gọi API!\nChi tiết: " + errorText);
      return;
    }
    //nếu gọi thành công, lấy data dưới dạng json
    const data = await response.json();
    if(data.length == 0){
      alert("Không có dữ liệu cho thiết bị này.");
      return;
    }

    //Tách dữ liệu
    const timestamps = data.map(item => item.timestamp);
    const concentrations = data.map(item => item.CO2concentration);
    //gọi hàm vẽ biểu đồ dựa trên dữ liệu đã tách
    drawChart(timestamps,concentrations);
  }
  catch (error) {
    console.error("Lỗi khi hiển thị biểu đồ:", error);
    alert("Đã xảy ra lỗi khi tải dữ liệu.");
  }

  finally {
    btn.disabled = false;
    btn.textContent = "Hiển thị biểu đồ";
  }
}

let chartInstance = null;

//hàm vẽ biểu đồ
function drawChart(labels,values){
  const ctx = document.getElementById('CO2Chart').getContext('2d');
  //xoá bảng cũ
  if(chartInstance){
    chartInstance.destroy();
  }
  //vẽ bảng mới
  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Nồng độ CO2 (ppm)',
        data: values,
        borderColor: 'green',
        borderWidth: 1,
        backgroundColor: 'rgba(0,128,0,0.1)',
        tension: 0.4,
        fill: true,
        pointRadius: 0,
        pointHoverRadius: 4
      }]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'Biểu đồ nồng độ CO2 theo thời gian'
        }
      },
      scales: {
        x: {
          title: {
            display: true,
            text: 'Thời điểm đo'
          }
        },
        y: {
          title: {
            display: true,
            text: 'Nồng độ khí CO2 (ppm)'
          },
          min: 0,
          max:5000,
        }
      }
    }
  });
}

//Hàm cập nhật giá trị biểu đồ tự động
let  autoUpdateInterval = null;

document.getElementById('autoUpdateCheckbox').addEventListener('change', function() {
  if(this.checked) {
    //nếu tích vào ô, gọi lại API sau 60 giây
    autoUpdateInterval = setInterval(showChart,60000);
  } else {
    //nếu không tích vào ô, không làm gì cả
    clearInterval(autoUpdateInterval);
    autoUpdateInterval = null;
  }
});

//Hàm cập nhật firmware
async function updateFirmware(){
  const deviceId = document.getElementById("deviceIdInputForUpdate").value.trim();
  const firmwareKey = document.getElementById("firmwareSelect").value;
  const statusElement = document.getElementById("updateStatus");

  if(!deviceId){
    statusElement.textContent = "❌ Lỗi: Vui lòng nhập tên thiết bị";
    statusElement.style.color = "red";
    return;
  }

  statusElement.textContent = "⏳ Đang gửi yêu cầu cập nhật...";
  statusElement.style.color = "black";

  const btn = document.getElementById('btnUpdateFirmware');
  btn.disabled = true;
  btn.textContent = "⏳ Đang gửi yêu cầu...";

  apiUrl = `https://urofxjcb68.execute-api.us-east-1.amazonaws.com/ota?key=${firmwareKey}&device_id=${deviceId}`;

  try{
    const response = await fetch(apiUrl);
    const data = await response.json();

    if(response.ok){
      statusElement.textContent = `✅ Đã gửi URL cập nhật tới thiết bị "${deviceId}".`;
      statusElement.style.color = "green";
    }
  }
  catch (error){
    statusElement.textContent = `❌ Lỗi: ${error.message},vui lòng thử lại sau!`;
    statusElement.style.color = "red";
  }
  finally {
    btn.disabled = false;
    btn.textContent = "Cập nhật";
  }
}