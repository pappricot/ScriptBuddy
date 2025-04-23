const setCanvasSize = (canvas) => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  return { width: window.innerWidth, height: window.innerHeight };
};

// Point2D factory
const createPoint2D = (x, y) => ({ x, y });

// Point3D factory
const createPoint3D = (x, y, z) => ({ ...createPoint2D(x, y), z });

// Project a 3D point to 2D using the camera
const project = (point3D, camera) => {
  const t = (camera.x - point3D.x) * camera.z / (camera.z - point3D.z) + camera.x;
  const n = (camera.y - point3D.y) * camera.z / (camera.z - point3D.z) + camera.y;
  return createPoint2D(t, n);
};

// Line3D factory
const createLine3D = (start, end) => ({ start, end });

// Project a 3D line to 2D
const projectLine3D = (line3D, camera) => {
  const start = project(line3D.start, camera);
  const end = project(line3D.end, camera);
  return createLine2D(start, end);
};

// Interpolate along a 3D line
const interpolateLine3D = (line3D, t) => {
  const x = line3D.start.x + (line3D.end.x - line3D.start.x) * t;
  const y = line3D.start.y + (line3D.end.y - line3D.start.y) * t;
  const z = line3D.start.z + (line3D.end.z - line3D.start.z) * t;
  return createPoint3D(x, y, z);
};

// Line2D factory
const createLine2D = (start, end) => ({ start, end });

// Invert a 2D line vertically
const invertLine2D = (line2D, height) => {
  const start = createPoint2D(line2D.start.x, height - line2D.start.y);
  const end = createPoint2D(line2D.end.x, height - line2D.end.y);
  return createLine2D(start, end);
};

// Draw a 2D line on the canvas
const drawLine2D = (line2D, ctx) => {
  ctx.beginPath();
  ctx.moveTo(line2D.start.x, ctx.canvas.height - line2D.start.y);
  ctx.lineTo(line2D.end.x, ctx.canvas.height - line2D.end.y);
  ctx.stroke();
};

// Plane factory
const createPlane = (upperLeft, upperRight, lowerLeft, lowerRight) => ({
  top: createLine3D(upperLeft, upperRight),
  bottom: createLine3D(lowerLeft, lowerRight),
  left: createLine3D(upperLeft, lowerLeft),
  right: createLine3D(upperRight, lowerRight)
});

// Get lines for the plane (grid lines)
const getLines = (plane, mousePercent, numLines, time) => {
  const lines = [];
  const mouseXOffset = 300 * mousePercent.x % 100 / 100;
  const mouseYOffset = 300 * mousePercent.y % 100 / 100;
  const timeOffset = (time / 30) % 1;

  // Vertical lines (influenced by mouse X)
  for (let i = 0; i <= numLines; i++) {
    const t = i / numLines + mouseXOffset / numLines;
    const topPoint = interpolateLine3D(plane.top, t);
    const bottomPoint = interpolateLine3D(plane.bottom, t);
    lines.push(createLine3D(topPoint, bottomPoint));
  }

  // Horizontal lines (influenced by mouse Y and time)
  for (let i = 0; i <= numLines; i++) {
    const t = i / numLines + mouseYOffset / numLines + timeOffset;
    const leftPoint = interpolateLine3D(plane.left, t % 1);
    const rightPoint = interpolateLine3D(plane.right, t % 1);
    lines.push(createLine3D(leftPoint, rightPoint));
  }

  return lines;
};

// Create and manage mouse tracking with smoothing
const createMouseTracker = (canvas, callback) => {
  let point = createPoint2D(0, 0);
  let smooth = createPoint2D(0, 0);
  let percent = createPoint2D(0, 0);
  let smoothPercent = createPoint2D(0, 0);

  document.onmousemove = (e) => {
    const rect = canvas.getBoundingClientRect();
    point = createPoint2D(e.clientX - rect.left, e.clientY - rect.top);
    percent = createPoint2D(point.x / window.innerWidth, point.y / window.innerHeight);
  };

  const smoothLoop = () => {
    smooth = createPoint2D(
      smooth.x + (point.x - smooth.x) / 2,
      smooth.y + (point.y - smooth.y) / 2
    );
    smoothPercent = createPoint2D(smooth.x / window.innerWidth, smooth.y / window.innerHeight);
    callback(smoothLoop);
  };

  smoothLoop();

  return () => smoothPercent;
};

// Create the plane based on window dimensions
const createInitialPlane = (width, height) => {
  const camera = createPoint3D(width / 2, height / 2, -81);
  const e = camera.y - (height / 2 - camera.y) * (camera.z - 100) / camera.z;
  return {
    plane: createPlane(
      createPoint3D(2 * width, e, 100),
      createPoint3D(-width, e, 100),
      createPoint3D(2 * width, height, -80),
      createPoint3D(-width, height, -80)
    ),
    camera
  };
};

// Draw the grid animation
const drawGrid = (ctx, plane, camera, mousePercent, time) => {
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  ctx.strokeStyle = "#FFFFFF";
  ctx.lineWidth = 0.9;

  const lines = getLines(plane, mousePercent, 15, time);
  lines.forEach(line => {
    const projectedLine = projectLine3D(line, camera);
    drawLine2D(projectedLine, ctx);
    drawLine2D(invertLine2D(projectedLine, window.innerHeight), ctx);
  });

  // Draw the horizon line
  ctx.beginPath();
  ctx.moveTo(0, window.innerHeight / 2);
  ctx.lineTo(window.innerWidth, window.innerHeight / 2);
  ctx.stroke();
};

// Main animation loop
const animateGrid = (ctx, plane, camera, getMousePercent, startTime) => {
  const loop = () => {
    const elapsedTime = (Date.now() - startTime) / 1000;
    const mousePercent = getMousePercent();
    drawGrid(ctx, plane, camera, mousePercent, elapsedTime);
    requestAnimationFrame(loop);
  };
  loop();
};

// Initialize the animation
export const initGridAnimation = (canvas) => {
  const ctx = canvas.getContext('2d');
  const { width, height } = setCanvasSize(canvas);
  const { plane, camera } = createInitialPlane(width, height);
  const getMousePercent = createMouseTracker(canvas, requestAnimationFrame);
  const startTime = Date.now();

  animateGrid(ctx, plane, camera, getMousePercent, startTime);

  // Handle window resize
  const resizeHandler = () => {
    const { width, height } = setCanvasSize(canvas);
    const { plane: newPlane, camera: newCamera } = createInitialPlane(width, height);
    animateGrid(ctx, newPlane, newCamera, getMousePercent, startTime);
  };
  window.addEventListener('resize', resizeHandler);

  // Return cleanup function to remove event listener on component unmount
  return () => {
    window.removeEventListener('resize', resizeHandler);
  };
};