/**
 * particle.js
 * 负责粒子类定义及爆炸效果函数
 * 使用ES6模块导出相关类和函数
 */

import { ctx } from './canvasSetup.js';

/**
 * 粒子类，用于爆炸效果
 */
class Particle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = Math.random() * 0.8 + 1;
        this.color = `rgba(255,255,255,${Math.random()})`;
        this.velocityX = Math.random() * 22 - 10;
        this.velocityY = Math.random() * 22 - 10;
        this.life = 100; // 添加生命周期
    }

    update() {
        this.x += this.velocityX;
        this.y += this.velocityY;
        this.color = `rgba(255,255,255,${this.life / 100})`; // 渐变透明度
        this.life -= 3;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.closePath();
    }
}

/**
 * 创建文字散开爆炸效果
 * @param {Object} enemy - 敌人对象，包含text、size、color、x、y属性
 * @param {Array} particles - 粒子数组，用于存储生成的粒子
 */
function createTextExplosion(enemy, particles) {
    const text = enemy.text;
    const size = enemy.size;
    const color = enemy.color;

    // 创建临时canvas测量文字
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.font = `${size}px Arial`;
    const textWidth = tempCtx.measureText(text).width;

    // 在文字范围内生成粒子(每个字符生成50个粒子)
    for (let i = 0; i < text.length * 50; i++) {
        // 在文字范围内随机位置
        const x = enemy.x - textWidth / 2 + Math.random() * textWidth;
        const y = enemy.y - size / 2 + Math.random() * size;

        const particle = new Particle(x, y);
        particle.color = color; // 使用敌人颜色
        particles.push(particle);
    }
}

/**
 * 创建小爆炸效果(命中时)
 * @param {number} x - 爆炸中心x坐标
 * @param {number} y - 爆炸中心y坐标
 * @param {Array} particles - 粒子数组，用于存储生成的粒子
 * @param {number} count - 粒子数量，默认10
 */
function createSmallExplosion(x, y, particles, count = 10) {
    for (let i = 0; i < count; i++) {
        particles.push(new Particle(x, y));
    }
}

export { Particle, createTextExplosion, createSmallExplosion };
