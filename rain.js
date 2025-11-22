// Regen (WebGL2-safe)
AFRAME.registerComponent('rainfall', {
  schema: {
    count:   {type: 'int',    default: 2200, min: 10},   // Anzahl an Partikeln, etwas mehr Partikel als Schnee
    size:    {type: 'number', default: 0.14, min: 0.01}, // Tropfengröße 
    area:    {type: 'number', default: 4.0,  min: 0.5}, // Radius der "Partikelwolke" horizontal
    height:  {type: 'number', default: 5.0,  min: 0.5}, // wie hoch ist der Bereich aus dem der Regen fällt 
    speed:   {type: 'number', default: 1.8,  min: 0.1},  // Fallgeschwindigkeit, schneller als Schnee
    windX:   {type: 'number', default: 0.20}, // wie stark wird der Regen horizontal verweht 
    windZ:   {type: 'number', default: 0.00},
    opacity: {type: 'number', default: 0.95} // Grundtransparenz aller Tropfen 
  },
 // Komponente wird initialisiert: 
  init: function () {
    // Abkürzungen: 
    const THREE = AFRAME.THREE; 
    const d = this.data; // Speicher der Werte aus Schema

    // Positionen + Geschwindigkeiten
    const pos = new Float32Array(d.count * 3); // Position aller Tropfen (*3 für xyz)
    const vel = new Float32Array(d.count * 3); // vx, vy, vz // Geschwindigkeit aller Tropfen 

    // Schleife über alle Tropfen 
    for (let i = 0; i < d.count; i++) { 
      // zufällige Startposition: Index des aktuellen Tropfen im Array multipliziert mit random 
      const ix = i * 3;
      pos[ix + 0] = (Math.random() * 2 - 1) * d.area; // x
      pos[ix + 1] = Math.random() * d.height;         // y
      pos[ix + 2] = (Math.random() * 2 - 1) * d.area; // z

      // zufällige Startgeschwindigkeit, Wind später in tick(), Regen fällt schneller als Schnee
      vel[ix + 0] = 0;
      vel[ix + 1] = -(1.5 + Math.random() * 1.0);     // nach unten, aber nicht zu schnell wegen sichtbarkeit
      vel[ix + 2] = 0;
    }

    const geo = new THREE.BufferGeometry(); // eine Geometrie für alle Tropfen 
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));

    // canvas Cinematic Regentropfen-Textur: quadratisch, heller Kern, vertikal leicht gestreckt durch Gradient
    const canvas = document.createElement('canvas'); // leeres HTML-Canvas-Element 
    canvas.width = 64; // Tropfenbreite 
    canvas.height = 64; // Tropfenhöhe
    const ctx = canvas.getContext('2d'); // zugriff auf die erstellte Oberfläche
    // Hintergrund transparent -> leeres Quadrat 
    ctx.clearRect(0, 0, canvas.width, canvas.height);

     // glänzt in der Mitte
    const grd = ctx.createLinearGradient(32, 8, 32, 56); // vertikaler Farbverlauf (Farben entlang einer Linie) ((32,8) (x,y)start - (32,56) endpunkt) 
    grd.addColorStop(0.0, 'rgba(180, 220, 255, 0.0)');
    grd.addColorStop(0.2, 'rgba(190, 230, 255, 0.5)'); // ab 20% benutzt Farbe x
    grd.addColorStop(0.5, 'rgba(220, 245, 255, 0.95)'); // helles Zentrum
    grd.addColorStop(0.8, 'rgba(190, 230, 255, 0.5)'); // ab 80% benutzt Farbe y 
    grd.addColorStop(1.0, 'rgba(180, 220, 255, 0.0)');

    ctx.fillStyle = grd; // was jetzt folgt mit Farbverlauf füllen:
    // schmaler „Strich“ in der Mitte (Tropfen)
    ctx.fillRect(26, 6, 12, 52);

    // leichter Glanz außenrum
    const glow = ctx.createRadialGradient(32, 32, 8, 32, 32, 22); // kreisförmiger Farbverlauf (Mittelpunkt 32,32)
    glow.addColorStop(0.0, 'rgba(180, 220, 255, 0.3)'); // hellblau 
    glow.addColorStop(1.0, 'rgba(180, 220, 255, 0.0)');
    ctx.fillStyle = glow; // was jetzt folgt mit Farbverlauf füllen: 
    ctx.beginPath();
    ctx.arc(32, 32, 22, 0, Math.PI * 2);
    ctx.fill();

    const tex = new THREE.CanvasTexture(canvas); // Canvas in 3D (WebGL-Textur) umwandeln
    tex.anisotropy = 4; // verbessert Schärfe 

    const mat = new THREE.PointsMaterial({
      map: tex, // tex verwenden 
      size: d.size, 
      transparent: true, // grd und glow dürfen durchsichtige Bereiche haben 
      depthWrite: false, // Tropfen überschreiben sich nicht 
      depthTest: false,
      opacity: d.opacity,
      color: 0x7fb9ff,                // Grundton: hellblau
      blending: THREE.AdditiveBlending // leichter Glanz-Effekt
    });

    const points = new THREE.Points(geo, mat); // "Partikelwolke" erzeugen 
    points.frustumCulled = false; // Partikel die außerhalb der Kamera sind werden nicht ausgeblendet 

    // hier alles für tick() abspeichern 
    this.points  = points;
    this._vel    = vel;
    this._area   = d.area;
    this._height = d.height;
    this._last   = performance.now();

    // anderer Key als 'snow', damit beide koexistieren können
    this.el.setObject3D('rain', points); // hängt Regen als 3D Objekt an die Wolke an 
    console.log('[rainfall] init: rain on', this.el); // Debug
  },

  update: function (old) {
    if (!this.points) return; // falls es noch keine Partikel gibt 
    const d = this.data; // Schema-Objekt erzeugen 
    const mat = this.points.material; // zeichnet Tropfen 

    // Material live anpassen
    if (!old || old.size !== d.size) {
      mat.size = d.size;
      mat.needsUpdate = true;
    }
    if (!old || old.opacity !== d.opacity) {
      mat.opacity = d.opacity;
      mat.needsUpdate = true;
    }

    this._area   = d.area; // horizontale Ausdehnung 
    this._height = d.height; // höhe wo die Tropfen entstehen 

    // Geometrie neu erzeugen falls sich die Tropfenanzahl geändert hat 
    if (!old || old.count !== d.count) {
      if (this.points.geometry) this.points.geometry.dispose(); // alte Geometrie entfernen 

      const pos = new Float32Array(d.count * 3); 
      const vel = new Float32Array(d.count * 3);

 // vgl. init(), neues Regenvolumen 
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

 // die eigentliche Regensimulation: 

  tick: function (time) {
    if (!this.points) return; 

    const dt = (time - (this._last || time)) / 1000; // dt misst Zeit seit letztem Frame in sek.
    this._last = time; //  A-frame time: Zeit in ms seit Szenenstart

    const pos    = this.points.geometry.attributes.position.array; // enthält Tropenpositionen 
    const vel    = this._vel; // enthält Tropfengeschwindigkeit 
    const area   = this._area; // horizontale weite der "Partikelwolke" 
    const height = this._height; // Höhe wo die Tropfen entstehen 
    const d      = this.data; // Schema 

    // Wind wirkt auf jeden Tropfen – beim Regen stärker als beim Schnee
    for (let i = 0; i < vel.length; i += 3) {
      vel[i + 0] = d.windX;   // stärkerer horizontaler Drift als bei Schnee
      vel[i + 2] = d.windZ;
    }

    // Bewegung + Respawn
    for (let i = 0; i < pos.length; i += 3) {
      pos[i + 0] += vel[i + 0] * dt; // x verschiebt sich durch wind 
      pos[i + 1] += (vel[i + 1] * d.speed) * dt; // y fällt durch speed 
      pos[i + 2] += vel[i + 2] * dt; // z verschiebt sich durch wind 

      // Wenn Tropfen "am Boden" sind, wieder oben spawnen
      if (pos[i + 1] < 0.0) {
        pos[i + 1] = height;
        pos[i + 0] = (Math.random() * 2 - 1) * area; // neue zufällige Startposition
        pos[i + 2] = (Math.random() * 2 - 1) * area;
      }

      // Wrap um das Areal herum, Tropfen die herausdriften tauchen auf der anderen Seite wieder auf - immer gleiche Dichte 
      if (pos[i + 0] >  area) pos[i + 0] = -area; 
      if (pos[i + 0] < -area) pos[i + 0] =  area;
      if (pos[i + 2] >  area) pos[i + 2] = -area;
      if (pos[i + 2] < -area) pos[i + 2] =  area;
    }

    this.points.geometry.attributes.position.needsUpdate = true;
  }
});
