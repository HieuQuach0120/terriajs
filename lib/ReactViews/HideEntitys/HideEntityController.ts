import MapNavigationItemController from "../../ViewModels/MapNavigation/MapNavigationItemController";
import { action, makeObservable, observable } from "mobx";
import ViewState from "../../ReactViewModels/ViewState";
import { GLYPHS } from "../../Styled/Icon";
import ScreenSpaceEventHandler from "terriajs-cesium/Source/Core/ScreenSpaceEventHandler";
import ScreenSpaceEventType from "terriajs-cesium/Source/Core/ScreenSpaceEventType";
import Cartesian3 from "terriajs-cesium/Source/Core/Cartesian3";
import Cartographic from "terriajs-cesium/Source/Core/Cartographic";
import Ellipsoid from "terriajs-cesium/Source/Core/Ellipsoid";
import CustomDataSource from "terriajs-cesium/Source/DataSources/CustomDataSource";
import Entity from "terriajs-cesium/Source/DataSources/Entity";
import PolygonHierarchy from "terriajs-cesium/Source/Core/PolygonHierarchy";
import Color from "terriajs-cesium/Source/Core/Color";
import CallbackProperty from "terriajs-cesium/Source/DataSources/CallbackProperty";
import JulianDate from "terriajs-cesium/Source/Core/JulianDate";
import HeightReference from "terriajs-cesium/Source/Scene/HeightReference";
import Ray from "terriajs-cesium/Source/Core/Ray";
import IntersectionTests from "terriajs-cesium/Source/Core/IntersectionTests";
import Plane from "terriajs-cesium/Source/Core/Plane";
import SceneMode from "terriajs-cesium/Source/Scene/SceneMode";
import Math1 from "terriajs-cesium/Source/Core/Math";
import Cartesian2 from "terriajs-cesium/Source/Core/Cartesian2";
import SceneTransforms from "terriajs-cesium/Source/Scene/SceneTransforms";
import Cesium3DTileFeature from "terriajs-cesium/Source/Scene/Cesium3DTileFeature";

export const HIDE_ENTITY_TOOL_ID = "hide-entity";

type OnSelectionComplete = (
  entityIds: string[],
  polygonCoords?: number[][]
) => void;

export class HideEntitysController extends MapNavigationItemController {
  // Thêm observable state để theo dõi trạng thái active
  @observable private _isActive: boolean = false;

  // Drawing state
  private inputHandler?: ScreenSpaceEventHandler;
  private drawDataSource?: CustomDataSource;
  private drawing = false;
  private drawPositions: Cartesian3[] = [];
  private movingPosition?: Cartesian3; // current mouse position while moving

  private prevDepthTestAgainstTerrain?: boolean;
  private prevPickTranslucentDepth?: boolean;
  private prevRequestRenderMode?: boolean;

  // Callback khi kết thúc vẽ
  public onSelectionComplete?: OnSelectionComplete;

  constructor(private viewState: ViewState) {
    super();
    makeObservable(this);
  }

  @action.bound
  activate() {
    this._isActive = true;
    this.startDrawing();
    super.activate();
  }

  @action.bound
  deactivate() {
    this._isActive = false;

    // Cleanup
    this.stopDrawing(true);

    // Hide feature info panel if it's showing
    this.viewState.featureInfoPanelIsVisible = false;

    super.deactivate();
  }

  // Bắt đầu vẽ polygon bằng chuột
  private startDrawing() {
    const cesium = this.viewState.terria.currentViewer as any;
    if (!cesium || cesium.type !== "Cesium") {
      console.error("Cesium viewer is not available");
      return;
    }

    const scene = cesium.scene;
    const canvas = scene.canvas;

    // Disable default double-click behavior
    cesium.cesiumWidget.screenSpaceEventHandler.removeInputAction(
      ScreenSpaceEventType.LEFT_DOUBLE_CLICK
    );

    // Keep scene flags as-is to avoid occluding OSM Buildings during drawing
    // If needed, consider enabling these temporarily with user preference.
    // this.prevDepthTestAgainstTerrain = scene.globe?.depthTestAgainstTerrain;
    // if (scene.globe) scene.globe.depthTestAgainstTerrain = true;
    // this.prevPickTranslucentDepth = scene.pickTranslucentDepth;
    // scene.pickTranslucentDepth = true;
    // this.prevRequestRenderMode = scene.requestRenderMode;
    // scene.requestRenderMode = false;

    // Prepare datasource to render polygon drawing
    if (!this.drawDataSource) {
      this.drawDataSource = new CustomDataSource("hide-entity-draw");
      cesium.dataSources.add(this.drawDataSource);
    } else {
      this.drawDataSource.entities.removeAll();
    }

    this.drawPositions = [];
    this.movingPosition = undefined;
    this.drawing = true;

    // Polygon entity with dynamic hierarchy (positions + moving point)
    const drawingEntity = new Entity({
      id: "drawing-polygon",
      polygon: {
        hierarchy: new CallbackProperty(() => {
          const positions = [...this.drawPositions];
          if (this.movingPosition && positions.length > 0)
            positions.push(this.movingPosition);
          if (positions.length < 3) return undefined;
          return new PolygonHierarchy(positions);
        }, false),
        material: Color.fromBytes(255, 140, 0, 100), // orange with alpha
        outline: true,
        outlineColor: Color.fromBytes(255, 140, 0, 255),
        // clamp preview polygon to ground for visual agreement with picks
        heightReference: HeightReference.CLAMP_TO_GROUND
      }
    });

    this.drawDataSource.entities.add(drawingEntity);

    // Input handler
    if (this.inputHandler) {
      this.inputHandler.destroy();
    }
    this.inputHandler = new ScreenSpaceEventHandler(canvas);

    // LEFT_CLICK -> add fixed point
    this.inputHandler.setInputAction((click: any) => {
      if (!this.drawing) return;

      const pos = this.pickPositionImproved(click.position);
      if (pos) {
        this.drawPositions.push(pos);
        // Add visual marker for clicked point (clamp to ground)
        this.addPointMarker(pos, this.drawPositions.length);
      }
    }, ScreenSpaceEventType.LEFT_CLICK);

    // MOUSE_MOVE -> update moving point
    this.inputHandler.setInputAction((movement: any) => {
      if (!this.drawing) return;

      const pos = this.pickPositionImproved(movement.endPosition);
      this.movingPosition = pos || undefined;
    }, ScreenSpaceEventType.MOUSE_MOVE);

    // RIGHT_CLICK -> finish drawing
    this.inputHandler.setInputAction((click: any) => {
      click.preventDefault?.();
      this.finishDrawing();
    }, ScreenSpaceEventType.RIGHT_CLICK);

    // DOUBLE_CLICK -> finish drawing
    this.inputHandler.setInputAction((click: any) => {
      click.preventDefault?.();
      this.finishDrawing();
    }, ScreenSpaceEventType.LEFT_DOUBLE_CLICK);

    // ESC key -> cancel drawing
    document.addEventListener("keydown", this.handleKeyDown);
  }

  // Thêm visual markers cho các điểm đã click
  private addPointMarker(position: Cartesian3, index: number) {
    if (!this.drawDataSource) return;

    const cartographic = Cartographic.fromCartesian(position);

    this.drawDataSource.entities.add(
      new Entity({
        id: `point-marker-${index}`,
        position: position,
        point: {
          pixelSize: 8,
          color: Color.YELLOW,
          outlineColor: Color.BLACK,
          outlineWidth: 2,
          heightReference: HeightReference.NONE
        },
        label: {
          text: `${index}`,
          font: "12pt monospace",
          fillColor: Color.WHITE,
          outlineColor: Color.BLACK,
          outlineWidth: 2,
          style: 0, // FILL_AND_OUTLINE
          pixelOffset: new Cartesian3(0, -30, 0),
          heightReference: HeightReference.NONE
        }
      })
    );
  }

  // Cải thiện thuật toán pick position: luôn chiếu xuống terrain (globe)
  private pickPositionImproved(screenPos: any): Cartesian3 | undefined {
    const cesium = this.viewState.terria.currentViewer as any;
    const scene = cesium.scene;
    const camera = scene.camera;

    const ray = camera.getPickRay(screenPos);

    // 1) Terrain pick luôn ưu tiên (đặt điểm đúng dưới con trỏ trên mặt đất/địa hình)
    if (ray) {
      const ground = scene.globe?.pick?.(ray, scene);
      if (ground) return ground;
    }

    // 2) Ellipsoid fallback (khi không có terrain)
    const ellipsoidPos = camera.pickEllipsoid(screenPos, Ellipsoid.WGS84);
    if (ellipsoidPos) return ellipsoidPos;

    // 3) Ray-ellipsoid fallback
    if (ray) {
      const hit = IntersectionTests.rayEllipsoid(ray, Ellipsoid.WGS84);
      if (hit) return Ray.getPoint(ray, hit.start);
    }

    return undefined;
  }

  private handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape" && this.drawing) {
      this.cancelDrawing();
    }
  };

  // Hủy vẽ
  private cancelDrawing() {
    if (!this.drawing) return;

    this.drawing = false;
    this.stopDrawing(true);
  }

  // Kết thúc vẽ và chọn entity bên trong polygon
  private async finishDrawing() {
    if (!this.drawing) return;

    this.drawing = false;

    // Cần >=3 điểm (không tính điểm đang di chuyển)
    if (this.drawPositions.length < 3) {
      this.stopDrawing(false);
      return;
    }

    await this.getPickedFeaturesInPolygon(this.drawPositions);
    // Convert to lon/lat coordinates for polygon
    // const polygonCoords = this.drawPositions.map(pos => {
    //   const cartographic = Cartographic.fromCartesian(pos);
    //   return [
    //     (cartographic.longitude * 180) / Math.PI,
    //     (cartographic.latitude * 180) / Math.PI
    //   ];
    // });

    // const entityIds = this.getEntityIdsInsidePolygon(this.drawPositions);

    // // Also get all data sources info for debugging
    // this.logDataSourcesInfo();

    // // Callback nếu có, else log
    // try {
    //   if (this.onSelectionComplete) {
    //     this.onSelectionComplete(entityIds, polygonCoords);
    //   } else {
    //   }
    // } catch (error) {
    //   console.error("Error in onSelectionComplete callback:", error);
    // }

    // Xóa hết polygon/point và deactive tool ngay lập tức
    this.deactivate();
    return;
  }

  // Debug: Log thông tin về data sources
  private logDataSourcesInfo() {
    const cesium = this.viewState.terria.currentViewer as any;
    if (!cesium || cesium.type !== "Cesium") return;

    try {
      const dataSources = cesium.dataSources;

      for (let i = 0; i < dataSources.length; i++) {
        const ds = dataSources.get(i);
      }
    } catch (error) {
      console.error("Error logging data sources:", error);
    }

    try {
      const viewerEntities = cesium.entities;
    } catch (error) {
      console.error("Error logging viewer entities:", error);
    }

    // Log workbench items (TerriaJS specific)
    try {
      const terria = this.viewState.terria;
      terria.workbench.items.forEach((item: any, index: number) => {
        console.log(`Workbench item ${index}:`, {
          name: item.name,
          type: item.typeName,
          show: item.show,
          isLoading: item.isLoading
        });
      });
    } catch (error) {
      console.error("Error logging terria items:", error);
    }
  }

  // Hủy vẽ, dọn input handler và datasource
  private stopDrawing(clearAll: boolean) {
    this.drawing = false;

    // Remove keydown listener
    document.removeEventListener("keydown", this.handleKeyDown);

    const cesium = this.viewState.terria.currentViewer as any;
    const scene = cesium?.scene;

    if (this.inputHandler) {
      this.inputHandler.destroy();
      this.inputHandler = undefined;
    }

    this.movingPosition = undefined;
    this.drawPositions = [];

    if (this.drawDataSource && cesium && cesium.type === "Cesium") {
      if (clearAll) {
        this.drawDataSource.entities.removeAll();
        cesium.dataSources.remove(this.drawDataSource);
        this.drawDataSource = undefined;
      }
    }

    // No scene flag changes to restore (we kept them untouched during drawing)
  }

  // Tính danh sách ID của entity nằm trong polygon (theo lon/lat)
  private getEntityIdsInsidePolygon(polygonPositions: Cartesian3[]): string[] {
    try {
      const polygonLL = polygonPositions.map((c) => {
        // const cartographic = Cartesian3.toCartographic(c);
        const cartographic = Cartographic.fromCartesian(c);
        return [
          cartographic.longitude, // longitude in degrees
          cartographic.latitude // latitude in degrees
        ];
      });

      const entities = this.getAllEntities();

      const time = JulianDate.now();
      const result: string[] = [];

      for (const entity of entities) {
        const position = this.getEntityRepresentativePosition(entity, time);
        if (!position) continue;

        // const cartographic = Cartesian3.toCartographic(position);
        const cartographic = Cartographic.fromCartesian(position);
        const point = [
          cartographic.longitude, // longitude in degrees
          cartographic.latitude // latitude in degrees
        ];

        if (this.pointInPolygon(point, polygonLL)) {
          if (entity.id != null) {
            result.push(String(entity.id));
            console.log(`Entity ${entity.id} is inside polygon:`, {
              name: entity.name,
              position: point
            });
          }
        }
      }

      return result;
    } catch (error) {
      console.error("Error getting entities inside polygon:", error);
      return [];
    }
  }

  // Lấy representative position của entity (cải thiện)
  private getEntityRepresentativePosition(
    entity: Entity,
    time: JulianDate
  ): Cartesian3 | undefined {
    try {
      // Try position property first
      if (entity.position) {
        const value = entity.position.getValue(time);
        if (value && value instanceof Cartesian3) return value;
      }
    } catch (error) {
      // Silent fail
    }

    try {
      // If it's a polygon -> use centroid
      if (entity.polygon?.hierarchy) {
        const hierarchy = entity.polygon.hierarchy.getValue(time);
        if (
          hierarchy &&
          hierarchy.positions &&
          Array.isArray(hierarchy.positions) &&
          hierarchy.positions.length > 0
        ) {
          const positions = hierarchy.positions;
          let x = 0,
            y = 0,
            z = 0;
          for (const pos of positions) {
            x += pos.x;
            y += pos.y;
            z += pos.z;
          }
          return new Cartesian3(
            x / positions.length,
            y / positions.length,
            z / positions.length
          );
        }
      }
    } catch (error) {
      // Silent fail
    }

    try {
      // If it's a polyline -> use middle point
      if (entity.polyline?.positions) {
        const positions = entity.polyline.positions.getValue(time);
        if (positions && Array.isArray(positions) && positions.length > 0) {
          return positions[Math.floor(positions.length / 2)];
        }
      }
    } catch (error) {
      // Silent fail
    }

    try {
      // If it's a point
      if (entity.point) {
        return entity.position?.getValue(time);
      }
    } catch (error) {
      // Silent fail
    }

    return undefined;
  }

  // Lấy toàn bộ entities từ viewer (cải thiện)
  private getAllEntities(): Entity[] {
    const cesium = this.viewState.terria.currentViewer as any;
    if (!cesium || cesium.type !== "Cesium") return [];

    const allEntities: Entity[] = [];

    try {
      // Get entities from all data sources
      const dataSources = cesium.dataSources;
      for (let i = 0; i < dataSources.length; i++) {
        const dataSource = dataSources.get(i);
        if (dataSource?.entities && dataSource.show !== false) {
          const entities = dataSource.entities.values;
          for (const entity of entities) {
            if (entity.show !== false) {
              allEntities.push(entity);
            }
          }
        }
      }
    } catch (error) {
      console.warn("Error getting entities from data sources:", error);
    }

    try {
      // Get entities directly from viewer
      if (cesium.entities) {
        const entities = cesium.entities.values;
        for (const entity of entities) {
          if (entity.show !== false) {
            allEntities.push(entity);
          }
        }
      }
    } catch (error) {
      console.warn("Error getting entities from viewer:", error);
    }

    // Filter out our drawing entities and invalid entities
    const filteredEntities = allEntities.filter(
      (entity) =>
        entity.id !== "drawing-polygon" &&
        !entity.id?.toString().startsWith("point-marker-") &&
        entity.id != null
    );

    console.log(
      `Found ${filteredEntities.length} valid entities (filtered from ${allEntities.length})`
    );
    return filteredEntities;
  }

  // Thuật toán point-in-polygon (ray casting) - cải thiện
  private pointInPolygon(point: number[], polygon: number[][]): boolean {
    if (polygon.length < 3) return false;

    const x = point[0];
    const y = point[1];

    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i][0];
      const yi = polygon[i][1];
      const xj = polygon[j][0];
      const yj = polygon[j][1];

      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
        inside = !inside;
      }
    }

    return inside;
  }

  get glyph(): any {
    return GLYPHS.remove;
  }

  get viewerMode() {
    return undefined;
  }

  get visible() {
    return !this.viewState.hideMapUi && super.visible;
  }

  // Thay đổi getter active để trả về trạng thái thực tế
  get active() {
    return this._isActive;
  }

  // Public method để set callback
  public setOnSelectionComplete(callback: OnSelectionComplete) {
    this.onSelectionComplete = callback;
  }

  // Public method để lấy entities trong polygon (không cần vẽ)
  public getEntitiesInPolygon(polygonPositions: Cartesian3[]): string[] {
    return this.getEntityIdsInsidePolygon(polygonPositions);
  }

  public async getPickedFeaturesInPolygon(polygonPoints: Cartesian3[]) {
    console.log("polygonPoints", polygonPoints);
    if (polygonPoints.length < 3) return [];

    // In ra tọa độ các point
    console.log("Danh sách tọa độ các point:");
    polygonPoints.forEach((point, index) => {
      const cartographic = Cartographic.fromCartesian(point);
      const lon = Math1.toDegrees(cartographic.longitude);
      const lat = Math1.toDegrees(cartographic.latitude);
      const height = cartographic.height;
      console.log(
        `Point ${index + 1}: Lon=${lon.toFixed(6)}, Lat=${lat.toFixed(6)}, Height=${height.toFixed(2)}`
      );
    });

    const cesium = this.viewState.terria.currentViewer as any;
    const scene = cesium.scene;
    const pickedFeatures: any[] = [];
    const uniqueFeatures = new Set();

    // Tạo grid points trong polygon để pick features
    const newPoints = polygonPoints.slice(0, -1);
    const boundingBox = await this.getBoundingBox(newPoints);
    const step = 0.0001; // Khoảng cách giữa các điểm (có thể điều chỉnh)

    // Đảm bảo scene đã render xong trước khi pick
    scene.render();
    for (let lon = boundingBox.minLon; lon <= boundingBox.maxLon; lon += step) {
      for (
        let lat = boundingBox.minLat;
        lat <= boundingBox.maxLat;
        lat += step
      ) {
        const cartesian = Cartesian3.fromDegrees(lon, lat);
        // Kiểm tra xem điểm có nằm trong polygon không
        if (this.isPointInPolygon(cartesian, polygonPoints)) {
          // Convert cartesian to screen position
          const screenPosition = SceneTransforms?.wgs84ToWindowCoordinates(
            scene,
            cartesian
          );
          if (screenPosition) {
            // Làm tròn screenPosition thành số nguyên giống movement.position
            const roundedPosition = new Cartesian2(
              screenPosition.x,
              screenPosition.y
            );

            // Đảm bảo scene đã render xong trước khi pick
            scene.render();
            // Pick feature tại vị trí này
            const pickedFeature = await this.onGet3DTitle(roundedPosition);
            if (pickedFeature) {
              // Chỉ lấy Cesium3DTileFeature, bỏ qua GroundPrimitive và Entity khác
              if (pickedFeature instanceof Cesium3DTileFeature) {
                // Tạo unique key cho Cesium3DTileFeature
                const feature = pickedFeature as any;
                const uniqueKey = `${feature._content._tileset._url}_${feature._batchId}`;

                if (!uniqueFeatures.has(uniqueKey)) {
                  uniqueFeatures.add(uniqueKey);
                  pickedFeatures.push({
                    feature: pickedFeature,
                    position: cartesian,
                    screenPosition: roundedPosition
                  });
                  // console.log('Found Cesium3DTileFeature:', pickedFeature);
                }
              }
            }
          }
        }
      }
    }

    console.log("Picked features in polygon:", pickedFeatures);
    return pickedFeatures;
  }

  public getBoundingBox(points: Cartesian3[]) {
    let minLon = Infinity,
      maxLon = -Infinity;
    let minLat = Infinity,
      maxLat = -Infinity;

    points.forEach((point) => {
      const cartographic = Cartographic.fromCartesian(point);
      const lon = Math1.toDegrees(cartographic.longitude);
      const lat = Math1.toDegrees(cartographic.latitude);

      minLon = Math.min(minLon, lon);
      maxLon = Math.max(maxLon, lon);
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
    });

    return { minLon, maxLon, minLat, maxLat };
  }

  public isPointInPolygon(point: Cartesian3, polygon: Cartesian3[]) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x,
        yi = polygon[i].y;
      const xj = polygon[j].x,
        yj = polygon[j].y;

      if (
        yi > point.y !== yj > point.y &&
        point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi
      ) {
        inside = !inside;
      }
    }
    return inside;
  }

  public onGet3DTitle(pos: Cartesian2): Cesium3DTileFeature | undefined {
    const cesium = this.viewState.terria.currentViewer as any;
    const scene = cesium.scene;
    const picked = scene.pick(pos);
    if (picked && picked instanceof Cesium3DTileFeature) return picked;
    // Fallback tránh lỗi instanceof khi bundling khác context
    if (
      picked &&
      typeof (picked as any).getProperty === "function" &&
      (picked as any).tileset
    ) {
      return picked as Cesium3DTileFeature;
    }
    return undefined;
  }
}
