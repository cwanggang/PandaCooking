/**
 * Loads the KayKit glTF props and normalizes them so the rest of the renderer
 * can treat them like any other mesh. PRESENTATION ONLY — the world model never
 * sees these; it only knows the StationType (see world/types.ts).
 *
 * Two jobs:
 *   1. Asynchronously load the .gltf files (with their .bin + shared texture)
 *      from /models/ before the game starts. Loading is async, unlike the
 *      synchronous placeholder boxes, so main.ts awaits loadStationModels()
 *      and hands the result to the views.
 *   2. Normalize each model to our grid: KayKit props are authored at a ~2-unit
 *      footprint centered on origin with the base at y=0. We scale each down so
 *      its footprint fits one CELL_SIZE cell, so a model drops onto a cell the
 *      same way a counter box did.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { StationType, FoodType } from '../world/types';
import { CELL_SIZE } from '../world/coords';

/** Target size (largest dimension, world units) for a carryable item, so a
 * carrot reads at a sensible scale held in hand or sitting on a counter. */
const ITEM_SIZE = 0.5;

/**
 * The renderable item atoms: every food plus the plate. The world's `Item`
 * (food | plate-with-contents) is composed from these by itemMesh.ts — a plate
 * mesh is the plate model with its `contents` foods cloned and stacked on top.
 */
export type ItemModelType = FoodType | 'plate';

/**
 * Which glTF file backs each station type. Partial on purpose: stations missing
 * here fall back to the colored placeholder box in kitchenView.ts, so we can
 * adopt real art one station at a time. Paths are root-relative (served from
 * public/models/ by Vite).
 *
 * EXTENSION POINT: add a station's file here as art arrives. To swap which model
 * a station uses (e.g. a corner counter), change the filename here only.
 */
const STATION_MODEL_FILES: Partial<Record<StationType, string>> = {
  counter: '/models/kitchencounter_straight_A.gltf',
  barrel: '/models/crate_carrots.gltf',
  bunBarrel: '/models/crate_buns.gltf',
  pattyBarrel: '/models/crate_steak.gltf',
  lettuceBarrel: '/models/crate_lettuce.gltf',
  cheeseBarrel: '/models/crate_cheese.gltf',
  stove: '/models/stove_single_countertop.gltf',
  trash: '/models/bin/Trashcan.glb',
};

/**
 * Which glTF file backs each renderable item atom. Total (not Partial): every
 * food (and the plate) must have a model, so adding one in types.ts forces you
 * to supply art here. Foods missing from this list get a placeholder box.
 */
const ITEM_MODEL_FILES: Partial<Record<ItemModelType, string>> = {
  carrot: '/models/food_ingredient_carrot.gltf',
  carrotChopped: '/models/food_ingredient_carrot_chopped.gltf',
  carrotPieces: '/models/food_ingredient_carrot_pieces.gltf',
  bun: '/models/food_ingredient_bun.gltf',
  patty: '/models/food_ingredient_burger_uncooked.gltf',
  pattyCooked: '/models/food_ingredient_burger_cooked.gltf',
  lettuce: '/models/food_ingredient_lettuce.gltf',
  lettuceSlice: '/models/food_ingredient_lettuce_slice.gltf',
  cheese: '/models/food_ingredient_cheese.gltf',
  cheeseSlice: '/models/food_ingredient_cheese_slice.gltf',
  plate: '/models/plate.gltf',
};

/**
 * Decorative props that aren't carryable items or stations of their own — they
 * sit on top of a station mesh (the dish rack, the cutting board, the knife
 * stuck in it). Seated/scaled like items (not floor-filling); `size` is the
 * target largest-dimension in world units so each prop reads at a sane scale.
 */
const PROP_MODEL_FILES: Record<PropType, { url: string; size: number }> = {
  dishrack: { url: '/models/dishrack_plates.gltf', size: 0.65 },
  cuttingboard: { url: '/models/cuttingboard.gltf', size: 0.85 },
  knife: { url: '/models/knife.gltf', size: 0.45 },
  pan: { url: '/models/pan_A.gltf', size: 0.45 },
};

/** A loaded, normalized prop ready to be cloned once per cell. */
export type StationModels = Map<StationType, THREE.Object3D>;

/** A loaded, normalized item ready to be cloned (held or placed on a counter). */
export type ItemModels = Map<ItemModelType, THREE.Object3D>;

/** A decorative prop type that rides on top of a station mesh. */
export type PropType = 'dishrack' | 'cuttingboard' | 'knife' | 'pan';

/** A loaded, normalized decoration ready to be cloned and seated on a station. */
export type PropModels = Map<PropType, THREE.Object3D>;

/**
 * Load every mapped station model in parallel, normalize it, and return the
 * map. Resolves once all are ready so views build synchronously afterward.
 */
export async function loadStationModels(): Promise<StationModels> {
  const loader = new GLTFLoader();
  const models: StationModels = new Map();

  const entries = Object.entries(STATION_MODEL_FILES) as [
    StationType,
    string,
  ][];

  await Promise.all(
    entries.map(async ([station, url]) => {
      const gltf = await loader.loadAsync(url);
      models.set(station, normalize(gltf.scene));
    }),
  );

  return models;
}

/** Colored placeholder boxes for food types that have no glTF model yet. */
const PLACEHOLDER_FOOD_COLORS: Partial<Record<ItemModelType, number>> = {
  bun: 0xf4d03f,
  patty: 0xb03a2e,
  pattyCooked: 0x6b2c1e,
  lettuce: 0x52be80,
  lettuceSlice: 0x6fbf73,
  cheese: 0xf7dc6f,
  cheeseSlice: 0xf9e076,
};

function buildPlaceholder(food: ItemModelType): THREE.Object3D {
  const color = PLACEHOLDER_FOOD_COLORS[food] ?? 0x888888;
  const geo = new THREE.BoxGeometry(0.3, 0.15, 0.3);
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color }));
  mesh.position.y = 0.075;
  mesh.castShadow = true;
  const wrapper = new THREE.Group();
  wrapper.add(mesh);
  return wrapper;
}

/** All food types plus 'plate'. Built from the union of FoodType | 'plate'. */
const ALL_ITEM_TYPES: ItemModelType[] = [
  'carrot', 'carrotChopped', 'carrotPieces',
  'bun', 'patty', 'pattyCooked',
  'lettuce', 'lettuceSlice', 'cheese', 'cheeseSlice',
  'plate',
];

/**
 * Load every item model in parallel, normalize it for carrying/placing, and
 * return the map. Like loadStationModels but items are smaller and re-seated so
 * their base sits at y=0 (KayKit authors food meshes centered on their origin,
 * not resting on it). Missing glTF entries get placeholder boxes.
 */
export async function loadItemModels(): Promise<ItemModels> {
  const loader = new GLTFLoader();
  const models: ItemModels = new Map();

  const entries = Object.entries(ITEM_MODEL_FILES) as [ItemModelType, string][];

  await Promise.all(
    entries.map(async ([item, url]) => {
      try {
        const gltf = await loader.loadAsync(url);
        models.set(item, normalizeItem(gltf.scene));
      } catch {
        models.set(item, buildPlaceholder(item));
      }
    }),
  );

  for (const item of ALL_ITEM_TYPES) {
    if (!models.has(item)) {
      models.set(item, buildPlaceholder(item));
    }
  }

  return models;
}

/**
 * Load the player model (the red panda) and normalize its footprint to one cell.
 */
export async function loadPlayerModel(): Promise<THREE.Object3D> {
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync('/models/panda/panda_cooking_red.glb');
  return normalize(gltf.scene);
}

/**
 * Load decorative props (the dish rack) the same way as items — item-scaled and
 * re-seated so the base sits at y=0 — so a caller can drop one onto a station's
 * surface (e.g. a counter top) with just a position.
 */
export async function loadPropModels(): Promise<PropModels> {
  const loader = new GLTFLoader();
  const models: PropModels = new Map();

  const entries = Object.entries(PROP_MODEL_FILES) as [
    PropType,
    { url: string; size: number },
  ][];

  await Promise.all(
    entries.map(async ([prop, { url, size }]) => {
      const gltf = await loader.loadAsync(url);
      models.set(prop, normalizeItem(gltf.scene, size));
    }),
  );

  return models;
}

/**
 * Scale a freshly loaded model so its horizontal footprint fits within one
 * cell, and enable shadows on every mesh in it. We fit by the LARGER of the
 * width/depth so a slightly deep prop (the stove has a control panel sticking
 * out) never spills into a neighboring cell. The model keeps its base on y=0
 * because KayKit authors them that way and uniform scaling about the origin
 * preserves that.
 */
function normalize(scene: THREE.Object3D): THREE.Object3D {
  const box = new THREE.Box3().setFromObject(scene);
  const size = new THREE.Vector3();
  box.getSize(size);

  const footprint = Math.max(size.x, size.z);
  if (footprint > 0) {
    const scale = CELL_SIZE / footprint;
    scene.scale.setScalar(scale);
  }

  scene.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });

  return scene;
}

/**
 * Normalize a carryable item: scale so its largest dimension is ITEM_SIZE, then
 * re-seat it inside a wrapper group so the item's base sits at the group's
 * origin (y=0) and it's centered on x/z. Callers then just position the group at
 * a surface (counter top) or hand point and the item rests correctly — no
 * per-call offset math. Returns the wrapper.
 */
function normalizeItem(
  scene: THREE.Object3D,
  targetSize: number = ITEM_SIZE,
): THREE.Object3D {
  const size = new THREE.Vector3();
  new THREE.Box3().setFromObject(scene).getSize(size);

  const largest = Math.max(size.x, size.y, size.z);
  if (largest > 0) scene.scale.setScalar(targetSize / largest);

  // Recenter on x/z and drop the base to y=0 (food meshes are centered on their
  // own origin, so min.y is negative before this).
  const box = new THREE.Box3().setFromObject(scene);
  const center = new THREE.Vector3();
  box.getCenter(center);
  scene.position.set(-center.x, -box.min.y, -center.z);

  scene.traverse((obj) => {
    if (obj instanceof THREE.Mesh) obj.castShadow = true;
  });

  const wrapper = new THREE.Group();
  wrapper.add(scene);
  return wrapper;
}
