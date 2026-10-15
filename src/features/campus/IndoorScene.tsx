import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import { PLAN_LOTS, type PlanGeometry } from '@/data/map-plans';
import { toWorld, WORLD_SCALE, type PlanPosition } from './model';
export interface CampusCamera {
  zoom: (factor: number) => void;
  reset: () => void;
  rotate: () => void;
  follow: () => void;
}
interface Props {
  plan: PlanGeometry;
  dark: boolean;
  aerial: boolean;
  position: PlanPosition;
  follow: boolean;
  selectedLot: number | null;
  onSelectLot: (index: number) => void;
  cameraRef: React.RefObject<CampusCamera | null>;
  onFailure: () => void;
}
export default function IndoorScene(props: Props) {
  const host = useRef<HTMLDivElement>(null),
    latest = useRef(props);
  latest.current = props;
  useEffect(() => {
    const element = host.current!;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'low-power' });
    } catch {
      latest.current.onFailure();
      return;
    }
    const { plan, dark } = props,
      lots = PLAN_LOTS[plan.id];
    const [vx, vy, vw, vh] = plan.viewBox.split(' ').map(Number);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.setClearColor(dark ? '#101012' : '#eef3f8');
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    element.appendChild(renderer.domElement);
    renderer.domElement.setAttribute('aria-hidden', 'true');
    renderer.domElement.dataset.campusCanvas = 'true';
    renderer.domElement.dataset.planId = plan.id;
    renderer.domElement.dataset.lotCount = String(lots.length);
    const scene = new THREE.Scene(),
      materials: THREE.Material[] = [],
      geometries: THREE.BufferGeometry[] = [],
      textures: THREE.Texture[] = [];
    const mat = (color: string, extra = {}) => {
      const m = new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...extra });
      materials.push(m);
      return m;
    };
    const make = (
      geometry: THREE.BufferGeometry,
      material: THREE.Material,
      x: number,
      y: number,
      z: number,
      parent: THREE.Object3D = scene,
    ) => {
      const m = new THREE.Mesh(geometry, material);
      m.position.set(x, y, z);
      m.castShadow = true;
      m.receiveShadow = true;
      parent.add(m);
      return m;
    };
    const boxGeo = new THREE.BoxGeometry(1, 1, 1),
      sphereGeo = new THREE.IcosahedronGeometry(1, 1);
    geometries.push(boxGeo, sphereGeo);
    const box = (
      w: number,
      h: number,
      d: number,
      material: THREE.Material,
      x: number,
      y: number,
      z: number,
      parent?: THREE.Object3D,
    ) => {
      const m = make(boxGeo, material, x, y, z, parent);
      m.scale.set(w, h, d);
      return m;
    };
    const sphere = (
      r: number,
      material: THREE.Material,
      x: number,
      y: number,
      z: number,
      parent?: THREE.Object3D,
    ) => {
      const m = make(sphereGeo, material, x, y, z, parent);
      m.scale.setScalar(r);
      return m;
    };
    scene.add(new THREE.HemisphereLight('#e5f4ff', dark ? '#2c3035' : '#b9b2a6', dark ? 2 : 2.8));
    const sun = new THREE.DirectionalLight('#fff5e2', dark ? 1.8 : 2.5);
    sun.position.set(-15, 40, 20);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, far: 100 });
    sun.shadow.bias = -0.002;
    scene.add(sun);
    const cream = mat(dark ? '#6d6a66' : '#fff4e3'),
      floor = mat(dark ? '#303033' : '#e3e6e7'),
      accent = mat(plan.color),
      grey = mat(dark ? '#45454b' : '#899bad');
    const glass = mat(dark ? '#3c5459' : '#c5e0e8');
    const shapeFrom = (path: string, depth: number, material: THREE.Material) => {
      const paths = new SVGLoader().parse(
        `<svg xmlns="http://www.w3.org/2000/svg"><path d="${path}" /></svg>`,
      ).paths;
      for (const p of paths)
        for (const s of SVGLoader.createShapes(p)) {
          const points = s.extractPoints(32);
          const convert = (a: THREE.Vector2[]) =>
            a.map(
              (v) =>
                new THREE.Vector2(
                  (v.x - vx - vw / 2) * WORLD_SCALE,
                  (vy + vh / 2 - v.y) * WORLD_SCALE,
                ),
            );
          const transformed = new THREE.Shape(convert(points.shape));
          for (const hole of points.holes) transformed.holes.push(new THREE.Path(convert(hole)));
          const geo = new THREE.ExtrudeGeometry(transformed, { depth, bevelEnabled: false });
          geometries.push(geo);
          const m = make(geo, material, 0, 0, 0);
          m.rotation.x = -Math.PI / 2;
        }
    };
    shapeFrom(plan.outline, 0.12, floor);
    for (const s of plan.structures) shapeFrom(s.path, 0.38, grey);
    const names = [...lots.map((l) => String(l[0])), ...plan.structures.map((s) => s.label || '')];
    const grid = Math.ceil(Math.sqrt(names.length)),
      cell = 128,
      atlas = document.createElement('canvas');
    atlas.width = atlas.height = grid * cell;
    const ctx = atlas.getContext('2d');
    if (ctx)
      names.forEach((text, i) => {
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `700 ${i < lots.length ? 80 : 24}px sans-serif`;
        const x = ((i % grid) + 0.5) * cell,
          y = (Math.floor(i / grid) + 0.5) * cell;
        const words = text.split(' / ');
        words.forEach((w, j) =>
          ctx.fillText(w, x, y + (j - (words.length - 1) / 2) * 24, cell - 8),
        );
      });
    const texture = new THREE.CanvasTexture(atlas);
    texture.colorSpace = THREE.SRGBColorSpace;
    textures.push(texture);
    const labelMaterial = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    materials.push(labelMaterial);
    const label = (
      index: number,
      x: number,
      z: number,
      y: number,
      width: number,
      depth: number,
    ) => {
      const geo = new THREE.PlaneGeometry(width, depth),
        uv = geo.attributes.uv;
      for (let i = 0; i < uv.count; i++)
        uv.setXY(
          i,
          ((index % grid) + uv.getX(i)) / grid,
          1 - (Math.floor(index / grid) + 1 - uv.getY(i)) / grid,
        );
      geometries.push(geo);
      const m = make(geo, labelMaterial, x, y, z);
      m.rotation.x = -Math.PI / 2;
      m.castShadow = false;
    };
    const pickable: THREE.Mesh[] = [];
    lots.forEach(([code, x, y, w, h], index) => {
      const p = toWorld(plan, { x: x + w / 2, y: y + h / 2 }),
        bw = w * WORLD_SCALE,
        bd = h * WORLD_SCALE;
      const base = box(bw - 0.04, 1.2, bd - 0.04, cream, p.x, 0.72, p.z);
      base.userData.lotIndex = index;
      pickable.push(base);
      const top = box(bw - 0.075, 0.12, bd - 0.075, accent, p.x, 1.38, p.z);
      top.userData.lotIndex = index;
      pickable.push(top);
      box(Math.max(0.1, bw - 0.22), 0.5, 0.035, glass, p.x, 0.7, p.z + bd / 2);
      label(index, p.x, p.z, 1.46, Math.min(bw * 0.9, 1.7), Math.min(bd * 0.9, 1.3));
    });
    plan.structures.forEach((s, i) => {
      if (s.x !== undefined && s.y !== undefined) {
        const p = toWorld(plan, { x: s.x, y: s.y });
        label(lots.length + i, p.x, p.z, 0.4, 3.8, 1.4);
      }
    });
    const highlightGeo = new THREE.BufferGeometry();
    geometries.push(highlightGeo);
    const highlightMaterial = new THREE.LineBasicMaterial({ color: '#1fa5ff' });
    materials.push(highlightMaterial);
    const highlight = new THREE.LineLoop(highlightGeo, highlightMaterial);
    scene.add(highlight);
    const avatar = new THREE.Group();
    scene.add(avatar);
    const skin = mat('#efc09a'),
      blue = mat('#168bd4'),
      navy = mat('#233b55'),
      hair = mat('#44342f');
    const leftLeg = box(0.25, 0.65, 0.28, navy, -0.21, 0.55, 0, avatar),
      rightLeg = box(0.25, 0.65, 0.28, navy, 0.21, 0.55, 0, avatar);
    box(0.31, 0.17, 0.48, cream, -0.21, 0.19, 0.1, avatar);
    box(0.31, 0.17, 0.48, cream, 0.21, 0.19, 0.1, avatar);
    const body = new THREE.CapsuleGeometry(0.38, 0.48, 4, 12);
    geometries.push(body);
    make(body, blue, 0, 1.22, 0, avatar);
    sphere(0.42, skin, 0, 2.03, 0.02, avatar);
    sphere(0.44, hair, 0, 2.22, -0.09, avatar);
    sphere(0.2, hair, -0.28, 2.23, 0.15, avatar);
    box(0.52, 0.6, 0.25, navy, 0, 1.2, -0.38, avatar);
    const armL = box(0.18, 0.65, 0.2, cream, -0.47, 1.17, 0, avatar),
      armR = box(0.18, 0.65, 0.2, cream, 0.47, 1.17, 0, avatar);
    sphere(0.13, skin, -0.47, 0.8, 0, avatar);
    sphere(0.13, skin, 0.47, 0.8, 0, avatar);
    sphere(0.045, navy, -0.14, 2.05, 0.41, avatar);
    sphere(0.045, navy, 0.14, 2.05, 0.41, avatar);
    avatar.scale.setScalar(0.7);
    const initial = toWorld(plan, props.position);
    avatar.position.set(initial.x, 0.14, initial.z);
    const ring = new THREE.RingGeometry(0.7, 0.84, 36);
    geometries.push(ring);
    const halo = make(
      ring,
      mat('#3cc9ff', { emissive: '#168bdf', emissiveIntensity: 0.8, side: THREE.DoubleSide }),
      0,
      0.03,
      0,
      avatar,
    );
    halo.rotation.x = -Math.PI / 2;
    const camera = new THREE.OrthographicCamera(-20, 20, 20, -20, 0.1, 200);
    camera.position.set(20, 34, 34);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, 0);
    controls.minZoom = 0.65;
    controls.maxZoom = 5;
    controls.minPolarAngle = 0.05;
    controls.maxPolarAngle = 1.12;
    controls.screenSpacePanning = false;
    controls.mouseButtons.LEFT = THREE.MOUSE.PAN;
    controls.mouseButtons.RIGHT = THREE.MOUSE.ROTATE;
    controls.touches.ONE = THREE.TOUCH.PAN;
    controls.touches.TWO = THREE.TOUCH.DOLLY_ROTATE;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0,
      lastTime = 0,
      visible = true,
      dirty = true,
      previousAerial = false,
      previousLot: number | null | undefined = undefined;
    const offset = new THREE.Vector3();
    const focus = (x: number, z: number) => {
      offset.copy(camera.position).sub(controls.target);
      controls.target.set(x, 0, z);
      camera.position.copy(controls.target).add(offset);
      dirty = true;
    };
    const reset = () => {
      camera.zoom = 1;
      controls.target.set(0, 0, 0);
      camera.position.set(latest.current.aerial ? 0 : 20, 34, latest.current.aerial ? 0.01 : 34);
      camera.updateProjectionMatrix();
      dirty = true;
    };
    props.cameraRef.current = {
      zoom(f) {
        camera.zoom = THREE.MathUtils.clamp(camera.zoom * f, 0.65, 5);
        camera.updateProjectionMatrix();
        dirty = true;
      },
      reset,
      rotate() {
        offset
          .copy(camera.position)
          .sub(controls.target)
          .applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 8);
        camera.position.copy(controls.target).add(offset);
        dirty = true;
      },
      follow() {
        focus(avatar.position.x, avatar.position.z);
      },
    };
    const resize = new ResizeObserver(() => {
      const w = element.clientWidth,
        h = element.clientHeight,
        aspect = w / Math.max(h, 1);
      const half = Math.max(
        vh * WORLD_SCALE * 0.65,
        ((vw * 0.87 + vh * 0.5) * WORLD_SCALE * 0.53) / aspect,
      );
      camera.left = -half * aspect;
      camera.right = half * aspect;
      camera.top = half;
      camera.bottom = -half;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      dirty = true;
    });
    resize.observe(element);
    const intersection = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      dirty = true;
    });
    intersection.observe(element);
    const change = () => {
      dirty = true;
    };
    controls.addEventListener('change', change);
    const lose = (e: Event) => {
      e.preventDefault();
      latest.current.onFailure();
    };
    renderer.domElement.addEventListener('webglcontextlost', lose);
    const pointer = new THREE.Vector2(),
      ray = new THREE.Raycaster();
    let down = { x: 0, y: 0 };
    const downHandler = (e: PointerEvent) => {
      down = { x: e.clientX, y: e.clientY };
    };
    const clickHandler = (e: MouseEvent) => {
      if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        (-(e.clientY - rect.top) / rect.height) * 2 + 1,
      );
      ray.setFromCamera(pointer, camera);
      const hit = ray.intersectObjects(pickable)[0];
      if (hit) latest.current.onSelectLot(hit.object.userData.lotIndex);
    };
    renderer.domElement.addEventListener('pointerdown', downHandler);
    renderer.domElement.addEventListener('click', clickHandler);
    const projected = new THREE.Vector3();
    function draw(time: number) {
      frame = requestAnimationFrame(draw);
      if (!visible || document.hidden || time - lastTime < 33) return;
      const dt = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;
      const current = latest.current;
      if (current.aerial !== previousAerial) {
        previousAerial = current.aerial;
        reset();
      }
      if (current.selectedLot !== previousLot) {
        previousLot = current.selectedLot;
        highlight.visible = current.selectedLot !== null;
        const lot = current.selectedLot !== null ? lots[current.selectedLot] : null;
        if (lot) {
          const [_, x, y, w, h] = lot;
          const corners = [
            { x, y },
            { x: x + w, y },
            { x: x + w, y: y + h },
            { x, y: y + h },
          ].map((p) => {
            const world = toWorld(plan, p);
            return new THREE.Vector3(world.x, 1.5, world.z);
          });
          highlightGeo.setFromPoints(corners);
          const p = toWorld(plan, { x: x + w / 2, y: y + h / 2 });
          focus(p.x, p.z);
        }
        dirty = true;
      }
      const destination = toWorld(plan, current.position),
        dx = destination.x - avatar.position.x,
        dz = destination.z - avatar.position.z,
        moving = Math.hypot(dx, dz) > 0.015;
      if (moving) {
        if (reduced.matches) avatar.position.set(destination.x, 0.14, destination.z);
        else {
          const step = Math.min(1, dt * 4);
          avatar.position.x += dx * step;
          avatar.position.z += dz * step;
          avatar.rotation.y = Math.atan2(dx, dz);
        }
        if (current.follow) focus(avatar.position.x, avatar.position.z);
        dirty = true;
      }
      const stride = moving && !reduced.matches ? Math.sin(time / 90) * 0.35 : 0;
      leftLeg.rotation.x = armR.rotation.x = stride;
      rightLeg.rotation.x = armL.rotation.x = -stride;
      if (!dirty && !moving) return;
      controls.update();
      renderer.render(scene, camera);
      for (const label of element.parentElement?.querySelectorAll<HTMLElement>('[data-plan-x]') ??
        []) {
        const p = toWorld(plan, { x: Number(label.dataset.planX), y: Number(label.dataset.planY) });
        projected.set(p.x, Number(label.dataset.elevation || 1.8), p.z).project(camera);
        label.style.left = `${((projected.x + 1) / 2) * element.clientWidth}px`;
        label.style.top = `${((-projected.y + 1) / 2) * element.clientHeight}px`;
        label.style.visibility =
          Math.abs(projected.x) < 1.1 && Math.abs(projected.y) < 1.1 ? 'visible' : 'hidden';
      }
      dirty = false;
    }
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      intersection.disconnect();
      controls.dispose();
      props.cameraRef.current = null;
      renderer.domElement.removeEventListener('webglcontextlost', lose);
      renderer.domElement.removeEventListener('pointerdown', downHandler);
      renderer.domElement.removeEventListener('click', clickHandler);
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
      sun.shadow.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, [props.plan.id, props.dark]);
  return <div className="campus-canvas" ref={host} />;
}
