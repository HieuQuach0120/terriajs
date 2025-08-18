import ViewState from "../ReactViewModels/ViewState";
import ScreenSpaceEventHandler from "terriajs-cesium/Source/Core/ScreenSpaceEventHandler";
import ScreenSpaceEventType from "terriajs-cesium/Source/Core/ScreenSpaceEventType";

export class HighlightEvent {
  private inputHandler?: ScreenSpaceEventHandler;
  private cesium?: any;
  constructor(private viewState: ViewState) {
    // Binding Event
    this.setupMouseEvent = this.setupMouseEvent.bind(this);
  }

  setupMouseEvent() {
    // const cesium = this.viewState.terria.currentViewer;
    // this.cesium = this.viewState.terria.currentViewer;
    // const canvas = (this.cesium as any).scene.canvas;
    // this.inputHandler = new ScreenSpaceEventHandler(canvas);
    // this.inputHandler.screenSpaceEventHandler.setInputAction(
    //   (movement: any) => {
    //     this.onRightClickEvent(movement);
    //   },
    //   ScreenSpaceEventType.RIGHT_CLICK
    // );
  }

  onRightClickEvent(movement: any) {
    // If a feature was previously highlighted, undo the highlight
    // if (Cesium.defined(this.highlighted.feature)) {
    //     this.highlighted.feature.color = this.highlighted.originalColor;
    //     this.highlighted.feature = undefined;
    // }
    // Pick a new feature
    const pickedFeature = (this.cesium as any).scene.pick(movement.position);
    console.log("pickedFeature", pickedFeature);
    // if( pickedFeature?.id?._properties?._type?._value === EntityType.type) return;
    // this._backdropUi.updateSettingWrapper(pickedFeature, movement.position);
  }

  dispose() {
    console.log("dispose");
  }
}
