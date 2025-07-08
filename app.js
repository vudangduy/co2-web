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
      statusElement.textContent = `✅ Đã gửi yêu cầu cập nhật "${deviceId}".`;
      statusElement.style.color = "green";
    }
  }
  catch (error){
    statusElement.textContent = `❌ Xuất hiện lỗi: ${error.message}`;
    statusElement.style.color = "red";
  }
  finally {
    btn.disabled = false;
    btn.textContent = "Cập nhật";
  }
}

//Hàm tải file lên S3
async function uploadFirmware() {
  const fileInput = document.getElementById("firmwareUploadInput");
  const statusUpload = document.getElementById("uploadStatus")
  //Check người dùng đã nhập file chưa
  if (!fileInput.files || fileInput.files.length === 0) {
    statusUpload.textContent = "❌ Lỗi: Vui lòng chọn file trước";
    statusUpload.style.color = "red";
    return;
  }
  //Néu đã nhập file
  const file = fileInput.files[0];
  const filename = file.name;

  try {
    statusUpload.textContent = "⏳ Đang tạo URL tải lên...";
    statusUpload.style.color = "green";
    //1-Gửi yêu cầu qua API lấy link Upload
    const response = await fetch("https://eododavux4.execute-api.us-east-1.amazonaws.com/UpFirmToS3Function",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ filename })
      }
    );

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error || `Lỗi: ${response.status}`);
    }

    const uploadUrl = data.uploadUrl;

    statusUpload.textContent = "⬆️ Hoàn tất tạo URL ,đang tải file lên S3...";
    statusUpload.style.color = "blue";

    //2-Gửi put tới S3 bằng presigned url
    const putRes = await fetch(uploadUrl,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/octet-stream"
        },
        body: file
      }
    );

    if(!putRes.ok){
      statusUpload.textContent = "❌ Lỗi: Tải lên thất bại!";
      statusUpload.style.color = "red";
    } else {
      statusUpload.textContent = `✅ Tải lên thành công: ${filename}`;
      statusUpload.style.color = "green";
    }
  }
  catch (err) {
    console.error(err);
    statusUpload.textContent = `❌ Lỗi: ${err.message}`;
    statusUpload.style.color = "red";
  }
}


//Tự động cập nhật các file trên S3
const firmwareSelect = document.getElementById("firmwareSelect");

const GetS3Files_API = "https://irxytmyomi.execute-api.us-east-1.amazonaws.com/GetS3FilesFunction";

async function loadFirmwareOptions() {
  try {
    const response = await fetch(GetS3Files_API);
    const files = await response.json();

    //xoá các option cũ
    firmwareSelect.innerHTML = "";

    files.forEach(files => {
      // Kiểm tra các key có .bin là firmware có thể update
      if (files.Key.endsWith(".bin")) {
        const option = document.createElement("option");
        // Đặt giá trị cho option bằng tên file
        option.value = files.Key;
        // Đặt text hiển thị (bỏ .bin đi, bỏ v đi và thêm "Phiên bản")
        versionName = files.Key.replace(/\.bin$/i, "");
        versionName = versionName.replace(/v?/i, "");
        option.textContent = `Phiên bản ${versionName}`;
        firmwareSelect.appendChild(option);
      }
    });
  }
  catch (err) {
    console.error("Lỗi khi tải danh sách firmware:", err);
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Không thể tải danh sách firmware";
    firmwareSelect.appendChild(option);
  }
}

document.addEventListener("DOMContentLoaded", loadFirmwareOptions);