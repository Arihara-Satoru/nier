/**
 * bullet.js
 * 负责玩家子弹和敌人子弹类定义
 * 使用ES6模块导出相关类
 */

import { ctx } from './canvasSetup.js';

/**
 * 玩家子弹类
 */
class Bullet {
    constructor(x, y, angle) {
        this.x = x;
        this.y = y;
        this.angle = angle;  // 子弹发射角度
        this.speed = 25;     // 子弹速度
        this.radius = 9;
    }

    update() {
        // 根据角度计算x/y方向速度分量
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
    }

    draw() {
        ctx.save();
        // 平移到子弹中心并旋转
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        // 创建一个线性渐变
        let gradient = ctx.createLinearGradient(-this.radius * 2.5, -this.radius, this.radius * 2.5, this.radius);
        gradient.addColorStop(0, '#fff'); // 开始颜色为白色
        gradient.addColorStop(1, '#e7dab7'); // 结束颜色为 #e7dab7

        // 设置填充样式为渐变
        ctx.fillStyle = gradient;

        // 光晕设置：在填充前启用 shadow
        ctx.shadowColor = 'rgba(176,144,96, 1)'; // 发光颜色，半透明
        ctx.shadowBlur = 60;    // 模糊半径，根据需求调大或调小
        ctx.shadowOffsetX = 0;  // 不需要偏移，光晕四周均匀
        ctx.shadowOffsetY = 0;

        // 绘制旋转后的长方形(相对于旋转中心)
        ctx.beginPath();
        ctx.rect(-this.radius * 2.5, -this.radius, this.radius * 5, this.radius * 2);
        ctx.fill();

        // 如果想让边缘也有发光，可以先描边
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.stroke();

        // 画完后关闭 shadow，以免影响后续绘制
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        ctx.restore();
    }
}

/**
 * 敌人子弹类
 */
class EnemyBullet {
    constructor(x, y, angle, type) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.speed = 4;  // 子弹速度
        this.radius = 23; // 子弹半径
        this.type = type; // 'red'或'orange'
    }

    update() {
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
    }

    draw() {
        ctx.save();
        ctx.fillStyle = this.type === 'red' ? '#ff0000' : '#ff9900';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

export { Bullet, EnemyBullet };
