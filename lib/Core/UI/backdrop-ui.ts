import Cartesian2 from "terriajs-cesium/Source/Core/Cartesian2";
import TerriaViewer from "../../ViewModels/TerriaViewer";
import styles from "./backdrop-ui.scss"; // Import CSS Modules
import Cartographic from "terriajs-cesium/Source/Core/Cartographic";
import CesiumMath from "terriajs-cesium/Source/Core/Math";
import CallbackProperty from "terriajs-cesium/Source/DataSources/CallbackProperty";

const BACKDROP_ITEM_CLICK_EVENT = "backdrop-item-click-event";

export class BackdropUi {
  private readonly _core: TerriaViewer;
  public backdropContainer: HTMLElement;
  public cancelButton: HTMLElement;
  private menuItemsContainer: HTMLElement;
  private isMenuActive: boolean = false;

  public dataMenu = [
    {
      id: "location-entity",
      svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>`,
      action: function () {
        alert("Location clicked");
      }
    },
    {
      id: "document",
      svg: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                    <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
                    <g id="SVGRepo_iconCarrier"> 
                        <path fill-rule="evenodd" clip-rule="evenodd" d="M9.29289 1.29289C9.48043 1.10536 9.73478 1 10 1H18C19.6569 1 21 2.34315 21 4V20C21 21.6569 19.6569 23 18 23H6C4.34315 23 3 21.6569 3 20V8C3 7.73478 3.10536 7.48043 3.29289 7.29289L9.29289 1.29289ZM18 3H11V8C11 8.55228 10.5523 9 10 9H5V20C5 20.5523 5.44772 21 6 21H18C18.5523 21 19 20.5523 19 20V4C19 3.44772 18.5523 3 18 3ZM6.41421 7H9V4.41421L6.41421 7ZM7 13C7 12.4477 7.44772 12 8 12H16C16.5523 12 17 12.4477 17 13C17 13.5523 16.5523 14 16 14H8C7.44772 14 7 13.5523 7 13ZM7 17C7 16.4477 7.44772 16 8 16H16C16.5523 16 17 16.4477 17 17C17 17.5523 16.5523 18 16 18H8C7.44772 18 7 17.5523 7 17Z" fill="#ffffff"></path> 
                    </g>
                  </svg>`,
      action: function () {
        alert("Document clicked");
      }
    }
  ];

  public pickedFeature?: any;

  constructor(core: TerriaViewer) {
    this._core = core;
    this.backdropContainer = document.createElement("div");
    this.cancelButton = document.createElement("div");
    this.menuItemsContainer = document.createElement("div");

    const uiContainer = document.getElementById("ui");
    if (uiContainer) uiContainer.appendChild(this.backdropContainer);

    this.initialUiBackdrop();
    this.bindMethods();
  }

  private bindMethods() {
    this.initialUiBackdrop = this.initialUiBackdrop.bind(this);
    this.createContentBackdrop = this.createContentBackdrop.bind(this);
    this.createCenterButton = this.createCenterButton.bind(this);
    this.updateSettingWrapper = this.updateSettingWrapper.bind(this);
    this.activeMenuItems = this.activeMenuItems.bind(this);
    this.hideWrapper = this.hideWrapper.bind(this);
    this.menuItemClick = this.menuItemClick.bind(this);
  }

  initialUiBackdrop() {
    // Sử dụng CSS Modules
    this.backdropContainer.className = styles.backdropContainer;
    this.backdropContainer.addEventListener("contextmenu", (e) =>
      e.preventDefault()
    );
    this.backdropContainer.replaceChildren();
    this.createCenterButton();
    this.createContentBackdrop();
  }

  private createContentBackdrop() {
    this.menuItemsContainer.className = styles.menuItems;
    this.menuItemsContainer.id = "menuItems";

    this.dataMenu.forEach((item, index) => {
      const menuItem = document.createElement("div");
      // Sử dụng CSS Modules
      menuItem.className = styles.menuItem;
      menuItem.id = item.id;
      menuItem.innerHTML = `${item.svg}`;
      menuItem.style.transitionDelay = `${0.05 * (index + 1)}s`;
      menuItem.addEventListener("click", () => this.menuItemClick(menuItem.id));
      this.menuItemsContainer.appendChild(menuItem);
    });

    this.backdropContainer.appendChild(this.menuItemsContainer);
  }

  private createCenterButton() {
    const centerButton = document.createElement("div");
    // Sử dụng CSS Modules
    centerButton.className = styles.centerButton;
    centerButton.id = "menuToggle";

    const centerCircle = document.createElement("div");
    // Sử dụng CSS Modules
    centerCircle.className = styles.centerCircle;
    centerButton.appendChild(centerCircle);

    centerButton.onclick = () => this.toggleMenu();
    this.backdropContainer.appendChild(centerButton);
  }

  private toggleMenu() {
    if (this.isMenuActive) {
      this.hideWrapper();
    } else {
      this.activeMenuItems(true);
    }
  }

  updateSettingWrapper(pickedFeature: any, position: Cartesian2) {
    console.log("position", position);
    if (!position) {
      console.error("Position is undefined");
      return;
    }

    const viewer = this._core.terria.currentViewer;
    const canvas = (viewer as any).scene.canvas;

    // Show backdrop container
    this.backdropContainer.style.display = "block";
    this.backdropContainer.style.bottom = `${canvas.clientHeight - position.y - 20}px`;
    this.backdropContainer.style.left = `${position.x - 20}px`;

    // Create ripple effect
    this.createRippleEffect();

    // Add CSS Modules classes
    this.backdropContainer.classList.add(styles.menuActive);
    this.backdropContainer.classList.remove(styles.menuClosing);

    this.pickedFeature = pickedFeature;

    // Auto activate menu items after delay
    setTimeout(() => {
      this.activeMenuItems(true);
    }, 300);

    // Add coordinates to picked feature
    this.addCoordinatesToFeature(pickedFeature, position, viewer);
  }

  private createRippleEffect() {
    const ripple = document.createElement("div");
    // Sử dụng CSS Modules
    ripple.className = styles.ripple;
    ripple.style.left = "50%";
    ripple.style.top = "50%";
    ripple.style.width = "10px";
    ripple.style.height = "10px";

    this.backdropContainer.appendChild(ripple);

    setTimeout(() => {
      if (ripple.parentNode) {
        ripple.remove();
      }
    }, 1000);
  }

  private addCoordinatesToFeature(
    pickedFeature: any,
    position: Cartesian2,
    viewer: any
  ) {
    if (position && this._core) {
      const cartesian = viewer.scene.pickPosition(position);
      if (cartesian) {
        const cartographic = Cartographic.fromCartesian(cartesian);

        const lonLat = {
          longitude: CesiumMath.toDegrees(cartographic.longitude),
          latitude: CesiumMath.toDegrees(cartographic.latitude),
          height: cartographic.height
        };
        pickedFeature._lonlat = lonLat;
      }
    }
  }

  private activeMenuItems(active: boolean) {
    const radius = 70;
    const totalItems = this.dataMenu.length;

    this.dataMenu.forEach((item, index) => {
      const menuItem = document.getElementById(item.id);
      if (!menuItem) return;

      if (active) {
        // Tính góc để phân bố đều
        const angle = index * ((2 * Math.PI) / totalItems) - Math.PI / 2;
        const x = radius * Math.cos(angle);
        const y = radius * Math.sin(angle);

        setTimeout(() => {
          // Điều chỉnh vị trí tương đối với center (50%, 50%)
          menuItem.style.left = `calc(50% + ${x}px)`;
          menuItem.style.top = `calc(50% + ${y}px)`;
          menuItem.classList.add(styles.active);
        }, index * 100);
      } else {
        const reverseIndex = this.dataMenu.length - 1 - index;
        setTimeout(() => {
          menuItem.classList.remove(styles.active);
          menuItem.style.left = "50%";
          menuItem.style.top = "50%";
        }, reverseIndex * 50);
      }
    });

    this.isMenuActive = active;
  }

  hideWrapper() {
    this.activeMenuItems(false);
    // Sử dụng CSS Modules classes
    this.backdropContainer.classList.add(styles.menuClosing);
    this.backdropContainer.classList.remove(styles.menuActive);

    setTimeout(() => {
      this.backdropContainer.style.removeProperty("display");
      this.backdropContainer.classList.remove(styles.menuClosing);
    }, 300);
  }

  createPickedFeatureDescription(pickedFeature: any) {
    return new CallbackProperty(() => {
      const formatNumber = (value: any) => {
        const num = parseFloat(value);
        return isNaN(num) ? "N/A" : num.toFixed(6);
      };

      const getPropertySafe = (propertyName: string) => {
        const value = pickedFeature.getProperty(propertyName);
        return value !== undefined && value !== null ? value : "N/A";
      };

      return `
                <table class="cesium-infoBox-defaultTable"><tbody>
                    <tr><th>BIN</th><td>${getPropertySafe("BIN")}</td></tr>
                    <tr><th>DOITT ID</th><td>${getPropertySafe("DOITT_ID")}</td></tr>
                    <tr><th>SOURCE ID</th><td>${getPropertySafe("SOURCE_ID")}</td></tr>
                    <tr><th>Longitude</th><td>${formatNumber(getPropertySafe("Longitude"))}</td></tr>
                    <tr><th>Latitude</th><td>${formatNumber(getPropertySafe("Latitude"))}</td></tr>
                    <tr><th>Height</th><td>${formatNumber(getPropertySafe("Height"))}</td></tr>
                    <tr><th>Terrain Height (Ellipsoid)</th><td>${formatNumber(getPropertySafe("TerrainHeight"))}</td></tr>
                </tbody></table>
            `;
    }, false);
  }

  private menuItemClick(id: string) {
    this._core.dispatchEvent(BACKDROP_ITEM_CLICK_EVENT, {
      actionId: id,
      data: this.pickedFeature
    });
    this.hideWrapper();
    this.pickedFeature = undefined;
  }
}
