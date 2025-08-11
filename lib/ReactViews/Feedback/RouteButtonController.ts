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

export const ROUTE_TOOL_ID = "route";

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

  constructor(private viewState: ViewState, data?: SubdistrictDataTypes[]) {
    super();
    makeObservable(this);
    if (data) {
      this.subdistrictData = data;
    }
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
      const scene = (cesium as any).scene;
      if (scene && scene.camera) {
        const camera = scene.camera;
        const longitude = 105.85233936458508;
        const latitude = 21.021829728218833;

        // Bay đến vị trí
        camera.flyTo({
          destination: {
            longitude: longitude,
            latitude: latitude,
            height: 10000
          },
          duration: 3.0,
          complete: () => {
            console.log("Đã bay đến tuyến đường thành công");
            // Vẽ entity sau khi bay đến
            this.drawSubdistrictEntity();
          }
        });
      }
    }
    super.activate();
  }

  private drawSubdistrictEntity() {
    const cesium = this.viewState.terria.currentViewer;
    if (!cesium || cesium.type !== "Cesium") {
      console.error("Cesium viewer is not available");
      return;
    }
    console.log("this.subdistrictData", this.subdistrictData);

    // Sử dụng dữ liệu đã được truyền vào hoặc dữ liệu mẫu
    const subdistrictData = this.subdistrictData;
    if (!subdistrictData || subdistrictData.length < 1) return;

    let targetFly = new Cartesian3(0, 0, 0);
    let allPositions: Cartesian3[] = [];

    subdistrictData.forEach((data, index) => {
      // Chuyển đổi từ UTM sang tọa độ địa lý (longitude, latitude)
      const convertPositions = data.mPolygonLoop.curve.point.map((point) => {
        // Giả sử point[0] là longitude, point[1] là latitude (đã được convert từ TerriaMap)
        const longitude = point[0];
        const latitude = point[1];
        // Sử dụng point[2] cho độ cao nếu có
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
          type: "SUBDISTRICT_WAY"
        }
      });

      console.log("cesium viewer:", cesium);
      console.log("entities:", (cesium as any).entities);

      (cesium as any).entities.add(entity);
    });

    // Kiểm tra xem entity có nằm trong khung nhìn hiện tại không
    const isEntityInView = this.isEntityInCurrentView(allPositions);

    // Chỉ di chuyển camera khi entity không nằm trong khung nhìn hiện tại
    if (!isEntityInView) {
      (cesium as any).camera.lookAt(
        targetFly,
        new HeadingPitchRange(
          Math.toRadians(13.08), // heading
          Math.toRadians(-29.07), // pitch
          1000 // range (khoảng cách từ camera đến điểm đích)
        )
      );

      // Reset control camera after set lookAt
      (cesium as any).camera.lookAtTransform(Matrix4.IDENTITY);
    }
  }

  private renderStrTable(property: any): string {
    if (!property) return "";

    let html = "<table class='cesium-infoBox-defaultTable'>";
    for (const [key, value] of Object.entries(property)) {
      html += `<tr><th>${key}</th><td>${value}</td></tr>`;
    }
    html += "</table>";
    return html;
  }

  private isEntityInCurrentView(positions: Cartesian3[]): boolean {
    const cesium = this.viewState.terria.currentViewer;
    if (!cesium || cesium.type !== "Cesium") {
      return false;
    }

    const camera = (cesium as any).camera;
    const frustum = camera.frustum;

    // Kiểm tra xem có ít nhất một điểm nằm trong frustum không
    return positions.some((position) => {
      return (
        frustum
          .computeCullingVolume(camera.transform, camera.frustum)
          .computeVisibility(position) !== -1
      );
    });
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
