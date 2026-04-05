// NodeGenie — media/mindmap.js v1.2.0
// External JS file cho Custom Editor webview — tránh CSP inline script block
// Data được đọc từ <script type="application/json" id="graph-data">
// v1.2.0 — Click node highlight: làm mờ node/edge không liên quan

(function() {
  // ── Đọc data từ thẻ JSON (không bị CSP block) ──
  var dataEl = document.getElementById('graph-data');
  if (!dataEl) {
    document.body.innerHTML += '<p style="color:red;padding:20px">ERROR: No graph-data found</p>';
    return;
  }

  var payload;
  try {
    payload = JSON.parse(dataEl.textContent);
  } catch(e) {
    document.body.innerHTML += '<p style="color:red;padding:20px">ERROR parsing graph data: ' + e + '</p>';
    return;
  }

  var nodes = payload.nodes;
  var edges = payload.edges;

  if (!nodes || !edges) {
    document.body.innerHTML += '<p style="color:red;padding:20px">ERROR: nodes/edges missing</p>';
    return;
  }

  // ── Index nodes ──
  var nm = {};
  nodes.forEach(function(n) { nm[n.id] = n; });

  // ── Màu sắc ──
  function clr(kind, warn, isRoot) {
    if (isRoot && !warn) return { fill:'#1a1800', stroke:'#FFD700', text:'#FFE566', sw:'2.5', glow:true };
    if (warn)            return { fill:'#2b1a1a', stroke:'#ff5555', text:'#ff9999', sw:'1.5', glow:false };
    if (kind==='FUNC')   return { fill:'#0f1f0f', stroke:'#5aab5a', text:'#aaffaa', sw:'1.5', glow:false };
    if (kind==='VAR')    return { fill:'#0f0f20', stroke:'#5a5aab', text:'#aaaaff', sw:'1.5', glow:false };
    return                     { fill:'#131830', stroke:'#3d6090', text:'#c9d1e0', sw:'1.5', glow:false };
  }
  function eclr(t) {
    if (t==='contains') return '#2a2a40';
    if (t==='depends')  return '#4A9EFF';
    if (t==='calls')    return '#aaf0aa';
    return '#FF7A00';
  }

  // ── SVG helpers ──
  var NS = 'http://www.w3.org/2000/svg';
  function mk(tag, a) {
    var e = document.createElementNS(NS, tag);
    Object.keys(a).forEach(function(k) { e.setAttribute(k, a[k]); });
    return e;
  }

  var svg  = document.getElementById('svg');
  var root = document.getElementById('root');
  var ge   = document.getElementById('ge');
  var gn   = document.getElementById('gn');
  var tip  = document.getElementById('tip');
  var defs = document.getElementById('defs');

  if (!svg || !root || !ge || !gn) {
    document.body.innerHTML += '<p style="color:red;padding:20px">ERROR: SVG containers not found</p>';
    return;
  }

  // ── Filter glow cho root node ──
  var filt = mk('filter', { id:'glow', x:'-40%', y:'-40%', width:'180%', height:'180%' });
  var blur = mk('feGaussianBlur', { stdDeviation:'4', result:'blur' });
  var merge = mk('feMerge', {});
  var mn1 = mk('feMergeNode', { in:'blur' });
  var mn2 = mk('feMergeNode', { in:'SourceGraphic' });
  merge.appendChild(mn1); merge.appendChild(mn2);
  filt.appendChild(blur); filt.appendChild(merge);
  defs.appendChild(filt);

  // ── Arrow markers ──
  ['depends','calls','link'].forEach(function(t) {
    var m = mk('marker', { id:'a'+t, markerWidth:'7', markerHeight:'7', refX:'6', refY:'3', orient:'auto' });
    var p = mk('path', { d:'M0,0 L0,6 L7,3 z', fill:eclr(t), opacity:'0.85' });
    m.appendChild(p);
    defs.appendChild(m);
  });

  // ── Highlight state ──
  var selectedNodeId = null;

  // Trả về set các nodeId liên quan tới nodeId đã chọn (bao gồm chính nó)
  function getRelated(nodeId) {
    var related = {};
    related[nodeId] = true;
    edges.forEach(function(e) {
      if (e.from === nodeId || e.to === nodeId) {
        related[e.from] = true;
        related[e.to] = true;
      }
    });
    return related;
  }

  // Áp dụng highlight hoặc reset về trạng thái bình thường
  function applyHighlight() {
    try {
      var related = selectedNodeId ? getRelated(selectedNodeId) : null;

      // Nodes
      nodes.forEach(function(n, i) {
        var el = nEls[i];
        if (!el) return;
        if (!related) {
          el.style.opacity = '1';
          el.style.transition = 'opacity 0.2s';
          // X\u00f3a glow th\u1eeba khi reset
          var shape = el.querySelector('rect,polygon');
          if (shape && !n.isRoot) shape.removeAttribute('filter');
        } else if (related[n.id]) {
          el.style.opacity = '1';
          el.style.transition = 'opacity 0.2s';
          // Thêm viền highlight cho node được chọn
          var shape = el.querySelector('rect,polygon');
          if (shape) shape.setAttribute('filter', n.id === selectedNodeId ? 'url(#glow)' : '');
        } else {
          el.style.opacity = '0.12';
          el.style.transition = 'opacity 0.2s';
        }
      });

      // Edges
      edges.forEach(function(e, i) {
        var el = eEls[i];
        if (!el) return;
        var baseOp = e.type === 'contains' ? 0.4 : 0.75;
        if (!related) {
          el.line.style.opacity = baseOp;
          el.line.style.transition = 'opacity 0.2s';
          if (el.lbl) { el.lbl.style.opacity = '1'; el.lbl.style.transition = 'opacity 0.2s'; }
        } else if (related[e.from] && related[e.to]) {
          el.line.style.opacity = '1';
          el.line.style.transition = 'opacity 0.2s';
          el.line.style.strokeWidth = '2.5';
          if (el.lbl) { el.lbl.style.opacity = '1'; el.lbl.style.transition = 'opacity 0.2s'; }
        } else {
          el.line.style.opacity = '0.04';
          el.line.style.transition = 'opacity 0.2s';
          el.line.style.strokeWidth = e.type === 'contains' ? '1' : '1.8';
          if (el.lbl) { el.lbl.style.opacity = '0'; el.lbl.style.transition = 'opacity 0.2s'; }
        }
      });
    } catch(err) {
      console.error('[mindmap.js] applyHighlight error:', err);
    }
  }

  // Click lên nền SVG → reset
  svg.addEventListener('click', function(ev) {
    if (ev.target === svg || ev.target.id === 'root' || ev.target.id === 'ge' || ev.target.id === 'gn') {
      selectedNodeId = null;
      applyHighlight();
    }
  });

  // ── Draw edges ──
  var eEls = [];
  edges.forEach(function(e) {
    var line = mk('line', {
      stroke: eclr(e.type),
      'stroke-width': e.type==='contains' ? '1' : '1.8',
      'stroke-dasharray': e.type==='contains' ? '6,4' : 'none',
      opacity: e.type==='contains' ? '0.4' : '0.75',
      'marker-end': e.type!=='contains' ? 'url(#a'+e.type+')' : ''
    });
    ge.appendChild(line);
    var lbl = null;
    if (e.label) {
      lbl = mk('text', { fill:'#556', 'font-size':'9', 'text-anchor':'middle', 'dominant-baseline':'middle', 'pointer-events':'none' });
      lbl.textContent = e.label;
      ge.appendChild(lbl);
    }
    eEls.push({ line:line, lbl:lbl });
  });

  // ── Draw nodes ──
  var NW = 96, NH = 30;
  var nEls = [];
  nodes.forEach(function(n) {
    var c = clr(n.kind, n.warn, n.isRoot);
    var g = mk('g', { cursor:'pointer' });
    var sc = n.isRoot ? 1.3 : 1;

    var shape;
    if (n.kind === 'VAR') {
      var hw = (NW/2)*sc, hh = 18*sc;
      shape = mk('polygon', {
        points: '0,'+(-hh)+' '+hw+',0 0,'+hh+' '+(-hw)+',0',
        fill:c.fill, stroke:c.stroke, 'stroke-width':c.sw
      });
    } else {
      var w = NW*sc, h = NH*sc;
      var rx = n.kind==='FUNC' ? '4' : '14';
      shape = mk('rect', { x:-w/2, y:-h/2, width:w, height:h, rx:rx, fill:c.fill, stroke:c.stroke, 'stroke-width':c.sw });
    }
    if (c.glow) { shape.setAttribute('filter', 'url(#glow)'); }
    g.appendChild(shape);

    if (n.isRoot) {
      var star = mk('text', { 'font-size':'10', 'text-anchor':'middle', 'dominant-baseline':'middle',
        'pointer-events':'none', y:String(-(NH*sc/2)+9), fill:'#FFD700', opacity:'0.9' });
      star.textContent = '★';
      g.appendChild(star);
    }

    var lbl = n.label.length > 14 ? n.label.substring(0,14)+'…' : n.label;
    var txt = mk('text', {
      fill:c.text, 'font-size': n.isRoot ? '12' : '11',
      'font-weight': n.isRoot ? '600' : 'normal',
      'text-anchor':'middle', 'dominant-baseline':'middle',
      'pointer-events':'none', 'font-family':'Segoe UI,sans-serif'
    });
    txt.textContent = lbl;
    g.appendChild(txt);

    // Tooltip
    g.addEventListener('mouseenter', function() {
      var lines = ['[' + (n.isRoot?'ROOT':n.kind) + '] ' + n.id];
      if (n.desc) lines.push('📄 ' + n.desc);
      if (n.warn) lines.push('⚠️ ' + n.warn);
      if (tip) { tip.textContent = lines.join('\n'); tip.style.display = 'block'; }
    });
    g.addEventListener('mousemove', function(ev) {
      if (tip) { tip.style.left=(ev.clientX+14)+'px'; tip.style.top=(ev.clientY-8)+'px'; }
    });
    g.addEventListener('mouseleave', function() { if (tip) tip.style.display='none'; });

    // Drag + Click (phân biệt click vs drag)
    var drag=false, ox=0, oy=0, moved=false;
    g.addEventListener('mousedown', function(ev) {
      drag=true; moved=false; ox=ev.clientX; oy=ev.clientY; n.vx=0; n.vy=0;
      ev.stopPropagation();
    });
    window.addEventListener('mousemove', function(ev) {
      if (!drag) return;
      var dx = ev.clientX-ox, dy = ev.clientY-oy;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) moved=true;
      n.x += dx/viewSc;
      n.y += dy/viewSc;
      ox=ev.clientX; oy=ev.clientY;
      draw();
    });
    window.addEventListener('mouseup', function() { drag=false; });

    // Click để highlight (chỉ khi không drag)
    g.addEventListener('click', function(ev) {
      if (moved) { moved=false; return; } // bỏ qua nếu kéo
      ev.stopPropagation();
      if (selectedNodeId === n.id) {
        // Click lần 2 → bỏ chọn
        selectedNodeId = null;
      } else {
        selectedNodeId = n.id;
      }
      applyHighlight();
    });

    gn.appendChild(g);
    nEls.push(g);
  });

  // ── Pan & Zoom ──
  var tx=0, ty=0, viewSc=1, pan=false, px=0, py=0;
  svg.addEventListener('mousedown', function(ev) {
    if (ev.target===svg || ev.target.id==='root' || ev.target.id==='ge' || ev.target.id==='gn') {
      pan=true; px=ev.clientX; py=ev.clientY;
    }
  });
  window.addEventListener('mousemove', function(ev) {
    if (!pan) return;
    tx+=ev.clientX-px; ty+=ev.clientY-py;
    px=ev.clientX; py=ev.clientY;
    applyT();
  });
  window.addEventListener('mouseup', function() { pan=false; });
  svg.addEventListener('wheel', function(ev) {
    ev.preventDefault();
    var f = ev.deltaY<0 ? 1.12 : 0.89;
    var rect = svg.getBoundingClientRect();
    var mx = ev.clientX-rect.left, my = ev.clientY-rect.top;
    var newSc = Math.max(0.05, Math.min(8, viewSc*f));
    tx = mx - (mx-tx)*(newSc/viewSc);
    ty = my - (my-ty)*(newSc/viewSc);
    viewSc = newSc;
    applyT();
  }, { passive:false });
  function applyT() {
    root.setAttribute('transform', 'translate('+tx+','+ty+') scale('+viewSc+')');
  }

  // ── Force Simulation ──
  var W=900, H=600, running=true;
  var REP=18000, SPR=0.04, DAMP=0.80, GRAV=0.008;

  function initPos() {
    W = svg.clientWidth || 900;
    H = svg.clientHeight || 600;
    nodes.forEach(function(n, i) {
      var angle = 2*Math.PI*i/nodes.length;
      var r = Math.min(W,H)*0.38;
      n.x = W/2 + r*Math.cos(angle);
      n.y = H/2 + r*Math.sin(angle);
      n.vx = 0; n.vy = 0;
    });
  }

  function simStep() {
    var len = nodes.length;
    nodes.forEach(function(n) { n.vx*=DAMP; n.vy*=DAMP; });
    for (var i=0;i<len;i++) {
      for (var j=i+1;j<len;j++) {
        var a=nodes[i], b=nodes[j];
        var dx=b.x-a.x, dy=b.y-a.y;
        var d2=dx*dx+dy*dy+1;
        var d=Math.sqrt(d2);
        var f=REP/d2;
        var fx=f*dx/d, fy=f*dy/d;
        a.vx-=fx; a.vy-=fy; b.vx+=fx; b.vy+=fy;
      }
    }
    edges.forEach(function(e) {
      var a=nm[e.from], b=nm[e.to];
      if (!a||!b) return;
      var rest = e.type==='contains' ? 140 : 260;
      var dx=b.x-a.x, dy=b.y-a.y;
      var d=Math.sqrt(dx*dx+dy*dy)+0.01;
      var f=SPR*(d-rest);
      var fx=f*dx/d, fy=f*dy/d;
      a.vx+=fx; a.vy+=fy; b.vx-=fx; b.vy-=fy;
    });
    nodes.forEach(function(n) {
      n.vx+=(W/2-n.x)*GRAV; n.vy+=(H/2-n.y)*GRAV;
      n.x+=n.vx; n.y+=n.vy;
    });
  }

  function draw() {
    nodes.forEach(function(n, i) {
      nEls[i].setAttribute('transform', 'translate('+n.x+','+n.y+')');
    });
    edges.forEach(function(e, i) {
      var a=nm[e.from], b=nm[e.to];
      if (!a||!b) return;
      var el=eEls[i];
      el.line.setAttribute('x1',a.x); el.line.setAttribute('y1',a.y);
      el.line.setAttribute('x2',b.x); el.line.setAttribute('y2',b.y);
      if (el.lbl) {
        el.lbl.setAttribute('x',(a.x+b.x)/2);
        el.lbl.setAttribute('y',(a.y+b.y)/2);
      }
    });
  }

  function fitView() {
    if (!nodes.length) return;
    var minX=1e9,minY=1e9,maxX=-1e9,maxY=-1e9;
    nodes.forEach(function(n) {
      minX=Math.min(minX,n.x-70); minY=Math.min(minY,n.y-40);
      maxX=Math.max(maxX,n.x+70); maxY=Math.max(maxY,n.y+40);
    });
    var W2=svg.clientWidth||900, H2=svg.clientHeight||600;
    viewSc = Math.min(W2/(maxX-minX), H2/(maxY-minY), 2)*0.88;
    tx = (W2-(maxX+minX)*viewSc)/2;
    ty = (H2-(maxY+minY)*viewSc)/2;
    applyT();
  }

  function loop() {
    if (running) { simStep(); draw(); }
    requestAnimationFrame(loop);
  }

  // Buttons
  var bFit = document.getElementById('bFit');
  var bRun = document.getElementById('bRun');
  var bSrc = document.getElementById('bSrc');
  if (bFit) bFit.onclick = fitView;
  if (bRun) bRun.onclick = function() {
    running=true;
    setTimeout(function() { running=false; }, 3500);
  };
  if (bSrc) bSrc.onclick = function() {
    var vscodeApi = typeof acquireVsCodeApi !== 'undefined' ? acquireVsCodeApi() : null;
    if (vscodeApi) vscodeApi.postMessage({ command:'openSource' });
  };

  // Start
  setTimeout(function() {
    initPos();
    draw(); // Vẽ ngay lần đầu
    loop();
    setTimeout(function() { running=false; fitView(); }, 3000);
  }, 50);

})();
