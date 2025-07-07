/**
 * enemy.js
 * 负责敌人类定义、敌人数组管理、敌人生成和更新逻辑
 * 使用ES6模块导出相关类和函数
 */

import { canvas, ctx } from './canvasSetup.js';
import { EnemyBullet } from './Bullet.js';

// 敌人数组
const enemies = [];
// 敌人子弹数组
const enemyBullets = [];

// 敌人类
class Enemy {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.spawnTime = performance.now(); // 记录生成时间

        // 随机生成3-10个"敌"字
        const length = Math.floor(Math.random() * 8) + 3;
        this.text = "敌".repeat(length);
        this.size = 30;
        this.baseSpeed = 1;
        this.currentSpeed = 0;
        this.maxSpeed = Math.random() > 0.5 ? 1 : 7; // 初始随机速度
        this.acceleration = 0.1;
        this.isElite = this.text.length >= 6; // 长度≥6为精英敌人
        this.color = this.isElite ? '#ffffff' : '#ffffff'; // 精英敌人红色
        this.direction = Math.PI / 2; // 初始向下
        this.directionChangeTimer = 0;
        this.shakeTimer = 0;
        this.shakeIntensity = 0;
        this.health = this.isElite ? this.text.length * 2 : 1; // 精英敌人生命=长度*2，普通敌人1滴血
        this.state = 'descending'; // 初始下降状态
        this.targetY = canvas.height * (0.3 + Math.random() * 0.2); // 目标y位置(30%-50%)
        this.speedSwitchTimer = Math.random() * 3000 + 2000; // 2-5秒切换
        
        // 初始化精英敌人持续攻击系统
        if (this.isElite) {
            this.initShooting();
        }
    }

    // 自动切换速度
    autoToggleSpeed() {
        this.speedSwitchTimer -= 16; // 约60fps
        if (this.speedSwitchTimer <= 0) {
            this.maxSpeed = this.maxSpeed === 1 ? 7 : 1;
            this.speedSwitchTimer = Math.random() * 3000 + 2000; // 重置2-5秒
        }
    }

    // 新增发射计时器，控制精英敌人持续发射
    initShooting() {
        this.shootTimer = 0;
        this.shootInterval = 700; // 200ms发射一次
    }

    updateShooting(delta, position) {
        if (!this.isElite) return;

        this.shootTimer += delta;
        if (this.shootTimer >= this.shootInterval) {
            this.shootTimer = 0; // 重置计时器，确保精确200ms间隔
            // 持续发射，固定攻击方式1
            this.shootDual(position, 1);
        }
    }

    // 新增双端同时发射子弹方法，支持指定攻击方式
    shootDual(position, attackType = 2) {
        // 计算文本宽度和单个字符宽度
        ctx.save();
        ctx.font = `${this.size}px Arial`;
        const fullWidth = ctx.measureText(this.text).width;
        const charWidth = ctx.measureText("敌").width;
        ctx.restore();

        // 计算第一个字和最后一个字的发射位置
        const leftX = this.x - fullWidth/2 + charWidth/2;
        const rightX = this.x + fullWidth/2 - charWidth/2;

        if (attackType === 1) {
            // 攻击方式1：360度分成6个方向均匀发射子弹，红橙交替
            for (let i = 0; i < 6; i++) {
                const angle = (i * Math.PI * 2) / 6;
                const type = i % 2 === 0 ? 'red' : 'orange';
                // 第一个字位置发射
                enemyBullets.push(new EnemyBullet(leftX, this.y, angle, type));
                // 最后一个字位置发射
                enemyBullets.push(new EnemyBullet(rightX, this.y, angle, type));
            }
        } else {
            // 攻击方式2：螺旋发射模式
            const spiralFactor = 0.2; // 螺旋紧密程度
            const timeOffset = performance.now() * 0.001; // 随时间变化的偏移
            
            for (let i = 0; i < 6; i++) {
                // 计算基础角度和螺旋偏移
                const baseAngle = (i * Math.PI * 2) / 6;
                const spiralOffset = (i + timeOffset) * spiralFactor;
                const angle = baseAngle + spiralOffset;
                
                const type = i % 2 === 0 ? 'red' : 'orange';
                // 第一个字位置发射
                const bullet1 = new EnemyBullet(leftX, this.y, angle, type);
                bullet1.speed = 3 + Math.sin(timeOffset) * 0.5; // 添加速度波动
                enemyBullets.push(bullet1);
                
                // 最后一个字位置发射
                const bullet2 = new EnemyBullet(rightX, this.y, angle, type);
                bullet2.speed = 3 + Math.cos(timeOffset) * 0.5; // 添加速度波动
                enemyBullets.push(bullet2);
            }
        }
    }

    update(position) {
        if (this.state === 'descending') {
            // 下降状态
            this.y += 5; // 固定下降速度

            // 检查是否到达目标位置
            if (this.y >= this.targetY) {
                this.state = 'random';
                this.direction = Math.random() * Math.PI * 2;
            }
        } else {
            // 随机移动状态
            this.autoToggleSpeed();

            // 计算远离玩家的方向
            const playerX = position.x * 0.7; // 玩家x位置(与drawShape一致)
            const playerY = (position.y + 62) * 0.7; // 玩家y位置
            const dx = this.x - playerX;
            const dy = this.y - playerY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            let avoidAngle = Math.atan2(dy, dx);

            // 随机改变方向(与远离方向混合)
            this.directionChangeTimer--;
            if (this.directionChangeTimer <= 0) {
                const randomAngle = Math.random() * Math.PI * 2;
                // 混合随机方向和远离方向(距离越近远离倾向越强)
                const mixFactor = Math.min(1, 200 / distance);
                this.direction = avoidAngle * mixFactor + randomAngle * (1 - mixFactor);
                this.directionChangeTimer = Math.random() * 60 + 30;
            }

            // 应用加速度
            if (this.currentSpeed < this.maxSpeed) {
                this.currentSpeed = Math.min(this.currentSpeed + this.acceleration, this.maxSpeed);
            } else if (this.currentSpeed > this.maxSpeed) {
                this.currentSpeed = Math.max(this.currentSpeed - this.acceleration, this.maxSpeed);
            }

            // 计算移动分量
            const moveX = Math.cos(this.direction) * this.currentSpeed;
            let moveY = Math.sin(this.direction) * this.currentSpeed;

            // 对向下移动应用自然衰减(从50%高度开始)
            if (moveY > 0 && this.y > canvas.height * 0.5) {
                // 使用平滑的指数衰减函数
                const decayFactor = Math.exp(-(this.y - canvas.height * 0.5) / 100);
                moveY *= decayFactor;
            }

            // 应用移动
            this.x += moveX;
            this.y += moveY;
        }

        // 基本边界检查
        if (this.x < this.size) this.x = this.size;
        if (this.x > canvas.width - this.size) this.x = canvas.width - this.size;
        if (this.y < this.size) this.y = this.size;
        if (this.y > canvas.height - this.size) this.y = canvas.height - this.size;

        // 更新抖动效果
        if (this.shakeTimer > 0) {
            this.shakeTimer--;
            this.shakeIntensity = this.shakeTimer / 10;
        }

        // 更新精英敌人持续攻击
        if (this.isElite && this.state !== 'descending') {
            this.updateShooting(16, position); // 假设60fps，delta≈16ms
        }
    }

    draw() {
        ctx.save();
        ctx.fillStyle = this.color;
        ctx.font = `${this.size}px Arial`;

        // 测量文本实际宽度
        const textWidth = ctx.measureText(this.text).width;

        // 应用抖动效果
        const offsetX = Math.random() * this.shakeIntensity * 5 - this.shakeIntensity;
        const offsetY = Math.random() * this.shakeIntensity * 5 - this.shakeIntensity;

        ctx.fillText(this.text, this.x - textWidth / 2 + offsetX, this.y + this.size / 2 + offsetY);
        ctx.restore();

        // 保存文本宽度用于碰撞检测
        this.textWidth = textWidth;
    }

    // 被击中时调用
    hit() {
        // 触发抖动效果
        this.shakeTimer = 15;
        this.shakeIntensity = 5;

        // 减少生命值
        this.health--;

        // 返回是否死亡
        return this.health <= 0;
    }

    // 获取敌人的边界框
    getBoundingBox() {
        // 生成后1秒内没有碰撞箱
        if (performance.now() - this.spawnTime < 1000) {
            return {
                left: 0,
                right: 0,
                top: 0,
                bottom: 0
            };
        }

        const width = this.textWidth;
        const height = this.size;
        return {
            left: this.x - width / 2,
            right: this.x + width / 2,
            top: this.y - height / 2,
            bottom: this.y + height / 2
        };
    }

    // 发射子弹
    shoot(position) {
        if (!this.isElite) {
            // 普通敌人保持原有单发橙色子弹攻击方式
            const playerX = position.x * 0.7;
            const playerY = (position.y + 62) * 0.7;
            const dx = playerX - this.x;
            const dy = playerY - this.y;
            const angle = Math.atan2(dy, dx);
            enemyBullets.push(new EnemyBullet(this.x, this.y, angle, 'orange'));
            return 'orange';
        }

        // 精英敌人新增两种攻击方式，随机选择一种
        const attackType = Math.random() < 0.5 ? 1 : 2;

        if (attackType === 1) {
            // 攻击方式1：360度分成6个方向均匀发射子弹，红橙交替
            for (let i = 0; i < 6; i++) {
                const angle = (i * Math.PI * 2) / 6;
                const type = i % 2 === 0 ? 'red' : 'orange';
                enemyBullets.push(new EnemyBullet(this.x, this.y, angle, type));
            }
        } else {
            // 攻击方式2：基于攻击方式1，增加旋转角度偏移
            const rotationOffset = Math.PI / 12; // 15度偏移
            for (let i = 0; i < 6; i++) {
                const angle = (i * Math.PI * 2) / 6 + rotationOffset;
                const type = i % 2 === 0 ? 'red' : 'orange';
                enemyBullets.push(new EnemyBullet(this.x, this.y, angle, type));
            }
        }

        return 'elite';
    }
}

// 敌人批次控制
let currentWave = 0;
let isSpawningWave = false;
const WAVE_COOLDOWN = 3000; // 批次间隔(ms)
let lastWaveTime = 0;

/**
 * 生成一批敌人
 */
function spawnWave() {
    isSpawningWave = true;
    currentWave++;
    const enemyCount = Math.floor(Math.random() * 5) + 4; // 4-8个敌人
    let eliteCount = 0;

    // 生成敌人
    for (let i = 0; i < enemyCount; i++) {
        // 从上方30%-70%位置生成，分散x坐标和y坐标
        const x = canvas.width * 0.3 + Math.random() * canvas.width * 0.4;
        const y = -30 - (i * 50) + (Math.random() * 40 - 20); // 垂直间隔±20随机偏移

        // 创建敌人
        const enemy = new Enemy(x, y);

        // 确保每批次最多2个精英敌人
        if (enemy.isElite && eliteCount >= 2) {
            // 如果已经有2个精英敌人，重新生成普通敌人
            enemy.text = "敌".repeat(Math.floor(Math.random() * 3) + 3); // 3-5个"敌"字
            enemy.isElite = false;
            enemy.color = '#ffffff';
            enemy.health = 1;
        } else if (enemy.isElite) {
            eliteCount++;
        }

        enemies.push(enemy);
    }

    isSpawningWave = false;
    lastWaveTime = performance.now();
}

/**
 * 检查是否可以生成下一批敌人
 */
function isWaveCleared() {
    if (isSpawningWave) return false;

    // 检查是否还有精英敌人
    const hasElite = enemies.some(enemy => enemy.isElite);

    // 条件1: 没有精英敌人且剩余敌人<=2
    // 条件2: 没有敌人(完全清除)
    return (!hasElite && enemies.length <= 2) || enemies.length === 0;
}

export {
    Enemy,
    enemies,
    enemyBullets,
    spawnWave,
    isWaveCleared
};
