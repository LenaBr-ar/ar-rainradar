// Regen (WebGL2-safe)
AFRAME.registerComponent('rainfall', {
  schema: {
    count:   {type: 'int',    default: 2200, min: 10},   // etwas mehr Partikel als Schnee
    size:    {type: 'number', default: 0.14, min: 0.01},
    area:    {type: 'number', default: 4.0,  min: 0.5},
    height:  {type: 'number', default: 5.0,  min: 0.5},
    speed:   {type: 'number', default: 1.8,  min: 0.1},  // schneller als Schnee
    windX:   {type: 'number', default: 0.20},
    windZ:   {type: 'number', default: 0.00},
    opacity: {type: 'number', default: 0.95}
  },

  init: function () {
    const THREE = AFRAME.THREE;
    const d = this.data;

    // Positionen + Geschwindigkeiten
    const pos = new Float32Array(d.count * 3);
    const vel = new Float32Array(d.count * 3); // vx, vy, vz

    for (let i = 0; i < d.count; i++) {
      const ix = i * 3;
      pos[ix + 0] = (Math.random() * 2 - 1) * d.area; // x
      pos[ix + 1] = Math.random() * d.height;         // y
      pos[ix + 2] = (Math.random() * 2 - 1) * d.area; // z

      // Regen fällt schneller als Schnee
      vel[ix + 0] = 0;
      vel[ix + 1] = -(1.5 + Math.random() * 1.0);     // nach unten, aber nicht zu schnell wegen sichtbarkeit
      vel[ix + 2] = 0;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));

    // canvas Cinematic Regentropfen-Textur: quadratisch, heller Kern, vertikal leicht gestreckt durch Gradient
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    // Hintergrund transparent
    ctx.clearRect(0, 0, canvas.width, canvas.height);

     // glänzt in der Mitte
    const grd = ctx.createLinearGradient(32, 8, 32, 56);
    grd.addColorStop(0.0, 'rgba(180, 220, 255, 0.0)');
    grd.addColorStop(0.2, 'rgba(190, 230, 255, 0.5)');
    grd.addColorStop(0.5, 'rgba(220, 245, 255, 0.95)'); // helles Zentrum
    grd.addColorStop(0.8, 'rgba(190, 230, 255, 0.5)');
    grd.addColorStop(1.0, 'rgba(180, 220, 255, 0.0)');

    ctx.fillStyle = grd;
    // schmaler „Strich“ in der Mitte (Tropfen)
    ctx.fillRect(26, 6, 12, 52);

    // leichter Glanz außenrum
    const glow = ctx.createRadialGradient(32, 32, 8, 32, 32, 22);
    glow.addColorStop(0.0, 'rgba(180, 220, 255, 0.3)');
    glow.addColorStop(1.0, 'rgba(180, 220, 255, 0.0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(32, 32, 22, 0, Math.PI * 2);
    ctx.fill();

    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 4;

    const mat = new THREE.PointsMaterial({
      map: tex,
      size: d.size,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      opacity: d.opacity,
      color: 0x7fb9ff,                // bläulich
      blending: THREE.AdditiveBlending // leichter Glanz-Effekt
    });

    const points = new THREE.Points(geo, mat);
    points.frustumCulled = false;

    this.points  = points;
    this._vel    = vel;
    this._area   = d.area;
    this._height = d.height;
    this._last   = performance.now();

    // anderer Key als 'snow', damit beide koexistieren können
    this.el.setObject3D('rain', points);
    console.log('[rainfall] init: rain on', this.el); // Debug
  },

  update: function (old) {
    if (!this.points) return;
    const d = this.data;
    const mat = this.points.material;

    // Material live anpassen
    if (!old || old.size !== d.size) {
      mat.size = d.size;
      mat.needsUpdate = true;
    }
    if (!old || old.opacity !== d.opacity) {
      mat.opacity = d.opacity;
      mat.needsUpdate = true;
    }

    this._area   = d.area;
    this._height = d.height;

    // Geometrie neu erzeugen
    if (!old || old.count !== d.count) {
      if (this.points.geometry) this.points.geometry.dispose();

      const pos = new Float32Array(d.count * 3);
      const vel = new Float32Array(d.count * 3);

      for (let i = 0; i < d.count; i++) {
        const ix = i * 3;
        pos[ix + 0] = (Math.random() * 2 - 1) * d.area;
        pos[ix + 1] = Math.random() * d.height;
        pos[ix + 2] = (Math.random() * 2 - 1) * d.area;

        vel[ix + 0] = 0;
        vel[ix + 1] = -(1.5 + Math.random() * 1.0);
        vel[ix + 2] = 0;
      }

      const geo = new AFRAME.THREE.BufferGeometry();
      geo.setAttribute('position', new AFRAME.THREE.BufferAttribute(pos, 3));
      this.points.geometry = geo;
      this._vel = vel;
      this.points.geometry.attributes.position.needsUpdate = true;
    }
  },

  remove: function () {
    if (this.points) {
      this.el.removeObject3D('rain');
      this.points.geometry.dispose();
      this.points.material.map.dispose();
      this.points.material.dispose();
    }
  },

  tick: function (time) {
    if (!this.points) return;

    const dt = (time - (this._last || time)) / 1000;
    this._last = time;

    const pos    = this.points.geometry.attributes.position.array;
    const vel    = this._vel;
    const area   = this._area;
    const height = this._height;
    const d      = this.data;

    // Wind – beim Regen stärker als beim Schnee
    for (let i = 0; i < vel.length; i += 3) {
      vel[i + 0] = d.windX;   // stärkerer horizontaler Drift als bei Schnee
      vel[i + 2] = d.windZ;
    }

    // Bewegung + Respawn
    for (let i = 0; i < pos.length; i += 3) {
      pos[i + 0] += vel[i + 0] * dt;
      pos[i + 1] += (vel[i + 1] * d.speed) * dt;
      pos[i + 2] += vel[i + 2] * dt;

      // Wenn Tropfen "am Boden" sind, wieder oben spawnen
      if (pos[i + 1] < 0.0) {
        pos[i + 1] = height;
        pos[i + 0] = (Math.random() * 2 - 1) * area;
        pos[i + 2] = (Math.random() * 2 - 1) * area;
      }

      // Wrap um das Areal herum
      if (pos[i + 0] >  area) pos[i + 0] = -area;
      if (pos[i + 0] < -area) pos[i + 0] =  area;
      if (pos[i + 2] >  area) pos[i + 2] = -area;
      if (pos[i + 2] < -area) pos[i + 2] =  area;
    }

    this.points.geometry.attributes.position.needsUpdate = true;
  }
});
