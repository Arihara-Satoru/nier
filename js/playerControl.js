/**
 * playerControl.js
 * 负责玩家位置、速度、输入监听和发射子弹逻辑
 * 使用ES6模块导出变量和函数
 */

import { canvas, ctx } from './canvasSetup.js';

// 定义初始位置和移动速度
const position = { x: 50, y: 50 };
const maxSpeed = 10; // 最大速度
const acceleration = 1; // 加速度
const friction = 0.5; // 摩擦力

// 记录鼠标位置
const mousePosition = { x: 0, y: 0 };

// 记录按键状态
const keysPressed = {};

// 当前速度
let velocity = { x: 0, y: 0 };

// 鼠标按下状态
let isMouseDown = false;
// 发射定时器
let shootTimer = null;
const SHOOT_INTERVAL = 120; // 发射间隔(ms)

/**
 * 监听键盘按下事件，更新keysPressed状态
 */
document.addEventListener('keydown', (event) => {
    keysPressed[event.key] = true;
});

/**
 * 监听键盘抬起事件，更新keysPressed状态
 */
document.addEventListener('keyup', (event) => {
    keysPressed[event.key] = false;
});

/**
 * 监听鼠标移动事件，更新鼠标位置
 */
canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    mousePosition.x = (event.clientX - rect.left) / rect.width * canvas.width;
    mousePosition.y = (event.clientY - rect.top) / rect.height * canvas.height;
});

/**
 * 监听鼠标按下事件，开始连续发射子弹
 */
canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) { // 左键
        isMouseDown = true;
        shootBullet(); // 立即发射第一颗子弹
        shootTimer = setInterval(shootBullet, SHOOT_INTERVAL);
    }
});

/**
 * 监听鼠标抬起事件，停止发射子弹
 */
canvas.addEventListener('mouseup', (e) => {
    if (e.button === 0) { // 左键
        isMouseDown = false;
        clearInterval(shootTimer);
    }
});

/**
 * 发射子弹函数，计算发射角度并调用外部子弹创建函数
 */
function shootBullet() {
    if (!isMouseDown) return;

    const scaleFactor = 0.7; // 与drawShape一致
    const emitX = position.x * scaleFactor;
    const emitY = (position.y + 62) * scaleFactor;

    const dx = mousePosition.x - emitX;
    const dy = mousePosition.y - emitY;
    const angle = Math.atan2(dy, dx);

    // 触发外部导入的createPlayerBullet函数
    if (typeof createPlayerBullet === 'function') {
        createPlayerBullet(emitX, emitY, angle);
    }
}

// 这里声明createPlayerBullet为外部导入函数，供主游戏逻辑实现
let createPlayerBullet = null;

/**
 * 设置createPlayerBullet函数的接口
 * @param {function} fn - 创建玩家子弹的函数
 */
function setCreatePlayerBullet(fn) {
    createPlayerBullet = fn;
}

export {
    position,
    velocity,
    maxSpeed,
    acceleration,
    friction,
    keysPressed,
    mousePosition,
    shootBullet,
    setCreatePlayerBullet
};
