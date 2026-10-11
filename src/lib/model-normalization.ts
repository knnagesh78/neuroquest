import { Box3, Vector3, type Object3D } from "three";

export function modelTransform(object: Object3D, targetSize = 1.5) {
  object.updateMatrixWorld(true);
  const box = new Box3().setFromObject(object);
  const size = box.getSize(new Vector3());
  const center = box.getCenter(new Vector3());
  const maximum = Math.max(size.x, size.y, size.z);
  if (
    box.isEmpty() ||
    !Number.isFinite(maximum) ||
    maximum <= 0 ||
    ![center.x, center.y, center.z].every(Number.isFinite)
  )
    throw new Error("The model has no usable geometry.");
  return {
    scale: targetSize / maximum,
    offset: [-center.x, -center.y, -center.z] as [number, number, number],
  };
}
