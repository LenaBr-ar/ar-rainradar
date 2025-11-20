// cloud.js

AFRAME.registerComponent('rain-cloud', {
  schema: {
    intensity:    {type: 'number', default: 0.7, min: 0, max: 1},
    tint:         {type: 'color',  default: '#f07dd4'},
    tintStrength: {type: 'number', default: 0.85, min: 0, max: 1},
    opacity:      {type: 'number', default: 0.9},
    model:        {type: 'selector'}, // <a-asset-item>
    windX:        {type: 'number', default: 0.10},
    windZ:        {type: 'number', default: 0.00}
  },

  init: function () {
    const el = this.el;
    this.meshes = [];

    // Wolken-Entity als Kind
    this.cloud = document.createElement('a-entity');

    if (this.data.model) {
      this.cloud.setAttribute('gltf-model', '#' + this.data.model.id);
    }

    // Position der Wolke
    this.cloud.setAttribute('position', '0 3 0');
    //this.cloud.setAttribute(
      //'animation',
      //'property: position; dir: alternate; dur: 3000; loop: true; to: 0 2.2 0'
    //);
    //this.cloud.setAttribute('scale', '0.9 0.7 0.9');'-3 -1.25 -15'

    el.appendChild(this.cloud);

    this.cloud.addEventListener('model-loaded', () => {
      const obj = this.cloud.getObject3D('mesh');
      if (!obj) return;

      this.meshes.length = 0;

      obj.traverse(n => {
        if (!n.isMesh || !n.material) return;

        forEachMaterial(n, matIn => {
          const mat = matIn.clone();
          mat.transparent = true;
          mat.alphaTest   = 0.05;
          mat.depthWrite  = false;
          mat.side        = AFRAME.THREE.DoubleSide;
          mat.opacity     = this.data.opacity;

          if (Array.isArray(n.material)) {
            n.material = n.material.map(() => mat.clone());
          } else {
            n.material = mat;
          }
          n.material.needsUpdate = true;
        });

        this.meshes.push(n);
      });

      // Schnee-Entity als Kind der Wolke
      this.snow = document.createElement('a-entity');
      this.cloud.appendChild(this.snow);

      // unter die Wolke verschoben
      this.snow.setAttribute('position', '3 -6 3');

      this._applySnowFromIntensity();

      this.cloud.object3D.renderOrder = 1;
      if (this.snow.object3D) this.snow.object3D.renderOrder = 2;

      this.applyTint();
      this.applyOpacity();
    });
  },

  update: function (old) {
    if (!old) return;

    if (old.intensity !== this.data.intensity ||
        old.windX     !== this.data.windX ||
        old.windZ     !== this.data.windZ) {
      this._applySnowFromIntensity();
    }

    if (old.tint !== this.data.tint ||
        old.tintStrength !== this.data.tintStrength) {
      this.applyTint();
    }

    if (old.opacity !== this.data.opacity) {
      this.applyOpacity();
    }
  },

  _applySnowFromIntensity: function () {
    if (!this.snow) return;
    const t = clamp(this.data.intensity, 0, 1);

    const count = Math.round(lerp(900, 2400, t) / 100) * 100;
    const size  = lerp(0.08, 0.14, t);
    const speed = lerp(0.7, 1.1, t);

    const area   = 10.0;
    const height = 6.0;

    this.snow.setAttribute('snowfall', {
      count,
      size,
      speed,
      area,
      height,
      windX:   this.data.windX,
      windZ:   this.data.windZ,
      opacity: 1.0
    });
  },

  applyTint: function () {
    const s = clamp(this.data.tintStrength, 0, 1);
    const base    = new AFRAME.THREE.Color(1, 1, 1);
    const tintCol = new AFRAME.THREE.Color(this.data.tint);
    const blended = base.lerp(tintCol, s);

    for (const m of this.meshes) {
      forEachMaterial(m, mat => {
        mat.color.copy(blended);
        if (!mat.emissive) {
          mat.emissive = new AFRAME.THREE.Color(0, 0, 0);
        }
        const emis = new AFRAME.THREE.Color(blended.r, blended.g, blended.b)
          .multiplyScalar(0.12 * s);
        mat.emissive.copy(emis);
        mat.needsUpdate = true;
      });
    }
  },

  applyOpacity: function () {
    const t = clamp(this.data.intensity, 0, 1);
    const finalOpacity = lerp(0.7, 0.95, t) * this.data.opacity;

    for (const m of this.meshes) {
      forEachMaterial(m, mat => {
        mat.opacity = finalOpacity;
        mat.needsUpdate = true;
      });
    }
  }
});
