type CollisionRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type SpawnPoint = {
  x: number;
  y: number;
  type: string;
  name: string;
  facing: string;
};

type MapData = {
  widthTiles: number;
  heightTiles: number;
  tileWidth: number;
  tileHeight: number;
  worldWidth: number;
  worldHeight: number;
  collisions: CollisionRect[];
  playerSpawns: SpawnPoint[];
  enemySpawns: SpawnPoint[];
  groundTileData: number[];
};

type TiledProperty = {
  name: string;
  type: string;
  value: boolean | string | number;
};

type TiledObject = {
  id: number;
  name: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  properties?: TiledProperty[];
};

type TiledTileLayer = {
  name: string;
  type: "tilelayer";
  data: number[];
  width: number;
  height: number;
};

type TiledObjectGroup = {
  name: string;
  type: "objectgroup";
  objects: TiledObject[];
};

type TiledLayer = TiledTileLayer | TiledObjectGroup;

type TiledMap = {
  width: number;
  height: number;
  tilewidth: number;
  tileheight: number;
  layers: TiledLayer[];
};

const findProperty = (
  properties: TiledProperty[] | undefined,
  propertyName: string
): TiledProperty | undefined => {
  if (!properties) {
    return undefined;
  }
  return properties.find((prop) => prop.name === propertyName);
};

const isObjectGroup = (layer: TiledLayer): layer is TiledObjectGroup => {
  return layer.type === "objectgroup";
};

const isTileLayer = (layer: TiledLayer): layer is TiledTileLayer => {
  return layer.type === "tilelayer";
};

const extractCollisions = (layers: TiledLayer[]): CollisionRect[] => {
  const collisionLayer = layers.find(
    (layer) => layer.name === "Collision" && isObjectGroup(layer)
  );

  if (!collisionLayer || !isObjectGroup(collisionLayer)) {
    return [];
  }

  const collisions: CollisionRect[] = [];

  for (const obj of collisionLayer.objects) {
    const collidableProp = findProperty(obj.properties, "collidable");

    if (collidableProp && collidableProp.value === true) {
      collisions.push({
        x: obj.x,
        y: obj.y,
        width: obj.width,
        height: obj.height,
      });
    }
  }

  return collisions;
};

const extractFacing = (properties: TiledProperty[] | undefined): string => {
  const facingProp = findProperty(properties, "facing");

  if (facingProp && typeof facingProp.value === "string") {
    return facingProp.value;
  }

  return "down";
};

const extractSpawnsByType = (
  layers: TiledLayer[],
  spawnType: string
): SpawnPoint[] => {
  const spawnsLayer = layers.find(
    (layer) => layer.name === "Spawns" && isObjectGroup(layer)
  );

  if (!spawnsLayer || !isObjectGroup(spawnsLayer)) {
    return [];
  }

  const spawns: SpawnPoint[] = [];

  for (const obj of spawnsLayer.objects) {
    if (obj.type === spawnType) {
      spawns.push({
        x: obj.x,
        y: obj.y,
        type: obj.type,
        name: obj.name,
        facing: extractFacing(obj.properties),
      });
    }
  }

  return spawns;
};

const extractGroundTileData = (layers: TiledLayer[]): number[] => {
  const groundLayer = layers.find(
    (layer) => layer.name === "Ground" && isTileLayer(layer)
  );

  if (!groundLayer || !isTileLayer(groundLayer)) {
    return [];
  }

  return groundLayer.data;
};

const validateTiledMap = (json: unknown): TiledMap => {
  if (typeof json !== "object" || json === null) {
    throw new Error("Map JSON is not a valid object");
  }

  const map = json as Record<string, unknown>;

  if (typeof map["width"] !== "number" || typeof map["height"] !== "number") {
    throw new Error("Map JSON missing valid width/height");
  }

  if (
    typeof map["tilewidth"] !== "number" ||
    typeof map["tileheight"] !== "number"
  ) {
    throw new Error("Map JSON missing valid tilewidth/tileheight");
  }

  if (!Array.isArray(map["layers"])) {
    throw new Error("Map JSON missing layers array");
  }

  return json as TiledMap;
};

export const loadMap = async (mapUrl: string): Promise<MapData> => {
  const response = await fetch(mapUrl);

  if (!response.ok) {
    throw new Error(
      `Failed to fetch map from ${mapUrl}: ${response.status} ${response.statusText}`
    );
  }

  const json: unknown = await response.json();
  const tiledMap = validateTiledMap(json);

  const widthTiles = tiledMap.width;
  const heightTiles = tiledMap.height;
  const tileWidth = tiledMap.tilewidth;
  const tileHeight = tiledMap.tileheight;
  const worldWidth = widthTiles * tileWidth;
  const worldHeight = heightTiles * tileHeight;

  const collisions = extractCollisions(tiledMap.layers);
  const playerSpawns = extractSpawnsByType(tiledMap.layers, "player");
  const enemySpawns = extractSpawnsByType(tiledMap.layers, "enemy");
  const groundTileData = extractGroundTileData(tiledMap.layers);

  return {
    widthTiles,
    heightTiles,
    tileWidth,
    tileHeight,
    worldWidth,
    worldHeight,
    collisions,
    playerSpawns,
    enemySpawns,
    groundTileData,
  };
};

export type { CollisionRect, MapData, SpawnPoint };
