(() => {
  const canvas = document.getElementById("c");
  const ctx = canvas.getContext("2d");

  const scoreEl = document.getElementById("score");
  const movesEl = document.getElementById("moves");
  const resetBtn = document.getElementById("resetBtn");

  const N = 8;                 // grid size
  const TYPES = 6;             // tile types
  const PAD = 18;
  let tileSize = 0;

  let grid = [];
  let selected = null;
  let score = 0;
  let moves = 0;
  let busy = false;

  function randType(){ return Math.floor(Math.random() * TYPES); }

  function resize(){
    // keep canvas crisp but responsive
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
    const size = Math.min(720, Math.floor(rect.width * dpr));
    canvas.width = size;
    canvas.height = size;
    tileSize = (size - PAD*2) / N;
    draw();
  }

  function inBounds(x,y){ return x>=0 && x<N && y>=0 && y<N; }

  function makeGrid(){
    grid = Array.from({length:N}, ()=> Array.from({length:N}, ()=> randType()));
    // remove initial matches by re-rolling
    for(let y=0;y<N;y++){
      for(let x=0;x<N;x++){
        let guard=0;
        while(hasMatchAt(x,y) && guard++<10){
          grid[y][x]=randType();
        }
      }
    }
  }

  function hasMatchAt(x,y){
    const t = grid[y][x];
    // horizontal
    let c=1;
    for(let i=x-1;i>=0 && grid[y][i]===t;i--) c++;
    for(let i=x+1;i<N && grid[y][i]===t;i++) c++;
    if(c>=3) return true;
    // vertical
    c=1;
    for(let i=y-1;i>=0 && grid[i][x]===t;i--) c++;
    for(let i=y+1;i<N && grid[i][x]===t;i++) c++;
    return c>=3;
  }

  function findMatches(){
    const mark = Array.from({length:N}, ()=> Array(N).fill(false));

    // horizontal scans
    for(let y=0;y<N;y++){
      let run=1;
      for(let x=1;x<=N;x++){
        const same = x<N && grid[y][x]===grid[y][x-1];
        if(same) run++;
        if(!same){
          if(run>=3){
            for(let k=0;k<run;k++) mark[y][x-1-k]=true;
          }
          run=1;
        }
      }
    }
    // vertical scans
    for(let x=0;x<N;x++){
      let run=1;
      for(let y=1;y<=N;y++){
        const same = y<N && grid[y][x]===grid[y-1][x];
        if(same) run++;
        if(!same){
          if(run>=3){
            for(let k=0;k<run;k++) mark[y-1-k][x]=true;
          }
          run=1;
        }
      }
    }

    const cells=[];
    for(let y=0;y<N;y++) for(let x=0;x<N;x++) if(mark[y][x]) cells.push({x,y});
    return cells;
  }

  function swap(a,b){
    const t = grid[a.y][a.x];
    grid[a.y][a.x] = grid[b.y][b.x];
    grid[b.y][b.x] = t;
  }

  function neighbors(a,b){
    return Math.abs(a.x-b.x)+Math.abs(a.y-b.y)===1;
  }

  async function resolve(){
    busy = true;
    while(true){
      const matches = findMatches();
      if(matches.length===0) break;

      // score
      score += matches.length * 10;
      scoreEl.textContent = String(score);

      // clear
      matches.forEach(({x,y})=> grid[y][x] = -1);
      draw();
      await sleep(120);

      // drop
      for(let x=0;x<N;x++){
        let write = N-1;
        for(let y=N-1;y>=0;y--){
          if(grid[y][x] !== -1){
            grid[write][x] = grid[y][x];
            write--;
          }
        }
        while(write>=0){
          grid[write][x] = randType();
          write--;
        }
      }
      draw();
      await sleep(120);
    }
    busy = false;
  }

  function sleep(ms){ return new Promise(r=>setTimeout(r, ms)); }

  function draw(){
    if(!ctx) return;
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0,0,w,h);

    // board background
    roundRect(ctx, 8, 8, w-16, h-16, 18);
    ctx.fillStyle = "rgba(255,255,255,.03)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.10)";
    ctx.stroke();

    for(let y=0;y<N;y++){
      for(let x=0;x<N;x++){
        const t = grid[y]?.[x] ?? 0;
        const px = PAD + x*tileSize;
        const py = PAD + y*tileSize;

        // tile
        roundRect(ctx, px+4, py+4, tileSize-8, tileSize-8, 14);

        // color palette (no fixed brand colors; just distinct)
        const col = tileColor(t);
        ctx.fillStyle = col.fill;
        ctx.fill();

        ctx.strokeStyle = col.stroke;
        ctx.lineWidth = 2;
        ctx.stroke();

        // selection ring
        if(selected && selected.x===x && selected.y===y){
          roundRect(ctx, px+2, py+2, tileSize-4, tileSize-4, 14);
          ctx.strokeStyle = "rgba(143,211,255,.8)";
          ctx.lineWidth = 3;
          ctx.stroke();
        }
      }
    }
  }

  function tileColor(t){
    // simple harmonious palette via HSL
    const hue = (t * 360 / TYPES + 210) % 360;
    return {
      fill: `hsla(${hue}, 65%, 55%, 0.78)`,
      stroke: `hsla(${hue}, 75%, 70%, 0.25)`
    };
  }

  function roundRect(c, x, y, w, h, r){
    c.beginPath();
    c.moveTo(x+r, y);
    c.arcTo(x+w, y, x+w, y+h, r);
    c.arcTo(x+w, y+h, x, y+h, r);
    c.arcTo(x, y+h, x, y, r);
    c.arcTo(x, y, x+w, y, r);
    c.closePath();
  }

  function pointerToCell(clientX, clientY){
    const rect = canvas.getBoundingClientRect();
    const x = (clientX - rect.left) * (canvas.width / rect.width);
    const y = (clientY - rect.top) * (canvas.height / rect.height);
    const gx = Math.floor((x - PAD) / tileSize);
    const gy = Math.floor((y - PAD) / tileSize);
    if(!inBounds(gx,gy)) return null;
    return {x:gx,y:gy};
  }

  async function handlePick(cell){
    if(busy || !cell) return;
    if(!selected){
      selected = cell;
      draw();
      return;
    }
    if(selected.x===cell.x && selected.y===cell.y){
      selected = null; draw(); return;
    }
    if(!neighbors(selected, cell)){
      selected = cell; draw(); return;
    }

    // attempt swap; if no match revert
    swap(selected, cell);
    moves++;
    movesEl.textContent = String(moves);
    draw();
    await sleep(80);

    const ok = findMatches().length > 0;
    if(!ok){
      swap(selected, cell);
      draw();
    }else{
      selected = null;
      await resolve();
    }
    selected = null;
    draw();
  }

  function reset(){
    score = 0; moves = 0;
    scoreEl.textContent = "0";
    movesEl.textContent = "0";
    selected = null;
    makeGrid();
    draw();
  }

  function bind(){
    canvas.addEventListener("click", (e)=>{
      handlePick(pointerToCell(e.clientX, e.clientY));
    });

    canvas.addEventListener("touchstart", (e)=>{
      const t = e.touches[0];
      handlePick(pointerToCell(t.clientX, t.clientY));
    }, {passive:true});

    window.addEventListener("resize", resize);
    resetBtn.addEventListener("click", reset);
  }

  // start
  makeGrid();
  bind();
  // Wait a tick so CSS layout is ready then size
  setTimeout(resize, 0);
})();