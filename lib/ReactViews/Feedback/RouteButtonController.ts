import { action, makeObservable } from "mobx";
import { GLYPHS } from "../../Styled/Icon";
import MapNavigationItemController from "../../ViewModels/MapNavigation/MapNavigationItemController";
import ViewState from "../../ReactViewModels/ViewState";
import Cartesian3 from "terriajs-cesium/Source/Core/Cartesian3";
import Entity from "terriajs-cesium/Source/DataSources/Entity";
import PolygonHierarchy from "terriajs-cesium/Source/Core/PolygonHierarchy";
import Color from "terriajs-cesium/Source/Core/Color";
import HeightReference from "terriajs-cesium/Source/Scene/HeightReference";
import ClassificationType from "terriajs-cesium/Source/Scene/ClassificationType";
import ConstantProperty from "terriajs-cesium/Source/DataSources/ConstantProperty";
import HeadingPitchRange from "terriajs-cesium/Source/Core/HeadingPitchRange";
import Matrix4 from "terriajs-cesium/Source/Core/Matrix4";
import Math from "terriajs-cesium/Source/Core/Math";
import CustomDataSource from "terriajs-cesium/Source/DataSources/CustomDataSource";
import BoundingSphere from "terriajs-cesium/Source/Core/BoundingSphere";
import Intersect from "terriajs-cesium/Source/Core/Intersect";
import proj4 from "proj4";
import ScreenSpaceEventHandler from "terriajs-cesium/Source/Core/ScreenSpaceEventHandler";
import ScreenSpaceEventType from "terriajs-cesium/Source/Core/ScreenSpaceEventType";
import TerriaFeature from "../../Models/Feature/Feature";
import PickedFeatures from "../../Map/PickedFeatures/PickedFeatures";
import JulianDate from "terriajs-cesium/Source/Core/JulianDate";
// import { Intersect } from "terriajs-cesium";
// import Cesium from "../../Models/Cesium";

export const ROUTE_TOOL_ID = "route";
enum EntityPropertyTypes {
  SUBDISTRICT_WAY = "subdistrict-way"
}

const TableInfoNames = [
  "elementType",
  "elementId",
  "cesium#estimatedHeight",
  "cesium#longitude",
  "cesium#latitude",
  "building",
  "name",
  "name:en",
  "addr:city",
  "addr:country",
  "addr:housenumber",
  "addr:street",
  "addr:subdistrict"
];

// Interface cho dữ liệu subdistrict
export interface SubdistrictDataTypes {
  mPolygonLoop: {
    curve: {
      point: number[][]; // [x, y, z]
    };
  };
  color?: number[]; // [r, g, b, a]
  propertySet?: {
    property: any;
  };
}

export class RouteButtonController extends MapNavigationItemController {
  private subdistrictData: SubdistrictDataTypes[] = [];
  private routeDataSource?: CustomDataSource;

  constructor(
    private viewState: ViewState,
    data?: SubdistrictDataTypes[]
  ) {
    super();
    makeObservable(this);
    if (data) {
      this.subdistrictData = data;
    }
    // Binding Event
    this.initialize = this.initialize.bind(this);
  }

  get glyph(): any {
    return GLYPHS.location;
  }

  get viewerMode() {
    return undefined;
  }

  @action.bound
  activate() {
    const cesium = this.viewState.terria.currentViewer;
    if (cesium && cesium.type === "Cesium") {
      this.drawSubdistrictEntity();
    }
    super.activate();
  }

  async initialize(): Promise<void> {
    const cesium = this.viewState.terria.currentViewer;
    const canvas = (cesium as any).scene.canvas;
    const inputHandler = new ScreenSpaceEventHandler(canvas);
    inputHandler.setInputAction((item: any) => {
      const pickedFeature = (cesium as any).scene.pick(item.position);

      if (!pickedFeature || !pickedFeature.id) return;

      const entity = pickedFeature.id as Entity;

      // Kiểm tra xem entity có thuộc về routeDataSource của chúng ta không
      if (
        !this.routeDataSource ||
        !this.routeDataSource.entities.contains(entity)
      )
        return;

      // Kiểm tra xem có phải entity của chúng ta không
      if (
        entity.properties?.getValue(JulianDate.now()).type ===
        EntityPropertyTypes.SUBDISTRICT_WAY
      ) {
        console.log("Click vào entity của chúng ta:", entity);
        this.showFeatureInfo(entity);
      }
    }, ScreenSpaceEventType.LEFT_CLICK);
  }

  private drawSubdistrictEntity() {
    const cesium = this.viewState.terria.currentViewer;
    if (!cesium || cesium.type !== "Cesium") {
      console.error("Cesium viewer is not available");
      return;
    }

    // Sử dụng dữ liệu đã được truyền vào hoặc dữ liệu mẫu
    const subdistrictData = this.subdistrictData;
    if (!subdistrictData || subdistrictData.length < 1) return;

    let allPositions: Cartesian3[] = [];
    let targetFly = new Cartesian3(0, 0, 0);
    const dataSources = (cesium as any).dataSources;
    const scene = (cesium as any).scene;

    // Prepare or clear a dedicated datasource for route entities
    if (!this.routeDataSource) {
      this.routeDataSource = new CustomDataSource("route");
      dataSources.add(this.routeDataSource);
    } else {
      this.routeDataSource.entities.removeAll();
    }

    subdistrictData.forEach((data, index) => {
      // Chuyển đổi từ UTM sang tọa độ địa lý (longitude, latitude)
      const convertPositions = data.mPolygonLoop.curve.point.map((point) => {
        // Giả sử point[0] là longitude, point[1] là latitude (đã được convert từ TerriaMap)
        const { longitude, latitude } = this.utmToLongLat(point[0], point[1]);
        // const longitude = point[0];
        // const latitude = point[1];
        return Cartesian3.fromDegrees(longitude, latitude, point[2] || 0);
      });

      // Lưu tất cả các điểm để kiểm tra khung nhìn
      allPositions = [...allPositions, ...convertPositions];
      if (index === subdistrictData.length - 1) {
        targetFly = convertPositions[0];
      }

      const entity = new Entity({
        name: "Thông tin đường",
        polygon: {
          hierarchy: new PolygonHierarchy(convertPositions),
          material: data.color
            ? Color.fromBytes(...data.color)
            : Color.fromBytes(255, 0, 0, 255),
          // Sử dụng heightReference để vật thể nằm trên mặt đất
          heightReference: HeightReference.CLAMP_TO_GROUND,
          // Vẫn giữ outline nhưng đảm bảo nó cũng nằm trên mặt đất
          outline: true,
          outlineColor: Color.BLACK,
          // Chỉ định classificationType để xác định cách vật thể tương tác với địa hình
          classificationType: ClassificationType.TERRAIN
        },
        description: new ConstantProperty(
          this.renderStrTable(data.propertySet?.property)
        ),
        properties: {
          type: EntityPropertyTypes.SUBDISTRICT_WAY
        }
      });
      this.routeDataSource!.entities.add(entity);
    });

    // Kiểm tra xem entity có nằm trong khung nhìn hiện tại không
    const isEntityInView = this.isEntityInCurrentView(allPositions);
    this.initialize();
    if (!isEntityInView) {
      scene.camera.lookAt(
        targetFly,
        new HeadingPitchRange(
          Math.toRadians(13.08), // heading
          Math.toRadians(-29.07), // pitch
          1000 // range (khoảng cách từ camera đến điểm đích)
        )
      );

      // Reset control camera after set lookAt
      scene.camera.lookAtTransform(Matrix4.IDENTITY);
    }
  }

  private showFeatureInfo(entity: Entity) {
    console.log("entity", entity);
    // Tạo TerriaFeature từ Entity để hiển thị trong FeatureInfoPanel
    const feature = new TerriaFeature({
      id: entity.id,
      name: entity.name,
      description: entity.description,
      properties: entity.properties,
      position: entity.position
    });
    console.log("feature", feature);

    // Tạo PickedFeatures để hiển thị trong FeatureInfoPanel
    const pickedFeatures = new PickedFeatures();
    pickedFeatures.features.push(feature);
    pickedFeatures.isLoading = false;
    pickedFeatures.allFeaturesAvailablePromise = Promise.resolve();
    console.log("pickedFeatures", pickedFeatures);

    const terria = this.viewState.terria;

    // Gắn tạm catalog item để vượt qua filter trong FeatureInfoPanel
    (feature as any)._catalogItem =
      terria.workbench.items[0] ?? terria.overlays.items[0] ?? undefined;

    // Thiết lập vị trí pick (nếu có)
    try {
      pickedFeatures.pickPosition = entity.position?.getValue(JulianDate.now());
    } catch {
      /* ignore */
    }

    // Chọn feature này làm selectedFeature và công bố pickedFeatures
    terria.selectedFeature = feature;
    terria.pickedFeatures = pickedFeatures;

    // Mở panel
    this.viewState.featureInfoPanelIsVisible = true;
    this.viewState.topElement = "FeatureInfo";
  }

  private renderStrTable(tableData: string[]) {
    const container = document.createElement("table");
    container.className = "cesium-infoBox-defaultTable";
    const tbody = document.createElement("tbody");

    const tr = document.createElement("tr");
    const th = document.createElement("th");
    const td = document.createElement("td");
    th.innerText = tableData[0];
    td.innerText = tableData[1];
    tr.appendChild(th);
    tr.appendChild(td);
    tbody.appendChild(tr);

    container.appendChild(tbody);
    return container.outerHTML;
  }

  private isEntityInCurrentView(positions: Cartesian3[]): boolean {
    if (!positions || positions.length === 0) {
      return false;
    }

    const cesium = this.viewState.terria.currentViewer;
    const camera = (cesium as any).scene.camera;

    // Tạo một bounding sphere bao quanh tất cả các điểm
    const boundingSphere = BoundingSphere.fromPoints(positions);

    // Kiểm tra xem bounding sphere có nằm trong frustum của camera không
    return (
      camera.frustum
        .computeCullingVolume(camera.position, camera.direction, camera.up)
        .computeVisibility(boundingSphere) !== Intersect.OUTSIDE
    );
  }

  private utmToLongLat(x: number, y: number) {
    const utmZone48 = "+proj=utm +zone=48 +datum=WGS84 +units=m +no_defs";
    const wgs84 = "+proj=longlat +datum=WGS84 +no_defs";
    const longLat = proj4(utmZone48, wgs84, [x, y]);
    return { longitude: longLat[0], latitude: longLat[1] };
  }

  @action.bound
  deactivate() {
    super.deactivate();
  }

  get visible() {
    return !this.viewState.hideMapUi && super.visible;
  }

  get active() {
    return false;
  }

  // Method để set dữ liệu từ bên ngoài
  setSubdistrictData(data: SubdistrictDataTypes[]) {
    this.subdistrictData = data;
  }

  // Method để clear dữ liệu
  clearSubdistrictData() {
    this.subdistrictData = [];
  }
}
