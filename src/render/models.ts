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
import type { StationType, ItemType } from '../world/types';
import { CELL_SIZE } from '../world/coords';

/** Target size (largest dimension, world units) for a carryable item, so a
 * carrot reads at a sensible scale held in hand or sitting on a counter. */
const ITEM_SIZE = 0.5;

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
  stove: '/models/stove_single.gltf',
};

/**
 * Which glTF file backs each carryable item. Total (not Partial): every ItemType
 * must have a model, so adding an item in types.ts forces you to supply one here.
 */
const ITEM_MODEL_FILES: Record<ItemType, string> = {
  carrot: '/models/food_ingredient_carrot.gltf',
};

/** A loaded, normalized prop ready to be cloned once per cell. */
export type StationModels = Map<StationType, THREE.Object3D>;

/** A loaded, normalized item ready to be cloned (held or placed on a counter). */
export type ItemModels = Map<ItemType, THREE.Object3D>;

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

/**
 * Load every item model in parallel, normalize it for carrying/placing, and
 * return the map. Like loadStationModels but items are smaller and re-seated so
 * their base sits at y=0 (KayKit authors food meshes centered on their origin,
 * not resting on it).
 */
export async function loadItemModels(): Promise<ItemModels> {
  const loader = new GLTFLoader();
  const models: ItemModels = new Map();

  const entries = Object.entries(ITEM_MODEL_FILES) as [ItemType, string][];

  await Promise.all(
    entries.map(async ([item, url]) => {
      const gltf = await loader.loadAsync(url);
      models.set(item, normalizeItem(gltf.scene));
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
function normalizeItem(scene: THREE.Object3D): THREE.Object3D {
  const size = new THREE.Vector3();
  new THREE.Box3().setFromObject(scene).getSize(size);

  const largest = Math.max(size.x, size.y, size.z);
  if (largest > 0) scene.scale.setScalar(ITEM_SIZE / largest);

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
