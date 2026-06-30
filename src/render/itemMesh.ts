/**
 * Builds the Object3D for a world `Item`, shared by both places an item is
 * drawn: resting on a counter (ItemsView) and carried in the panda's hands
 * (PlayerView). Keeping it in one place means a plate looks the same whether
 * it's on a surface or in hand.
 *
 * A food is just its model. A plate is the plate model with each of its
 * `contents` foods cloned and stacked on top, so a plate piled with carrots
 * reads as exactly that. PRESENTATION ONLY — never mutates the model or world.
 *
 * The bun is the one food drawn two ways: a single bun in hand, but an OPENED
 * bun (bottom half + upside-down top half, side by side) once it's set on a
 * surface — passing `placed: true`. On a plate the bun is always opened, with
 * the other fillings stacked on its bottom half, so it reads as a burger.
 */

import * as THREE from 'three';
import type { FoodType, Item } from '../world/types';
import type { ItemModels } from './models';

/** Height of the first food above the plate's base, so it sits in the well. */
const PLATE_FOOD_BASE_Y = 0.05;
/** Vertical gap between successive stacked foods. */
const PLATE_FOOD_STEP = 0.08;
/** How far each half of an opened bun sits to either side of center. */
const BUN_HALF_OFFSET = 0.17;

/** Clone the plain single-model mesh for a renderable food, or null if missing. */
function foodMesh(food: FoodType, models: ItemModels): THREE.Object3D | null {
  const model = models.get(food);
  return model ? model.clone() : null;
}

/**
 * An opened bun: the bottom half and the (flipped, dome-down) top half sitting
 * side by side. Returns the group and the y at which a filling should rest on
 * top of the bottom half (so other ingredients pile into the burger).
 */
function buildOpenBun(models: ItemModels): {
  group: THREE.Object3D;
  fillingBaseY: number;
} {
  const group = new THREE.Group();
  let fillingBaseY = PLATE_FOOD_BASE_Y;

  const bottom = models.get('bunBottom')?.clone();
  if (bottom) {
    bottom.position.x = -BUN_HALF_OFFSET;
    group.add(bottom);
    // Fillings stack starting at the top of the bottom half.
    fillingBaseY = new THREE.Box3().setFromObject(bottom).max.y;
  }

  const top = models.get('bunTop')?.clone();
  if (top) {
    top.rotation.x = Math.PI; // flip it dome-down (the cut face points up)
    // The flip rotates the mesh below y=0; re-seat its base back onto the surface.
    top.position.y -= new THREE.Box3().setFromObject(top).min.y;
    top.position.x = BUN_HALF_OFFSET;
    group.add(top);
  }

  return { group, fillingBaseY };
}

/**
 * Returns a fresh Object3D for `item`, ready to be positioned by the caller
 * (its base sits at y=0, like the underlying models). Clones models so callers
 * can have many independent instances. `placed` is true when the item is resting
 * on a surface (vs carried), which only changes how a lone bun is drawn.
 */
export function buildItemMesh(
  item: Item,
  models: ItemModels,
  placed = false,
): THREE.Object3D {
  if (item.kind === 'food') {
    if (item.food === 'bun' && placed) return buildOpenBun(models).group;
    return foodMesh(item.food, models) ?? new THREE.Group(); // no art (shouldn't happen)
  }

  // Plate: the plate model, with its contents arranged on top.
  const group = new THREE.Group();
  const plateModel = models.get('plate');
  if (plateModel) group.add(plateModel.clone());

  // A plate holding a bun reads as a burger: open the bun and pile the other
  // fillings onto its bottom half.
  if (item.contents.includes('bun')) {
    const { group: bun, fillingBaseY } = buildOpenBun(models);
    group.add(bun);
    item.contents
      .filter((food) => food !== 'bun')
      .forEach((food, i) => {
        const mesh = foodMesh(food, models);
        if (!mesh) return;
        mesh.position.set(-BUN_HALF_OFFSET, fillingBaseY + i * PLATE_FOOD_STEP, 0);
        group.add(mesh);
      });
    return group;
  }

  // Otherwise just stack the foods in the middle of the plate.
  item.contents.forEach((food, i) => {
    const mesh = foodMesh(food, models);
    if (!mesh) return;
    mesh.position.y = PLATE_FOOD_BASE_Y + i * PLATE_FOOD_STEP;
    group.add(mesh);
  });

  return group;
}

/**
 * A stable string identity for an item (or its absence), so a view can tell
 * when the mesh it's showing is stale and must be rebuilt. It encodes a plate's
 * full contents, so adding a carrot to a resting plate changes the signature
 * and triggers a rebuild.
 */
export function itemSignature(item: Item | null): string {
  if (item === null) return '';
  if (item.kind === 'food') return `food:${item.food}`;
  return `plate:[${item.contents.join(',')}]`;
}
