// Apodaca Riders - Realistic Rigid-Body Physics Tombola Engine
class TombolaEngine {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    
    // Canvas dimensions
    this.width = 900;
    this.height = 640;
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    this.cx = this.width / 2;
    this.cy = 285;
    this.radius = 245; // Golden Cage Radius

    this.drumAngle = 0;
    this.rotSpeed = 0;
    this.isSpinning = false;
    this.isZooming = false;

    this.balls = [];
    this.winningBall = null;
    this.zoomProgress = 0;
    this.onFinishCallback = null;

    // 5 internal curved scoops / lifter fins attached to the rotating drum
    this.numFins = 5;
    this.finLength = 54; // radial inward arm
    this.lipLength = 36; // curved scoop lip

    this.colors = [
      '#c924a1', '#f59e0b', '#06b6d4', '#10b981', '#ef4444', 
      '#8b5cf6', '#3b82f6', '#ec4899', '#f97316', '#14b8a6'
    ];

    this.lastClackTime = 0;

    this.setupBalls([]);
    this.loop();
  }

  setupBalls(participants = []) {
    this.balls = [];
    this.winningBall = null;
    this.isZooming = false;
    this.zoomProgress = 0;

    const count = participants.length;
    // Base radius of balls
    const r = count > 50 ? 19 : 22;

    for (let i = 0; i < count; i++) {
      const p = participants[i];
      const ballNum = p.number || (i + 1);

      // Start grouped naturally in lower section of the cage
      const angle = Math.PI * 0.25 + Math.random() * Math.PI * 0.5;
      const dist = Math.random() * (this.radius - r - 30);

      this.balls.push({
        x: this.cx + Math.cos(angle) * dist,
        y: this.cy + Math.sin(angle) * dist + 40,
        vx: (Math.random() - 0.5) * 1.0,
        vy: Math.random() * 1.5,
        radius: r,
        mass: 1,
        angle: Math.random() * Math.PI * 2,
        vAngle: (Math.random() - 0.5) * 0.1,
        color: this.colors[i % this.colors.length],
        number: ballNum,
        participant: p
      });
    }
  }

  spin(winner, onFinish) {
    if (this.isSpinning) return;
    this.isSpinning = true;
    this.isZooming = false;
    this.winningBall = null;
    this.zoomProgress = 0;
    this.onFinishCallback = onFinish;

    let winBall = this.balls.find(b => b.participant && b.participant.id === winner.id);
    if (!winBall) {
      winBall = {
        x: this.cx,
        y: this.cy,
        vx: 0,
        vy: 0,
        radius: 20,
        mass: 1,
        angle: 0,
        vAngle: 0,
        color: '#f59e0b',
        number: winner.number || 1,
        participant: winner
      };
      this.balls.push(winBall);
    }
    this.targetWinnerBall = winBall;

    const spinDuration = 5400;
    const startTime = performance.now();

    const runPhysics = (now) => {
      const elapsed = now - startTime;
      const p = Math.min(1, elapsed / spinDuration);

      if (p < 0.20) {
        // Smooth torque acceleration
        const ramp = p / 0.20;
        this.rotSpeed = 0.28 * Math.sin(ramp * Math.PI * 0.5);
      } else if (p < 0.65) {
        // Full speed vigorous churning with realistic micro-variations
        const churn = (p - 0.20) / 0.45;
        this.rotSpeed = 0.28 - 0.03 * Math.sin(churn * Math.PI * 6);
      } else {
        // Natural smooth flywheel deceleration
        const decelRatio = (p - 0.65) / 0.35;
        this.rotSpeed = 0.25 * Math.pow(1 - decelRatio, 2.7);
      }

      if (p < 1) {
        requestAnimationFrame(runPhysics);
      } else {
        this.rotSpeed = 0;
        this.startWinningZoomAnimation(this.targetWinnerBall);
      }
    };

    requestAnimationFrame(runPhysics);
  }

  startWinningZoomAnimation(ball) {
    this.isZooming = true;
    this.winningBall = {
      ...ball,
      startX: this.cx,
      startY: this.cy + this.radius + 15,
      targetX: this.cx,
      targetY: this.cy,
      startR: ball.radius,
      targetR: 175 // Giant 350px diameter zoom sphere
    };

    const zoomDuration = 2600;
    const startTime = performance.now();

    const zoomStep = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / zoomDuration);
      this.zoomProgress = this.easeOutBack(progress);

      if (progress < 1) {
        requestAnimationFrame(zoomStep);
      } else {
        this.isSpinning = false;
        if (this.onFinishCallback) {
          this.onFinishCallback();
        }
      }
    };

    requestAnimationFrame(zoomStep);
  }

  easeOutBack(x) {
    const c1 = 1.35;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
  }

  // ==========================================
  // REALISTIC RIGID BODY MULTI-SUBSTEP ENGINE
  // ==========================================
  updatePhysics() {
    this.drumAngle += this.rotSpeed;

    // 8 physics sub-steps per animation frame for ultra-stability, non-penetration & fluid cascades
    const SUBSTEPS = 8;
    const dt = 1 / SUBSTEPS;
    const gravity = 0.46 * dt;
    const airResistance = Math.pow(0.994, dt);
    const isStationary = Math.abs(this.rotSpeed) < 0.001;

    for (let step = 0; step < SUBSTEPS; step++) {
      // 1. Move balls, apply gravity, rotational drag & resting stabilization
      for (let i = 0; i < this.balls.length; i++) {
        const b = this.balls[i];

        b.vy += gravity;
        b.vx *= airResistance;
        b.vy *= airResistance;

        b.x += b.vx * dt;
        b.y += b.vy * dt;

        b.angle += b.vAngle * dt;
        b.vAngle *= 0.985;

        // Resting stabilization: eliminate micro-jitter when cage is at rest
        if (isStationary) {
          const speedSq = b.vx * b.vx + b.vy * b.vy;
          if (speedSq < 0.04) {
            b.vx *= 0.8;
            b.vy *= 0.8;
            b.vAngle *= 0.8;
            if (speedSq < 0.001) {
              b.vx = 0;
              b.vy = 0;
              b.vAngle = 0;
            }
          }
        }

        // 2. Cage Outer Boundary Collision & Dynamic Wall Friction
        const dx = b.x - this.cx;
        const dy = b.y - this.cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = this.radius - b.radius;

        if (dist > maxDist) {
          const nx = dx / (dist || 1);
          const ny = dy / (dist || 1);

          // Push back inside perimeter
          b.x = this.cx + nx * maxDist;
          b.y = this.cy + ny * maxDist;

          // Tangential cage speed at contact point: v = rotSpeed * R
          const cageVx = -ny * this.rotSpeed * this.radius;
          const cageVy = nx * this.rotSpeed * this.radius;

          const relVx = b.vx - cageVx;
          const relVy = b.vy - cageVy;
          const normalVel = relVx * nx + relVy * ny;

          if (normalVel > 0) {
            const speed = Math.abs(normalVel);
            const restitution = speed > 0.5 ? 0.68 : 0.05;
            b.vx -= (1 + restitution) * normalVel * nx;
            b.vy -= (1 + restitution) * normalVel * ny;

            // Wall friction imparts tangential velocity and rolling spin
            const tx = -ny;
            const ty = nx;
            const tangentVel = relVx * tx + relVy * ty;
            b.vx -= tangentVel * 0.35 * tx;
            b.vy -= tangentVel * 0.35 * ty;
            b.vAngle += (tangentVel / b.radius) * 0.45;

            // Trigger clack sound if collision is crisp
            if (speed > 2.0 && performance.now() - this.lastClackTime > 25) {
              this.lastClackTime = performance.now();
              if (window.soundEngine && window.soundEngine.playBallClack) {
                window.soundEngine.playBallClack(Math.min(1.0, speed / 7));
              }
            }
          }
        }

        // 3. Rotating Lifter Scoops (paletas curvas elevadoras)
        // Scoops balls from the bottom pile, carries them upward, and pours them out at the top
        for (let f = 0; f < this.numFins; f++) {
          const finAngle = this.drumAngle + (f * Math.PI * 2) / this.numFins;
          const rOuter = this.radius;
          const rInner = this.radius - this.finLength;

          const outerX = this.cx + Math.cos(finAngle) * rOuter;
          const outerY = this.cy + Math.sin(finAngle) * rOuter;
          const innerX = this.cx + Math.cos(finAngle) * rInner;
          const innerY = this.cy + Math.sin(finAngle) * rInner;

          // Lip angle forms an L-shaped cup angled in rotation direction
          const lipAngle = finAngle + Math.PI - 0.85;
          const lipX = innerX + Math.cos(lipAngle) * this.lipLength;
          const lipY = innerY + Math.sin(lipAngle) * this.lipLength;

          // Collide with both segments of the curved scoop
          this.collideWithSegment(b, outerX, outerY, innerX, innerY, this.rotSpeed);
          this.collideWithSegment(b, innerX, innerY, lipX, lipY, this.rotSpeed);
        }
      }

      // 4. Ball-to-Ball Elastic Collisions (Pairwise impulse & PBD position correction)
      for (let i = 0; i < this.balls.length; i++) {
        const b1 = this.balls[i];
        for (let j = i + 1; j < this.balls.length; j++) {
          const b2 = this.balls[j];

          const dx = b2.x - b1.x;
          const dy = b2.y - b1.y;
          const distSq = dx * dx + dy * dy;
          const minDist = b1.radius + b2.radius;

          if (distSq < minDist * minDist && distSq > 0.0001) {
            const dist = Math.sqrt(distSq);
            const nx = dx / dist;
            const ny = dy / dist;

            // Separate overlapping balls (PBD projection)
            const overlap = 0.5 * (minDist - dist);
            b1.x -= nx * overlap;
            b1.y -= ny * overlap;
            b2.x += nx * overlap;
            b2.y += ny * overlap;

            // Relative velocity
            const rvx = b2.vx - b1.vx;
            const rvy = b2.vy - b1.vy;
            const normalVel = rvx * nx + rvy * ny;

            // Only bounce if balls are moving towards each other
            if (normalVel < 0) {
              const speed = Math.abs(normalVel);
              // Dynamic restitution: elastic at high speed, dampens at low speed to prevent jitter
              const restitution = speed > 0.5 ? 0.72 : (speed / 0.5) * 0.72;
              const impulse = -(1 + restitution) * normalVel * 0.5;

              b1.vx -= impulse * nx;
              b1.vy -= impulse * ny;
              b2.vx += impulse * nx;
              b2.vy += impulse * ny;

              // Tangential friction imparts angular spin
              const tx = -ny;
              const ty = nx;
              const tangentVel = rvx * tx + rvy * ty;
              const frictionImpulse = tangentVel * 0.22;
              b1.vx += frictionImpulse * tx;
              b1.vy += frictionImpulse * ty;
              b2.vx -= frictionImpulse * tx;
              b2.vy -= frictionImpulse * ty;

              b1.vAngle -= (tangentVel / b1.radius) * 0.25;
              b2.vAngle += (tangentVel / b2.radius) * 0.25;

              // Crisp clack sound on hard impacts
              if (speed > 1.8 && performance.now() - this.lastClackTime > 20) {
                this.lastClackTime = performance.now();
                if (window.soundEngine && window.soundEngine.playBallClack) {
                  window.soundEngine.playBallClack(Math.min(1.0, speed / 7));
                }
              }
            }
          }
        }
      }
    }
  }

  // Exact collision and impulse response between a circular ball and a moving paddle line segment
  collideWithSegment(ball, x1, y1, x2, y2, paddleAngVel) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq < 0.0001) return;

    // Projection parameter t
    let t = ((ball.x - x1) * dx + (ball.y - y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));

    // Closest point on segment
    const cx = x1 + t * dx;
    const cy = y1 + t * dy;

    // Vector from closest point to ball center
    const distDx = ball.x - cx;
    const distDy = ball.y - cy;
    const distSq = distDx * distDx + distDy * distDy;
    const minDist = ball.radius + 1.5;

    if (distSq < minDist * minDist) {
      const dist = Math.sqrt(distSq) || 0.001;
      const nx = distDx / dist;
      const ny = distDy / dist;
      const overlap = minDist - dist;

      // Push ball out of segment
      ball.x += nx * overlap;
      ball.y += ny * overlap;

      // Linear velocity of paddle segment at point (cx, cy)
      const pVx = -paddleAngVel * (cy - this.cy);
      const pVy = paddleAngVel * (cx - this.cx);

      // Relative velocity
      const relVx = ball.vx - pVx;
      const relVy = ball.vy - pVy;
      const normalVel = relVx * nx + relVy * ny;

      if (normalVel < 0) {
        const restitution = 0.65;
        ball.vx -= (1 + restitution) * normalVel * nx;
        ball.vy -= (1 + restitution) * normalVel * ny;

        // Tangential friction with paddle
        const tx = -ny;
        const ty = nx;
        const tangentVel = relVx * tx + relVy * ty;
        ball.vx -= tangentVel * 0.35 * tx;
        ball.vy -= tangentVel * 0.35 * ty;
        ball.vAngle += (tangentVel / ball.radius) * 0.45;

        if (Math.abs(normalVel) > 2.0 && performance.now() - this.lastClackTime > 25) {
          this.lastClackTime = performance.now();
          if (window.soundEngine && window.soundEngine.playBallClack) {
            window.soundEngine.playBallClack(Math.min(1.0, Math.abs(normalVel) / 7));
          }
        }
      }
    }
  }

  render() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    // 1. Golden Base Support Structure
    this.ctx.save();
    this.ctx.strokeStyle = '#f59e0b';
    this.ctx.lineWidth = 7;
    this.ctx.shadowColor = 'rgba(245, 158, 11, 0.55)';
    this.ctx.shadowBlur = 18;

    // A-frame Legs
    this.ctx.beginPath();
    this.ctx.moveTo(this.cx - 230, this.height - 30);
    this.ctx.lineTo(this.cx - 100, this.cy + 80);
    this.ctx.lineTo(this.cx, this.cy);
    this.ctx.lineTo(this.cx + 100, this.cy + 80);
    this.ctx.lineTo(this.cx + 230, this.height - 30);
    this.ctx.stroke();

    // Base bar
    this.ctx.beginPath();
    this.ctx.moveTo(this.cx - 260, this.height - 30);
    this.ctx.lineTo(this.cx + 260, this.height - 30);
    this.ctx.stroke();

    // Crank handle
    this.ctx.beginPath();
    this.ctx.moveTo(this.cx + this.radius + 10, this.cy);
    this.ctx.lineTo(this.cx + this.radius + 65, this.cy);
    this.ctx.lineTo(this.cx + this.radius + 65, this.cy + Math.sin(this.drumAngle) * 65);
    this.ctx.stroke();

    this.ctx.fillStyle = '#fbbf24';
    this.ctx.beginPath();
    this.ctx.arc(this.cx + this.radius + 65, this.cy + Math.sin(this.drumAngle) * 65, 13, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.restore();

    // 2. Drum Cage (Back Spoke Grid & Mesh)
    this.ctx.save();
    this.ctx.translate(this.cx, this.cy);
    this.ctx.rotate(this.drumAngle);

    this.ctx.strokeStyle = 'rgba(245, 158, 11, 0.28)';
    this.ctx.lineWidth = 2.5;
    for (let i = 0; i < 18; i++) {
      const a = (i * Math.PI) / 9;
      this.ctx.beginPath();
      this.ctx.moveTo(0, 0);
      this.ctx.lineTo(Math.cos(a) * this.radius, Math.sin(a) * this.radius);
      this.ctx.stroke();
    }

    this.ctx.beginPath();
    this.ctx.arc(0, 0, this.radius * 0.45, 0, Math.PI * 2);
    this.ctx.arc(0, 0, this.radius * 0.75, 0, Math.PI * 2);
    this.ctx.stroke();

    // Draw the 5 rotating curved lifter scoops (paletas con cuchara)
    this.ctx.strokeStyle = '#fbbf24';
    this.ctx.lineWidth = 4.5;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.shadowColor = 'rgba(245, 158, 11, 0.6)';
    this.ctx.shadowBlur = 12;

    for (let f = 0; f < this.numFins; f++) {
      const a = (f * Math.PI * 2) / this.numFins;
      const rOuter = this.radius;
      const rInner = this.radius - this.finLength;

      const outerX = Math.cos(a) * rOuter;
      const outerY = Math.sin(a) * rOuter;
      const innerX = Math.cos(a) * rInner;
      const innerY = Math.sin(a) * rInner;

      const lipAngle = a + Math.PI - 0.85;
      const lipX = innerX + Math.cos(lipAngle) * this.lipLength;
      const lipY = innerY + Math.sin(lipAngle) * this.lipLength;

      this.ctx.beginPath();
      this.ctx.moveTo(outerX, outerY);
      this.ctx.lineTo(innerX, innerY);
      this.ctx.lineTo(lipX, lipY);
      this.ctx.stroke();

      // Golden bracket reinforcement at joint
      this.ctx.fillStyle = '#f59e0b';
      this.ctx.beginPath();
      this.ctx.arc(innerX, innerY, 4, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.ctx.restore();

    // 3. Render All Numbered Balls with Realistic 3D Shading & Rotations
    this.balls.forEach(ball => {
      this.drawBall(ball.x, ball.y, ball.radius, ball.color, ball.number, ball.angle);
    });

    // 4. Drum Outer Ring & Acrylic Highlight
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.arc(this.cx, this.cy, this.radius, 0, Math.PI * 2);
    this.ctx.strokeStyle = '#fbbf24';
    this.ctx.lineWidth = 7;
    this.ctx.shadowColor = 'rgba(245, 158, 11, 0.7)';
    this.ctx.shadowBlur = 30;
    this.ctx.stroke();

    // Glass sweep reflection
    const grad = this.ctx.createLinearGradient(
      this.cx - this.radius, this.cy - this.radius,
      this.cx + this.radius, this.cy + this.radius
    );
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.28)');
    grad.addColorStop(0.3, 'rgba(255, 255, 255, 0.05)');
    grad.addColorStop(0.7, 'rgba(201, 36, 161, 0.09)');
    grad.addColorStop(1, 'rgba(6, 182, 212, 0.20)');
    this.ctx.fillStyle = grad;
    this.ctx.fill();

    // Center Golden Axle
    this.ctx.beginPath();
    this.ctx.arc(this.cx, this.cy, 22, 0, Math.PI * 2);
    this.ctx.fillStyle = '#f59e0b';
    this.ctx.fill();
    this.ctx.strokeStyle = '#fff';
    this.ctx.lineWidth = 3.5;
    this.ctx.stroke();

    this.ctx.restore();

    // 5. Extraction Chute Cradle
    this.ctx.save();
    this.ctx.strokeStyle = '#f59e0b';
    this.ctx.lineWidth = 5;
    this.ctx.beginPath();
    this.ctx.arc(this.cx, this.height - 45, 38, 0, Math.PI);
    this.ctx.stroke();
    this.ctx.restore();

    // 6. CINEMATIC ZOOMING WINNING BALL ANIMATION
    if (this.isZooming && this.winningBall) {
      this.renderZoomingWinningBall();
    }
  }

  renderZoomingWinningBall() {
    const wb = this.winningBall;
    const p = Math.max(0, this.zoomProgress);

    this.ctx.save();
    this.ctx.fillStyle = `rgba(5, 6, 12, ${Math.min(0.90, p * 0.95)})`;
    this.ctx.fillRect(0, 0, this.width, this.height);

    const currX = wb.startX + (wb.targetX - wb.startX) * Math.min(1, p);
    const currY = wb.startY + (wb.targetY - wb.startY) * Math.min(1, p);
    const currR = wb.startR + (wb.targetR - wb.startR) * p;

    // Rotating golden sunlight victory rays
    this.ctx.save();
    this.ctx.translate(currX, currY);
    this.ctx.rotate(performance.now() * 0.0012);
    this.ctx.strokeStyle = 'rgba(245, 158, 11, 0.35)';
    this.ctx.lineWidth = 6;
    for (let i = 0; i < 20; i++) {
      const a = (i * Math.PI) / 10;
      this.ctx.beginPath();
      this.ctx.moveTo(0, 0);
      this.ctx.lineTo(Math.cos(a) * (currR + 110), Math.sin(a) * (currR + 110));
      this.ctx.stroke();
    }
    this.ctx.restore();

    // Giant 3D Lottery Ball with smooth slow orientation towards camera
    const displayAngle = wb.angle * (1 - p);
    this.drawBall(currX, currY, currR, wb.color, wb.number, displayAngle, true);

    // Glowing Victory Announcement below the ball
    if (p > 0.55) {
      const bannerOpacity = Math.min(1, (p - 0.55) / 0.45);
      this.ctx.save();
      this.ctx.globalAlpha = bannerOpacity;
      
      this.ctx.fillStyle = '#fbbf24';
      this.ctx.font = 'bold 30px "Chakra Petch", sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.shadowColor = 'rgba(245, 158, 11, 0.95)';
      this.ctx.shadowBlur = 20;
      this.ctx.fillText(`¡BOLA GANADORA #${wb.number}!`, currX, currY + currR + 45);

      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = 'bold 36px "Outfit", sans-serif';
      this.ctx.shadowBlur = 30;
      this.ctx.fillText(wb.participant ? wb.participant.name : '', currX, currY + currR + 90);

      this.ctx.restore();
    }

    this.ctx.restore();
  }

  drawBall(x, y, r, color, number, angle = 0, isGiant = false) {
    this.ctx.save();
    this.ctx.translate(x, y);

    // Subtle drop shadow under ball
    if (!isGiant) {
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.arc(0, r * 0.12, r, 0, Math.PI * 2);
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      this.ctx.fill();
      this.ctx.restore();
    }

    // Outer circle
    this.ctx.beginPath();
    this.ctx.arc(0, 0, r, 0, Math.PI * 2);

    // 3D Spherical Lighting with Fresnel Rim Reflection
    const grad = this.ctx.createRadialGradient(
      -r * 0.32, -r * 0.32, r * 0.06,
      0, 0, r
    );
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.20, color);
    grad.addColorStop(0.72, this.darkenHex(color, 0.45));
    grad.addColorStop(0.92, '#05070c');
    grad.addColorStop(1.0, 'rgba(255, 255, 255, 0.32)'); // Fresnel rim highlight
    this.ctx.fillStyle = grad;

    if (isGiant) {
      this.ctx.shadowColor = '#f59e0b';
      this.ctx.shadowBlur = 45;
    }

    this.ctx.fill();

    // Rotate ball content (number badge) with ball angular velocity
    this.ctx.rotate(angle);

    // Subtle equator seam line
    this.ctx.beginPath();
    this.ctx.arc(0, 0, r * 0.95, -0.4, 0.4);
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    this.ctx.lineWidth = 1;
    this.ctx.stroke();

    // Center circular badge for number
    this.ctx.beginPath();
    this.ctx.arc(0, 0, r * 0.48, 0, Math.PI * 2);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fill();
    this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.22)';
    this.ctx.lineWidth = 1.5;
    this.ctx.stroke();

    // Gloss shine on top half of white badge
    this.ctx.beginPath();
    this.ctx.ellipse(0, -r * 0.16, r * 0.32, r * 0.14, 0, 0, Math.PI * 2);
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    this.ctx.fill();

    // Number text
    this.ctx.fillStyle = '#0f172a';
    const fontSize = isGiant ? Math.floor(r * 0.52) : Math.floor(r * 0.54);
    this.ctx.font = `bold ${fontSize}px "Chakra Petch", sans-serif`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(number, 0, 1);

    this.ctx.restore();
  }

  darkenHex(hex, factor = 0.5) {
    if (!hex || !hex.startsWith('#') || hex.length < 7) return '#000000';
    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);
    r = Math.floor(r * (1 - factor));
    g = Math.floor(g * (1 - factor));
    b = Math.floor(b * (1 - factor));
    return `rgb(${r}, ${g}, ${b})`;
  }

  loop() {
    this.updatePhysics();
    this.render();
    requestAnimationFrame(() => this.loop());
  }
}

window.TombolaEngine = TombolaEngine;
