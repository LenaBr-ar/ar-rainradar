console.log('cloud.js loaded');
// Globale Konfiguration für alle Niederschlagsarten / Niederschlagsintensitäten
const PRECIP_CONFIG = {
  dry: {
    1: {
      countMin: 0,
      countMax: 0,
      sizeMin: 0,
      sizeMax: 0,
      speedMin: 0,
      speedMax: 0,
      color: '#ffffff' 
    }
  },
  rain: {
    1: {
      countMin: 1000,
      countMax: 4000,
      sizeMin:  0.05,
      sizeMax:  0.20,
      speedMin: 1.8,
      speedMax: 3.5,
      color:    '#BCFCFD'  
    },
    2: {
      countMin: 2000,
      countMax: 5000,
      sizeMin:  0.05,
      sizeMax:  0.20,
      speedMin: 1.8,
      speedMax: 3.5,
      color:    '#59ACF8'  
    },
    3: {
      countMin: 3000,
      countMax: 6000,
      sizeMin:  0.05,
      sizeMax:  0.20,
      speedMin: 1.8,
      speedMax: 3.5,
      color:    '#3B7DD4'  
    },
    4: {
      countMin: 4000,
      countMax: 7000,
      sizeMin:  0.05,
      sizeMax:  0.20,
      speedMin: 1.8,
      speedMax: 3.5,
      color:    '#85398B'  
    },
  },
  snow: {
    1: {
      countMin: 900,
      countMax: 4000,
      sizeMin:  0.08,
      sizeMax:  0.25,
      speedMin: 0.7,
      speedMax: 1.1,
      color:    '#ff93ef'  
    },
    2: {
      countMin: 1800,
      countMax: 4900,
      sizeMin:  0.08,
      sizeMax:  0.25,
      speedMin: 0.7,
      speedMax: 1.1,
      color:    '#fd6ce7'    
    },
    3: {
      countMin: 2700,
      countMax: 5800,
      sizeMin:  0.08,
      sizeMax:  0.25,
      speedMin: 0.7,
      speedMax: 1.1,
      color:    '#ff39e1'    
    },
    4: {
      countMin: 3600,
      countMax: 6700,
      sizeMin:  0.08,
      sizeMax:  0.25,
      speedMin: 0.7,
      speedMax: 1.1,
      color:    '#d200b2'  
    }
  },
  hail: {
    1: {
      countMin: 600,
      countMax: 2500,
      sizeMin:  0.12,
      sizeMax:  0.28,
      speedMin: 1.4,
      speedMax: 2.4,
      color:    '#ff728c'
    },
    2: {
      countMin: 1200,
      countMax: 3100,
      sizeMin:  0.12,
      sizeMax:  0.28,
      speedMin: 1.4,
      speedMax: 2.4,
      color:    '#ff0533'
    },
    3: {
      countMin: 1800,
      countMax: 3700,
      sizeMin:  0.12,
      sizeMax:  0.28,
      speedMin: 1.4,
      speedMax: 2.4,
      color:    '#b90324'  
    },
    4: {
      countMin: 2400,
      countMax: 4300,
      sizeMin:  0.12,
      sizeMax:  0.28,
      speedMin: 1.4,
      speedMax: 2.4,
      color:    '#660113'  // rot
    },
  }
};

function getPrecipConfig(kind) {
  return PRECIP_CONFIG[kind] || PRECIP_CONFIG.dry;
}

// Helper, um aus einem weather-condition-Objekt das cloud-Wetter abzuleiten
// Erwartete Struktur von condition:
// { type: 'rain'|'snow'|'hail'|'dry', intensity: 0..4 }
function conditionToCloudWeather(condition) {
  if (!condition || typeof condition !== 'object') {
    return { kind: 'dry', intensity: 0 };
  }

  let type = condition.type;
  let intensity = condition.intensity;

  // Fallbacks
  if (typeof intensity !== 'number' || Number.isNaN(intensity)) {
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

  return {
    kind: kind,
    intensity
  };
}

AFRAME.registerComponent('rain-cloud', {
  schema: {
    intensity:    {type: 'number', default: 0.7, min: 0, max: 1},
    tint:         {type: 'color',  default: '#ffffff'},
    tintStrength: {type: 'number', default: 0.85, min: 0, max: 1},
    opacity:      {type: 'number', default: 0.9},
    model:        {type: 'selector'}, // <a-asset-item>
    windX:        {type: 'number', default: 0.10},
    windZ:        {type: 'number', default: 0.00}
  },

  init: function () {
    const el = this.el; // a-frame entity

    this.meshes = []; // array für 3D-Meshes der Wolke

    // Callback-Funktion, Handler als Instanz-Property speichern, wird später wieder entfernt (remove function)
    this._onWeatherChanged = (evt) => {
      const condition = evt.detail;
      const weather = conditionToCloudWeather(condition);
      this.data.intensity = clamp((weather.intensity - 1) / 3, 0, 1);
      this.currentPrecip = weather.kind;

      this.animationOn = evt.detail.animationOn;
      this.applyWeather(weather);
    };
    // cloud-entities reagieren auf eigene Wetter-Events
    this.el.addEventListener('weather-changed', this._onWeatherChanged);
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

  _applyPrecip: function (kind) {
    if (!this.precip) return;

    const t   = clamp(this.data.intensity, 0, 1);
    const level = Math.round(t*3) + 1;
    const cfgKind = PRECIP_CONFIG[kind];
    const cfg = cfgKind && cfgKind[level];

    if (!cfg) {
      console.warn('[rain-cloud] no precip config for kind', kind, 'level', level); 
      return;
    }
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
    console.log(
      '[rain-cloud precip]',
      kind,
      'level=', level,
      'count=', count,
      'size=', size,
      'speed=', speed
    );

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

    // spezialfälle 'dry' oder Animationen sind ausgeschaltet hier, alle anderen über _applyPrecip(kind)
    if (kind === 'dry' || !this.animationOn) {
      this.currentPrecip = kind;
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
    if (this._onWeatherChanged) {
      this.el.removeEventListener('weather-changed', this._onWeatherChanged);
    }
  },

  applyTint: function () {

    const intensity = clamp(this.data.intensity, 0, 1); // intensität level 0-1
   
    const level = Math.round(intensity * 3) + 1; // intensität level 1-4
    
    console.log(
      '[applyTint]',
      'currentPrecip =', this.currentPrecip,
      'rawIntensity =',intensity,
      'level =', level,
      'cfg =', PRECIP_CONFIG[this.currentPrecip]
    );

    const cfg = PRECIP_CONFIG[this.currentPrecip];
    if (!cfg) {
      console.warn('[applyTint] no config for', this.currentPrecip);
    }

    // explizite Farbe pro Intensitätsstufe
    let precipColor;
    if (cfg && cfg[level] && cfg[level].color) {
      precipColor = new AFRAME.THREE.Color(cfg[level].color);
    } else {
      precipColor = new AFRAME.THREE.Color(this.data.tint); // Fallback
    }

    const finalColor = precipColor.clone()

    // Farbe auf mesh-array anwenden 
    for (const m of this.meshes) {
      forEachMaterial(m, mat => {
        mat.color.copy(finalColor);

        // emissive für bessere Beleuchtung ("Selbstleuchten" um die Farbe korrekter abzubilden)
        if (mat.emissive) {
          mat.emissive.copy(finalColor);
          mat.emissiveIntensity = 0.25;
        }

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
    model: {type: 'selector'},       // Wolkenmodell
    intensity: {type: 'number', default: 0.7},
    opacity: {type: 'number', default: 0.9},
    distance: {type: 'number', default: 10} // Abstand N/O/S/W
  },

  init: function () {
    const d  = this.data.distance;
    const d1 = d / 3;
    const d2 = 2 * d / 3;

    // ➕ Neuer Ring zwischen Center & Ring 1
    const dMid    = d1 / 2;
    const diagMid = dMid / Math.sqrt(2);

    // Diagonalen
    const diag1 = d1 / Math.sqrt(2);
    const diag2 = d2 / Math.sqrt(2);
    const diag3 = d  / Math.sqrt(2);

    // Versatz
    const shiftMid = dMid * 0.25;
    const shift2   = d2   * 0.25;

  const y3 = -2.5;    // Ring 3 (außen)
  const y2 = -1;    // Ring 2
  const y1 = -0.5;     // Ring 1 
  const yMid = -0.5; // NEUER Ring zwischen Center & Ring 1
  const y0 = 0;     // Center (FIX)
 

    this.sectorMap = {
      centerSector: { cloudEles: [], lastWeather: null },
      northSector:  { cloudEles: [], lastWeather: null },
      eastSector:   { cloudEles: [], lastWeather: null },
      westSector:   { cloudEles: [], lastWeather: null },
      southSector:  { cloudEles: [], lastWeather: null },
    };

    this._onSectorWeatherChanged = (evt) => {
      if (this.sectorMap[evt.detail.sector].lastWeather === JSON.stringify(evt.detail)) {
        return;
      }
      this.sectorMap[evt.detail.sector].lastWeather = JSON.stringify(evt.detail);
      for (let cloud of this.sectorMap[evt.detail.sector].cloudEles) {
        cloud.dispatchEvent(new CustomEvent('weather-changed', {detail: evt.detail}))
      }
    };
    
    this.el.addEventListener('sector-weather-changed', this._onSectorWeatherChanged);

   const positions = {
      // -------- Center --------
      center: {x: 0, y: y0, z: 0},

      // -------- Neuer Ring (zwischen Center & Ring 1) --------
      northMid: {x:  shiftMid,  y: y1, z: -dMid},
      eastMid:  {x:  dMid,      y: y1, z:  shiftMid},
      southMid: {x: -shiftMid, y: y1, z:  dMid},
      westMid:  {x: -dMid,     y: y1, z: -shiftMid},

      neMid: {x:  diagMid + shiftMid, y: y1, z: -diagMid},
      seMid: {x:  diagMid,            y: y1, z:  diagMid + shiftMid},
      swMid: {x: -diagMid + shiftMid, y: y1, z:  diagMid},
      nwMid: {x: -diagMid,            y: y1, z: -diagMid + shiftMid},

      // -------- Ring 1 (unverändert) --------
      north1: {x: 0,   y: y1, z: -d1},
      east1:  {x: d1,  y: y1, z:  0},
      south1: {x: 0,   y: y1, z:  d1},
      west1:  {x: -d1, y: y1, z:  0},

      ne1: {x:  diag1, y: y1, z: -diag1},
      se1: {x:  diag1, y: y1, z:  diag1},
      sw1: {x: -diag1, y: y1, z:  diag1},
      nw1: {x: -diag1, y: y1, z: -diag1},

      // -------- Ring 2 (versetzt) --------
      north2: {x:  shift2,  y: y2, z: -d2},
      east2:  {x:  d2,      y: y2, z:  shift2},
      south2: {x: -shift2, y: y2, z:  d2},
      west2:  {x: -d2,     y: y2, z: -shift2},

      ne2: {x:  diag2 + shift2, y: y2, z: -diag2},
      se2: {x:  diag2,          y: y2, z:  diag2 + shift2},
      sw2: {x: -diag2 + shift2, y: y2, z:  diag2},
      nw2: {x: -diag2,          y: y2, z: -diag2 + shift2},

      // -------- Ring 3 (außen, unverändert) --------
      north3: {x: 0,  y: y3, z: -d},
      east3:  {x: d,  y: y3, z:  0},
      south3: {x: 0,  y: y3, z:  d},
      west3:  {x: -d, y: y3, z:  0},

      ne3: {x:  diag3, y: y3, z: -diag3},
      se3: {x:  diag3, y: y3, z:  diag3},
      sw3: {x: -diag3, y: y3, z:  diag3},
      nw3: {x: -diag3, y: y3, z: -diag3}
    };

    for (let cloudId in positions) {
      const cloud = document.createElement('a-entity');
      cloud.setAttribute('rain-cloud', {
        model: this.data.model,
        intensity: this.data.intensity,
        opacity: this.data.opacity
      });
      let pos = positions[cloudId];
      cloud.setAttribute('position', `${pos.x} ${pos.y} ${pos.z}`);
      this.el.appendChild(cloud);
      this._assignCloudToSector(cloud, pos);
    }
  },

  _assignCloudToSector: function (cloud, pos) {
    let sector; 
    if (pos.x >= 0 && pos.z < 0) {
      sector = "northSector";
    } else if (pos.x > 0 && pos.z >= 0) {
      sector = "eastSector";
    } else if (pos.x <= 0 && pos.z > 0) {
      sector = "southSector";
    } else if (pos.x < 0 && pos.z <= 0) {
      sector = "westSector";
    } else {
      sector = "centerSector";
    }
    this.sectorMap[sector].cloudEles.push(cloud);
  }
});


//AFRAME.registerComponent('fixed-clouds', {
//  schema: {
//    model: {type: 'selector'},
  //  intensity: {type: 'number', default: 0.7},
   // opacity: {type: 'number', default: 0.9},
   // distance: {type: 'number', default: 1000}, // Abstand N/O/S/W
   // height: {type: 'number', default: 150},    // Höhe der Wolken
    //scale: {type: 'vec3', default: {x:50, y:50, z:50}}, // Größe der Wolken
    //fillerCount: {type: 'number', default: 6}, // Anzahl der Wolken zwischen den Hauptwolken
    //fillerRadius: {type: 'number', default: 700} // max Abstand für die Füllwolken
  //},

  //init: function () {
    //const d = this.data.distance;
    //const h = this.data.height;
    //const s = this.data.scale;

    // ---------------- Hauptwolken (Mitte + N/O/S/W)
   // const mainPositions = [
     // {x: 0, y: h, z: 0},    // Mitte
      //{x: 0, y: h, z: -d},   // Norden
      //{x: d, y: h, z: 0},    // Osten
      //{x: 0, y: h, z: d},    // Süden
      //{x: -d, y: h, z: 0}    // Westen
    //];

    //mainPositions.forEach(pos => {
      //const cloud = document.createElement('a-entity');
      //cloud.setAttribute('rain-cloud', {
       // model: this.data.model,
        //intensity: this.data.intensity,
        //opacity: this.data.opacity
      //});
   //   cloud.setAttribute('position', `${pos.x} ${pos.y} ${pos.z}`);
   //   cloud.setAttribute('scale', `${s.x} ${s.y} ${s.z}`);
   //   this.el.appendChild(cloud);
   // });

    // ---------------- Füllwolken zufällig zwischen den Hauptwolken
   // for (let i = 0; i < this.data.fillerCount; i++) {
   //   const angle = Math.random() * Math.PI * 2;   // Zufällige Richtung
   //   const radius = Math.random() * this.data.fillerRadius; // Abstand zufällig bis max
   //   const x = Math.cos(angle) * radius;
   //   const z = Math.sin(angle) * radius;
   //   const y = h + (Math.random() * 50 - 25); // leicht zufällige Höhe +/-25m

   //   const fillerCloud = document.createElement('a-entity');
  //    fillerCloud.setAttribute('rain-cloud', {
   //     model: this.data.model,
  //      intensity: this.data.intensity,
  //     opacity: this.data.opacity
   //   });
  //    fillerCloud.setAttribute('position', `${x} ${y} ${z}`);
  //    fillerCloud.setAttribute('scale', `${s.x} ${s.y} ${s.z}`);
  //    this.el.appendChild(fillerCloud);
 //   }
//  }
//});
