AFRAME.registerComponent('hailfall', {
  schema: {
    // etwas weniger, aber größere Partikel als beim Regen
    count:   {type: 'int',    default: 1400, min: 10},
    size:    {type: 'number', default: 0.18, min: 0.01},
    area:    {type: 'number', default: 4.0,  min: 0.5},
    height:  {type: 'number', default: 5.0,  min: 0.5},
    // Grundgeschwindigkeit der Hagelkörner (wird in tick() skaliert)
    speed:   {type: 'number', default: 2.2,  min: 0.1},
    windX:   {type: 'number', default: 0.10},
    windZ:   {type: 'number', default: 0.02},
    opacity: {type: 'number', default: 0.98}
  },

  init: function () {
    const THREE = AFRAME.THREE;
    const d = this.data;

    // Positionen + Geschwindigkeiten
    const pos = new Float32Array(d.count * 3);
    const vel = new Float32Array(d.count * 3);

    for (let i = 0; i < d.count; i++) {
      const ix = i * 3;

      // Startposition im Kasten über dem Beobachter
      pos[ix + 0] = (Math.random() * 2 - 1) * d.area; // x
      pos[ix + 1] = Math.random() * d.height;         // y
      pos[ix + 2] = (Math.random() * 2 - 1) * d.area; // z

      // Hagel fällt etwas schneller und weniger zufällig als Regen
      vel[ix + 0] = 0;
      vel[ix + 1] = -(2.0 + Math.random() * 1.2);
      vel[ix + 2] = 0;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));

    // Hagel-Textur: kompakte, leicht blaue Kugeln mit hartem Rand
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 64;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const cx = 32;
    const cy = 32;
    const innerR = 8;
    const outerR = 24;

    // Neuer Eis-Hagel-Verlauf: Mitte blau, Rand hart weiß
    const grd = ctx.createRadialGradient(
      cx, cy, innerR * 0.2,
      cx, cy, outerR
    );

    // 0: kräftiger blauer Eiskern
    grd.addColorStop(0.0, 'rgba(90, 150, 255, 1.0)');
    // Übergang zu hellem Eisblau
    grd.addColorStop(0.35, 'rgba(150, 200, 255, 1.0)');
    // fast weiß, noch leicht blau
    grd.addColorStop(0.7, 'rgba(230, 240, 255, 1.0)');
    // sehr harter, weißer Rand
    grd.addColorStop(0.85, 'rgba(255, 255, 255, 1.0)');
    // außen ausfaden, damit die Kante nicht „pixelt“
    grd.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');

    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(cx, cy, outerR, 0, Math.PI * 2, false);
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
      color: 0xffffff
    });

    const points = new THREE.Points(geo, mat);
    points.frustumCulled = false;

    this.points  = points;
    this._vel    = vel;
    this._area   = d.area;
    this._height = d.height;
    this._last   = performance.now();

    // eigener Object3D-Key, parallel zu rain/snow 
    this.el.setObject3D('hail', points);
    console.log('[hailfall] init: hail on', this.el);
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

    // Geometrie neu erzeugen wenn sich die Partikelanzahl ändert
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
        vel[ix + 1] = -(2.0 + Math.random() * 1.2);
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
      this.el.removeObject3D('hail');
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

    // Wind-Einfluss, etwas schwächer als beim Regen, Hagel wird weniger verweht
    for (let i = 0; i < vel.length; i += 3) {
      vel[i + 0] = d.windX * 0.6;
      vel[i + 2] = d.windZ * 0.6;
    }

    for (let i = 0; i < pos.length; i += 3) {
      pos[i + 0] += vel[i + 0] * dt;
      pos[i + 1] += (vel[i + 1] * d.speed) * dt;
      pos[i + 2] += vel[i + 2] * dt;

      // "Respawn" wenn Hagelkorn den Boden erreicht
      if (pos[i + 1] < 0.0) {
        pos[i + 1] = height;
        pos[i + 0] = (Math.random() * 2 - 1) * area;
        pos[i + 2] = (Math.random() * 2 - 1) * area;
      }

      // Wrap im XZ-Bereich, damit die Dichte konstant bleibt
      if (pos[i + 0] >  area) pos[i + 0] = -area;
      if (pos[i + 0] < -area) pos[i + 0] =  area;
      if (pos[i + 2] >  area) pos[i + 2] = -area;
      if (pos[i + 2] < -area) pos[i + 2] =  area;
    }

    this.points.geometry.attributes.position.needsUpdate = true;
  }
});
