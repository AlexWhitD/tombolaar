// Character 3D Simulation Controller
class CharacterStage {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.imgElement = this.container ? this.container.querySelector('img') : null;
    this.gender = options.gender || 'female'; // 'female' or 'male'
    this.frameIndex = 0;
    this.spinInterval = null;

    // 6-frame 360-degree rotation sequence using the 4 views + mirrored profiles
    this.frames = [
      { view: 'front', flip: false, angle: 0 },
      { view: 'three_quarters', flip: false, angle: 45 },
      { view: 'profile', flip: false, angle: 90 },
      { view: 'back', flip: false, angle: 180 },
      { view: 'profile', flip: true, angle: 270 },
      { view: 'three_quarters', flip: true, angle: 315 }
    ];

    this.initInteraction();
  }

  setGender(gender) {
    if (gender === 'male' || gender === 'female') {
      this.gender = gender;
      this.updateView();
    }
  }

  setAngle(viewName) {
    const idx = this.frames.findIndex(f => f.view === viewName && !f.flip);
    if (idx !== -1) {
      this.frameIndex = idx;
      this.updateView();
    }
  }

  updateView() {
    if (!this.imgElement) return;
    const current = this.frames[this.frameIndex];
    const path = `assets/characters/${this.gender}_${current.view}.png`;
    this.imgElement.src = path;
    this.imgElement.style.transform = current.flip ? 'scaleX(-1)' : 'scaleX(1)';
  }

  startSpin(speedMs = 90) {
    if (this.spinInterval) clearInterval(this.spinInterval);
    this.spinInterval = setInterval(() => {
      this.frameIndex = (this.frameIndex + 1) % this.frames.length;
      this.updateView();
    }, speedMs);
  }

  stopSpin(targetAngle = 'front') {
    if (this.spinInterval) {
      clearInterval(this.spinInterval);
      this.spinInterval = null;
    }
    this.setAngle(targetAngle);
  }

  celebrate() {
    if (!this.imgElement) return;
    this.imgElement.style.animation = 'none';
    void this.imgElement.offsetWidth; // trigger reflow
    this.imgElement.style.animation = 'winnerTada 1s ease-in-out';
  }

  initInteraction() {
    if (!this.container) return;

    let startX = 0;
    let isDragging = false;

    const onStart = (clientX) => {
      isDragging = true;
      startX = clientX;
    };

    const onMove = (clientX) => {
      if (!isDragging || this.spinInterval) return;
      const diff = clientX - startX;
      if (Math.abs(diff) > 30) {
        if (diff > 0) {
          this.frameIndex = (this.frameIndex + 1) % this.frames.length;
        } else {
          this.frameIndex = (this.frameIndex - 1 + this.frames.length) % this.frames.length;
        }
        this.updateView();
        startX = clientX;
      }
    };

    const onEnd = () => {
      isDragging = false;
    };

    this.container.addEventListener('mousedown', (e) => onStart(e.clientX));
    window.addEventListener('mousemove', (e) => onMove(e.clientX));
    window.addEventListener('mouseup', onEnd);

    this.container.addEventListener('touchstart', (e) => onStart(e.touches[0].clientX), { passive: true });
    window.addEventListener('touchmove', (e) => onMove(e.touches[0].clientX), { passive: true });
    window.addEventListener('touchend', onEnd);
  }
}

window.CharacterStage = CharacterStage;
