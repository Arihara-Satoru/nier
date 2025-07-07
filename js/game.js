/**
 * game.js
 * 负责游戏主循环、碰撞检测、游戏状态管理
 * 整合其他模块，启动游戏
 */

import { canvas, ctx, BASE_WIDTH, BASE_HEIGHT } from './canvasSetup.js';
import { position, velocity, maxSpeed, acceleration, friction, keysPressed, setCreatePlayerBullet } from './playerControl.js';
import { Enemy, enemies, enemyBullets, spawnWave, isWaveCleared } from './Enemy.js';
import { Bullet } from './Bullet.js';
import { Particle, createTextExplosion, createSmallExplosion } from './Particle.js';

// 玩家子弹数组
const bullets = [];
// 粒子数组(用于爆炸效果)
const particles = [];

// 屏幕震动控制
let screenShake = {
    intensity: 0,
    duration: 0,
    maxDuration: 10
};

// 玩家生命值
let playerHealth = 3;

// 敌人批次控制
let currentWave = 0;
let isSpawningWave = false;
const WAVE_COOLDOWN = 3000; // 批次间隔(ms)
let lastWaveTime = 0;
// 玩家震动状态
let playerShake = {
    timer: 0,
    intensity: 0
};
// 游戏状态
let gameOver = false;
// 游戏结束界面状态
let gameOverChoice = null;

// 鼠标按下状态
let isMouseDown = false;
// 发射定时器
let shootTimer = null;
const SHOOT_INTERVAL = 120; // 发射间隔(ms)

// FPS 相关变量
let fps = 0;
let lastFrameTime = performance.now();
let framesThisSecond = 0;
let lastFpsUpdate = performance.now();

// 调试绘制碰撞框(按R键切换)
let debugCollision = false;
document.addEventListener('keydown', (e) => {
    if (e.key === 'r') debugCollision = !debugCollision;
});

// 角色绘制函数，原drawShape函数
function drawShape(x, y, scaleFactor) {
    const sf = scaleFactor || 0.5;
    // 应用角色震动效果
    let shakeX = 0;
    let shakeY = 0;
    if (playerShake.timer > 0) {
        shakeX = (Math.random() * 2 - 1) * playerShake.intensity;
        shakeY = (Math.random() * 2 - 1) * playerShake.intensity;
        playerShake.timer--;
    }
    // 旋转中心在画布上的绝对坐标：
    const cx = x * sf + shakeX;
    const cy = (y + 62) * sf + shakeY;
    // 计算鼠标相对于中心的角度
    const dx = mousePosition.x - cx;
    const dy = mousePosition.y - cy;
    const angle = Math.atan2(dy, dx);

    ctx.save();
    // 平移到旋转中心，再旋转（+90°若需要）
    ctx.translate(cx, cy);
    ctx.rotate(angle + Math.PI / 2);

    // 以下用局部坐标绘制各面，所有坐标都相对于 (cx, cy)
    // 例如原先顶点 (x, y) 在局部是 (0, -62*sf)，但因为已经平移到(cx,cy)并且在旋转后，
    // 直接用如下局部坐标绘制即可。

    // 设置样式
    ctx.fillStyle = '#dfddcd';
    ctx.strokeStyle = '#dfddcd';
    ctx.lineWidth = 1 * sf;

    // 第一面: 顶点局部坐标
    ctx.beginPath();
    ctx.moveTo(0, -62 * sf);
    ctx.lineTo(-20 * sf, -12 * sf);
    ctx.lineTo(0, 3 * sf);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 阴影
    ctx.shadowColor = 'rgba(164,159,138, 0.6)';
    ctx.shadowOffsetX = 3 * sf;
    ctx.shadowOffsetY = 3 * sf;
    ctx.shadowBlur = 3 * sf;

    // 第二面
    ctx.beginPath();
    ctx.moveTo(0, -62 * sf);
    ctx.lineTo(20 * sf, -12 * sf);
    ctx.lineTo(0, 3 * sf);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 侧面1: 顶点 (x-21, y+55)->局部: (-21*sf, (55-62)*sf = -7*sf) 等
    ctx.beginPath();
    ctx.moveTo(-21 * sf, -7 * sf);
    ctx.lineTo(-2 * sf, 8 * sf);   // (x-2, y+70) 局部 ( -2*sf, (70-62)*sf=8*sf )
    ctx.lineTo(-2 * sf, 28 * sf);  // (x-2, y+90) 局部 ( -2*sf, (90-62)*sf=28*sf )
    ctx.lineTo(-25 * sf, 3 * sf);  // (x-25, y+65) 局部 (-25*sf, (65-62)*sf=3*sf)
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 侧面2
    ctx.beginPath();
    ctx.moveTo(21 * sf, -7 * sf);
    ctx.lineTo(2 * sf, 8 * sf);
    ctx.lineTo(2 * sf, 28 * sf);
    ctx.lineTo(25 * sf, 3 * sf);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 底部面1: (x+20,y+85)->局部: (20*sf, (85-62)*sf=23*sf)，(x+30,y+85)->(30*sf,23*sf)，(x+30,y+95)->(30*sf,33*sf),(x+20,y+95)->(20*sf,33*sf)
    ctx.beginPath();
    ctx.moveTo(20 * sf, 23 * sf);
    ctx.lineTo(30 * sf, 23 * sf);
    ctx.lineTo(30 * sf, 33 * sf);
    ctx.lineTo(20 * sf, 33 * sf);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 底部面2
    ctx.beginPath();
    ctx.moveTo(-20 * sf, 23 * sf);
    ctx.lineTo(-30 * sf, 23 * sf);
    ctx.lineTo(-30 * sf, 33 * sf);
    ctx.lineTo(-20 * sf, 33 * sf);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 圆：局部 (0,0)，半径 11*sf
    ctx.strokeStyle = '#dfddcd';
    ctx.fillStyle = '#544f3c';
    ctx.beginPath();
    ctx.arc(0, 0, 11 * sf, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 绘制旋转中心标记（可选）
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-5, 0);
    ctx.lineTo(5, 0);
    ctx.moveTo(0, -5);
    ctx.lineTo(0, 5);
    ctx.stroke();

    // 清除阴影设置
    ctx.shadowColor = 'transparent';
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.shadowBlur = 0;

    ctx.restore();
}

// 监听鼠标位置，导入自playerControl模块
import { mousePosition } from './playerControl.js';

/**
 * 碰撞检测函数
 */
function checkCollisions() {
    // 检测玩家子弹与敌人碰撞
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];

        // 检测玩家子弹与敌人碰撞
        for (let j = enemies.length - 1; j >= 0; j--) {
            const enemy = enemies[j];
            const enemyBox = enemy.getBoundingBox();

            if (bullet.x + bullet.radius > enemyBox.left &&
                bullet.x - bullet.radius < enemyBox.right &&
                bullet.y + bullet.radius > enemyBox.top &&
                bullet.y - bullet.radius < enemyBox.bottom) {

                let collisionX = bullet.x;
                let collisionY = bullet.y;
                collisionX = Math.max(enemyBox.left, Math.min(enemyBox.right, collisionX));
                collisionY = Math.max(enemyBox.top, Math.min(enemyBox.bottom, collisionY));

                const isDead = enemy.hit();

                if (isDead) {
                    createTextExplosion(enemy, particles);
                    enemies.splice(j, 1);
                } else {
                    createSmallExplosion(collisionX, collisionY, particles);
                }

                bullets.splice(i, 1);
                break;
            }
        }

        // 检测玩家子弹与橙色敌人子弹碰撞
        for (let k = enemyBullets.length - 1; k >= 0; k--) {
            const enemyBullet = enemyBullets[k];
            if (enemyBullet.type === 'orange') {
                const dx = bullet.x - enemyBullet.x;
                const dy = bullet.y - enemyBullet.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < bullet.radius + enemyBullet.radius) {
                    // 创建碰撞爆炸效果
                    createSmallExplosion(
                        (bullet.x + enemyBullet.x) / 2,
                        (bullet.y + enemyBullet.y) / 2,
                        particles,
                        15
                    );
                    bullets.splice(i, 1);
                    enemyBullets.splice(k, 1);
                    break;
                }
            }
        }
    }

    // 检测玩家与敌人子弹碰撞
    const playerX = position.x * 0.7;
    const playerY = (position.y + 62) * 0.7;
    const playerRadius = 20; // 玩家碰撞半径

    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        const enemyBullet = enemyBullets[i];
        const dx = playerX - enemyBullet.x;
        const dy = playerY - enemyBullet.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < playerRadius + enemyBullet.radius) {
            // 玩家被击中
            playerHealth--;
            enemyBullets.splice(i, 1);
            createSmallExplosion(enemyBullet.x, enemyBullet.y, particles, 20);

            // 创建玩家被击中效果
            createSmallExplosion(enemyBullet.x, enemyBullet.y, particles, 30);

            // 触发屏幕震动和角色震动
            canvas.classList.add('shake');
            setTimeout(() => {
                canvas.classList.remove('shake');
            }, 500);
            playerShake.timer = 30; // 30帧震动
            playerShake.intensity = 5; // 震动强度

            // 检查游戏是否结束
            if (playerHealth <= 0) {
                gameOver = true;
            }
            break;
        }
    }
}

/**
 * 调试绘制碰撞框
 */
function drawDebugCollision() {
    if (!debugCollision) return;

    ctx.save();
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)';
    ctx.lineWidth = 2;

    // 绘制敌人碰撞框
    for (const enemy of enemies) {
        const box = enemy.getBoundingBox();
        ctx.strokeRect(box.left, box.top, box.right - box.left, box.bottom - box.top);
    }

    // 绘制子弹碰撞框
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
    for (const bullet of bullets) {
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
        ctx.stroke();
    }

    ctx.restore();
}

/**
 * 游戏主绘制循环
 */
function draw(timestamp) {
    if (!lastFrameTime) lastFrameTime = timestamp;
    const delta = timestamp - lastFrameTime;

    // 限制帧率为60fps，使用累积时间
    if (delta < 1000 / 65) {
        requestAnimationFrame(draw);
        return;
    }
    lastFrameTime = timestamp;

    ctx.clearRect(0, 0, canvas.width, canvas.height);


    // 游戏结束状态只绘制结束界面
    if (gameOver) {

        // 绘制游戏结束界面
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = 'white';
        ctx.font = '60px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('游戏结束', canvas.width / 2, canvas.height / 2 - 50);

        ctx.font = '30px Arial';

        // 是按钮
        ctx.fillStyle = gameOverChoice === 'yes' ? '#ff5555' : '#ff0000';
        ctx.fillRect(canvas.width / 2 - 150, canvas.height / 2 + 20, 120, 50);
        ctx.fillStyle = 'white';
        ctx.fillText('是', canvas.width / 2 - 90, canvas.height / 2 + 55);

        // 否按钮
        ctx.fillStyle = gameOverChoice === 'no' ? '#55ff55' : '#00ff00';
        ctx.fillRect(canvas.width / 2 + 30, canvas.height / 2 + 20, 120, 50);
        ctx.fillStyle = 'white';
        ctx.fillText('否', canvas.width / 2 + 90, canvas.height / 2 + 55);

        ctx.textAlign = 'left';

        // 监听canvas点击事件，处理游戏结束界面按钮点击
        canvas.onclick = function(e) {
            const rect = canvas.getBoundingClientRect();
            const mouseX = (e.clientX - rect.left) / rect.width * canvas.width;
            const mouseY = (e.clientY - rect.top) / rect.height * canvas.height;

            // 是按钮区域
            if (mouseX > canvas.width / 2 - 150 && mouseX < canvas.width / 2 - 30 &&
                mouseY > canvas.height / 2 + 20 && mouseY < canvas.height / 2 + 70) {
                // 停止游戏，保持游戏结束状态
                // 可以根据需求添加额外逻辑
            }

            // 否按钮区域
            if (mouseX > canvas.width / 2 + 30 && mouseX < canvas.width / 2 + 150 &&
                mouseY > canvas.height / 2 + 20 && mouseY < canvas.height / 2 + 70) {
                // 重置游戏状态
                playerHealth = 3;
                gameOver = false;
                bullets.length = 0;
                enemyBullets.length = 0;
                enemies.length = 0;
                particles.length = 0;
                currentWave = 0;
                lastWaveTime = performance.now();

                // 移除点击事件监听，避免重复绑定
                canvas.onclick = null;
            }
        };

        requestAnimationFrame(draw);
        return;
    }

    // 正常游戏状态

    // 计算加速度方向
    let ax = 0;
    let ay = 0;
    if (keysPressed['w']) ay -= acceleration;
    if (keysPressed['s']) ay += acceleration;
    if (keysPressed['a']) ax -= acceleration;
    if (keysPressed['d']) ax += acceleration;

    // 更新速度
    velocity.x += ax;
    velocity.y += ay;

    // 应用摩擦力减速
    if (ax === 0) {
        if (velocity.x > 0) {
            velocity.x = Math.max(0, velocity.x - friction);
        } else if (velocity.x < 0) {
            velocity.x = Math.min(0, velocity.x + friction);
        }
    }
    if (ay === 0) {
        if (velocity.y > 0) {
            velocity.y = Math.max(0, velocity.y - friction);
        } else if (velocity.y < 0) {
            velocity.y = Math.min(0, velocity.y + friction);
        }
    }

    // 限制最大速度
    velocity.x = Math.min(maxSpeed, Math.max(-maxSpeed, velocity.x));
    velocity.y = Math.min(maxSpeed, Math.max(-maxSpeed, velocity.y));

    // 更新位置
    position.x += velocity.x;
    position.y += velocity.y;

    // 限制玩家在屏幕范围内移动(使用基准分辨率)
    const playerWidth = 50; // 玩家角色宽度估计值
    const playerHeight = 100; // 玩家角色高度估计值
    position.x = Math.max(0, Math.min(BASE_WIDTH * 1.4, position.x));
    position.y = Math.max(0, Math.min(BASE_HEIGHT * 1.4 - playerHeight, position.y));

    ctx.clearRect(0, 0, canvas.width, canvas.height); // 清除画布

    // 设置颜色和线条宽度
    ctx.fillStyle = '#dfddcd'; // 填充颜色
    ctx.strokeStyle = '#dfddcd'; // 边框颜色
    ctx.lineWidth = 1; // 线条宽度

    // 根据当前位置绘制四面体的一个面
    drawShape(position.x, position.y, 0.7);

    // 更新并绘制子弹
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        bullet.update();
        if (bullet.y + bullet.radius < 0) {
            bullets.splice(i, 1); // 移除画布外的子弹
        } else {
            bullet.draw();
        }
    }

    // 检查是否需要生成新批次敌人
    const now = performance.now();
    if (isWaveCleared() && now - lastWaveTime > 3000) {
        spawnWave();
    }

    // 更新并绘制敌人
    for (let i = enemies.length - 1; i >= 0; i--) {
        enemies[i].update(position);
        enemies[i].draw();

        // 敌人有1%的几率每帧发射子弹
        if (Math.random() < 0.01 && enemies[i].state !== 'descending') {
            enemies[i].shoot(position);
        }
    }

    // 更新并绘制敌人子弹
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        enemyBullets[i].update();
        enemyBullets[i].draw();

        // 移除屏幕外的子弹
        if (enemyBullets[i].y > canvas.height + enemyBullets[i].radius) {
            enemyBullets.splice(i, 1);
        }
    }

    // 更新并绘制粒子
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        particles[i].draw();
        if (particles[i].life <= 0) {
            particles.splice(i, 1);
        }
    }

    // 检测碰撞
    checkCollisions();

    // 调试绘制碰撞框
    drawDebugCollision();

    // 计算FPS
    framesThisSecond++;
    if (timestamp - lastFpsUpdate > 1000) {
        fps = framesThisSecond;
        framesThisSecond = 0;
        lastFpsUpdate = timestamp;
    }

    // 绘制FPS显示
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.fillText(`FPS: ${fps}`, 10, 30);

    // 绘制生命值显示
    ctx.fillStyle = 'white';
    ctx.font = '24px Arial';
    ctx.fillText(`生命: ${playerHealth}`, 10, 60);

    requestAnimationFrame(draw);
}

// 绑定playerControl模块的createPlayerBullet函数，实现玩家子弹创建
setCreatePlayerBullet((x, y, angle) => {
    bullets.push(new Bullet(x, y, angle));
});

// 启动游戏主循环
requestAnimationFrame(draw);

export {
    draw,
    checkCollisions,
    bullets,
    particles,
    playerHealth,
    gameOver
};
