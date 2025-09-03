// download.js
// 让所有下载按钮点击后下载本目录下的 a.apk

document.addEventListener('DOMContentLoaded', function () {
    // 选择所有下载按钮
    const downloadBtns = document.querySelectorAll('.download-btn');
    downloadBtns.forEach(function (btn) {
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            // 创建一个隐藏的 a 标签进行下载
            const a = document.createElement('a');
            // 使用绝对路径确保在任何情况下都能正确访问到文件
            a.href = '/static/a.apk';
            a.download = 'FenceCloudShopAPP.apk';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        });
    });
});
