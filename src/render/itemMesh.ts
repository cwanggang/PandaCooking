/**
 * Builds the Object3D for a world `Item`, shared by both places an item is
 * drawn: resting on a counter (ItemsView) and carried in the panda's hands
 * (PlayerView). Keeping it in one place means a plate looks the same whether
 * it's on a surface or in hand.
 *
 * A food is just its model. A plate is the plate model with each of its
 * `contents` foods cloned and stacked on top, so a plate piled with carrots
 * reads as exactly that. PRESENTATION ONLY — never mutates the model or world.
 */

import * as THREE from 'three';
import type { Item } from '../world/types';
import type { ItemModels } from './models';

/** Height of the first food above the plate's base, so it sits in the well. */
const PLATE_FOOD_BASE_Y = 0.05;
/** Vertical gap between successive stacked foods. */
const PLATE_FOOD_STEP = 0.08;

/**
 * Returns a fresh Object3D for `item`, ready to be positioned by the caller
 * (its base sits at y=0, like the underlying models). Clones models so callers
 * can have many independent instances.
 */
export function buildItemMesh(item: Item, models: ItemModels): THREE.Object3D {
  if (item.kind === 'food') {
    const model = models.get(item.food);
    if (!model) return new THREE.Group(); // no art (shouldn't happen)
    return model.clone();
  }

  // Plate: the plate model, with its contents stacked on top.
  const group = new THREE.Group();
  const plateModel = models.get('plate');
  if (plateModel) group.add(plateModel.clone());

  item.contents.forEach((food, i) => {
    const foodModel = models.get(food);
    if (!foodModel) return;
    const mesh = foodModel.clone();
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
