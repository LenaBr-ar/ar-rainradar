// Globale Konfiguration für alle Niederschlagsarten
const PRECIP_CONFIG = {
  dry: {
    countMin: 0,
    countMax: 0,
    sizeMin: 0,
    sizeMax: 0,
    speedMin: 0,
    speedMax: 0,
    color: '#eeeeee' // helle neutrale Wolke
  },
  rain: {
    countMin: 1000,
    countMax: 4000,
    sizeMin:  0.05,
    sizeMax:  0.20,
    speedMin: 1.8,
    speedMax: 3.5,
    color:    '#BCFCFD'  // blau
  },
  snow: {
    countMin: 900,
    countMax: 4000,
    sizeMin:  0.08,
    sizeMax:  0.25,
    speedMin: 0.7,
    speedMax: 1.1,
    color:    '#f07dd4'  // rosa
  },
  hail: {
    countMin: 600,
    countMax: 2500,
    sizeMin:  0.12,
    sizeMax:  0.28,
    speedMin: 1.4,
    speedMax: 2.4,
    color:    '#f50505'  // rot
  }
};

function getPrecipConfig(kind) {
  return PRECIP_CONFIG[kind] || PRECIP_CONFIG.dry;
}

// Helper, um aus einem weather-condition-Objekt das cloud-Wetter abzuleiten
// Erwartete Struktur von condition:
// { type: 'rain'|'snow'|'hail'|'dry', intensity: 0..4 }
function conditionToCloudWeather(condition) {
  if (!condition) {
    return { kind: 'dry', intensity: 0 };
  }

  let type = condition.type;
  let intensity = condition.intensity;

  // Fallbacks
  if (typeof intensity !== 'number') {
    intensity = 0;
  }

  // --- Inkonsistente Daten behandeln ---
  // Falls intensity == 0, behandeln wir das als "dry",
  // auch wenn type z.B. "rainy" sagt.
  if (intensity === 0) {
    type = 'dry';
  }

  // type -> kind für die Wolke mappen
  let kind = 'dry';
  switch (type) {
    case 'rainy':
    case 'rain':
      kind = 'rain';
      break;
    case 'snowy':
    case 'snow':
      kind = 'snow';
      break;
    case 'hail':
      kind = 'hail';
      break;
    case 'dry':
    default:
      kind = 'dry';
      break;
  }

  // intensity: 0..4 -> 0..1 normalisieren (kontinuierliche Skala 0.0–1.0)
  // (0 = nichts, 1 = leicht, 4 = stark)
  const normalizedIntensity = clamp(intensity / 4, 0, 1); // clamp(wert, min, max)

  return {
    kind: kind,
    intensity: normalizedIntensity
  };
}

AFRAME.registerComponent('rain-cloud', {
  schema: {
    intensity:    {type: 'number', default: 0.7, min: 0, max: 1},
    tint:         {type: 'color',  default: '#d6cfd4ff'},
    tintStrength: {type: 'number', default: 0.85, min: 0, max: 1},
    opacity:      {type: 'number', default: 0.9},
    model:        {type: 'selector'}, // <a-asset-item>
    windX:        {type: 'number', default: 0.10},
    windZ:        {type: 'number', default: 0.00}
  },

  init: function () {
    const el = this.el; // a-frame entity

    this.meshes = []; // array für 3D-Meshes der Wolke

    // Wetter-Event-Listener 
    const sceneEl = el.sceneEl;

    // Callback-Funktion, Handler als Instanz-Property speichern, wird später wieder entfernt (remove function)
    this._onWeatherChanged = (evt) => {
      const condition = evt.detail;
      const weather = conditionToCloudWeather(condition);

      this.applyWeather(weather);
    };
    // falls Event verfügbar, reagieren alle cloud-entities drauf 
    if (sceneEl) {
      sceneEl.addEventListener('weather-changed', this._onWeatherChanged);
    }
    // Wolken-Entity als Kind erzeugen
    this.cloud = document.createElement('a-entity');

    // 3D-Modell auf this.cloud entity setzen 
    if (this.data.model) {
      this.cloud.setAttribute('gltf-model', '#' + this.data.model.id);
    }

    // Direkt über der Kamera, fixiert
    this.cloud.setAttribute('position', '0 5 0'); // 5 Meter über Augenhöhe
    // this.cloud.object3D.position.setY(3); // sicherstellen

    // Laptopposition, debugging 
    // this.cloud.setAttribute('position', '-3 -1.25 -15');

    el.appendChild(this.cloud);

    this.cloud.addEventListener('model-loaded', () => {
      const obj = this.cloud.getObject3D('mesh');
      if (!obj) return;

      // mesh-array füllen, materialien klonen kontrollierbar für Tint / Opacity
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

      // Partikel-Entity als Kind der Wolke
      this.precip = document.createElement('a-entity');
      this.cloud.appendChild(this.precip);

      // unter die Wolke verschoben
      this.precip.setAttribute('position', '3 -6 3');

      // default: dry
      this.currentPrecip = 'dry'; 
      this.applyWeather({kind: 'dry', intensity: 0});

      // zuerst Wolke, dann Partikel rendern 
      this.cloud.object3D.renderOrder = 1;
      if (this.precip && this.precip.object3D) {
        this.precip.object3D.renderOrder = 2;
      } 

      this.applyTint(); // Wolkenfarbe
      this.applyOpacity(); // Transparenz
    });
  },

  // falls wir noch einen slider bauen... 
  update: function (old) {
    if (!old) return;

    if (old.intensity !== this.data.intensity ||
        old.windX     !== this.data.windX ||
        old.windZ     !== this.data.windZ) {
      if (this.currentPrecip === 'snow'){
        this._applySnow();
      }else if (this.currentPrecip === 'rain'){
        this._applyRain(); 
      }else if (this.currentPrecip === 'hail'){
        this._applyHail(); 
      }
    }

    if (old.tint !== this.data.tint ||
        old.tintStrength !== this.data.tintStrength) {
      this.applyTint();
    }

    if (old.opacity !== this.data.opacity) {
      this.applyOpacity();
    }
  },

  _applyPrecip: function (kind) {
    if (!this.precip) return;
    console.log('[rain-cloud] _applyPrecip called for', kind);

    const t   = clamp(this.data.intensity, 0, 1);
    const cfg = getPrecipConfig(kind);

    // Partikelparameter aus intensity ableiten
    const count = Math.round(lerp(cfg.countMin, cfg.countMax, t) / 100) * 100;
    const size  = lerp(cfg.sizeMin,  cfg.sizeMax,  t);
    const speed = lerp(cfg.speedMin, cfg.speedMax, t);

    const area   = 10.0;
    const height = 6.0;

    // andere Niederschläge entfernen
    this.precip.removeAttribute('rainfall');
    this.precip.removeAttribute('snowfall');
    this.precip.removeAttribute('hailfall');

    // richtigen Partikel-Component setzen
    let componentName;
    if (kind === 'rain') {
      componentName = 'rainfall';
    } else if (kind === 'snow') {
      componentName = 'snowfall';
    } else if (kind === 'hail') {
      componentName = 'hailfall';
    } else {
      console.warn('[rain-cloud] unknown precip kind:', kind);
      return;
    }

    this.precip.setAttribute(componentName, {
      count,
      size,
      speed,
      area,
      height,
      windX:   this.data.windX,
      windZ:   this.data.windZ,
      opacity: 1.0
    });

    this.currentPrecip = kind;
    this.applyTint();   // Farbe reagiert auf Art + Intensität
  },

    _applySnow: function () {
    this._applyPrecip('snow');
  },

  _applyRain: function () {
    this._applyPrecip('rain');
  },

  _applyHail: function () {
    this._applyPrecip('hail');
  },


  applyWeather: function (weather) {
    if (!weather) return;

    let kind = weather.kind;
    let intensity = weather.intensity;

    // Fallback bei nonsense werten 'dry'
    if (typeof intensity !== 'number') intensity = 0;
    if (!kind) kind = 'dry';

    this.data.intensity = intensity;

    // spezialfall 'dry' hier, alle anderen über _applyPrecip(kind) 
    if (kind === 'dry') {
      this.currentPrecip = 'dry';
      if (this.precip) {
        this.precip.removeAttribute('rainfall');
        this.precip.removeAttribute('snowfall');
        this.precip.removeAttribute('hailfall');
      }
      this.applyTint();
      this.applyOpacity();
      return;
    }

    // Für rain/snow/hail 
    this._applyPrecip(kind);

    this.applyTint();
    this.applyOpacity();
  },

  remove: function () {
    const sceneEl = this.el.sceneEl;
    if (sceneEl && this._onWeatherChanged) {
      sceneEl.removeEventListener('weather-changed', this._onWeatherChanged);
    }
  },

  applyTint: function () {
    const s = clamp(this.data.tintStrength, 0, 1);   // wie stark einfärben
    const intensity = clamp(this.data.intensity, 0, 1);
    const base = new AFRAME.THREE.Color(1, 1, 1);    // weiße Wolke

    let precipColor;
    // Farbe der Niederschlagsart holen (definiert in PRECIP_CONFIG)
    const cfg = getPrecipConfig(this.currentPrecip);
    if (cfg) {
      precipColor = new AFRAME.THREE.Color(cfg.color);
    } else {
      precipColor = new AFRAME.THREE.Color(this.data.tint); // falls nichts definiert wurde
    }

    // Intensität dunkler mit zunehmender Niederschlagsintensität, max-Wert 60%
    const toned = precipColor.clone()
      .lerp(new AFRAME.THREE.Color(0, 0, 0), intensity * 0.6);

    const finalColor = base.clone().lerp(toned, s);
    // Farbe auf mesh-array anwenden 
    for (const m of this.meshes) {
      forEachMaterial(m, mat => {
        mat.color.copy(finalColor);
        // emissive für bessere Beleuchtung ("Selbstleuchten")
        if (!mat.emissive) {
          mat.emissive = new AFRAME.THREE.Color(0, 0, 0);
        }

        const emis = finalColor.clone().multiplyScalar(0.12 * s);
        mat.emissive.copy(emis);

        mat.needsUpdate = true;
      });
    }
  },

  // je stärker der Niederschlag, umso "dichter" die Wolke 
  applyOpacity: function () {
    const t = clamp(this.data.intensity, 0, 1);
    // t=0, 0.7 sehr durchsichtig 
    // t=1, 0.95 sehr "dicht"
    // multipliziert mit globaler Opacity 
    const finalOpacity = lerp(0.7, 0.95, t) * this.data.opacity;

    for (const m of this.meshes) {
      forEachMaterial(m, mat => {
        mat.opacity = finalOpacity;
        mat.needsUpdate = true;
      });
    }
  }
});

// ------------------- fixed-clouds-Komponente -------------------
AFRAME.registerComponent('fixed-clouds', {
  schema: {
    model: {type: 'selector'},
    intensity: {type: 'number', default: 0.7},
    opacity: {type: 'number', default: 0.9},
    distance: {type: 'number', default: 1000}, // Abstand N/O/S/W
    height: {type: 'number', default: 150},    // Höhe der Wolken
    scale: {type: 'vec3', default: {x:50, y:50, z:50}}, // Größe der Wolken
    fillerCount: {type: 'number', default: 6}, // Anzahl der Wolken zwischen den Hauptwolken
    fillerRadius: {type: 'number', default: 700} // max Abstand für die Füllwolken
  },

  init: function () {
    const d = this.data.distance;
    const h = this.data.height;
    const s = this.data.scale;

    // ---------------- Hauptwolken (Mitte + N/O/S/W)
    const mainPositions = [
      {x: 0, y: h, z: 0},    // Mitte
      {x: 0, y: h, z: -d},   // Norden
      {x: d, y: h, z: 0},    // Osten
      {x: 0, y: h, z: d},    // Süden
      {x: -d, y: h, z: 0}    // Westen
    ];

    mainPositions.forEach(pos => {
      const cloud = document.createElement('a-entity');
      cloud.setAttribute('rain-cloud', {
        model: this.data.model,
        intensity: this.data.intensity,
        opacity: this.data.opacity
      });
      cloud.setAttribute('position', `${pos.x} ${pos.y} ${pos.z}`);
      cloud.setAttribute('scale', `${s.x} ${s.y} ${s.z}`);
      this.el.appendChild(cloud);
    });

    // ---------------- Füllwolken zufällig zwischen den Hauptwolken
    for (let i = 0; i < this.data.fillerCount; i++) {
      const angle = Math.random() * Math.PI * 2;   // Zufällige Richtung
      const radius = Math.random() * this.data.fillerRadius; // Abstand zufällig bis max
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = h + (Math.random() * 50 - 25); // leicht zufällige Höhe +/-25m

      const fillerCloud = document.createElement('a-entity');
      fillerCloud.setAttribute('rain-cloud', {
        model: this.data.model,
        intensity: this.data.intensity,
        opacity: this.data.opacity
      });
      fillerCloud.setAttribute('position', `${x} ${y} ${z}`);
      fillerCloud.setAttribute('scale', `${s.x} ${s.y} ${s.z}`);
      this.el.appendChild(fillerCloud);
    }
  }
});