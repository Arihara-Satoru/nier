/**
 * canvasSetup.js
 * 负责初始化canvas元素，设置缩放和样式
 * 导出canvas和ctx供其他模块使用
 */

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// 基准分辨率
const BASE_WIDTH = 1920;
const BASE_HEIGHT = 1080;

/**
 * 设置canvas缩放，使其填满视口并保持基准分辨率
 */
function setupCanvasScaling() {
    // 使canvas元素填满整个视口
    canvas.style.width = '100%';
    canvas.style.height = '100%';

    // 设置canvas实际尺寸为基准分辨率
    canvas.width = BASE_WIDTH;
    canvas.height = BASE_HEIGHT;

    // 不需要额外的缩放变换
    canvas.style.transform = 'none';
    canvas.style.transformOrigin = 'top left';
    canvas.style.margin = '0';

    // 添加resize事件监听器以保持布局
    window.addEventListener('resize', function() {
        // 保持canvas元素填满视口
        canvas.style.width = '100%';
        canvas.style.height = '100%';
    });
}

setupCanvasScaling();

export { canvas, ctx, BASE_WIDTH, BASE_HEIGHT };
