/**
 * game.js
 * 负责游戏主循环、碰撞检测、游戏状态管理
 * 整合其他模块，启动游戏
 */

import { canvas, ctx, BASE_WIDTH, BASE_HEIGHT } from './canvasSetup.js';
import { position, velocity, maxSpeed, acceleration, friction, keysPressed, setCreatePlayerBullet, trailParticles, update } from './playerControl.js';
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
// 玩家受伤计数
let hitCount = 0;
// 光波效果
let waveRadius = 0;
let waveAlpha = 0;
let waveX = 0;
let waveY = 0;

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

// 克隆玩家模型
const clonePlayers = [];
let cloneAnimationPhase = 0; // 0:未开始, 1:飞入, 2:旋转
let cloneAnimationTimer = 0;
let cloneSpawnTimer = 0;
let clonesSpawned = 0;
const CLONE_ANIMATION_DURATION = 120; // 飞行动画帧数
const CLONE_COUNT = 6; // 克隆数量
const CLONE_ROTATION_SPEED = 0.02; // 旋转速度
const CLONE_ROTATION_RADIUS = 100; // 旋转半径
const CLONE_SPAWN_INTERVAL = 150; // 克隆体生成间隔(帧数)

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
    if (hitCount < 1) {
        ctx.beginPath();
        ctx.moveTo(-21 * sf, -7 * sf);
        ctx.lineTo(-2 * sf, 8 * sf);   // (x-2, y+70) 局部 ( -2*sf, (70-62)*sf=8*sf )
        ctx.lineTo(-2 * sf, 28 * sf);  // (x-2, y+90) 局部 ( -2*sf, (90-62)*sf=28*sf )
        ctx.lineTo(-25 * sf, 3 * sf);  // (x-25, y+65) 局部 (-25*sf, (65-62)*sf=3*sf)
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }

    // 侧面2
    if (hitCount < 2) {
        ctx.beginPath();
        ctx.moveTo(21 * sf, -7 * sf);
        ctx.lineTo(2 * sf, 8 * sf);
        ctx.lineTo(2 * sf, 28 * sf);
        ctx.lineTo(25 * sf, 3 * sf);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }

    // 底部面1: (x+20,y+85)->局部: (20*sf, (85-62)*sf=23*sf)，(x+30,y+85)->(30*sf,23*sf)，(x+30,y+95)->(30*sf,33*sf),(x+20,y+95)->(20*sf,33*sf)
    if (hitCount < 2) {
        ctx.beginPath();
        ctx.moveTo(20 * sf, 23 * sf);
        ctx.lineTo(30 * sf, 23 * sf);
        ctx.lineTo(30 * sf, 33 * sf);
        ctx.lineTo(20 * sf, 33 * sf);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }

    // 底部面2
    if (hitCount < 1) {
        ctx.beginPath();
        ctx.moveTo(-20 * sf, 23 * sf);
        ctx.lineTo(-30 * sf, 23 * sf);
        ctx.lineTo(-30 * sf, 33 * sf);
        ctx.lineTo(-20 * sf, 33 * sf);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }

    // 圆：局部 (0,0)，半径 11*sf
    ctx.strokeStyle = '#dfddcd';
    ctx.fillStyle = '#544f3c';
    ctx.beginPath();
    ctx.arc(0, 0, 11 * sf, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 绘制旋转中心标记（可选）
    // ctx.strokeStyle = 'red';
    // ctx.lineWidth = 1;
    // ctx.beginPath();
    // ctx.moveTo(-5, 0);
    // ctx.lineTo(5, 0);
    // ctx.moveTo(0, -5);
    // ctx.lineTo(0, 5);
    // ctx.stroke();

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
    // 根据受伤次数动态调整碰撞半径
    let playerRadius = 15;
    if (hitCount >= 1) playerRadius = 10;
    if (hitCount >= 2) playerRadius = 5;

    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        const enemyBullet = enemyBullets[i];
        const dx = playerX - enemyBullet.x;
        const dy = playerY - enemyBullet.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < playerRadius + enemyBullet.radius) {
            // 玩家被击中
            playerHealth--;
            hitCount++;
            enemyBullets.splice(i, 1);
            createSmallExplosion(enemyBullet.x, enemyBullet.y, particles, 20);
            
            // 初始化光波效果
            waveRadius = 0;
            waveAlpha = 1.0;
            waveX = playerX;
            waveY = playerY;

            // 清除玩家周围300像素内的所有子弹
            const CLEAR_RADIUS = 300;
            for (let j = enemyBullets.length - 1; j >= 0; j--) {
                const bullet = enemyBullets[j];
                const dx = playerX - bullet.x;
                const dy = playerY - bullet.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < CLEAR_RADIUS) {
                    createSmallExplosion(bullet.x, bullet.y, particles, 10);
                    enemyBullets.splice(j, 1);
                }
            }

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
        ctx.fillText('是否接受援助？', canvas.width / 2, canvas.height / 2 - 50);

        ctx.font = '30px Arial';

        // 否按钮
        ctx.fillStyle = gameOverChoice === 'yes' ? '#ff5555' : '#ff0000';
        ctx.fillRect(canvas.width / 2 - 150, canvas.height / 2 + 20, 120, 50);
        ctx.fillStyle = 'white';
        ctx.fillText('否', canvas.width / 2 - 90, canvas.height / 2 + 55);

        // 是按钮
        ctx.fillStyle = gameOverChoice === 'no' ? '#55ff55' : '#00ff00';
        ctx.fillRect(canvas.width / 2 + 30, canvas.height / 2 + 20, 120, 50);
        ctx.fillStyle = 'white';
        ctx.fillText('是', canvas.width / 2 + 90, canvas.height / 2 + 55);

        ctx.textAlign = 'left';

        // 监听canvas点击事件，处理游戏结束界面按钮点击
        canvas.onclick = function(e) {
            const rect = canvas.getBoundingClientRect();
            const mouseX = (e.clientX - rect.left) / rect.width * canvas.width;
            const mouseY = (e.clientY - rect.top) / rect.height * canvas.height;

            // 是按钮区域 - 现在执行重置游戏功能
            if (mouseX > canvas.width / 2 - 150 && mouseX < canvas.width / 2 - 30 &&
                mouseY > canvas.height / 2 + 20 && mouseY < canvas.height / 2 + 70) {
                // 重置游戏状态
                playerHealth = 3;
                gameOver = false;
                bullets.length = 0;
                enemyBullets.length = 0;
                enemies.length = 0;
                particles.length = 0;
                currentWave = 0;
                hitCount = 0;
                isSpawningWave = false;
                spawnWave();
                lastWaveTime = performance.now();

                // 移除点击事件监听，避免重复绑定
                canvas.onclick = null;
            }

            // 否按钮区域 - 添加召唤克隆玩家功能
            if (mouseX > canvas.width / 2 + 30 && mouseX < canvas.width / 2 + 150 &&
                mouseY > canvas.height / 2 + 20 && mouseY < canvas.height / 2 + 70) {
                // 创建6个克隆玩家
                createClonePlayers();
                // 重置游戏状态
                playerHealth = 3;
                gameOver = false;
                bullets.length = 0;
                enemyBullets.length = 0;
                enemies.length = 0;
                particles.length = 0;
                currentWave = 0;
                hitCount = 0;
                isSpawningWave = false;
                spawnWave();
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

    // 创建拖尾粒子(仅在移动时)
    const scaleFactor = 0.7; // 与drawShape一致
    const trailX = position.x * scaleFactor;
    const trailY = (position.y + 100) * scaleFactor;
    
    // 检查是否有移动(速度大于0.5)
    const isMoving = Math.abs(velocity.x) > 0.5 || Math.abs(velocity.y) > 0.5;
    
    // 每隔3帧添加一个新拖尾粒子
    if (isMoving && framesThisSecond % 10 === 0) {
        // 随机位置偏移(0-100px)
        const offsetX = (Math.random() * 50 - 70);
        const offsetY = (Math.random() * 50 - 70);
        
        // 计算反方向速度(基于当前速度)
        const speedX = -velocity.x * 0.2 + (Math.random() * 2 - 1);
        const speedY = -velocity.y * 0.2 + (Math.random() * 2 - 1);
        
        // 随机选择粒子样式(50%填充,50%线框)
        const style = Math.random() > 0.5 ? 'filled' : 'wireframe';
        
        trailParticles.push({
            x: trailX + offsetX,
            y: trailY + offsetY,
            size: 12, // 粒子大小
            color: '#dfddcd',
            life: 1.5, // 1.5秒生命周期
            alpha: 1.0,
            speedX: speedX,
            speedY: speedY,
            rotation: 0,
            rotationSpeed: (Math.random() * 0.2 - 0.1), // 随机旋转速度
            style: style // 粒子样式
        });
    }
    
    // 更新拖尾粒子位置和旋转
    for (const particle of trailParticles) {
        particle.x += particle.speedX;
        particle.y += particle.speedY;
        particle.rotation += particle.rotationSpeed;
        
        // 应用摩擦力
        particle.speedX *= 0.95;
        particle.speedY *= 0.95;
    }
    
    // 更新拖尾粒子生命周期
    for (let i = trailParticles.length - 1; i >= 0; i--) {
        const particle = trailParticles[i];
        particle.life -= 1/60; // 每帧减少1/60秒
        particle.alpha = particle.life / 2.0; // 根据生命周期计算透明度
        
        if (particle.life <= 0) {
            trailParticles.splice(i, 1); // 移除生命周期结束的粒子
        }
    }

    // 更新玩家控制逻辑(包括子弹发射)
    update();

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

    // 处理克隆玩家动画
    if (cloneAnimationPhase > 0) {
        cloneAnimationTimer++;
        
        // 更新所有克隆玩家的目标位置为玩家当前位置
        const playerCenterX = position.x * 0.7;
        const playerCenterY = (position.y + 62) * 0.7;
        
        // 飞行动画阶段
        if (cloneAnimationPhase === 1) {
            // 生成新的克隆体
            if (clonesSpawned < CLONE_COUNT) {
                cloneSpawnTimer++;
                if (cloneSpawnTimer >= CLONE_SPAWN_INTERVAL) {
                    createNextClone();
                    cloneSpawnTimer = 0;
                }
            }
            
            // 更新已生成的克隆体位置
            for (let i = 0; i < clonePlayers.length; i++) {
                const clone = clonePlayers[i];
                // 计算最终旋转位置
                const targetX = playerCenterX + Math.cos(clone.angle) * CLONE_ROTATION_RADIUS;
                const targetY = playerCenterY + Math.sin(clone.angle) * CLONE_ROTATION_RADIUS;
                
                // 平滑飞向目标位置
                clone.x = clone.x + (targetX - clone.x) * 0.1;
                clone.y = clone.y + (targetY - clone.y) * 0.1;
            }
            
            // 所有克隆体生成完成且飞行动画结束，进入旋转阶段
            if (clonesSpawned >= CLONE_COUNT && cloneAnimationTimer >= CLONE_ANIMATION_DURATION) {
                cloneAnimationPhase = 2;
                cloneAnimationTimer = 0;
            }
        }
        // 旋转动画阶段
        else if (cloneAnimationPhase === 2) {
            for (const clone of clonePlayers) {
                // 更新目标位置为玩家当前位置
                clone.targetX = playerCenterX;
                clone.targetY = playerCenterY;
                
                clone.rotationAngle += CLONE_ROTATION_SPEED;
                clone.x = clone.targetX + Math.cos(clone.rotationAngle + clone.angle) * CLONE_ROTATION_RADIUS;
                clone.y = clone.targetY + Math.sin(clone.rotationAngle + clone.angle) * CLONE_ROTATION_RADIUS;
            }
        }
        
        // 绘制克隆玩家
        for (const clone of clonePlayers) {
            drawShape((clone.x - playerCenterX) / 0.7 + position.x, 
                     (clone.y - playerCenterY) / 0.7 + position.y, 0.7);
        }
    }

    // 绘制光波效果
    if (waveAlpha > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(waveX, waveY, waveRadius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 255, 255, ${waveAlpha})`;
        ctx.lineWidth = 30;
        ctx.stroke();
        ctx.restore();

        // 更新光波效果
        waveRadius += 5;
        waveAlpha -= 0.02;
    }

    // 绘制拖尾立方体粒子
    ctx.save();
    for (const particle of trailParticles) {
        ctx.save();
        ctx.translate(particle.x, particle.y);
        ctx.rotate(particle.rotation);
        
        // 随机选择绘制样式
        if (particle.style === 'filled') {
            // 填充立方体
            ctx.fillStyle = `rgba(223, 221, 205, ${particle.alpha})`;
            ctx.fillRect(
                -particle.size/2,
                -particle.size/2,
                particle.size,
                particle.size
            );
            
            // 添加3D效果
            ctx.strokeStyle = `rgba(180, 178, 165, ${particle.alpha})`;
            ctx.lineWidth = 1;
            ctx.strokeRect(
                -particle.size/2,
                -particle.size/2,
                particle.size,
                particle.size
            );
            
            // 添加阴影面
            ctx.fillStyle = `rgba(180, 178, 165, ${particle.alpha * 0.7})`;
            ctx.beginPath();
            ctx.moveTo(particle.size/2, -particle.size/2);
            ctx.lineTo(particle.size/2 + 3, -particle.size/2 + 3);
            ctx.lineTo(particle.size/2 + 3, particle.size/2 + 3);
            ctx.lineTo(particle.size/2, particle.size/2);
            ctx.closePath();
            ctx.fill();
            
            ctx.beginPath();
            ctx.moveTo(-particle.size/2, particle.size/2);
            ctx.lineTo(-particle.size/2 + 3, particle.size/2 + 3);
            ctx.lineTo(particle.size/2 + 3, particle.size/2 + 3);
            ctx.lineTo(particle.size/2, particle.size/2);
            ctx.closePath();
            ctx.fill();
        } else {
            // 线框立方体
            ctx.strokeStyle = `rgba(223, 221, 205, ${particle.alpha})`;
            ctx.lineWidth = 1;
            ctx.strokeRect(
                -particle.size/2,
                -particle.size/2,
                particle.size,
                particle.size
            );
            
            // 添加3D线框
            ctx.beginPath();
            ctx.moveTo(particle.size/2, -particle.size/2);
            ctx.lineTo(particle.size/2 + 3, -particle.size/2 + 3);
            ctx.lineTo(particle.size/2 + 3, particle.size/2 + 3);
            ctx.lineTo(particle.size/2, particle.size/2);
            ctx.moveTo(-particle.size/2, particle.size/2);
            ctx.lineTo(-particle.size/2 + 3, particle.size/2 + 3);
            ctx.lineTo(particle.size/2 + 3, particle.size/2 + 3);
            ctx.stroke();
        }
        ctx.restore();
    }
    ctx.restore();

    // 更新并绘制玩家子弹
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        bullet.update();
        if (bullet.y + bullet.radius < 0) {
            bullets.splice(i, 1); // 移除画布外的子弹
        } else {
            bullet.draw();
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

    // 检查是否需要生成新批次敌人
    const now = performance.now();
    if (isWaveCleared() && now - lastWaveTime > 3000) {
        spawnWave();
    }

    // 更新并绘制敌人(最后绘制确保显示在子弹上方)
    for (let i = enemies.length - 1; i >= 0; i--) {
        enemies[i].update(position);
        enemies[i].draw();

        // 敌人有1%的几率每帧发射子弹
        if (Math.random() < 0.01 && enemies[i].state !== 'descending') {
            enemies[i].shoot(position);
        }
    }

    // 更新并绘制粒子(最后绘制确保显示在最上层)
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

// 绑定playerControl模块的createPlayerBullet函数，实现玩家和克隆玩家子弹创建
setCreatePlayerBullet((x, y, angle) => {
    bullets.push(new Bullet(x, y, angle));
    
    // 克隆玩家也一起攻击(平行攻击)
    if (cloneAnimationPhase > 0) {  // 只要动画开始(phase 1或2)就攻击
        for (const clone of clonePlayers) {
            // 使用与主玩家相同的攻击角度
            bullets.push(new Bullet(clone.x, clone.y, angle));
        }
    }
});

/**
 * 创建克隆玩家模型
 */
// 创建下一个克隆体
function createNextClone() {
    if (clonesSpawned >= CLONE_COUNT) return;
    
    const angle = (clonesSpawned / CLONE_COUNT) * Math.PI * 2;
    // 计算最终旋转位置
    const targetX = position.x * 0.7 + Math.cos(angle) * CLONE_ROTATION_RADIUS;
    const targetY = (position.y + 62) * 0.7 + Math.sin(angle) * CLONE_ROTATION_RADIUS;
    
    // 设置初始位置为屏幕边缘
    const edgeX = angle < Math.PI/4 || angle > 7*Math.PI/4 ? 0 : canvas.width;
    const edgeY = angle < 3*Math.PI/4 ? 0 : canvas.height;
    
    clonePlayers.push({
        x: edgeX,
        y: edgeY,
        targetX: targetX,
        targetY: targetY,
        angle: angle,
        rotationAngle: 0
    });
    
    clonesSpawned++;
}

function createClonePlayers() {
    clonePlayers.length = 0; // 清空现有克隆
    
    // 重置克隆体生成状态
    clonesSpawned = 0;
    cloneSpawnTimer = 0;
    cloneAnimationPhase = 1;
    cloneAnimationTimer = 0;
    
    // 创建第一个克隆体
    createNextClone();
    
    // 移除点击事件监听，避免重复绑定
    canvas.onclick = null;
}

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
