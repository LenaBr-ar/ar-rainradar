// ===== Helper-Funktionen (global) =====
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp  = (a, b, t)         => a + (b - a) * t;

/**
 * Iteriere über alle Materialien eines Meshes (einzeln oder Array)
 * und wende fn(material) darauf an.
 */
function forEachMaterial(mesh, fn) {
  if (!mesh.material) return;
  if (Array.isArray(mesh.material)) {
    mesh.material.forEach(m => m && fn(m));
  } else {
    fn(mesh.material);
  }
}

// Schnee (WebGL2-safe)
AFRAME.registerComponent('snowfall', {
  schema: {
    count:  {type: 'int',    default: 1800, min: 10},
    size:   {type: 'number', default: 0.12, min: 0.005},
    area:   {type: 'number', default: 6.0,  min: 0.5},
    height: {type: 'number', default: 6.0,  min: 0.5},
    speed:  {type: 'number', default: 0.9,  min: 0.05},
    windX:  {type: 'number', default: 0.10},
    windZ:  {type: 'number', default: 0.00},
    opacity:{type: 'number', default: 1.0}
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

      vel[ix + 0] = 0;
      vel[ix + 1] = -(0.4 + Math.random() * 0.8);     // nach unten
      vel[ix + 2] = 0;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));

    // runde, weiche Schneetextur
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const grd = ctx.createRadialGradient(32, 32, 0, 32, 32, 24);
    grd.addColorStop(0,   'rgba(255,255,255,1)');
    grd.addColorStop(0.4, 'rgba(255,255,255,0.9)');
    grd.addColorStop(1,   'rgba(255,255,255,0)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(32, 32, 24, 0, Math.PI * 2);
    ctx.fill();
    const tex = new THREE.CanvasTexture(canvas);

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

    this.el.setObject3D('snow', points);
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

    // Count geändert -> Geometrie neu erzeugen
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
        vel[ix + 1] = -(0.4 + Math.random() * 0.8);
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
      this.el.removeObject3D('snow');
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

    // Wind
    for (let i = 0; i < vel.length; i += 3) {
      vel[i + 0] = d.windX * 0.6;
      vel[i + 2] = d.windZ * 0.6;
    }

    // Bewegung + Respawn
    for (let i = 0; i < pos.length; i += 3) {
      pos[i + 0] += vel[i + 0] * dt;
      pos[i + 1] += (vel[i + 1] * d.speed) * dt;
      pos[i + 2] += vel[i + 2] * dt;

      if (pos[i + 1] < 0.0) {
        pos[i + 1] = height;
        pos[i + 0] = (Math.random() * 2 - 1) * area;
        pos[i + 2] = (Math.random() * 2 - 1) * area;
      }

      if (pos[i + 0] >  area) pos[i + 0] = -area;
      if (pos[i + 0] < -area) pos[i + 0] =  area;
      if (pos[i + 2] >  area) pos[i + 2] = -area;
      if (pos[i + 2] < -area) pos[i + 2] =  area;
    }

    this.points.geometry.attributes.position.needsUpdate = true;
  }
});
